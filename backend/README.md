# IoT Sensor Dashboard - Backend (Phase 2)

FastAPI service that subscribes to the ESP32's MQTT topic, persists every reading to SQLite, and exposes REST endpoints for the dashboard.

## Architecture

```
ESP32 -> Mosquitto (home/room/sensors) -> mqtt_subscriber thread
                                                 |
                                                 v
                                          readings.db (SQLite)
                                                 |
                                                 v
                                       FastAPI REST endpoints
                                                 |
                                                 v
                                          React frontend
```

The MQTT subscriber runs as a background thread inside the FastAPI process. Started and stopped automatically via FastAPI's lifespan.

## Run

Make sure Mosquitto is running (`brew services list` should show `mosquitto started`) and the ESP32 is publishing.

```
cd ~/Documents/iot-project/backend
source .venv/bin/activate
uvicorn main:app --reload
```

The server starts on http://localhost:8000.

- http://localhost:8000/docs - interactive API docs (FastAPI auto-generates this from your code)
- http://localhost:8000/readings - latest readings as JSON
- http://localhost:8000/stats - aggregated stats

## Endpoints

| Method | Path                       | Returns                                   |
|--------|----------------------------|-------------------------------------------|
| GET    | /                          | health check                              |
| GET    | /readings?limit=100        | most recent N readings (max 1000)         |
| GET    | /anomalies?limit=100       | flagged anomalies only (empty until P3)   |
| GET    | /stats?hours=1             | min/max/avg per sensor over last N hours  |

## Files

- `main.py`              FastAPI app, endpoint handlers, lifespan
- `db.py`                SQLAlchemy engine, Reading model, init_db
- `mqtt_subscriber.py`   background thread that consumes MQTT and writes to DB
- `requirements.txt`     pinned dependencies
- `readings.db`          SQLite file (created on first run, ignored by git)

## Notes

- CORS is wide-open during development. Lock it down before deploying.
- `check_same_thread=False` in the SQLite connection is required because the MQTT thread writes while the FastAPI handlers read. SQLAlchemy serializes access via the pool, so this is safe.
- Anomaly detection (Phase 3) will set `is_anomaly` and `anomaly_score` on each incoming reading once the Isolation Forest is wired in.
