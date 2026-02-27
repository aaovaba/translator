import asyncio
import websockets
import sounddevice as sd
import soundfile as sf
import numpy as np
import json
import os
import uuid
from scipy.io.wavfile import write
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SAMPLE_RATE = 16000
DURATION = 5  # seconds


# -------------------------
# LANGUAGE MAPPING
# -------------------------
def map_language_code(language_name):
    mapping = {
        "Hindi": "hi",
        "Spanish": "es",
        "French": "fr",
        "English": "en"
    }
    return mapping.get(language_name, "en")


# -------------------------
# RECORD AUDIO
# -------------------------
def record_audio():
    print("🎤 Speak now...")
    audio = sd.rec(int(DURATION * SAMPLE_RATE),
                   samplerate=SAMPLE_RATE,
                   channels=1)
    sd.wait()
    filename = f"{uuid.uuid4()}.wav"
    write(filename, SAMPLE_RATE, audio)
    return filename


# -------------------------
# TRANSCRIBE AUDIO (LANG LOCKED)
# -------------------------
def transcribe_audio(filename, language_code=None):
    with open(filename, "rb") as f:
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=f,
            language=language_code  # 🔥 LOCK LANGUAGE
        )
    os.remove(filename)
    return transcript.text


# -------------------------
# TEXT TO SPEECH
# -------------------------
def speak(text):
    speech_file = "response.mp3"

    with client.audio.speech.with_streaming_response.create(
        model="gpt-4o-mini-tts",
        voice="alloy",
        input=text
    ) as response:
        response.stream_to_file(speech_file)

    data, fs = sf.read(speech_file)
    sd.play(data, fs)
    sd.wait()

    os.remove(speech_file)


# -------------------------
# MAIN VOICE TEST
# -------------------------
async def voice_test():
    uri = "ws://127.0.0.1:8000/ws"

    async with websockets.connect(uri) as websocket:

        print("=== Patient First Message ===")
        file = record_audio()

        # First transcription without language lock
        patient_text = transcribe_audio(file)
        print("You said:", patient_text)

        await websocket.send(patient_text)

        # 🔥 Now server sends JSON with detected language
        response = await websocket.recv()
        response_data = json.loads(response)

        detected_language = response_data["language"]
        consent_message = response_data["message"]

        print("Detected language:", detected_language)
        print("Consent message:", consent_message)

        speak(consent_message)

        print("Respond with Yes/No")

        # 🔥 LOCK ASR LANGUAGE AFTER DETECTION
        language_code = map_language_code(detected_language)

        file = record_audio()
        consent_reply = transcribe_audio(file, language_code)
        print("You said:", consent_reply)

        await websocket.send(consent_reply)

        try:
            response = await websocket.recv()
        except websockets.exceptions.ConnectionClosed:
            print("Connection closed by server.")
            return

        print("System:", response)

        if "denied" in response.lower():
            return

        speak("Session started.")

        # Conversation Loop
        while True:
            speaker = input("Who speaks? (patient/doctor/exit): ")

            if speaker == "exit":
                break

            file = record_audio()
            text = transcribe_audio(file, language_code)
            print("Spoken:", text)

            await websocket.send(json.dumps({
                "speaker": speaker,
                "text": text
            }))

            reply = await websocket.recv()
            reply_json = json.loads(reply)

            print("Translation:", reply_json["translated"])
            speak(reply_json["translated"])


asyncio.run(voice_test())