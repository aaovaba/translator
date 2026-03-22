from cryptography.fernet import Fernet
import os
from jose import jwt, JWTError
from fastapi import WebSocket

# ================= ENCRYPTION =================

FERNET_KEY = os.getenv("FERNET_KEY") or Fernet.generate_key().decode()
cipher = Fernet(FERNET_KEY.encode())


def encrypt_text(text: str) -> str:
    return cipher.encrypt(text.encode()).decode()


def decrypt_text(token: str) -> str:
    return cipher.decrypt(token.encode()).decode()


# ================= JWT SETTINGS =================

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"


# ================= NORMAL AUTH =================

def get_current_user(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ================= WEBSOCKET AUTH (🔥 FIX) =================

async def get_current_user_ws(websocket: WebSocket):
    try:
        token = websocket.query_params.get("token")

        if not token:
            await websocket.close()
            return None

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload

    except JWTError:
        await websocket.close()
        return None