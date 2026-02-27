from fastapi import WebSocket, APIRouter, WebSocketDisconnect
from openai import OpenAI
from app.config import OPENAI_API_KEY
from app.services.ai import (
    transcribe_audio,
    detect_language,
    generate_tts_audio,
)

router = APIRouter()
client = OpenAI(api_key=OPENAI_API_KEY)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connected")

    patient_language = None
    transcript_log = []

    try:
        # ---------------- CONSENT ----------------

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

        # -------- CONSENT RESPONSE --------

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
            await websocket.close()
            return

        await websocket.send_json({
            "type": "status",
            "text": "Consent granted"
        })

        # ---------------- TRANSLATION LOOP ----------------

        while True:
            message = await websocket.receive()

            if "text" in message and message["text"] == "end_session":

                summary_prompt = "\n".join(transcript_log)

                summary = client.chat.completions.create(
                    model="gpt-4o-mini",
                    temperature=0,
                    messages=[
                        {
                            "role": "system",
                            "content": "Summarize this medical consultation in bullet points."
                        },
                        {"role": "user", "content": summary_prompt}
                    ]
                ).choices[0].message.content.strip()

                await websocket.send_json({
                    "type": "summary",
                    "text": summary
                })

                await websocket.close()
                break

            # -------- NORMAL SPEECH --------

            audio_bytes = message["bytes"]
            spoken_text = await transcribe_audio(audio_bytes)

            detected_language = detect_language(spoken_text)

            print("Spoken:", spoken_text)
            print("Detected speech language:", detected_language)

            # 🔥 FIXED SPEAKER LOGIC
            # If English → doctor
            # Otherwise → patient

            if detected_language.lower() == "english":
                speaker = "doctor"
                target_language = patient_language
            else:
                speaker = "patient"
                target_language = "English"

            translation = client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0,
                messages=[
                    {"role": "system", "content": "Translate ONLY the sentence."},
                    {"role": "user", "content": f"Translate to {target_language}: {spoken_text}"}
                ]
            ).choices[0].message.content.strip()

            print("Translated:", translation)

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
        await websocket.close()