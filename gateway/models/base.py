"""
Base ORM models for DeepCAD platform (SQLite version)
"""
from sqlalchemy import Column, DateTime, String, Boolean
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declared_attr
import uuid
from gateway.database import Base


class TimestampMixin:
    """Mixin to add created_at and updated_at timestamps"""
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class UUIDMixin:
    """Mixin to add UUID primary key (as string for SQLite)"""
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)


class SoftDeleteMixin:
    """Mixin to add soft delete functionality"""
    
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)


class BaseModel(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Base model with common fields for all entities"""
    
    __abstract__ = True
    
    name = Column(String(255), nullable=False, index=True)
    description = Column(String(1000), nullable=True)
    
    @declared_attr
    def __tablename__(cls):
        # Auto-generate table name from class name
        return cls.__name__.lower() + 's'