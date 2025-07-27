"""
Lightweight SQLite database configuration for DeepCAD platform
"""
import os
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from typing import Generator
import logging

logger = logging.getLogger(__name__)

# SQLite database path
DATABASE_PATH = os.path.join(os.path.dirname(__file__), "..", "deepcad.db")
SQLITE_URL = f"sqlite:///{DATABASE_PATH}"

# Create engine with SQLite
engine = create_engine(
    SQLITE_URL,
    echo=False,  # Set to True for SQL debugging
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all ORM models
Base = declarative_base()

# Metadata for database schema management
metadata = MetaData()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session
    Use this in FastAPI route dependencies
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_database():
    """
    Initialize database tables
    Call this during application startup
    """
    # Import all models to ensure they're registered
    from gateway.models import components, scene, materials, computation
    
    Base.metadata.create_all(bind=engine)
    logger.info(f"Database initialized at {DATABASE_PATH}")


def check_db_health() -> bool:
    """
    Check if database connection is healthy
    """
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False