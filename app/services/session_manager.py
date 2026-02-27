import uuid
import datetime
from app.services.encryption import encrypt_data

class SessionManager:

    def __init__(self):
        self.sessions = {}

    def create_session(self):
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            "created_at": datetime.datetime.utcnow().isoformat(),
            "consent": None,
            "language": None,
            "conversation": []
        }
        return session_id

    def set_language(self, session_id, language):
        self.sessions[session_id]["language"] = language

    def log_consent(self, session_id, granted: bool):
        self.sessions[session_id]["consent"] = {
            "granted": granted,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }

    def log_message(self, session_id, speaker, original, translated):
        encrypted_entry = {
            "speaker": speaker,
            "original": encrypt_data(original),
            "translated": encrypt_data(translated),
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        self.sessions[session_id]["conversation"].append(encrypted_entry)

    def get_session(self, session_id):
        return self.sessions.get(session_id)