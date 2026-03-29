from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from app.db import users_collection
from passlib.context import CryptContext
from jose import jwt, JWTError
from app.config import SECRET_KEY
import datetime
import random
import smtplib
from email.message import EmailMessage

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ==========================================
# 📧 EMAIL SETTINGS
# ==========================================
SENDER_EMAIL = "your-email@gmail.com" 
SENDER_PASSWORD = "your-gmail-app-password-here" 

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

class VerifyOTP(BaseModel):
    email: EmailStr
    otp: str

# ==========================================
# 🔐 HELPERS
# ==========================================
def hash_password(password: str):
    return pwd_context.hash(password[:72])

def verify_password(password: str, hashed: str):
    return pwd_context.verify(password[:72], hashed)

def create_token(email: str):
    payload = {
        "sub": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def send_otp_email(receiver_email: str, otp_code: str, subject: str):
    try:
        msg = EmailMessage()
        msg.set_content(f"Your verification code is: {otp_code}\n\nThis code will expire in 10 minutes.")
        msg['Subject'] = subject
        msg['From'] = SENDER_EMAIL
        msg['To'] = receiver_email

        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✅ OTP Email sent successfully to {receiver_email}")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")

# ==========================================
# 🆕 SIGNUP (STEP 1: Create unverified user & Send OTP)
# ==========================================
@router.post("/signup")
def signup(user: User, background_tasks: BackgroundTasks):
    existing_user = users_collection.find_one({"email": user.email})

    # If user exists and is already verified, block them
    if existing_user and existing_user.get("is_verified", True) is True:
        raise HTTPException(status_code=400, detail="User already exists and is verified. Please login.")

    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    print(f"🔑 [DEV] SIGNUP OTP for {user.email} is: {otp_code}")
    expiry_time = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)

    user_data = {
        "firstName": user.firstName,
        "lastName": user.lastName,
        "email": user.email,
        "password": hash_password(user.password),
        "mobile": user.mobile,
        "city": user.city,
        "role": "user",
        "is_active": True,
        "is_verified": False, # 👈 MUST BE VERIFIED BEFORE LOGGING IN
        "otp": otp_code,
        "otp_expiry": expiry_time,
        "created_at": datetime.datetime.utcnow()
    }

    # If they tried to sign up before but didn't verify, overwrite their old data
    if existing_user:
        users_collection.update_one({"email": user.email}, {"$set": user_data})
    else:
        users_collection.insert_one(user_data)

    background_tasks.add_task(send_otp_email, user.email, otp_code, 'Verify your Medical Translator Account')

    return {"message": "OTP sent to your email", "requires_otp": True}

# ==========================================
# 🔓 VERIFY SIGNUP (STEP 2: Activate Account)
# ==========================================
@router.post("/verify-signup")
def verify_signup(data: VerifyOTP):
    db_user = users_collection.find_one({"email": data.email})

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    stored_otp = db_user.get("otp")
    otp_expiry = db_user.get("otp_expiry")

    if not stored_otp or stored_otp != data.otp:
        raise HTTPException(status_code=401, detail="Invalid verification code")

    if otp_expiry and datetime.datetime.utcnow() > otp_expiry:
        raise HTTPException(status_code=401, detail="Verification code has expired. Please sign up again.")

    # Success! Mark as verified and remove OTP fields
    users_collection.update_one(
        {"email": data.email},
        {
            "$set": {"is_verified": True},
            "$unset": {"otp": "", "otp_expiry": ""}
        }
    )

    return {"message": "Account verified successfully! You can now login."}

# ==========================================
# 🔑 LOGIN
# ==========================================
@router.post("/login")
def login(user: LoginUser, background_tasks: BackgroundTasks):
    db_user = users_collection.find_one({"email": user.email})

    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # 👈 NEW CHECK: Ensure they verified their email during signup
    if db_user.get("is_verified", True) is False:
        raise HTTPException(status_code=403, detail="Email not verified. Please sign up again to receive a new code.")

    if db_user.get("is_active") is False:
        raise HTTPException(status_code=403, detail="Your account has been suspended by an admin.")

    otp_code = str(random.randint(100000, 999999))
    print(f"🔑 [DEV] LOGIN OTP for {user.email} is: {otp_code}")
    
    expiry_time = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    users_collection.update_one(
        {"email": user.email},
        {"$set": {"otp": otp_code, "otp_expiry": expiry_time}}
    )

    background_tasks.add_task(send_otp_email, user.email, otp_code, 'Your Medical Translator Login Code')

    return {"message": "OTP sent to your email", "requires_otp": True}

# ==========================================
# 🔓 VERIFY LOGIN OTP
# ==========================================
@router.post("/verify-otp")
def verify_otp(data: VerifyOTP):
    db_user = users_collection.find_one({"email": data.email})

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    stored_otp = db_user.get("otp")
    otp_expiry = db_user.get("otp_expiry")

    if not stored_otp or stored_otp != data.otp:
        raise HTTPException(status_code=401, detail="Invalid verification code")

    if otp_expiry and datetime.datetime.utcnow() > otp_expiry:
        raise HTTPException(status_code=401, detail="Verification code has expired. Please login again.")

    users_collection.update_one(
        {"email": data.email},
        {"$unset": {"otp": "", "otp_expiry": ""}}
    )

    token = create_token(data.email)

    return {
        "token": token,
        "user": {
            "firstName": db_user["firstName"],
            "lastName": db_user["lastName"],
            "email": db_user["email"],
            "role": db_user.get("role", "user")
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