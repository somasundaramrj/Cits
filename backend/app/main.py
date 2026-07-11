import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.routers import auth, ws, admin, stats
from app.websocket_manager import background_broadcaster

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    task = asyncio.create_task(background_broadcaster())
    yield
    task.cancel()
    await close_mongo_connection()


app = FastAPI(title="C-ITS Command Center API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(stats.router)
app.include_router(ws.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
