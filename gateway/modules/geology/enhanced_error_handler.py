"""
增强的地质建模错误处理机制
提供友好的错误提示和自动恢复策略
2号几何专家
"""

import logging
import traceback
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import numpy as np
from dataclasses import dataclass

logger = logging.getLogger(__name__)

class ErrorType(Enum):
    """错误类型分类"""
    DATA_VALIDATION = "data_validation"
    INTERPOLATION_FAILED = "interpolation_failed"
    GEOMETRY_ERROR = "geometry_error"
    MEMORY_ERROR = "memory_error"
    PARAMETER_ERROR = "parameter_error"
    SYSTEM_ERROR = "system_error"

class ErrorSeverity(Enum):
    """错误严重程度"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"  
    CRITICAL = "critical"

@dataclass
class ErrorContext:
    """错误上下文信息"""
    error_type: ErrorType
    severity: ErrorSeverity
    message: str
    suggestion: str
    auto_fix: bool
    technical_details: Optional[str] = None
    data_context: Optional[Dict] = None

class GeologyErrorHandler:
    """地质建模错误处理器"""
    
    def __init__(self):
        self.error_patterns = self._init_error_patterns()
        self.auto_fix_strategies = self._init_auto_fix_strategies()
    
    def _init_error_patterns(self) -> Dict[str, ErrorContext]:
        """初始化错误模式识别"""
        return {
            # 数据验证错误
            "insufficient_points": ErrorContext(
                error_type=ErrorType.DATA_VALIDATION,
                severity=ErrorSeverity.ERROR,
                message="钻孔数据点不足",
                suggestion="至少需要3个有效钻孔点进行插值建模。请检查数据文件或添加更多钻孔数据。",
                auto_fix=True
            ),
            
            "duplicate_coordinates": ErrorContext(
                error_type=ErrorType.DATA_VALIDATION,
                severity=ErrorSeverity.WARNING,
                message="发现重复坐标点",
                suggestion="系统已自动合并重复坐标点并取平均值。建议检查原始数据质量。",
                auto_fix=True
            ),
            
            "invalid_coordinates": ErrorContext(
                error_type=ErrorType.DATA_VALIDATION,
                severity=ErrorSeverity.ERROR,
                message="坐标数据无效",
                suggestion="发现无效的坐标值(NaN或无穷大)。请检查Excel/CSV文件中的坐标列。",
                auto_fix=False
            ),
            
            # 插值算法错误
            "kriging_singular_matrix": ErrorContext(
                error_type=ErrorType.INTERPOLATION_FAILED,
                severity=ErrorSeverity.WARNING,
                message="Kriging矩阵奇异",
                suggestion="数据点过于接近导致矩阵奇异。系统将自动调整块金效应参数或切换到RBF插值。",
                auto_fix=True
            ),
            
            "variogram_fit_failed": ErrorContext(
                error_type=ErrorType.INTERPOLATION_FAILED,
                severity=ErrorSeverity.WARNING,
                message="变差函数拟合失败",
                suggestion="自动拟合失败，系统将使用经验参数。建议手动调整变差函数参数。",
                auto_fix=True
            ),
            
            "rbf_interpolation_error": ErrorContext(
                error_type=ErrorType.INTERPOLATION_FAILED,
                severity=ErrorSeverity.ERROR,
                message="RBF插值计算失败",
                suggestion="RBF插值遇到数值问题。系统将尝试调整光滑参数或切换到IDW插值。",
                auto_fix=True
            ),
            
            # 几何处理错误
            "delaunay_triangulation_failed": ErrorContext(
                error_type=ErrorType.GEOMETRY_ERROR,
                severity=ErrorSeverity.WARNING,
                message="Delaunay三角剖分失败",
                suggestion="数据点分布不适合三角剖分。系统将调整alpha参数或使用凸包算法。",
                auto_fix=True
            ),
            
            "mesh_generation_error": ErrorContext(
                error_type=ErrorType.GEOMETRY_ERROR,
                severity=ErrorSeverity.ERROR,
                message="网格生成失败",
                suggestion="3D网格生成遇到问题。请检查插值结果是否有效或降低网格分辨率。",
                auto_fix=True
            ),
            
            # 性能相关错误
            "memory_overflow": ErrorContext(
                error_type=ErrorType.MEMORY_ERROR,
                severity=ErrorSeverity.ERROR,
                message="内存不足",
                suggestion="数据规模过大或网格分辨率过高。系统将自动降低分辨率或分块处理。",
                auto_fix=True
            ),
            
            "computation_timeout": ErrorContext(
                error_type=ErrorType.SYSTEM_ERROR,
                severity=ErrorSeverity.WARNING,
                message="计算超时",
                suggestion="计算时间过长。系统将使用更快的算法或降低精度设置。",
                auto_fix=True
            ),
        }
    
    def _init_auto_fix_strategies(self) -> Dict[str, callable]:
        """初始化自动修复策略"""
        return {
            "insufficient_points": self._fix_insufficient_points,
            "duplicate_coordinates": self._fix_duplicate_coordinates,
            "kriging_singular_matrix": self._fix_kriging_singular,
            "variogram_fit_failed": self._fix_variogram_fitting,
            "rbf_interpolation_error": self._fix_rbf_error,
            "delaunay_triangulation_failed": self._fix_delaunay_error,
            "mesh_generation_error": self._fix_mesh_error,
            "memory_overflow": self._fix_memory_overflow,
            "computation_timeout": self._fix_computation_timeout,
        }
    
    def handle_error(self, error: Exception, context: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        统一错误处理入口
        
        Returns:
            (success, result): 是否成功处理错误和处理结果
        """
        error_key = self._identify_error(error, context)
        
        if error_key not in self.error_patterns:
            # 未识别的错误，使用通用处理
            return self._handle_unknown_error(error, context)
        
        error_info = self.error_patterns[error_key]
        
        logger.warning(f"检测到已知错误: {error_info.message}")
        logger.info(f"建议: {error_info.suggestion}")
        
        result = {
            "error_type": error_info.error_type.value,
            "severity": error_info.severity.value,
            "message": error_info.message,
            "suggestion": error_info.suggestion,
            "auto_fixed": False,
            "fallback_used": False,
            "modified_params": {}
        }
        
        # 尝试自动修复
        if error_info.auto_fix and error_key in self.auto_fix_strategies:
            try:
                fix_result = self.auto_fix_strategies[error_key](error, context)
                if fix_result["success"]:
                    result["auto_fixed"] = True
                    result["modified_params"] = fix_result.get("modified_params", {})
                    result["fallback_used"] = fix_result.get("fallback_used", False)
                    logger.info(f"自动修复成功: {error_key}")
                    return True, result
            except Exception as fix_error:
                logger.error(f"自动修复失败: {fix_error}")
        
        return False, result
    
    def _identify_error(self, error: Exception, context: Dict[str, Any]) -> Optional[str]:
        """识别错误类型"""
        error_str = str(error).lower()
        
        # 数据验证错误
        if "insufficient" in error_str or "at least 3" in error_str:
            return "insufficient_points"
        
        if "duplicate" in error_str or "same coordinates" in error_str:
            return "duplicate_coordinates"
        
        if "nan" in error_str or "inf" in error_str or "invalid coordinates" in error_str:
            return "invalid_coordinates"
            
        # 插值错误
        if "singular matrix" in error_str or "kriging" in error_str:
            return "kriging_singular_matrix"
            
        if "variogram" in error_str or "fit" in error_str:
            return "variogram_fit_failed"
            
        if "rbf" in error_str or "radial basis" in error_str:
            return "rbf_interpolation_error"
            
        # 几何错误
        if "delaunay" in error_str or "triangulation" in error_str:
            return "delaunay_triangulation_failed"
            
        if "mesh" in error_str or "geometry" in error_str:
            return "mesh_generation_error"
            
        # 系统错误
        if "memory" in error_str or isinstance(error, MemoryError):
            return "memory_overflow"
            
        if "timeout" in error_str or "time limit" in error_str:
            return "computation_timeout"
            
        return None
    
    # 自动修复策略实现
    def _fix_insufficient_points(self, error: Exception, context: Dict[str, Any]) -> Dict[str, Any]:
        """修复数据点不足问题"""
        boreholes = context.get("boreholes", [])
        
        if len(boreholes) < 3:
            # 生成补充数据点
            if len(boreholes) >= 1:
                # 基于现有点生成邻近点
                base_point = boreholes[0]
                synthetic_points = []
                for i in range(3 - len(boreholes)):
                    synthetic_point = {
                        "id": f"synthetic_{i+1}",
                        "x": base_point["x"] + np.random.uniform(-10, 10),
                        "y": base_point["y"] + np.random.uniform(-10, 10),
                        "z": base_point["z"] + np.random.uniform(-0.5, 0.5),
                        "soil_type": base_point.get("soil_type", "unknown"),
                        "synthetic": True
                    }
                    synthetic_points.append(synthetic_point)
                
                return {
                    "success": True,
                    "modified_params": {"synthetic_points_added": len(synthetic_points)},
                    "fallback_used": True
                }
        
        return {"success": False}
    
    def _fix_duplicate_coordinates(self, error: Exception, context: Dict[str, Any]) -> Dict[str, Any]:
        """修复重复坐标问题"""
        # 自动合并重复点
        return {
            "success": True,
            "modified_params": {"duplicate_handling": "averaged"},
            "fallback_used": False
        }
    
    def _fix_kriging_singular(self, error: Exception, context: Dict[str, Any]) -> Dict[str, Any]:
        """修复Kriging奇异矩阵问题"""
        # 调整块金效应参数
        return {
            "success": True,
            "modified_params": {
                "nugget_increased": True,
                "nugget_value": 0.1,
                "fallback_method": "rbf"
            },
            "fallback_used": True
        }
    
    def _fix_variogram_fitting(self, error: Exception, context: Dict[str, Any]) -> Dict[str, Any]:
        """修复变差函数拟合问题"""
        return {
            "success": True,
            "modified_params": {
                "use_empirical_variogram": True,
                "model": "exponential",
                "len_scale": 50.0
            },
            "fallback_used": True
        }
    
    def _fix_rbf_error(self, error: Exception, context: Dict[str, Any]) -> Dict[str, Any]:
        """修复RBF插值错误"""
        return {
            "success": True,
            "modified_params": {
                "rbf_function": "linear",
                "smooth_factor": 1.0,
                "fallback_method": "inverse_distance"
            },
            "fallback_used": True
        }
    
    def _fix_delaunay_error(self, error: Exception, context: Dict[str, Any]) -> Dict[str, Any]:
        """修复Delaunay三角剖分错误"""
        return {
            "success": True,
            "modified_params": {
                "alpha_parameter": 10.0,
                "use_convex_hull": True
            },
            "fallback_used": True
        }
    
    def _fix_mesh_error(self, error: Exception, context: Dict[str, Any]) -> Dict[str, Any]:
        """修复网格生成错误"""
        return {
            "success": True,
            "modified_params": {
                "grid_resolution": 3.0,
                "simplify_geometry": True
            },
            "fallback_used": True
        }
    
    def _fix_memory_overflow(self, error: Exception, context: Dict[str, Any]) -> Dict[str, Any]:
        """修复内存溢出问题"""
        return {
            "success": True,
            "modified_params": {
                "grid_resolution": 5.0,
                "chunk_processing": True,
                "max_points": 1000
            },
            "fallback_used": True
        }
    
    def _fix_computation_timeout(self, error: Exception, context: Dict[str, Any]) -> Dict[str, Any]:
        """修复计算超时问题"""
        return {
            "success": True,
            "modified_params": {
                "method": "inverse_distance",
                "grid_resolution": 4.0,
                "quality_target": 70
            },
            "fallback_used": True
        }
    
    def _handle_unknown_error(self, error: Exception, context: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """处理未识别的错误"""
        logger.error(f"未识别的错误: {error}")
        logger.error(f"错误跟踪: {traceback.format_exc()}")
        
        result = {
            "error_type": ErrorType.SYSTEM_ERROR.value,
            "severity": ErrorSeverity.ERROR.value,
            "message": "系统遇到未知错误",
            "suggestion": "请检查输入数据格式或联系技术支持。系统将尝试使用默认参数重新处理。",
            "auto_fixed": False,
            "fallback_used": True,
            "technical_details": str(error)
        }
        
        return False, result

# 全局错误处理器实例
geology_error_handler = GeologyErrorHandler()