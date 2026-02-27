from translator_agent import MedicalTranslatorAgent

def run_translator():
    agent = MedicalTranslatorAgent()

    print("=== Medical AI Translator ===")
    print("Patient, please say something:")

    patient_input = input("Patient: ")

    # Step 1: Detect Language
    language = agent.detect_language(patient_input)
    print(f"\nDetected Language: {language}")

    # Step 2: Ask for Consent
    consent_message = agent.ask_consent()
    print(f"\nConsent message in {language}:")
    print(consent_message)

    consent_reply = input("\nPatient reply: ")

    if not agent.check_consent(consent_reply):
        print("\nConsent not granted. Ending session.")
        return

    print("\nConsent granted. Starting translation session.")
    print("Type 'exit' to end.\n")

    # Step 3: Translation Loop
    while True:
        speaker = input("Who is speaking? (patient/doctor): ").strip().lower()

        if speaker == "exit":
            break

        text = input(f"{speaker.capitalize()}: ")

        if text.lower() == "exit":
            break

        if speaker == "patient":
            translation = agent.translate_to_english(text)
            print(f"\n→ Doctor hears: {translation}\n")

        elif speaker == "doctor":
            translation = agent.translate_to_patient_language(text)
            print(f"\n→ Patient hears: {translation}\n")

        else:
            print("Invalid speaker. Type 'patient' or 'doctor'.")

    print("\nSession ended.")

if __name__ == "__main__":
    run_translator()