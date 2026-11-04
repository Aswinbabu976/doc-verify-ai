import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from pydantic import BaseModel, Field
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from pwdlib import PasswordHash

router = APIRouter(prefix="/auth", tags=["authentication"])
bearer_scheme = HTTPBearer()

mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017/docverify")
users = MongoClient(mongo_url).get_database().users

password_hash = PasswordHash.recommended()

# Local-development fallback. Configure JWT_SECRET through the environment
# before using this application outside your local development setup.
jwt_secret = os.getenv("JWT_SECRET") or secrets.token_urlsafe(32)


class RegisterRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str
    password: str


def create_token(email: str, role: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    payload = {"sub": email, "role": role, "exp": expires_at}
    return jwt.encode(payload, jwt_secret, algorithm="HS256")


@router.post("/register")
def register(request: RegisterRequest):
    email = request.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email address")

    users.create_index("email", unique=True)

    try:
        users.insert_one(
            {
                "email": email,
                "password_hash": password_hash.hash(request.password),
                "role": "applicant",
                "created_at": datetime.now(timezone.utc),
            }
        )
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    return {"email": email, "role": "applicant"}


@router.post("/login")
def login(request: LoginRequest):
    email = request.email.strip().lower()
    user = users.find_one({"email": email})

    if not user or not password_hash.verify(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_token(user["email"], user["role"])
    return {"access_token": token, "token_type": "bearer", "role": user["role"]}


@router.get("/me")
def current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    try:
        payload = jwt.decode(credentials.credentials, jwt_secret, algorithms=["HS256"])
        return {"email": payload["sub"], "role": payload["role"]}
    except (InvalidTokenError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid or expired login token")

def require_role(required_role: str):
    def role_checker(user: dict = Depends(current_user)):
        if user["role"] != required_role:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return role_checker