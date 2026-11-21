import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from audit import record_audit_event
from auth import require_role, users

router = APIRouter(prefix="/documents", tags=["documents"])
documents = users.database["documents"]

upload_directory = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))
max_upload_size = 10 * 1024 * 1024


@router.post("", status_code=201)
async def upload_document(
    file: Annotated[UploadFile, File()],
    user: Annotated[dict, Depends(require_role("applicant"))],
):
    original_filename = (
        (file.filename or "document.pdf")
        .replace("\\", "/")
        .rsplit("/", 1)[-1]
    )

    if Path(original_filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=415, detail="Only PDF files are allowed")

    content = await file.read(max_upload_size + 1)

    if len(content) > max_upload_size:
        raise HTTPException(
            status_code=413,
            detail="File size must not exceed 10 MB",
        )

    if not content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=415,
            detail="The uploaded file is not a valid PDF",
        )

    upload_directory.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{uuid4().hex}.pdf"
    stored_path = upload_directory / stored_filename
    stored_path.write_bytes(content)

    uploaded_at = datetime.now(UTC)

    try:
        result = documents.insert_one(
            {
                "original_filename": original_filename,
                "stored_filename": stored_filename,
                "size_bytes": len(content),
                "content_type": "application/pdf",
                "uploaded_by": user["email"],
                "uploaded_at": uploaded_at,
            }
        )
    except Exception:
        stored_path.unlink(missing_ok=True)
        raise

    record_audit_event(
        actor_email=user["email"],
        event_type="document.uploaded",
        target_type="document",
        target_id=str(result.inserted_id),
        details={
            "filename": original_filename,
            "size_bytes": len(content),
        },
    )

    return {
        "id": str(result.inserted_id),
        "filename": original_filename,
        "size_bytes": len(content),
        "uploaded_at": uploaded_at.isoformat(),
    }


@router.get("/{document_id}/file")
def view_document_file(
    document_id: str,
    user: Annotated[dict, Depends(require_role("reviewer"))],
):
    try:
        object_id = ObjectId(document_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Document not found")

    document = documents.find_one({"_id": object_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    stored_filename = document.get("stored_filename", "")
    if not stored_filename or Path(stored_filename).name != stored_filename:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = upload_directory / stored_filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Document file not found")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=document["original_filename"],
    )