#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import pandas as pd
from PyQt6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget, QTabWidget, QLabel
from PyQt6.QtCore import Qt

try:
    import pyvista as pv
    from pyvistaqt import QtInteractor
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

class SimpleTestWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("简单测试 - 解决Tab问题")
        self.setGeometry(100, 100, 1200, 800)
        
        # 创建主widget
        main_widget = QWidget()
        main_layout = QVBoxLayout(main_widget)
        
        # 创建Tab
        self.tab_widget = QTabWidget()
        
        # 先只创建一个3D标签页测试
        self.create_3d_tab()
        
        # 如果3D成功，再创建2D标签页
        if hasattr(self, 'plotter_3d') and self.plotter_3d:
            print("3D成功，创建2D标签页...")
            self.create_2d_tab()
        
        main_layout.addWidget(self.tab_widget)
        self.setCentralWidget(main_widget)
        
        # 测试数据
        self.test_display()
    
    def create_3d_tab(self):
        """创建3D标签页"""
        print("=== 创建3D标签页 ===")
        self.tab_3d = QWidget()
        layout_3d = QVBoxLayout(self.tab_3d)
        
        if PYVISTA_AVAILABLE:
            try:
                print("正在创建3D QtInteractor...")
                self.plotter_3d = QtInteractor(self.tab_3d)
                self.plotter_3d.set_background('#f0f4f8')
                layout_3d.addWidget(self.plotter_3d.interactor)
                print("[OK] 3D QtInteractor创建成功")
                
                # 立即添加一个测试立方体
                test_cube = pv.Cube(center=[0, 0, 0], x_length=100, y_length=100, z_length=100)
                self.plotter_3d.add_mesh(test_cube, color='blue', opacity=0.8)
                self.plotter_3d.reset_camera()
                print("[OK] 3D测试立方体添加成功")
                
            except Exception as e:
                print(f"[ERROR] 3D QtInteractor创建失败: {e}")
                self.plotter_3d = None
                # 添加错误标签
                error_label = QLabel(f"3D视图创建失败: {e}")
                layout_3d.addWidget(error_label)
        else:
            print("[ERROR] PyVista不可用")
            self.plotter_3d = None
            no_pyvista_label = QLabel("PyVista不可用")
            layout_3d.addWidget(no_pyvista_label)
            
        self.tab_widget.addTab(self.tab_3d, "3D全景")
    
    def create_2d_tab(self):
        """创建2D标签页"""
        print("=== 创建2D标签页 ===")
        self.tab_2d = QWidget()
        layout_2d = QVBoxLayout(self.tab_2d)
        
        if PYVISTA_AVAILABLE and self.plotter_3d:
            try:
                print("正在创建2D QtInteractor...")
                self.plotter_2d = QtInteractor(self.tab_2d)
                self.plotter_2d.set_background('#ffffff')
                layout_2d.addWidget(self.plotter_2d.interactor)
                print("[OK] 2D QtInteractor创建成功")
                
                # 立即添加一个测试立方体
                test_cube = pv.Cube(center=[0, 0, 0], x_length=50, y_length=10, z_length=30)
                self.plotter_2d.add_mesh(test_cube, color='red', opacity=0.9)
                self.plotter_2d.view_xz()
                self.plotter_2d.reset_camera()
                print("[OK] 2D测试立方体添加成功")
                
            except Exception as e:
                print(f"[ERROR] 2D QtInteractor创建失败: {e}")
                self.plotter_2d = None
                # 添加错误标签
                error_label = QLabel(f"2D视图创建失败: {e}")
                layout_2d.addWidget(error_label)
        else:
            print("[ERROR] 跳过2D创建，因为3D失败")
            self.plotter_2d = None
            skip_label = QLabel("2D视图跳过，因为3D创建失败")
            layout_2d.addWidget(skip_label)
            
        self.tab_widget.addTab(self.tab_2d, "2D剖面")
    
    def test_display(self):
        """测试显示一些内容"""
        print("=== 测试显示内容 ===")
        
        # 尝试加载数据
        try:
            df = pd.read_csv("example3/data/geological_data_v2.csv")
            print(f"[OK] 数据加载成功: {len(df)} 条记录")
            
            # 在2D视图中添加一些真实数据
            if hasattr(self, 'plotter_2d') and self.plotter_2d:
                print("在2D视图中添加地质数据...")
                
                # 获取数据范围
                x_min, x_max = df['x'].min(), df['x'].max()
                y_min, y_max = df['y'].min(), df['y'].max()
                z_min, z_max = df['z_bottom'].min(), df['z_top'].max()
                cut_y = (y_min + y_max) / 2
                
                print(f"数据范围: X:{x_min:.0f}-{x_max:.0f}, Z:{z_min:.0f}-{z_max:.0f}")
                print(f"剖切位置: Y={cut_y:.0f}")
                
                # 选择剖切数据
                cross_section_data = df[abs(df['y'] - cut_y) < 100]
                print(f"剖切数据: {len(cross_section_data)} 条")
                
                if len(cross_section_data) > 0:
                    unique_boreholes = cross_section_data['borehole_id'].unique()[:5]  # 只显示5个
                    
                    formations = ['填土', '粘土', '粉质粘土', '细砂', '中砂']
                    colors = ['#8B4513', '#FF4500', '#FF8C00', '#FFD700', '#32CD32']
                    
                    for borehole_id in unique_boreholes:
                        bh_data = cross_section_data[cross_section_data['borehole_id'] == borehole_id]
                        x = bh_data['x'].iloc[0]
                        
                        for _, row in bh_data.iterrows():
                            formation = row['formation_name']
                            if formation not in formations:
                                continue
                                
                            color = colors[formations.index(formation)]
                            z_top = row['z_top']
                            z_bottom = row['z_bottom']
                            thickness = abs(z_top - z_bottom)
                            
                            if thickness < 1:
                                continue
                            
                            layer_cube = pv.Cube(
                                center=[x, 0, (z_top + z_bottom)/2],
                                x_length=40,
                                y_length=8,
                                z_length=thickness
                            )
                            
                            self.plotter_2d.add_mesh(
                                layer_cube,
                                color=color,
                                opacity=0.9,
                                show_edges=True,
                                edge_color='black',
                                line_width=1
                            )
                    
                    print("[OK] 2D地质数据添加成功")
        
        except Exception as e:
            print(f"[ERROR] 数据处理失败: {e}")

def main():
    print("=== 简单测试程序启动 ===")
    
    app = QApplication(sys.argv)
    window = SimpleTestWindow()
    window.show()
    
    print("=== 界面已显示 ===")
    sys.exit(app.exec())

if __name__ == "__main__":
    main()