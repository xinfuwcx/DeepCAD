#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VTK渲染器 - 3D瓦片可视化核心组件
集成VTK和PyQt6，提供高性能3D渲染能力
"""

import sys
from pathlib import Path
from typing import Optional, List, Tuple, Dict, Any

try:
    import vtk
    from vtk.qt.QVTKRenderWindowInteractor import QVTKRenderWindowInteractor
    VTK_AVAILABLE = True
except ImportError:
    VTK_AVAILABLE = False
    print("警告: VTK不可用，渲染功能受限")

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

try:
    from PyQt6.QtWidgets import QWidget, QVBoxLayout
    from PyQt6.QtCore import QTimer, pyqtSignal
    PYQT_AVAILABLE = True
except ImportError:
    PYQT_AVAILABLE = False

# 导入项目模块
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

if VTK_AVAILABLE:
    from core.tile_loader import Tileset, TileNode, TileContent, TileGeometry


class VTKTileRenderer:
    """基于VTK的3D瓦片渲染器"""
    
    def __init__(self, parent_widget: QWidget):
        if not VTK_AVAILABLE:
            raise ImportError("VTK不可用，无法创建渲染器")
        if not PYQT_AVAILABLE:
            raise ImportError("PyQt6不可用，无法创建渲染器")
            
        self.parent_widget = parent_widget
        
        # VTK渲染组件
        self.vtk_widget: Optional[QVTKRenderWindowInteractor] = None
        self.renderer: Optional[vtk.vtkRenderer] = None
        self.render_window: Optional[vtk.vtkRenderWindow] = None
        self.interactor: Optional[vtk.vtkRenderWindowInteractor] = None
        
        # 场景数据
        self.tileset: Optional[Tileset] = None
        self.tile_actors: Dict[str, vtk.vtkActor] = {}
        self.bounds_actors: List[vtk.vtkActor] = []
        
        # 渲染设置
        self.render_mode = 'solid'  # solid, wireframe, points
        self.show_wireframe = False
        self.show_bounds = False
        self.show_normals = False
        self.lod_level = 5
        
        # 性能统计
        self.fps_counter = 0
        self.last_fps_time = 0
        self.current_fps = 0
        self.triangle_count = 0
        self.vertex_count = 0
        
        # 初始化渲染器
        self.initialize_vtk()
        
    def initialize_vtk(self):
        """初始化VTK渲染系统"""
        # 创建VTK渲染窗口交互器
        self.vtk_widget = QVTKRenderWindowInteractor(self.parent_widget)
        
        # 设置布局
        layout = QVBoxLayout(self.parent_widget)
        layout.addWidget(self.vtk_widget)
        layout.setContentsMargins(0, 0, 0, 0)
        self.parent_widget.setLayout(layout)
        
        # 创建渲染器
        self.renderer = vtk.vtkRenderer()
        self.renderer.SetBackground(0.1, 0.1, 0.1)  # 深灰色背景
        
        # 获取渲染窗口和交互器
        self.render_window = self.vtk_widget.GetRenderWindow()
        self.render_window.AddRenderer(self.renderer)
        
        self.interactor = self.vtk_widget.GetRenderWindow().GetInteractor()
        
        # 设置交互样式
        interactor_style = vtk.vtkInteractorStyleTrackballCamera()
        self.interactor.SetInteractorStyle(interactor_style)
        
        # 添加坐标轴
        self.add_coordinate_axes()
        
        # 添加光源
        self.setup_lighting()
        
        # 启动交互器
        self.interactor.Initialize()
        self.interactor.Start()
        
    def add_coordinate_axes(self):
        """添加坐标轴"""
        # 创建坐标轴
        axes = vtk.vtkAxesActor()
        axes.SetTotalLength(10, 10, 10)
        axes.SetShaftType(0)  # 圆柱轴
        axes.SetAxisLabels(1)  # 显示标签
        
        # 添加到渲染器
        self.renderer.AddActor(axes)
        
    def setup_lighting(self):
        """设置光照"""
        # 移除默认光源
        self.renderer.RemoveAllLights()
        
        # 添加主光源
        main_light = vtk.vtkLight()
        main_light.SetPosition(100, 100, 100)
        main_light.SetFocalPoint(0, 0, 0)
        main_light.SetColor(1.0, 1.0, 1.0)
        main_light.SetIntensity(0.8)
        self.renderer.AddLight(main_light)
        
        # 添加填充光源
        fill_light = vtk.vtkLight()
        fill_light.SetPosition(-50, 50, 50)
        fill_light.SetFocalPoint(0, 0, 0)
        fill_light.SetColor(0.8, 0.8, 1.0)
        fill_light.SetIntensity(0.3)
        self.renderer.AddLight(fill_light)
        
        # 添加环境光
        ambient_light = vtk.vtkLight()
        ambient_light.SetAmbientColor(0.2, 0.2, 0.2)
        ambient_light.SetIntensity(0.1)
        self.renderer.AddLight(ambient_light)
        
    def load_tileset(self, tileset: Tileset):
        """加载瓦片集"""
        self.tileset = tileset
        
        # 清除现有内容
        self.clear_scene()
        
        # 加载可见瓦片
        camera_pos = self.get_camera_position()
        camera_dir = self.get_camera_direction()
        
        visible_tiles = tileset.get_visible_tiles(
            camera_pos, camera_dir, self.lod_level / 10.0
        )
        
        # 加载瓦片内容
        tileset.load_visible_content(visible_tiles)
        
        # 渲染瓦片
        for tile in visible_tiles:
            if tile.content and tile.content.geometry:
                self.add_tile_geometry(tile)
                
        # 适合窗口
        self.fit_to_window()
        
        # 更新渲染
        self.render()
        
    def add_tile_geometry(self, tile: TileNode):
        """添加瓦片几何到场景"""
        if not tile.content or not tile.content.geometry:
            return
            
        geometry = tile.content.geometry
        
        # 创建VTK多边形数据
        poly_data = vtk.vtkPolyData()
        
        # 设置顶点
        if NUMPY_AVAILABLE and isinstance(geometry.vertices, np.ndarray):
            points = vtk.vtkPoints()
            for vertex in geometry.vertices:
                points.InsertNextPoint(vertex[0], vertex[1], vertex[2])
            poly_data.SetPoints(points)
            
            self.vertex_count += len(geometry.vertices)
        elif geometry.vertices:
            points = vtk.vtkPoints()
            for vertex in geometry.vertices:
                points.InsertNextPoint(vertex[0], vertex[1], vertex[2])
            poly_data.SetPoints(points)
            
            self.vertex_count += len(geometry.vertices)
            
        # 设置面片索引
        if geometry.indices:
            cells = vtk.vtkCellArray()
            
            if NUMPY_AVAILABLE and isinstance(geometry.indices, np.ndarray):
                indices = geometry.indices
            else:
                indices = geometry.indices
                
            # 按三角形组织索引
            for i in range(0, len(indices), 3):
                if i + 2 < len(indices):
                    triangle = vtk.vtkTriangle()
                    triangle.GetPointIds().SetId(0, indices[i])
                    triangle.GetPointIds().SetId(1, indices[i + 1])
                    triangle.GetPointIds().SetId(2, indices[i + 2])
                    cells.InsertNextCell(triangle)
                    
                    self.triangle_count += 1
                    
            poly_data.SetPolys(cells)
            
        # 设置法线
        if geometry.normals is not None:
            normals = vtk.vtkFloatArray()
            normals.SetNumberOfComponents(3)
            normals.SetName("Normals")
            
            if NUMPY_AVAILABLE and isinstance(geometry.normals, np.ndarray):
                for normal in geometry.normals:
                    normals.InsertNextTuple3(normal[0], normal[1], normal[2])
            else:
                for normal in geometry.normals:
                    normals.InsertNextTuple3(normal[0], normal[1], normal[2])
                    
            poly_data.GetPointData().SetNormals(normals)
        else:
            # 计算法线
            normal_generator = vtk.vtkPolyDataNormals()
            normal_generator.SetInputData(poly_data)
            normal_generator.ComputePointNormalsOn()
            normal_generator.ComputeCellNormalsOn()
            normal_generator.Update()
            poly_data = normal_generator.GetOutput()
            
        # 设置纹理坐标
        if geometry.uvs is not None:
            tex_coords = vtk.vtkFloatArray()
            tex_coords.SetNumberOfComponents(2)
            tex_coords.SetName("TextureCoordinates")
            
            if NUMPY_AVAILABLE and isinstance(geometry.uvs, np.ndarray):
                for uv in geometry.uvs:
                    tex_coords.InsertNextTuple2(uv[0], uv[1])
            else:
                for uv in geometry.uvs:
                    tex_coords.InsertNextTuple2(uv[0], uv[1])
                    
            poly_data.GetPointData().SetTCoords(tex_coords)
            
        # 设置顶点颜色
        if geometry.colors is not None:
            colors = vtk.vtkUnsignedCharArray()
            colors.SetNumberOfComponents(3)
            colors.SetName("Colors")
            
            if NUMPY_AVAILABLE and isinstance(geometry.colors, np.ndarray):
                for color in geometry.colors:
                    colors.InsertNextTuple3(
                        int(color[0] * 255), 
                        int(color[1] * 255), 
                        int(color[2] * 255)
                    )
            else:
                for color in geometry.colors:
                    colors.InsertNextTuple3(
                        int(color[0] * 255), 
                        int(color[1] * 255), 
                        int(color[2] * 255)
                    )
                    
            poly_data.GetPointData().SetScalars(colors)
            
        # 创建映射器
        mapper = vtk.vtkPolyDataMapper()
        mapper.SetInputData(poly_data)
        
        # 创建演员
        actor = vtk.vtkActor()
        actor.SetMapper(mapper)
        
        # 设置材质属性
        self.setup_actor_properties(actor)
        
        # 添加到场景
        self.renderer.AddActor(actor)
        
        # 缓存演员
        tile_id = id(tile)  # 使用对象ID作为键
        self.tile_actors[str(tile_id)] = actor
        
        # 添加边界框（如果启用）
        if self.show_bounds and tile.bounds:
            self.add_tile_bounds(tile)
            
    def setup_actor_properties(self, actor: vtk.vtkActor):
        """设置演员材质属性"""
        prop = actor.GetProperty()
        
        # 根据渲染模式设置
        if self.render_mode == 'wireframe':
            prop.SetRepresentationToWireframe()
            prop.SetColor(0.8, 0.8, 0.8)
            prop.SetLineWidth(1.0)
        elif self.render_mode == 'points':
            prop.SetRepresentationToPoints()
            prop.SetColor(1.0, 1.0, 1.0)
            prop.SetPointSize(2.0)
        else:  # solid
            prop.SetRepresentationToSurface()
            prop.SetColor(0.7, 0.8, 0.9)  # 浅蓝色
            
        # 材质属性
        prop.SetAmbient(0.3)
        prop.SetDiffuse(0.7)
        prop.SetSpecular(0.3)
        prop.SetSpecularPower(30)
        
        # 边缘线（如果启用）
        if self.show_wireframe:
            prop.EdgeVisibilityOn()
            prop.SetEdgeColor(0.2, 0.2, 0.2)
            
    def add_tile_bounds(self, tile: TileNode):
        """添加瓦片边界框"""
        if not tile.bounds:
            return
            
        bounds = tile.bounds
        
        # 创建边界框
        bbox = vtk.vtkOutlineSource()
        bbox.SetBounds(
            bounds.min_x, bounds.max_x,
            bounds.min_y, bounds.max_y,
            bounds.min_z, bounds.max_z
        )
        
        # 创建映射器和演员
        mapper = vtk.vtkPolyDataMapper()
        mapper.SetInputConnection(bbox.GetOutputPort())
        
        actor = vtk.vtkActor()
        actor.SetMapper(mapper)
        actor.GetProperty().SetColor(1.0, 0.0, 0.0)  # 红色边界框
        actor.GetProperty().SetLineWidth(2.0)
        
        # 添加到场景
        self.renderer.AddActor(actor)
        self.bounds_actors.append(actor)
        
    def clear_scene(self):
        """清空场景"""
        # 移除瓦片演员
        for actor in self.tile_actors.values():
            self.renderer.RemoveActor(actor)
        self.tile_actors.clear()
        
        # 移除边界框演员
        for actor in self.bounds_actors:
            self.renderer.RemoveActor(actor)
        self.bounds_actors.clear()
        
        # 重置统计
        self.triangle_count = 0
        self.vertex_count = 0
        
    def set_render_mode(self, mode: str):
        """设置渲染模式"""
        self.render_mode = mode
        
        # 更新所有演员的渲染模式
        for actor in self.tile_actors.values():
            self.setup_actor_properties(actor)
            
        self.render()
        
    def set_wireframe(self, enabled: bool):
        """设置线框显示"""
        self.show_wireframe = enabled
        
        for actor in self.tile_actors.values():
            prop = actor.GetProperty()
            if enabled:
                prop.EdgeVisibilityOn()
                prop.SetEdgeColor(0.2, 0.2, 0.2)
            else:
                prop.EdgeVisibilityOff()
                
        self.render()
        
    def set_show_bounds(self, enabled: bool):
        """设置边界框显示"""
        self.show_bounds = enabled
        
        if not enabled:
            # 移除现有边界框
            for actor in self.bounds_actors:
                self.renderer.RemoveActor(actor)
            self.bounds_actors.clear()
        else:
            # 重新添加边界框
            if self.tileset:
                self.reload_tileset()
                
        self.render()
        
    def set_show_normals(self, enabled: bool):
        """设置法线显示"""
        self.show_normals = enabled
        # 法线显示功能待实现
        
    def set_lod_level(self, level: int):
        """设置LOD级别"""
        self.lod_level = level
        
        # 重新加载瓦片
        if self.tileset:
            self.reload_tileset()
            
    def reload_tileset(self):
        """重新加载瓦片集"""
        if self.tileset:
            self.load_tileset(self.tileset)
            
    def get_camera_position(self) -> Tuple[float, float, float]:
        """获取相机位置"""
        camera = self.renderer.GetActiveCamera()
        pos = camera.GetPosition()
        return (pos[0], pos[1], pos[2])
        
    def get_camera_direction(self) -> Tuple[float, float, float]:
        """获取相机方向"""
        camera = self.renderer.GetActiveCamera()
        focal_point = camera.GetFocalPoint()
        position = camera.GetPosition()
        
        direction = (
            focal_point[0] - position[0],
            focal_point[1] - position[1],
            focal_point[2] - position[2]
        )
        
        # 归一化
        if NUMPY_AVAILABLE:
            direction = np.array(direction)
            length = np.linalg.norm(direction)
            if length > 0:
                direction = direction / length
            return tuple(direction)
        else:
            length = (direction[0]**2 + direction[1]**2 + direction[2]**2)**0.5
            if length > 0:
                direction = (
                    direction[0] / length,
                    direction[1] / length,
                    direction[2] / length
                )
            return direction
            
    def reset_camera(self):
        """重置相机"""
        self.renderer.ResetCamera()
        camera = self.renderer.GetActiveCamera()
        camera.SetPosition(100, 100, 100)
        camera.SetFocalPoint(0, 0, 0)
        camera.SetViewUp(0, 0, 1)
        self.render()
        
    def fit_to_window(self):
        """适合窗口"""
        self.renderer.ResetCamera()
        self.render()
        
    def render(self):
        """执行渲染"""
        if self.render_window:
            self.render_window.Render()
            
        # 更新FPS
        self.update_fps()
        
    def update_fps(self):
        """更新FPS统计"""
        import time
        current_time = time.time()
        
        if self.last_fps_time == 0:
            self.last_fps_time = current_time
            
        self.fps_counter += 1
        
        if current_time - self.last_fps_time >= 1.0:  # 每秒更新一次
            self.current_fps = self.fps_counter
            self.fps_counter = 0
            self.last_fps_time = current_time
            
    def get_performance_stats(self) -> Dict[str, Any]:
        """获取性能统计"""
        return {
            'fps': self.current_fps,
            'triangles': self.triangle_count,
            'vertices': self.vertex_count,
            'memory_usage': self.estimate_memory_usage()
        }
        
    def estimate_memory_usage(self) -> float:
        """估计内存使用量(MB)"""
        # 粗略估计：每个顶点36字节(位置+法线+纹理坐标)
        vertex_memory = self.vertex_count * 36
        # 每个三角形12字节(3个索引)
        triangle_memory = self.triangle_count * 12
        
        total_bytes = vertex_memory + triangle_memory
        return total_bytes / (1024 * 1024)  # 转换为MB
        
    def export_scene(self, filename: str, format: str = 'obj'):
        """导出场景"""
        if format.lower() == 'obj':
            # 导出OBJ格式
            exporter = vtk.vtkOBJExporter()
            exporter.SetRenderWindow(self.render_window)
            exporter.SetFilePrefix(filename.replace('.obj', ''))
            exporter.Write()
        elif format.lower() == 'ply':
            # 导出PLY格式需要合并所有几何
            append_filter = vtk.vtkAppendPolyData()
            
            for actor in self.tile_actors.values():
                mapper = actor.GetMapper()
                if mapper:
                    append_filter.AddInputData(mapper.GetInput())
                    
            append_filter.Update()
            
            writer = vtk.vtkPLYWriter()
            writer.SetFileName(filename)
            writer.SetInputData(append_filter.GetOutput())
            writer.Write()
            
    def screenshot(self, filename: str):
        """截图"""
        window_to_image = vtk.vtkWindowToImageFilter()
        window_to_image.SetInput(self.render_window)
        window_to_image.Update()
        
        writer = vtk.vtkPNGWriter()
        writer.SetFileName(filename)
        writer.SetInputConnection(window_to_image.GetOutputPort())
        writer.Write()


# 备用简单渲染器（当VTK不可用时）
class SimpleRenderer:
    """简单的备用渲染器"""
    
    def __init__(self, parent_widget: QWidget):
        self.parent_widget = parent_widget
        self.tileset = None
        
        # 创建简单的标签显示
        from PyQt6.QtWidgets import QLabel
        from PyQt6.QtCore import Qt
        
        self.label = QLabel("VTK渲染器不可用\n\n请安装VTK:\npip install vtk")
        self.label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.label.setStyleSheet("""
            QLabel {
                color: #cccccc;
                font-size: 14px;
                background-color: #2b2b2b;
                border: 2px dashed #666666;
                border-radius: 10px;
                padding: 20px;
            }
        """)
        
        layout = QVBoxLayout(parent_widget)
        layout.addWidget(self.label)
        parent_widget.setLayout(layout)
        
    def load_tileset(self, tileset):
        self.tileset = tileset
        if hasattr(tileset, 'tile_count'):
            self.label.setText(f"瓦片集已加载\n\n瓦片数量: {tileset.tile_count}\n\n需要VTK进行3D渲染")
        
    def set_render_mode(self, mode): pass
    def set_wireframe(self, enabled): pass
    def set_show_bounds(self, enabled): pass
    def set_show_normals(self, enabled): pass
    def set_lod_level(self, level): pass
    def reset_camera(self): pass
    def fit_to_window(self): pass
    def render(self): pass
    
    def get_performance_stats(self):
        return {'fps': 0, 'triangles': 0, 'vertices': 0, 'memory_usage': 0.0}


# 根据VTK可用性选择渲染器
if VTK_AVAILABLE:
    DefaultRenderer = VTKTileRenderer
else:
    DefaultRenderer = SimpleRenderer