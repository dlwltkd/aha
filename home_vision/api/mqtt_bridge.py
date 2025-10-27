from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any

import paho.mqtt.client as mqtt
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from .config import Settings
from .models import Event
from .ws import ConnectionManager

logger = logging.getLogger(__name__)


class MQTTBridge:
    """Bridges MQTT traffic into the database + websocket layer."""

    def __init__(
        self,
        settings: Settings,
        session_maker: async_sessionmaker[AsyncSession],
        ws_manager: ConnectionManager,
        loop: asyncio.AbstractEventLoop,
    ) -> None:
        self.settings = settings
        self._session_maker = session_maker
        self._ws = ws_manager
        self._loop = loop
        self._client = mqtt.Client(client_id=settings.mqtt_client_id)
        if settings.mqtt_username:
            self._client.username_pw_set(settings.mqtt_username, settings.mqtt_password)
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._client.on_disconnect = self._on_disconnect
        self._ready = asyncio.Event()

    @property
    def is_ready(self) -> bool:
        return self._ready.is_set()

    def start(self) -> None:
        logger.info("Starting MQTT bridge to %s:%s", self.settings.mqtt_host, self.settings.mqtt_port)
        self._client.connect_async(self.settings.mqtt_host, self.settings.mqtt_port, keepalive=60)
        self._client.loop_start()

    async def stop(self) -> None:
        logger.info("Stopping MQTT bridge")
        self._client.loop_stop()
        self._client.disconnect()
        await asyncio.sleep(0)

    def publish_lighting(self, room: str, payload: dict[str, Any]) -> None:
        topic = self.settings.mqtt_command_template.format(room=room)
        body = json.dumps(payload, ensure_ascii=False)
        logger.debug("Publishing lighting command to %s: %s", topic, body)
        self._client.publish(topic, body, qos=1, retain=False)

    # MQTT callbacks -----------------------------------------------------
    def _on_connect(self, client: mqtt.Client, userdata: Any, flags: Any, rc: int) -> None:
        if rc != 0:
            logger.error("MQTT connection failed with code %s", rc)
            return
        logger.info("Connected to MQTT broker")
        topics = [(self.settings.mqtt_events_topic, 1)]
        for topic in self.settings.mqtt_presence_topics:
            topics.append((topic, 0))
        client.subscribe(topics)
        self._loop.call_soon_threadsafe(self._ready.set)

    def _on_disconnect(self, client: mqtt.Client, userdata: Any, rc: int) -> None:
        logger.warning("Disconnected from MQTT broker (rc=%s)", rc)
        self._loop.call_soon_threadsafe(self._ready.clear)

    def _on_message(self, client: mqtt.Client, userdata: Any, msg: mqtt.MQTTMessage) -> None:
        raw = msg.payload.decode(errors="ignore") if msg.payload else ""
        try:
            parsed = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            parsed = None
        future = asyncio.run_coroutine_threadsafe(
            self._handle_event(msg.topic, parsed, raw), self._loop
        )
        try:
            future.result()
        except Exception as exc:  # pragma: no cover
            logger.exception("Failed to persist MQTT message: %s", exc)

    async def _handle_event(self, topic: str, parsed: Any, raw: str) -> None:
        ts_value = None
        source = None
        if isinstance(parsed, dict):
            ts_value = parsed.get("ts")
            source = parsed.get("source")
        ts = _parse_ts(ts_value)

        async with self._session_maker() as session:
            session.add(
                Event(
                    topic=topic,
                    ts=ts,
                    source=source,
                    payload_json=parsed if isinstance(parsed, (dict, list)) else None,
                    raw_payload=raw or None,
                )
            )
            await session.commit()

        payload_for_ws = {
            "topic": topic,
            "ts": ts.isoformat(),
            "data": parsed if isinstance(parsed, (dict, list)) else raw,
        }
        await self._ws.broadcast(payload_for_ws)


def _parse_ts(value: Any) -> datetime:
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            pass
    return datetime.now(tz=timezone.utc)
