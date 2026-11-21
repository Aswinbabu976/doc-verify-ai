from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pymongo import DESCENDING

from auth import require_role, users

router = APIRouter(prefix="/admin/audit", tags=["audit history"])
audit_events = users.database["audit_events"]


def record_audit_event(
    *,
    actor_email: str,
    event_type: str,
    target_type: str,
    target_id: str,
    details: dict | None = None,
) -> None:
    audit_events.insert_one(
        {
            "actor_email": actor_email,
            "event_type": event_type,
            "target_type": target_type,
            "target_id": target_id,
            "details": details or {},
            "occurred_at": datetime.now(UTC),
        }
    )


@router.get("")
def list_audit_events(
    admin: Annotated[dict, Depends(require_role("admin"))],
    limit: int = Query(default=100, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
):
    records = (
        audit_events.find({})
        .sort("occurred_at", DESCENDING)
        .skip(skip)
        .limit(limit)
    )

    return [
        {
            "id": str(event["_id"]),
            "actor_email": event["actor_email"],
            "event_type": event["event_type"],
            "target_type": event["target_type"],
            "target_id": event["target_id"],
            "details": event.get("details", {}),
            "occurred_at": event["occurred_at"].isoformat(),
        }
        for event in records
    ]