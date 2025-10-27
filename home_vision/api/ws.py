import asyncio
import json
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    """Simple in-memory WebSocket registry for broadcasting events."""

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(websocket)

    async def broadcast(self, payload: Any) -> None:
        async with self._lock:
            targets = list(self._connections)
        if not targets:
            return

        if isinstance(payload, bytes):
            message = payload.decode()
        elif isinstance(payload, str):
            message = payload
        else:
            message = json.dumps(payload, ensure_ascii=False)

        to_remove: list[WebSocket] = []
        for connection in targets:
            try:
                await connection.send_text(message)
            except Exception:
                to_remove.append(connection)

        if to_remove:
            async with self._lock:
                for conn in to_remove:
                    self._connections.discard(conn)
