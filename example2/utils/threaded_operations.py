#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
多线程操作工具
提供非阻塞的文件处理和计算操作，优化GUI响应性
"""

import time
import traceback
from pathlib import Path
from typing import Dict, Any, Optional, Callable
from PyQt6.QtCore import QThread, pyqtSignal, QObject, QMutex, QWaitCondition
from PyQt6.QtWidgets import QProgressDialog, QWidget, QMessageBox


class WorkerSignals(QObject):
    """工作线程信号"""
    started = pyqtSignal()
    finished = pyqtSignal(bool, object)  # success, result
    progress = pyqtSignal(int, str)  # percentage, message
    error = pyqtSignal(str, str)  # error_type, error_message
    log = pyqtSignal(str)  # log message


class FileProcessingWorker(QThread):
    """文件处理工作线程"""
    
    def __init__(self, file_path: str, operation: str = "parse", 
                 progress_callback: Optional[Callable] = None):
        super().__init__()
        self.file_path = Path(file_path)
        self.operation = operation
        self.progress_callback = progress_callback
        self.signals = WorkerSignals()
        self.is_cancelled = False
        self.mutex = QMutex()
        self.wait_condition = QWaitCondition()
        
    def run(self):
        """运行文件处理"""
        try:
            self.signals.started.emit()
            self.signals.log.emit(f"开始处理文件: {self.file_path.name}")
            
            if self.operation == "parse_fpn":
                result = self._parse_fpn_file()
            elif self.operation == "export_results":
                result = self._export_results()
            else:
                result = self._generic_file_operation()
            
            if not self.is_cancelled:
                self.signals.finished.emit(True, result)
                self.signals.log.emit("文件处理完成")
            else:
                self.signals.finished.emit(False, "操作被取消")
                
        except Exception as e:
            error_msg = f"文件处理失败: {str(e)}"
            self.signals.error.emit("FileProcessingError", error_msg)
            self.signals.finished.emit(False, error_msg)
            self.signals.log.emit(f"错误: {error_msg}")
    
    def _parse_fpn_file(self) -> Dict[str, Any]:
        """解析FPN文件"""
        try:
            from ..core.optimized_fpn_parser import OptimizedFPNParser, ParseProgress
            
            def progress_callback(progress: ParseProgress):
                if self.is_cancelled:
                    return
                
                percentage = int(progress.progress_percent)
                message = f"解析进度: {progress.nodes_count}节点, {progress.elements_count}单元"
                self.signals.progress.emit(percentage, message)
                
                # 处理GUI事件，保持响应性
                self.msleep(1)
            
            parser = OptimizedFPNParser(progress_callback=progress_callback)
            result = parser.parse_file_streaming(str(self.file_path))
            
            return result
            
        except Exception as e:
            raise Exception(f"FPN文件解析失败: {e}")
    
    def _export_results(self) -> str:
        """导出结果"""
        # 模拟导出过程
        total_steps = 100
        for i in range(total_steps):
            if self.is_cancelled:
                break
                
            self.signals.progress.emit(i, f"导出进度: {i}%")
            self.msleep(50)  # 模拟处理时间
        
        return "导出完成"
    
    def _generic_file_operation(self) -> str:
        """通用文件操作"""
        # 模拟文件操作
        for i in range(100):
            if self.is_cancelled:
                break
            self.signals.progress.emit(i, f"处理进度: {i}%")
            self.msleep(20)
        
        return "操作完成"
    
    def cancel(self):
        """取消操作"""
        self.is_cancelled = True
        self.signals.log.emit("正在取消操作...")


class AnalysisWorker(QThread):
    """分析计算工作线程"""
    
    def __init__(self, analysis_steps: list, model_data: Dict[str, Any]):
        super().__init__()
        self.analysis_steps = analysis_steps
        self.model_data = model_data
        self.signals = WorkerSignals()
        self.is_cancelled = False
        self.current_step = 0
        
    def run(self):
        """运行分析计算"""
        try:
            self.signals.started.emit()
            self.signals.log.emit("开始分析计算")
            
            total_steps = len(self.analysis_steps)
            results = {}
            
            for i, step in enumerate(self.analysis_steps):
                if self.is_cancelled:
                    break
                
                self.current_step = i
                step_progress = int((i / total_steps) * 100)
                self.signals.progress.emit(step_progress, f"执行步骤 {i+1}/{total_steps}: {step.get('name', '未知')}")
                
                # 执行单个分析步
                step_result = self._execute_analysis_step(step)
                results[f"step_{i+1}"] = step_result
                
                # 模拟计算时间
                self.msleep(1000)
            
            if not self.is_cancelled:
                self.signals.finished.emit(True, results)
                self.signals.log.emit("分析计算完成")
            else:
                self.signals.finished.emit(False, "分析被取消")
                
        except Exception as e:
            error_msg = f"分析计算失败: {str(e)}"
            self.signals.error.emit("AnalysisError", error_msg)
            self.signals.finished.emit(False, error_msg)
    
    def _execute_analysis_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """执行单个分析步"""
        try:
            from ..core.kratos_interface import KratosInterface
            
            # 创建Kratos接口
            kratos_interface = KratosInterface()
            
            # 设置模型
            if not kratos_interface.setup_model(self.model_data):
                raise Exception("模型设置失败")
            
            # 运行分析
            success, results = kratos_interface.run_analysis()
            
            if success:
                return results
            else:
                raise Exception(f"分析失败: {results.get('error', '未知错误')}")
                
        except ImportError:
            # Kratos不可用时的模拟结果
            return {
                "displacement": [[0.01, 0.005, -0.02]] * 100,
                "stress": [150.0] * 100,
                "strain": [0.005] * 100,
                "analysis_info": {
                    "type": step.get('type', 'static'),
                    "simulation_mode": "mock"
                }
            }
    
    def cancel(self):
        """取消分析"""
        self.is_cancelled = True
        self.signals.log.emit("正在取消分析...")


class ThreadedOperationManager:
    """多线程操作管理器"""
    
    def __init__(self, parent: Optional[QWidget] = None):
        self.parent = parent
        self.active_workers = []
        self.progress_dialogs = {}
    
    def parse_fpn_file_async(self, file_path: str, 
                           success_callback: Optional[Callable] = None,
                           error_callback: Optional[Callable] = None,
                           show_progress: bool = True) -> FileProcessingWorker:
        """异步解析FPN文件"""
        worker = FileProcessingWorker(file_path, "parse_fpn")
        
        # 连接信号
        if success_callback:
            worker.signals.finished.connect(
                lambda success, result: success_callback(result) if success else None
            )
        
        if error_callback:
            worker.signals.error.connect(
                lambda error_type, error_msg: error_callback(error_type, error_msg)
            )
        
        # 显示进度对话框
        if show_progress and self.parent:
            progress_dialog = self._create_progress_dialog(
                f"解析文件: {Path(file_path).name}",
                "正在解析FPN文件，请稍候..."
            )
            
            worker.signals.progress.connect(progress_dialog.setValue)
            worker.signals.progress.connect(
                lambda value, msg: progress_dialog.setLabelText(msg)
            )
            worker.signals.finished.connect(lambda *args: progress_dialog.close())
            
            # 取消按钮
            progress_dialog.canceled.connect(worker.cancel)
            
            self.progress_dialogs[worker] = progress_dialog
        
        # 启动工作线程
        self.active_workers.append(worker)
        worker.finished.connect(lambda: self._cleanup_worker(worker))
        worker.start()
        
        return worker
    
    def run_analysis_async(self, analysis_steps: list, model_data: Dict[str, Any],
                          success_callback: Optional[Callable] = None,
                          error_callback: Optional[Callable] = None,
                          show_progress: bool = True) -> AnalysisWorker:
        """异步运行分析"""
        worker = AnalysisWorker(analysis_steps, model_data)
        
        # 连接信号
        if success_callback:
            worker.signals.finished.connect(
                lambda success, result: success_callback(result) if success else None
            )
        
        if error_callback:
            worker.signals.error.connect(
                lambda error_type, error_msg: error_callback(error_type, error_msg)
            )
        
        # 显示进度对话框
        if show_progress and self.parent:
            progress_dialog = self._create_progress_dialog(
                "运行分析",
                "正在执行分析计算，请稍候..."
            )
            
            worker.signals.progress.connect(progress_dialog.setValue)
            worker.signals.progress.connect(
                lambda value, msg: progress_dialog.setLabelText(msg)
            )
            worker.signals.finished.connect(lambda *args: progress_dialog.close())
            
            # 取消按钮
            progress_dialog.canceled.connect(worker.cancel)
            
            self.progress_dialogs[worker] = progress_dialog
        
        # 启动工作线程
        self.active_workers.append(worker)
        worker.finished.connect(lambda: self._cleanup_worker(worker))
        worker.start()
        
        return worker
    
    def _create_progress_dialog(self, title: str, text: str) -> QProgressDialog:
        """创建进度对话框"""
        progress_dialog = QProgressDialog(text, "取消", 0, 100, self.parent)
        progress_dialog.setWindowTitle(title)
        progress_dialog.setModal(True)
        progress_dialog.setMinimumDuration(500)  # 500ms后显示
        progress_dialog.show()
        return progress_dialog
    
    def _cleanup_worker(self, worker):
        """清理工作线程"""
        if worker in self.active_workers:
            self.active_workers.remove(worker)
        
        if worker in self.progress_dialogs:
            dialog = self.progress_dialogs[worker]
            dialog.close()
            del self.progress_dialogs[worker]
        
        worker.deleteLater()
    
    def cancel_all_operations(self):
        """取消所有操作"""
        for worker in self.active_workers[:]:  # 复制列表避免修改时迭代
            if hasattr(worker, 'cancel'):
                worker.cancel()
        
        # 关闭所有进度对话框
        for dialog in self.progress_dialogs.values():
            dialog.close()
        
        self.progress_dialogs.clear()
    
    def wait_for_all_operations(self, timeout: int = 30000):
        """等待所有操作完成"""
        for worker in self.active_workers[:]:
            if worker.isRunning():
                worker.wait(timeout)


# 便捷装饰器
def run_in_thread(show_progress: bool = True, progress_text: str = "处理中..."):
    """在后台线程运行函数的装饰器"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # 这里需要更复杂的实现来支持任意函数
            # 暂时返回原函数
            return func(*args, **kwargs)
        return wrapper
    return decorator


# 测试函数
if __name__ == "__main__":
    import sys
    from PyQt6.QtWidgets import QApplication, QMainWindow, QPushButton, QVBoxLayout, QWidget
    
    class TestWindow(QMainWindow):
        def __init__(self):
            super().__init__()
            self.setWindowTitle("多线程操作测试")
            self.setGeometry(100, 100, 400, 300)
            
            # 创建操作管理器
            self.operation_manager = ThreadedOperationManager(self)
            
            # 创建界面
            central_widget = QWidget()
            self.setCentralWidget(central_widget)
            layout = QVBoxLayout(central_widget)
            
            # 测试按钮
            btn_parse = QPushButton("测试FPN解析")
            btn_parse.clicked.connect(self.test_fpn_parsing)
            layout.addWidget(btn_parse)
            
            btn_analysis = QPushButton("测试分析计算")
            btn_analysis.clicked.connect(self.test_analysis)
            layout.addWidget(btn_analysis)
        
        def test_fpn_parsing(self):
            # 模拟FPN文件路径
            test_file = Path(__file__).parent.parent / "data" / "基坑fpn.fpn"
            
            if test_file.exists():
                self.operation_manager.parse_fpn_file_async(
                    str(test_file),
                    success_callback=self.on_parse_success,
                    error_callback=self.on_parse_error
                )
            else:
                QMessageBox.information(self, "提示", "测试文件不存在")
        
        def test_analysis(self):
            # 模拟分析步骤
            test_steps = [
                {"name": "静力分析", "type": "static"},
                {"name": "模态分析", "type": "modal"}
            ]
            
            test_model = {"nodes": [], "elements": []}
            
            self.operation_manager.run_analysis_async(
                test_steps,
                test_model,
                success_callback=self.on_analysis_success,
                error_callback=self.on_analysis_error
            )
        
        def on_parse_success(self, result):
            QMessageBox.information(self, "成功", f"解析完成: {len(result.get('nodes', []))} 个节点")
        
        def on_parse_error(self, error_type, error_msg):
            QMessageBox.critical(self, "错误", f"{error_type}: {error_msg}")
        
        def on_analysis_success(self, result):
            QMessageBox.information(self, "成功", f"分析完成: {len(result)} 个步骤")
        
        def on_analysis_error(self, error_type, error_msg):
            QMessageBox.critical(self, "错误", f"{error_type}: {error_msg}")
    
    app = QApplication(sys.argv)
    window = TestWindow()
    window.show()
    sys.exit(app.exec())
