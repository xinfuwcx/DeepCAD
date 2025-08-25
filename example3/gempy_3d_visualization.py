"""
GemPy 3D可视化模块 - 专业3D地质模型渲染
GemPy 3D Visualization Module - Professional 3D geological model rendering
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
import matplotlib.patches as patches
from typing import Dict, List, Tuple, Optional, Any
import warnings
warnings.filterwarnings('ignore')

try:
    import pyvista as pv
    import vtk
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    print("Warning: PyVista not available, 3D visualization limited")

try:
    import gempy as gp
    GEMPY_AVAILABLE = True
except ImportError:
    GEMPY_AVAILABLE = False

from PyQt6.QtWidgets import *
from PyQt6.QtCore import *
from PyQt6.QtGui import *

class GemPy3DVisualizer:
    """GemPy专业3D可视化器"""
    
    def __init__(self):
        """初始化3D可视化器"""
        self.plotter = None
        self.current_model = None
        self.current_solution = None
        self.mesh_objects = {}
        self.color_schemes = self._initialize_color_schemes()
        
        if PYVISTA_AVAILABLE:
            # 设置PyVista的默认主题
            pv.set_plot_theme("dark")
        
    def _initialize_color_schemes(self) -> Dict[str, Dict]:
        """初始化颜色方案"""
        return {
            'geological': {
                'Layer_1': '#8B4513',      # 棕色 - 表土层
                'Layer_2': '#DAA520',      # 金色 - 砂岩层
                'Layer_3': '#4682B4',      # 钢蓝色 - 页岩层
                'Layer_4': '#2E8B57',      # 海绿色 - 石灰岩层
                'Basement': '#696969',      # 深灰色 - 基岩
                'Fault_1': '#FF4500',      # 红橙色 - 断层
                'Fault_2': '#DC143C'       # 深红色 - 断层
            },
            'geophysical': {
                'high_density': '#8B0000',      # 深红色 - 高密度
                'medium_density': '#FFD700',    # 金色 - 中密度
                'low_density': '#00CED1',       # 深蓝绿 - 低密度
                'very_low_density': '#0000FF'   # 蓝色 - 极低密度
            },
            'temperature': {
                'hot': '#FF0000',          # 红色 - 高温
                'warm': '#FF8C00',         # 深橙色 - 温热
                'cool': '#1E90FF',         # 道奇蓝 - 凉爽
                'cold': '#0000CD'          # 中蓝色 - 低温
            }
        }
    
    def create_3d_plotter(self, window_size: Tuple[int, int] = (1200, 800)) -> bool:
        """
        创建3D绘图器
        
        Args:
            window_size: 窗口大小 (width, height)
        """
        try:
            if not PYVISTA_AVAILABLE:
                print("❌ PyVista不可用，无法创建3D绘图器")
                return False
            
            print("🎨 创建3D可视化绘图器...")
            
            # 创建PyVista绘图器
            self.plotter = pv.Plotter(
                window_size=window_size,
                title="GemPy Professional 3D Geological Visualization",
                lighting='three lights'
            )
            
            # 设置背景渐变
            self.plotter.background_color = '#1e1e1e'
            self.plotter.set_background('#1e1e1e', top='#2d3748')
            
            # 添加坐标轴
            self.plotter.show_axes()
            
            # 设置相机
            self.plotter.camera.zoom(1.2)
            
            print("✅ 3D绘图器创建成功")
            return True
            
        except Exception as e:
            print(f"❌ 3D绘图器创建失败: {str(e)}")
            return False
    
    def visualize_geological_model(self, geo_model, solution, 
                                 show_surfaces: bool = True,
                                 show_data_points: bool = True,
                                 show_orientations: bool = True) -> bool:
        """
        可视化地质模型
        
        Args:
            geo_model: GemPy地质模型
            solution: 模型计算结果
            show_surfaces: 是否显示地质界面
            show_data_points: 是否显示数据点
            show_orientations: 是否显示方向数据
        """
        try:
            if not PYVISTA_AVAILABLE or self.plotter is None:
                print("❌ 3D绘图器未初始化")
                return False
            
            print("🏔️ 开始可视化地质模型...")
            
            # 保存当前模型
            self.current_model = geo_model
            self.current_solution = solution
            
            # 清除之前的对象
            self.plotter.clear()
            
            # 可视化地质界面
            if show_surfaces:
                self._visualize_geological_surfaces(geo_model, solution)
            
            # 可视化数据点
            if show_data_points:
                self._visualize_surface_points(geo_model)
            
            # 可视化方向数据
            if show_orientations:
                self._visualize_orientations(geo_model)
            
            # 添加图例
            self._add_geological_legend()
            
            # 设置视图
            self._setup_optimal_view()
            
            print("✅ 地质模型可视化完成")
            return True
            
        except Exception as e:
            print(f"❌ 地质模型可视化失败: {str(e)}")
            return False
    
    def _visualize_geological_surfaces(self, geo_model, solution):
        """可视化地质界面"""
        try:
            # 获取模型网格
            regular_grid = geo_model.grid.regular_grid
            extent = regular_grid.extent
            resolution = regular_grid.resolution
            
            # 创建3D网格
            x = np.linspace(extent[0], extent[1], resolution[0])
            y = np.linspace(extent[2], extent[3], resolution[1])
            z = np.linspace(extent[4], extent[5], resolution[2])
            
            # 获取岩性块数据
            lith_block = solution.lith_block.reshape(resolution)
            
            # 创建PyVista结构化网格
            grid = pv.StructuredGrid()
            xx, yy, zz = np.meshgrid(x, y, z, indexing='ij')
            grid.points = np.c_[xx.ravel(), yy.ravel(), zz.ravel()]
            grid.dimensions = [len(x), len(y), len(z)]
            
            # 添加岩性数据
            grid.cell_data['lithology'] = lith_block.ravel()
            
            # 创建等值面
            unique_lithologies = np.unique(lith_block)
            
            for i, lith_id in enumerate(unique_lithologies):
                if lith_id > 0:  # 跳过背景
                    # 创建等值面
                    contour = grid.contour([lith_id - 0.5, lith_id + 0.5])
                    
                    if contour.n_points > 0:
                        # 获取颜色
                        formation_name = f'Layer_{int(lith_id)}'
                        color = self.color_schemes['geological'].get(
                            formation_name, '#808080'
                        )
                        
                        # 添加到绘图器
                        self.plotter.add_mesh(
                            contour,
                            color=color,
                            opacity=0.7,
                            name=formation_name,
                            show_edges=True,
                            edge_color='white',
                            line_width=0.5
                        )
            
        except Exception as e:
            print(f"❌ 地质界面可视化失败: {str(e)}")
    
    def _visualize_surface_points(self, geo_model):
        """可视化地层接触点"""
        try:
            surface_points = geo_model.surface_points.df
            
            if not surface_points.empty:
                # 创建点云
                points = surface_points[['X', 'Y', 'Z']].values
                point_cloud = pv.PolyData(points)
                
                # 根据地层分配颜色
                formations = surface_points['surface'].values
                colors = []
                
                for formation in formations:
                    color = self.color_schemes['geological'].get(formation, '#FFFFFF')
                    # 转换为RGB
                    rgb = [int(color[i:i+2], 16) for i in (1, 3, 5)]
                    colors.append(rgb)
                
                point_cloud['colors'] = np.array(colors)
                
                # 添加到绘图器
                self.plotter.add_mesh(
                    point_cloud,
                    scalars='colors',
                    rgb=True,
                    point_size=12,
                    name='surface_points',
                    render_points_as_spheres=True
                )
                
        except Exception as e:
            print(f"❌ 地层接触点可视化失败: {str(e)}")
    
    def _visualize_orientations(self, geo_model):
        """可视化方向数据"""
        try:
            orientations = geo_model.orientations.df
            
            if not orientations.empty:
                for _, row in orientations.iterrows():
                    # 计算方向向量
                    azimuth = np.radians(row['azimuth'])
                    dip = np.radians(row['dip'])
                    
                    # 转换为笛卡尔坐标
                    dx = np.cos(azimuth) * np.cos(dip) * 50  # 缩放因子
                    dy = np.sin(azimuth) * np.cos(dip) * 50
                    dz = -np.sin(dip) * 50
                    
                    # 创建箭头
                    start = [row['X'], row['Y'], row['Z']]
                    direction = [dx, dy, dz]
                    
                    arrow = pv.Arrow(
                        start=start,
                        direction=direction,
                        scale=1.0
                    )
                    
                    # 添加到绘图器
                    self.plotter.add_mesh(
                        arrow,
                        color='yellow',
                        opacity=0.8,
                        name=f'orientation_{row.name}'
                    )
                    
        except Exception as e:
            print(f"❌ 方向数据可视化失败: {str(e)}")
    
    def visualize_geophysical_field(self, field_data: np.ndarray, 
                                   field_type: str = 'gravity',
                                   extent: List[float] = None) -> bool:
        """
        可视化地球物理场数据
        
        Args:
            field_data: 地球物理场数据
            field_type: 场数据类型 ('gravity', 'magnetic', 'electrical')
            extent: 数据范围
        """
        try:
            if not PYVISTA_AVAILABLE or self.plotter is None:
                print("❌ 3D绘图器未初始化")
                return False
            
            print(f"⚡ 可视化{field_type}场数据...")
            
            # 创建2D网格表面（假设是地表数据）
            if extent is None:
                extent = [0, 1000, 0, 1000, 0, 0]  # 默认范围
            
            x = np.linspace(extent[0], extent[1], field_data.shape[0])
            y = np.linspace(extent[2], extent[3], field_data.shape[1])
            xx, yy = np.meshgrid(x, y, indexing='ij')
            
            # 创建地表网格
            surface_points = np.c_[
                xx.ravel(),
                yy.ravel(),
                np.full(xx.size, extent[5])  # 地表高程
            ]
            
            surface = pv.StructuredGrid()
            surface.points = surface_points
            surface.dimensions = [len(x), len(y), 1]
            
            # 添加场数据
            surface.point_data[field_type] = field_data.ravel()
            
            # 选择颜色映射
            if field_type == 'gravity':
                cmap = 'RdBu_r'  # 红蓝色图，适合重力异常
            elif field_type == 'magnetic':
                cmap = 'seismic'  # 地震色图，适合磁异常
            else:
                cmap = 'viridis'  # 默认色图
            
            # 添加到绘图器
            self.plotter.add_mesh(
                surface,
                scalars=field_type,
                cmap=cmap,
                opacity=0.8,
                name=f'{field_type}_field',
                show_scalar_bar=True
            )
            
            print(f"✅ {field_type}场可视化完成")
            return True
            
        except Exception as e:
            print(f"❌ 地球物理场可视化失败: {str(e)}")
            return False
    
    def create_cross_sections(self, section_coords: Dict[str, List]) -> Dict[str, np.ndarray]:
        """
        创建地质剖面图
        
        Args:
            section_coords: 剖面坐标
        """
        try:
            if self.current_solution is None:
                print("❌ 没有可用的模型结果")
                return {}
            
            print("📊 创建地质剖面图...")
            
            sections = {}
            lith_block = self.current_solution.lith_block
            resolution = self.current_model.grid.regular_grid.resolution
            lith_3d = lith_block.reshape(resolution)
            
            # XY剖面（水平切片）
            if 'XY' in section_coords:
                for z_idx in section_coords['XY']:
                    if 0 <= z_idx < resolution[2]:
                        section = lith_3d[:, :, z_idx]
                        sections[f'XY_z{z_idx}'] = section
            
            # XZ剖面（南北向切片）
            if 'XZ' in section_coords:
                for y_idx in section_coords['XZ']:
                    if 0 <= y_idx < resolution[1]:
                        section = lith_3d[:, y_idx, :]
                        sections[f'XZ_y{y_idx}'] = section
            
            # YZ剖面（东西向切片）
            if 'YZ' in section_coords:
                for x_idx in section_coords['YZ']:
                    if 0 <= x_idx < resolution[0]:
                        section = lith_3d[x_idx, :, :]
                        sections[f'YZ_x{x_idx}'] = section
            
            print(f"✅ 创建了 {len(sections)} 个剖面")
            return sections
            
        except Exception as e:
            print(f"❌ 剖面创建失败: {str(e)}")
            return {}
    
    def _add_geological_legend(self):
        """添加地质图例"""
        try:
            if self.current_model is None:
                return
            
            # 获取地层信息
            formations = self.current_model.surfaces.df['surface'].unique()
            
            legend_text = "地质单元:\n"
            for formation in formations:
                color = self.color_schemes['geological'].get(formation, '#808080')
                legend_text += f"■ {formation}\n"
            
            # 添加文本标签
            self.plotter.add_text(
                legend_text,
                position='upper_right',
                font_size=10,
                color='white'
            )
            
        except Exception as e:
            print(f"❌ 图例添加失败: {str(e)}")
    
    def _setup_optimal_view(self):
        """设置最佳视角"""
        try:
            if self.plotter is None:
                return
            
            # 设置等轴视图
            self.plotter.camera.zoom(1.0)
            
            # 设置视角
            self.plotter.camera.elevation = 30
            self.plotter.camera.azimuth = 45
            
            # 自动调整视图范围
            self.plotter.reset_camera()
            
        except Exception as e:
            print(f"❌ 视图设置失败: {str(e)}")
    
    def export_visualization(self, output_path: str, format: str = 'png',
                           resolution: Tuple[int, int] = (1920, 1080)) -> bool:
        """
        导出可视化结果
        
        Args:
            output_path: 输出路径
            format: 输出格式 ('png', 'jpg', 'svg', 'html')
            resolution: 输出分辨率
        """
        try:
            if not PYVISTA_AVAILABLE or self.plotter is None:
                print("❌ 3D绘图器未初始化")
                return False
            
            print(f"📸 导出可视化结果: {output_path}")
            
            # 设置输出分辨率
            self.plotter.window_size = resolution
            
            if format.lower() in ['png', 'jpg', 'jpeg']:
                # 截图导出
                self.plotter.screenshot(output_path)
            elif format.lower() == 'html':
                # 导出交互式HTML
                self.plotter.export_html(output_path)
            else:
                print(f"❌ 不支持的输出格式: {format}")
                return False
            
            print("✅ 可视化结果导出成功")
            return True
            
        except Exception as e:
            print(f"❌ 可视化导出失败: {str(e)}")
            return False
    
    def show_interactive(self):
        """显示交互式3D视图"""
        try:
            if not PYVISTA_AVAILABLE or self.plotter is None:
                print("❌ 3D绘图器未初始化")
                return
            
            print("🎮 启动交互式3D视图...")
            
            # 添加控制说明
            controls_text = """
            3D视图控制:
            • 鼠标左键: 旋转
            • 鼠标右键: 缩放
            • 鼠标中键: 平移
            • R键: 重置视图
            • Q键: 退出
            """
            
            self.plotter.add_text(
                controls_text,
                position='lower_left',
                font_size=8,
                color='lightgray'
            )
            
            # 显示窗口
            self.plotter.show()
            
        except Exception as e:
            print(f"❌ 交互式视图显示失败: {str(e)}")
    
    def close_visualization(self):
        """关闭可视化窗口"""
        try:
            if self.plotter is not None:
                self.plotter.close()
                self.plotter = None
                print("✅ 3D可视化窗口已关闭")
                
        except Exception as e:
            print(f"❌ 关闭可视化失败: {str(e)}")


class GemPy2DVisualizer:
    """GemPy 2D剖面可视化器"""
    
    def __init__(self):
        """初始化2D可视化器"""
        self.figure = None
        self.axes = None
        self.color_schemes = self._initialize_color_schemes()
    
    def _initialize_color_schemes(self):
        """初始化颜色方案"""
        return {
            'geological': ['#8B4513', '#DAA520', '#4682B4', '#2E8B57', '#696969'],
            'geophysical': ['#0000FF', '#00CED1', '#FFD700', '#FF4500', '#8B0000']
        }
    
    def plot_cross_section(self, section_data: np.ndarray, 
                          section_type: str = 'XZ',
                          extent: List[float] = None,
                          title: str = "Geological Cross-Section") -> bool:
        """
        绘制地质剖面图
        
        Args:
            section_data: 剖面数据
            section_type: 剖面类型 ('XY', 'XZ', 'YZ')
            extent: 空间范围
            title: 图表标题
        """
        try:
            print(f"📊 绘制{section_type}剖面图...")
            
            # 创建图形
            plt.style.use('dark_background')
            fig, ax = plt.subplots(figsize=(12, 8))
            
            # 创建颜色映射
            unique_values = np.unique(section_data)
            colors = self.color_schemes['geological'][:len(unique_values)]
            cmap = ListedColormap(colors)
            
            # 绘制剖面
            im = ax.imshow(
                section_data.T,  # 转置以正确显示
                cmap=cmap,
                aspect='equal',
                origin='lower',
                extent=extent,
                interpolation='nearest'
            )
            
            # 设置标签
            if section_type == 'XY':
                ax.set_xlabel('X (m)', fontsize=12)
                ax.set_ylabel('Y (m)', fontsize=12)
            elif section_type == 'XZ':
                ax.set_xlabel('X (m)', fontsize=12)
                ax.set_ylabel('Z (m)', fontsize=12)
            elif section_type == 'YZ':
                ax.set_xlabel('Y (m)', fontsize=12)
                ax.set_ylabel('Z (m)', fontsize=12)
            
            ax.set_title(title, fontsize=14, fontweight='bold')
            
            # 添加颜色条
            cbar = plt.colorbar(im, ax=ax)
            cbar.set_label('岩性单元', fontsize=12)
            
            # 添加网格
            ax.grid(True, alpha=0.3)
            
            plt.tight_layout()
            plt.show()
            
            print("✅ 剖面图绘制完成")
            return True
            
        except Exception as e:
            print(f"❌ 剖面图绘制失败: {str(e)}")
            return False


# Qt集成的3D视图组件
class QtGemPy3DWidget(QWidget):
    """Qt集成的GemPy 3D可视化组件"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.visualizer = GemPy3DVisualizer()
        self.setup_ui()
    
    def setup_ui(self):
        """设置UI界面"""
        layout = QVBoxLayout(self)
        
        # 工具栏
        toolbar = QHBoxLayout()
        
        # 可视化控制按钮
        self.show_surfaces_btn = QPushButton("显示地质界面")
        self.show_surfaces_btn.setCheckable(True)
        self.show_surfaces_btn.setChecked(True)
        
        self.show_points_btn = QPushButton("显示数据点")
        self.show_points_btn.setCheckable(True)
        self.show_points_btn.setChecked(True)
        
        self.show_orientations_btn = QPushButton("显示方向数据")
        self.show_orientations_btn.setCheckable(True)
        self.show_orientations_btn.setChecked(True)
        
        # 导出按钮
        self.export_btn = QPushButton("导出图像")
        self.export_btn.clicked.connect(self.export_visualization)
        
        toolbar.addWidget(self.show_surfaces_btn)
        toolbar.addWidget(self.show_points_btn)
        toolbar.addWidget(self.show_orientations_btn)
        toolbar.addStretch()
        toolbar.addWidget(self.export_btn)
        
        layout.addLayout(toolbar)
        
        # 3D视图区域占位符
        self.view_placeholder = QLabel("3D可视化视图\n请加载地质模型数据")
        self.view_placeholder.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.view_placeholder.setStyleSheet("""
            QLabel {
                border: 2px dashed #666;
                background-color: #2d3748;
                color: #a0aec0;
                font-size: 14px;
                min-height: 400px;
            }
        """)
        
        layout.addWidget(self.view_placeholder)
    
    def update_visualization(self, geo_model, solution):
        """更新3D可视化"""
        try:
            if not PYVISTA_AVAILABLE:
                self.view_placeholder.setText("PyVista不可用\n无法显示3D可视化")
                return
            
            # 创建3D绘图器
            if not self.visualizer.create_3d_plotter():
                return
            
            # 可视化地质模型
            success = self.visualizer.visualize_geological_model(
                geo_model, 
                solution,
                show_surfaces=self.show_surfaces_btn.isChecked(),
                show_data_points=self.show_points_btn.isChecked(),
                show_orientations=self.show_orientations_btn.isChecked()
            )
            
            if success:
                self.view_placeholder.setText("3D可视化加载成功\n请查看弹出的3D窗口")
            else:
                self.view_placeholder.setText("3D可视化加载失败\n请检查数据格式")
                
        except Exception as e:
            self.view_placeholder.setText(f"3D可视化错误:\n{str(e)}")
    
    def export_visualization(self):
        """导出可视化结果"""
        try:
            file_dialog = QFileDialog()
            file_path, _ = file_dialog.getSaveFileName(
                self, "导出3D可视化", "", 
                "PNG图像 (*.png);;JPEG图像 (*.jpg);;HTML文件 (*.html)"
            )
            
            if file_path:
                success = self.visualizer.export_visualization(file_path)
                if success:
                    QMessageBox.information(self, "导出成功", f"文件已保存到: {file_path}")
                else:
                    QMessageBox.warning(self, "导出失败", "无法导出可视化结果")
                    
        except Exception as e:
            QMessageBox.critical(self, "导出错误", f"导出失败: {str(e)}")


if __name__ == "__main__":
    # 测试3D可视化器
    print("=== GemPy 3D可视化测试 ===")
    
    if PYVISTA_AVAILABLE:
        visualizer = GemPy3DVisualizer()
        
        if visualizer.create_3d_plotter():
            # 创建测试数据
            test_data = np.random.rand(50, 50) * 100
            extent = [0, 1000, 0, 1000, 0, 0]
            
            # 测试地球物理场可视化
            visualizer.visualize_geophysical_field(test_data, 'gravity', extent)
            
            print("测试完成，请查看3D窗口")
            # visualizer.show_interactive()
    else:
        print("PyVista不可用，跳过3D测试")
    
    print("=== 测试完成 ===")