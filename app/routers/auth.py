from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from app.db import users_collection
from passlib.context import CryptContext
from jose import jwt, JWTError
from app.config import SECRET_KEY
import datetime

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"

# This tells FastAPI where to look for the token in requests
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ==========================================
# 📦 USER MODELS
# ==========================================
class User(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str
    mobile: str
    city: str

class LoginUser(BaseModel):
    email: EmailStr
    password: str

# ==========================================
# 🔐 PASSWORD HELPERS
# ==========================================
def hash_password(password: str):
    password = password[:72]  # bcrypt limit fix
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str):
    password = password[:72]
    return pwd_context.verify(password, hashed)

# ==========================================
# 🎟️ JWT TOKEN
# ==========================================
def create_token(email: str):
    payload = {
        "sub": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ==========================================
# 🆕 SIGNUP
# ==========================================
@router.post("/signup")
def signup(user: User):
    existing_user = users_collection.find_one({"email": user.email})

    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    users_collection.insert_one({
        "firstName": user.firstName,
        "lastName": user.lastName,
        "email": user.email,
        "password": hash_password(user.password),
        "mobile": user.mobile,
        "city": user.city,
        "role": "user",       # Default role is regular user
        "is_active": True,    # Default status is active
        "created_at": datetime.datetime.utcnow()
    })

    return {"message": "User created successfully"}

# ==========================================
# 🔑 LOGIN
# ==========================================
@router.post("/login")
def login(user: LoginUser):
    db_user = users_collection.find_one({"email": user.email})

    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")

    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid password")

    # Check if the user is banned
    if db_user.get("is_active") is False:
        raise HTTPException(status_code=403, detail="Your account has been suspended by an admin.")

    token = create_token(user.email)

    return {
        "token": token,
        "user": {
            "firstName": db_user["firstName"],
            "lastName": db_user["lastName"],
            "email": db_user["email"],
            "role": db_user.get("role", "user") # Return role to frontend
        }
    }

# ==========================================
# 🛡️ SECURITY DEPENDENCIES
# ==========================================
# 1. Gets the current logged-in user from the token
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = users_collection.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# 2. Ensures the logged-in user is an Admin
def get_current_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user