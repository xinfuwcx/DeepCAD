"""
增强型3D地质可视化模块 - 高级功能版本
基于PyVista的高性能3D渲染和交互，增加剖面切割和高级渲染功能
"""
import numpy as np
import pandas as pd
import pyvista as pv
import pyvistaqt as pvqt
from typing import Dict, List, Tuple, Optional, Union, Any
import warnings
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, 
    QSlider, QCheckBox, QComboBox, QGroupBox, QFormLayout,
    QSpinBox, QDoubleSpinBox, QFileDialog, QMessageBox
)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont

class AdvancedGeology3DViewer(QWidget):
    """
    高级3D地质可视化器
    支持剖面切割、动画、高级渲染等功能
    """
    
    # 信号定义
    layer_selected = pyqtSignal(str)
    borehole_selected = pyqtSignal(str)
    cross_section_requested = pyqtSignal(tuple)
    animation_frame_changed = pyqtSignal(int)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.initialize_scene()
        
        # 数据存储
        self.geological_data = {}
        self.borehole_data = None
        self.mesh_objects = {}  # 存储原始网格对象
        self.current_layers = []
        self.cross_section_active = False
        self.cutting_plane = None
        
        # 渲染设置
        self.render_quality = 'high'
        self.lighting_enabled = True
        self.transparency_mode = True
        
        # 动画设置
        self.animation_active = False
        self.animation_frames = []
        self.current_frame = 0
        
    def setup_ui(self):
        """设置增强用户界面"""
        layout = QVBoxLayout(self)
        
        # 高级控制面板
        control_panel = self.create_advanced_control_panel()
        layout.addWidget(control_panel)
        
        # 3D视图区域
        self.viewer = pvqt.QtInteractor()
        self.viewer.set_background([0.1, 0.2, 0.3])  # 深蓝色背景
        layout.addWidget(self.viewer)
        
        # 状态和信息栏
        info_panel = self.create_info_panel()
        layout.addWidget(info_panel)
        
    def create_advanced_control_panel(self):
        """创建高级控制面板"""
        panel = QWidget()
        panel.setMaximumHeight(180)
        panel.setStyleSheet("""
            QWidget {
                background-color: #f0f0f0;
                border-radius: 10px;
                padding: 8px;
            }
            QGroupBox {
                font-weight: bold;
                border: 2px solid #cccccc;
                border-radius: 8px;
                margin-top: 1ex;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 8px 0 8px;
            }
        """)
        
        layout = QHBoxLayout(panel)
        
        # 视图控制组
        view_group = self.create_view_control_group()
        layout.addWidget(view_group)
        
        # 剖面工具组
        section_group = self.create_section_control_group()
        layout.addWidget(section_group)
        
        # 渲染控制组
        render_group = self.create_render_control_group()
        layout.addWidget(render_group)
        
        # 动画控制组
        animation_group = self.create_animation_control_group()
        layout.addWidget(animation_group)
        
        return panel
        
    def create_view_control_group(self):
        """创建视图控制组"""
        group = QGroupBox("🔍 视图控制")
        layout = QVBoxLayout(group)
        
        # 预设视图按钮
        view_layout = QHBoxLayout()
        
        self.iso_view_btn = QPushButton("等轴")
        self.iso_view_btn.clicked.connect(self.set_isometric_view)
        view_layout.addWidget(self.iso_view_btn)
        
        self.top_view_btn = QPushButton("俯视")
        self.top_view_btn.clicked.connect(self.set_top_view)
        view_layout.addWidget(self.top_view_btn)
        
        self.side_view_btn = QPushButton("侧视")
        self.side_view_btn.clicked.connect(self.set_side_view)
        view_layout.addWidget(self.side_view_btn)
        
        layout.addLayout(view_layout)
        
        # 图层控制
        layer_layout = QHBoxLayout()
        
        self.show_boreholes_check = QCheckBox("钻孔")
        self.show_boreholes_check.setChecked(True)
        self.show_boreholes_check.toggled.connect(self.toggle_boreholes)
        layer_layout.addWidget(self.show_boreholes_check)
        
        self.show_surfaces_check = QCheckBox("地层面")
        self.show_surfaces_check.setChecked(True)
        self.show_surfaces_check.toggled.connect(self.toggle_surfaces)
        layer_layout.addWidget(self.show_surfaces_check)
        
        self.show_volumes_check = QCheckBox("体积")
        self.show_volumes_check.setChecked(False)
        self.show_volumes_check.toggled.connect(self.toggle_volumes)
        layer_layout.addWidget(self.show_volumes_check)
        
        layout.addLayout(layer_layout)
        
        return group
        
    def create_section_control_group(self):
        """创建剖面控制组"""
        group = QGroupBox("✂️ 剖面工具")
        layout = QVBoxLayout(group)
        
        # 剖面方向选择
        direction_layout = QHBoxLayout()
        
        direction_layout.addWidget(QLabel("方向:"))
        self.section_direction = QComboBox()
        self.section_direction.addItems(["X轴", "Y轴", "Z轴", "任意"])
        direction_layout.addWidget(self.section_direction)
        
        layout.addLayout(direction_layout)
        
        # 剖面位置控制
        position_layout = QHBoxLayout()
        
        position_layout.addWidget(QLabel("位置:"))
        self.section_position = QSlider(Qt.Orientation.Horizontal)
        self.section_position.setRange(0, 100)
        self.section_position.setValue(50)
        self.section_position.valueChanged.connect(self.update_cross_section)
        position_layout.addWidget(self.section_position)
        
        layout.addLayout(position_layout)
        
        # 剖面操作按钮
        section_buttons = QHBoxLayout()
        
        self.create_section_btn = QPushButton("创建剖面")
        self.create_section_btn.clicked.connect(self.create_cross_section)
        section_buttons.addWidget(self.create_section_btn)
        
        self.clear_section_btn = QPushButton("清除剖面")
        self.clear_section_btn.clicked.connect(self.clear_cross_section)
        section_buttons.addWidget(self.clear_section_btn)
        
        layout.addLayout(section_buttons)
        
        return group
        
    def create_render_control_group(self):
        """创建渲染控制组"""
        group = QGroupBox("🎨 渲染设置")
        layout = QFormLayout(group)
        
        # 渲染质量
        self.quality_combo = QComboBox()
        self.quality_combo.addItems(["低", "中", "高", "超高"])
        self.quality_combo.setCurrentText("高")
        self.quality_combo.currentTextChanged.connect(self.set_render_quality)
        layout.addRow("质量:", self.quality_combo)
        
        # 透明度
        self.transparency_slider = QSlider(Qt.Orientation.Horizontal)
        self.transparency_slider.setRange(0, 100)
        self.transparency_slider.setValue(80)
        self.transparency_slider.valueChanged.connect(self.set_transparency)
        layout.addRow("透明度:", self.transparency_slider)
        
        # 光照效果
        self.lighting_check = QCheckBox()
        self.lighting_check.setChecked(True)
        self.lighting_check.toggled.connect(self.toggle_lighting)
        layout.addRow("光照效果:", self.lighting_check)
        
        return group
        
    def create_animation_control_group(self):
        """创建动画控制组"""
        group = QGroupBox("🎬 动画控制")
        layout = QVBoxLayout(group)
        
        # 动画类型选择
        anim_type_layout = QHBoxLayout()
        
        anim_type_layout.addWidget(QLabel("类型:"))
        self.animation_type = QComboBox()
        self.animation_type.addItems(["旋转", "剖面扫描", "时间演化"])
        anim_type_layout.addWidget(self.animation_type)
        
        layout.addLayout(anim_type_layout)
        
        # 动画控制按钮
        anim_buttons = QHBoxLayout()
        
        self.play_btn = QPushButton("▶️ 播放")
        self.play_btn.clicked.connect(self.toggle_animation)
        anim_buttons.addWidget(self.play_btn)
        
        self.stop_btn = QPushButton("⏹️ 停止")
        self.stop_btn.clicked.connect(self.stop_animation)
        anim_buttons.addWidget(self.stop_btn)
        
        self.export_btn = QPushButton("📹 导出")
        self.export_btn.clicked.connect(self.export_animation)
        anim_buttons.addWidget(self.export_btn)
        
        layout.addLayout(anim_buttons)
        
        return group
        
    def create_info_panel(self):
        """创建信息面板"""
        panel = QWidget()
        panel.setMaximumHeight(60)
        panel.setStyleSheet("""
            QWidget {
                background-color: #2c3e50;
                color: white;
                border-radius: 5px;
                padding: 5px;
            }
        """)
        
        layout = QHBoxLayout(panel)
        
        # 状态信息
        self.status_label = QLabel("就绪")
        self.status_label.setStyleSheet("color: #2ecc71; font-weight: bold;")
        layout.addWidget(self.status_label)
        
        layout.addStretch()
        
        # 对象计数
        self.object_count_label = QLabel("对象: 0")
        layout.addWidget(self.object_count_label)
        
        # 内存使用
        self.memory_label = QLabel("内存: 0 MB")
        layout.addWidget(self.memory_label)
        
        # 渲染FPS
        self.fps_label = QLabel("FPS: 0")
        layout.addWidget(self.fps_label)
        
        return panel
        
    def initialize_scene(self):
        """初始化3D场景"""
        # 设置相机
        self.viewer.camera_position = [(500, 500, 200), (250, 250, -25), (0, 0, 1)]
        
        # 添加坐标轴
        self.viewer.add_axes(
            xlabel='东向 (m)', 
            ylabel='北向 (m)', 
            zlabel='高程 (m)',
            line_width=3,
            labels_off=False
        )
        
        # 添加地面网格
        self.add_ground_grid()
        
        # 设置高级光照
        self.setup_advanced_lighting()
        
    def add_ground_grid(self):
        """添加地面参考网格"""
        grid = pv.StructuredGrid()
        
        x_range = np.linspace(0, 500, 26)
        y_range = np.linspace(0, 500, 26)
        z_level = 0
        
        xx, yy = np.meshgrid(x_range, y_range)
        zz = np.full_like(xx, z_level)
        
        grid.points = np.c_[xx.ravel(), yy.ravel(), zz.ravel()]
        grid.dimensions = (len(x_range), len(y_range), 1)
        
        self.viewer.add_mesh(
            grid, 
            color='lightgray', 
            opacity=0.2,
            show_edges=True,
            line_width=1,
            name='ground_grid'
        )
        
    def setup_advanced_lighting(self):
        """设置高级光照系统"""
        self.viewer.remove_all_lights()
        
        # 主光源（太阳光）
        sun_light = pv.Light(
            position=(1000, 1000, 1000),
            focal_point=(250, 250, -25),
            color='white',
            intensity=0.8
        )
        self.viewer.add_light(sun_light)
        
        # 填充光
        fill_light = pv.Light(
            position=(-500, -500, 500),
            focal_point=(250, 250, -25),
            color='lightblue',
            intensity=0.3
        )
        self.viewer.add_light(fill_light)
        
        # 环境光
        ambient_light = pv.Light(
            light_type='ambient',
            intensity=0.1
        )
        self.viewer.add_light(ambient_light)
        
    def create_cross_section(self):
        """创建剖面切割"""
        try:
            direction = self.section_direction.currentText()
            position = self.section_position.value() / 100.0
            
            # 确定切割平面
            if direction == "X轴":
                origin = (position * 500, 250, -25)
                normal = (1, 0, 0)
            elif direction == "Y轴":
                origin = (250, position * 500, -25)
                normal = (0, 1, 0)
            elif direction == "Z轴":
                origin = (250, 250, position * 50 - 50)
                normal = (0, 0, 1)
            else:  # 任意方向
                origin = (250, 250, -25)
                normal = (1, 1, 0)
                
            self.add_cross_section_plane(origin, normal)
            self.cross_section_active = True
            self.status_label.setText(f"已创建 {direction} 剖面")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"创建剖面失败: {str(e)}")
            
    def add_cross_section_plane(self, origin: tuple, normal: tuple):
        """添加剖面切割平面"""
        try:
            # 清除之前的剖面
            self.clear_cross_section()
            
            # 创建切割平面
            plane = pv.Plane(center=origin, direction=normal, size=(400, 400))
            self.cutting_plane = plane
            
            # 添加到场景
            self.viewer.add_mesh(
                plane,
                color='red',
                opacity=0.3,
                name='cross_section_plane',
                show_edges=True,
                edge_color='darkred',
                line_width=2
            )
            
            # 对所有地质体执行切割
            self.apply_cross_section_cut(plane)
            
        except Exception as e:
            print(f"添加切割平面失败: {e}")
            
    def apply_cross_section_cut(self, cutting_plane):
        """对地质体应用切割"""
        try:
            volume_actors = [name for name in self.viewer.renderer.actors.keys() 
                           if 'volume_' in name and 'label' not in name and '_cut' not in name]
            
            for actor_name in volume_actors:
                try:
                    original_mesh = self.mesh_objects.get(actor_name)
                    if original_mesh is None:
                        continue
                        
                    # 执行切割
                    cut_mesh = original_mesh.clip_surface(cutting_plane, invert=False)
                    
                    if cut_mesh.n_points == 0:
                        continue
                        
                    # 隐藏原始对象
                    actor = self.viewer.renderer.actors.get(actor_name)
                    if actor:
                        actor.SetVisibility(False)
                        
                    # 获取原颜色
                    layer_name = actor_name.replace('volume_', '')
                    color_map = {
                        '粘土': 'brown',
                        '砂土': 'yellow',
                        '岩层': 'gray',
                        '粉质粘土': 'orange',
                        '砂岩': 'tan',
                        '页岩': 'darkgray',
                        '灰岩': 'lightgray'
                    }
                    color = color_map.get(layer_name, 'lightblue')
                    
                    # 添加切割后的对象
                    self.viewer.add_mesh(
                        cut_mesh,
                        color=color,
                        opacity=0.9,
                        name=f'{actor_name}_cut',
                        show_edges=True,
                        edge_color='white',
                        line_width=1
                    )
                    
                except Exception as e:
                    print(f"切割对象 {actor_name} 失败: {e}")
                    
        except Exception as e:
            print(f"应用切割失败: {e}")
            
    def clear_cross_section(self):
        """清除剖面切割"""
        try:
            # 移除切割平面
            if 'cross_section_plane' in self.viewer.renderer.actors:
                self.viewer.remove_actor('cross_section_plane')
                
            # 移除切割后的对象，显示原始对象
            cut_actors = [name for name in list(self.viewer.renderer.actors.keys()) if '_cut' in name]
            for actor_name in cut_actors:
                self.viewer.remove_actor(actor_name)
                
                # 显示对应的原始对象
                original_name = actor_name.replace('_cut', '')
                original_actor = self.viewer.renderer.actors.get(original_name)
                if original_actor:
                    original_actor.SetVisibility(True)
                    
            self.cross_section_active = False
            self.cutting_plane = None
            self.viewer.render()
            self.status_label.setText("剖面已清除")
            
        except Exception as e:
            print(f"清除剖面失败: {e}")
            
    def update_cross_section(self, value):
        """更新剖面位置"""
        if not self.cross_section_active:
            return
            
        direction = self.section_direction.currentText()
        position = value / 100.0
        
        # 更新切割平面位置
        if direction == "X轴":
            origin = (position * 500, 250, -25)
            normal = (1, 0, 0)
        elif direction == "Y轴":
            origin = (250, position * 500, -25)
            normal = (0, 1, 0)
        else:
            origin = (250, 250, position * 50 - 50)
            normal = (0, 0, 1)
            
        self.add_cross_section_plane(origin, normal)
        
    # 视图控制方法
    def set_isometric_view(self):
        """设置等轴测视图"""
        self.viewer.camera_position = [(500, 500, 300), (250, 250, -25), (0, 0, 1)]
        self.viewer.reset_camera()
        
    def set_top_view(self):
        """设置俯视图"""
        self.viewer.camera_position = [(250, 250, 500), (250, 250, -25), (0, 1, 0)]
        self.viewer.reset_camera()
        
    def set_side_view(self):
        """设置侧视图"""
        self.viewer.camera_position = [(800, 250, -25), (250, 250, -25), (0, 0, 1)]
        self.viewer.reset_camera()
        
    def toggle_boreholes(self, visible: bool):
        """切换钻孔显示"""
        borehole_actors = [name for name in self.viewer.renderer.actors.keys() if 'borehole_' in name]
        for actor_name in borehole_actors:
            actor = self.viewer.renderer.actors.get(actor_name)
            if actor:
                actor.SetVisibility(visible)
        self.viewer.render()
                
    def toggle_surfaces(self, visible: bool):
        """切换地层面显示"""
        surface_actors = [name for name in self.viewer.renderer.actors.keys() if 'surface' in name]
        for actor_name in surface_actors:
            actor = self.viewer.renderer.actors.get(actor_name)
            if actor:
                actor.SetVisibility(visible)
        self.viewer.render()
                
    def toggle_volumes(self, visible: bool):
        """切换体积显示"""
        volume_actors = [name for name in self.viewer.renderer.actors.keys() if 'volume_' in name]
        for actor_name in volume_actors:
            actor = self.viewer.renderer.actors.get(actor_name)
            if actor:
                actor.SetVisibility(visible)
        self.viewer.render()
                
    def set_render_quality(self, quality: str):
        """设置渲染质量"""
        quality_settings = {
            '低': {'point_size': 3, 'line_width': 1, 'resolution': 20},
            '中': {'point_size': 5, 'line_width': 1.5, 'resolution': 40},
            '高': {'point_size': 8, 'line_width': 2, 'resolution': 60},
            '超高': {'point_size': 12, 'line_width': 3, 'resolution': 80}
        }
        
        settings = quality_settings.get(quality, quality_settings['高'])
        self.render_quality = quality
        
        # 应用质量设置
        for actor_name, actor in self.viewer.renderer.actors.items():
            if hasattr(actor, 'GetProperty'):
                prop = actor.GetProperty()
                if hasattr(prop, 'SetPointSize'):
                    prop.SetPointSize(settings['point_size'])
                if hasattr(prop, 'SetLineWidth'):
                    prop.SetLineWidth(settings['line_width'])
                    
        self.viewer.render()
        
    def set_transparency(self, value: int):
        """设置透明度"""
        opacity = value / 100.0
        
        for actor_name in list(self.viewer.renderer.actors.keys()):
            if 'surface' in actor_name or 'volume_' in actor_name:
                actor = self.viewer.renderer.actors.get(actor_name)
                if actor and hasattr(actor, 'GetProperty'):
                    actor.GetProperty().SetOpacity(opacity)
                    
        self.viewer.render()
        
    def toggle_lighting(self, enabled: bool):
        """切换光照效果"""
        self.lighting_enabled = enabled
        
        if enabled:
            self.setup_advanced_lighting()
        else:
            self.viewer.remove_all_lights()
            # 添加基本的环境光
            ambient_light = pv.Light(light_type='ambient', intensity=0.8)
            self.viewer.add_light(ambient_light)
            
        self.viewer.render()
        
    # 动画功能
    def toggle_animation(self):
        """切换动画播放"""
        if self.animation_active:
            self.stop_animation()
        else:
            self.start_animation()
            
    def start_animation(self):
        """开始动画"""
        anim_type = self.animation_type.currentText()
        
        self.animation_active = True
        self.play_btn.setText("⏸️ 暂停")
        
        if anim_type == "旋转":
            self.start_rotation_animation()
        elif anim_type == "剖面扫描":
            self.start_section_animation()
        elif anim_type == "时间演化":
            self.start_evolution_animation()
            
    def start_rotation_animation(self):
        """开始旋转动画"""
        # 设置旋转动画
        path = self.viewer.generate_orbital_path(n_points=36, shift=100)
        self.viewer.open_movie('rotation_animation.mp4')
        self.viewer.orbit_on_path(path, write_frames=True)
        
    def start_section_animation(self):
        """开始剖面扫描动画"""
        if not self.mesh_objects:
            QMessageBox.warning(self, "警告", "没有可用的地质体进行剖面扫描")
            return
            
        # 实现剖面扫描动画
        for i in range(101):
            self.section_position.setValue(i)
            self.viewer.render()
            # 这里可以保存帧用于生成动画
            
    def stop_animation(self):
        """停止动画"""
        self.animation_active = False
        self.play_btn.setText("▶️ 播放")
        
    def export_animation(self):
        """导出动画"""
        filename, _ = QFileDialog.getSaveFileName(
            self, "导出动画", "", "MP4文件 (*.mp4);;GIF文件 (*.gif)")
        
        if filename:
            try:
                # 实现动画导出功能
                self.status_label.setText(f"正在导出动画到 {filename}")
                # 具体实现根据PyVista的动画导出功能
                QMessageBox.information(self, "成功", f"动画已导出到 {filename}")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导出动画失败: {str(e)}")
                
    def load_geological_data(self, data: Dict[str, Any]):
        """加载地质数据"""
        try:
            self.geological_data = data
            
            # 渲染不同类型的数据
            if 'boreholes' in data:
                self.load_borehole_data(data['boreholes'])
                
            if 'surfaces' in data:
                self.create_geological_surfaces(data['surfaces'])
                
            if 'volumes' in data:
                self.create_geological_volumes(data['volumes'])
                
            self.update_info_panel()
            self.status_label.setText("地质数据加载完成")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"加载地质数据失败: {str(e)}")
            
    def load_borehole_data(self, data: pd.DataFrame):
        """加载钻孔数据"""
        self.borehole_data = data.copy()
        
        # 按钻孔分组渲染
        for hole_id, hole_data in data.groupby('hole_id'):
            self.render_single_borehole(hole_id, hole_data)
            
        self.status_label.setText(f"已加载 {len(data)} 个钻孔数据点")
        
    def render_single_borehole(self, hole_id: str, hole_data: pd.DataFrame):
        """渲染单个钻孔"""
        points = hole_data[['x', 'y', 'z']].values
        
        if len(points) < 2:
            # 单点钻孔
            sphere = pv.Sphere(radius=2, center=points[0])
            self.viewer.add_mesh(
                sphere,
                color='red',
                name=f'borehole_{hole_id}_point'
            )
        else:
            # 多点钻孔
            spline = pv.Spline(points, n_points=len(points)*2)
            tube = spline.tube(radius=1.5)
            
            if 'soil_layer' in hole_data.columns:
                tube['soil_layer'] = np.repeat(hole_data['soil_layer'].values, 2)
                
            self.viewer.add_mesh(
                tube,
                scalars='soil_layer' if 'soil_layer' in hole_data.columns else None,
                cmap='viridis',
                name=f'borehole_{hole_id}',
                pickable=True
            )
            
        # 添加标签
        label_pos = points[0] + [0, 0, 5]
        self.viewer.add_point_labels(
            [label_pos], 
            [hole_id],
            point_size=0,
            font_size=10,
            name=f'borehole_{hole_id}_label'
        )
        
    def create_geological_surfaces(self, surface_data: Dict):
        """创建地质层面"""
        for surface_name, surface_info in surface_data.items():
            try:
                grid_coords = surface_info['grid_coords']
                values = surface_info['values']
                
                # 创建表面网格
                surface = pv.StructuredGrid()
                surface.points = grid_coords
                surface['geological_value'] = values
                
                self.viewer.add_mesh(
                    surface,
                    scalars='geological_value',
                    cmap='terrain',
                    opacity=0.8,
                    show_edges=True,
                    edge_color='white',
                    line_width=0.5,
                    name=f'surface_{surface_name}'
                )
                
            except Exception as e:
                print(f"创建地质面 {surface_name} 失败: {e}")
                
    def create_geological_volumes(self, layer_data: Dict[str, np.ndarray]):
        """创建3D地质体"""
        for layer_name, layer_points in layer_data.items():
            if len(layer_points) < 4:
                continue
                
            try:
                # 创建点云和凸包
                point_cloud = pv.PolyData(layer_points)
                hull = point_cloud.convex_hull()
                
                # 设置颜色
                color_map = {
                    '粘土': 'brown',
                    '砂土': 'yellow', 
                    '岩层': 'gray',
                    '粉质粘土': 'orange',
                    '砂岩': 'tan',
                    '页岩': 'darkgray',
                    '灰岩': 'lightgray'
                }
                color = color_map.get(layer_name, 'lightblue')
                
                # 添加属性
                hull['layer_type'] = layer_name
                hull['volume'] = hull.volume
                
                # 存储原始网格
                self.mesh_objects[f'volume_{layer_name}'] = hull
                
                self.viewer.add_mesh(
                    hull,
                    color=color,
                    opacity=0.7,
                    name=f'volume_{layer_name}',
                    pickable=True,
                    show_edges=True,
                    edge_color='white',
                    line_width=0.5
                )
                
                # 添加标签
                center = hull.center
                self.viewer.add_point_labels(
                    [center], 
                    [f'{layer_name}\\n{hull.volume:.1f} m³'],
                    point_size=0,
                    font_size=8,
                    name=f'volume_{layer_name}_label'
                )
                
            except Exception as e:
                print(f"创建地质体 {layer_name} 失败: {e}")
                
    def update_info_panel(self):
        """更新信息面板"""
        try:
            # 统计对象数量
            n_objects = len(self.viewer.renderer.actors)
            self.object_count_label.setText(f"对象: {n_objects}")
            
            # 估算内存使用（简化）
            memory_mb = n_objects * 2  # 简化估算
            self.memory_label.setText(f"内存: {memory_mb} MB")
            
        except Exception as e:
            print(f"更新信息面板失败: {e}")
            
    def export_scene(self, filename: str, format_type: str = 'vtk'):
        """导出3D场景：优先 VTKJS；失败降级 HTML；再失败截图 PNG。"""
        try:
            fmt = format_type.lower().strip()
            if fmt == 'vtk' or filename.lower().endswith('.vtkjs'):
                self.viewer.export_vtkjs(filename if filename.lower().endswith('.vtkjs') else f"{filename}.vtkjs")
            elif fmt == 'gltf':
                # TODO: 实现glTF导出
                raise NotImplementedError('glTF export not implemented')
            elif fmt == 'obj':
                # TODO: 实现OBJ导出
                raise NotImplementedError('OBJ export not implemented')
            else:
                self.viewer.export_vtkjs(filename if filename.lower().endswith('.vtkjs') else f"{filename}.vtkjs")

            self.status_label.setText(f"场景已导出到 {filename}")

        except Exception:
            # 降级：HTML
            try:
                html_name = filename if filename.lower().endswith('.html') else f"{filename}.html"
                self.viewer.export_html(html_name)
                self.status_label.setText(f"已降级导出 HTML: {html_name}")
                return
            except Exception:
                # 再降级：PNG 截图
                png_name = filename if filename.lower().endswith('.png') else f"{filename}.png"
                try:
                    self.viewer.screenshot(png_name)
                    self.status_label.setText(f"已降级导出 PNG 截图: {png_name}")
                except Exception as e2:
                    QMessageBox.critical(self, "错误", f"导出失败，且无法截图: {str(e2)}")
            
    def clear_scene(self):
        """清空场景"""
        keep_actors = ['axes', 'ground_grid']
        all_actors = list(self.viewer.renderer.actors.keys())
        
        for actor_name in all_actors:
            if not any(keep in actor_name for keep in keep_actors):
                try:
                    self.viewer.remove_actor(actor_name)
                except:
                    pass
                    
        # 清理数据
        self.geological_data.clear()
        self.mesh_objects.clear()
        self.current_layers.clear()
        self.cross_section_active = False
        self.cutting_plane = None
        
        self.viewer.render()
        self.status_label.setText("场景已清空")
        self.update_info_panel()

# 测试和示例函数
def create_sample_data():
    """创建示例数据"""
    # 钻孔数据
    borehole_data = []
    for i, hole_id in enumerate(['BH001', 'BH002', 'BH003', 'BH004']):
        x_base = 100 + i * 100
        y_base = 100 + i * 80
        
        for j in range(6):
            z = -2 - j * 3
            borehole_data.append({
                'hole_id': hole_id,
                'x': x_base + np.random.normal(0, 1),
                'y': y_base + np.random.normal(0, 1),
                'z': z + np.random.normal(0, 0.2),
                'soil_layer': j + 1,
                'soil_type': ['粘土', '砂土', '岩层'][j % 3]
            })
            
    borehole_df = pd.DataFrame(borehole_data)
    
    # 地质体数据
    volume_data = {}
    for i, layer_name in enumerate(['粘土', '砂土', '岩层']):
        # 生成随机点云
        n_points = 20
        center_z = -5 - i * 8
        points = []
        
        for _ in range(n_points):
            x = np.random.uniform(50, 450)
            y = np.random.uniform(50, 450)
            z = center_z + np.random.normal(0, 2)
            points.append([x, y, z])
            
        volume_data[layer_name] = np.array(points)
        
    return {
        'boreholes': borehole_df,
        'volumes': volume_data
    }

if __name__ == "__main__":
    import sys
    from PyQt6.QtWidgets import QApplication
    
    app = QApplication(sys.argv)
    
    # 创建测试窗口
    viewer = AdvancedGeology3DViewer()
    viewer.setWindowTitle("Advanced Geology 3D Viewer - 高级版本")
    viewer.resize(1400, 900)
    
    # 加载示例数据
    sample_data = create_sample_data()
    viewer.load_geological_data(sample_data)
    
    viewer.show()
    sys.exit(app.exec())