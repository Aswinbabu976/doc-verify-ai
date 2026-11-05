from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from applications import router as applications_router
from auth import router as auth_router
from documents import router as documents_router

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


@app.get("/health")
def health_check():
    return {"status": "ok"}