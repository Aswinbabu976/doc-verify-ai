from datetime import UTC, datetime, timedelta

import jwt
from bson import ObjectId
from fastapi.testclient import TestClient

import applications as applications_module
import auth as auth_module
from auth import jwt_secret
from main import app

client = TestClient(app)


class EmptyCursor:
    def sort(self, field, direction):
        return iter(())


class FakeApplications:
    def find(self, query):
        return EmptyCursor()


class FakeUsers:
    def __init__(self, role):
        self.role = role

    def find_one(self, query):
        return {
            "_id": ObjectId(),
            "email": query["email"],
            "role": self.role,
        }


def create_test_token(role: str) -> str:
    expires = datetime.now(UTC) + timedelta(minutes=5)
    payload = {
        "sub": "test@example.com",
        "role": role,
        "exp": expires,
    }
    return jwt.encode(payload, jwt_secret, algorithm="HS256")


def test_applicant_cannot_access_reviewer_queue(monkeypatch):
    monkeypatch.setattr(auth_module, "users", FakeUsers("applicant"))
    token = create_test_token("applicant")

    response = client.get(
        "/applications/reviewer/queue",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_reviewer_can_access_reviewer_queue(monkeypatch):
    monkeypatch.setattr(auth_module, "users", FakeUsers("reviewer"))
    monkeypatch.setattr(
        applications_module,
        "applications",
        FakeApplications(),
    )
    token = create_test_token("reviewer")

    response = client.get(
        "/applications/reviewer/queue",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "reviewer": "test@example.com",
        "items": [],
    }