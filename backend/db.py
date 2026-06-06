"""Database layer: SQLAlchemy engine, session factory, and the Reading model."""

from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, Float, DateTime, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./readings.db"

# check_same_thread=False is required because the MQTT subscriber runs in a
# separate thread from the FastAPI request handlers, and SQLite by default
# refuses cross-thread access. SQLAlchemy serializes access via the pool, so
# this is safe.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class Reading(Base):
    """A single sensor reading published by the ESP32."""

    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    air_quality = Column(Integer, nullable=False)

    # Set by the anomaly-detection step (Phase 3). Until then, always False / None.
    is_anomaly = Column(Boolean, default=False, nullable=False)
    anomaly_score = Column(Float, nullable=True)


def init_db():
    """Create tables if they don't exist. Safe to call repeatedly."""
    Base.metadata.create_all(bind=engine)
