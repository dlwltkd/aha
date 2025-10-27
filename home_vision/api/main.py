from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, Path, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import Settings
from .database import AsyncSessionMaker, engine, get_session, init_db
from .models import Event
from .mqtt_bridge import MQTTBridge
from .schemas import EventRead, EventsResponse, HealthResponse, LightingCommand
from .ws import ConnectionManager

settings = Settings()
logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
logger = logging.getLogger("homevision.api")
ws_manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    loop = asyncio.get_running_loop()
    mqtt_bridge = MQTTBridge(settings, AsyncSessionMaker, ws_manager, loop)
    mqtt_bridge.start()
    app.state.mqtt = mqtt_bridge
    app.state.settings = settings
    app.state.ws_manager = ws_manager
    try:
        yield
    finally:
        await mqtt_bridge.stop()
        await engine.dispose()


app = FastAPI(title="Home Vision Gateway", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def healthcheck(session: AsyncSession = Depends(get_session)):
    try:
        await session.execute(select(1))
        db_status = "ok"
    except Exception:  # pragma: no cover
        db_status = "error"
    mqtt_status = "ready" if app.state.mqtt.is_ready else "connecting"
    overall = "ok" if db_status == "ok" and mqtt_status == "ready" else "degraded"
    return HealthResponse(status=overall, database=db_status, mqtt=mqtt_status)


@app.get("/api/events", response_model=EventsResponse)
async def list_events(
    limit: int = Query(default=50, ge=1, le=500),
    since: datetime | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Event).order_by(Event.ts.desc()).limit(limit)
    if since:
        stmt = stmt.where(Event.ts >= since)
    result = await session.execute(stmt)
    events = result.scalars().all()
    items = [EventRead.model_validate(event) for event in events]
    return EventsResponse(items=items, count=len(items))


@app.post("/api/lighting/{room}/set", status_code=202)
async def set_lighting(
    command: LightingCommand,
    room: str = Path(pattern=r"^[a-z_]+$"),
):
    if room not in settings.allowed_rooms:
        raise HTTPException(status_code=404, detail="Unknown room")
    if not app.state.mqtt.is_ready:
        raise HTTPException(status_code=503, detail="MQTT bridge not ready")
    app.state.mqtt.publish_lighting(room, command.model_dump(exclude_none=True))
    return {"status": "accepted"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    if settings.initial_broadcast_limit > 0:
        events: list[EventRead] = []
        async with AsyncSessionMaker() as session:
            stmt = select(Event).order_by(Event.ts.desc()).limit(settings.initial_broadcast_limit)
            result = await session.execute(stmt)
            events = [EventRead.model_validate(event) for event in result.scalars().all()]
        if events:
            events.reverse()
            await websocket.send_json(
                {"type": "initial", "items": [event.model_dump(mode="json") for event in events]}
            )
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)

