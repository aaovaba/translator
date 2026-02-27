from cryptography.fernet import Fernet
import os

# In production store this in environment variable
FERNET_KEY = os.getenv("FERNET_KEY") or Fernet.generate_key().decode()

cipher = Fernet(FERNET_KEY.encode())


def encrypt_text(text: str) -> str:
    return cipher.encrypt(text.encode()).decode()


def decrypt_text(token: str) -> str:
    return cipher.decrypt(token.encode()).decode()