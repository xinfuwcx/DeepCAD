"""
增强型3D地质可视化模块
基于PyVista的高性能3D渲染和交互
支持多视图、高级渲染效果、动画和交互式分析
"""
import numpy as np
import pandas as pd
import pyvista as pv
import pyvistaqt as pvqt
from typing import Dict, List, Tuple, Optional, Union
import warnings
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QSlider, QCheckBox, QComboBox
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont

class Enhanced3DGeologyViewer(QWidget):
    """
    增强型3D地质可视化器
    支持多层地质结构、断层、钻孔轨迹等专业地质要素
    """
    
    # 信号定义
    layer_selected = pyqtSignal(str)
    borehole_selected = pyqtSignal(str)
    cross_section_requested = pyqtSignal(tuple)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.initialize_scene()
        
        # 数据存储
        self.geological_data = {}
        self.borehole_data = None
        self.mesh_objects = {}
        self.current_layers = []
        
        # 渲染设置
        self.render_quality = 'high'
        self.lighting_enabled = True
        self.transparency_mode = True
        
    def setup_ui(self):
        """设置用户界面"""
        layout = QVBoxLayout(self)
        
        # 控制面板
        control_panel = self.create_control_panel()
        layout.addWidget(control_panel)
        
        # 3D视图区域
        self.viewer = pvqt.QtInteractor()
        self.viewer.set_background([0.2, 0.3, 0.4])  # 深蓝色背景
        layout.addWidget(self.viewer)
        
        # 状态栏
        status_layout = QHBoxLayout()
        self.status_label = QLabel("就绪")
        self.status_label.setStyleSheet("color: #666; font-size: 12px;")
        status_layout.addWidget(self.status_label)
        status_layout.addStretch()
        layout.addLayout(status_layout)
        
    def create_control_panel(self):
        """创建控制面板"""
        panel = QWidget()
        panel.setMaximumHeight(120)
        panel.setStyleSheet("""
            QWidget {
                background-color: #f8f9fa;
                border-radius: 8px;
                padding: 5px;
            }
        """)
        
        layout = QHBoxLayout(panel)
        
        # 视图控制组
        view_group = QWidget()
        view_layout = QVBoxLayout(view_group)
        
        view_title = QLabel("🔍 视图控制")
        view_title.setFont(QFont("Arial", 10, QFont.Weight.Bold))
        view_layout.addWidget(view_title)
        
        # 视图按钮
        view_buttons_layout = QHBoxLayout()
        
        self.iso_view_btn = QPushButton("等轴视图")
        self.iso_view_btn.clicked.connect(self.set_isometric_view)
        view_buttons_layout.addWidget(self.iso_view_btn)
        
        self.top_view_btn = QPushButton("俯视图")
        self.top_view_btn.clicked.connect(self.set_top_view)
        view_buttons_layout.addWidget(self.top_view_btn)
        
        self.section_view_btn = QPushButton("剖面图")
        self.section_view_btn.clicked.connect(self.toggle_cross_section)
        view_buttons_layout.addWidget(self.section_view_btn)
        
        view_layout.addLayout(view_buttons_layout)
        layout.addWidget(view_group)
        
        # 图层控制组
        layer_group = QWidget()
        layer_layout = QVBoxLayout(layer_group)
        
        layer_title = QLabel("📊 图层管理")
        layer_title.setFont(QFont("Arial", 10, QFont.Weight.Bold))
        layer_layout.addWidget(layer_title)
        
        layer_controls_layout = QHBoxLayout()
        
        self.show_boreholes_check = QCheckBox("钻孔")
        self.show_boreholes_check.setChecked(True)
        self.show_boreholes_check.toggled.connect(self.toggle_boreholes)
        layer_controls_layout.addWidget(self.show_boreholes_check)
        
        self.show_surfaces_check = QCheckBox("地层面")
        self.show_surfaces_check.setChecked(True)
        self.show_surfaces_check.toggled.connect(self.toggle_surfaces)
        layer_controls_layout.addWidget(self.show_surfaces_check)
        
        self.show_volumes_check = QCheckBox("体积")
        self.show_volumes_check.setChecked(False)
        self.show_volumes_check.toggled.connect(self.toggle_volumes)
        layer_controls_layout.addWidget(self.show_volumes_check)
        
        layer_layout.addLayout(layer_controls_layout)
        layout.addWidget(layer_group)
        
        # 渲染控制组
        render_group = QWidget()
        render_layout = QVBoxLayout(render_group)
        
        render_title = QLabel("🎨 渲染设置")
        render_title.setFont(QFont("Arial", 10, QFont.Weight.Bold))
        render_layout.addWidget(render_title)
        
        render_controls_layout = QHBoxLayout()
        
        # 质量选择
        quality_label = QLabel("质量:")
        render_controls_layout.addWidget(quality_label)
        
        self.quality_combo = QComboBox()
        self.quality_combo.addItems(["低", "中", "高", "超高"])
        self.quality_combo.setCurrentText("高")
        self.quality_combo.currentTextChanged.connect(self.set_render_quality)
        render_controls_layout.addWidget(self.quality_combo)
        
        # 透明度滑块
        transparency_label = QLabel("透明度:")
        render_controls_layout.addWidget(transparency_label)
        
        self.transparency_slider = QSlider(Qt.Orientation.Horizontal)
        self.transparency_slider.setRange(0, 100)
        self.transparency_slider.setValue(80)
        self.transparency_slider.valueChanged.connect(self.set_transparency)
        render_controls_layout.addWidget(self.transparency_slider)
        
        render_layout.addLayout(render_controls_layout)
        layout.addWidget(render_group)
        
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
        
        # 添加网格
        self.add_ground_grid()
        
        # 设置光照
        self.setup_lighting()
        
    def add_ground_grid(self):
        """添加地面参考网格"""
        # 创建地面网格
        grid = pv.StructuredGrid()
        
        # 设置网格范围（根据数据自动调整）
        x_range = np.linspace(0, 500, 21)  # 21个点，500m范围
        y_range = np.linspace(0, 500, 21)
        z_level = 0  # 地面标高
        
        xx, yy = np.meshgrid(x_range, y_range)
        zz = np.full_like(xx, z_level)
        
        grid.points = np.c_[xx.ravel(), yy.ravel(), zz.ravel()]
        grid.dimensions = (len(x_range), len(y_range), 1)
        
        # 添加到场景
        self.viewer.add_mesh(
            grid, 
            color='lightgray', 
            opacity=0.3,
            show_edges=True,
            line_width=1,
            name='ground_grid'
        )
        
    def setup_lighting(self):
        """设置场景光照"""
        # 移除默认光源
        self.viewer.remove_all_lights()
        
        # 添加主光源（太阳光）
        sun_light = pv.Light(
            position=(1000, 1000, 1000),
            focal_point=(250, 250, -25),
            color='white',
            intensity=0.8
        )
        self.viewer.add_light(sun_light)
        
        # 添加填充光
        fill_light = pv.Light(
            position=(-500, -500, 500),
            focal_point=(250, 250, -25),
            color='lightblue',
            intensity=0.3
        )
        self.viewer.add_light(fill_light)
        
    def load_borehole_data(self, data: pd.DataFrame):
        """加载钻孔数据"""
        self.borehole_data = data.copy()
        self.render_boreholes()
        self.status_label.setText(f"已加载 {len(data)} 个钻孔数据点")
        
    def render_boreholes(self):
        """渲染钻孔数据"""
        if self.borehole_data is None:
            return
            
        # 清除之前的钻孔对象
        existing_boreholes = [name for name in self.viewer.renderer.actors if name.startswith('borehole_')]
        for name in existing_boreholes:
            self.viewer.remove_actor(name)
            
        # 按钻孔分组
        for hole_id, hole_data in self.borehole_data.groupby('hole_id'):
            self.render_single_borehole(hole_id, hole_data)
            
    def render_single_borehole(self, hole_id: str, hole_data: pd.DataFrame):
        """渲染单个钻孔"""
        # 创建钻孔轨迹线
        points = hole_data[['x', 'y', 'z']].values
        
        if len(points) < 2:
            # 单点钻孔，显示为球体
            sphere = pv.Sphere(radius=2, center=points[0])
            self.viewer.add_mesh(
                sphere,
                color='red',
                name=f'borehole_{hole_id}_point'
            )
        else:
            # 多点钻孔，显示为管道
            spline = pv.Spline(points, n_points=len(points)*2)
            tube = spline.tube(radius=1.5)
            
            # 根据土层类型着色
            if 'soil_layer' in hole_data.columns:
                tube['soil_layer'] = np.repeat(hole_data['soil_layer'].values, 2)
                
            self.viewer.add_mesh(
                tube,
                scalars='soil_layer' if 'soil_layer' in hole_data.columns else None,
                cmap='viridis',
                name=f'borehole_{hole_id}',
                pickable=True
            )
            
        # 添加钻孔标签
        label_pos = points[0] + [0, 0, 5]  # 在顶部显示标签
        self.viewer.add_point_labels(
            [label_pos], 
            [hole_id],
            point_size=0,
            font_size=10,
            name=f'borehole_{hole_id}_label'
        )
        
    def create_geological_surfaces(self, interpolation_result: Dict):
        """创建地质层面"""
        if 'interpolated_values' not in interpolation_result:
            return
            
        # 获取插值网格
        grid_coords = interpolation_result['grid_coords']
        values = interpolation_result['interpolated_values']
        
        # 重塑数据为网格形状
        # 假设是规则网格
        unique_x = np.unique(grid_coords[:, 0])
        unique_y = np.unique(grid_coords[:, 1])
        
        if len(unique_x) * len(unique_y) != len(values):
            warnings.warn("网格数据形状不匹配，使用散点显示")
            self.create_point_cloud(grid_coords, values)
            return
            
        # 创建结构化网格
        xx, yy = np.meshgrid(unique_x, unique_y)
        zz = values.reshape(len(unique_y), len(unique_x))
        
        # 创建地质层面
        surface = pv.StructuredGrid()
        surface.points = np.c_[xx.ravel(), yy.ravel(), zz.ravel()]
        surface.dimensions = (len(unique_x), len(unique_y), 1)
        
        # 添加地质属性
        surface['geological_value'] = values
        
        # 渲染表面
        self.viewer.add_mesh(
            surface,
            scalars='geological_value',
            cmap='terrain',
            opacity=0.8,
            show_edges=True,
            edge_color='white',
            line_width=0.5,
            name='geological_surface'
        )
        
    def create_point_cloud(self, points: np.ndarray, values: np.ndarray):
        """创建点云显示"""
        point_cloud = pv.PolyData(points)
        point_cloud['values'] = values
        
        self.viewer.add_mesh(
            point_cloud,
            scalars='values',
            point_size=8,
            render_points_as_spheres=True,
            cmap='viridis',
            name='interpolation_points'
        )
        
    def create_geological_volumes(self, layer_data: Dict[str, np.ndarray]):
        """创建3D地质体"""
        for layer_name, layer_points in layer_data.items():
            if len(layer_points) < 4:  # 至少需要4个点形成体积
                continue
                
            # 创建凸包
            hull = layer_points.convex_hull()
            
            # 根据层名设置颜色
            color_map = {
                '粘土': 'brown',
                '砂土': 'yellow',
                '岩层': 'gray',
                '粉质粘土': 'orange'
            }
            color = color_map.get(layer_name, 'lightblue')
            
            self.viewer.add_mesh(
                hull,
                color=color,
                opacity=0.6,
                name=f'volume_{layer_name}'
            )
            
    # 控制方法
    def set_isometric_view(self):
        """设置等轴测视图"""
        self.viewer.camera_position = [(500, 500, 300), (250, 250, -25), (0, 0, 1)]
        self.viewer.reset_camera()
        
    def set_top_view(self):
        """设置俯视图"""
        self.viewer.camera_position = [(250, 250, 500), (250, 250, -25), (0, 1, 0)]
        self.viewer.reset_camera()
        
    def toggle_cross_section(self):
        """切换剖面显示"""
        # 这里可以实现剖面切割功能
        self.cross_section_requested.emit((250, 250))  # 发射信号
        
    def toggle_boreholes(self, visible: bool):
        """切换钻孔显示（使用可见性而非增删 actor）"""
        borehole_actors = [name for name in self.viewer.renderer.actors.keys() if 'borehole_' in name]
        for actor_name in borehole_actors:
            actor = self.viewer.renderer.actors.get(actor_name)
            if actor:
                actor.SetVisibility(visible)
        self.viewer.render()
                
    def toggle_surfaces(self, visible: bool):
        """切换地层面显示（使用可见性而非增删 actor）"""
        surface_actors = [name for name in self.viewer.renderer.actors.keys() if 'surface' in name]
        for actor_name in surface_actors:
            actor = self.viewer.renderer.actors.get(actor_name)
            if actor:
                actor.SetVisibility(visible)
        self.viewer.render()
                
    def toggle_volumes(self, visible: bool):
        """切换体积显示（使用可见性而非增删 actor）"""
        volume_actors = [name for name in self.viewer.renderer.actors.keys() if 'volume_' in name]
        for actor_name in volume_actors:
            actor = self.viewer.renderer.actors.get(actor_name)
            if actor:
                actor.SetVisibility(visible)
        self.viewer.render()
                
    def set_render_quality(self, quality: str):
        """设置渲染质量（适度调整点/线宽）"""
        quality_map = {
            '低': {'point_size': 3, 'line_width': 1},
            '中': {'point_size': 5, 'line_width': 1.5},
            '高': {'point_size': 8, 'line_width': 2},
            '超高': {'point_size': 12, 'line_width': 3}
        }
        settings = quality_map.get(quality, quality_map['高'])
        self.render_quality = quality
        # 应用到已有 actor
        for _, actor in self.viewer.renderer.actors.items():
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
        
        # 应用到所有surface类型的对象
        for actor_name in self.viewer.renderer.actors:
            if 'surface' in actor_name or 'volume_' in actor_name:
                actor = self.viewer.renderer.actors[actor_name]
                if hasattr(actor, 'GetProperty'):
                    actor.GetProperty().SetOpacity(opacity)
                    
        self.viewer.render()
        
    def export_scene(self, filename: str, format_type: str = 'vtk'):
        """
        导出3D场景：优先 VTKJS；失败则降级 HTML；再失败则截图 PNG。
        """
        fmt = format_type.lower().strip()
        try:
            if fmt == 'vtk' or filename.lower().endswith('.vtkjs'):
                out = filename if filename.lower().endswith('.vtkjs') else f"{filename}.vtkjs"
                self.viewer.export_vtkjs(out)
            elif fmt == 'gltf':
                # TODO: 实现 glTF 导出
                raise NotImplementedError('glTF export not implemented')
            elif fmt == 'obj':
                # TODO: 实现 OBJ 导出
                raise NotImplementedError('OBJ export not implemented')
            else:
                out = filename if filename.lower().endswith('.vtkjs') else f"{filename}.vtkjs"
                self.viewer.export_vtkjs(out)
        except Exception:
            # 降级为 HTML
            try:
                html_name = filename if filename.lower().endswith('.html') else f"{filename}.html"
                self.viewer.export_html(html_name)
                self.status_label.setText(f"已降级导出 HTML: {html_name}")
                return
            except Exception:
                # 最低保真：截图 PNG
                png_name = filename if filename.lower().endswith('.png') else f"{filename}.png"
                self.viewer.screenshot(png_name)
                self.status_label.setText(f"已降级导出 PNG 截图: {png_name}")
                return
        # 正常完成
        self.status_label.setText(f"场景已导出到 {filename}")
        self.viewer.render()

# 使用示例和测试函数
def create_sample_borehole_data() -> pd.DataFrame:
    """创建示例钻孔数据"""
    np.random.seed(42)
    
    data = []
    hole_ids = ['BH001', 'BH002', 'BH003', 'BH004', 'BH005']
    
    for i, hole_id in enumerate(hole_ids):
        x_base = 100 + i * 100
        y_base = 100 + i * 80
        
        # 每个钻孔5-8个数据点
        n_points = np.random.randint(5, 9)
        z_values = np.linspace(-2, -20, n_points)
        
        for j, z in enumerate(z_values):
            data.append({
                'hole_id': hole_id,
                'x': x_base + np.random.normal(0, 2),
                'y': y_base + np.random.normal(0, 2), 
                'z': z + np.random.normal(0, 0.5),
                'soil_layer': j + 1,
                'soil_type': ['粘土', '粉质粘土', '砂土', '岩层'][j % 4],
                'description': f'第{j+1}层地质'
            })
            
    return pd.DataFrame(data)

if __name__ == "__main__":
    import sys
    from PyQt6.QtWidgets import QApplication
    
    app = QApplication(sys.argv)
    
    # 创建测试窗口
    viewer = Enhanced3DGeologyViewer()
    viewer.setWindowTitle("Enhanced 3D Geology Viewer - 测试")
    viewer.resize(1200, 800)
    
    # 加载示例数据
    sample_data = create_sample_borehole_data()
    viewer.load_borehole_data(sample_data)
    
    viewer.show()
    sys.exit(app.exec())