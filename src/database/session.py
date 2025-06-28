"""
@file session.py
@description SQLAlchemy数据库会话文件
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

from src.server.config import settings

# 创建数据库引擎
engine = create_engine(
    settings.DATABASE_URL, 
    poolclass=QueuePool,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {},
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=5,
    max_overflow=10
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建模型基类
Base = declarative_base()

# 初始化数据库
def init_db():
    """初始化数据库，创建所有表"""
    from src.database import models  # noqa
    Base.metadata.create_all(bind=engine) 