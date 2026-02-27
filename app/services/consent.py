from app.services.translator import translate

CONSENT_TEXT = """
This system uses artificial intelligence to translate your conversation with the doctor.
Do you consent to using this translator?
"""

def generate_consent(language: str) -> str:
    return translate(CONSENT_TEXT, language)

def check_consent(reply: str, language: str) -> bool:
    english = translate(reply, "English")
    return "yes" in english.lower()