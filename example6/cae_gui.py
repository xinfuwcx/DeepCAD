#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CAE计算图形界面 - PyQt6界面
集成真正的有限元计算和可视化功能
"""

import sys
import json
import os
from pathlib import Path
from typing import Dict, Any, Optional
import traceback

try:
    from PyQt6.QtWidgets import (
        QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
        QGridLayout, QLabel, QLineEdit, QPushButton, QTextEdit, 
        QComboBox, QSpinBox, QDoubleSpinBox, QProgressBar, QGroupBox,
        QTabWidget, QSplitter, QFileDialog, QMessageBox, QCheckBox
    )
    from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer
    from PyQt6.QtGui import QFont, QPixmap, QIcon
    HAS_PYQT = True
except ImportError:
    HAS_PYQT = False
    print("警告: PyQt6不可用，GUI界面无法启动")

try:
    import pyvista as pv
    import numpy as np
    HAS_PYVISTA = True
except ImportError:
    HAS_PYVISTA = False
    print("警告: PyVista不可用，3D可视化功能受限")

# 导入CAE服务
try:
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from example6.example6_service import Example6Service
    HAS_CAE_SERVICE = True
except ImportError:
    try:
        from example6_service import Example6Service
        HAS_CAE_SERVICE = True
    except ImportError:
        try:
            from .example6_service import Example6Service
            HAS_CAE_SERVICE = True
        except ImportError:
            HAS_CAE_SERVICE = False
            print("警告: CAE服务不可用")


class CAEComputationThread(QThread):
    """CAE计算线程"""
    
    progress_updated = pyqtSignal(int)
    status_updated = pyqtSignal(str)
    computation_finished = pyqtSignal(dict)
    
    def __init__(self, case_params: Dict[str, Any]):
        super().__init__()
        self.case_params = case_params
        self.service = Example6Service()
    
    def run(self):
        try:
            self.status_updated.emit("开始CAE计算...")
            self.progress_updated.emit(10)
            
            # 验证环境
            self.status_updated.emit("验证计算环境...")
            validation = self.service.cae_validate()
            self.progress_updated.emit(20)
            
            # 开始仿真
            self.status_updated.emit("运行有限元计算...")
            self.progress_updated.emit(30)
            
            result = self.service.cae_simulate(self.case_params)
            self.progress_updated.emit(90)
            
            # 完成
            self.status_updated.emit("计算完成！")
            self.progress_updated.emit(100)
            
            # 发送结果
            self.computation_finished.emit({
                "success": True,
                "validation": validation,
                "result": result
            })
            
        except Exception as e:
            self.status_updated.emit(f"计算失败: {str(e)}")
            self.computation_finished.emit({
                "success": False,
                "error": str(e),
                "traceback": traceback.format_exc()
            })


class ParameterInputWidget(QWidget):
    """参数输入面板"""
    
    def __init__(self):
        super().__init__()
        self.init_ui()
        self.load_default_values()
    
    def init_ui(self):
        layout = QVBoxLayout()
        
        # 几何参数组
        geom_group = QGroupBox("几何参数")
        geom_layout = QGridLayout()
        
        self.pier_diameter = QDoubleSpinBox()
        self.pier_diameter.setRange(0.1, 10.0)
        self.pier_diameter.setSingleStep(0.1)
        self.pier_diameter.setSuffix(" m")
        geom_layout.addWidget(QLabel("桥墩直径:"), 0, 0)
        geom_layout.addWidget(self.pier_diameter, 0, 1)
        
        self.water_depth = QDoubleSpinBox()
        self.water_depth.setRange(1.0, 20.0)
        self.water_depth.setSingleStep(0.5)
        self.water_depth.setSuffix(" m")
        geom_layout.addWidget(QLabel("水深:"), 1, 0)
        geom_layout.addWidget(self.water_depth, 1, 1)
        
        self.pier_shape = QComboBox()
        self.pier_shape.addItems(["圆形", "矩形", "椭圆形"])
        geom_layout.addWidget(QLabel("桥墩形状:"), 2, 0)
        geom_layout.addWidget(self.pier_shape, 2, 1)
        
        geom_group.setLayout(geom_layout)
        layout.addWidget(geom_group)
        
        # 水流参数组
        flow_group = QGroupBox("水流参数")
        flow_layout = QGridLayout()
        
        self.flow_velocity = QDoubleSpinBox()
        self.flow_velocity.setRange(0.1, 10.0)
        self.flow_velocity.setSingleStep(0.1)
        self.flow_velocity.setSuffix(" m/s")
        flow_layout.addWidget(QLabel("流速:"), 0, 0)
        flow_layout.addWidget(self.flow_velocity, 0, 1)
        
        self.approach_angle = QDoubleSpinBox()
        self.approach_angle.setRange(-45.0, 45.0)
        self.approach_angle.setSingleStep(1.0)
        self.approach_angle.setSuffix(" °")
        flow_layout.addWidget(QLabel("来流角度:"), 1, 0)
        flow_layout.addWidget(self.approach_angle, 1, 1)
        
        flow_group.setLayout(flow_layout)
        layout.addWidget(flow_group)
        
        # 沉积物参数组
        sediment_group = QGroupBox("沉积物参数")
        sediment_layout = QGridLayout()
        
        self.d50 = QDoubleSpinBox()
        self.d50.setRange(0.01, 10.0)
        self.d50.setSingleStep(0.01)
        self.d50.setSuffix(" mm")
        sediment_layout.addWidget(QLabel("中值粒径 d50:"), 0, 0)
        sediment_layout.addWidget(self.d50, 0, 1)
        
        self.sediment_density = QDoubleSpinBox()
        self.sediment_density.setRange(2000, 3000)
        self.sediment_density.setSingleStep(10)
        self.sediment_density.setSuffix(" kg/m³")
        sediment_layout.addWidget(QLabel("沉积物密度:"), 1, 0)
        sediment_layout.addWidget(self.sediment_density, 1, 1)
        
        sediment_group.setLayout(sediment_layout)
        layout.addWidget(sediment_group)
        
        # 计算设置组
        calc_group = QGroupBox("计算设置")
        calc_layout = QGridLayout()
        
        self.mesh_resolution = QComboBox()
        self.mesh_resolution.addItems(["粗糙", "中等", "精细", "超精细"])
        calc_layout.addWidget(QLabel("网格密度:"), 0, 0)
        calc_layout.addWidget(self.mesh_resolution, 0, 1)
        
        self.use_fem = QCheckBox("使用真正的有限元")
        self.use_fem.setChecked(True)
        calc_layout.addWidget(self.use_fem, 1, 0, 1, 2)
        
        self.use_gmsh = QCheckBox("使用Gmsh几何建模")
        self.use_gmsh.setChecked(True)
        calc_layout.addWidget(self.use_gmsh, 2, 0, 1, 2)
        
        self.use_pyvista = QCheckBox("使用PyVista可视化")
        self.use_pyvista.setChecked(True)
        calc_layout.addWidget(self.use_pyvista, 3, 0, 1, 2)
        
        calc_group.setLayout(calc_layout)
        layout.addWidget(calc_group)
        
        layout.addStretch()
        self.setLayout(layout)
    
    def load_default_values(self):
        """加载默认参数值"""
        self.pier_diameter.setValue(2.0)
        self.water_depth.setValue(5.0)
        self.flow_velocity.setValue(3.0)
        self.approach_angle.setValue(0.0)
        self.d50.setValue(0.5)
        self.sediment_density.setValue(2650.0)
        self.mesh_resolution.setCurrentText("中等")
    
    def get_parameters(self) -> Dict[str, Any]:
        """获取当前参数"""
        shape_map = {"圆形": "circular", "矩形": "rectangular", "椭圆形": "elliptical"}
        resolution_map = {"粗糙": "coarse", "中等": "medium", "精细": "fine", "超精细": "ultra_fine"}
        
        return {
            "pier_diameter": self.pier_diameter.value(),
            "pier_shape": shape_map[self.pier_shape.currentText()],
            "flow_velocity": self.flow_velocity.value(),
            "water_depth": self.water_depth.value(),
            "d50": self.d50.value(),
            "approach_angle": self.approach_angle.value(),
            "sediment_density": self.sediment_density.value(),
            "water_density": 1000.0,
            "gravity": 9.81,
            "mesh_quality": resolution_map[self.mesh_resolution.currentText()],
            "mesh_resolution": resolution_map[self.mesh_resolution.currentText()],
            "time_step": 0.1,
            "max_iterations": 50,
            "convergence_tolerance": 1e-5,
            "output_dir": "outputs",
            "use_advanced": True,
            "use_gmsh": self.use_gmsh.isChecked(),
            "use_fenics": self.use_fem.isChecked(),
            "use_pyvista": self.use_pyvista.isChecked(),
            "geometry": {
                "pier_diameter": self.pier_diameter.value(),
                "water_depth": self.water_depth.value(),
                "domain_size": [self.pier_diameter.value() * 20, self.water_depth.value() * 2]
            },
            "boundary_conditions": {
                "inlet_velocity": self.flow_velocity.value()
            },
            "sediment": {
                "d50": self.d50.value(),
                "sediment_density": self.sediment_density.value()
            }
        }
    
    def load_from_file(self, filename: str):
        """从文件加载参数"""
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                params = json.load(f)
            
            self.pier_diameter.setValue(params.get("pier_diameter", 2.0))
            self.water_depth.setValue(params.get("water_depth", 5.0))
            self.flow_velocity.setValue(params.get("flow_velocity", 3.0))
            self.approach_angle.setValue(params.get("approach_angle", 0.0))
            self.d50.setValue(params.get("d50", 0.5))
            self.sediment_density.setValue(params.get("sediment_density", 2650.0))
            
        except Exception as e:
            QMessageBox.warning(self, "错误", f"参数加载失败: {e}")


class ResultDisplayWidget(QWidget):
    """结果显示面板"""
    
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout()
        
        # 结果摘要
        summary_group = QGroupBox("计算结果摘要")
        summary_layout = QGridLayout()
        
        self.scour_depth_label = QLabel("--")
        self.max_velocity_label = QLabel("--")
        self.computation_time_label = QLabel("--")
        self.solver_type_label = QLabel("--")
        
        summary_layout.addWidget(QLabel("冲刷深度:"), 0, 0)
        summary_layout.addWidget(self.scour_depth_label, 0, 1)
        summary_layout.addWidget(QLabel("最大流速:"), 1, 0)
        summary_layout.addWidget(self.max_velocity_label, 1, 1)
        summary_layout.addWidget(QLabel("计算时间:"), 2, 0)
        summary_layout.addWidget(self.computation_time_label, 2, 1)
        summary_layout.addWidget(QLabel("求解器类型:"), 3, 0)
        summary_layout.addWidget(self.solver_type_label, 3, 1)
        
        summary_group.setLayout(summary_layout)
        layout.addWidget(summary_group)
        
        # 详细结果
        details_group = QGroupBox("详细结果")
        details_layout = QVBoxLayout()
        
        self.details_text = QTextEdit()
        self.details_text.setReadOnly(True)
        self.details_text.setMaximumHeight(300)
        details_layout.addWidget(self.details_text)
        
        details_group.setLayout(details_layout)
        layout.addWidget(details_group)
        
        # 技术栈状态
        tech_group = QGroupBox("技术栈状态")
        tech_layout = QGridLayout()
        
        self.gmsh_status = QLabel("--")
        self.fenics_status = QLabel("--")
        self.pyvista_status = QLabel("--")
        self.meshio_status = QLabel("--")
        
        tech_layout.addWidget(QLabel("Gmsh:"), 0, 0)
        tech_layout.addWidget(self.gmsh_status, 0, 1)
        tech_layout.addWidget(QLabel("FEniCS:"), 1, 0)
        tech_layout.addWidget(self.fenics_status, 1, 1)
        tech_layout.addWidget(QLabel("PyVista:"), 2, 0)
        tech_layout.addWidget(self.pyvista_status, 2, 1)
        tech_layout.addWidget(QLabel("Meshio:"), 3, 0)
        tech_layout.addWidget(self.meshio_status, 3, 1)
        
        tech_group.setLayout(tech_layout)
        layout.addWidget(tech_group)
        
        self.setLayout(layout)
    
    def update_results(self, result_data: Dict[str, Any]):
        """更新结果显示"""
        result = result_data.get("result", {})
        
        # 更新摘要
        scour_depth = result.get("scour_depth", 0.0)
        max_velocity = result.get("max_velocity", 0.0)
        computation_time = result.get("computation_time", 0.0)
        solver_type = result.get("solver", "未知")
        
        self.scour_depth_label.setText(f"{scour_depth:.2f} m")
        self.max_velocity_label.setText(f"{max_velocity:.2f} m/s")
        self.computation_time_label.setText(f"{computation_time:.2f} s")
        self.solver_type_label.setText(solver_type)
        
        # 更新详细结果
        details_text = json.dumps(result, ensure_ascii=False, indent=2)
        self.details_text.setPlainText(details_text)
        
        # 更新技术栈状态
        tech_stack = result.get("technology_stack", {})
        self.gmsh_status.setText("✅ 可用" if tech_stack.get("gmsh") else "❌ 不可用")
        self.fenics_status.setText("✅ 可用" if tech_stack.get("fenics") else "❌ 不可用")
        self.pyvista_status.setText("✅ 可用" if tech_stack.get("pyvista") else "❌ 不可用")
        self.meshio_status.setText("✅ 可用" if tech_stack.get("meshio") else "❌ 不可用")


class CAEMainWindow(QMainWindow):
    """CAE主窗口"""
    
    def __init__(self):
        super().__init__()
        self.computation_thread = None
        self.init_ui()
        self.show_welcome_message()
    
    def init_ui(self):
        self.setWindowTitle("CAE桥墩冲刷计算系统 - 真正的有限元计算")
        self.setGeometry(100, 100, 1200, 800)
        
        # 创建中央部件和布局
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QHBoxLayout()
        
        # 左侧参数面板
        left_panel = QWidget()
        left_layout = QVBoxLayout()
        
        # 参数输入
        self.param_widget = ParameterInputWidget()
        left_layout.addWidget(self.param_widget)
        
        # 控制按钮
        button_layout = QHBoxLayout()
        
        self.load_button = QPushButton("加载算例")
        self.load_button.clicked.connect(self.load_case)
        button_layout.addWidget(self.load_button)
        
        self.save_button = QPushButton("保存算例")
        self.save_button.clicked.connect(self.save_case)
        button_layout.addWidget(self.save_button)
        
        self.compute_button = QPushButton("开始计算")
        self.compute_button.clicked.connect(self.start_computation)
        self.compute_button.setStyleSheet("QPushButton { background-color: #4CAF50; color: white; font-weight: bold; }")
        button_layout.addWidget(self.compute_button)
        
        left_layout.addLayout(button_layout)
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        left_layout.addWidget(self.progress_bar)
        
        # 状态标签
        self.status_label = QLabel("就绪")
        left_layout.addWidget(self.status_label)
        
        left_panel.setLayout(left_layout)
        left_panel.setMaximumWidth(400)
        
        # 右侧结果面板
        self.result_widget = ResultDisplayWidget()
        
        # 添加到主布局
        main_layout.addWidget(left_panel)
        main_layout.addWidget(self.result_widget)
        
        central_widget.setLayout(main_layout)
        
        # 加载预设算例
        self.load_preset_cases()
    
    def show_welcome_message(self):
        """显示欢迎信息"""
        welcome_text = """
🎉 欢迎使用CAE桥墩冲刷计算系统！

✅ 技术栈特色：
• Gmsh OCC - 真正的几何建模
• 有限元法 - 真正的数值求解
• PyVista - 专业可视化
• 物理增强算法 - 流体力学+沉积物输运

🚀 使用说明：
1. 在左侧设置计算参数
2. 点击"开始计算"运行CAE仿真
3. 查看右侧的详细结果

现在就开始您的第一次计算吧！
        """
        self.result_widget.details_text.setPlainText(welcome_text)
    
    def load_preset_cases(self):
        """加载预设算例"""
        # 这里可以加载一些预设的计算算例
        pass
    
    def load_case(self):
        """加载算例文件"""
        filename, _ = QFileDialog.getOpenFileName(
            self, "加载算例文件", "", "JSON files (*.json);;All files (*.*)")
        
        if filename:
            self.param_widget.load_from_file(filename)
            self.status_label.setText(f"已加载算例: {Path(filename).name}")
    
    def save_case(self):
        """保存算例文件"""
        filename, _ = QFileDialog.getSaveFileName(
            self, "保存算例文件", "cae_case.json", "JSON files (*.json);;All files (*.*)")
        
        if filename:
            try:
                params = self.param_widget.get_parameters()
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(params, f, ensure_ascii=False, indent=2)
                self.status_label.setText(f"算例已保存: {Path(filename).name}")
            except Exception as e:
                QMessageBox.warning(self, "错误", f"保存失败: {e}")
    
    def start_computation(self):
        """开始CAE计算"""
        if not HAS_CAE_SERVICE:
            QMessageBox.warning(self, "错误", "CAE服务不可用！")
            return
        
        # 获取参数
        params = self.param_widget.get_parameters()
        
        # 显示进度条
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        
        # 禁用计算按钮
        self.compute_button.setEnabled(False)
        self.compute_button.setText("计算中...")
        
        # 创建并启动计算线程
        self.computation_thread = CAEComputationThread(params)
        self.computation_thread.progress_updated.connect(self.progress_bar.setValue)
        self.computation_thread.status_updated.connect(self.status_label.setText)
        self.computation_thread.computation_finished.connect(self.on_computation_finished)
        self.computation_thread.start()
    
    def on_computation_finished(self, result_data: Dict[str, Any]):
        """计算完成回调"""
        # 隐藏进度条
        self.progress_bar.setVisible(False)
        
        # 恢复计算按钮
        self.compute_button.setEnabled(True)
        self.compute_button.setText("开始计算")
        
        if result_data.get("success"):
            # 显示结果
            self.result_widget.update_results(result_data)
            self.status_label.setText("计算完成！")
            
            # 显示完成提示
            result = result_data.get("result", {})
            scour_depth = result.get("scour_depth", 0.0)
            computation_time = result.get("computation_time", 0.0)
            solver_type = result.get("solver", "未知")
            
            QMessageBox.information(
                self, "计算完成", 
                f"CAE计算成功完成！\n\n"
                f"冲刷深度: {scour_depth:.2f} m\n"
                f"求解器: {solver_type}\n"
                f"计算时间: {computation_time:.1f} 秒"
            )
        else:
            # 显示错误
            error_msg = result_data.get("error", "未知错误")
            self.status_label.setText(f"计算失败: {error_msg}")
            QMessageBox.critical(self, "计算失败", f"CAE计算失败:\n{error_msg}")


def main():
    """启动GUI应用"""
    if not HAS_PYQT:
        print("错误: PyQt6不可用，无法启动GUI")
        return 1
    
    app = QApplication(sys.argv)
    app.setApplicationName("CAE桥墩冲刷计算系统")
    
    # 设置应用样式
    app.setStyleSheet("""
        QMainWindow {
            background-color: #f0f0f0;
        }
        QGroupBox {
            font-weight: bold;
            border: 2px solid #cccccc;
            border-radius: 5px;
            margin-top: 10px;
            padding-top: 10px;
        }
        QGroupBox::title {
            subcontrol-origin: margin;
            left: 10px;
            padding: 0 5px 0 5px;
        }
        QPushButton {
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #ccc;
        }
        QPushButton:hover {
            background-color: #e0e0e0;
        }
    """)
    
    # 创建主窗口
    window = CAEMainWindow()
    window.show()
    
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
