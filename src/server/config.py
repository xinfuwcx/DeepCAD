"""
@file config.py
@description 深基坑CAE系统服务器配置文件
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
from pydantic_settings import BaseSettings
from pathlib import Path

# 获取项目根目录
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    """
    系统配置类，使用Pydantic处理环境变量和配置
    """
    # API配置
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "深基坑CAE系统"
    
    # 版本信息
    VERSION: str = "1.0.0"
    
    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True
    
    # CORS配置
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5000"]
    
    # 数据库配置
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/data/db.sqlite3"
    
    # 文件存储路径
    UPLOAD_DIR: Path = BASE_DIR / "data" / "uploads"
    RESULTS_DIR: Path = BASE_DIR / "data" / "results"
    MODELS_DIR: Path = BASE_DIR / "data" / "models"
    
    # 计算引擎配置
    GMSH_PATH: str = os.environ.get("GMSH_PATH", "gmsh")
    TERRA_PATH: str = os.environ.get("TERRA_PATH", "terra")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# 创建配置实例
settings = Settings()

# 确保必要的目录存在
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.RESULTS_DIR, exist_ok=True)
os.makedirs(settings.MODELS_DIR, exist_ok=True) 