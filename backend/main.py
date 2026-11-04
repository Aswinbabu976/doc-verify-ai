from typing import Annotated

from auth import require_role
from auth import router as auth_router
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="DocVerify AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/reviewer/queue")
def reviewer_queue(
    user: Annotated[dict, Depends(require_role("reviewer"))],
):
    return {"reviewer": user["email"], "items": []}