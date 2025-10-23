"""Simple MQTT event logger that mirrors home automation events into JSONL."""

from __future__ import annotations

import json
import logging
import signal
import sys
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import paho.mqtt.client as mqtt


@dataclass
class LoggerConfig:
    mqtt_host: str = "127.0.0.1"
    mqtt_port: int = 1883
    mqtt_topic: str = "events/#"
    client_id: str = "home_events_logger"
    log_path: Path = Path("/var/log/home/events.jsonl")


class EventLogger:
    def __init__(self, config: LoggerConfig):
        self._config = config
        self._client = mqtt.Client(client_id=config.client_id, clean_session=True)
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._stopped = threading.Event()
        self._lock = threading.Lock()

    def start(self) -> None:
        logging.info("Connecting to MQTT broker %s:%s", self._config.mqtt_host, self._config.mqtt_port)
        self._client.connect(self._config.mqtt_host, self._config.mqtt_port, keepalive=30)
        self._client.loop_start()

    def stop(self) -> None:
        logging.info("Stopping event logger")
        self._stopped.set()
        self._client.loop_stop()
        self._client.disconnect()

    # MQTT callbacks

    def _on_connect(self, client, userdata, flags, rc):
        logging.info("Connected to MQTT with code %s", rc)
        client.subscribe(self._config.mqtt_topic, qos=1)

    def _on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
        except json.JSONDecodeError:
            logging.warning("Skipping malformed payload on %s", msg.topic)
            return
        entry = {
            "ts": payload.get("ts"),
            "topic": msg.topic,
            "data": payload,
        }
        self._append(entry)

    def _append(self, entry: dict) -> None:
        line = json.dumps(entry, separators=(",", ":"))
        log_path = self._config.log_path
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with self._lock:
            with log_path.open("a", encoding="utf-8") as handle:
                handle.write(line + "\n")


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )


def main() -> int:
    setup_logging()
    config = LoggerConfig()
    service = EventLogger(config)

    stop_event = threading.Event()

    def handle_signal(signum, frame):  # type: ignore[override]
        logging.info("Received signal %s", signum)
        stop_event.set()

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    service.start()
    try:
        while not stop_event.is_set():
            stop_event.wait(0.5)
    finally:
        service.stop()

    return 0


if __name__ == "__main__":
    sys.exit(main())

