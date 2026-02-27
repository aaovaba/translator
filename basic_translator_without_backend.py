import os
import sounddevice as sd
import soundfile as sf
import numpy as np
from openai import OpenAI
from scipy.io.wavfile import write
import tempfile
import uuid
from dotenv import load_dotenv
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class VoiceMedicalTranslator:
    def __init__(self):
        self.patient_language = None
        self.consent_given = False
        self.sample_rate = 16000
        self.duration = 5  # seconds per recording

    # -------------------------
    # RECORD AUDIO
    # -------------------------
    def record_audio(self):
        print("Recording...")
        audio = sd.rec(int(self.duration * self.sample_rate),
                       samplerate=self.sample_rate,
                       channels=1)
        sd.wait()
        print("Recording complete.")

        filename = f"{uuid.uuid4()}.wav"
        write(filename, self.sample_rate, audio)
        return filename

    # -------------------------
    # SPEECH TO TEXT
    # -------------------------
    def transcribe(self, filename):
        with open(filename, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="gpt-4o-mini-transcribe",
                file=audio_file
            )
        os.remove(filename)
        return transcript.text

    # -------------------------
    # LANGUAGE DETECTION
    # -------------------------
    def detect_language(self, text):
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Detect the language. Return only language name."},
                {"role": "user", "content": text}
            ]
        )
        self.patient_language = response.choices[0].message.content.strip()
        return self.patient_language

    # -------------------------
    # TEXT TO SPEECH
    # -------------------------
    def speak(self, text):
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
    # TRANSLATE
    # -------------------------
    def translate(self, text, target_language):
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a professional medical interpreter. Translate exactly. Output only translation."},
                {"role": "user", "content": f"Translate to {target_language}:\n{text}"}
            ]
        )
        return response.choices[0].message.content.strip()

    # -------------------------
    # RUN SESSION
    # -------------------------
    def run(self):
        print("=== Voice Medical Translator ===")
        print("Patient, please speak...")

        # First speech
        file = self.record_audio()
        patient_text = self.transcribe(file)

        print("Patient said:", patient_text)

        # Detect language
        lang = self.detect_language(patient_text)
        print("Detected language:", lang)

        # Consent
        consent_message = f"This system uses artificial intelligence to translate your conversation with the doctor. Do you consent to using this translator?"
        translated_consent = self.translate(consent_message, lang)

        print("Asking consent...")
        self.speak(translated_consent)

        # Listen for consent reply
        file = self.record_audio()
        reply = self.transcribe(file)

        decision = self.translate(reply, "English").lower()

        if "yes" not in decision:
            print("Consent denied.")
            return

        print("Consent granted. Starting session.")

        # Conversation loop
        while True:
            speaker = input("Who speaks? (patient/doctor/exit): ").lower()

            if speaker == "exit":
                break

            file = self.record_audio()
            spoken_text = self.transcribe(file)

            print(f"{speaker} said:", spoken_text)

            if speaker == "patient":
                translation = self.translate(spoken_text, "English")
                print("Doctor hears:", translation)
                self.speak(translation)

            elif speaker == "doctor":
                translation = self.translate(spoken_text, lang)
                print("Patient hears:", translation)
                self.speak(translation)

        print("Session ended.")


if __name__ == "__main__":
    app = VoiceMedicalTranslator()
    app.run()