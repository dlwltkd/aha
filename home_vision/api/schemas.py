from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, ConfigDict


class EventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    topic: str
    ts: datetime
    source: str | None = None
    payload_json: Any | None = None


class LightingVector(BaseModel):
    x: float = Field(ge=-1.0, le=1.0)
    y: float = Field(ge=-1.0, le=1.0)


class LightingCommand(BaseModel):
    mode: Literal["on", "off", "dim", "aim"] = "on"
    brightness: int | None = Field(default=None, ge=0, le=100)
    servo: LightingVector | None = None
    ttl_sec: int | None = Field(default=None, ge=1)


class EventsResponse(BaseModel):
    items: list[EventRead]
    count: int


class HealthResponse(BaseModel):
    status: str = "ok"
    database: str
    mqtt: str
