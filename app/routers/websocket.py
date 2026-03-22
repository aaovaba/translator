from fastapi import WebSocket, APIRouter, WebSocketDisconnect, Depends
from openai import OpenAI
from datetime import datetime
from bson import ObjectId

from app.config import OPENAI_API_KEY
from app.db import db
from app.services.security import get_current_user_ws

from app.services.ai import (
    transcribe_audio,
    detect_language,
    generate_tts_audio,
    classify_speaker
)

router = APIRouter()
client = OpenAI(api_key=OPENAI_API_KEY)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connected")

    # 🔐 get user from token
    user = await get_current_user_ws(websocket)
    user_email = user["sub"]

    print("Connected user:", user_email)

    patient_language = None

    # 🧾 CREATE SESSION
    session_doc = {
        "user_email": user_email,
        "started_at": datetime.utcnow(),
        "transcript": [],
        "consent": False
    }

    session_id = db.sessions.insert_one(session_doc).inserted_id

    try:
        # ================= CONSENT =================
        audio_bytes = await websocket.receive_bytes()
        first_text = await transcribe_audio(audio_bytes)

        patient_language = detect_language(first_text)

        consent_text = (
            "This system uses AI to translate your conversation. Do you consent?"
        )

        translated = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            messages=[
                {"role": "system", "content": "Translate accurately."},
                {"role": "user", "content": f"Translate to {patient_language}: {consent_text}"}
            ]
        ).choices[0].message.content.strip()

        audio = generate_tts_audio(translated)

        await websocket.send_json({
            "type": "consent",
            "text": translated,
            "audio": audio
        })

        # ================= CONSENT RESPONSE =================
        audio_bytes = await websocket.receive_bytes()
        consent_reply = await transcribe_audio(audio_bytes)

        decision = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            messages=[
                {"role": "system", "content": "Answer YES or NO only."},
                {"role": "user", "content": consent_reply}
            ]
        ).choices[0].message.content.strip().upper()

        print("Consent:", decision)

        if not decision.startswith("YES"):
            await websocket.send_json({"type": "status", "text": "denied"})
            return

        # ✅ store consent
        db.sessions.update_one(
            {"_id": session_id},
            {"$set": {"consent": True}}
        )

        await websocket.send_json({"type": "status", "text": "granted"})

        # ================= TRANSLATION LOOP =================
        while True:
            message = await websocket.receive()

            if "text" in message and message["text"] == "end_session":

                # 🔥 summary
                transcript_text = "\n".join([
                    f"{m['speaker']}: {m['original']}"
                    for m in db.sessions.find_one({"_id": session_id})["transcript"]
                ])

                summary = client.chat.completions.create(
                    model="gpt-4o-mini",
                    temperature=0,
                    messages=[
                        {"role": "system", "content": "Summarize clearly."},
                        {"role": "user", "content": transcript_text}
                    ]
                ).choices[0].message.content.strip()

                db.sessions.update_one(
                    {"_id": session_id},
                    {
                        "$set": {
                            "ended_at": datetime.utcnow(),
                            "summary": summary
                        }
                    }
                )

                await websocket.send_json({
                    "type": "summary",
                    "text": summary
                })

                break

            # ================= NORMAL MESSAGE =================
            if "bytes" not in message:
                continue

            audio_bytes = message["bytes"]
            spoken_text = await transcribe_audio(audio_bytes)

            lang = detect_language(spoken_text)

            # speaker logic
            if lang.lower() == "english":
                speaker = "doctor"
                target = patient_language
            elif lang.lower() == patient_language.lower():
                speaker = "patient"
                target = "English"
            else:
                role = classify_speaker(spoken_text, [])
                speaker = "doctor" if role == "DOCTOR" else "patient"
                target = patient_language if speaker == "doctor" else "English"

            translation = client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0,
                messages=[
                    {"role": "system", "content": "Translate only."},
                    {"role": "user", "content": f"Translate to {target}: {spoken_text}"}
                ]
            ).choices[0].message.content.strip()

            # ✅ SAVE TO DB
            db.sessions.update_one(
                {"_id": session_id},
                {
                    "$push": {
                        "transcript": {
                            "speaker": speaker,
                            "original": spoken_text,
                            "translated": translation,
                            "timestamp": datetime.utcnow()
                        }
                    }
                }
            )

            tts = generate_tts_audio(translation)

            await websocket.send_json({
                "type": "translation",
                "speaker": speaker,
                "translated": translation,
                "audio": tts
            })

    except WebSocketDisconnect:
        print("Client disconnected")

    except Exception as e:
        print("Error:", e)