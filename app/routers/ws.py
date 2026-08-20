import time
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError

from app.security import decode_token, verify_token_type
from app.database import UsersRepo, EventsRepo
from app.websocket_manager import manager

router = APIRouter()
logger = logging.getLogger("citsx.ws")


@router.websocket("/ws/vehicle")
async def vehicle_socket(websocket: WebSocket, token: str = Query(...)):
    # Authenticate the WebSocket using the same JWT access token issued at login.
    try:
        decoded = decode_token(token)
        if not verify_token_type(decoded, "access"):
            raise JWTError("wrong token type")
        user = await UsersRepo.find_by_email(decoded["sub"])
        if not user:
            raise JWTError("user not found")
    except JWTError:
        await websocket.close(code=4401)
        return

    vehicle_id = user["vehicleId"]
    await manager.connect(vehicle_id, websocket, role=user.get("role", "driver"))
    await manager.broadcast_event(
        {"type": "VehicleConnected", "vehicleId": vehicle_id, "timestamp": time.time()}
    )

    try:
        while True:
            msg = await websocket.receive_json()
            msg_type = msg.get("type", "update")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "clientTime": msg.get("clientTime"), "serverTime": time.time()})
                continue

            if msg_type == "collisionAlert":
                # Client detected a risk locally and is reporting it for logging/analytics.
                await EventsRepo.log_event("collision_history", {**msg, "reportedBy": vehicle_id})
                await manager.broadcast_event({"type": "CollisionWarning", **msg, "vehicleId": vehicle_id})
                continue

            # Default: a vehicle position/state update packet.
            msg["vehicleId"] = vehicle_id  # never trust client-asserted identity
            await manager.update_state(vehicle_id, msg)

            if msg.get("brake") and msg.get("speed", 0) > 0:
                pass  # hook point for HardBrake event detection if desired

    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(vehicle_id)
        await manager.broadcast_event(
            {"type": "VehicleDisconnected", "vehicleId": vehicle_id, "timestamp": time.time()}
        )
