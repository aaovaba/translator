import asyncio
import websockets
import sounddevice as sd
import numpy as np
import base64
import json

SAMPLE_RATE = 16000
CHUNK_DURATION = 2  # seconds

async def stream():
    uri = "ws://127.0.0.1:8000/ws/stream"

    async with websockets.connect(uri) as websocket:

        speaker = input("Speaker (patient/doctor): ").strip()

        while True:
            print("Recording chunk...")

            audio = sd.rec(int(CHUNK_DURATION * SAMPLE_RATE),
                           samplerate=SAMPLE_RATE,
                           channels=1,
                           dtype='int16')

            sd.wait()

            audio_bytes = audio.tobytes()
            audio_b64 = base64.b64encode(audio_bytes).decode()

            await websocket.send(json.dumps({
                "speaker": speaker,
                "audio": audio_b64
            }))

            response = await websocket.recv()
            result = json.loads(response)

            print("\nOriginal:", result["original"])
            print("Translated:", result["translated"])
            print("-" * 40)


asyncio.run(stream())