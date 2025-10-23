# Smart Home Vision-Fusion Scaffold

This directory packages the first iteration of the ceiling-mounted Raspberry Pi 5 vision stack together with its MQTT event logger and the Pi Zero doorway spotlight controller. Everything is written to run headless under `systemd`, but you can launch each service manually while iterating.

## Layout

- `vision/fuse_vision.py` – captures frames via PiCamera2, performs background-subtraction tracking, fuses PIR activity, publishes MQTT events, and mirrors them to `/var/log/home/vision_events.jsonl`.
- `logging/events_logger.py` – subscribes to `events/#` and writes JSONL lines to `/var/log/home/events.jsonl`.
- `nodes/spotlight_controller.py` – drives the two-servo spotlight/LED on each doorway Pi Zero based on the fused events.
- `config/default_config.json` – starter config for the Pi 5 vision service; copy it to `/etc/home-vision/config.json` and edit the geometry once calibrated.
- `config/spotlight_template.json` – template for each doorway node covering servo angles, MQTT triggers, and LED settings.

## Quick Start (Pi 5)

1. Copy the repo to `/opt/home-vision` and install the dependencies:

   ```bash
   sudo apt update
   sudo apt install -y python3-opencv python3-picamera2 python3-numpy
   python3 -m pip install paho-mqtt --break-system-packages
   ```

2. Prepare the configuration and log directories:

   ```bash
   sudo mkdir -p /etc/home-vision /var/log/home
   sudo cp /opt/home-vision/config/default_config.json /etc/home-vision/config.json
   sudo chown -R pi:pi /opt/home-vision /etc/home-vision /var/log/home
   ```

3. Run the vision fusion loop as the `pi` user for a live test:

   ```bash
   python3 /opt/home-vision/vision/fuse_vision.py
   ```

4. In another shell, start the event logger:

   ```bash
   python3 /opt/home-vision/logging/events_logger.py
   ```

5. Use `mosquitto_sub -v -t 'events/#'` to confirm the topics and payloads being emitted.

## Calibrating the Virtual Geometry

After mounting the camera, grab a still frame (e.g., with `python3 - <<'PY' ...`) and mark the bedroom/bathroom thresholds manually. Update `/etc/home-vision/config.json` with normalized coordinates (0–1). Each doorway needs just two points, and the living-room polygon can be any convex shape covering the seating area. Start with the defaults and refine once you have real imagery.

## What to Build Next

- Script a helper to capture calibration frames and overlay the current virtual lines/polygon.
- Add optional YOLO/ByteTrack integration behind a feature flag for tougher lighting conditions.
- Flesh out the PIR publisher on the Pi Zero nodes with retry logic and a health heartbeat topic.

## Doorway Spotlight Node (Pi Zero)

1. Copy `nodes/spotlight_controller.py` to `/opt/pir-node/spotlight_controller.py`.
2. Copy `config/spotlight_template.json` to `/etc/pir-node/spotlight.json` and edit:
   - `trigger_on_topics` / `trigger_off_topics` – e.g., bedroom node turns on for `events/person/bedroom/out`, off for `events/person/bathroom/in`.
   - `servo_pan_angle` / `servo_tilt_angle` – target direction (degrees) that should illuminate the opposite room.
   - `servo_rest_pan` / `servo_rest_tilt` – resting orientation that points back at the doorway.
   - `brightness` and `light_hold_seconds` – how bright and how long the beam stays on before auto-resting.
3. Install runtime dependencies:

   ```bash
   sudo apt install -y python3-gpiozero
   python3 -m pip install paho-mqtt --break-system-packages
   ```

4. Test the node manually:

   ```bash
   python3 /opt/pir-node/spotlight_controller.py /etc/pir-node/spotlight.json
   ```

   Publish a fake event to make sure it reacts:

   ```bash
   mosquitto_pub -t 'events/person/bedroom/out' -m '{"ts":0}'
   ```

5. Register a `systemd` unit (for example `/etc/systemd/system/spotlight-bedroom.service`) so it auto-starts once networking and Mosquitto are ready.

### Spotlight Calibration Tips

- The resting posture should point at the local doorway; set `servo_rest_pan` / `servo_rest_tilt` accordingly, then use the calibration command below to verify.
- The target posture should illuminate the destination room. Adjust `servo_pan_angle` / `servo_tilt_angle` until the beam lands where you want it.
- Use the new orientation helper to move the servos without running the full controller:

  ```bash
  # Move to the resting (doorway) orientation
  python3 /opt/pir-node/spotlight_controller.py /etc/pir-node/spotlight.json --set-orientation rest

  # Move to the target (cross-room) orientation
  python3 /opt/pir-node/spotlight_controller.py /etc/pir-node/spotlight.json --set-orientation target
  ```

- Add `--duration 5` to hold the pose for five seconds, or leave it at the default (0) to keep the pose until you press Ctrl+C.
- Include `--set-brightness 0.6` (0–1 range) if you want to dim the LED while aligning.
