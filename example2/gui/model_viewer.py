#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Example2 3D模型查看器
基于PyVista的现代化3D可视化组件
"""

import sys
import numpy as np
from pathlib import Path
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QFrame
from PyQt6.QtCore import Qt

# 添加项目路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

try:
    import pyvista as pv
    from pyvistaqt import QtInteractor
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    print("警告: PyVista不可用，将使用占位符")


class ModelViewer(QWidget):
    """3D模型查看器"""
    
    def __init__(self):
        super().__init__()
        self.current_mesh = None
        self.actors = []
        
        self.init_ui()
        
    def init_ui(self):
        """初始化用户界面"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        if PYVISTA_AVAILABLE:
            try:
                # 🔧 创建PyVista交互器（添加崩溃保护）
                self.plotter = QtInteractor(self)
                self.plotter.setMinimumSize(600, 400)
                
                # 🔧 添加渲染器异常保护
                self._setup_safe_interaction()
                
                # 设置默认相机和光照
                self.setup_default_scene()
                
                layout.addWidget(self.plotter.interactor)
                
            except Exception as e:
                print(f"❌ PyVista交互器创建失败: {e}")
                # 创建备用占位符
                self._create_fallback_placeholder(layout)
            
        else:
            # 创建占位符
            placeholder = QFrame()
            placeholder.setFrameStyle(QFrame.StyledPanel)
            placeholder.setMinimumSize(600, 400)
            placeholder.setStyleSheet("""
                QFrame {
                    background-color: #f8f9fa;
                    border: 2px dashed #dee2e6;
                    border-radius: 8px;
                }
            """)
            
            layout.addWidget(placeholder)
    
    def _setup_safe_interaction(self):
        """🔧 设置安全的3D交互"""
        if not PYVISTA_AVAILABLE or not hasattr(self, 'plotter'):
            return
            
        try:
            # 设置更稳定的渲染参数
            self.plotter.ren_win.SetMultiSamples(0)  # 禁用多重采样避免驱动问题
            self.plotter.ren_win.SetAAFrames(0)      # 禁用抗锯齿帧
            
            # 设置更保守的交互方式
            self.plotter.enable_trackball_style()   # 使用更稳定的trackball风格
            
        except Exception as e:
            print(f"⚠️ 3D交互设置警告: {e}")
    
    def _create_fallback_placeholder(self, layout):
        """创建备用占位符"""
        placeholder = QFrame()
        placeholder.setFrameStyle(QFrame.Shape.StyledPanel)
        placeholder.setMinimumSize(600, 400)
        placeholder.setStyleSheet("""
            QFrame {
                background-color: #f8f9fa;
                border: 2px dashed #dee2e6;
                border-radius: 8px;
            }
        """)
        layout.addWidget(placeholder)
            
    def setup_default_scene(self):
        """🔧 设置默认场景（带异常保护）"""
        if not PYVISTA_AVAILABLE or not hasattr(self, 'plotter'):
            return
            
        try:
            # 设置背景渐变
            self.plotter.set_background('white', top='lightblue')
            
            # 添加坐标轴
            self.plotter.show_axes()
            
            # 设置相机
            self.plotter.camera_position = 'isometric'
            
            # 添加网格
            self.add_ground_grid()
            
        except Exception as e:
            print(f"⚠️ 默认场景设置失败: {e}")
            # 尝试最基本的设置
            try:
                self.plotter.set_background('white')
            except:
                pass
        
    def add_ground_grid(self):
        """🔧 添加地面网格（带异常保护）"""
        if not PYVISTA_AVAILABLE or not hasattr(self, 'plotter'):
            return
            
        try:
            # 创建地面网格
            grid = pv.Plane(center=(0, 0, 0), direction=(0, 0, 1), 
                           i_size=100, j_size=100, i_resolution=20, j_resolution=20)
            
            self.plotter.add_mesh(grid, color='lightgray', opacity=0.3, 
                                 show_edges=True, line_width=0.5)
        except Exception as e:
            print(f"⚠️ 地面网格添加失败: {e}")
    
    def safe_clear_scene(self):
        """🔧 安全清除场景"""
        if not PYVISTA_AVAILABLE or not hasattr(self, 'plotter'):
            return
        
        try:
            self.plotter.clear()
        except Exception as e:
            print(f"⚠️ 场景清除失败: {e}")
            # 尝试备用清除方法
            try:
                self.plotter.remove_all_lights()
                for actor in self.actors:
                    try:
                        self.plotter.remove_actor(actor)
                    except:
                        pass
                self.actors.clear()
            except:
                pass
        
    def display_model(self, model):
        """🔧 显示MIDAS模型（带异常保护）"""
        if not PYVISTA_AVAILABLE or not model or not hasattr(self, 'plotter'):
            return
            
        try:
            # 🔧 安全清除现有内容
            self.safe_clear_scene()
            
            # 重新设置默认场景
            self.setup_default_scene()
            
            # 提取节点和单元数据
            nodes = model.get('nodes', [])
            elements = model.get('elements', [])
            
            if not nodes or not elements:
                print("警告: 模型数据为空")
                return
                
            # 转换为PyVista网格
            mesh = self.create_pyvista_mesh(nodes, elements)
            
            if mesh:
                # 添加到场景
                self.plotter.add_mesh(mesh, show_edges=True, edge_color='black',
                                    color='lightblue', opacity=0.8)
                
                # 存储当前网格
                self.current_mesh = mesh
                
                # 自动调整视图
                self.plotter.reset_camera()
                
                print(f"成功显示模型: {len(nodes)}个节点, {len(elements)}个单元")
                
        except Exception as e:
            print(f"显示模型时出错: {e}")
            
    def create_pyvista_mesh(self, nodes, elements):
        """创建PyVista网格"""
        try:
            # 提取节点坐标
            points = []
            for node in nodes:
                if isinstance(node, dict):
                    x = node.get('x', 0.0)
                    y = node.get('y', 0.0) 
                    z = node.get('z', 0.0)
                elif isinstance(node, (list, tuple)) and len(node) >= 3:
                    x, y, z = node[0], node[1], node[2]
                else:
                    continue
                points.append([x, y, z])
            
            if not points:
                return None
                
            points = np.array(points)
            
            # 提取单元连接
            cells = []
            for element in elements:
                if isinstance(element, dict):
                    connectivity = element.get('nodes', [])
                elif isinstance(element, (list, tuple)):
                    connectivity = element
                else:
                    continue
                    
                if len(connectivity) >= 3:
                    # 转换为0索引
                    conn = [max(0, int(n) - 1) for n in connectivity if isinstance(n, (int, str))]
                    if len(conn) >= 3:
                        cells.extend([len(conn)] + conn)
            
            if not cells:
                # 创建点云
                mesh = pv.PolyData(points)
            else:
                # 创建单元网格
                mesh = pv.UnstructuredGrid(cells, np.full(len(elements), 5), points)
            
            return mesh
            
        except Exception as e:
            print(f"创建PyVista网格时出错: {e}")
            return None
            
    def show_results(self, results):
        """显示计算结果"""
        if not PYVISTA_AVAILABLE or not self.current_mesh or not results:
            return
            
        try:
            # 添加位移结果
            if 'displacement' in results:
                displacement = np.array(results['displacement'])
                if displacement.shape[0] == self.current_mesh.n_points:
                    self.current_mesh['displacement'] = displacement
                    
            # 添加应力结果
            if 'stress' in results:
                stress = np.array(results['stress'])
                if stress.shape[0] == self.current_mesh.n_points:
                    self.current_mesh['stress'] = stress
                    
            # 重新显示网格
            self.clear_mesh_only()
            self.plotter.add_mesh(self.current_mesh, scalars='displacement',
                                show_edges=True, edge_color='black')
                                
        except Exception as e:
            print(f"显示结果时出错: {e}")
            
    def clear_scene(self):
        """清除场景"""
        if PYVISTA_AVAILABLE:
            self.plotter.clear()
            
    def clear_mesh_only(self):
        """只清除网格，保留网格和坐标轴"""
        if PYVISTA_AVAILABLE:
            # 移除所有actor
            for actor in self.actors:
                self.plotter.remove_actor(actor)
            self.actors.clear()
            
    def reset_camera(self):
        """重置相机"""
        if PYVISTA_AVAILABLE:
            self.plotter.reset_camera()
            
    def set_front_view(self):
        """设置前视图"""
        if PYVISTA_AVAILABLE:
            self.plotter.view_yz()
            
    def set_top_view(self):
        """设置俯视图"""
        if PYVISTA_AVAILABLE:
            self.plotter.view_xy()
            
    def set_isometric_view(self):
        """设置等轴测视图"""
        if PYVISTA_AVAILABLE:
            self.plotter.camera_position = 'isometric'
            
    def export_screenshot(self, filename):
        """导出截图"""
        if PYVISTA_AVAILABLE:
            self.plotter.screenshot(filename)
            
    def export_vtk(self, filename):
        """导出VTK文件"""
        if PYVISTA_AVAILABLE and self.current_mesh:
            self.current_mesh.save(filename)


# 测试函数
def create_test_model():
    """创建测试模型"""
    # 创建简单的立方体模型
    nodes = [
        {'id': 1, 'x': 0.0, 'y': 0.0, 'z': 0.0},
        {'id': 2, 'x': 10.0, 'y': 0.0, 'z': 0.0},
        {'id': 3, 'x': 10.0, 'y': 10.0, 'z': 0.0},
        {'id': 4, 'x': 0.0, 'y': 10.0, 'z': 0.0},
        {'id': 5, 'x': 0.0, 'y': 0.0, 'z': 10.0},
        {'id': 6, 'x': 10.0, 'y': 0.0, 'z': 10.0},
        {'id': 7, 'x': 10.0, 'y': 10.0, 'z': 10.0},
        {'id': 8, 'x': 0.0, 'y': 10.0, 'z': 10.0},
    ]
    
    elements = [
        {'id': 1, 'nodes': [1, 2, 3, 4]},  # 底面
        {'id': 2, 'nodes': [5, 6, 7, 8]},  # 顶面
        {'id': 3, 'nodes': [1, 2, 6, 5]},  # 前面
        {'id': 4, 'nodes': [2, 3, 7, 6]},  # 右面
        {'id': 5, 'nodes': [3, 4, 8, 7]},  # 后面
        {'id': 6, 'nodes': [4, 1, 5, 8]},  # 左面
    ]
    
    return {
        'nodes': nodes,
        'elements': elements,
        'materials': [],
        'loads': []
    }


if __name__ == "__main__":
    # 测试模型查看器
    from PyQt6.QtWidgets import QApplication
    
    app = QApplication(sys.argv)
    
    viewer = ModelViewer()
    viewer.setWindowTitle("3D模型查看器测试")
    viewer.resize(800, 600)
    viewer.show()
    
    # 显示测试模型
    test_model = create_test_model()
    viewer.display_model(test_model)
    
    sys.exit(app.exec_())