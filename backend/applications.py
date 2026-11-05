from datetime import UTC, datetime
from typing import Annotated, Literal

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pymongo import DESCENDING

from auth import require_role, users

router = APIRouter(prefix="/applications", tags=["applications"])
applications = users.database["applications"]


class StatusUpdate(BaseModel):
    status: Literal[
        "under_review",
        "additional_documents_requested",
        "approved",
        "rejected",
    ]


def format_application(application):
    return {
        "id": str(application["_id"]),
        "status": application["status"],
        "created_at": application["created_at"].isoformat(),
        "updated_at": application["updated_at"].isoformat(),
    }


@router.post("", status_code=201)
def create_application(
    user: Annotated[dict, Depends(require_role("applicant"))],
):
    now = datetime.now(UTC)
    result = applications.insert_one(
        {
            "applicant_email": user["email"],
            "status": "submitted",
            "created_at": now,
            "updated_at": now,
        }
    )

    return {
        "id": str(result.inserted_id),
        "status": "submitted",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }


@router.get("/mine")
def list_my_applications(
    user: Annotated[dict, Depends(require_role("applicant"))],
):
    records = applications.find(
        {"applicant_email": user["email"]}
    ).sort("created_at", DESCENDING)

    return [format_application(record) for record in records]


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

    now = datetime.now(UTC)
    result = applications.update_one(
        {"_id": object_id},
        {"$set": {"status": update.status, "updated_at": now}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")

    application = applications.find_one({"_id": object_id})
    return format_application(application)