from cryptography.fernet import Fernet
from app.config import ENCRYPTION_KEY

fernet = Fernet(ENCRYPTION_KEY.encode())

def encrypt_data(data: str) -> str:
    return fernet.encrypt(data.encode()).decode()

def decrypt_data(token: str) -> str:
    return fernet.decrypt(token.encode()).decode()