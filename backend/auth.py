import os
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from pydantic import BaseModel, Field
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

router = APIRouter(prefix="/auth", tags=["authentication"])
bearer_scheme = HTTPBearer()

mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017/docverify")
users = MongoClient(mongo_url).get_database().users

password_hash = PasswordHash.recommended()

# Set JWT_SECRET in the environment when running outside local development.
jwt_secret = os.getenv("JWT_SECRET") or secrets.token_urlsafe(32)


class RegisterRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str
    password: str


def create_token(email: str) -> str:
    expires_at = datetime.now(UTC) + timedelta(minutes=30)
    payload = {"sub": email, "exp": expires_at}
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
                "created_at": datetime.now(UTC),
                "role_history": [],
            }
        )
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists",
        )

    return {"email": email, "role": "applicant"}


@router.post("/login")
def login(request: LoginRequest):
    email = request.email.strip().lower()
    user = users.find_one({"email": email})

    if not user or not password_hash.verify(
        request.password,
        user["password_hash"],
    ):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_token(user["email"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
    }


@router.get("/me")
def current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials,
        Depends(bearer_scheme),
    ],
):
    try:
        payload = jwt.decode(
            credentials.credentials,
            jwt_secret,
            algorithms=["HS256"],
        )
        email = payload["sub"]
    except (InvalidTokenError, KeyError, TypeError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired login token",
        )

    # Read the current role from MongoDB so role changes take effect
    # without trusting a possibly outdated role inside the token.
    user = users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="User account not found")

    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
    }


def require_role(required_role: str):
    def role_checker(
        user: Annotated[dict, Depends(current_user)],
    ):
        if user["role"] != required_role:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return role_checker