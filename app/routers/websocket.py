import tempfile
import os
from fastapi import WebSocket, APIRouter, WebSocketDisconnect
from openai import OpenAI
from app.config import OPENAI_API_KEY
from app.services.translator import detect_language, translate

client = OpenAI(api_key=OPENAI_API_KEY)
router = APIRouter()


async def transcribe_audio(audio_bytes):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="gpt-4o-mini-transcribe",
                file=audio_file
            )
        return transcript.text
    finally:
        os.remove(tmp_path)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connected")

    try:
        # ---------------- CONSENT STAGE ----------------
        audio_bytes = await websocket.receive_bytes()
        first_text = await transcribe_audio(audio_bytes)
        print("First speech:", first_text)

        patient_language = detect_language(first_text)
        print("Detected language:", patient_language)

        consent_message = translate(
            "This system uses artificial intelligence to translate your conversation with the doctor. Do you consent to using this translator?",
            patient_language
        )

        await websocket.send_json({
            "type": "consent",
            "text": consent_message
        })

        audio_bytes = await websocket.receive_bytes()
        consent_text = await transcribe_audio(audio_bytes)

        classification = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Return only YES or NO. Does this sentence clearly express consent?"
                },
                {
                    "role": "user",
                    "content": consent_text
                }
            ]
        )

        decision = classification.choices[0].message.content.strip().upper()

        if not decision.startswith("YES"):
            await websocket.send_json({
                "type": "status",
                "text": "Consent denied."
            })
            return

        await websocket.send_json({
            "type": "status",
            "text": "Consent granted."
        })

        # ---------------- TRANSLATION LOOP ----------------
        while True:
            message = await websocket.receive_json()

            speaker = message.get("speaker")
            audio_bytes = message.get("audio")

            if not audio_bytes:
                continue

            spoken_text = await transcribe_audio(
                bytes(audio_bytes)
            )

            print("Spoken:", spoken_text)

            if speaker == "patient":
                translated = translate(spoken_text, "English")
                output_speaker = "patient"

            else:
                translated = translate(spoken_text, patient_language)
                output_speaker = "doctor"

            await websocket.send_json({
                "type": "translation",
                "speaker": output_speaker,
                "original": spoken_text,
                "translated": translated
            })

    except WebSocketDisconnect:
        print("WebSocket disconnected")