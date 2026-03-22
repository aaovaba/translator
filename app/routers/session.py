from fastapi import APIRouter, Depends, Header, HTTPException
from bson import ObjectId
from app.db import db
from app.services.security import get_current_user

router = APIRouter()


def get_user_from_header(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.replace("Bearer ", "")
    user = get_current_user(token)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    return user


@router.get("/sessions")
def get_sessions(user=Depends(get_user_from_header)):
    sessions = list(
        db.sessions.find(
            {"user_email": user["sub"]},
            {"transcript": 0}
        ).sort("started_at", -1)
    )

    for s in sessions:
        s["_id"] = str(s["_id"])

    return sessions


@router.get("/sessions/{session_id}")
def get_session(session_id: str):
    session = db.sessions.find_one({"_id": ObjectId(session_id)})

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session["_id"] = str(session["_id"])
    return session