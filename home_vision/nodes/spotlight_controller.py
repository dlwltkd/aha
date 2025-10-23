"""MQTT-driven spotlight controller for the Raspberry Pi Zero doorway modules.

<<<<<<< HEAD
각 노드는 PWM LED와 2축 서보(팬/틸트)를 제어하여 지정된 방향으로 조명을
비추며, Pi 5 비전 서비스에서 전달되는 융합 이벤트를 받아 경로 조명을
자동으로 . 초기 설치 시 간단한 캘리브레이션 모드로 정확한
방향을 맞출 수 있도록 지원.
=======
Each node manages a PWM LED plus two servos (pan/tilt) that aim the beam toward
a predefined zone. The controller subscribes to fused events published by the
Pi 5 vision service, reacting by lighting the path for the occupant. A simple
calibration mode is provided so you can park the servos at the rest or target
angles during installation.
>>>>>>> 81f8f4a219d5256efbfe3836953edb9d7f5ed919
"""

from __future__ import annotations

import argparse
import json
import logging
import signal
import sys
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, List

import paho.mqtt.client as mqtt

try:
    from gpiozero import AngularServo, PWMLED  # type: ignore
except ImportError:  # pragma: no cover - allow development without hardware
    AngularServo = None
    PWMLED = None


DEFAULT_CONFIG_PATH = Path("/etc/pir-node/spotlight.json")


@dataclass
class SpotlightConfig:
    module_id: str = "doorway_bedroom"
    mqtt_host: str = "127.0.0.1"
    mqtt_port: int = 1883
    client_id: str = ""
    trigger_on_topics: List[str] = field(default_factory=list)
    trigger_off_topics: List[str] = field(default_factory=list)
    light_hold_seconds: float = 8.0
    brightness: float = 0.85
    rest_brightness: float = 0.0
    led_pwm_pin: int = 18
    led_frequency: int = 500
    servo_pan_pin: int = 12
    servo_tilt_pin: int = 13
    servo_pan_angle: float = -20.0
    servo_tilt_angle: float = -5.0
    servo_rest_pan: float = 0.0
    servo_rest_tilt: float = 0.0
    servo_min_angle: float = -90.0
    servo_max_angle: float = 90.0
    servo_min_pulse_width: float = 0.0005
    servo_max_pulse_width: float = 0.0025
    auto_rest: bool = True

    def ensure_topics(self) -> None:
        if not self.trigger_on_topics:
            self.trigger_on_topics = ["events/person/bedroom/out"]
        if not self.trigger_off_topics:
            self.trigger_off_topics = ["events/person/bathroom/in"]
        if not self.client_id:
            self.client_id = f"spotlight_{self.module_id}"


def load_config(path: Path) -> SpotlightConfig:
    config = SpotlightConfig()
    if path.exists():
        with path.open("r", encoding="utf-8") as handle:
            raw = json.load(handle)
        for key, value in raw.items():
            if hasattr(config, key):
                setattr(config, key, value)
    config.ensure_topics()
    return config


class SpotlightHardware:
    """Wrap the GPIO hardware so the controller can be mocked on non-Pi hosts."""

    def __init__(self, config: SpotlightConfig):
        self._config = config
        self._pan = None
        self._tilt = None
        self._led = None
        self._mock = False

        if AngularServo is None or PWMLED is None:
            logging.warning("gpiozero not available; running in mock hardware mode.")
            self._mock = True
            return

        self._pan = AngularServo(
            config.servo_pan_pin,
            min_angle=config.servo_min_angle,
            max_angle=config.servo_max_angle,
            min_pulse_width=config.servo_min_pulse_width,
            max_pulse_width=config.servo_max_pulse_width,
        )
        self._tilt = AngularServo(
            config.servo_tilt_pin,
            min_angle=config.servo_min_angle,
            max_angle=config.servo_max_angle,
            min_pulse_width=config.servo_min_pulse_width,
            max_pulse_width=config.servo_max_pulse_width,
        )
        self._led = PWMLED(config.led_pwm_pin, frequency=config.led_frequency)

    def set_orientation(self, pan: float, tilt: float) -> None:
        pan = self._clamp_angle(pan)
        tilt = self._clamp_angle(tilt)
        if self._mock:
            logging.info("Mock servo orientation -> pan %.1f tilt %.1f", pan, tilt)
            return
        if self._pan:
            self._pan.angle = pan
        if self._tilt:
            self._tilt.angle = tilt

    def set_brightness(self, value: float) -> None:
        value = max(0.0, min(1.0, value))
        if self._mock:
            logging.info("Mock LED brightness -> %.2f", value)
            return
        if self._led:
            self._led.value = value

    def shutdown(self) -> None:
        if self._mock:
            return
        if self._led:
            self._led.close()
        if self._pan:
            self._pan.close()
        if self._tilt:
            self._tilt.close()

    def _clamp_angle(self, angle: float) -> float:
        return max(self._config.servo_min_angle, min(self._config.servo_max_angle, angle))


class SpotlightController:
    def __init__(self, config: SpotlightConfig):
        self._config = config
        self._hardware = SpotlightHardware(config)
        self._client = mqtt.Client(client_id=config.client_id, clean_session=True)
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._last_on = 0.0
        self._current_brightness = config.rest_brightness
        self._lock = threading.Lock()

    def start(self) -> None:
        logging.info(
            "Spotlight controller %s connecting to %s:%s",
            self._config.module_id,
            self._config.mqtt_host,
            self._config.mqtt_port,
        )
        self._hardware.set_orientation(
            self._config.servo_rest_pan,
            self._config.servo_rest_tilt,
        )
        self._hardware.set_brightness(self._config.rest_brightness)
        self._client.connect(self._config.mqtt_host, self._config.mqtt_port, keepalive=30)
        self._client.loop_start()

    def stop(self) -> None:
        logging.info("Stopping spotlight controller")
        self._client.loop_stop()
        self._client.disconnect()
        self._hardware.shutdown()

    def _on_connect(self, client, userdata, flags, rc):
        logging.info("MQTT connected with result %s", rc)
        for topic in self._unique_topics(self._config.trigger_on_topics + self._config.trigger_off_topics):
            logging.info("Subscribing to %s", topic)
            client.subscribe(topic, qos=1)

    def _on_message(self, client, userdata, msg):
        topic = msg.topic
        payload = {}
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
        except json.JSONDecodeError:
            logging.warning("Ignoring malformed payload on %s", topic)

        if topic in self._config.trigger_on_topics:
            logging.info("Trigger ON from %s payload=%s", topic, payload)
            self._activate()
        elif topic in self._config.trigger_off_topics:
            logging.info("Trigger OFF from %s payload=%s", topic, payload)
            self._deactivate()

    def _activate(self) -> None:
        with self._lock:
            self._last_on = time.time()
            if self._current_brightness == self._config.brightness:
                return
            self._hardware.set_orientation(
                self._config.servo_pan_angle,
                self._config.servo_tilt_angle,
            )
            self._hardware.set_brightness(self._config.brightness)
            self._current_brightness = self._config.brightness

    def _deactivate(self) -> None:
        with self._lock:
            if self._current_brightness == self._config.rest_brightness:
                return
            self._hardware.set_brightness(self._config.rest_brightness)
            self._current_brightness = self._config.rest_brightness
            if self._config.auto_rest:
                self._hardware.set_orientation(
                    self._config.servo_rest_pan,
                    self._config.servo_rest_tilt,
                )

    def periodic(self) -> None:
        if self._config.light_hold_seconds <= 0:
            return
        with self._lock:
            if self._current_brightness != self._config.brightness:
                return
            if time.time() - self._last_on >= self._config.light_hold_seconds:
                logging.info("Auto hold expired -> turning light off")
                self._deactivate()

    @staticmethod
    def _unique_topics(topics: Iterable[str]) -> List[str]:
        seen = set()
        ordered = []
        for topic in topics:
            if topic not in seen:
                seen.add(topic)
                ordered.append(topic)
        return ordered


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Doorway spotlight controller")
    parser.add_argument(
        "config",
        nargs="?",
        default=str(DEFAULT_CONFIG_PATH),
        help="Path to the config file (default: /etc/pir-node/spotlight.json)",
    )
    parser.add_argument(
        "--set-orientation",
        choices=["rest", "target"],
        help="Calibration helper: move the servos to the given orientation and exit",
    )
    parser.add_argument(
        "--duration",
        type=float,
        default=0.0,
        help="How long to hold the pose in calibration mode (seconds). 0 keeps it until Ctrl+C",
    )
    parser.add_argument(
        "--set-brightness",
        type=float,
        help="LED brightness (0-1). Falls back to the configured value when omitted",
    )
    return parser.parse_args()


def run_orientation_mode(
    config: SpotlightConfig,
    mode: str,
    brightness: float | None,
    duration: float,
) -> int:
    hardware = SpotlightHardware(config)
    try:
        if mode == "target":
            pan = config.servo_pan_angle
            tilt = config.servo_tilt_angle
            default_brightness = config.brightness
        else:
            pan = config.servo_rest_pan
            tilt = config.servo_rest_tilt
            default_brightness = config.rest_brightness

        hardware.set_orientation(pan, tilt)
        hardware.set_brightness(default_brightness if brightness is None else brightness)

        logging.info(
            "Servo orientation applied (mode=%s, pan=%.1f, tilt=%.1f, brightness=%.2f)",
            mode,
            pan,
            tilt,
            default_brightness if brightness is None else brightness,
        )

        if duration > 0:
            time.sleep(duration)
        else:
            logging.info("Press Ctrl+C to exit calibration mode.")
            while True:
                time.sleep(1.0)
    except KeyboardInterrupt:
        logging.info("Exiting calibration mode.")
    finally:
        hardware.shutdown()
    return 0


def main() -> int:
    args = parse_arguments()
    setup_logging()
    config = load_config(Path(args.config))

    if args.set_orientation:
        return run_orientation_mode(
            config,
            args.set_orientation,
            args.set_brightness,
            args.duration,
        )

    controller = SpotlightController(config)

    stop_event = threading.Event()

    def handle_signal(signum, frame):  # type: ignore[override]
        logging.info("Received signal %s", signum)
        stop_event.set()

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    controller.start()
    try:
        while not stop_event.is_set():
            controller.periodic()
            stop_event.wait(0.5)
    finally:
        controller.stop()

    return 0


if __name__ == "__main__":
    sys.exit(main())
