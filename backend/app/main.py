#  Every new router gets registered here with the /api/v1 prefix.

import socketio
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.auth import verify_token, CurrentUser
from app.config import settings
# from app.middleware.rate_limit import rate_limit_middleware
# from starlette.middleware.base import BaseHTTPMiddleware
from app.routers import auth, contacts, deals, activities, users, platform, billing, webhook, files, organizations, analytics, export
from app.sockets.manager import sio

# FastAPI app
fastapi_app = FastAPI(
    title="Pixel CRM",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

@fastapi_app.get("/docs", include_in_schema=False)
async def get_swagger_documentation(user: CurrentUser = Depends(verify_token)):
    return get_swagger_ui_html(openapi_url="/openapi.json", title="Pixel CRM - Swagger UI")

@fastapi_app.get("/redoc", include_in_schema=False)
async def get_redoc_documentation(user: CurrentUser = Depends(verify_token)):
    return get_redoc_html(openapi_url="/openapi.json", title="Pixel CRM - ReDoc")

@fastapi_app.get("/openapi.json", include_in_schema=False)
async def openapi(user: CurrentUser = Depends(verify_token)):
    return get_openapi(title="Pixel CRM", version="1.0.0", routes=fastapi_app.routes)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# fastapi_app.add_middleware(BaseHTTPMiddleware, dispatch=rate_limit_middleware)

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

@fastapi_app.get("/health")
async def health():
    return {"status": "ok", "service": "pixel-crm"}

@fastapi_app.get("/")
async def root(user: CurrentUser = Depends(verify_token)):
    return {"message": f"Pixel CRM API - Welcome {user.first_name}"}

# Mount Socket.io on FastAPI
# Socket.io runs at /socket.io/
socket_app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)

# This is what uvicorn runs — not fastapi_app directly
app = socket_app
#        Important — uvicorn ab app run karega jo socket_app hai. Yeh Socket.io aur FastAPI dono ko ek saath handle karta hai same port pe.