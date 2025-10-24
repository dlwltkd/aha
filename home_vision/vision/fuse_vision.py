"""Vision and sensor fusion service for the smart home motion system.

This module captures frames from a PiCamera, performs lightweight person
detection using background subtraction, and fuses the detections with recent
PIR events delivered over MQTT. High-level movement events are published back
through MQTT and optionally mirrored to a local JSONL log for quick
inspection.

The pipeline is intentionally modular so it can evolve toward more advanced
detectors (YOLO, trackers, etc.) without disrupting the MQTT contract.
"""

from __future__ import annotations

import json
import logging
import queue
import signal
import sys
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Optional, Tuple

import cv2  # type: ignore
import numpy as np
import paho.mqtt.client as mqtt


try:
    from libcamera import Transform  # type: ignore
    from picamera2 import Picamera2  # type: ignore
except ImportError:  # pragma: no cover - allows development on non-Pi hosts
    Picamera2 = None
    Transform = None


# --- Configuration -----------------------------------------------------------------


DEFAULT_CONFIG_PATH = Path("/etc/home-vision/config.json")
DEFAULT_JSONL_PATH = Path("/var/log/home/vision_events.jsonl")


@dataclass
class GeometryConfig:
    bed_door: Tuple[Tuple[float, float], Tuple[float, float]] = (
        (0.15, 0.30),
        (0.35, 0.30),
    )
    bath_door: Tuple[Tuple[float, float], Tuple[float, float]] = (
        (0.65, 0.40),
        (0.85, 0.40),
    )
    living_room_polygon: Tuple[Tuple[float, float], ...] = (
        (0.2, 0.35),
        (0.8, 0.35),
        (0.85, 0.9),
        (0.15, 0.9),
    )


@dataclass
class FusionConfig:
    mqtt_host: str = "127.0.0.1"
    mqtt_port: int = 1883
    mqtt_client_id: str = "vision_fusion"
    mqtt_topics: Dict[str, str] = field(
        default_factory=lambda: {
            "pir": "sensors/door/+/pir",
            "vision_state": "vision/state/living_room",
            "bed_event_out": "events/person/bedroom/out",
            "bed_event_in": "events/person/bedroom/in",
            "bath_event_out": "events/person/bathroom/out",
            "bath_event_in": "events/person/bathroom/in",
        }
    )
    min_contour_area: int = 1_200  # pixels after resize
    frame_resize_width: int = 640
    detection_cooldown: float = 1.0  # seconds before accepting a new crossing
    presence_hold_seconds: float = 3.0
    presence_confirm_seconds: float = 0.5
    pir_boost_window: float = 2.0
    pir_cross_window: float = 1.0
    log_jsonl_path: Path = DEFAULT_JSONL_PATH
    geometry: GeometryConfig = field(default_factory=GeometryConfig)


# --- Utility functions --------------------------------------------------------------


def load_config(path: Path) -> FusionConfig:
    if not path.exists():
        return FusionConfig()

    with path.open("r", encoding="utf-8") as cfg_file:
        raw = json.load(cfg_file)

    geometry = raw.get("geometry", {})
    living_polygon = tuple(tuple(p) for p in geometry.get("living_room_polygon", [])) or None

    config = FusionConfig(
        mqtt_host=raw.get("mqtt_host", "127.0.0.1"),
        mqtt_port=raw.get("mqtt_port", 1883),
        mqtt_client_id=raw.get("mqtt_client_id", "vision_fusion"),
        min_contour_area=raw.get("min_contour_area", 1_200),
        frame_resize_width=raw.get("frame_resize_width", 640),
        detection_cooldown=raw.get("detection_cooldown", 1.0),
        presence_hold_seconds=raw.get("presence_hold_seconds", 3.0),
        presence_confirm_seconds=raw.get("presence_confirm_seconds", 0.5),
        pir_boost_window=raw.get("pir_boost_window", 2.0),
        pir_cross_window=raw.get("pir_cross_window", 1.0),
        log_jsonl_path=Path(
            raw.get("log_jsonl_path", DEFAULT_JSONL_PATH.as_posix())
        ),
    )

    if geometry:
        config.geometry = GeometryConfig(
            bed_door=tuple(tuple(pt) for pt in geometry.get("bed_door", config.geometry.bed_door)),  # type: ignore[arg-type]
            bath_door=tuple(tuple(pt) for pt in geometry.get("bath_door", config.geometry.bath_door)),  # type: ignore[arg-type]
            living_room_polygon=tuple(
                tuple(pt) for pt in (living_polygon or config.geometry.living_room_polygon)
            ),
        )

    return config


def normalize_point(point: Tuple[int, int], frame_size: Tuple[int, int]) -> Tuple[float, float]:
    width, height = frame_size
    return point[0] / float(width), point[1] / float(height)


def point_in_polygon(point: Tuple[float, float], polygon: Tuple[Tuple[float, float], ...]) -> bool:
    """Ray casting algorithm for point-in-polygon."""
    x, y = point
    inside = False

    for i in range(len(polygon)):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % len(polygon)]
        intersects = ((y1 > y) != (y2 > y)) and (
            x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-6) + x1
        )
        if intersects:
            inside = not inside
    return inside


def line_crossed(
    prev_point: Tuple[float, float],
    curr_point: Tuple[float, float],
    line: Tuple[Tuple[float, float], Tuple[float, float]],
) -> Optional[str]:
    """Detect whether the centroid crossed the virtual line.

    Returns the direction string: "into_living" or "into_room".
    """
    (x1, y1), (x2, y2) = line

    # Represent line as Ax + By + C = 0
    a = y1 - y2
    b = x2 - x1
    c = x1 * y2 - x2 * y1

    prev_side = a * prev_point[0] + b * prev_point[1] + c
    curr_side = a * curr_point[0] + b * curr_point[1] + c

    if prev_side == 0 or curr_side == 0 or prev_side * curr_side > 0:
        return None

    # Determine direction using vector dot product with line normal.
    direction_vector = (curr_point[0] - prev_point[0], curr_point[1] - prev_point[1])
    normal = (a, b)
    dot = direction_vector[0] * normal[0] + direction_vector[1] * normal[1]
    return "into_living" if dot > 0 else "into_room"


def utc_timestamp() -> float:
    return time.time()


# --- MQTT helpers -------------------------------------------------------------------


class MqttClient:
    """Thin wrapper over paho-mqtt with helper publish method."""

    def __init__(self, config: FusionConfig):
        self._config = config
        self._client = mqtt.Client(client_id=config.mqtt_client_id, clean_session=True)
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._client.on_disconnect = self._on_disconnect
        self._event_queue: "queue.Queue[Tuple[str, dict]]" = queue.Queue()

    def start(self) -> None:
        self._client.connect(self._config.mqtt_host, self._config.mqtt_port, keepalive=30)
        self._client.loop_start()

    def stop(self) -> None:
        self._client.loop_stop()
        self._client.disconnect()

    # MQTT callbacks

    def _on_connect(self, client, userdata, flags, rc):
        logging.info("MQTT connected with code %s", rc)
        client.subscribe(self._config.mqtt_topics["pir"])

    def _on_disconnect(self, client, userdata, rc):
        logging.warning("MQTT disconnected with code %s", rc)

    def _on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
        except json.JSONDecodeError:
            logging.warning("Ignoring malformed MQTT payload on %s", msg.topic)
            return
        self._event_queue.put((msg.topic, payload))

    # Public API

    def publish(self, topic: str, payload: dict) -> None:
        encoded = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self._client.publish(topic, payload=encoded, qos=1, retain=False)

    def poll_event(self, timeout: float = 0.0) -> Optional[Tuple[str, dict]]:
        try:
            return self._event_queue.get(timeout=timeout)
        except queue.Empty:
            return None


# --- Vision Fusion ------------------------------------------------------------------


class VisionFusionService:
    def __init__(self, config: FusionConfig):
        self._config = config
        self._mqtt = MqttClient(config)
        self._camera = None
        self._frame_size: Tuple[int, int] = (config.frame_resize_width, int(config.frame_resize_width * 0.75))
        self._bg = cv2.createBackgroundSubtractorMOG2(history=500, varThreshold=16, detectShadows=True)

        self._last_centroid: Optional[Tuple[float, float]] = None
        self._last_cross_time: Dict[str, float] = {"bed": 0.0, "bath": 0.0}
        self._last_presence_state = False
        self._presence_enter_time = 0.0
        self._presence_exit_start = 0.0

        self._pir_last_on: Dict[str, float] = {"bedroom": 0.0, "bathroom": 0.0}
        self._pir_last_topic: Optional[str] = None

        self._log_path = config.log_jsonl_path
        self._jsonl_lock = threading.Lock()

    # --- Setup ---------------------------------------------------------------------

    def start(self) -> None:
        logging.info("Starting VisionFusionService")
        self._mqtt.start()
        self._camera = self._init_camera()

    def stop(self) -> None:
        logging.info("Stopping VisionFusionService")
        self._mqtt.stop()
        if self._camera:
            self._camera.stop()

    def _init_camera(self):
        if Picamera2 is None:
            logging.error("Picamera2 not available. Run on Raspberry Pi with libcamera support.")
            raise RuntimeError("Picamera2 not available")

        camera = Picamera2()
        camera_config = camera.create_video_configuration(
            transform=Transform(vflip=True, hflip=True),
            main={"size": (1280, 720), "format": "RGB888"},
        )
        camera.configure(camera_config)
        camera.start()
        time.sleep(0.5)  # warm-up
        logging.info("Camera initialised with %s", camera_config)
        return camera

    # --- Main loop -----------------------------------------------------------------

    def run(self) -> None:
        self.start()
        try:
            while True:
                self._handle_pir_events()
                frame = self._capture_frame()
                if frame is None:
                    continue
                detection = self._process_frame(frame)
                if detection:
                    self._handle_detection(detection)
        except KeyboardInterrupt:
            logging.info("Received interrupt - shutting down")
        finally:
            self.stop()

    def _handle_pir_events(self) -> None:
        while True:
            event = self._mqtt.poll_event(timeout=0.0)
            if not event:
                break
            topic, payload = event
            zone = "bedroom" if "bedroom" in topic else "bathroom"
            if payload.get("state") == "ON":
                self._pir_last_on[zone] = payload.get("ts", utc_timestamp())
                self._pir_last_topic = topic
                logging.debug("PIR %s triggered at %.3f", zone, self._pir_last_on[zone])

    def _pir_boost_active(self, ts: Optional[float] = None) -> bool:
        ts = ts or utc_timestamp()
        window = self._config.pir_boost_window
        return any(ts - last_ts <= window for last_ts in self._pir_last_on.values())

    def _capture_frame(self) -> Optional[np.ndarray]:
        if self._camera is None:
            return None

        raw = self._camera.capture_array("main")
        target_height = int(raw.shape[0] * self._config.frame_resize_width / raw.shape[1])
        frame = cv2.resize(raw, (self._config.frame_resize_width, target_height))
        self._frame_size = (frame.shape[1], frame.shape[0])
        return frame

    def _process_frame(self, frame: np.ndarray) -> Optional[Dict]:
        mask = self._bg.apply(frame)
        _, thresh = cv2.threshold(mask, 200, 255, cv2.THRESH_BINARY)

        # Remove noise
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        cleaned = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel, iterations=2)

        contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            self._update_presence(None)
            return None

        largest = max(contours, key=cv2.contourArea)
        min_area = self._config.min_contour_area
        if self._pir_boost_active():
            min_area *= 0.6

        if cv2.contourArea(largest) < min_area:
            self._update_presence(None)
            return None

        moments = cv2.moments(largest)
        if moments["m00"] == 0:
            self._update_presence(None)
            return None

        cx = int(moments["m10"] / moments["m00"])
        cy = int(moments["m01"] / moments["m00"])
        centroid_norm = normalize_point((cx, cy), self._frame_size)

        self._update_presence(centroid_norm)

        prev = self._last_centroid
        self._last_centroid = centroid_norm

        if prev is None:
            return None

        ts = utc_timestamp()
        detection = {
            "centroid": centroid_norm,
            "ts": ts,
        }

        # Detect crossing events
        for door_name, line in (
            ("bed", self._config.geometry.bed_door),
            ("bath", self._config.geometry.bath_door),
        ):
            direction = line_crossed(prev, centroid_norm, line)
            if not direction:
                continue

            last_cross = self._last_cross_time[door_name]
            if ts - last_cross < self._config.detection_cooldown:
                continue

            detection.update({"door": door_name, "direction": direction})
            self._last_cross_time[door_name] = ts
            break

        return detection

    def _update_presence(self, centroid: Optional[Tuple[float, float]]):
        ts = utc_timestamp()
        in_polygon = centroid is not None and point_in_polygon(
            centroid, self._config.geometry.living_room_polygon
        )

        if in_polygon:
            if not self._last_presence_state:
                if self._presence_enter_time == 0:
                    self._presence_enter_time = ts
                elif ts - self._presence_enter_time >= self._config.presence_confirm_seconds:
                    self._last_presence_state = True
                    self._presence_exit_start = 0
                    self._publish_presence(True)
            else:
                self._presence_exit_start = 0
        else:
            self._presence_enter_time = 0
            if self._last_presence_state:
                if self._presence_exit_start == 0:
                    self._presence_exit_start = ts
                elif ts - self._presence_exit_start >= self._config.presence_hold_seconds:
                    self._last_presence_state = False
                    self._publish_presence(False)
            else:
                self._presence_exit_start = 0

    # --- Event handling -------------------------------------------------------------

    def _handle_detection(self, detection: Dict) -> None:
        door = detection.get("door")
        direction = detection.get("direction")
        centroid = detection["centroid"]
        ts = detection["ts"]

        if not door or not direction:
            return

        zone = "bedroom" if door == "bed" else "bathroom"
        pir_ts = self._pir_last_on.get(zone, 0.0)
        pir_recent = ts - pir_ts <= self._config.pir_cross_window

        confidence = 0.85 if pir_recent else 0.7
        payload = {"ts": ts, "dir": direction, "centroid": centroid, "conf": confidence}

        if direction == "into_living":
            topic = (
                self._config.mqtt_topics["bed_event_out"]
                if zone == "bedroom"
                else self._config.mqtt_topics["bath_event_out"]
            )
        else:
            topic = (
                self._config.mqtt_topics["bed_event_in"]
                if zone == "bedroom"
                else self._config.mqtt_topics["bath_event_in"]
            )

        self._publish(topic, payload)

    def _publish_presence(self, present: bool) -> None:
        payload = {
            "present": present,
            "conf": 0.9 if present else 0.8,
            "ts": utc_timestamp(),
        }
        topic = self._config.mqtt_topics["vision_state"]
        self._publish(topic, payload)

    def _publish(self, topic: str, payload: dict) -> None:
        logging.debug("Publishing %s -> %s", topic, payload)
        self._mqtt.publish(topic, payload)
        self._append_jsonl(topic, payload)

    def _append_jsonl(self, topic: str, payload: dict) -> None:
        if not self._log_path:
            return

        line = json.dumps(
            {"ts": payload.get("ts", utc_timestamp()), "topic": topic, "data": payload},
            separators=(",", ":"),
        )
        with self._jsonl_lock:
            self._log_path.parent.mkdir(parents=True, exist_ok=True)
            with self._log_path.open("a", encoding="utf-8") as handle:
                handle.write(line + "\n")


# --- Entrypoint ---------------------------------------------------------------------


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )


def main(config_path: Path = DEFAULT_CONFIG_PATH) -> int:
    setup_logging()

    config = load_config(config_path)
    service = VisionFusionService(config)

    stop_event = threading.Event()

    def handle_signal(signum, frame):  # type: ignore[override]
        logging.info("Received signal %s", signum)
        stop_event.set()

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    service.start()
    try:
        while not stop_event.is_set():
            service._handle_pir_events()
            frame = service._capture_frame()
            if frame is None:
                time.sleep(0.5)
                continue
            detection = service._process_frame(frame)
            if detection:
                service._handle_detection(detection)
    finally:
        service.stop()

    return 0


if __name__ == "__main__":
    sys.exit(main())
