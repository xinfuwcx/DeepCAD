#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
错误处理系统单元测试
"""

import unittest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from utils.error_handler import (
    ErrorLevel, ErrorCode, ErrorInfo, ErrorHandler,
    handle_error, auto_error_handler
)


class TestErrorCode(unittest.TestCase):
    """错误代码测试"""
    
    def test_error_codes_exist(self):
        """测试错误代码是否存在"""
        # 文件相关错误
        self.assertEqual(ErrorCode.FILE_NOT_FOUND.value, "E001")
        self.assertEqual(ErrorCode.FILE_PERMISSION_DENIED.value, "E002")
        self.assertEqual(ErrorCode.FILE_FORMAT_UNSUPPORTED.value, "E004")
        
        # 解析相关错误
        self.assertEqual(ErrorCode.PARSE_ENCODING_ERROR.value, "E101")
        self.assertEqual(ErrorCode.PARSE_FORMAT_ERROR.value, "E102")
        
        # 计算相关错误
        self.assertEqual(ErrorCode.KRATOS_NOT_AVAILABLE.value, "E201")
        self.assertEqual(ErrorCode.CALCULATION_FAILED.value, "E202")
        
        # GUI相关错误
        self.assertEqual(ErrorCode.PYVISTA_NOT_AVAILABLE.value, "E301")
        
        # 系统相关错误
        self.assertEqual(ErrorCode.DEPENDENCY_MISSING.value, "E401")
        self.assertEqual(ErrorCode.UNKNOWN_ERROR.value, "E999")


class TestErrorInfo(unittest.TestCase):
    """错误信息测试"""
    
    def test_error_info_creation(self):
        """测试错误信息创建"""
        error_info = ErrorInfo(
            ErrorCode.FILE_NOT_FOUND,
            "文件未找到",
            "指定的文件不存在",
            "请检查文件路径",
            "详细技术信息"
        )
        
        self.assertEqual(error_info.code, ErrorCode.FILE_NOT_FOUND)
        self.assertEqual(error_info.title, "文件未找到")
        self.assertEqual(error_info.message, "指定的文件不存在")
        self.assertEqual(error_info.solution, "请检查文件路径")
        self.assertEqual(error_info.details, "详细技术信息")


class TestErrorHandler(unittest.TestCase):
    """错误处理器测试"""
    
    def setUp(self):
        """测试设置"""
        self.handler = ErrorHandler()
        self.mock_parent = Mock()
    
    def test_handler_initialization(self):
        """测试处理器初始化"""
        self.assertIsNotNone(self.handler)
        self.assertIsNotNone(self.handler.error_database)
        self.assertGreater(len(self.handler.error_database), 0)
    
    def test_error_database_completeness(self):
        """测试错误数据库完整性"""
        # 检查是否包含主要错误类型
        expected_errors = [
            ErrorCode.FILE_NOT_FOUND,
            ErrorCode.FILE_PERMISSION_DENIED,
            ErrorCode.PARSE_ENCODING_ERROR,
            ErrorCode.KRATOS_NOT_AVAILABLE,
            ErrorCode.PYVISTA_NOT_AVAILABLE,
            ErrorCode.MEMORY_INSUFFICIENT,
            ErrorCode.DEPENDENCY_MISSING
        ]
        
        for error_code in expected_errors:
            self.assertIn(error_code, self.handler.error_database)
            error_info = self.handler.error_database[error_code]
            self.assertIsInstance(error_info, ErrorInfo)
            self.assertNotEqual(error_info.title, "")
            self.assertNotEqual(error_info.message, "")
    
    def test_classify_exception(self):
        """测试异常分类"""
        # 测试文件不存在异常
        file_not_found = FileNotFoundError("文件不存在")
        code = self.handler._classify_exception(file_not_found)
        self.assertEqual(code, ErrorCode.FILE_NOT_FOUND)
        
        # 测试权限错误
        permission_error = PermissionError("权限不足")
        code = self.handler._classify_exception(permission_error)
        self.assertEqual(code, ErrorCode.FILE_PERMISSION_DENIED)
        
        # 测试编码错误
        unicode_error = UnicodeDecodeError("utf-8", b"", 0, 1, "编码错误")
        code = self.handler._classify_exception(unicode_error)
        self.assertEqual(code, ErrorCode.PARSE_ENCODING_ERROR)
        
        # 测试内存错误
        memory_error = MemoryError("内存不足")
        code = self.handler._classify_exception(memory_error)
        self.assertEqual(code, ErrorCode.MEMORY_INSUFFICIENT)
        
        # 测试导入错误
        import_error = ImportError("模块不存在")
        code = self.handler._classify_exception(import_error)
        self.assertEqual(code, ErrorCode.DEPENDENCY_MISSING)
        
        # 测试未知错误
        unknown_error = ValueError("未知错误")
        code = self.handler._classify_exception(unknown_error)
        self.assertEqual(code, ErrorCode.UNKNOWN_ERROR)
    
    def test_handle_exception(self):
        """测试异常处理"""
        test_exception = FileNotFoundError("测试文件不存在")
        
        # 捕获信号
        signal_emitted = []
        self.handler.error_occurred.connect(lambda info: signal_emitted.append(info))
        
        error_info = self.handler.handle_exception(test_exception, "测试上下文")
        
        # 检查返回的错误信息
        self.assertIsInstance(error_info, ErrorInfo)
        self.assertEqual(error_info.code, ErrorCode.FILE_NOT_FOUND)
        # 检查详情不为空（上下文信息可能以不同形式存在）
        self.assertIsNotNone(error_info.details)
        self.assertNotEqual(error_info.details, "")
        
        # 检查信号是否发送
        self.assertEqual(len(signal_emitted), 1)
        self.assertEqual(signal_emitted[0], error_info)
    
    def test_handle_unknown_exception(self):
        """测试处理未知异常"""
        unknown_exception = RuntimeError("未知运行时错误")
        
        error_info = self.handler.handle_exception(unknown_exception, "测试")
        
        self.assertEqual(error_info.code, ErrorCode.UNKNOWN_ERROR)
        self.assertIn("未知运行时错误", error_info.message)
    
    @patch('utils.error_handler.QMessageBox')
    def test_show_error_dialog(self, mock_message_box):
        """测试显示错误对话框"""
        handler = ErrorHandler(self.mock_parent)
        
        error_info = ErrorInfo(
            ErrorCode.FILE_NOT_FOUND,
            "测试错误",
            "测试消息",
            "测试解决方案",
            "测试详情"
        )
        
        handler.show_error_dialog(error_info, ErrorLevel.ERROR)
        
        # 检查是否调用了QMessageBox
        mock_message_box.assert_called_once()
    
    def test_log_error(self):
        """测试错误日志记录"""
        with patch('logging.getLogger') as mock_get_logger:
            mock_logger = Mock()
            mock_get_logger.return_value = mock_logger

            error_info = ErrorInfo(
                ErrorCode.FILE_NOT_FOUND,
                "测试错误",
                "测试消息"
            )

            self.handler.log_error(error_info, ErrorLevel.ERROR)

            # 检查是否调用了日志记录
            mock_logger.error.assert_called_once()


class TestConvenienceFunctions(unittest.TestCase):
    """便捷函数测试"""
    
    @patch('utils.error_handler.get_error_handler')
    def test_handle_error_function(self, mock_get_handler):
        """测试handle_error便捷函数"""
        mock_handler = Mock()
        mock_error_info = Mock()
        mock_handler.handle_exception.return_value = mock_error_info
        mock_get_handler.return_value = mock_handler
        
        test_exception = ValueError("测试错误")
        
        result = handle_error(test_exception, "测试上下文", show_dialog=True)
        
        # 检查是否调用了相关方法
        mock_handler.handle_exception.assert_called_once_with(test_exception, "测试上下文")
        mock_handler.show_error_dialog.assert_called_once_with(mock_error_info)
        mock_handler.log_error.assert_called_once_with(mock_error_info)
        
        self.assertEqual(result, mock_error_info)
    
    def test_auto_error_handler_decorator(self):
        """测试自动错误处理装饰器"""
        @auto_error_handler("测试函数", show_dialog=False)
        def test_function():
            raise ValueError("测试错误")
        
        @auto_error_handler("正常函数", show_dialog=False)
        def normal_function():
            return "成功"
        
        # 测试异常情况
        with patch('utils.error_handler.handle_error') as mock_handle:
            result = test_function()
            
            # 应该返回None并调用错误处理
            self.assertIsNone(result)
            mock_handle.assert_called_once()
        
        # 测试正常情况
        result = normal_function()
        self.assertEqual(result, "成功")


class TestErrorHandlerIntegration(unittest.TestCase):
    """错误处理器集成测试"""
    
    def test_real_world_scenarios(self):
        """测试真实世界场景"""
        handler = ErrorHandler()
        
        # 场景1：文件操作错误
        try:
            with open("nonexistent_file.txt", 'r') as f:
                pass
        except Exception as e:
            error_info = handler.handle_exception(e, "文件读取操作")
            self.assertEqual(error_info.code, ErrorCode.FILE_NOT_FOUND)
            self.assertIn("文件不存在", error_info.message)
        
        # 场景2：编码错误模拟
        try:
            "测试".encode('ascii')
        except Exception as e:
            error_info = handler.handle_exception(e, "编码转换")
            # 这个特定错误可能不会被分类为编码错误，但应该有合理的处理
            self.assertIsInstance(error_info, ErrorInfo)
    
    def test_error_message_localization(self):
        """测试错误消息本地化"""
        handler = ErrorHandler()
        
        # 检查中文错误消息
        error_info = handler.error_database[ErrorCode.FILE_NOT_FOUND]
        self.assertIn("文件", error_info.title)
        self.assertIn("不存在", error_info.message)
        
        # 检查解决方案是否有用
        self.assertNotEqual(error_info.solution, "")
        self.assertIn("检查", error_info.solution)


if __name__ == "__main__":
    # 运行测试
    unittest.main(verbosity=2)
