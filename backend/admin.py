from datetime import UTC, datetime
from typing import Annotated, Literal

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pymongo import ASCENDING

from audit import record_audit_event
from auth import require_role, users

router = APIRouter(prefix="/admin", tags=["administration"])


class RoleUpdate(BaseModel):
    role: Literal["applicant", "reviewer", "admin"]


def format_user(user):
    created_at = user.get("created_at")

    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "created_at": created_at.isoformat() if created_at else None,
    }


@router.get("/users")
def list_users(
    admin: Annotated[dict, Depends(require_role("admin"))],
):
    records = users.find(
        {},
        {"password_hash": 0, "role_history": 0},
    ).sort("email", ASCENDING)

    return [format_user(record) for record in records]


@router.patch("/users/{user_id}/role")
def change_user_role(
    user_id: str,
    update: RoleUpdate,
    admin: Annotated[dict, Depends(require_role("admin"))],
):
    try:
        object_id = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="User not found")

    target = users.find_one({"_id": object_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = target["role"]

    if old_role == update.role:
        return format_user(target)

    if target["email"] == admin["email"]:
        raise HTTPException(
            status_code=409,
            detail="You cannot change your own role",
        )

    if (
        old_role == "admin"
        and update.role != "admin"
        and users.count_documents({"role": "admin"}) <= 1
    ):
        raise HTTPException(
            status_code=409,
            detail="The last administrator cannot be demoted",
        )

    changed_at = datetime.now(UTC)
    history_entry = {
        "actor_email": admin["email"],
        "previous_role": old_role,
        "new_role": update.role,
        "changed_at": changed_at,
    }

    result = users.update_one(
        {"_id": object_id, "role": old_role},
        {
            "$set": {"role": update.role},
            "$push": {"role_history": history_entry},
        },
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=409,
            detail="The user role changed; refresh and try again",
        )

    updated_user = users.find_one({"_id": object_id})

    record_audit_event(
        actor_email=admin["email"],
        event_type="user.role_changed",
        target_type="user",
        target_id=str(object_id),
        details={
            "email": updated_user["email"],
            "previous_role": old_role,
            "new_role": update.role,
        },
    )

    return {
        **format_user(updated_user),
        "role_change": {
            "actor_email": admin["email"],
            "previous_role": old_role,
            "new_role": update.role,
            "changed_at": changed_at.isoformat(),
        },
    }


@router.get("/users/{user_id}/role-history")
def get_user_role_history(
    user_id: str,
    admin: Annotated[dict, Depends(require_role("admin"))],
):
    try:
        object_id = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="User not found")

    user = users.find_one(
        {"_id": object_id},
        {"email": 1, "role_history": 1},
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    history = [
        {
            "actor_email": change["actor_email"],
            "previous_role": change["previous_role"],
            "new_role": change["new_role"],
            "changed_at": change["changed_at"].isoformat(),
        }
        for change in reversed(user.get("role_history", []))
    ]

    return {
        "user_id": str(user["_id"]),
        "email": user["email"],
        "role_changes": history,
    }