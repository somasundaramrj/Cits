"""
Core real-time broker.

- Holds every connected vehicle's latest state in RAM (never Mongo).
- On every incoming update, recomputes which OTHER vehicles are within
  COMM_RADIUS_METERS using the Haversine formula, and pushes only that
  filtered slice to the sender (and vice versa).
- Never computes collision prediction - that's client-side only.
- Strips private fields before anything leaves the server.

This module is intentionally the ONLY place that knows about WebSockets,
so the transport can later be swapped for MQTT / C-V2X / DSRC without
touching collision-prediction or UI code (see README "Future Architecture").
"""
import asyncio
import math
import time
from dataclasses import dataclass, field
from typing import Optional

from fastapi import WebSocket

from app.config import settings

PUBLIC_FIELDS = {
    "vehicleId",
    "vehicleType",
    "latitude",
    "longitude",
    "speed",
    "heading",
    "acceleration",
    "brake",
    "timestamp",
}


def haversine_meters(lat1, lon1, lat2, lon2) -> float:
    R = 6371000.0  # Earth radius, meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@dataclass
class ConnectedVehicle:
    vehicle_id: str
    websocket: WebSocket
    state: dict = field(default_factory=dict)
    last_seen: float = field(default_factory=time.time)
    connected_at: float = field(default_factory=time.time)
    role: str = "driver"
    is_emergency: bool = False


class ConnectionManager:
    def __init__(self):
        self.vehicles: dict[str, ConnectedVehicle] = {}
        self.lock = asyncio.Lock()
        # rolling counters for dashboard stats
        self.packets_received = 0
        self.packets_sent = 0

    async def connect(self, vehicle_id: str, websocket: WebSocket, role: str = "driver"):
        await websocket.accept()
        async with self.lock:
            self.vehicles[vehicle_id] = ConnectedVehicle(vehicle_id=vehicle_id, websocket=websocket, role=role)

    async def disconnect(self, vehicle_id: str):
        async with self.lock:
            self.vehicles.pop(vehicle_id, None)

    async def update_state(self, vehicle_id: str, data: dict):
        async with self.lock:
            cv = self.vehicles.get(vehicle_id)
            if not cv:
                return
            cv.state = {k: v for k, v in data.items() if k in PUBLIC_FIELDS}
            cv.state["vehicleId"] = vehicle_id
            cv.last_seen = time.time()
            cv.is_emergency = data.get("vehicleType") == "Emergency"
        self.packets_received += 1

    async def nearby_of(self, vehicle_id: str, radius: Optional[float] = None) -> list[dict]:
        radius = radius or settings.COMM_RADIUS_METERS
        async with self.lock:
            me = self.vehicles.get(vehicle_id)
            if not me or "latitude" not in me.state:
                return []
            lat1, lon1 = me.state["latitude"], me.state["longitude"]
            out = []
            for vid, cv in self.vehicles.items():
                if vid == vehicle_id or "latitude" not in cv.state:
                    continue
                dist = haversine_meters(lat1, lon1, cv.state["latitude"], cv.state["longitude"])
                if dist <= radius:
                    packet = dict(cv.state)
                    packet["distanceMeters"] = round(dist, 1)
                    out.append(packet)
            return out

    async def broadcast_nearby_to_all(self):
        """Called on a tick (or per-update) to push each vehicle its nearby list."""
        async with self.lock:
            ids = list(self.vehicles.keys())
        for vid in ids:
            nearby = await self.nearby_of(vid)
            await self.send_to(vid, {"type": "nearbyVehicles", "vehicles": nearby, "serverTime": time.time()})

    async def send_to(self, vehicle_id: str, message: dict):
        async with self.lock:
            cv = self.vehicles.get(vehicle_id)
        if not cv:
            return
        try:
            await cv.websocket.send_json(message)
            self.packets_sent += 1
        except Exception:
            await self.disconnect(vehicle_id)

    async def broadcast_event(self, event: dict):
        """Push a system event (connect/disconnect/collision/etc) to everyone."""
        async with self.lock:
            targets = list(self.vehicles.values())
        for cv in targets:
            try:
                await cv.websocket.send_json({"type": "event", "event": event})
                self.packets_sent += 1
            except Exception:
                await self.disconnect(cv.vehicle_id)

    async def stats(self) -> dict:
        async with self.lock:
            connected = len(self.vehicles)
            emergency = sum(1 for v in self.vehicles.values() if v.is_emergency)
            speeds = [v.state.get("speed", 0) for v in self.vehicles.values() if v.state]
        avg_speed = sum(speeds) / len(speeds) if speeds else 0
        return {
            "connectedVehicles": connected,
            "emergencyVehicles": emergency,
            "averageSpeed": round(avg_speed, 1),
            "packetsReceived": self.packets_received,
            "packetsSent": self.packets_sent,
        }

    async def prune_inactive(self, timeout_seconds: float = 10.0):
        """Disconnect vehicles that stopped sending heartbeats/updates."""
        now = time.time()
        async with self.lock:
            stale = [vid for vid, cv in self.vehicles.items() if now - cv.last_seen > timeout_seconds]
        for vid in stale:
            await self.disconnect(vid)
            await self.broadcast_event(
                {"type": "VehicleDisconnected", "vehicleId": vid, "reason": "heartbeat timeout", "timestamp": now}
            )


manager = ConnectionManager()


async def background_broadcaster():
    """Runs forever, pushing nearby-vehicle lists + pruning dead connections."""
    while True:
        await manager.broadcast_nearby_to_all()
        await manager.prune_inactive()
        await asyncio.sleep(0.2)  # 5Hz broker tick; clients still send at 100ms
