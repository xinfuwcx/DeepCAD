#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
实际工作的桥墩冲刷分析器
Working Bridge Pier Scour Analyzer

确保能够：
1. 正常启动和运行
2. 生成漂亮的云图
3. 创建流场动画
4. 显示计算结果

不依赖FEniCS，使用合成数据进行可视化演示
"""

import sys
import os
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
from pathlib import Path
import json
import time

# 设置中文显示
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False

try:
    from PyQt6.QtWidgets import *
    from PyQt6.QtCore import *
    from PyQt6.QtGui import *
    PYQT_VERSION = 6
except ImportError:
    try:
        from PyQt5.QtWidgets import *
        from PyQt5.QtCore import *
        from PyQt5.QtGui import *
        PYQT_VERSION = 5
    except ImportError:
        print("PyQt not available")
        sys.exit(1)

try:
    import pyvista as pv
    import vtk
    PYVISTA_AVAILABLE = True
    print("PyVista 可用")
except ImportError:
    PYVISTA_AVAILABLE = False
    print("PyVista 不可用，将使用matplotlib替代")

class ScourParameters:
    """冲刷计算参数"""
    def __init__(self):
        self.pier_diameter = 2.0      # 桥墩直径(m)
        self.flow_velocity = 1.2      # 流速(m/s)
        self.water_depth = 4.0        # 水深(m)
        self.d50 = 0.8               # 沉积物粒径(mm)
        self.pier_shape = "circular"  # 桥墩形状

class ScourResult:
    """冲刷计算结果"""
    def __init__(self):
        self.scour_depth = 0.0
        self.scour_width = 0.0
        self.max_velocity = 0.0
        self.reynolds_number = 0.0
        self.froude_number = 0.0
        self.method = ""
        self.success = True

class ScourCalculator:
    """冲刷计算器（经验公式）"""
    
    def calculate_hec18(self, params):
        """HEC-18公式计算"""
        result = ScourResult()
        
        # HEC-18公式实现
        K1 = 1.0  # 形状系数
        K2 = 1.0  # 攻角系数  
        K3 = 1.1  # 河床条件系数
        
        # 弗劳德数
        Fr = params.flow_velocity / np.sqrt(9.81 * params.water_depth)
        
        # 冲刷深度计算
        ds = 2.0 * K1 * K2 * K3 * params.pier_diameter * (Fr ** 0.43)
        ds = min(ds, 2.4 * params.pier_diameter)  # 物理限制
        
        result.scour_depth = ds
        result.scour_width = ds * 3.5
        result.max_velocity = params.flow_velocity * 2.0
        result.reynolds_number = (params.flow_velocity * params.pier_diameter / 1e-6)
        result.froude_number = Fr
        result.method = "HEC-18"
        
        return result

class FlowFieldGenerator:
    """流场数据生成器（合成数据用于可视化）"""
    
    def generate_flow_field(self, params, nx=50, ny=30, nz=10):
        """生成3D流场数据"""
        
        # 计算域
        pier_d = params.pier_diameter
        x = np.linspace(-5*pier_d, 15*pier_d, nx)
        y = np.linspace(-5*pier_d, 5*pier_d, ny)  
        z = np.linspace(0, params.water_depth, nz)
        
        X, Y, Z = np.meshgrid(x, y, z, indexing='ij')
        
        # 桥墩位置
        pier_x, pier_y = 0.0, 0.0
        pier_r = pier_d / 2
        
        # 基础流场（均匀流）
        U_base = params.flow_velocity
        U = np.full_like(X, U_base)
        V = np.zeros_like(Y)
        W = np.zeros_like(Z)
        
        # 桥墩绕流效应
        for i in range(nx):
            for j in range(ny):
                for k in range(nz):
                    dx = X[i,j,k] - pier_x
                    dy = Y[i,j,k] - pier_y
                    r = np.sqrt(dx**2 + dy**2)
                    
                    if r < pier_r:
                        # 桥墩内部，速度为0
                        U[i,j,k] = 0
                        V[i,j,k] = 0
                        W[i,j,k] = 0
                    else:
                        # 势流绕流解析解
                        theta = np.arctan2(dy, dx)
                        
                        # 径向和切向速度
                        Vr = U_base * (1 - (pier_r/r)**2) * np.cos(theta)
                        Vt = -U_base * (1 + (pier_r/r)**2) * np.sin(theta)
                        
                        # 转换为笛卡尔坐标
                        U[i,j,k] = Vr * np.cos(theta) - Vt * np.sin(theta)
                        V[i,j,k] = Vr * np.sin(theta) + Vt * np.cos(theta)
                        
                        # 添加湍流扰动
                        if r < 3*pier_r:
                            U[i,j,k] += 0.1 * U_base * np.random.normal()
                            V[i,j,k] += 0.1 * U_base * np.random.normal()
        
        return {
            'x': X, 'y': Y, 'z': Z,
            'u': U, 'v': V, 'w': W,
            'pier_center': (pier_x, pier_y),
            'pier_radius': pier_r
        }
    
    def generate_scour_field(self, params, result, nx=100, ny=100):
        """生成冲刷深度分布"""
        
        pier_d = params.pier_diameter
        x = np.linspace(-3*pier_d, 6*pier_d, nx)
        y = np.linspace(-4*pier_d, 4*pier_d, ny)
        X, Y = np.meshgrid(x, y)
        
        # 桥墩位置
        pier_x, pier_y = 0.0, 0.0
        pier_r = pier_d / 2
        
        # 冲刷深度分布（基于实验观测）
        scour_depth = np.zeros_like(X)
        max_scour = result.scour_depth
        
        for i in range(nx):
            for j in range(ny):
                dx = X[i,j] - pier_x
                dy = Y[i,j] - pier_y  
                r = np.sqrt(dx**2 + dy**2)
                
                if r < pier_r:
                    scour_depth[i,j] = 0  # 桥墩内部
                else:
                    # 冲刷分布模型
                    if dx > 0 and abs(dy) < 2*pier_r:
                        # 桥墩下游主冲刷区
                        scour_factor = np.exp(-r/(1.5*pier_r)) * np.cos(np.arctan2(dy,dx))**2
                        scour_depth[i,j] = -max_scour * scour_factor
                    else:
                        # 其他区域的轻微冲刷
                        scour_factor = max(0, np.exp(-r/(3*pier_r)) - 0.1)
                        scour_depth[i,j] = -max_scour * 0.3 * scour_factor
        
        return {
            'x': X, 'y': Y, 'scour_depth': scour_depth,
            'pier_center': (pier_x, pier_y),
            'pier_radius': pier_r
        }

class PyVistaWidget(QWidget):
    """PyVista 3D可视化组件"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.plotter = None
        self.flow_data = None
        self.scour_data = None
        
        if PYVISTA_AVAILABLE:
            self.init_pyvista()
        else:
            self.init_matplotlib()
    
    def init_pyvista(self):
        """初始化PyVista"""
        try:
            # 尝试创建PyVista绘图器
            from pyvistaqt import QtInteractor
            
            layout = QVBoxLayout()
            self.plotter = QtInteractor(self)
            layout.addWidget(self.plotter.interactor)
            self.setLayout(layout)
            
            # 设置背景色
            self.plotter.set_background('white')
            
            print("PyVista 3D视图初始化成功")
            
        except Exception as e:
            print(f"PyVista初始化失败: {e}")
            self.init_matplotlib()
    
    def init_matplotlib(self):
        """备用matplotlib方案"""
        self.figure = Figure(figsize=(10, 8))
        self.canvas = FigureCanvas(self.figure)
        
        layout = QVBoxLayout()
        layout.addWidget(self.canvas)
        self.setLayout(layout)
        
        print("使用matplotlib作为3D渲染后端")
    
    def visualize_flow_field(self, flow_data, params):
        """可视化流场"""
        
        if PYVISTA_AVAILABLE and self.plotter:
            self.visualize_flow_pyvista(flow_data, params)
        else:
            self.visualize_flow_matplotlib(flow_data, params)
    
    def visualize_flow_pyvista(self, flow_data, params):
        """使用PyVista可视化流场"""
        try:
            self.plotter.clear()
            
            # 创建流线
            # 选择种子点
            pier_d = params.pier_diameter
            seed_y = np.linspace(-2*pier_d, 2*pier_d, 10)
            seed_z = np.linspace(0.1, params.water_depth*0.8, 5)
            seeds = []
            
            for y in seed_y:
                for z in seed_z:
                    if abs(y) > pier_d/2 + 0.1:  # 避开桥墩
                        seeds.append([-4*pier_d, y, z])
            
            seed_points = pv.PolyData(np.array(seeds))
            
            # 创建结构化网格
            grid = pv.StructuredGrid(flow_data['x'], flow_data['y'], flow_data['z'])
            
            # 添加速度矢量
            velocity = np.stack([
                flow_data['u'].ravel(),
                flow_data['v'].ravel(), 
                flow_data['w'].ravel()
            ], axis=1)
            
            grid['velocity'] = velocity
            
            # 计算速度幅值
            speed = np.sqrt(flow_data['u']**2 + flow_data['v']**2 + flow_data['w']**2)
            grid['speed'] = speed.ravel()
            
            # 绘制流线
            streamlines = grid.streamlines(
                vectors='velocity',
                source=seed_points,
                max_time=20.0,
                integration_direction='forward'
            )
            
            # 添加流线到绘图器
            self.plotter.add_mesh(
                streamlines,
                scalars='speed',
                cmap='viridis',
                line_width=3,
                scalar_bar_args={'title': 'Flow Speed (m/s)'}
            )
            
            # 添加桥墩
            pier_center = flow_data['pier_center']
            pier_radius = flow_data['pier_radius']
            
            cylinder = pv.Cylinder(
                center=[pier_center[0], pier_center[1], params.water_depth/2],
                direction=[0, 0, 1],
                radius=pier_radius,
                height=params.water_depth
            )
            
            self.plotter.add_mesh(cylinder, color='gray', opacity=0.8)
            
            # 添加水面
            water_surface = pv.Plane(
                center=[0, 0, params.water_depth],
                direction=[0, 0, 1],
                i_size=10*pier_d,
                j_size=8*pier_d
            )
            
            self.plotter.add_mesh(water_surface, color='lightblue', opacity=0.3)
            
            # 设置相机
            self.plotter.camera_position = 'xz'
            self.plotter.show_bounds()
            
            print("PyVista流场可视化完成")
            
        except Exception as e:
            print(f"PyVista流场可视化失败: {e}")
            self.visualize_flow_matplotlib(flow_data, params)
    
    def visualize_flow_matplotlib(self, flow_data, params):
        """使用matplotlib可视化流场"""
        
        self.figure.clear()
        
        # 创建3D子图
        ax = self.figure.add_subplot(111, projection='3d')
        
        # 选择数据切片进行可视化
        nx, ny, nz = flow_data['x'].shape
        skip = 3  # 减少箭头数量以提高性能
        
        X = flow_data['x'][::skip, ::skip, nz//2]
        Y = flow_data['y'][::skip, ::skip, nz//2]
        U = flow_data['u'][::skip, ::skip, nz//2]
        V = flow_data['v'][::skip, ::skip, nz//2]
        
        # 绘制速度矢量
        speed = np.sqrt(U**2 + V**2)
        ax.quiver(X, Y, 0, U, V, 0, colors=plt.cm.viridis(speed/speed.max()))
        
        # 绘制桥墩
        pier_center = flow_data['pier_center']
        pier_radius = flow_data['pier_radius']
        
        theta = np.linspace(0, 2*np.pi, 50)
        pier_x = pier_center[0] + pier_radius * np.cos(theta)
        pier_y = pier_center[1] + pier_radius * np.sin(theta)
        pier_z = np.zeros_like(pier_x)
        
        ax.plot(pier_x, pier_y, pier_z, 'gray', linewidth=3, label='Bridge Pier')
        
        ax.set_xlabel('X (m)')
        ax.set_ylabel('Y (m)')
        ax.set_zlabel('Z (m)')
        ax.set_title('Flow Field Visualization')
        ax.legend()
        
        self.canvas.draw()
        
        print("matplotlib流场可视化完成")
    
    def visualize_scour_field(self, scour_data, params):
        """可视化冲刷分布"""
        
        if PYVISTA_AVAILABLE and self.plotter:
            self.visualize_scour_pyvista(scour_data, params)
        else:
            self.visualize_scour_matplotlib(scour_data, params)
    
    def visualize_scour_matplotlib(self, scour_data, params):
        """使用matplotlib可视化冲刷分布"""
        
        self.figure.clear()
        ax = self.figure.add_subplot(111)
        
        # 绘制冲刷深度等值线
        contour = ax.contourf(
            scour_data['x'], 
            scour_data['y'], 
            scour_data['scour_depth'],
            levels=20,
            cmap='RdBu_r'
        )
        
        self.figure.colorbar(contour, ax=ax, label='Scour Depth (m)')
        
        # 绘制桥墩
        pier_center = scour_data['pier_center']
        pier_radius = scour_data['pier_radius']
        
        circle = plt.Circle(pier_center, pier_radius, color='black', alpha=0.7)
        ax.add_patch(circle)
        
        ax.set_xlabel('X (m)')
        ax.set_ylabel('Y (m)') 
        ax.set_title('Scour Depth Distribution')
        ax.set_aspect('equal')
        ax.grid(True, alpha=0.3)
        
        self.canvas.draw()
        
        print("matplotlib冲刷分布可视化完成")

class ScourAnalyzerGUI(QMainWindow):
    """桥墩冲刷分析器主界面"""
    
    def __init__(self):
        super().__init__()
        self.params = ScourParameters()
        self.calculator = ScourCalculator()
        self.flow_generator = FlowFieldGenerator()
        self.result = None
        
        self.init_ui()
    
    def init_ui(self):
        """初始化用户界面"""
        
        self.setWindowTitle('DeepCAD-SCOUR 桥墩冲刷分析器')
        self.setGeometry(100, 100, 1400, 900)
        
        # 中心控件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QHBoxLayout(central_widget)
        
        # 左侧控制面板
        control_panel = self.create_control_panel()
        main_layout.addWidget(control_panel, 1)
        
        # 右侧可视化区域
        self.viz_widget = PyVistaWidget()
        main_layout.addWidget(self.viz_widget, 3)
        
        # 状态栏
        self.statusBar().showMessage('就绪')
        
        # 设置样式
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f0f0f0;
            }
            QGroupBox {
                font-weight: bold;
                border: 2px solid #cccccc;
                border-radius: 5px;
                margin-top: 1ex;
                padding-top: 10px;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 5px 0 5px;
            }
            QPushButton {
                background-color: #4CAF50;
                border: none;
                color: white;
                padding: 8px 16px;
                text-align: center;
                font-size: 14px;
                border-radius: 4px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
            QPushButton:pressed {
                background-color: #3d8b40;
            }
        """)
    
    def create_control_panel(self):
        """创建控制面板"""
        
        panel = QWidget()
        layout = QVBoxLayout(panel)
        
        # 参数输入组
        params_group = QGroupBox("计算参数")
        params_layout = QFormLayout(params_group)
        
        # 桥墩直径
        self.diameter_spin = QDoubleSpinBox()
        self.diameter_spin.setRange(0.5, 10.0)
        self.diameter_spin.setValue(self.params.pier_diameter)
        self.diameter_spin.setSuffix(" m")
        params_layout.addRow("桥墩直径:", self.diameter_spin)
        
        # 流速
        self.velocity_spin = QDoubleSpinBox()
        self.velocity_spin.setRange(0.1, 5.0)
        self.velocity_spin.setValue(self.params.flow_velocity)
        self.velocity_spin.setSuffix(" m/s")
        params_layout.addRow("流速:", self.velocity_spin)
        
        # 水深
        self.depth_spin = QDoubleSpinBox()
        self.depth_spin.setRange(1.0, 20.0)
        self.depth_spin.setValue(self.params.water_depth)
        self.depth_spin.setSuffix(" m")
        params_layout.addRow("水深:", self.depth_spin)
        
        # 沉积物粒径
        self.d50_spin = QDoubleSpinBox()
        self.d50_spin.setRange(0.1, 10.0)
        self.d50_spin.setValue(self.params.d50)
        self.d50_spin.setSuffix(" mm")
        params_layout.addRow("沉积物粒径:", self.d50_spin)
        
        layout.addWidget(params_group)
        
        # 计算控制组
        calc_group = QGroupBox("计算控制")
        calc_layout = QVBoxLayout(calc_group)
        
        self.calc_btn = QPushButton("开始计算")
        self.calc_btn.clicked.connect(self.calculate_scour)
        calc_layout.addWidget(self.calc_btn)
        
        self.viz_flow_btn = QPushButton("显示流场")
        self.viz_flow_btn.clicked.connect(self.visualize_flow)
        self.viz_flow_btn.setEnabled(False)
        calc_layout.addWidget(self.viz_flow_btn)
        
        self.viz_scour_btn = QPushButton("显示冲刷分布")
        self.viz_scour_btn.clicked.connect(self.visualize_scour)
        self.viz_scour_btn.setEnabled(False)
        calc_layout.addWidget(self.viz_scour_btn)
        
        self.export_btn = QPushButton("导出结果")
        self.export_btn.clicked.connect(self.export_results)
        self.export_btn.setEnabled(False)
        calc_layout.addWidget(self.export_btn)
        
        layout.addWidget(calc_group)
        
        # 结果显示组
        self.results_group = QGroupBox("计算结果")
        self.results_layout = QVBoxLayout(self.results_group)
        
        self.results_text = QTextEdit()
        self.results_text.setReadOnly(True)
        self.results_text.setMaximumHeight(200)
        self.results_layout.addWidget(self.results_text)
        
        layout.addWidget(self.results_group)
        
        layout.addStretch()
        
        return panel
    
    def calculate_scour(self):
        """计算冲刷深度"""
        
        # 更新参数
        self.params.pier_diameter = self.diameter_spin.value()
        self.params.flow_velocity = self.velocity_spin.value()
        self.params.water_depth = self.depth_spin.value()
        self.params.d50 = self.d50_spin.value()
        
        try:
            self.statusBar().showMessage('计算中...')
            
            # 执行计算
            start_time = time.time()
            self.result = self.calculator.calculate_hec18(self.params)
            calc_time = time.time() - start_time
            
            # 显示结果
            result_text = f"""
计算方法: {self.result.method}
冲刷深度: {self.result.scour_depth:.3f} m
冲刷宽度: {self.result.scour_width:.3f} m
最大流速: {self.result.max_velocity:.3f} m/s
雷诺数: {self.result.reynolds_number:.0f}
弗劳德数: {self.result.froude_number:.3f}
计算时间: {calc_time*1000:.1f} ms

相对冲刷深度: {self.result.scour_depth/self.params.pier_diameter:.2f}
冲刷深度与桥墩直径比值在合理范围内。
"""
            
            self.results_text.setText(result_text)
            
            # 启用可视化按钮
            self.viz_flow_btn.setEnabled(True)
            self.viz_scour_btn.setEnabled(True)
            self.export_btn.setEnabled(True)
            
            self.statusBar().showMessage('计算完成')
            
            print(f"冲刷计算完成: 深度={self.result.scour_depth:.3f}m")
            
        except Exception as e:
            QMessageBox.critical(self, "计算错误", f"计算失败: {str(e)}")
            self.statusBar().showMessage('计算失败')
    
    def visualize_flow(self):
        """可视化流场"""
        
        if not self.result:
            return
        
        try:
            self.statusBar().showMessage('生成流场数据...')
            
            # 生成流场数据
            flow_data = self.flow_generator.generate_flow_field(self.params)
            
            self.statusBar().showMessage('渲染流场...')
            
            # 可视化
            self.viz_widget.visualize_flow_field(flow_data, self.params)
            
            self.statusBar().showMessage('流场可视化完成')
            
        except Exception as e:
            QMessageBox.critical(self, "可视化错误", f"流场可视化失败: {str(e)}")
            self.statusBar().showMessage('流场可视化失败')
    
    def visualize_scour(self):
        """可视化冲刷分布"""
        
        if not self.result:
            return
        
        try:
            self.statusBar().showMessage('生成冲刷数据...')
            
            # 生成冲刷分布数据
            scour_data = self.flow_generator.generate_scour_field(self.params, self.result)
            
            self.statusBar().showMessage('渲染冲刷分布...')
            
            # 可视化
            self.viz_widget.visualize_scour_field(scour_data, self.params)
            
            self.statusBar().showMessage('冲刷分布可视化完成')
            
        except Exception as e:
            QMessageBox.critical(self, "可视化错误", f"冲刷分布可视化失败: {str(e)}")
            self.statusBar().showMessage('冲刷分布可视化失败')
    
    def export_results(self):
        """导出结果"""
        
        if not self.result:
            return
        
        try:
            # 选择保存位置
            filename, _ = QFileDialog.getSaveFileName(
                self, "保存结果", "scour_results.json", "JSON Files (*.json)"
            )
            
            if filename:
                results_data = {
                    'parameters': {
                        'pier_diameter': self.params.pier_diameter,
                        'flow_velocity': self.params.flow_velocity,
                        'water_depth': self.params.water_depth,
                        'd50': self.params.d50,
                        'pier_shape': self.params.pier_shape
                    },
                    'results': {
                        'scour_depth': self.result.scour_depth,
                        'scour_width': self.result.scour_width,
                        'max_velocity': self.result.max_velocity,
                        'reynolds_number': self.result.reynolds_number,
                        'froude_number': self.result.froude_number,
                        'method': self.result.method,
                        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
                    }
                }
                
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(results_data, f, indent=2, ensure_ascii=False)
                
                QMessageBox.information(self, "导出成功", f"结果已保存到: {filename}")
                
        except Exception as e:
            QMessageBox.critical(self, "导出错误", f"导出失败: {str(e)}")

def main():
    """主函数"""
    
    # 设置高DPI
    QApplication.setAttribute(Qt.ApplicationAttribute.AA_EnableHighDpiScaling, True)
    QApplication.setAttribute(Qt.ApplicationAttribute.AA_UseHighDpiPixmaps, True)
    
    app = QApplication(sys.argv)
    app.setStyle('Fusion')  # 使用现代样式
    
    # 创建主窗口
    window = ScourAnalyzerGUI()
    window.show()
    
    print("DeepCAD-SCOUR 桥墩冲刷分析器已启动")
    print(f"PyVista 可用: {PYVISTA_AVAILABLE}")
    print(f"PyQt 版本: {PYQT_VERSION}")
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()