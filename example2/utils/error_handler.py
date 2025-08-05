#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用户友好的错误处理系统
提供专业的错误信息和解决方案建议
"""

import sys
import traceback
from enum import Enum
from typing import Dict, Any, Optional, Callable
from PyQt6.QtWidgets import QMessageBox, QWidget
from PyQt6.QtCore import QObject, pyqtSignal


class ErrorLevel(Enum):
    """错误级别"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ErrorCode(Enum):
    """错误代码"""
    # 文件相关错误
    FILE_NOT_FOUND = "E001"
    FILE_PERMISSION_DENIED = "E002"
    FILE_CORRUPTED = "E003"
    FILE_FORMAT_UNSUPPORTED = "E004"
    FILE_TOO_LARGE = "E005"
    
    # 解析相关错误
    PARSE_ENCODING_ERROR = "E101"
    PARSE_FORMAT_ERROR = "E102"
    PARSE_DATA_INCOMPLETE = "E103"
    PARSE_COORDINATE_ERROR = "E104"
    
    # 计算相关错误
    KRATOS_NOT_AVAILABLE = "E201"
    CALCULATION_FAILED = "E202"
    CONVERGENCE_FAILED = "E203"
    MEMORY_INSUFFICIENT = "E204"
    
    # GUI相关错误
    PYVISTA_NOT_AVAILABLE = "E301"
    DISPLAY_ERROR = "E302"
    EXPORT_FAILED = "E303"
    
    # 系统相关错误
    DEPENDENCY_MISSING = "E401"
    SYSTEM_ERROR = "E402"
    UNKNOWN_ERROR = "E999"


class ErrorInfo:
    """错误信息类"""
    
    def __init__(self, code: ErrorCode, title: str, message: str, 
                 solution: str = "", details: str = ""):
        self.code = code
        self.title = title
        self.message = message
        self.solution = solution
        self.details = details


class ErrorHandler(QObject):
    """错误处理器"""
    
    error_occurred = pyqtSignal(ErrorInfo)
    
    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__()
        self.parent = parent
        self.error_database = self._init_error_database()
        
    def _init_error_database(self) -> Dict[ErrorCode, ErrorInfo]:
        """初始化错误信息数据库"""
        return {
            ErrorCode.FILE_NOT_FOUND: ErrorInfo(
                ErrorCode.FILE_NOT_FOUND,
                "文件未找到",
                "指定的文件不存在或路径不正确",
                "请检查文件路径是否正确，确保文件存在且可访问",
                "常见原因：文件被移动、删除或路径输入错误"
            ),
            
            ErrorCode.FILE_PERMISSION_DENIED: ErrorInfo(
                ErrorCode.FILE_PERMISSION_DENIED,
                "文件访问权限不足",
                "没有权限访问指定的文件",
                "请检查文件权限，或以管理员身份运行程序",
                "可能需要修改文件权限或联系系统管理员"
            ),
            
            ErrorCode.FILE_FORMAT_UNSUPPORTED: ErrorInfo(
                ErrorCode.FILE_FORMAT_UNSUPPORTED,
                "不支持的文件格式",
                "当前文件格式不被支持",
                "请确保文件是有效的MIDAS FPN、MCT或MGT格式",
                "支持的格式：.fpn (MIDAS GTS NX), .mct (MIDAS Civil), .mgt (MIDAS Gen)"
            ),
            
            ErrorCode.FILE_TOO_LARGE: ErrorInfo(
                ErrorCode.FILE_TOO_LARGE,
                "文件过大",
                "文件大小超出系统处理能力",
                "建议使用更强大的硬件或分割文件进行处理",
                "大型工程文件可能需要专业工作站进行处理"
            ),
            
            ErrorCode.PARSE_ENCODING_ERROR: ErrorInfo(
                ErrorCode.PARSE_ENCODING_ERROR,
                "文件编码错误",
                "无法正确解析文件编码",
                "尝试使用不同的编码格式，或检查文件是否损坏",
                "常见编码：UTF-8, GBK, Latin1"
            ),
            
            ErrorCode.PARSE_FORMAT_ERROR: ErrorInfo(
                ErrorCode.PARSE_FORMAT_ERROR,
                "文件格式解析错误",
                "文件内容格式不符合预期",
                "请确保文件是有效的MIDAS导出文件，未被修改",
                "检查文件是否完整，没有被截断或损坏"
            ),
            
            ErrorCode.KRATOS_NOT_AVAILABLE: ErrorInfo(
                ErrorCode.KRATOS_NOT_AVAILABLE,
                "Kratos计算引擎不可用",
                "系统未检测到Kratos Multiphysics",
                "请安装Kratos Multiphysics或使用模拟计算模式",
                "Kratos是专业的多物理场计算引擎，需要单独安装"
            ),
            
            ErrorCode.PYVISTA_NOT_AVAILABLE: ErrorInfo(
                ErrorCode.PYVISTA_NOT_AVAILABLE,
                "3D可视化组件不可用",
                "PyVista 3D可视化库未正确安装",
                "请安装PyVista: pip install pyvista pyvistaqt",
                "PyVista提供专业的3D科学可视化功能"
            ),
            
            ErrorCode.MEMORY_INSUFFICIENT: ErrorInfo(
                ErrorCode.MEMORY_INSUFFICIENT,
                "内存不足",
                "系统内存不足以处理当前任务",
                "关闭其他程序释放内存，或升级系统内存",
                "大型工程模型需要充足的系统内存"
            ),
            
            ErrorCode.DEPENDENCY_MISSING: ErrorInfo(
                ErrorCode.DEPENDENCY_MISSING,
                "缺少必要依赖",
                "系统缺少必要的Python包",
                "请运行: pip install -r requirements.txt",
                "确保所有依赖包都正确安装"
            )
        }
    
    def handle_exception(self, exception: Exception, context: str = "") -> ErrorInfo:
        """处理异常并返回用户友好的错误信息"""
        error_code = self._classify_exception(exception)
        error_info = self.error_database.get(error_code)
        
        if not error_info:
            # 未知错误的默认处理
            error_info = ErrorInfo(
                ErrorCode.UNKNOWN_ERROR,
                "未知错误",
                f"发生了未预期的错误: {str(exception)}",
                "请联系技术支持或查看详细日志",
                f"上下文: {context}\n异常类型: {type(exception).__name__}"
            )
        
        # 添加详细的技术信息
        if hasattr(exception, '__traceback__'):
            error_info.details += f"\n\n技术详情:\n{traceback.format_exc()}"
        
        # 发送信号
        self.error_occurred.emit(error_info)
        
        return error_info
    
    def _classify_exception(self, exception: Exception) -> ErrorCode:
        """根据异常类型分类错误代码"""
        if isinstance(exception, FileNotFoundError):
            return ErrorCode.FILE_NOT_FOUND
        elif isinstance(exception, PermissionError):
            return ErrorCode.FILE_PERMISSION_DENIED
        elif isinstance(exception, UnicodeDecodeError):
            return ErrorCode.PARSE_ENCODING_ERROR
        elif isinstance(exception, MemoryError):
            return ErrorCode.MEMORY_INSUFFICIENT
        elif isinstance(exception, ImportError):
            return ErrorCode.DEPENDENCY_MISSING
        elif "pyvista" in str(exception).lower():
            return ErrorCode.PYVISTA_NOT_AVAILABLE
        elif "kratos" in str(exception).lower():
            return ErrorCode.KRATOS_NOT_AVAILABLE
        else:
            return ErrorCode.UNKNOWN_ERROR
    
    def show_error_dialog(self, error_info: ErrorInfo, level: ErrorLevel = ErrorLevel.ERROR):
        """显示错误对话框"""
        if not self.parent:
            print(f"错误: {error_info.title} - {error_info.message}")
            return
        
        # 创建消息框
        msg_box = QMessageBox(self.parent)
        msg_box.setWindowTitle(f"Example2 - {error_info.title}")
        
        # 设置图标
        if level == ErrorLevel.INFO:
            msg_box.setIcon(QMessageBox.Icon.Information)
        elif level == ErrorLevel.WARNING:
            msg_box.setIcon(QMessageBox.Icon.Warning)
        elif level == ErrorLevel.ERROR:
            msg_box.setIcon(QMessageBox.Icon.Critical)
        elif level == ErrorLevel.CRITICAL:
            msg_box.setIcon(QMessageBox.Icon.Critical)
        
        # 设置消息内容
        msg_box.setText(error_info.message)
        
        if error_info.solution:
            msg_box.setInformativeText(f"解决方案：{error_info.solution}")
        
        if error_info.details:
            msg_box.setDetailedText(error_info.details)
        
        # 添加按钮
        msg_box.setStandardButtons(QMessageBox.StandardButton.Ok)
        
        # 显示对话框
        msg_box.exec()
    
    def log_error(self, error_info: ErrorInfo, level: ErrorLevel = ErrorLevel.ERROR):
        """记录错误到日志"""
        import logging
        
        logger = logging.getLogger(__name__)
        
        log_message = f"[{error_info.code.value}] {error_info.title}: {error_info.message}"
        
        if level == ErrorLevel.INFO:
            logger.info(log_message)
        elif level == ErrorLevel.WARNING:
            logger.warning(log_message)
        elif level == ErrorLevel.ERROR:
            logger.error(log_message)
        elif level == ErrorLevel.CRITICAL:
            logger.critical(log_message)


# 全局错误处理器实例
_global_error_handler = None


def get_error_handler(parent: Optional[QWidget] = None) -> ErrorHandler:
    """获取全局错误处理器实例"""
    global _global_error_handler
    if _global_error_handler is None:
        _global_error_handler = ErrorHandler(parent)
    return _global_error_handler


def handle_error(exception: Exception, context: str = "", 
                show_dialog: bool = True, parent: Optional[QWidget] = None) -> ErrorInfo:
    """便捷的错误处理函数"""
    handler = get_error_handler(parent)
    error_info = handler.handle_exception(exception, context)
    
    if show_dialog:
        handler.show_error_dialog(error_info)
    
    handler.log_error(error_info)
    
    return error_info


# 装饰器：自动错误处理
def auto_error_handler(context: str = "", show_dialog: bool = True):
    """自动错误处理装饰器"""
    def decorator(func: Callable):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                handle_error(e, context or func.__name__, show_dialog)
                return None
        return wrapper
    return decorator


# 测试函数
if __name__ == "__main__":
    # 测试错误处理系统
    from PyQt6.QtWidgets import QApplication
    
    app = QApplication(sys.argv)
    
    # 测试各种错误类型
    handler = ErrorHandler()
    
    # 测试文件不存在错误
    try:
        with open("nonexistent_file.txt", 'r') as f:
            pass
    except Exception as e:
        error_info = handler.handle_exception(e, "测试文件读取")
        print(f"错误代码: {error_info.code.value}")
        print(f"错误标题: {error_info.title}")
        print(f"错误消息: {error_info.message}")
        print(f"解决方案: {error_info.solution}")
    
    print("错误处理系统测试完成")
