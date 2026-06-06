"""FastAPI app: serves sensor data from SQLite, starts the MQTT worker on startup."""

from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc, func

import anomaly
import mqtt_subscriber
from db import SessionLocal, Reading, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    mqtt_subscriber.start()
    print("[app] startup complete")
    yield
    mqtt_subscriber.stop()
    print("[app] shutdown complete")


app = FastAPI(title="IoT Sensor Dashboard API", lifespan=lifespan)

# Permissive CORS during development. Tighten before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _serialize(r: Reading) -> dict:
    return {
        "id": r.id,
        "timestamp": r.timestamp.isoformat() + "Z",
        "temperature": r.temperature,
        "humidity": r.humidity,
        "air_quality": r.air_quality,
        "is_anomaly": r.is_anomaly,
        "anomaly_score": r.anomaly_score,
    }


@app.get("/")
def root():
    return {"status": "ok", "service": "IoT Sensor Dashboard API"}


@app.get("/readings")
def get_readings(limit: int = Query(100, ge=1, le=1000)):
    """Most recent N readings, newest first."""
    session = SessionLocal()
    try:
        rows = (
            session.query(Reading)
            .order_by(desc(Reading.timestamp))
            .limit(limit)
            .all()
        )
        return [_serialize(r) for r in rows]
    finally:
        session.close()


@app.get("/anomalies")
def get_anomalies(limit: int = Query(100, ge=1, le=1000)):
    """Most recent N flagged anomalies, newest first."""
    session = SessionLocal()
    try:
        rows = (
            session.query(Reading)
            .filter(Reading.is_anomaly == True)  # noqa: E712 (SQLAlchemy idiom)
            .order_by(desc(Reading.timestamp))
            .limit(limit)
            .all()
        )
        return [_serialize(r) for r in rows]
    finally:
        session.close()


@app.get("/stats")
def get_stats(hours: int = Query(1, ge=1, le=168)):
    """Min, max, and avg per sensor over the last N hours."""
    session = SessionLocal()
    try:
        since = datetime.utcnow() - timedelta(hours=hours)
        q = session.query(Reading).filter(Reading.timestamp >= since)

        count = q.count()
        if count == 0:
            return {
                "window_hours": hours,
                "count": 0,
                "temperature": None,
                "humidity": None,
                "air_quality": None,
            }

        agg = (
            session.query(
                func.min(Reading.temperature),
                func.max(Reading.temperature),
                func.avg(Reading.temperature),
                func.min(Reading.humidity),
                func.max(Reading.humidity),
                func.avg(Reading.humidity),
                func.min(Reading.air_quality),
                func.max(Reading.air_quality),
                func.avg(Reading.air_quality),
            )
            .filter(Reading.timestamp >= since)
            .one()
        )

        return {
            "window_hours": hours,
            "count": count,
            "temperature": {"min": agg[0], "max": agg[1], "avg": round(agg[2], 2)},
            "humidity":    {"min": agg[3], "max": agg[4], "avg": round(agg[5], 2)},
            "air_quality": {"min": int(agg[6]), "max": int(agg[7]), "avg": round(agg[8], 2)},
        }
    finally:
        session.close()


@app.get("/model/status")
def model_status():
    """Is an anomaly model currently loaded and scoring incoming readings?"""
    return {"ready": anomaly.is_ready()}


@app.post("/model/retrain")
def model_retrain():
    """Train the Isolation Forest on all readings currently in the DB.

    Safe to call repeatedly. Each call replaces the existing model. After this
    returns successfully, every new MQTT message gets scored.
    """
    return anomaly.train()
