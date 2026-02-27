from openai import OpenAI
from app.config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)

SYSTEM_PROMPT = """
You are a certified medical interpreter.

Rules:
- Translate exactly.
- Do not summarize.
- Do not explain.
- Preserve medical terminology.
- If unclear say: "Interpreter requests clarification."
- Output only the translation.
"""

def detect_language(text: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Detect language. Return only language name."},
            {"role": "user", "content": text}
        ]
    )
    return response.choices[0].message.content.strip()


def translate(text: str, target_language: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Translate to {target_language}:\n{text}"}
        ]
    )
    return response.choices[0].message.content.strip()


def validate_translation(original: str, translated: str) -> bool:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Answer YES or NO. Did the translation preserve all medical meaning exactly?"},
            {"role": "user", "content": f"Original:\n{original}\n\nTranslated:\n{translated}"}
        ]
    )
    return "YES" in response.choices[0].message.content.upper()