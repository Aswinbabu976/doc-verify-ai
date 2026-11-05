from datetime import UTC, datetime, timedelta

import jwt
from fastapi.testclient import TestClient

from auth import jwt_secret
from main import app

client = TestClient(app)


def create_test_token(role: str) -> str:
    expires = datetime.now(UTC) + timedelta(minutes=5)
    payload = {"sub": "test@example.com", "role": role, "exp": expires}
    return jwt.encode(payload, jwt_secret, algorithm="HS256")


def test_applicant_cannot_access_reviewer_queue():
    token = create_test_token("applicant")
    response = client.get(
        "/reviewer/queue",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_reviewer_can_access_reviewer_queue():
    token = create_test_token("reviewer")
    response = client.get(
        "/reviewer/queue",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["items"] == []