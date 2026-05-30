#  Every new router gets registered here with the /api/v1 prefix.

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, contacts, deals, activities, users, platform, billing, webhook, files, organizations
from app.sockets.manager import sio

# FastAPI app
fastapi_app = FastAPI(
    title="Pixel CRM",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

@fastapi_app.get("/health")
async def health():
    return {"status": "ok", "service": "pixel-crm"}

@fastapi_app.get("/")
async def root():
    return {"message": "Pixel CRM API"}

# Mount Socket.io on FastAPI
# Socket.io runs at /socket.io/
socket_app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)

# This is what uvicorn runs — not fastapi_app directly
app = socket_app
#        Important — uvicorn ab app run karega jo socket_app hai. Yeh Socket.io aur FastAPI dono ko ek saath handle karta hai same port pe.