import socketio
from http.cookies import SimpleCookie
from app.utils.jwt import decode_access_token
from jose import JWTError

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=["https://crm-olive-seven-28.vercel.app", "http://127.0.0.1:5173"],  # specific URL, "*" nahi
    logger=False,
    engineio_logger=False
)

@sio.event
async def connect(sid, environ, auth):
    try:
        token = None

        # Cookie se token nikalo
        cookie_header = environ.get("HTTP_COOKIE", "")
        if cookie_header:
            cookie = SimpleCookie()
            cookie.load(cookie_header)
            if "access_token" in cookie:
                token = cookie["access_token"].value

        if not token:
            raise ConnectionRefusedError("No token provided")

        payload = decode_access_token(token)
        org_id = payload.get("org_id")
        user_id = payload.get("sub")

        if not org_id:
            raise ConnectionRefusedError("Invalid token")

        await sio.enter_room(sid, f"tenant_{org_id}")
        await sio.enter_room(sid, f"user_{user_id}")

        print(f"User {user_id} connected → room: tenant_{org_id}")

    except JWTError:
        raise ConnectionRefusedError("Invalid or expired token")

@sio.event
async def disconnect(sid):
    """Called when client disconnects."""
    print(f"Client {sid} disconnected")


async def emit_to_org(org_id: str, event: str, data: dict):
    """
    Emit event to all users of an organization.
    Used for: deal updates, notifications, org suspension.
    """
    await sio.emit(event, data, room=f"tenant_{org_id}")


async def emit_to_user(user_id: str, event: str, data: dict):
    """
    Emit event to specific user only.
    Used for: personal notifications, user deactivation.
    """
    await sio.emit(event, data, room=f"user_{user_id}")