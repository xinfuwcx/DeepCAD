"""
@file dependencies.py
@description FastAPI依赖项定义
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from fastapi import Depends, HTTPException, status
from typing import Generator, Optional
from sqlalchemy.orm import Session
from src.database.session import SessionLocal
from src.core.modeling.models import ModelingEngine
from src.core.simulation.models import ComputeEngine

# 数据库会话依赖
def get_db() -> Generator[Session, None, None]:
    """
    提供数据库会话依赖
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 建模引擎依赖
def get_modeling_engine() -> ModelingEngine:
    """
    提供建模引擎实例
    """
    return ModelingEngine()

# 计算引擎依赖
def get_compute_engine() -> ComputeEngine:
    """
    提供计算引擎实例
    """
    return ComputeEngine()

# 验证项目存在
async def validate_project_exists(project_id: int, db: Session = Depends(get_db)) -> int:
    """
    验证项目是否存在
    
    Args:
        project_id (int): 项目ID
        db (Session): 数据库会话
        
    Returns:
        int: 如果项目存在，返回项目ID
        
    Raises:
        HTTPException: 如果项目不存在
    """
    # 在实际实现中，这应该从数据库中检查项目
    # 这里只是一个示例
    if project_id < 1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"项目ID {project_id} 不存在"
        )
    return project_id 