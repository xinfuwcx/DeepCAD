#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
后处理模块 - PostProcessor
负责云图显示、动画播放、详细结果展示
"""

import sys
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QFrame, QLabel
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QObject

# 添加项目路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

try:
    import pyvista as pv
    from pyvistaqt import QtInteractor
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    print("警告: PyVista不可用，后处理可视化将受限")


class AnimationController(QObject):
    """动画控制器"""
    
    frame_changed = pyqtSignal(int)
    animation_finished = pyqtSignal()
    
    def __init__(self, total_frames: int = 100):
        super().__init__()
        self.total_frames = total_frames
        self.current_frame = 0
        self.is_playing = False
        self.is_looping = True
        self.frame_rate = 10  # FPS
        
        # 定时器
        self.timer = QTimer()
        self.timer.timeout.connect(self.next_frame)
        
    def play(self):
        """播放动画"""
        if not self.is_playing:
            self.is_playing = True
            interval = int(1000 / self.frame_rate)  # ms
            self.timer.start(interval)
            
    def pause(self):
        """暂停动画"""
        self.is_playing = False
        self.timer.stop()
        
    def stop(self):
        """停止动画"""
        self.is_playing = False
        self.timer.stop()
        self.current_frame = 0
        self.frame_changed.emit(self.current_frame)
        
    def next_frame(self):
        """下一帧"""
        self.current_frame += 1
        
        if self.current_frame >= self.total_frames:
            if self.is_looping:
                self.current_frame = 0
            else:
                self.pause()
                self.animation_finished.emit()
                return
                
        self.frame_changed.emit(self.current_frame)
        
    def set_frame(self, frame: int):
        """设置当前帧"""
        if 0 <= frame < self.total_frames:
            self.current_frame = frame
            self.frame_changed.emit(self.current_frame)
            
    def set_frame_rate(self, fps: int):
        """设置帧率"""
        self.frame_rate = max(1, min(fps, 60))
        if self.is_playing:
            interval = int(1000 / self.frame_rate)
            self.timer.setInterval(interval)


class PostProcessor:
    """后处理模块"""
    
    def __init__(self):
        self.mesh = None
        self.results_data = {}
        self.time_steps = []
        self.current_time_step = 0
        self.plotter = None
        self.viewer_widget = None

        # 显示设置
        self.show_deformed = True
        self.deformation_scale = 10.0
        self.show_contour = True
        self.show_wireframe = False
        self.current_result_type = 'displacement'
        self.current_component = 'magnitude'
        # 新增：使用StageVisible过滤显示
        self.use_stage_visible_filter = False

        # 动画控制器
        self.animation_controller = AnimationController()
        self.animation_controller.frame_changed.connect(self.update_animation_frame)
        
        self.create_viewer_widget()
        
    def create_viewer_widget(self):
        """创建3D视图组件"""
        self.viewer_widget = QWidget()
        layout = QVBoxLayout(self.viewer_widget)
        layout.setContentsMargins(0, 0, 0, 0)
        
        if PYVISTA_AVAILABLE:
            # 创建PyVista交互器
            self.plotter = QtInteractor(self.viewer_widget)
            self.plotter.setMinimumSize(600, 400)
            
            # 设置默认场景
            self.setup_default_scene()
            
            layout.addWidget(self.plotter.interactor)
            
        else:
            # 创建占位符
            placeholder = QFrame()
            placeholder.setFrameStyle(QFrame.StyledPanel)
            placeholder.setMinimumSize(600, 400)
            placeholder.setStyleSheet("""
                QFrame {
                    background-color: #f8f9fa;
                    border: 2px dashed #9C27B0;
                    border-radius: 8px;
                }
            """)
            
            label = QLabel("PyVista不可用\n后处理可视化占位符")
            label.setAlignment(Qt.AlignCenter)
            label.setStyleSheet("color: #9C27B0; font-size: 16px; font-weight: bold;")
            
            placeholder_layout = QVBoxLayout(placeholder)
            placeholder_layout.addWidget(label)
            
            layout.addWidget(placeholder)
            
    def setup_default_scene(self):
        """设置默认场景"""
        if not PYVISTA_AVAILABLE:
            return
            
        # 设置背景渐变
        self.plotter.set_background('white', top='lightgray')
        
        # 添加坐标轴
        self.plotter.show_axes()
        
        # 设置相机
        self.plotter.camera_position = 'iso'
        
        # 显示欢迎信息
        self.show_welcome_info()
        
    def show_welcome_info(self):
        """显示欢迎信息"""
        if not PYVISTA_AVAILABLE:
            return
            
        # 添加文本
        self.plotter.add_text("DeepCAD后处理模块\n等待加载结果...", 
                             position='upper_left', font_size=12, color='purple')
                             
    def get_viewer_widget(self):
        """获取3D视图组件"""
        return self.viewer_widget

    def set_analysis_results(self, model_data: Dict[str, Any], results: Dict[str, Any]):
        """直接设置分析结果数据"""
        try:
            print("设置分析结果...")
            
            # 从模型数据创建网格
            nodes = model_data.get('nodes', [])
            elements = model_data.get('elements', [])
            
            if not nodes or not elements:
                print("警告: 模型数据不完整")
                return
                
            if PYVISTA_AVAILABLE:
                # 创建网格
                self.mesh = self.create_mesh_from_model(nodes, elements)
                
                # 设置结果数据
                if 'displacement_field' in results:
                    displacement = np.array(results['displacement_field'])
                    if displacement.shape[0] == self.mesh.n_points:
                        self.time_steps = [0]  # 静力分析只有一个时间步
                        self.current_time_step = 0
                        self.results_data = {
                            0: {
                                'displacement': displacement,
                                'stress': np.array(results.get('stress_field', [])) if 'stress_field' in results else None
                            }
                        }
                        
                        print(f"成功设置结果: {len(displacement)}个节点位移")
                        
                        # 显示结果
                        self.display_results()
                    else:
                        print(f"位移数据维度不匹配: {displacement.shape[0]} vs {self.mesh.n_points}")
                        
        except Exception as e:
            print(f"设置分析结果失败: {e}")
        
    def set_analysis_results(self, model_data: Dict[str, Any], results: Dict[str, Any]):
        """直接设置分析结果数据"""
        try:
            print("设置分析结果...")
            
            # 从模型数据创建网格
            nodes = model_data.get('nodes', [])
            elements = model_data.get('elements', [])
            
            if not nodes or not elements:
                print("警告: 模型数据不完整")
                return
                
            if PYVISTA_AVAILABLE:
                # 创建网格
                self.mesh = self.create_mesh_from_model(nodes, elements)
                
                # 设置结果数据
                if 'displacement_field' in results:
                    displacement = np.array(results['displacement_field'])
                    if displacement.shape[0] == self.mesh.n_points:
                        self.time_steps = [0]  # 静力分析只有一个时间步
                        self.current_time_step = 0
                        self.results_data = {
                            0: {
                                'displacement': displacement,
                                'stress': np.array(results.get('stress_field', [])) if 'stress_field' in results else None
                            }
                        }
                        
                        print(f"成功设置结果: {len(displacement)}个节点位移")
                        
                        # 显示结果
                        self.display_results()
                    else:
                        print(f"位移数据维度不匹配: {displacement.shape[0]} vs {self.mesh.n_points}")
                        
        except Exception as e:
            print(f"设置分析结果失败: {e}")
    
    def create_mesh_from_model(self, nodes: List[Dict], elements: List[Dict]):
        """从模型数据创建PyVista网格"""
        # 提取节点坐标
        points = []
        for node in nodes:
            if isinstance(node, dict):
                x = node.get('x', 0.0)
                y = node.get('y', 0.0)
                z = node.get('z', 0.0)
                points.append([x, y, z])
        
        points = np.array(points)
        
        # 提取单元连接
        cells = []
        cell_types = []
        
        for element in elements:
            if isinstance(element, dict):
                connectivity = element.get('nodes', [])
                element_type = element.get('type', 'tetra')
                
                if len(connectivity) >= 3:
                    # 转换为0索引
                    conn = [max(0, int(n) - 1) for n in connectivity if isinstance(n, (int, str))]
                    
                    if element_type == 'tetra' and len(conn) == 4:
                        cells.extend([4] + conn)  # VTK_TETRA = 10
                        cell_types.append(10)
                    elif element_type == 'hexa' and len(conn) == 8:
                        cells.extend([8] + conn)  # VTK_HEXAHEDRON = 12
                        cell_types.append(12)
                    elif len(conn) >= 3:
                        # 默认为三角形或四边形
                        cells.extend([len(conn)] + conn)
                        cell_types.append(5 if len(conn) == 3 else 9)
        
        if cells:
            mesh = pv.UnstructuredGrid(cells, np.array(cell_types), points)
        else:
            # 创建点云
            mesh = pv.PolyData(points)
            
        return mesh

    def load_results(self, file_path: str):
        """加载结果文件"""
        try:
            file_path = Path(file_path)
            
            if not file_path.exists():
                raise FileNotFoundError(f"文件不存在: {file_path}")
                
            print(f"加载结果文件: {file_path.name}")
            
            if PYVISTA_AVAILABLE:
                # 根据文件扩展名选择读取方法
                if file_path.suffix.lower() in ['.vtk', '.vtu', '.vtp']:
                    self.mesh = pv.read(str(file_path))
                    self.extract_results_from_mesh()
                elif file_path.suffix.lower() == '.json':
                    self.load_json_results(str(file_path))
                else:
                    raise ValueError(f"不支持的文件格式: {file_path.suffix}")
                
                # 显示结果
                self.display_results()
                
            else:
                print("PyVista不可用，创建示例结果")
                self.create_sample_results()
                
        except Exception as e:
            print(f"加载结果失败: {e}")
            # 创建示例结果
            self.create_sample_results()
            
    def load_json_results(self, file_path: str):
        """加载JSON格式结果"""
        import json
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # 提取结果数据
        if 'results' in data:
            self.results_data = data['results']
            
        if 'time_steps' in data:
            self.time_steps = data['time_steps']
        else:
            self.time_steps = [0.0]
            
        # 创建示例网格
        if not self.mesh:
            self.create_sample_mesh()
            
    def extract_results_from_mesh(self):
        """从网格中提取结果数据"""
        if not self.mesh:
            return
            
        # 提取点数据
        point_arrays = self.mesh.point_data
        
        for name, data in point_arrays.items():
            if name.lower() in ['displacement', 'displacements']:
                self.results_data['displacement'] = data
            elif name.lower() in ['stress', 'stresses']:
                self.results_data['stress'] = data
            elif name.lower() in ['strain', 'strains']:
                self.results_data['strain'] = data
                
        # 如果没有时间步信息，创建单个时间步
        if not self.time_steps:
            self.time_steps = [1.0]
            
        print(f"提取到 {len(self.results_data)} 种结果类型")
        
    def create_sample_results(self):
        """创建示例结果"""
        if PYVISTA_AVAILABLE:
            # 创建示例网格
            self.mesh = pv.Cube().triangulate()
            
            # 创建示例结果数据
            n_points = self.mesh.n_points
            
            # 位移结果
            displacement = np.random.random((n_points, 3)) * 0.1
            displacement[:, 2] = -np.abs(displacement[:, 2])  # Z方向向下
            self.results_data['displacement'] = displacement
            
            # 应力结果
            stress = np.random.random(n_points) * 1000  # kPa
            self.results_data['stress'] = stress
            
            # 应变结果
            strain = stress / 30000  # 假设弹模30GPa
            self.results_data['strain'] = strain
            
            # 创建多个时间步
            self.time_steps = np.linspace(0, 1, 21)  # 21个时间步
            
            # 为每个时间步创建数据
            self.create_time_varying_results()
            
            self.display_results()
            print("创建示例结果数据")
        else:
            print("创建占位符结果")
            
    def create_sample_mesh(self):
        """创建示例网格"""
        if PYVISTA_AVAILABLE:
            # 创建更复杂的示例网格
            sphere = pv.Sphere(radius=5, center=(0, 0, 0))
            cube = pv.Cube(center=(0, 0, -3), x_length=15, y_length=15, z_length=6)
            
            # 合并几何
            self.mesh = sphere.boolean_union(cube).triangulate()
            
    def create_time_varying_results(self):
        """创建时变结果数据"""
        if not self.mesh or not self.time_steps:
            return
            
        n_points = self.mesh.n_points
        n_steps = len(self.time_steps)
        
        # 为每个时间步创建变化的结果
        time_varying_displacement = []
        time_varying_stress = []
        
        for i, t in enumerate(self.time_steps):
            # 位移随时间增长
            factor = t
            disp = self.results_data['displacement'] * factor
            time_varying_displacement.append(disp)
            
            # 应力也随时间变化
            stress = self.results_data['stress'] * (0.5 + 0.5 * factor)
            time_varying_stress.append(stress)
            
        self.results_data['displacement_time'] = time_varying_displacement
        self.results_data['stress_time'] = time_varying_stress
        
        # 更新动画控制器
        self.animation_controller.total_frames = n_steps
        
    def display_results(self):
        """显示结果"""
        if not PYVISTA_AVAILABLE or not self.mesh:
            return
            
        # 清除现有内容
        self.plotter.clear()
        
        # 重新设置场景
        self.setup_default_scene()
        
        # 获取当前时间步的数据
        current_data = self.get_current_time_step_data()
        
        # 设置网格数据
        mesh_to_plot = self.mesh.copy()
        
        # 添加变形
        if self.show_deformed and 'displacement' in current_data:
            displacement = current_data['displacement']
            if displacement.shape[1] == 3:  # 3D位移
                deformed_points = mesh_to_plot.points + displacement * self.deformation_scale
                mesh_to_plot.points = deformed_points
                
        # 添加标量场用于云图
        scalar_field = None
        scalar_name = ""
        
        if self.show_contour:
            if self.current_result_type == 'displacement' and 'displacement' in current_data:
                displacement = current_data['displacement']
                if self.current_component == 'magnitude':
                    scalar_field = np.linalg.norm(displacement, axis=1)
                    scalar_name = "位移大小 (mm)"
                elif self.current_component == 'x':
                    scalar_field = displacement[:, 0]
                    scalar_name = "X位移 (mm)"
                elif self.current_component == 'y':
                    scalar_field = displacement[:, 1]
                    scalar_name = "Y位移 (mm)"
                elif self.current_component == 'z':
                    scalar_field = displacement[:, 2]
                    scalar_name = "Z位移 (mm)"
                    
            elif self.current_result_type == 'stress' and 'stress' in current_data:
                scalar_field = current_data['stress']
                scalar_name = "应力 (kPa)"
                
            elif self.current_result_type == 'strain' and 'strain' in current_data:
                scalar_field = current_data['strain']
                scalar_name = "应变"
                
        # 添加标量场到网格
        if scalar_field is not None:
            mesh_to_plot[scalar_name] = scalar_field
            
        # StageVisible过滤（如有并启用）
        if self.use_stage_visible_filter and 'StageVisible' in mesh_to_plot.cell_data:
            try:
                import numpy as np
                mask = np.array(mesh_to_plot.cell_data['StageVisible']).astype(bool)
                # 过滤cells：使用threshold_by_cell_data需要数据在cell_data中
                mesh_to_plot = mesh_to_plot.extract_cells(mask)
            except Exception as e:
                print(f"StageVisible过滤失败: {e}")

        # 显示前：按part类型过滤（如果上层提供了material_type_map与开关）
        try:
            type_map = getattr(self, 'material_type_map', None)
            if type_map and hasattr(mesh_to_plot, 'cell_data') and 'MaterialID' in mesh_to_plot.cell_data:
                show_types = set()
                parent = None
                # 尝试从Qt层拿到复选框（可能拿不到，容错）
                if hasattr(self, 'parent') and callable(getattr(self, 'parent')):
                    parent = self.parent()
                if parent and hasattr(parent, 'show_soil_cb'):
                    if parent.show_soil_cb.isChecked(): show_types.add('soil')
                    if parent.show_concrete_cb.isChecked(): show_types.add('concrete')
                    if parent.show_steel_cb.isChecked(): show_types.add('steel')
                if show_types:
                    import numpy as np
                    mat_ids = np.array(mesh_to_plot.cell_data['MaterialID']).astype(int)
                    mask = np.array([type_map.get(int(mid)) in show_types for mid in mat_ids])
                    mesh_to_plot = mesh_to_plot.extract_cells(mask)
        except Exception as e:
            print(f"后处理按part过滤失败: {e}")

        # 显示网格
        if scalar_field is not None and self.show_contour:
            # 设置专业的彩虹色彩映射
            colormap = self.get_professional_colormap(self.current_result_type)

            # 配置专业的标尺参数
            scalar_bar_args = {
                'title': scalar_name,
                'title_font_size': 14,
                'label_font_size': 12,
                'n_labels': 8,
                'italic': False,
                'fmt': '%.3f',
                'font_family': 'arial',
                'shadow': True,
                'width': 0.08,
                'height': 0.75,
                'position_x': 0.9,
                'position_y': 0.125,
                'color': 'black',
                'background_color': 'white',
                'background_opacity': 0.8
            }
            
            # 显示云图with专业彩虹标尺
            self.plotter.add_mesh(mesh_to_plot, scalars=scalar_name, 
                                 cmap=colormap,
                                 show_edges=self.show_wireframe,
                                 edge_color='black' if self.show_wireframe else None,
                                 show_scalar_bar=True, 
                                 scalar_bar_args=scalar_bar_args,
                                 opacity=0.9)
        else:
            # 只显示几何
            representation = 'wireframe' if self.show_wireframe else 'surface'
            self.plotter.add_mesh(mesh_to_plot, show_edges=True, edge_color='black',
                                 color='lightblue', opacity=0.8, representation=representation)
                                 
        # 显示信息
        info_text = self.get_display_info()
        self.plotter.add_text(info_text, position='upper_right', font_size=10, color='blue')
        
        # 自动调整视图
        self.plotter.reset_camera()
        
    def get_current_time_step_data(self) -> Dict[str, np.ndarray]:
        """获取当前时间步的数据"""
        current_data = {}
        
        # 如果有时变数据
        if 'displacement_time' in self.results_data:
            current_data['displacement'] = self.results_data['displacement_time'][self.current_time_step]
        elif 'displacement' in self.results_data:
            current_data['displacement'] = self.results_data['displacement']
            
        if 'stress_time' in self.results_data:
            current_data['stress'] = self.results_data['stress_time'][self.current_time_step]
        elif 'stress' in self.results_data:
            current_data['stress'] = self.results_data['stress']
            
        if 'strain_time' in self.results_data:
            current_data['strain'] = self.results_data['strain_time'][self.current_time_step]
        elif 'strain' in self.results_data:
            current_data['strain'] = self.results_data['strain']
            
        # 兼容新的单步结果格式
        if not current_data and self.current_time_step in self.results_data:
            return self.results_data[self.current_time_step]

        return current_data
    
    def get_professional_colormap(self, result_type: str) -> str:
        """根据结果类型获取专业的色彩映射"""
        colormap_mapping = {
            'displacement': 'rainbow',      # 位移：彩虹色谱
            'stress': 'plasma',            # 应力：等离子色谱  
            'strain': 'viridis',           # 应变：绿蓝色谱
            'pressure': 'coolwarm',        # 压力：冷暖色谱
            'temperature': 'hot',          # 温度：热色谱
            'velocity': 'jet'              # 速度：喷射色谱
        }
        return colormap_mapping.get(result_type, 'rainbow')
        
    def get_display_info(self) -> str:
        """获取显示信息"""
        if not self.mesh:
            return "无结果数据"
            
        info_lines = [
            f"节点数: {self.mesh.n_points}",
            f"单元数: {self.mesh.n_cells}",
        ]
        
        if self.time_steps:
            current_time = self.time_steps[self.current_time_step]
            info_lines.append(f"时间: {current_time:.3f}s")
            info_lines.append(f"步骤: {self.current_time_step + 1}/{len(self.time_steps)}")
            
        if self.show_deformed:
            info_lines.append(f"变形比例: {self.deformation_scale:.1f}x")
            
        return "\n".join(info_lines)
        
    def set_result_type(self, result_type: str):
        """设置结果类型"""
        self.current_result_type = result_type
        self.display_results()
        
    def set_component(self, component: str):
        """设置分量"""
        self.current_component = component
        self.display_results()
        
    def set_time_step(self, time_step: int):
        """设置时间步"""
        if 0 <= time_step < len(self.time_steps):
            self.current_time_step = time_step
            self.display_results()
            
    def set_deformation_scale(self, scale: float):
        """设置变形比例"""
        self.deformation_scale = scale
        if self.show_deformed:
            self.display_results()
            
    def set_show_deformed(self, show: bool):
        """设置是否显示变形"""
        self.show_deformed = show
        self.display_results()
        
    def set_show_contour(self, show: bool):
        """设置是否显示云图"""
        self.show_contour = show
        self.display_results()
        
    def set_show_wireframe(self, show: bool):
        """设置是否显示线框"""
        self.show_wireframe = show
        self.display_results()
        
    def play_animation(self):
        """播放动画"""
        if len(self.time_steps) > 1:
            self.animation_controller.play()
            print("开始播放动画")
        else:
            print("没有足够的时间步用于动画")
            
    def pause_animation(self):
        """暂停动画"""
        self.animation_controller.pause()
        print("动画已暂停")
        
    def stop_animation(self):
        """停止动画"""
        self.animation_controller.stop()
        print("动画已停止")
        
    def update_animation_frame(self, frame: int):
        """更新动画帧"""
        if 0 <= frame < len(self.time_steps):
            self.current_time_step = frame
            self.display_results()
            
    def export_screenshot(self, file_path: str):
        """导出截图"""
        if PYVISTA_AVAILABLE and self.plotter:
            self.plotter.screenshot(file_path)
            print(f"截图已保存到: {file_path}")
            
    def export_animation(self, output_dir: str, format: str = 'gif'):
        """导出动画"""
        if not PYVISTA_AVAILABLE or len(self.time_steps) <= 1:
            print("无法导出动画")
            return
            
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # 保存每一帧
        frame_files = []
        
        for i, time_step in enumerate(self.time_steps):
            self.current_time_step = i
            self.display_results()
            
            frame_file = output_dir / f"frame_{i:04d}.png"
            self.plotter.screenshot(str(frame_file))
            frame_files.append(frame_file)
            
        print(f"导出了 {len(frame_files)} 帧到 {output_dir}")
        
        # TODO: 合成为GIF或视频
        if format == 'gif':
            self.create_gif_from_frames(frame_files, output_dir / "animation.gif")
            
    def create_gif_from_frames(self, frame_files: List[Path], output_file: Path):
        """从帧文件创建GIF"""
        try:
            from PIL import Image
            
            images = []
            for frame_file in frame_files:
                img = Image.open(frame_file)
                images.append(img)
                
            # 保存为GIF
            images[0].save(
                output_file,
                save_all=True,
                append_images=images[1:],
                duration=100,  # ms per frame
                loop=0
            )
            
            print(f"GIF动画已保存到: {output_file}")
            
            # 清理临时文件
            for frame_file in frame_files:
                frame_file.unlink()
                
        except ImportError:
            print("PIL不可用，无法创建GIF")
        except Exception as e:
            print(f"创建GIF失败: {e}")
            
    def export_data(self, file_path: str):
        """导出数据"""
        import json
        
        export_data = {
            'mesh_info': {
                'n_points': self.mesh.n_points if self.mesh else 0,
                'n_cells': self.mesh.n_cells if self.mesh else 0,
                'bounds': self.mesh.bounds.tolist() if self.mesh else []
            },
            'time_steps': self.time_steps,
            'results_types': list(self.results_data.keys()),
            'current_settings': {
                'result_type': self.current_result_type,
                'component': self.current_component,
                'deformation_scale': self.deformation_scale,
                'show_deformed': self.show_deformed,
                'show_contour': self.show_contour
            }
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)
            
        print(f"数据已导出到: {file_path}")
        
    def reset_view(self):
        """重置视图"""
        if PYVISTA_AVAILABLE and self.plotter:
            self.plotter.reset_camera()


# 测试函数
def test_postprocessor():
    """测试后处理模块"""
    from PyQt6.QtWidgets import QApplication
    from PyQt6.QtCore import QTimer
    
    app = QApplication(sys.argv)
    
    # 创建后处理器
    postprocessor = PostProcessor()
    
    # 获取视图组件
    viewer = postprocessor.get_viewer_widget()
    viewer.setWindowTitle("后处理模块测试")
    viewer.resize(800, 600)
    viewer.show()
    
    # 创建示例结果
    postprocessor.create_sample_results()
    
    # 设置不同的显示选项
    postprocessor.set_result_type('displacement')
    postprocessor.set_component('magnitude')
    postprocessor.set_deformation_scale(20.0)
    
    # 5秒后播放动画
    QTimer.singleShot(3000, postprocessor.play_animation)
    
    sys.exit(app.exec_())


if __name__ == "__main__":
    test_postprocessor()