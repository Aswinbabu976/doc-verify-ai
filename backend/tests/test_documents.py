from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import jwt
from fastapi.testclient import TestClient

import documents as documents_module
from auth import jwt_secret
from main import app

client = TestClient(app)


class FakeDocumentsCollection:
    def insert_one(self, document):
        self.saved_document = document
        return SimpleNamespace(inserted_id="test-document-id")


def make_token(role: str) -> str:
    expires = datetime.now(UTC) + timedelta(minutes=5)
    payload = {"sub": "test@example.com", "role": role, "exp": expires}
    return jwt.encode(payload, jwt_secret, algorithm="HS256")


def test_applicant_can_upload_valid_pdf(monkeypatch, tmp_path):
    fake_documents = FakeDocumentsCollection()
    monkeypatch.setattr(documents_module, "documents", fake_documents)
    monkeypatch.setattr(documents_module, "upload_directory", tmp_path)

    response = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {make_token('applicant')}"},
        files={"file": ("synthetic.pdf", b"%PDF-1.4\nsynthetic test file", "application/pdf")},
    )

    assert response.status_code == 201
    assert response.json()["filename"] == "synthetic.pdf"
    assert fake_documents.saved_document["uploaded_by"] == "test@example.com"
    assert len(list(Path(tmp_path).iterdir())) == 1


def test_upload_rejects_non_pdf(monkeypatch, tmp_path):
    monkeypatch.setattr(documents_module, "documents", FakeDocumentsCollection())
    monkeypatch.setattr(documents_module, "upload_directory", tmp_path)

    response = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {make_token('applicant')}"},
        files={"file": ("notes.txt", b"not a PDF", "text/plain")},
    )

    assert response.status_code == 415


def test_reviewer_cannot_upload_as_applicant(monkeypatch, tmp_path):
    monkeypatch.setattr(documents_module, "documents", FakeDocumentsCollection())
    monkeypatch.setattr(documents_module, "upload_directory", tmp_path)

    response = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {make_token('reviewer')}"},
        files={"file": ("synthetic.pdf", b"%PDF-1.4\nsynthetic test file", "application/pdf")},
    )

    assert response.status_code == 403