"""MQTT subscriber: runs in a background thread, writes incoming readings to the DB.

Each reading is also scored by the anomaly detector (if one is trained) before
being committed. If no model is trained yet, readings are still stored with
is_anomaly=False and anomaly_score=None.
"""

import json
import threading
import time
from datetime import datetime

import paho.mqtt.client as mqtt

import anomaly
from db import SessionLocal, Reading

MQTT_HOST = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "home/room/sensors"

_client: "mqtt.Client | None" = None
_stop_event = threading.Event()


def _on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"[mqtt] connected to {MQTT_HOST}:{MQTT_PORT}")
        client.subscribe(MQTT_TOPIC)
        print(f"[mqtt] subscribed to {MQTT_TOPIC}")
    else:
        print(f"[mqtt] connection failed, rc={rc}")


def _on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        temp = float(payload["temp"])
        humidity = float(payload["humidity"])
        air_quality = int(payload["air_quality"])

        is_anom, anom_score = anomaly.score(temp, humidity, air_quality)

        session = SessionLocal()
        try:
            reading = Reading(
                timestamp=datetime.utcnow(),
                temperature=temp,
                humidity=humidity,
                air_quality=air_quality,
                is_anomaly=is_anom,
                anomaly_score=anom_score,
            )
            session.add(reading)
            session.commit()
            flag = " *ANOMALY*" if is_anom else ""
            print(
                f"[mqtt] stored id={reading.id} "
                f"T={temp} H={humidity} AQ={air_quality}{flag}"
            )
        finally:
            session.close()
    except Exception as e:
        print(f"[mqtt] error processing message: {e}")


def _run():
    global _client
    _client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    _client.on_connect = _on_connect
    _client.on_message = _on_message

    while not _stop_event.is_set():
        try:
            _client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            _client.loop_forever()
        except Exception as e:
            print(f"[mqtt] connection error, retrying in 5s: {e}")
            time.sleep(5)


def start():
    t = threading.Thread(target=_run, daemon=True, name="mqtt-subscriber")
    t.start()


def stop():
    _stop_event.set()
    if _client:
        try:
            _client.disconnect()
        except Exception:
            pass
