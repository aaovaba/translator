from fastapi import WebSocket, APIRouter, WebSocketDisconnect
from openai import OpenAI
from jose import jwt
import datetime

from app.config import OPENAI_API_KEY, SECRET_KEY
from app.db import users_collection
from app.services.ai import (
    transcribe_audio,
    detect_language,
    generate_tts_audio,
    classify_speaker
)

router = APIRouter()
client = OpenAI(api_key=OPENAI_API_KEY)


# ==========================================
# 🔐 JWT HELPER
# ==========================================
def get_email_from_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload.get("sub")
    except:
        return None


# ==========================================
# 🔌 WEBSOCKET
# ==========================================
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connected")

    # 🔐 extract user
    token = websocket.query_params.get("token")
    user_email = get_email_from_token(token)

    print("Connected user:", user_email)

    patient_language = None
    transcript_log = []

    try:
        # ==========================================
        # CONSENT FLOW
        # ==========================================

        audio_bytes = await websocket.receive_bytes()
        first_text = await transcribe_audio(audio_bytes)

        patient_language = detect_language(first_text)

        print("First speech:", first_text)
        print("Detected patient language:", patient_language)

        consent_message = (
            "This system uses artificial intelligence to translate "
            "your conversation with the doctor. Do you consent?"
        )

        consent_translation = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            messages=[
                {"role": "system", "content": "Translate accurately."},
                {"role": "user", "content": f"Translate to {patient_language}: {consent_message}"}
            ]
        ).choices[0].message.content.strip()

        consent_audio = generate_tts_audio(consent_translation)

        await websocket.send_json({
            "type": "consent",
            "text": consent_translation,
            "audio": consent_audio
        })

        # ==========================================
        # CONSENT RESPONSE
        # ==========================================

        audio_bytes = await websocket.receive_bytes()
        consent_text = await transcribe_audio(audio_bytes)

        classification = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": "Answer ONLY YES or NO. Does this express agreement?"
                },
                {"role": "user", "content": consent_text}
            ]
        )

        decision = classification.choices[0].message.content.strip().upper()
        print("Consent classification:", decision)

        if not decision.startswith("YES"):
            await websocket.send_json({
                "type": "status",
                "text": "Consent denied"
            })
            return await safe_close(websocket)

        # ✅ STORE CONSENT IN DB
        if user_email:
            users_collection.update_one(
                {"email": user_email},
                {
                    "$set": {
                        "consent_given": True,
                        "consent_timestamp": datetime.datetime.utcnow()
                    }
                }
            )

        await websocket.send_json({
            "type": "status",
            "text": "Consent granted"
        })

        # ==========================================
        # TRANSLATION LOOP
        # ==========================================

        while True:
            message = await websocket.receive()

            # 🔴 HANDLE DISCONNECT
            if message.get("type") == "websocket.disconnect":
                print("Client disconnected")
                break

            # --------------------------------------
            # END SESSION
            # --------------------------------------
            if "text" in message and message["text"] == "end_session":

                summary_prompt = "\n".join(transcript_log)

                summary = client.chat.completions.create(
                    model="gpt-4o-mini",
                    temperature=0,
                    messages=[
                        {
                            "role": "system",
                            "content": "Summarize this medical consultation clearly."
                        },
                        {"role": "user", "content": summary_prompt}
                    ]
                ).choices[0].message.content.strip()

                await websocket.send_json({
                    "type": "summary",
                    "text": summary
                })

                return await safe_close(websocket)

            # --------------------------------------
            # IGNORE TEXT
            # --------------------------------------
            if "text" in message:
                print("Ignoring text:", message["text"])
                continue

            # --------------------------------------
            # SAFE AUDIO
            # --------------------------------------
            if "bytes" not in message or message["bytes"] is None:
                print("Invalid message:", message)
                continue

            audio_bytes = message["bytes"]

            spoken_text = await transcribe_audio(audio_bytes)
            detected_language = detect_language(spoken_text)

            print("Spoken:", spoken_text)
            print("Detected:", detected_language)

            # ======================================
            # SPEAKER LOGIC
            # ======================================

            if detected_language.lower() == "english":
                speaker = "doctor"
                target_language = patient_language

            elif detected_language.lower() == patient_language.lower():
                speaker = "patient"
                target_language = "English"

            else:
                ai_role = classify_speaker(spoken_text, transcript_log)

                if ai_role == "DOCTOR":
                    speaker = "doctor"
                    target_language = patient_language
                else:
                    speaker = "patient"
                    target_language = "English"

            # --------------------------------------
            # TRANSLATION
            # --------------------------------------

            translation = client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0,
                messages=[
                    {"role": "system", "content": "Translate ONLY the sentence."},
                    {"role": "user", "content": f"Translate to {target_language}: {spoken_text}"}
                ]
            ).choices[0].message.content.strip()

            transcript_log.append(f"{speaker.upper()}: {spoken_text}")

            tts_audio = generate_tts_audio(translation)

            await websocket.send_json({
                "type": "translation",
                "speaker": speaker,
                "original": spoken_text,
                "translated": translation,
                "audio": tts_audio
            })

    except WebSocketDisconnect:
        print("WebSocket disconnected")

    except Exception as e:
        print("Server error:", str(e))
        await safe_close(websocket)


# ==========================================
# 🔒 SAFE CLOSE
# ==========================================
async def safe_close(websocket: WebSocket):
    try:
        await websocket.close()
    except:
        pass