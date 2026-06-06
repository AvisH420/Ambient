# ambient

An end-to-end IoT monitoring system. Three environmental sensors on a microcontroller publish readings over WiFi every five seconds; a Python backend persists them to a database and runs unsupervised anomaly detection on each sample in real time; a React dashboard visualizes the live stream and flags anything unusual.

Built from scratch in roughly two weeks: hardware wiring, firmware, broker, backend, ML, frontend, deployment.

<!-- Replace this with a screenshot of the running dashboard once you have one.
     Drag the image into GitHub's README editor and it auto-uploads. -->
<!-- ![Dashboard](docs/dashboard.png) -->

## Demo

<!-- Record a 30 - 60 second screen capture (QuickTime: Cmd+Shift+5 -> Record Selected Portion).
     Show: the dashboard live, breathing on the DHT22, an anomaly appearing.
     Drag the .mov into GitHub's README editor when editing on the web - it uploads to
     user-attachments and gives you a video URL. Paste that link below. -->

<!-- https://github.com/user-attachments/assets/your-video-id-here -->

A short demo showing live sensor data and a triggered anomaly when I breathe on the humidity sensor.

## What it does

- ESP32 reads temperature and humidity from a DHT22 and air quality from an MQ-135 every 5 seconds
- Publishes each reading as JSON to an MQTT broker over WiFi
- A FastAPI backend subscribes to the broker, writes every reading to SQLite, and runs an Isolation Forest on it
- The model learns the joint distribution of all three sensors and flags any reading that doesn't fit
- A React dashboard polls the backend every 3 seconds and renders live charts, current values, and an anomaly log

## Stack

| Layer | Technology |
|---|---|
| Hardware | ESP32 dev board, DHT22, MQ-135, breadboard |
| Firmware | C++ (Arduino framework), PubSubClient, DHT sensor library |
| Transport | MQTT (Mosquitto broker), JSON payload |
| Backend | Python, FastAPI, paho-mqtt, SQLAlchemy, SQLite |
| ML | scikit-learn (Isolation Forest, StandardScaler), joblib |
| Frontend | React, Vite, Tailwind CSS, Framer Motion, Recharts |
| Hosting | Vercel (frontend), Render (backend) |

## Architecture

```
                    +----------+    +----------+
                    |  DHT22   |    |  MQ-135  |
                    +----+-----+    +----+-----+
                         |               |
                         +-------+-------+
                                 |
                              +--+--+
                              |ESP32|  (Arduino + WiFi)
                              +--+--+
                                 |  JSON over MQTT
                                 v
                       +-----------------+
                       | Mosquitto       |
                       | broker          |
                       +--------+--------+
                                |  paho-mqtt
                                v
                       +-----------------+
                       | FastAPI         |
                       |  + bg thread    |
                       |  + IsolationFst |
                       +--------+--------+
                                |
                  +-------------+--------------+
                  v                            v
            +-----------+              +---------------+
            | SQLite    |              | REST endpoints|
            | (readings)|              | /readings     |
            +-----------+              | /stats        |
                                       | /anomalies    |
                                       | /model/...    |
                                       +-------+-------+
                                               |
                                               v
                                       +---------------+
                                       | React + Vite  |
                                       | dashboard     |
                                       +---------------+
```

## Features

- Real-time ingestion of multi-sensor data over MQTT with reconnect-on-failure
- Background MQTT subscriber inside the FastAPI process - sensor ingestion and HTTP serving share a single deployable unit
- Unsupervised anomaly detection with Isolation Forest, scaled with StandardScaler for stable behavior across three very different value ranges
- Model + scaler persistence to disk so a backend restart preserves learned baseline
- On-demand model retraining via `POST /model/retrain` for handling environmental drift
- REST API: latest readings, time-windowed stats (min, max, avg), flagged anomalies, model status
- Responsive React dashboard with live charts, animated metric cards, and an anomaly log

## Repository layout

```
iot-project/
  firmware/                 ESP32 Arduino sketch
    sensor_publisher.ino
  backend/                  FastAPI + Mosquitto + Isolation Forest
    main.py                 endpoints, lifespan, CORS
    mqtt_subscriber.py      background thread, ingests MQTT, scores via Isolation Forest
    db.py                   SQLAlchemy engine, Reading model
    anomaly.py              Isolation Forest train / score / persist
    requirements.txt
    README.md
  frontend/                 Vite + React + Tailwind + Framer Motion
    src/App.jsx             entire dashboard UI
    src/api.js              fetch wrappers
    package.json
    README.md
  README.md                 this file
```

## Run locally

You need: an ESP32 wired to a DHT22 (data on GPIO 4) and an MQ-135 (AOUT on GPIO 34), a Mac (or Linux) with Homebrew, Node.js, and Python 3.10+.

```bash
# 1. broker
brew install mosquitto
brew services start mosquitto

# 2. backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app

# 3. frontend (in another terminal)
cd frontend
npm install
npm run dev

# 4. train the model once enough data is collected
curl -X POST http://localhost:8000/model/retrain
```

Open http://localhost:5173 in a browser.

## Notes on the ML

Isolation Forest is an unsupervised ensemble method (Liu, Ting, Zhou, 2008): it builds 100 random binary trees that recursively partition the feature space, and an anomaly score is derived from how few splits it takes to isolate a given sample. Anomalies, being sparse, get isolated quickly; normal points need deeper trees. This avoids needing labeled data, which matters here because nobody has hand-labeled "what an unusual room reading looks like."

The three features (temperature, humidity, air quality) sit on wildly different scales - 28 - 30 for temperature, 40 - 70 for humidity, 2000 - 3500 for the MQ-135 ADC value. The trees are scale-insensitive in principle, but standardizing with `StandardScaler` makes the `contamination=0.05` cutoff behave more predictably across features, so the model treats a 3°C anomaly with the same severity as a 300-unit air-quality anomaly. I considered a one-class SVM and an LSTM autoencoder. SVM doesn't scale as well to streaming and needs more tuning; the autoencoder is overkill for a 3-dimensional feature space but is a natural v2 if I extend to time-series windows.

## What I'd do next

- LSTM autoencoder trained on sliding windows of readings, to catch temporal anomalies (a slow drift) that Isolation Forest misses
- Cloud MQTT broker (HiveMQ) + Postgres on Supabase so the dashboard runs without anything on my laptop
- WebSocket push from the backend instead of HTTP polling, for genuinely realtime UI
- Auto-retrain on a schedule (nightly cron) to handle gradual environmental drift without manual intervention
- A second sensor node so I can compare two locations

## License

MIT
