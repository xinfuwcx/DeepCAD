#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
启动主界面的简化版本
"""

import sys
import os
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

try:
    from PyQt6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget, QPushButton, QLabel, QFileDialog, QMessageBox
    from PyQt6.QtCore import Qt
    PYQT_AVAILABLE = True
except ImportError:
    try:
        from PyQt5.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget, QPushButton, QLabel, QFileDialog, QMessageBox
        from PyQt5.QtCore import Qt
        PYQT_AVAILABLE = True
    except ImportError:
        PYQT_AVAILABLE = False

try:
    import pyvista as pv
    from pyvistaqt import QtInteractor
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

class MainWindow(QMainWindow):
    """主界面窗口"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("两阶段基坑开挖分析系统")
        self.setGeometry(100, 100, 1200, 800)
        
        # 创建中央部件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 创建布局
        layout = QVBoxLayout(central_widget)
        
        # 标题
        title_label = QLabel("两阶段基坑开挖分析系统")
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title_label.setStyleSheet("font-size: 24px; font-weight: bold; margin: 20px;")
        layout.addWidget(title_label)
        
        # 状态标签
        self.status_label = QLabel("系统就绪")
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.status_label)
        
        # 按钮区域
        button_layout = QVBoxLayout()
        
        # 加载FPN文件按钮
        load_fpn_btn = QPushButton("加载FPN文件")
        load_fpn_btn.clicked.connect(self.load_fpn_file)
        button_layout.addWidget(load_fpn_btn)
        
        # 运行两阶段分析按钮
        run_analysis_btn = QPushButton("运行两阶段分析")
        run_analysis_btn.clicked.connect(self.run_two_stage_analysis)
        button_layout.addWidget(run_analysis_btn)
        
        # 查看结果按钮
        view_results_btn = QPushButton("查看分析结果")
        view_results_btn.clicked.connect(self.view_results)
        button_layout.addWidget(view_results_btn)
        
        # 后处理按钮
        post_process_btn = QPushButton("启动后处理")
        post_process_btn.clicked.connect(self.start_post_processing)
        button_layout.addWidget(post_process_btn)
        
        # 查看VTU文件按钮
        view_vtu_btn = QPushButton("查看VTU结果文件")
        view_vtu_btn.clicked.connect(self.view_vtu_file)
        button_layout.addWidget(view_vtu_btn)
        
        layout.addLayout(button_layout)
        
        # 3D视图区域（如果PyVista可用）
        if PYVISTA_AVAILABLE:
            try:
                self.plotter = QtInteractor(self)
                layout.addWidget(self.plotter.interactor)
                self.setup_3d_view()
            except Exception as e:
                error_label = QLabel(f"3D视图初始化失败: {e}")
                layout.addWidget(error_label)
        else:
            no_pyvista_label = QLabel("PyVista不可用，无法显示3D视图")
            layout.addWidget(no_pyvista_label)
        
        # 当前文件路径
        self.current_fpn_file = None
    
    def setup_3d_view(self):
        """设置3D视图"""
        try:
            # 设置背景
            self.plotter.set_background('white')
            
            # 添加坐标轴
            self.plotter.add_axes()
            
            # 添加示例网格
            sphere = pv.Sphere()
            self.plotter.add_mesh(sphere, color='lightblue', opacity=0.8)
            
            # 设置相机
            self.plotter.reset_camera()
            
        except Exception as e:
            print(f"设置3D视图失败: {e}")
    
    def load_fpn_file(self):
        """加载FPN文件"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, 
            "选择FPN文件", 
            str(Path("data")), 
            "FPN文件 (*.fpn);;所有文件 (*)"
        )
        
        if file_path:
            self.current_fpn_file = file_path
            self.status_label.setText(f"已加载: {Path(file_path).name}")
            
            # 尝试在3D视图中显示
            self.load_fpn_to_3d_view(file_path)
    
    def load_fpn_to_3d_view(self, file_path):
        """在3D视图中加载FPN文件"""
        if not PYVISTA_AVAILABLE:
            return
        
        try:
            # 检查是否有对应的VTU文件
            vtu_path = Path(file_path).with_suffix('.vtu')
            if vtu_path.exists():
                mesh = pv.read(str(vtu_path))
                self.plotter.clear()
                self.plotter.add_mesh(mesh, scalars='MaterialID', show_edges=True, cmap='viridis')
                self.plotter.add_axes()
                self.plotter.reset_camera()
                self.status_label.setText(f"已显示VTU文件: {vtu_path.name}")
            else:
                self.status_label.setText(f"未找到对应的VTU文件: {vtu_path.name}")
                
        except Exception as e:
            self.status_label.setText(f"加载3D模型失败: {e}")
    
    def run_two_stage_analysis(self):
        """运行两阶段分析"""
        if not self.current_fpn_file:
            QMessageBox.warning(self, "警告", "请先加载FPN文件")
            return
        
        try:
            # 运行分析脚本
            import subprocess
            result = subprocess.run([
                sys.executable, 
                "run_two_stage_analysis.py"
            ], capture_output=True, text=True, cwd=str(project_root))
            
            if result.returncode == 0:
                QMessageBox.information(self, "成功", "两阶段分析完成！")
                self.status_label.setText("分析完成")
            else:
                QMessageBox.critical(self, "错误", f"分析失败:\n{result.stderr}")
                
        except Exception as e:
            QMessageBox.critical(self, "错误", f"运行分析失败: {e}")
    
    def view_results(self):
        """查看分析结果"""
        try:
            # 启动结果查看器
            import subprocess
            subprocess.Popen([sys.executable, "simple_post_viewer.py"], cwd=str(project_root))
            self.status_label.setText("已启动结果查看器")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"启动结果查看器失败: {e}")
    
    def start_post_processing(self):
        """启动后处理"""
        try:
            # 启动后处理界面
            import subprocess
            subprocess.Popen([sys.executable, "post_processing_viewer.py"], cwd=str(project_root))
            self.status_label.setText("已启动后处理界面")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"启动后处理失败: {e}")
    
    def view_vtu_file(self):
        """查看VTU结果文件"""
        vtu_file = Path("data/两阶段计算2.vtu")
        
        if not vtu_file.exists():
            QMessageBox.warning(self, "警告", f"VTU文件不存在: {vtu_file}")
            return
        
        if not PYVISTA_AVAILABLE:
            QMessageBox.warning(self, "警告", "PyVista不可用，无法显示VTU文件")
            return
        
        try:
            # 在3D视图中加载VTU文件
            mesh = pv.read(str(vtu_file))
            self.plotter.clear()
            
            # 显示网格，按材料ID着色
            if 'MaterialID' in mesh.cell_data:
                self.plotter.add_mesh(
                    mesh, 
                    scalars='MaterialID', 
                    show_edges=True, 
                    cmap='tab10',
                    scalar_bar_args={'title': '材料ID'}
                )
            else:
                self.plotter.add_mesh(mesh, show_edges=True, color='lightblue')
            
            self.plotter.add_axes()
            self.plotter.reset_camera()
            
            # 显示统计信息
            n_points = mesh.n_points
            n_cells = mesh.n_cells
            self.status_label.setText(f"VTU文件: {n_points:,}个节点, {n_cells:,}个单元")
            
            QMessageBox.information(
                self, 
                "VTU文件信息", 
                f"文件: {vtu_file.name}\n"
                f"节点数: {n_points:,}\n"
                f"单元数: {n_cells:,}\n"
                f"数据字段: {list(mesh.cell_data.keys())}"
            )
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"加载VTU文件失败: {e}")


def main():
    """主函数"""
    if not PYQT_AVAILABLE:
        print("❌ PyQt不可用，无法启动GUI界面")
        return
    
    app = QApplication(sys.argv)
    
    # 设置应用信息
    app.setApplicationName("两阶段基坑开挖分析系统")
    app.setApplicationVersion("1.0")
    
    # 创建主窗口
    window = MainWindow()
    window.show()
    
    # 运行应用
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
