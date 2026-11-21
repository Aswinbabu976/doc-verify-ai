from datetime import UTC, datetime
from typing import Annotated, Literal

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING

from audit import record_audit_event
from auth import require_role, users
from verification_rules import get_active_rule_snapshot

router = APIRouter(prefix="/applications", tags=["applications"])
applications = users.database["applications"]
documents = users.database["documents"]


class StatusUpdate(BaseModel):
    status: Literal[
        "under_review",
        "additional_documents_requested",
        "approved",
        "rejected",
    ]
    reason: str | None = Field(default=None, max_length=1000)


class DocumentsRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


def format_application(application):
    decided_at = application.get("decided_at")
    documents_requested_at = application.get("documents_requested_at")

    return {
        "id": str(application["_id"]),
        "applicant_email": application["applicant_email"],
        "status": application["status"],
        "reason": application.get("decision_reason"),
        "decided_by": application.get("decided_by"),
        "decided_at": decided_at.isoformat() if decided_at else None,
        "document_request_message": application.get(
            "document_request_message"
        ),
        "documents_requested_by": application.get("documents_requested_by"),
        "documents_requested_at": (
            documents_requested_at.isoformat()
            if documents_requested_at
            else None
        ),
        "verification_rule_versions": application.get(
            "verification_rule_versions", []
        ),
        "created_at": application["created_at"].isoformat(),
        "updated_at": application["updated_at"].isoformat(),
    }


@router.post("", status_code=201)
def create_application(
    user: Annotated[dict, Depends(require_role("applicant"))],
):
    now = datetime.now(UTC)
    rule_versions = get_active_rule_snapshot()

    application = {
        "applicant_email": user["email"],
        "status": "submitted",
        "decision_reason": None,
        "decided_by": None,
        "decided_at": None,
        "document_request_message": None,
        "documents_requested_by": None,
        "documents_requested_at": None,
        "verification_rule_versions": rule_versions,
        "created_at": now,
        "updated_at": now,
    }

    result = applications.insert_one(application)
    application["_id"] = result.inserted_id

    record_audit_event(
        actor_email=user["email"],
        event_type="application.created",
        target_type="application",
        target_id=str(result.inserted_id),
        details={"rule_versions": rule_versions},
    )

    return format_application(application)


@router.get("/mine")
def list_my_applications(
    user: Annotated[dict, Depends(require_role("applicant"))],
):
    records = applications.find(
        {"applicant_email": user["email"]}
    ).sort("created_at", DESCENDING)

    return [format_application(record) for record in records]


@router.get("/reviewer/queue")
def reviewer_queue(
    user: Annotated[dict, Depends(require_role("reviewer"))],
):
    pending_statuses = [
        "submitted",
        "under_review",
        "additional_documents_requested",
    ]
    records = applications.find(
        {"status": {"$in": pending_statuses}}
    ).sort("created_at", ASCENDING)

    return {
        "reviewer": user["email"],
        "items": [format_application(record) for record in records],
    }


@router.get("/{application_id}/documents")
def list_application_documents(
    application_id: str,
    user: Annotated[dict, Depends(require_role("reviewer"))],
):
    try:
        object_id = ObjectId(application_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Application not found")

    application = applications.find_one({"_id": object_id})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    records = documents.find(
        {"uploaded_by": application["applicant_email"]}
    ).sort("uploaded_at", ASCENDING)

    return [
        {
            "id": str(document["_id"]),
            "filename": document["original_filename"],
            "size_bytes": document["size_bytes"],
            "uploaded_at": document["uploaded_at"].isoformat(),
            "file_url": f"/documents/{document['_id']}/file",
        }
        for document in records
    ]


@router.post("/{application_id}/request-documents")
def request_additional_documents(
    application_id: str,
    request: DocumentsRequest,
    user: Annotated[dict, Depends(require_role("reviewer"))],
):
    try:
        object_id = ObjectId(application_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Application not found")

    message = request.message.strip()
    if not message:
        raise HTTPException(
            status_code=422,
            detail="Explain which additional documents are needed",
        )

    now = datetime.now(UTC)
    result = applications.update_one(
        {"_id": object_id},
        {
            "$set": {
                "status": "additional_documents_requested",
                "document_request_message": message,
                "documents_requested_by": user["email"],
                "documents_requested_at": now,
                "updated_at": now,
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")

    record_audit_event(
        actor_email=user["email"],
        event_type="application.documents_requested",
        target_type="application",
        target_id=str(object_id),
        details={"message": message},
    )

    application = applications.find_one({"_id": object_id})
    return format_application(application)


@router.patch("/{application_id}/status")
def update_application_status(
    application_id: str,
    update: StatusUpdate,
    user: Annotated[dict, Depends(require_role("reviewer"))],
):
    try:
        object_id = ObjectId(application_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Application not found")

    is_final_decision = update.status in {"approved", "rejected"}
    reason = (update.reason or "").strip()

    if is_final_decision and not reason:
        raise HTTPException(
            status_code=422,
            detail="A reason is required to approve or reject an application",
        )

    now = datetime.now(UTC)
    fields_to_update = {
        "status": update.status,
        "updated_at": now,
    }

    if is_final_decision:
        fields_to_update.update(
            {
                "decision_reason": reason,
                "decided_by": user["email"],
                "decided_at": now,
            }
        )
    else:
        fields_to_update.update(
            {
                "decision_reason": None,
                "decided_by": None,
                "decided_at": None,
            }
        )

    result = applications.update_one(
        {"_id": object_id},
        {"$set": fields_to_update},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")

    if is_final_decision:
        record_audit_event(
            actor_email=user["email"],
            event_type="application.final_decision",
            target_type="application",
            target_id=str(object_id),
            details={"status": update.status, "reason": reason},
        )

    application = applications.find_one({"_id": object_id})
    return format_application(application)