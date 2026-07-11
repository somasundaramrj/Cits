"""
Mongo is used for persistent data only (users, vehicle registration,
login history, collision/event history, analytics snapshots).

Live vehicle tracking NEVER touches Mongo - that lives entirely in
websocket_manager's in-memory store.

If Mongo isn't reachable (e.g. quick local demo without a Mongo server
running), we transparently fall back to a process-memory store so the
rest of the app (auth, websockets, collision prediction) still works.
This fallback is for developer convenience only - use real MongoDB in
production.
"""
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger("citsx.database")

client: AsyncIOMotorClient | None = None
db = None
USING_MEMORY_FALLBACK = False

# In-memory fallback collections (dicts keyed by a unique field)
memory_store = {
    "users": {},          # keyed by email
    "login_history": [],
    "vehicle_history": [],
    "collision_history": [],
    "road_events": [],
    "emergency_logs": [],
    "analytics": [],
}


async def connect_to_mongo():
    global client, db, USING_MEMORY_FALLBACK
    try:
        client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=2000)
        await client.admin.command("ping")
        db = client[settings.MONGO_DB_NAME]
        USING_MEMORY_FALLBACK = False
        logger.info("Connected to MongoDB at %s", settings.MONGO_URI)

        await db.users.create_index("email", unique=True)
        await db.users.create_index("vehicleId", unique=True)
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "MongoDB unavailable (%s). Falling back to in-memory storage. "
            "This is fine for a local demo but NOT for production.",
            exc,
        )
        USING_MEMORY_FALLBACK = True


async def close_mongo_connection():
    if client:
        client.close()


# ---------------------------------------------------------------------------
# Thin repository layer so routers don't need to branch on fallback vs real DB
# ---------------------------------------------------------------------------

class UsersRepo:
    @staticmethod
    async def find_by_email(email: str):
        if USING_MEMORY_FALLBACK:
            return memory_store["users"].get(email)
        return await db.users.find_one({"email": email})

    @staticmethod
    async def find_by_vehicle_id(vehicle_id: str):
        if USING_MEMORY_FALLBACK:
            for u in memory_store["users"].values():
                if u.get("vehicleId") == vehicle_id:
                    return u
            return None
        return await db.users.find_one({"vehicleId": vehicle_id})

    @staticmethod
    async def insert(user: dict):
        if USING_MEMORY_FALLBACK:
            memory_store["users"][user["email"]] = user
            return user
        await db.users.insert_one(user)
        return user

    @staticmethod
    async def record_login(email: str, ts: float, ip: str | None = None):
        entry = {"email": email, "timestamp": ts, "ip": ip}
        if USING_MEMORY_FALLBACK:
            memory_store["login_history"].append(entry)
        else:
            await db.login_history.insert_one(entry)

    @staticmethod
    async def list_all(limit: int = 500):
        if USING_MEMORY_FALLBACK:
            return list(memory_store["users"].values())[:limit]
        cursor = db.users.find().limit(limit)
        return [u async for u in cursor]


class EventsRepo:
    @staticmethod
    async def log_event(collection: str, doc: dict):
        if USING_MEMORY_FALLBACK:
            memory_store.setdefault(collection, []).append(doc)
        else:
            await db[collection].insert_one(doc)
