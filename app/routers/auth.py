from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db import users_collection
from passlib.context import CryptContext
from jose import jwt
from app.config import SECRET_KEY
import datetime

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


class User(BaseModel):
    email: str
    password: str


# def hash_password(password):
#     return pwd_context.hash(password)
def hash_password(password):
    # bcrypt limit fix (72 bytes)
    password = password[:72]
    return pwd_context.hash(password)


# def verify_password(password, hashed):
#     return pwd_context.verify(password, hashed)

def verify_password(password, hashed):
    password = password[:72]
    return pwd_context.verify(password, hashed)


def create_token(email):
    payload = {
        "sub": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ✅ SIGNUP
@router.post("/signup")
def signup(user: User):
    existing = users_collection.find_one({"email": user.email})

    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    users_collection.insert_one({
        "email": user.email,
        "password": hash_password(user.password)
    })

    return {"message": "User created successfully"}


# ✅ LOGIN
@router.post("/login")
def login(user: User):
    db_user = users_collection.find_one({"email": user.email})

    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user.email)

    return {"token": token}