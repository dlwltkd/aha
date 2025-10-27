from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Integer, String, Text, func

from .database import Base


class Event(Base):
    __tablename__ = "events"

    id: Column[int] = Column(Integer, primary_key=True, index=True)
    topic: Column[str] = Column(String(255), index=True, nullable=False)
    ts: Column[datetime] = Column(DateTime(timezone=True), nullable=False, index=True)
    source: Column[str] = Column(String(64), nullable=True)
    payload_json: Column[dict | list | None] = Column(JSON, nullable=True)
    raw_payload: Column[str] = Column(Text, nullable=True)


class LightingState(Base):
    __tablename__ = "lighting_state"

    room: Column[str] = Column(String(64), primary_key=True)
    status: Column[str] = Column(String(32), nullable=False, default="off")
    updated_at: Column[datetime] = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    payload_json: Column[dict | list | None] = Column(JSON, nullable=True)
