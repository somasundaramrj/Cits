from fastapi import APIRouter, Depends, HTTPException

from app.routers.auth import get_current_user
from app.websocket_manager import manager
from app.database import UsersRepo

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


@router.get("/stats")
async def stats(_=Depends(require_admin)):
    return await manager.stats()


@router.get("/connected-vehicles")
async def connected_vehicles(_=Depends(require_admin)):
    async with manager.lock:
        return [
            {
                "vehicleId": cv.vehicle_id,
                "state": cv.state,
                "connectedAt": cv.connected_at,
                "lastSeen": cv.last_seen,
                "role": cv.role,
            }
            for cv in manager.vehicles.values()
        ]


@router.get("/users")
async def users(_=Depends(require_admin)):
    all_users = await UsersRepo.list_all()
    return [
        {
            "vehicleId": u["vehicleId"],
            "fullName": u["full_name"],
            "vehicleType": u["vehicle_type"],
            "role": u["role"],
            "accountStatus": u["account_status"],
        }
        for u in all_users
    ]


@router.get("/health")
async def health(_=Depends(require_admin)):
    s = await manager.stats()
    return {"status": "ok", **s}
