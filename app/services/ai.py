from openai import OpenAI
from app.config import OPENAI_API_KEY
import base64
import io

client = OpenAI(api_key=OPENAI_API_KEY)


# -------------------------
# TRANSCRIBE AUDIO (STT)
# -------------------------

async def transcribe_audio(audio_bytes: bytes):
    """
    Transcribes audio and returns only text.
    """

    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = "audio.webm"

    transcript = client.audio.transcriptions.create(
        model="gpt-4o-mini-transcribe",
        file=audio_file
    )

    return transcript.text


# -------------------------
# LANGUAGE DETECTION
# -------------------------

def detect_language(text: str):
    """
    Deterministic language detection.
    Returns full language name.
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": (
                    "Detect the language of this sentence. "
                    "Return ONLY the language name in English. "
                    "Example outputs: Hindi, Urdu, Spanish, English, Arabic."
                )
            },
            {
                "role": "user",
                "content": text
            }
        ]
    )

    return response.choices[0].message.content.strip()


# -------------------------
# GENERATE TTS AUDIO
# -------------------------

def generate_tts_audio(text: str):
    """
    Generates MP3 audio and returns base64 string.
    """

    response = client.audio.speech.create(
        model="gpt-4o-mini-tts",
        voice="alloy",
        input=text
    )

    audio_bytes = response.read()

    return base64.b64encode(audio_bytes).decode("utf-8")