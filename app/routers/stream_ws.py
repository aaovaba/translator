import base64
import asyncio
import numpy as np
from fastapi import APIRouter, WebSocket
from openai import OpenAI
from app.config import OPENAI_API_KEY
from app.services.translator import translate

router = APIRouter()
client = OpenAI(api_key=OPENAI_API_KEY)

SAMPLE_RATE = 16000

@router.websocket("/ws/stream")
async def stream_audio(websocket: WebSocket):
    await websocket.accept()

    print("Client connected.")

    patient_language = None

    try:
        while True:
            data = await websocket.receive_json()

            speaker = data["speaker"]
            audio_chunk_b64 = data["audio"]

            audio_bytes = base64.b64decode(audio_chunk_b64)

            # Transcribe chunk
            transcript = client.audio.transcriptions.create(
                model="gpt-4o-mini-transcribe",
                file=("audio.wav", audio_bytes),
            )

            text = transcript.text

            if not text.strip():
                continue

            # Detect language once
            if patient_language is None and speaker == "patient":
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "Detect language. Return only language name."},
                        {"role": "user", "content": text}
                    ]
                )
                patient_language = response.choices[0].message.content.strip()

            target = "English" if speaker == "patient" else patient_language

            translated = translate(text, target)

            await websocket.send_json({
                "original": text,
                "translated": translated
            })

    except Exception as e:
        print("Connection closed:", e)
        await websocket.close()