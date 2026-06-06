# IoT Project — Progress Log

   ## Done
   - Hardware wired: ESP32 + DHT22 (GPIO 4) + MQ-135 (GPIO 34)
     - Both sensors powered from breadboard 3.3V rail, NOT VIN
     - MQ-135 AOUT on GPIO 34 (ADC1, WiFi-safe)
     - ESP32 mounted using male-to-female extension jumpers
   - Arduino toolchain: IDE 2.x + ESP32 board package installed
   - Sketch: sensor_publisher.ino — reads sensors, publishes JSON to MQTT
   - Mosquitto broker on Mac: brew install, config has `listener 1883`
     and `allow_anonymous true`, listening on all interfaces
   - Verified: ESP32 publishes to home/room/sensors, mosquitto_sub on
     Mac receives the JSON every 5 seconds

   ## Up next
   - Phase 2: FastAPI backend
     - Python project, paho-mqtt subscriber, SQLite via SQLAlchemy
     - REST endpoints: /readings, /anomalies, /stats, /model/retrain

   ## Notes for next time
   - Mac IP (may change): 192.168.0.112 — re-check with `ipconfig getifaddr en0`
   - MQTT topic: home/room/sensors
   - MQ-135 needs ~24h burn-in for stable readings (let it run!)