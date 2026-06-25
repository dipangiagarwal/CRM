import socketio
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.auth import verify_token, CurrentUser
from app.config import settings
from app.routers import (auth, contacts, deals, activities, users, 
                         platform, billing, webhook, files, 
                         organizations, analytics, export)
from app.sockets.manager import sio

# FastAPI app
fastapi_app = FastAPI(
    title="Pixel CRM",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# ✅ Docs public kar diye — interview/portfolio ke liye
@fastapi_app.get("/docs", include_in_schema=False)
async def get_swagger_documentation():
    return get_swagger_ui_html(
        openapi_url="/openapi.json", 
        title="Pixel CRM - Swagger UI"
    )

@fastapi_app.get("/redoc", include_in_schema=False)
async def get_redoc_documentation():
    return get_redoc_html(
        openapi_url="/openapi.json", 
        title="Pixel CRM - ReDoc"
    )

@fastapi_app.get("/openapi.json", include_in_schema=False)
async def openapi():
    return get_openapi(
        title="Pixel CRM", 
        version="1.0.0", 
        routes=fastapi_app.routes
    )

# ✅ CORS fix — wildcard for now
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://crm-olive-seven-28.vercel.app",
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",  # local dev ke liye
    ],  # baad mein FRONTEND_URL se replace karna

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
fastapi_app.include_router(auth.router, prefix="/api/v1")
fastapi_app.include_router(contacts.router, prefix="/api/v1")
fastapi_app.include_router(deals.router, prefix="/api/v1")
fastapi_app.include_router(activities.router, prefix="/api/v1")
fastapi_app.include_router(users.router, prefix="/api/v1")
fastapi_app.include_router(platform.router, prefix="/api/v1")
fastapi_app.include_router(billing.router, prefix="/api/v1")
fastapi_app.include_router(webhook.router, prefix="/api/v1")
fastapi_app.include_router(files.router, prefix="/api/v1")
fastapi_app.include_router(organizations.router, prefix="/api/v1")
fastapi_app.include_router(analytics.router, prefix="/api/v1")
fastapi_app.include_router(export.router, prefix="/api/v1")

# ✅ Health check — public
@fastapi_app.get("/health")
async def health():
    return {"status": "ok", "service": "pixel-crm"}

@fastapi_app.get("/")
async def root():
    return {"message": "Pixel CRM API - Live ✅"}

# Socket.io mount
socket_app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
app = socket_app