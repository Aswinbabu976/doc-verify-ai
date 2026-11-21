from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING

from auth import require_role, users

router = APIRouter(prefix="/admin/rules", tags=["verification rules"])
rules = users.database["verification_rule_versions"]


class RuleCreate(BaseModel):
    rule_key: str = Field(
        min_length=2,
        max_length=64,
        pattern=r"^[a-z0-9][a-z0-9_-]*$",
    )
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=2000)
    effective_from: datetime
    active: bool = True


class RuleVersionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=2000)
    effective_from: datetime
    active: bool = True


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def format_rule(rule: dict) -> dict:
    return {
        "id": str(rule["_id"]),
        "rule_key": rule["rule_key"],
        "version": rule["version"],
        "name": rule["name"],
        "description": rule["description"],
        "effective_from": rule["effective_from"].isoformat(),
        "active": rule["active"],
        "created_by": rule["created_by"],
        "created_at": rule["created_at"].isoformat(),
    }


def get_active_rule_snapshot() -> list[dict]:
    """Return the effective active version of each rule as of now."""
    now = datetime.now(UTC)
    records = rules.find(
        {"effective_from": {"$lte": now}}
    ).sort(
        [
            ("rule_key", ASCENDING),
            ("effective_from", DESCENDING),
            ("version", DESCENDING),
        ]
    )

    latest_by_key = {}
    for rule in records:
        latest_by_key.setdefault(rule["rule_key"], rule)

    return [
        {
            "rule_key": rule["rule_key"],
            "version": rule["version"],
            "name": rule["name"],
        }
        for rule in latest_by_key.values()
        if rule["active"]
    ]


@router.get("")
def list_rules(
    admin: Annotated[dict, Depends(require_role("admin"))],
):
    records = rules.find({}).sort(
        [
            ("rule_key", ASCENDING),
            ("version", DESCENDING),
        ]
    )
    return [format_rule(rule) for rule in records]


@router.post("", status_code=201)
def create_rule(
    request: RuleCreate,
    admin: Annotated[dict, Depends(require_role("admin"))],
):
    if rules.find_one({"rule_key": request.rule_key}):
        raise HTTPException(
            status_code=409,
            detail="That rule key already exists. Add a new version instead.",
        )

    now = datetime.now(UTC)
    rule = {
        "rule_key": request.rule_key,
        "version": 1,
        "name": request.name.strip(),
        "description": request.description.strip(),
        "effective_from": as_utc(request.effective_from),
        "active": request.active,
        "created_by": admin["email"],
        "created_at": now,
    }
    result = rules.insert_one(rule)
    rule["_id"] = result.inserted_id
    return format_rule(rule)


@router.post("/{rule_key}/versions", status_code=201)
def create_rule_version(
    rule_key: str,
    request: RuleVersionCreate,
    admin: Annotated[dict, Depends(require_role("admin"))],
):
    latest = rules.find_one(
        {"rule_key": rule_key},
        sort=[("version", DESCENDING)],
    )
    if not latest:
        raise HTTPException(status_code=404, detail="Rule not found")

    now = datetime.now(UTC)
    rule = {
        "rule_key": rule_key,
        "version": latest["version"] + 1,
        "name": request.name.strip(),
        "description": request.description.strip(),
        "effective_from": as_utc(request.effective_from),
        "active": request.active,
        "created_by": admin["email"],
        "created_at": now,
    }
    result = rules.insert_one(rule)
    rule["_id"] = result.inserted_id
    return format_rule(rule)


@router.post("/{rule_key}/deactivate", status_code=201)
def deactivate_rule(
    rule_key: str,
    admin: Annotated[dict, Depends(require_role("admin"))],
):
    latest = rules.find_one(
        {"rule_key": rule_key},
        sort=[("version", DESCENDING)],
    )
    if not latest:
        raise HTTPException(status_code=404, detail="Rule not found")
    if not latest["active"]:
        raise HTTPException(status_code=409, detail="Rule is already inactive")

    now = datetime.now(UTC)
    rule = {
        "rule_key": rule_key,
        "version": latest["version"] + 1,
        "name": latest["name"],
        "description": latest["description"],
        "effective_from": now,
        "active": False,
        "created_by": admin["email"],
        "created_at": now,
    }
    result = rules.insert_one(rule)
    rule["_id"] = result.inserted_id
    return format_rule(rule)