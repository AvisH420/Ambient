"""Isolation Forest anomaly detector.

Trains on every reading currently in the DB. Once trained, scores each new
incoming reading. Model + scaler are persisted to disk so they survive
backend restarts.
"""

from __future__ import annotations

import os
import threading
from typing import Optional

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from db import SessionLocal, Reading

MODEL_PATH = "model.pkl"
SCALER_PATH = "scaler.pkl"
MIN_TRAINING_SIZE = 30
CONTAMINATION = 0.05  # assume up to 5% of readings may be anomalous

# Thread-safe state. The MQTT thread reads, the retrain endpoint writes.
_lock = threading.Lock()
_model: Optional[IsolationForest] = None
_scaler: Optional[StandardScaler] = None


def _load_from_disk() -> bool:
    """Restore a previously-trained model on startup."""
    global _model, _scaler
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        _model = joblib.load(MODEL_PATH)
        _scaler = joblib.load(SCALER_PATH)
        print(f"[anomaly] loaded model from {MODEL_PATH}")
        return True
    print("[anomaly] no saved model -- waiting for first /model/retrain call")
    return False


def is_ready() -> bool:
    return _model is not None and _scaler is not None


def train() -> dict:
    """Train Isolation Forest on every reading currently in the DB."""
    global _model, _scaler

    session = SessionLocal()
    try:
        rows = session.query(Reading).all()
    finally:
        session.close()

    if len(rows) < MIN_TRAINING_SIZE:
        return {
            "trained": False,
            "reason": f"need at least {MIN_TRAINING_SIZE} readings, have {len(rows)}",
            "sample_size": len(rows),
        }

    X = np.array(
        [[r.temperature, r.humidity, r.air_quality] for r in rows],
        dtype=float,
    )

    # The three features are on wildly different scales (temp ~30, humidity ~40,
    # air_quality ~2200). Isolation Forest is tree-based and scale-insensitive
    # in theory, but standardizing makes the contamination threshold behave more
    # predictably and makes the anomaly_score easier to reason about.
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        contamination=CONTAMINATION,
        n_estimators=100,
        random_state=42,
    )
    model.fit(X_scaled)

    with _lock:
        _model = model
        _scaler = scaler

    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)

    return {
        "trained": True,
        "sample_size": len(rows),
        "contamination": CONTAMINATION,
        "features": ["temperature", "humidity", "air_quality"],
    }


def score(temp: float, humidity: float, air_quality: int) -> tuple[bool, float | None]:
    """Score a single reading.

    Returns (is_anomaly, anomaly_score). When the model is not yet trained,
    returns (False, None) so ingestion continues unaffected.

    `anomaly_score` is sklearn's `decision_function` value: higher = more normal,
    lower (often negative) = more anomalous.
    """
    with _lock:
        if _model is None or _scaler is None:
            return False, None
        X = np.array([[temp, humidity, air_quality]], dtype=float)
        X_scaled = _scaler.transform(X)
        score_val = float(_model.decision_function(X_scaled)[0])
        pred = int(_model.predict(X_scaled)[0])  # 1 = normal, -1 = anomaly
        return pred == -1, score_val


# Auto-load any saved model the moment this module is imported.
_load_from_disk()
