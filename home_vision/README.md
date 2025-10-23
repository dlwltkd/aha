# Smart Home Vision-Fusion Scaffold

This directory contains the first pass of the camera-first tracking stack for the ceiling‑mounted Raspberry Pi 5 as well as the companion MQTT event logger. The code is written to run headless under `systemd`, but you can launch both services manually while iterating.

## Structure

- `vision/fuse_vision.py` – main service capturing frames, running background subtraction, fusing with PIR events, and publishing MQTT state/events while mirroring to a JSONL file.
- `logging/events_logger.py` – simple MQTT subscriber that appends everything under `events/#` to `/var/log/home/events.jsonl` for auditing.
- `config/default_config.json` – starting configuration; copy to `/etc/home-vision/config.json` and tweak geometry thresholds after calibration.

## Quick Start (Pi 5)

1. Copy the repository to `/opt/home-vision` and install dependencies:

   ```bash
   sudo apt update
   sudo apt install -y python3-opencv python3-picamera2 python3-numpy
   python3 -m pip install paho-mqtt --break-system-packages
   ```

2. Provide configuration and log directories:

   ```bash
   sudo mkdir -p /etc/home-vision /var/log/home
   sudo cp /opt/home-vision/config/default_config.json /etc/home-vision/config.json
   sudo chown -R pi:pi /opt/home-vision /etc/home-vision /var/log/home
   ```

3. Launch the vision fusion loop for a live test (run as `pi`):

   ```bash
   python3 /opt/home-vision/vision/fuse_vision.py
   ```

4. Launch the event logger in another shell:

   ```bash
   python3 /opt/home-vision/logging/events_logger.py
   ```

5. Confirm MQTT traffic with `mosquitto_sub -v -t 'events/#'` to verify published topics.

## Calibrating Virtual Geometry

Once the camera is mounted, capture a still using Picamera2 (e.g., `python3 - <<'PY' ...`) and mark the bedroom/bathroom thresholds manually. Update `/etc/home-vision/config.json` with the normalized coordinates (0–1). Only two points per doorway line are required; the living-room polygon can be any convex quadrilateral covering the seating area.

## Next Steps

- Add a helper script to snapshot calibration frames and overlay the current geometry.
- Introduce optional YOLO/ByteTrack integration behind a feature flag for night-time robustness when IR is active.
- Flesh out the PIR-side publishers on the Pi Zero nodes with retry logic and health heartbeat topics.
