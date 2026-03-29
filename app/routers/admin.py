from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from app.db import users_collection

# Import helper functions and models from your auth.py
from app.routers.auth import (
    get_current_admin, 
    verify_password, 
    create_token, 
    LoginUser
)

# NOTE: We removed the global dependency here so the login route is accessible
router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)

# ==========================================
# 🛑 ADMIN LOGIN ENDPOINT
# ==========================================
@router.post("/login")
def admin_login(user: LoginUser):
    db_user = users_collection.find_one({"email": user.email})

    # 1. Check if user exists
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid Credentials")

    # 2. Check password
    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid Credentials")

    # 3. STRICT CHECK: Are they actually an admin?
    if db_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access Denied: You are not an administrator.")

    # 4. Generate token
    token = create_token(user.email)

    return {
        "token": token,
        "user": {
            "email": db_user["email"],
            "firstName": db_user["firstName"],
            "role": "admin"
        }
    }

# ==========================================
# 🛡️ PROTECTED ADMIN ROUTES (Require Admin Token)
# ==========================================

# Notice we add dependencies=[Depends(get_current_admin)] specifically to these routes now

@router.get("/users", dependencies=[Depends(get_current_admin)])
def get_all_users():
    users_cursor = users_collection.find({}, {"password": 0})
    users = []
    for user in users_cursor:
        user["_id"] = str(user["_id"])
        users.append(user)
    return users


@router.put("/users/{user_id}/toggle-status", dependencies=[Depends(get_current_admin)])
def toggle_user_status(user_id: str):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    current_status = user.get("is_active", True)
    new_status = not current_status

    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": new_status}}
    )

    return {"message": "User status updated", "is_active": new_status}