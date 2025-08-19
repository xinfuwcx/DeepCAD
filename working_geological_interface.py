#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Working Geological Interface - 实用地质界面
确保Tab功能和2D剖面都能正常工作
"""

import sys
import pandas as pd
import numpy as np
from PyQt6.QtWidgets import (QApplication, QMainWindow, QVBoxLayout, QHBoxLayout, 
                             QWidget, QTabWidget, QLabel, QPushButton, QFrame)
from PyQt6.QtCore import Qt

try:
    import pyvista as pv
    from pyvistaqt import QtInteractor
    PYVISTA_AVAILABLE = True
    # Windows环境设置
    pv.OFF_SCREEN = False
except ImportError:
    PYVISTA_AVAILABLE = False

class WorkingGeologicalInterface(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("实用地质界面 - 3D/2D Tab")
        self.setGeometry(100, 100, 1400, 900)
        
        # 创建主布局
        main_widget = QWidget()
        main_layout = QHBoxLayout(main_widget)
        
        # 左侧控制面板
        self.create_control_panel(main_layout)
        
        # 右侧Tab显示区域
        self.create_tab_area(main_layout)
        
        self.setCentralWidget(main_widget)
        
        # 加载并显示数据
        self.load_and_display_data()
    
    def create_control_panel(self, main_layout):
        """创建左侧控制面板"""
        control_frame = QFrame()
        control_frame.setFixedWidth(250)
        control_frame.setStyleSheet("background-color: #f0f0f0; border: 1px solid #ccc;")
        
        control_layout = QVBoxLayout(control_frame)
        
        # 标题
        title_label = QLabel("地质界面控制")
        title_label.setStyleSheet("font-size: 16px; font-weight: bold; padding: 10px;")
        control_layout.addWidget(title_label)
        
        # 数据信息
        self.data_info = QLabel("数据加载中...")
        self.data_info.setWordWrap(True)
        control_layout.addWidget(self.data_info)
        
        # 按钮
        refresh_btn = QPushButton("刷新显示")
        refresh_btn.clicked.connect(self.refresh_display)
        control_layout.addWidget(refresh_btn)
        
        switch_btn = QPushButton("切换到2D视图")
        switch_btn.clicked.connect(lambda: self.tab_widget.setCurrentIndex(1))
        control_layout.addWidget(switch_btn)
        
        # 占位
        control_layout.addStretch()
        
        main_layout.addWidget(control_frame)
    
    def create_tab_area(self, main_layout):
        """创建Tab显示区域"""
        # 创建Tab容器
        self.tab_widget = QTabWidget()
        self.tab_widget.setStyleSheet("""
            QTabWidget::pane {
                border: 2px solid #C2C7CB;
            }
            QTabBar::tab {
                background: #E1E1E1;
                border: 1px solid #C4C4C3;
                padding: 8px;
                font-weight: bold;
            }
            QTabBar::tab:selected {
                background: #FFFFFF;
                color: #0066CC;
            }
        """)
        
        # 创建3D标签页
        self.create_3d_tab()
        
        # 创建2D标签页
        self.create_2d_tab()
        
        main_layout.addWidget(self.tab_widget)
    
    def create_3d_tab(self):
        """创建3D标签页"""
        tab_3d = QWidget()
        layout_3d = QVBoxLayout(tab_3d)
        
        # 3D视图标题
        title_3d = QLabel("3D全景视图 - 地质体三维显示")
        title_3d.setStyleSheet("font-size: 14px; font-weight: bold; padding: 5px;")
        layout_3d.addWidget(title_3d)
        
        if PYVISTA_AVAILABLE:
            try:
                # 创建3D绘图器
                self.plotter_3d = QtInteractor(tab_3d)
                self.plotter_3d.set_background('#e8f4f8')
                layout_3d.addWidget(self.plotter_3d.interactor)
                print("[OK] 3D视图创建成功")
                
            except Exception as e:
                print(f"[ERROR] 3D视图失败: {e}")
                self.plotter_3d = None
                error_label = QLabel(f"3D视图创建失败: {e}")
                layout_3d.addWidget(error_label)
        else:
            self.plotter_3d = None
            error_label = QLabel("PyVista不可用，无法显示3D")
            layout_3d.addWidget(error_label)
        
        self.tab_widget.addTab(tab_3d, "🌍 3D全景")
    
    def create_2d_tab(self):
        """创建2D标签页"""
        tab_2d = QWidget()
        layout_2d = QVBoxLayout(tab_2d)
        
        # 2D视图标题
        title_2d = QLabel("2D剖面视图 - 教科书式清晰剖面")
        title_2d.setStyleSheet("font-size: 14px; font-weight: bold; padding: 5px;")
        layout_2d.addWidget(title_2d)
        
        if PYVISTA_AVAILABLE:
            try:
                # 创建2D绘图器
                self.plotter_2d = QtInteractor(tab_2d)
                self.plotter_2d.set_background('#ffffff')
                layout_2d.addWidget(self.plotter_2d.interactor)
                print("[OK] 2D视图创建成功")
                
            except Exception as e:
                print(f"[ERROR] 2D视图失败: {e}")
                self.plotter_2d = None
                error_label = QLabel(f"2D视图创建失败: {e}")
                layout_2d.addWidget(error_label)
        else:
            self.plotter_2d = None
            error_label = QLabel("PyVista不可用，无法显示2D")
            layout_2d.addWidget(error_label)
        
        self.tab_widget.addTab(tab_2d, "📊 2D剖面")
    
    def load_and_display_data(self):
        """加载并显示地质数据"""
        try:
            # 加载数据
            df = pd.read_csv("example3/data/geological_data_v2.csv")
            print(f"[OK] 数据加载成功: {len(df)} 条记录")
            
            # 更新信息
            fault_count = len(df[df['in_fault_zone'] == True])
            fold_count = len(df[df['in_fold_zone'] == True])
            
            info_text = f"""数据概况:
• 记录总数: {len(df)}
• 钻孔数量: {df['borehole_id'].nunique()}
• 地层种类: {df['formation_name'].nunique()}
• 断层影响: {fault_count} 条
• 褶皱影响: {fold_count} 条

显示功能:
• 3D Tab: 立体地质体
• 2D Tab: 剖面图
• 断层: 红色标识
• 褶皱: 蓝色标识"""
            
            self.data_info.setText(info_text)
            
            # 显示3D数据
            if self.plotter_3d:
                self.display_3d_data(df)
            
            # 显示2D数据
            if self.plotter_2d:
                self.display_2d_data(df)
                
        except Exception as e:
            error_msg = f"数据加载失败: {e}"
            print(f"[ERROR] {error_msg}")
            self.data_info.setText(error_msg)
    
    def display_3d_data(self, df):
        """显示3D数据"""
        print("=== 显示3D数据 ===")
        
        # 清空现有数据
        self.plotter_3d.clear()
        
        # 获取数据范围
        x_min, x_max = df['x'].min(), df['x'].max()
        y_min, y_max = df['y'].min(), df['y'].max()
        z_min, z_max = df['z_bottom'].min(), df['z_top'].max()
        
        # 12层地质数据颜色
        formations = ['填土', '粘土', '粉质粘土', '细砂', '中砂', '粗砂', '砾砂', '卵石层', '强风化岩', '中风化岩', '微风化岩', '基岩']
        colors = ['#8B4513', '#FF0000', '#FF8C00', '#FFD700', '#32CD32', '#00CED1', '#1E90FF', '#9932CC', '#DC143C', '#708090', '#2F4F4F', '#000000']
        
        # 显示地层柱
        borehole_ids = df['borehole_id'].unique()[:30]  # 只显示30个钻孔
        
        for borehole_id in borehole_ids:
            bh_data = df[df['borehole_id'] == borehole_id]
            x = bh_data['x'].iloc[0]
            y = bh_data['y'].iloc[0]
            
            for _, row in bh_data.iterrows():
                formation = row['formation_name']
                if formation not in formations:
                    continue
                
                color = colors[formations.index(formation)]
                thickness = abs(row['z_top'] - row['z_bottom'])
                
                if thickness < 0.5:
                    continue
                
                # 创建地层柱
                cylinder = pv.Cylinder(
                    center=[x, y, (row['z_top'] + row['z_bottom'])/2],
                    direction=[0, 0, 1],
                    radius=8,
                    height=thickness,
                    resolution=8
                )
                
                # 断层区域用红色边框
                edge_color = 'red' if row['in_fault_zone'] else 'black'
                line_width = 3 if row['in_fault_zone'] else 1
                
                self.plotter_3d.add_mesh(
                    cylinder, 
                    color=color, 
                    opacity=0.8,
                    show_edges=True,
                    edge_color=edge_color,
                    line_width=line_width
                )
        
        # 添加边界框
        bounds = [x_min, x_max, y_min, y_max, z_min, z_max]
        outline = pv.Box(bounds=bounds)
        self.plotter_3d.add_mesh(outline, style='wireframe', color='black', line_width=2)
        
        # 添加断层面
        fault_plane = pv.Plane(
            center=[600, 400, (z_min + z_max)/2],
            direction=[1, 1, 0],
            i_size=200,
            j_size=z_max - z_min
        )
        self.plotter_3d.add_mesh(fault_plane, color='red', opacity=0.3)
        
        # 添加褶皱区域
        fold_circle = pv.Circle(radius=150, resolution=50)
        fold_circle.translate([300, 700, z_max])
        self.plotter_3d.add_mesh(fold_circle, color='blue', opacity=0.4)
        
        self.plotter_3d.reset_camera()
        print("[OK] 3D数据显示完成")
    
    def display_2d_data(self, df):
        """显示2D剖面数据"""
        print("=== 显示2D剖面数据 ===")
        
        # 清空现有数据
        self.plotter_2d.clear()
        
        # 获取数据范围
        x_min, x_max = df['x'].min(), df['x'].max()
        y_min, y_max = df['y'].min(), df['y'].max()
        z_min, z_max = df['z_bottom'].min(), df['z_top'].max()
        
        # 选择剖切位置（Y轴中间）
        cut_y = (y_min + y_max) / 2
        
        # 选择剖切范围内的钻孔（Y方向±50m范围内）
        cross_section_data = df[abs(df['y'] - cut_y) <= 50]
        print(f"剖切数据: {len(cross_section_data)} 条记录")
        
        if len(cross_section_data) == 0:
            self.plotter_2d.add_text("无剖切数据", position=[0.5, 0.5], font_size=20)
            return
        
        # 地层颜色
        formations = ['填土', '粘土', '粉质粘土', '细砂', '中砂', '粗砂', '砾砂', '卵石层', '强风化岩', '中风化岩', '微风化岩', '基岩']
        colors = ['#8B4513', '#FF0000', '#FF8C00', '#FFD700', '#32CD32', '#00CED1', '#1E90FF', '#9932CC', '#DC143C', '#708090', '#2F4F4F', '#000000']
        
        # 按X坐标排序钻孔
        unique_boreholes = sorted(cross_section_data['borehole_id'].unique())
        
        for borehole_id in unique_boreholes[:15]:  # 显示15个钻孔
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
                
                if thickness < 0.5:
                    continue
                
                # 创建地层块（2D视图，厚度方向是Y）
                layer_block = pv.Cube(
                    center=[x, 0, (z_top + z_bottom)/2],
                    x_length=30,
                    y_length=10,
                    z_length=thickness
                )
                
                # 断层区域用红色边框，褶皱区域用蓝色边框
                if row['in_fault_zone']:
                    edge_color = 'red'
                    line_width = 3
                elif row['in_fold_zone']:
                    edge_color = 'blue'
                    line_width = 2
                else:
                    edge_color = 'black'
                    line_width = 1
                
                self.plotter_2d.add_mesh(
                    layer_block,
                    color=color,
                    opacity=0.9,
                    show_edges=True,
                    edge_color=edge_color,
                    line_width=line_width
                )
        
        # 添加断层线
        fault_x = 600
        if x_min <= fault_x <= x_max:
            fault_line = pv.Line([fault_x, 0, z_max], [fault_x, 0, z_min])
            self.plotter_2d.add_mesh(fault_line, color='red', line_width=8)
            
            # 添加断层标注
            self.plotter_2d.add_text("断层F1", position=[fault_x + 20, 0, z_max - 10], font_size=12, color='red')
        
        # 添加褶皱位置标识
        fold_x = 300
        if x_min <= fold_x <= x_max:
            fold_marker = pv.Sphere(center=[fold_x, 0, z_max - 20], radius=15)
            self.plotter_2d.add_mesh(fold_marker, color='blue', opacity=0.7)
            
            # 添加褶皱标注
            self.plotter_2d.add_text("褶皱A1", position=[fold_x + 20, 0, z_max - 20], font_size=12, color='blue')
        
        # 设置2D视图
        self.plotter_2d.view_xz()
        self.plotter_2d.reset_camera()
        
        print("[OK] 2D剖面数据显示完成")
    
    def refresh_display(self):
        """刷新显示"""
        print("刷新显示...")
        self.load_and_display_data()

def main():
    print("=== 启动实用地质界面 ===")
    
    app = QApplication(sys.argv)
    app.setApplicationName("实用地质界面")
    
    window = WorkingGeologicalInterface()
    window.show()
    
    print("=== 界面已显示，Tab功能可用 ===")
    sys.exit(app.exec())

if __name__ == "__main__":
    main()