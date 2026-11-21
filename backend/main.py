from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from admin import router as admin_router
from applications import router as applications_router
from audit import router as audit_router
from auth import router as auth_router
from documents import router as documents_router
from verification_rules import router as verification_rules_router

app = FastAPI(title="DocVerify AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(applications_router)
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(admin_router)
app.include_router(verification_rules_router)
app.include_router(audit_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}