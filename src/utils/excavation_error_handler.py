"""
@file excavation_error_handler.py
@description 深基坑系统错误处理模块
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import logging
import traceback
import sys
from typing import Dict, Any, Optional, Type, List, Union
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from pydantic import ValidationError

# 配置日志
logger = logging.getLogger("ExcavationErrorHandler")

# 基础异常类
class ExcavationError(Exception):
    """深基坑系统基础异常类"""
    
    def __init__(
        self,
        message: str,
        code: str = "EXCAVATION_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "code": self.code,
            "message": self.message,
            "details": self.details
        }

# 项目异常
class ProjectError(ExcavationError):
    """项目相关异常"""
    def __init__(
        self,
        message: str,
        code: str = "PROJECT_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, code, status_code, details)

class ProjectNotFoundError(ProjectError):
    """项目不存在异常"""
    def __init__(
        self,
        project_id: int,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        message = message or f"项目 {project_id} 不存在"
        super().__init__(
            message=message,
            code="PROJECT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"project_id": project_id, **(details or {})}
        )

# 几何异常
class GeometryError(ExcavationError):
    """几何相关异常"""
    def __init__(
        self,
        message: str,
        code: str = "GEOMETRY_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, code, status_code, details)

class GeometryCreationError(GeometryError):
    """几何创建异常"""
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            code="GEOMETRY_CREATION_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )

# 网格异常
class MeshError(ExcavationError):
    """网格相关异常"""
    def __init__(
        self,
        message: str,
        code: str = "MESH_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, code, status_code, details)

class MeshGenerationError(MeshError):
    """网格生成异常"""
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            code="MESH_GENERATION_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )

# 模型异常
class ModelError(ExcavationError):
    """模型相关异常"""
    def __init__(
        self,
        message: str,
        code: str = "MODEL_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, code, status_code, details)

class ModelCreationError(ModelError):
    """模型创建异常"""
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            code="MODEL_CREATION_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )

# 分析异常
class AnalysisError(ExcavationError):
    """分析相关异常"""
    def __init__(
        self,
        message: str,
        code: str = "ANALYSIS_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, code, status_code, details)

class AnalysisExecutionError(AnalysisError):
    """分析执行异常"""
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            code="ANALYSIS_EXECUTION_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )

# AI相关异常
class AIError(ExcavationError):
    """AI相关异常"""
    def __init__(
        self,
        message: str,
        code: str = "AI_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, code, status_code, details)

class PINNError(AIError):
    """PINN相关异常"""
    def __init__(
        self,
        message: str,
        code: str = "PINN_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, code, status_code, details)

class InverseAnalysisError(AIError):
    """反演分析异常"""
    def __init__(
        self,
        message: str,
        code: str = "INVERSE_ANALYSIS_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, code, status_code, details)

class IoTDataError(AIError):
    """IoT数据异常"""
    def __init__(
        self,
        message: str,
        code: str = "IOT_DATA_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, code, status_code, details)

# 数据库异常
class DatabaseError(ExcavationError):
    """数据库异常"""
    def __init__(
        self,
        message: str,
        code: str = "DATABASE_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, code, status_code, details)

# 文件异常
class FileError(ExcavationError):
    """文件相关异常"""
    def __init__(
        self,
        message: str,
        code: str = "FILE_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, code, status_code, details)

class FileNotFoundError(FileError):
    """文件不存在异常"""
    def __init__(
        self,
        file_path: str,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        message = message or f"文件 {file_path} 不存在"
        super().__init__(
            message=message,
            code="FILE_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"file_path": file_path, **(details or {})}
        )

# 权限异常
class PermissionError(ExcavationError):
    """权限相关异常"""
    def __init__(
        self,
        message: str,
        code: str = "PERMISSION_ERROR",
        status_code: int = status.HTTP_403_FORBIDDEN,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, code, status_code, details)

# 验证异常
class ValidationError(ExcavationError):
    """验证相关异常"""
    def __init__(
        self,
        message: str,
        code: str = "VALIDATION_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, code, status_code, details)

# 配置异常
class ConfigError(ExcavationError):
    """配置相关异常"""
    def __init__(
        self,
        message: str,
        code: str = "CONFIG_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, code, status_code, details)

# 系统异常
class SystemError(ExcavationError):
    """系统相关异常"""
    def __init__(
        self,
        message: str,
        code: str = "SYSTEM_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, code, status_code, details)

# 错误处理函数
def handle_excavation_error(exc: ExcavationError) -> JSONResponse:
    """处理深基坑系统异常"""
    logger.error(f"{exc.code}: {exc.message}", exc_info=True)
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_dict()
    )

def handle_validation_error(exc: RequestValidationError) -> JSONResponse:
    """处理请求验证异常"""
    errors = []
    for error in exc.errors():
        error_loc = " -> ".join([str(loc) for loc in error["loc"]])
        errors.append({
            "location": error_loc,
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.error(f"请求验证错误: {errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "code": "VALIDATION_ERROR",
            "message": "请求数据验证失败",
            "details": {
                "errors": errors
            }
        }
    )

def handle_sqlalchemy_error(exc: SQLAlchemyError) -> JSONResponse:
    """处理SQLAlchemy异常"""
    logger.error(f"数据库错误: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": "DATABASE_ERROR",
            "message": "数据库操作失败",
            "details": {
                "error": str(exc)
            }
        }
    )

def handle_pydantic_error(exc: ValidationError) -> JSONResponse:
    """处理Pydantic验证异常"""
    errors = []
    for error in exc.errors():
        error_loc = " -> ".join([str(loc) for loc in error["loc"]])
        errors.append({
            "location": error_loc,
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.error(f"数据验证错误: {errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "code": "VALIDATION_ERROR",
            "message": "数据验证失败",
            "details": {
                "errors": errors
            }
        }
    )

def handle_general_exception(exc: Exception) -> JSONResponse:
    """处理一般异常"""
    logger.error(f"系统错误: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": "SYSTEM_ERROR",
            "message": "系统内部错误",
            "details": {
                "error": str(exc)
            }
        }
    )

# 注册异常处理器
def register_exception_handlers(app):
    """注册异常处理器"""
    # 深基坑系统异常
    app.add_exception_handler(ExcavationError, lambda req, exc: handle_excavation_error(exc))
    
    # FastAPI验证异常
    app.add_exception_handler(RequestValidationError, lambda req, exc: handle_validation_error(exc))
    
    # SQLAlchemy异常
    app.add_exception_handler(SQLAlchemyError, lambda req, exc: handle_sqlalchemy_error(exc))
    
    # Pydantic验证异常
    app.add_exception_handler(ValidationError, lambda req, exc: handle_pydantic_error(exc))
    
    # 一般异常
    app.add_exception_handler(Exception, lambda req, exc: handle_general_exception(exc))
    
    logger.info("异常处理器注册完成")

# 异常装饰器
def handle_exceptions(func):
    """异常处理装饰器"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ExcavationError as e:
            logger.error(f"{e.code}: {e.message}", exc_info=True)
            raise
        except SQLAlchemyError as e:
            logger.error(f"数据库错误: {str(e)}", exc_info=True)
            raise DatabaseError(message=f"数据库操作失败: {str(e)}", details={"error": str(e)})
        except ValidationError as e:
            logger.error(f"验证错误: {str(e)}", exc_info=True)
            raise ValidationError(message=f"数据验证失败: {str(e)}", details={"error": str(e)})
        except Exception as e:
            logger.error(f"未处理异常: {str(e)}", exc_info=True)
            raise SystemError(message=f"系统内部错误: {str(e)}", details={"error": str(e)})
    return wrapper








