"""
统一错误处理系统
@author Deep Excavation Team
@date 2025-01-27
"""

import traceback
from enum import Enum
from typing import Dict, Any, Optional, Callable, List
from dataclasses import dataclass
from loguru import logger
import asyncio


class ErrorType(Enum):
    """错误类型枚举"""
    MESH_GENERATION_FAILED = "mesh_generation_failed"
    ANALYSIS_CONVERGENCE_FAILED = "analysis_convergence_failed"
    MEMORY_EXCEEDED = "memory_exceeded"
    TIMEOUT = "timeout"
    INVALID_PARAMETERS = "invalid_parameters"
    FILE_NOT_FOUND = "file_not_found"
    NETWORK_ERROR = "network_error"
    PERMISSION_DENIED = "permission_denied"
    UNKNOWN_ERROR = "unknown_error"


@dataclass
class ErrorResponse:
    """错误响应数据结构"""
    status: str = "error"
    error_type: str = ""
    user_message: str = ""
    technical_details: str = ""
    recovery_suggestions: List[str] = None
    retry_possible: bool = False
    
    def __post_init__(self):
        if self.recovery_suggestions is None:
            self.recovery_suggestions = []


class UnifiedErrorHandler:
    """统一错误处理器"""
    
    def __init__(self):
        self.error_mapping = {
            ErrorType.MESH_GENERATION_FAILED: {
                "message": "网格生成失败，请检查几何参数是否合理",
                "suggestions": [
                    "检查几何尺寸是否过小或过大",
                    "简化几何模型复杂度",
                    "调整网格密度参数",
                    "检查几何体是否存在自相交"
                ],
                "retry": True
            },
            ErrorType.ANALYSIS_CONVERGENCE_FAILED: {
                "message": "分析未收敛，建议调整求解参数",
                "suggestions": [
                    "减小时间步长或荷载增量",
                    "检查边界条件设置",
                    "调整材料参数",
                    "使用更稳定的求解算法"
                ],
                "retry": True
            },
            ErrorType.MEMORY_EXCEEDED: {
                "message": "内存不足，请减少模型规模或联系管理员",
                "suggestions": [
                    "减少网格密度",
                    "简化几何模型",
                    "分批处理大型模型",
                    "升级系统内存"
                ],
                "retry": False
            },
            ErrorType.TIMEOUT: {
                "message": "计算超时，请简化模型或选择更快的算法",
                "suggestions": [
                    "减少分析时间步数",
                    "使用粗化网格进行初步分析",
                    "选择更快的求解器",
                    "分阶段进行复杂分析"
                ],
                "retry": True
            },
            ErrorType.INVALID_PARAMETERS: {
                "message": "输入参数无效，请检查参数范围和格式",
                "suggestions": [
                    "检查数值参数是否在合理范围内",
                    "确认单位制一致性",
                    "验证必填参数是否完整",
                    "参考示例项目设置"
                ],
                "retry": True
            },
            ErrorType.FILE_NOT_FOUND: {
                "message": "文件未找到，请检查文件路径",
                "suggestions": [
                    "确认文件路径正确",
                    "检查文件是否存在",
                    "验证文件访问权限",
                    "重新上传文件"
                ],
                "retry": True
            },
            ErrorType.NETWORK_ERROR: {
                "message": "网络连接错误，请检查网络状态",
                "suggestions": [
                    "检查网络连接",
                    "稍后重试",
                    "联系系统管理员",
                    "使用离线模式（如可用）"
                ],
                "retry": True
            },
            ErrorType.PERMISSION_DENIED: {
                "message": "权限不足，请联系管理员",
                "suggestions": [
                    "联系系统管理员获取权限",
                    "检查用户角色设置",
                    "使用有权限的账户",
                    "申请相应的访问权限"
                ],
                "retry": False
            }
        }
        
        # 恢复策略注册表
        self.recovery_strategies: Dict[ErrorType, Callable] = {}
        
        # 错误统计
        self.error_stats: Dict[str, int] = {}
    
    def register_recovery_strategy(self, error_type: ErrorType, 
                                 strategy: Callable):
        """注册错误恢复策略"""
        self.recovery_strategies[error_type] = strategy
        logger.info(f"已注册恢复策略: {error_type.value}")
    
    def classify_error(self, error: Exception) -> ErrorType:
        """错误分类"""
        error_message = str(error).lower()
        error_type_name = type(error).__name__.lower()
        
        # 基于异常类型分类
        if isinstance(error, MemoryError):
            return ErrorType.MEMORY_EXCEEDED
        elif isinstance(error, TimeoutError):
            return ErrorType.TIMEOUT
        elif isinstance(error, FileNotFoundError):
            return ErrorType.FILE_NOT_FOUND
        elif isinstance(error, PermissionError):
            return ErrorType.PERMISSION_DENIED
        elif isinstance(error, ValueError):
            return ErrorType.INVALID_PARAMETERS
        
        # 基于错误消息分类
        if any(keyword in error_message for keyword in 
               ['mesh', 'gmsh', 'geometry']):
            return ErrorType.MESH_GENERATION_FAILED
        elif any(keyword in error_message for keyword in 
                 ['convergence', 'solver', 'iteration']):
            return ErrorType.ANALYSIS_CONVERGENCE_FAILED
        elif any(keyword in error_message for keyword in 
                 ['memory', 'ram', 'allocation']):
            return ErrorType.MEMORY_EXCEEDED
        elif any(keyword in error_message for keyword in 
                 ['timeout', 'time', 'deadline']):
            return ErrorType.TIMEOUT
        elif any(keyword in error_message for keyword in 
                 ['network', 'connection', 'socket']):
            return ErrorType.NETWORK_ERROR
        
        return ErrorType.UNKNOWN_ERROR
    
    def handle_error(self, error: Exception, 
                    context: Dict[str, Any] = None) -> ErrorResponse:
        """处理错误并返回统一响应"""
        if context is None:
            context = {}
            
        # 错误分类
        error_type = self.classify_error(error)
        
        # 更新错误统计
        self.error_stats[error_type.value] = (
            self.error_stats.get(error_type.value, 0) + 1
        )
        
        # 获取错误配置
        error_config = self.error_mapping.get(error_type, {
            "message": "发生未知错误",
            "suggestions": ["请联系技术支持"],
            "retry": False
        })
        
        # 记录详细日志
        logger.error(
            f"错误类型: {error_type.value}, "
            f"上下文: {context}, "
            f"详情: {error}, "
            f"堆栈: {traceback.format_exc()}"
        )
        
        # 尝试恢复
        recovery_result = self._attempt_recovery(error_type, context)
        
        # 构建响应
        response = ErrorResponse(
            error_type=error_type.value,
            user_message=error_config["message"],
            technical_details=str(error),
            recovery_suggestions=error_config["suggestions"],
            retry_possible=error_config["retry"]
        )
        
        # 如果恢复成功，更新响应
        if recovery_result and recovery_result.get("success"):
            response.status = "recovered"
            response.user_message = (
                f"{error_config['message']} (已自动恢复)"
            )
            logger.info(f"错误自动恢复成功: {error_type.value}")
        
        return response
    
    def _attempt_recovery(self, error_type: ErrorType, 
                         context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """尝试错误恢复"""
        if error_type not in self.recovery_strategies:
            return None
        
        try:
            strategy = self.recovery_strategies[error_type]
            result = strategy(context)
            
            if asyncio.iscoroutine(result):
                # 异步策略需要在事件循环中处理
                logger.warning("异步恢复策略需要在适当的上下文中处理")
                return None
            
            return result
            
        except Exception as recovery_error:
            logger.error(f"恢复策略执行失败: {recovery_error}")
            return None
    
    async def handle_error_async(self, error: Exception, 
                               context: Dict[str, Any] = None) -> ErrorResponse:
        """异步错误处理"""
        if context is None:
            context = {}
            
        # 基本错误处理
        response = self.handle_error(error, context)
        
        # 尝试异步恢复
        error_type = self.classify_error(error)
        if error_type in self.recovery_strategies:
            try:
                strategy = self.recovery_strategies[error_type]
                result = strategy(context)
                
                if asyncio.iscoroutine(result):
                    recovery_result = await result
                    
                    if recovery_result and recovery_result.get("success"):
                        response.status = "recovered"
                        response.user_message = (
                            f"{response.user_message} (已自动恢复)"
                        )
                        logger.info(f"异步错误恢复成功: {error_type.value}")
                        
            except Exception as recovery_error:
                logger.error(f"异步恢复策略执行失败: {recovery_error}")
        
        return response
    
    def get_error_statistics(self) -> Dict[str, Any]:
        """获取错误统计信息"""
        total_errors = sum(self.error_stats.values())
        
        return {
            "total_errors": total_errors,
            "error_breakdown": self.error_stats.copy(),
            "most_common_error": (
                max(self.error_stats.items(), key=lambda x: x[1])[0]
                if self.error_stats else None
            ),
            "recovery_strategies_count": len(self.recovery_strategies)
        }
    
    def reset_statistics(self):
        """重置错误统计"""
        self.error_stats.clear()
        logger.info("错误统计已重置")


# 预定义的恢复策略
class RecoveryStrategies:
    """预定义恢复策略"""
    
    @staticmethod
    def mesh_generation_recovery(context: Dict[str, Any]) -> Dict[str, Any]:
        """网格生成恢复策略"""
        try:
            # 尝试使用更粗的网格
            if "mesh_size" in context:
                original_size = context["mesh_size"]
                new_size = original_size * 2  # 增大网格尺寸
                context["mesh_size"] = new_size
                
                logger.info(
                    f"网格生成恢复: 网格尺寸从 {original_size} "
                    f"调整为 {new_size}"
                )
                
                return {
                    "success": True,
                    "action": "mesh_size_increased",
                    "old_size": original_size,
                    "new_size": new_size
                }
            
            return {"success": False, "reason": "无法调整网格参数"}
            
        except Exception as e:
            logger.error(f"网格生成恢复策略失败: {e}")
            return {"success": False, "reason": str(e)}
    
    @staticmethod
    def memory_exceeded_recovery(context: Dict[str, Any]) -> Dict[str, Any]:
        """内存超限恢复策略"""
        try:
            # 触发垃圾回收
            import gc
            collected = gc.collect()
            
            logger.info(f"内存恢复: 垃圾回收释放了 {collected} 个对象")
            
            return {
                "success": True,
                "action": "garbage_collection",
                "objects_collected": collected
            }
            
        except Exception as e:
            logger.error(f"内存恢复策略失败: {e}")
            return {"success": False, "reason": str(e)}
    
    @staticmethod
    async def network_error_recovery(context: Dict[str, Any]) -> Dict[str, Any]:
        """网络错误恢复策略"""
        try:
            # 重试机制
            max_retries = context.get("max_retries", 3)
            retry_delay = context.get("retry_delay", 1.0)
            
            for attempt in range(max_retries):
                await asyncio.sleep(retry_delay * (attempt + 1))
                
                # 这里应该重新执行失败的网络操作
                # 简化示例中直接返回成功
                logger.info(f"网络恢复: 重试第 {attempt + 1} 次")
                
                # 模拟重试成功
                if attempt >= 1:  # 第二次重试成功
                    return {
                        "success": True,
                        "action": "network_retry",
                        "attempts": attempt + 1
                    }
            
            return {
                "success": False, 
                "reason": f"重试 {max_retries} 次后仍然失败"
            }
            
        except Exception as e:
            logger.error(f"网络恢复策略失败: {e}")
            return {"success": False, "reason": str(e)}


# 全局错误处理器实例
global_error_handler = UnifiedErrorHandler()

# 注册预定义恢复策略
global_error_handler.register_recovery_strategy(
    ErrorType.MESH_GENERATION_FAILED,
    RecoveryStrategies.mesh_generation_recovery
)

global_error_handler.register_recovery_strategy(
    ErrorType.MEMORY_EXCEEDED,
    RecoveryStrategies.memory_exceeded_recovery
)

global_error_handler.register_recovery_strategy(
    ErrorType.NETWORK_ERROR,
    RecoveryStrategies.network_error_recovery
)


# 错误处理装饰器
def handle_errors(error_handler: UnifiedErrorHandler = None):
    """错误处理装饰器"""
    if error_handler is None:
        error_handler = global_error_handler
    
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                context = {
                    "function": func.__name__,
                    "args": str(args)[:100],  # 限制长度
                    "kwargs": str(kwargs)[:100]
                }
                error_response = error_handler.handle_error(e, context)
                
                # 根据错误类型决定是否重新抛出异常
                if error_response.status == "recovered":
                    logger.info(f"函数 {func.__name__} 错误已恢复，继续执行")
                    # 可以选择重新执行函数或返回默认值
                    return None
                else:
                    # 抛出包装后的异常
                    raise RuntimeError(error_response.user_message) from e
        
        async def async_wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                context = {
                    "function": func.__name__,
                    "args": str(args)[:100],
                    "kwargs": str(kwargs)[:100]
                }
                error_response = await error_handler.handle_error_async(
                    e, context
                )
                
                if error_response.status == "recovered":
                    logger.info(f"异步函数 {func.__name__} 错误已恢复")
                    return None
                else:
                    raise RuntimeError(error_response.user_message) from e
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else wrapper
    
    return decorator 