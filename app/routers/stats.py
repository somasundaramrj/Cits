from fastapi import APIRouter, Depends

from app.routers.auth import get_current_user
from app.websocket_manager import manager

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("")
async def get_stats(_=Depends(get_current_user)):
    return await manager.stats()
