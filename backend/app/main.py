#  Every new router gets registered here with the /api/v1 prefix.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, contacts, deals, activities

app = FastAPI(
    title="Pixel CRM",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(contacts.router, prefix="/api/v1")
app.include_router(deals.router, prefix="/api/v1")
app.include_router(activities.router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "pixel-crm"}

@app.get("/")
async def root():
    return {"message": "Pixel CRM API"}