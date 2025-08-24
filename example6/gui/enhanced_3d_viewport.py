#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增强的3D视口组件 - Enhanced 3D Viewport
基于PyVista的高性能3D可视化渲染引擎

Features:
- 流场可视化 (流线、矢量场、涡度)
- 动态粒子系统
- 高质量渲染 (PBR材质、阴影、透明度)
- 交互式分析工具
- 动画时间轴控制
"""

import sys
import numpy as np
import time
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path

try:
    from PyQt6.QtWidgets import (
        QWidget, QVBoxLayout, QHBoxLayout, QFrame, QLabel, QSlider,
        QComboBox, QPushButton, QSpinBox, QDoubleSpinBox, QCheckBox,
        QGroupBox, QGridLayout, QSplitter, QProgressBar, QToolButton,
        QButtonGroup, QRadioButton, QTabWidget
    )
    from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QThread, QObject
    from PyQt6.QtGui import QIcon, QColor, QPalette
except ImportError:
    from PyQt5.QtWidgets import (
        QWidget, QVBoxLayout, QHBoxLayout, QFrame, QLabel, QSlider,
        QComboBox, QPushButton, QSpinBox, QDoubleSpinBox, QCheckBox,
        QGroupBox, QGridLayout, QSplitter, QProgressBar, QToolButton,
        QButtonGroup, QRadioButton, QTabWidget
    )
    from PyQt5.QtCore import Qt, QTimer, pyqtSignal, QThread, QObject
    from PyQt5.QtGui import QIcon, QColor, QPalette

# PyVista和VTK导入
try:
    import pyvista as pv
    from pyvistaqt import QtInteractor, MainWindow
    import vtk
    from vtk.util import numpy_support
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    print("PyVista not available - 3D visualization disabled")

# 可选依赖
try:
    import qtawesome as qta
    QTA_AVAILABLE = True
except ImportError:
    QTA_AVAILABLE = False

# Abaqus风格的3D视口配置 - 与界面协调
ABAQUS_3D_CONFIG = {
    'background': {
        'gradient_top': [0.24, 0.24, 0.24],      # 与界面#3c3c3c协调的深灰
        'gradient_bottom': [0.16, 0.16, 0.16],   # 更深的灰色#2a2a2a
        'enable_gradient': True
    },
    'lighting': {
        'ambient_light': 0.3,
        'diffuse_light': 0.7,
        'specular_light': 0.2,
        'metallic': 0.1,
        'roughness': 0.3,
        'enable_shadows': True,
        'enable_ssao': True  # Screen Space Ambient Occlusion
    },
    'camera': {
        'initial_zoom': 1.2,
        'parallel_projection': False,
        'enable_anti_aliasing': True
    },
    'viewport': {
        'min_width': 1200,
        'min_height': 800,
        'preferred_ratio': 3.0  # 3D视口占总界面的比例
    }
}


class FlowFieldGenerator:
    """流场数据生成器"""
    
    def __init__(self):
        self.name = "Flow Field Generator"
        
    def generate_cylinder_flow(self, pier_diameter: float = 2.0, 
                             flow_velocity: float = 0.8,
                             domain_size: Tuple[float, float, float] = (20, 15, 6)) -> pv.StructuredGrid:
        """生成圆柱绕流流场数据"""
        # 创建结构化网格
        nx, ny, nz = 50, 40, 20
        x = np.linspace(-domain_size[0]/2, domain_size[0]/2, nx)
        y = np.linspace(-domain_size[1]/2, domain_size[1]/2, ny) 
        z = np.linspace(-2, domain_size[2]-2, nz)
        
        X, Y, Z = np.meshgrid(x, y, z, indexing='ij')
        
        # 创建网格
        grid = pv.StructuredGrid(X, Y, Z)
        
        # 生成速度场 (简化的圆柱绕流)
        u = np.zeros_like(X)
        v = np.zeros_like(Y)
        w = np.zeros_like(Z)
        
        radius = pier_diameter / 2
        
        for i in range(nx):
            for j in range(ny):
                for k in range(nz):
                    r = np.sqrt(X[i,j,k]**2 + Y[i,j,k]**2)
                    
                    if r > radius:  # 桥墩外部
                        # 简化的势流解
                        theta = np.arctan2(Y[i,j,k], X[i,j,k])
                        
                        # 无粘性流动近似
                        u_pot = flow_velocity * (1 - (radius/r)**2 * np.cos(2*theta))
                        v_pot = -flow_velocity * (radius/r)**2 * np.sin(2*theta)
                        
                        # 添加湍流扰动
                        turbulence_factor = 0.1 * np.exp(-r/5)
                        u_turb = turbulence_factor * np.sin(2*np.pi*X[i,j,k]/3)
                        v_turb = turbulence_factor * np.cos(2*np.pi*Y[i,j,k]/3)
                        
                        u[i,j,k] = u_pot + u_turb
                        v[i,j,k] = v_pot + v_turb
                        w[i,j,k] = 0.02 * np.sin(2*np.pi*Z[i,j,k]/2)
                    else:  # 桥墩内部
                        u[i,j,k] = 0
                        v[i,j,k] = 0  
                        w[i,j,k] = 0
        
        # 添加速度场到网格
        velocity = np.stack([u.ravel(), v.ravel(), w.ravel()], axis=1)
        grid['velocity'] = velocity
        
        # 计算速度大小
        velocity_magnitude = np.sqrt(u**2 + v**2 + w**2)
        grid['velocity_magnitude'] = velocity_magnitude.ravel()
        
        # 计算涡度
        vorticity = self._compute_vorticity(u, v, w, x, y, z)
        grid['vorticity_magnitude'] = np.sqrt(
            vorticity[0]**2 + vorticity[1]**2 + vorticity[2]**2
        ).ravel()
        
        # 计算压力 (简化)
        pressure = -0.5 * 1000 * velocity_magnitude**2  # 动压
        grid['pressure'] = pressure.ravel()
        
        return grid
    
    def _compute_vorticity(self, u, v, w, x, y, z):
        """计算涡度"""
        dx = x[1] - x[0]
        dy = y[1] - y[0] 
        dz = z[1] - z[0]
        
        # 计算偏导数
        dw_dy, dv_dz = np.gradient(w, dy, axis=1), np.gradient(v, dz, axis=2)
        du_dz, dw_dx = np.gradient(u, dz, axis=2), np.gradient(w, dx, axis=0)
        dv_dx, du_dy = np.gradient(v, dx, axis=0), np.gradient(u, dy, axis=1)
        
        # 涡度分量
        omega_x = dw_dy - dv_dz
        omega_y = du_dz - dw_dx  
        omega_z = dv_dx - du_dy
        
        return [omega_x, omega_y, omega_z]
    
    def generate_scour_evolution(self, time_steps: int = 100) -> List[pv.PolyData]:
        """生成冲刷演化时间序列"""
        scour_meshes = []
        
        for t in range(time_steps):
            # 时间归一化
            t_norm = t / (time_steps - 1)
            
            # 冲刷深度随时间变化 (指数增长模型)
            max_scour_depth = 1.5
            current_depth = max_scour_depth * (1 - np.exp(-3 * t_norm))
            
            # 创建冲刷坑几何
            scour_hole = self._create_scour_geometry(current_depth, t_norm)
            scour_meshes.append(scour_hole)
            
        return scour_meshes
    
    def _create_scour_geometry(self, depth: float, time_factor: float) -> pv.PolyData:
        """创建冲刷坑几何"""
        # 椭圆形冲刷坑
        theta = np.linspace(0, 2*np.pi, 50)
        r_major = 3.0 * (1 + 0.2 * time_factor)  # 长轴随时间增长
        r_minor = 2.0 * (1 + 0.15 * time_factor)  # 短轴随时间增长
        
        x = r_major * np.cos(theta)
        y = r_minor * np.sin(theta) 
        z = -depth * (1 - (x**2/r_major**2 + y**2/r_minor**2)**0.5)
        
        # 创建表面
        points = np.column_stack([x, y, z])
        scour_hole = pv.PolyData(points)
        
        # 添加深度数据
        scour_hole['depth'] = -z
        
        return scour_hole


class ParticleSystem:
    """粒子系统 - 模拟泥沙运动"""
    
    def __init__(self, num_particles: int = 1000):
        self.num_particles = num_particles
        self.particles = None
        self.velocities = None
        self.ages = None
        self.max_age = 100
        
    def initialize_particles(self, domain_bounds: Tuple[float, float, float, float, float, float]):
        """初始化粒子"""
        xmin, xmax, ymin, ymax, zmin, zmax = domain_bounds
        
        # 随机分布粒子位置
        self.particles = np.random.uniform(
            [xmin, ymin, zmin], 
            [xmax, ymax, zmax], 
            (self.num_particles, 3)
        )
        
        # 初始化速度和年龄
        self.velocities = np.zeros((self.num_particles, 3))
        self.ages = np.random.randint(0, self.max_age, self.num_particles)
    
    def update_particles(self, velocity_field: pv.StructuredGrid, dt: float = 0.1):
        """更新粒子位置"""
        if self.particles is None:
            return
            
        # 插值速度场到粒子位置
        particle_velocities = velocity_field.sample(pv.PolyData(self.particles))['velocity']
        
        # 更新粒子位置 (欧拉积分)
        self.particles += particle_velocities * dt
        
        # 更新年龄
        self.ages += 1
        
        # 重置老化粒子
        old_particles = self.ages > self.max_age
        if np.any(old_particles):
            # 在上游重新生成粒子
            self.particles[old_particles] = self._generate_upstream_particles(np.sum(old_particles))
            self.ages[old_particles] = 0
    
    def _generate_upstream_particles(self, count: int) -> np.ndarray:
        """在上游生成新粒子"""
        # 上游位置
        x = np.full(count, -8.0)  # 上游x位置
        y = np.random.uniform(-5, 5, count)  # 随机y位置
        z = np.random.uniform(0, 4, count)   # 随机z位置
        
        return np.column_stack([x, y, z])
    
    def get_particle_mesh(self) -> pv.PolyData:
        """获取粒子网格"""
        if self.particles is None:
            return pv.PolyData()
            
        particle_mesh = pv.PolyData(self.particles)
        particle_mesh['age'] = self.ages
        return particle_mesh


class Enhanced3DViewport(QFrame):
    """增强的3D视口"""
    
    # 信号定义
    viewport_clicked = pyqtSignal(tuple)  # 点击位置
    viewport_selection_changed = pyqtSignal(dict)  # 选择变化
    animation_frame_changed = pyqtSignal(int)  # 动画帧变化
    
    def __init__(self, parent=None):
        super().__init__(parent)
        
        # 数据管理
        self.flow_generator = FlowFieldGenerator()
        self.particle_system = ParticleSystem(800)
        self.current_flow_field = None
        self.scour_evolution = []
        self.current_frame = 0
        
        # 渲染状态
        self.render_modes = {
            'surface': True,
            'wireframe': False, 
            'streamlines': True,
            'particles': True,
            'vectors': False,
            'isosurfaces': False
        }
        
        # 动画控制
        self.animation_timer = QTimer()
        self.animation_timer.timeout.connect(self.advance_animation)
        self.animation_speed = 100  # ms
        
        self.setup_ui()
        self.setup_3d_viewer()
        
    def setup_ui(self):
        """设置用户界面"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        # 创建分割器
        try:
            splitter = QSplitter(Qt.Orientation.Horizontal)
        except AttributeError:
            splitter = QSplitter(Qt.Horizontal)
        
        # 3D视图区域 - 使用Abaqus级别的大尺寸
        self.viewer_frame = QFrame()
        min_width = ABAQUS_3D_CONFIG['viewport']['min_width']
        min_height = ABAQUS_3D_CONFIG['viewport']['min_height']
        self.viewer_frame.setMinimumSize(min_width, min_height)
        self.setup_3d_viewer()
        splitter.addWidget(self.viewer_frame)
        
        # 控制面板 - 紧凑化设计
        self.control_panel = self.create_control_panel()
        self.control_panel.setMaximumWidth(280)
        splitter.addWidget(self.control_panel)
        
        # 设置分割比例 - 3D视口占主要空间
        preferred_3d_width = int(min_width * ABAQUS_3D_CONFIG['viewport']['preferred_ratio'] / 4)
        splitter.setSizes([preferred_3d_width, 280])
        layout.addWidget(splitter)
        
        # 底部时间轴控制
        self.timeline_panel = self.create_timeline_panel()
        layout.addWidget(self.timeline_panel)
        
    def setup_3d_viewer(self):
        """设置3D查看器"""
        viewer_layout = QVBoxLayout(self.viewer_frame)
        viewer_layout.setContentsMargins(0, 0, 0, 0)
        
        if PYVISTA_AVAILABLE:
            try:
                # 创建PyVista交互器
                self.plotter = QtInteractor(self.viewer_frame)
                viewer_layout.addWidget(self.plotter.interactor)
                
                # 设置高质量渲染
                self.setup_rendering_quality()
                
                # 创建初始场景
                self.create_initial_scene()
                
            except Exception as e:
                print(f"PyVista初始化失败: {e}")
                self.create_fallback_viewer(viewer_layout)
        else:
            self.create_fallback_viewer(viewer_layout)
    
    def setup_rendering_quality(self):
        """设置Abaqus级别的高质量渲染"""
        if not hasattr(self, 'plotter'):
            return
        
        config = ABAQUS_3D_CONFIG
        
        try:
            # 抗锯齿 - 最高质量
            if config['camera']['enable_anti_aliasing']:
                self.plotter.enable_anti_aliasing('ssaa')  # Super Sample Anti-Aliasing
            
            # Abaqus风格渐变背景 - 修复PyVista语法
            if config['background']['enable_gradient']:
                top_color = config['background']['gradient_top']
                bottom_color = config['background']['gradient_bottom']
                # PyVista正确的渐变背景语法
                try:
                    # 新版PyVista语法
                    self.plotter.set_background(color=top_color, color2=bottom_color)
                except TypeError:
                    # 旧版PyVista语法兼容
                    try:
                        self.plotter.set_background(top_color, bottom_color)
                    except:
                        # 降级为单色背景
                        self.plotter.set_background([0.15, 0.17, 0.25])  # Abaqus深蓝灰
            
            # 专业级光照设置
            light_config = config['lighting']
            
            # 移除默认光源
            self.plotter.remove_all_lights()
            
            # 专业光照系统 - 兼容不同PyVista版本
            try:
                # 主光源 - 模拟Abaqus的工作室照明
                main_light = pv.Light()
                main_light.set_direction_angle(30, -30)
                main_light.intensity = light_config['diffuse_light']
                # 修复光照类型枚举问题
                try:
                    main_light.light_type = pv.LightType.SCENE_LIGHT
                except:
                    main_light.light_type = 2  # SCENE_LIGHT枚举值
                self.plotter.add_light(main_light)
                
                # 环境光
                ambient_light = pv.Light()
                try:
                    ambient_light.light_type = pv.LightType.AMBIENT_LIGHT
                except:
                    ambient_light.light_type = 3  # AMBIENT_LIGHT枚举值
                ambient_light.intensity = light_config['ambient_light']
                self.plotter.add_light(ambient_light)
                
            except Exception as e:
                print(f"高级光照设置失败，使用默认光照: {e}")
                # 降级到默认光照
            
            # 高级渲染特性
            if light_config['enable_shadows']:
                # self.plotter.enable_shadows()  # 如果支持阴影
                pass
                
            # 深度缓冲和透明度
            self.plotter.enable_depth_peeling(15)  # 更好的透明度渲染
            
            # 相机配置
            camera_config = config['camera']
            self.plotter.camera.zoom(camera_config['initial_zoom'])
            self.plotter.camera.SetParallelProjection(camera_config['parallel_projection'])
            
            # 设置初始视角 - 类似Abaqus的isometric视图
            self.plotter.view_isometric()
            
        except Exception as e:
            print(f"高级渲染设置失败: {e}")
            # 降级到基础设置
            self.plotter.set_background([0.1, 0.1, 0.2])
            self.plotter.enable_anti_aliasing()
        
        # 设置光照
        self.plotter.enable_shadows()
        
        # 相机设置
        self.plotter.camera_position = [
            (15, 10, 8),   # 相机位置
            (0, 0, 1),     # 焦点
            (0, 0, 1)      # 上方向
        ]
    
    def create_initial_scene(self):
        """创建初始3D场景"""
        if not hasattr(self, 'plotter'):
            return
            
        try:
            # 生成流场数据
            self.current_flow_field = self.flow_generator.generate_cylinder_flow()
            
            # 添加几何体
            self.add_pier_geometry()
            self.add_domain_geometry()
            self.add_flow_visualization()
            
            # 初始化粒子系统
            self.particle_system.initialize_particles((-10, 10, -7, 7, -2, 4))
            self.add_particle_system()
            
            # 生成冲刷演化数据
            self.scour_evolution = self.flow_generator.generate_scour_evolution(50)
            
            # 添加交互功能
            self.setup_interactions()
            
            # 设置图例
            self.plotter.add_scalar_bar(
                title="流速 (m/s)",
                n_labels=5,
                position_x=0.85,
                position_y=0.1
            )
            
        except Exception as e:
            print(f"创建3D场景失败: {e}")
    
    def add_pier_geometry(self):
        """添加桥墩几何体 - Abaqus级别材质"""
        # 创建高精度圆柱形桥墩
        pier = pv.Cylinder(
            center=(0, 0, 1),
            direction=(0, 0, 1),
            radius=1.0,
            height=6.0,
            resolution=64  # 更高精度
        )
        
        # 计算法线用于高级光照
        pier = pier.compute_normals(split_vertices=True)
        
        # Abaqus风格的钢筋混凝土材质
        self.plotter.add_mesh(
            pier,
            color='#2c3e50',  # 深灰蓝色
            pbr=True,  # 物理基础渲染
            metallic=ABAQUS_3D_CONFIG['lighting']['metallic'],
            roughness=ABAQUS_3D_CONFIG['lighting']['roughness'],
            opacity=0.95,
            smooth_shading=True,
            name='pier_geometry'
        )
    
    def add_domain_geometry(self):
        """添加计算域几何"""
        # 河床
        bed = pv.Plane(
            center=(0, 0, -2),
            direction=(0, 0, 1),
            i_size=20,
            j_size=15,
            i_resolution=40,
            j_resolution=30
        )
        
        # 添加河床纹理
        self.plotter.add_mesh(
            bed,
            color='#d2691e',
            opacity=0.8,
            name='river_bed'
        )
        
        # 水面
        water_surface = pv.Plane(
            center=(0, 0, 3),
            direction=(0, 0, 1), 
            i_size=20,
            j_size=15,
            i_resolution=20,
            j_resolution=15
        )
        
        # 水面效果
        self.plotter.add_mesh(
            water_surface,
            color='#4fc3f7',
            opacity=0.3,
            name='water_surface'
        )
    
    def add_flow_visualization(self):
        """添加流场可视化"""
        if self.current_flow_field is None:
            return
            
        # 流线
        if self.render_modes['streamlines']:
            self.add_streamlines()
        
        # 速度矢量
        if self.render_modes['vectors']:
            self.add_velocity_vectors()
        
        # 等值面
        if self.render_modes['isosurfaces']:
            self.add_velocity_isosurfaces()
    
    def add_streamlines(self):
        """添加流线"""
        # 种子点 - 在上游创建
        seed_points = []
        for y in np.linspace(-4, 4, 8):
            for z in np.linspace(0.5, 4, 3):
                seed_points.append([-8, y, z])
        
        seed_mesh = pv.PolyData(np.array(seed_points))
        
        # 生成流线
        streamlines = self.current_flow_field.streamlines(
            vectors='velocity',
            source=seed_mesh,
            max_time=30.0,
            integration_direction='forward'
        )
        
        # 添加流线到场景
        self.plotter.add_mesh(
            streamlines.tube(radius=0.05),
            scalars='velocity_magnitude',
            cmap='plasma',
            opacity=0.8,
            name='streamlines'
        )
    
    def add_velocity_vectors(self):
        """添加速度矢量"""
        # 降采样网格用于矢量显示
        downsampled = self.current_flow_field.decimate(0.1)
        
        # 创建矢量胶水
        vectors = downsampled.glyph(
            orient='velocity',
            scale='velocity_magnitude',
            factor=0.5
        )
        
        self.plotter.add_mesh(
            vectors,
            scalars='velocity_magnitude',
            cmap='viridis',
            opacity=0.7,
            name='velocity_vectors'
        )
    
    def add_velocity_isosurfaces(self):
        """添加速度等值面"""
        # 高速区域等值面
        high_velocity_iso = self.current_flow_field.contour([0.6, 0.8, 1.0], 'velocity_magnitude')
        
        self.plotter.add_mesh(
            high_velocity_iso,
            scalars='velocity_magnitude',
            opacity=0.4,
            cmap='Reds',
            name='velocity_isosurfaces'
        )
    
    def add_particle_system(self):
        """添加粒子系统"""
        particle_mesh = self.particle_system.get_particle_mesh()
        
        if particle_mesh.n_points > 0:
            self.plotter.add_mesh(
                particle_mesh,
                scalars='age',
                point_size=3,
                render_points_as_spheres=True,
                cmap='cool',
                opacity=0.6,
                name='particles'
            )
    
    def setup_interactions(self):
        """设置交互功能"""
        # 点击事件
        self.plotter.track_click_position(callback=self.on_viewport_click)
        
        # 相机事件
        self.plotter.iren.add_observer('EndInteractionEvent', self.on_camera_change)
    
    def create_control_panel(self) -> QWidget:
        """创建控制面板"""
        panel = QTabWidget()
        
        # 渲染控制标签页
        render_tab = self.create_render_controls()
        panel.addTab(render_tab, "渲染")
        
        # 流场分析标签页
        analysis_tab = self.create_analysis_controls() 
        panel.addTab(analysis_tab, "分析")
        
        # 导出标签页
        export_tab = self.create_export_controls()
        panel.addTab(export_tab, "导出")
        
        return panel
    
    def create_render_controls(self) -> QWidget:
        """创建渲染控制"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 渲染模式组
        render_group = QGroupBox("渲染模式")
        render_layout = QVBoxLayout(render_group)
        
        self.render_checkboxes = {}
        for mode, enabled in self.render_modes.items():
            cb = QCheckBox(mode.title())
            cb.setChecked(enabled)
            cb.stateChanged.connect(lambda state, m=mode: self.toggle_render_mode(m, state))
            self.render_checkboxes[mode] = cb
            render_layout.addWidget(cb)
        
        layout.addWidget(render_group)
        
        # 颜色映射
        colormap_group = QGroupBox("颜色映射")
        colormap_layout = QVBoxLayout(colormap_group)
        
        self.colormap_combo = QComboBox()
        self.colormap_combo.addItems(['plasma', 'viridis', 'coolwarm', 'jet', 'rainbow'])
        self.colormap_combo.currentTextChanged.connect(self.change_colormap)
        colormap_layout.addWidget(self.colormap_combo)
        
        layout.addWidget(colormap_group)
        
        # 透明度控制
        opacity_group = QGroupBox("透明度")
        opacity_layout = QVBoxLayout(opacity_group)
        
        try:
            self.opacity_slider = QSlider(Qt.Orientation.Horizontal)
        except AttributeError:
            self.opacity_slider = QSlider(Qt.Horizontal)
        self.opacity_slider.setRange(10, 100)
        self.opacity_slider.setValue(80)
        self.opacity_slider.valueChanged.connect(self.change_opacity)
        opacity_layout.addWidget(self.opacity_slider)
        
        layout.addWidget(opacity_group)
        
        layout.addStretch()
        return widget
    
    def create_analysis_controls(self) -> QWidget:
        """创建分析控制"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 截面分析
        section_group = QGroupBox("截面分析")
        section_layout = QVBoxLayout(section_group)
        
        # X截面位置
        x_section_layout = QHBoxLayout()
        x_section_layout.addWidget(QLabel("X截面:"))
        self.x_section_spin = QDoubleSpinBox()
        self.x_section_spin.setRange(-10, 10)
        self.x_section_spin.setValue(0)
        self.x_section_spin.valueChanged.connect(self.update_x_section)
        x_section_layout.addWidget(self.x_section_spin)
        section_layout.addLayout(x_section_layout)
        
        layout.addWidget(section_group)
        
        # 探针工具
        probe_group = QGroupBox("数据探针")
        probe_layout = QVBoxLayout(probe_group)
        
        self.probe_enable_cb = QCheckBox("启用探针")
        self.probe_enable_cb.stateChanged.connect(self.toggle_probe)
        probe_layout.addWidget(self.probe_enable_cb)
        
        layout.addWidget(probe_group)
        
        layout.addStretch()
        return widget
    
    def create_export_controls(self) -> QWidget:
        """创建导出控制"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 截图
        screenshot_btn = QPushButton("保存截图")
        if QTA_AVAILABLE:
            screenshot_btn.setIcon(qta.icon('fa5s.camera'))
        screenshot_btn.clicked.connect(self.save_screenshot)
        layout.addWidget(screenshot_btn)
        
        # 动画导出
        animation_btn = QPushButton("导出动画")
        if QTA_AVAILABLE:
            animation_btn.setIcon(qta.icon('fa5s.video'))
        animation_btn.clicked.connect(self.export_animation)
        layout.addWidget(animation_btn)
        
        # 数据导出
        data_btn = QPushButton("导出数据")
        if QTA_AVAILABLE:
            data_btn.setIcon(qta.icon('fa5s.download'))
        data_btn.clicked.connect(self.export_data)
        layout.addWidget(data_btn)
        
        layout.addStretch()
        return widget
    
    def create_timeline_panel(self) -> QWidget:
        """创建时间轴控制面板"""
        panel = QFrame()
        panel.setFixedHeight(80)
        panel.setStyleSheet("""
            QFrame {
                background-color: #2d3748;
                border-top: 1px solid #4a5568;
            }
        """)
        
        layout = QHBoxLayout(panel)
        
        # 播放控制
        self.play_button = QPushButton("▶")
        self.play_button.setFixedSize(40, 40)
        self.play_button.clicked.connect(self.toggle_animation)
        layout.addWidget(self.play_button)
        
        # 时间滑块
        try:
            self.time_slider = QSlider(Qt.Orientation.Horizontal)
        except AttributeError:
            self.time_slider = QSlider(Qt.Horizontal)
        self.time_slider.setRange(0, 49)  # 50帧
        self.time_slider.setValue(0)
        self.time_slider.valueChanged.connect(self.set_animation_frame)
        layout.addWidget(self.time_slider)
        
        # 时间标签
        self.time_label = QLabel("帧: 0/49")
        self.time_label.setStyleSheet("color: white;")
        layout.addWidget(self.time_label)
        
        # 速度控制
        speed_label = QLabel("速度:")
        speed_label.setStyleSheet("color: white;")
        layout.addWidget(speed_label)
        
        try:
            self.speed_slider = QSlider(Qt.Orientation.Horizontal)
        except AttributeError:
            self.speed_slider = QSlider(Qt.Horizontal)
        self.speed_slider.setRange(50, 500)
        self.speed_slider.setValue(100)
        self.speed_slider.setFixedWidth(100)
        self.speed_slider.valueChanged.connect(self.change_animation_speed)
        layout.addWidget(self.speed_slider)
        
        return panel
    
    def create_fallback_viewer(self, layout):
        """创建后备查看器"""
        placeholder = QLabel("3D可视化不可用\n请安装PyVista")
        placeholder.setAlignment(Qt.AlignmentFlag.AlignCenter)
        placeholder.setStyleSheet("""
            QLabel {
                background-color: #f7fafc;
                border: 2px dashed #cbd5e0;
                border-radius: 8px;
                font-size: 16px;
                color: #4a5568;
                padding: 20px;
            }
        """)
        layout.addWidget(placeholder)
    
    # 事件处理方法
    def toggle_render_mode(self, mode: str, state: int):
        """切换渲染模式"""
        self.render_modes[mode] = bool(state)
        self.update_visualization()
    
    def change_colormap(self, colormap: str):
        """改变颜色映射"""
        if hasattr(self, 'plotter'):
            # 更新所有使用颜色映射的对象
            self.update_visualization()
    
    def change_opacity(self, value: int):
        """改变透明度"""
        opacity = value / 100.0
        if hasattr(self, 'plotter'):
            # 更新透明度
            pass
    
    def update_x_section(self, x_pos: float):
        """更新X截面"""
        if hasattr(self, 'plotter') and self.current_flow_field:
            # 创建截面
            plane = self.current_flow_field.slice(normal=[1, 0, 0], origin=[x_pos, 0, 0])
            
            # 更新或添加截面
            if 'x_section' in [actor.name for actor in self.plotter.actors.values()]:
                self.plotter.remove_actor('x_section')
            
            self.plotter.add_mesh(
                plane,
                scalars='velocity_magnitude',
                cmap=self.colormap_combo.currentText(),
                name='x_section'
            )
    
    def toggle_probe(self, state: int):
        """切换探针工具"""
        # 实现探针功能
        pass
    
    def toggle_animation(self):
        """切换动画播放"""
        if self.animation_timer.isActive():
            self.animation_timer.stop()
            self.play_button.setText("▶")
        else:
            self.animation_timer.start(self.animation_speed)
            self.play_button.setText("⏸")
    
    def advance_animation(self):
        """推进动画"""
        self.current_frame = (self.current_frame + 1) % len(self.scour_evolution)
        self.time_slider.setValue(self.current_frame)
        self.update_scour_animation()
    
    def set_animation_frame(self, frame: int):
        """设置动画帧"""
        self.current_frame = frame
        self.time_label.setText(f"帧: {frame}/{len(self.scour_evolution)-1}")
        self.update_scour_animation()
        self.animation_frame_changed.emit(frame)
    
    def change_animation_speed(self, speed: int):
        """改变动画速度"""
        self.animation_speed = 600 - speed  # 反向，速度越大间隔越小
        if self.animation_timer.isActive():
            self.animation_timer.setInterval(self.animation_speed)
    
    def update_scour_animation(self):
        """更新冲刷动画"""
        if not hasattr(self, 'plotter') or not self.scour_evolution:
            return
            
        # 移除旧的冲刷几何
        if 'scour_hole' in [actor.name for actor in self.plotter.actors.values()]:
            self.plotter.remove_actor('scour_hole')
        
        # 添加当前帧的冲刷几何
        current_scour = self.scour_evolution[self.current_frame]
        if current_scour.n_points > 0:
            self.plotter.add_mesh(
                current_scour,
                scalars='depth',
                cmap='Reds_r',
                opacity=0.8,
                name='scour_hole'
            )
    
    def update_visualization(self):
        """更新可视化"""
        if not hasattr(self, 'plotter'):
            return
            
        # 重新生成流场可视化
        self.plotter.clear_actors()
        self.create_initial_scene()
    
    def on_viewport_click(self, point):
        """视口点击事件"""
        self.viewport_clicked.emit(point)
        
        # 如果启用了探针，显示该点的数据
        if hasattr(self, 'probe_enable_cb') and self.probe_enable_cb.isChecked():
            self.show_point_data(point)
    
    def show_point_data(self, point):
        """显示点数据"""
        if self.current_flow_field is None:
            return
            
        # 在该点采样数据
        probe = self.current_flow_field.sample(pv.PolyData([point]))
        
        if probe.n_points > 0:
            velocity = probe['velocity'][0]
            vel_mag = probe['velocity_magnitude'][0]
            pressure = probe.get('pressure', [0])[0]
            
            # 可以发射信号或显示对话框
            data = {
                'position': point,
                'velocity': velocity,
                'velocity_magnitude': vel_mag,
                'pressure': pressure
            }
            self.viewport_selection_changed.emit(data)
    
    def on_camera_change(self, obj, event):
        """相机变化事件"""
        # 可以保存相机位置等
        pass
    
    # 导出功能
    def save_screenshot(self):
        """保存截图"""
        if hasattr(self, 'plotter'):
            filename = f"scour_screenshot_{int(time.time())}.png"
            self.plotter.screenshot(filename, window_size=(1920, 1080))
            print(f"截图已保存: {filename}")
    
    def export_animation(self):
        """导出动画"""
        if not hasattr(self, 'plotter') or not self.scour_evolution:
            return
            
        # 创建动画
        self.plotter.open_gif("scour_animation.gif")
        
        for frame in range(len(self.scour_evolution)):
            self.set_animation_frame(frame)
            self.plotter.write_frame()
        
        self.plotter.close()
        print("动画已导出: scour_animation.gif")
    
    def export_data(self):
        """导出数据"""
        if self.current_flow_field is None:
            return
            
        # 导出VTK格式
        filename = f"flow_field_{int(time.time())}.vtk"
        self.current_flow_field.save(filename)
        print(f"数据已导出: {filename}")
    
    def update_flow_field(self, pier_diameter: float, flow_velocity: float):
        """更新流场"""
        # 重新生成流场数据
        self.current_flow_field = self.flow_generator.generate_cylinder_flow(
            pier_diameter, flow_velocity
        )
        
        # 更新粒子系统
        self.particle_system.initialize_particles((-10, 10, -7, 7, -2, 4))
        
        # 重新生成冲刷演化
        self.scour_evolution = self.flow_generator.generate_scour_evolution(50)
        
        # 更新可视化
        self.update_visualization()


if __name__ == "__main__":
    from PyQt6.QtWidgets import QApplication
    import sys
    
    app = QApplication(sys.argv)
    
    # 创建测试窗口
    viewport = Enhanced3DViewport()
    viewport.setWindowTitle("增强3D视口测试")
    viewport.resize(1200, 800)
    viewport.show()
    
    sys.exit(app.exec())