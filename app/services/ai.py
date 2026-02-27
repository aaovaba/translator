from openai import OpenAI
from app.config import OPENAI_API_KEY
import base64
import io

client = OpenAI(api_key=OPENAI_API_KEY)

# =====================================================
#                SPEECH TO TEXT (STT)
# =====================================================

async def transcribe_audio(audio_bytes: bytes) -> str:
    """
    Transcribes audio and returns text.
    """

    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = "audio.webm"

    transcript = client.audio.transcriptions.create(
        model="gpt-4o-mini-transcribe",
        file=audio_file
    )

    return transcript.text


# =====================================================
#              LANGUAGE DETECTION
# =====================================================

def detect_language(text: str) -> str:
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
                    "Examples: Hindi, Urdu, Spanish, English, Arabic."
                )
            },
            {
                "role": "user",
                "content": text
            }
        ]
    )

    return response.choices[0].message.content.strip()


# =====================================================
#        AI-BASED SPEAKER CLASSIFICATION (Fallback)
# =====================================================

def classify_speaker(text: str, conversation_history: list) -> str:
    """
    Used only for ambiguous/mixed cases.
    Returns DOCTOR or PATIENT.
    """

    history_context = "\n".join(conversation_history[-6:])

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are classifying speaker roles in a medical consultation.\n\n"
                    "The DOCTOR typically:\n"
                    "- Asks medical questions\n"
                    "- Gives advice\n"
                    "- Responds professionally\n\n"
                    "The PATIENT typically:\n"
                    "- Describes symptoms\n"
                    "- Answers doctor questions\n"
                    "- Shares concerns\n\n"
                    "Return ONLY one word: DOCTOR or PATIENT."
                )
            },
            {
                "role": "user",
                "content": f"Conversation so far:\n{history_context}\n\nNew sentence:\n{text}"
            }
        ]
    )

    return response.choices[0].message.content.strip().upper()


# =====================================================
#                 TEXT TO SPEECH (TTS)
# =====================================================

def generate_tts_audio(text: str) -> str:
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