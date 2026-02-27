import os
from dotenv import load_dotenv
load_dotenv()
from openai import OpenAI

# print(os.getenv("OPENAI_API_KEY"))
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class MedicalTranslatorAgent:
    def __init__(self):
        self.patient_language = None
        self.consent_given = False

    def detect_language(self, text):
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Detect the language of the following text. Return only the language name."},
                {"role": "user", "content": text}
            ]
        )
        language = response.choices[0].message.content.strip()
        self.patient_language = language
        return language

    def ask_consent(self):
        consent_prompt = f"""
Translate the following consent message into {self.patient_language}:

"This system uses artificial intelligence to translate your conversation with the doctor. 
Do you consent to using this translator?"
Return only the translated text.
"""
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": consent_prompt}]
        )

        return response.choices[0].message.content.strip()

    def check_consent(self, patient_reply):
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"Answer YES or NO. Does this response mean consent? Language: {self.patient_language}"},
                {"role": "user", "content": patient_reply}
            ]
        )

        decision = response.choices[0].message.content.strip().upper()
        self.consent_given = decision == "YES"
        return self.consent_given

    def translate_to_english(self, text):
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a professional medical interpreter. Translate exactly. Output only translation."},
                {"role": "user", "content": f"Translate to English:\n{text}"}
            ]
        )

        return response.choices[0].message.content.strip()

    def translate_to_patient_language(self, text):
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": f"You are a professional medical interpreter. Translate exactly into {self.patient_language}. Output only translation."},
                {"role": "user", "content": text}
            ]
        )

        return response.choices[0].message.content.strip()