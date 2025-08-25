"""
SimPEG 网格构建器模块
支持多种网格类型的创建和优化
"""

import numpy as np
from typing import Tuple, List, Optional, Union
import discretize
from discretize import TensorMesh, TreeMesh, CurvilinearMesh
from discretize.utils import mesh_builder_xyz, refine_tree_xyz
import matplotlib.pyplot as plt
import pyvista as pv


class MeshBuilder:
    """网格构建器"""
    
    def __init__(self):
        self.mesh = None
        self.mesh_type = None
        
    def create_tensor_mesh(self, 
                          cell_sizes: List[np.ndarray], 
                          origin: np.ndarray = None) -> TensorMesh:
        """
        创建张量网格 (TensorMesh)
        
        Parameters:
        -----------
        cell_sizes : list of arrays
            每个方向的网格大小 [dx, dy, dz]
        origin : array, optional
            网格原点坐标
            
        Returns:
        --------
        mesh : TensorMesh
            创建的张量网格
        """
        if origin is None:
            origin = np.array([0., 0., 0.])
            
        self.mesh = TensorMesh(cell_sizes, origin=origin)
        self.mesh_type = 'tensor'
        
        print(f"创建张量网格: {self.mesh.n_cells} 个网格单元")
        print(f"网格范围: X={self.mesh.nodes_x.min():.1f}~{self.mesh.nodes_x.max():.1f}")
        print(f"         Y={self.mesh.nodes_y.min():.1f}~{self.mesh.nodes_y.max():.1f}")
        print(f"         Z={self.mesh.nodes_z.min():.1f}~{self.mesh.nodes_z.max():.1f}")
        
        return self.mesh
        
    def create_tensor_mesh_from_bounds(self, 
                                     bounds: dict, 
                                     core_cell_sizes: dict,
                                     padding_cells: dict = None) -> TensorMesh:
        """
        根据边界和核心区域网格大小创建张量网格
        
        Parameters:
        -----------
        bounds : dict
            网格边界 {'x': [xmin, xmax], 'y': [ymin, ymax], 'z': [zmin, zmax]}
        core_cell_sizes : dict
            核心区域网格大小 {'x': dx, 'y': dy, 'z': dz}
        padding_cells : dict, optional
            边界填充网格数量 {'x': [nx_neg, nx_pos], 'y': [ny_neg, ny_pos], 'z': [nz_neg, nz_pos]}
            
        Returns:
        --------
        mesh : TensorMesh
            创建的张量网格
        """
        if padding_cells is None:
            padding_cells = {'x': [10, 10], 'y': [10, 10], 'z': [10, 10]}
            
        # 构建每个方向的网格
        cell_sizes = []
        
        for direction in ['x', 'y', 'z']:
            bound = bounds[direction]
            core_size = core_cell_sizes[direction]
            padding = padding_cells[direction]
            
            # 计算核心区域网格数量
            core_length = bound[1] - bound[0]
            n_core = int(np.ceil(core_length / core_size))
            
            # 构建网格大小数组
            cells = []
            
            # 负方向填充
            if padding[0] > 0:
                expansion_factor = 1.3
                pad_sizes = core_size * (expansion_factor ** np.arange(padding[0]))
                cells.extend(pad_sizes[::-1])
                
            # 核心区域
            cells.extend([core_size] * n_core)
            
            # 正方向填充
            if padding[1] > 0:
                expansion_factor = 1.3
                pad_sizes = core_size * (expansion_factor ** np.arange(padding[1]))
                cells.extend(pad_sizes)
                
            cell_sizes.append(np.array(cells))
            
        # 计算原点
        origin = np.array([
            bounds['x'][0] - np.sum(cell_sizes[0][:padding_cells['x'][0]]),
            bounds['y'][0] - np.sum(cell_sizes[1][:padding_cells['y'][0]]),
            bounds['z'][0] - np.sum(cell_sizes[2][:padding_cells['z'][0]])
        ])
        
        return self.create_tensor_mesh(cell_sizes, origin)
        
    def create_tree_mesh(self, 
                        base_mesh: TensorMesh,
                        refinement_locations: np.ndarray,
                        refinement_levels: int = 2,
                        finalize: bool = True) -> TreeMesh:
        """
        创建树形网格 (TreeMesh) - 自适应加密
        
        Parameters:
        -----------
        base_mesh : TensorMesh
            基础张量网格
        refinement_locations : array
            需要加密的位置坐标
        refinement_levels : int
            加密层数
        finalize : bool
            是否完成网格构建
            
        Returns:
        --------
        mesh : TreeMesh
            创建的树形网格
        """
        # 创建树形网格
        self.mesh = TreeMesh(
            base_mesh.h, 
            origin=base_mesh.origin
        )
        
        # 根据位置进行网格加密
        self.mesh = refine_tree_xyz(
            self.mesh,
            refinement_locations,
            method='surface',
            octree_levels=refinement_levels,
            finalize=finalize
        )
        
        self.mesh_type = 'tree'
        
        print(f"创建树形网格: {self.mesh.n_cells} 个网格单元")
        print(f"加密级别: {refinement_levels}")
        print(f"最小网格大小: {np.min(self.mesh.h_gridded):.3f}")
        print(f"最大网格大小: {np.max(self.mesh.h_gridded):.3f}")
        
        return self.mesh
        
    def create_curvilinear_mesh(self, 
                               coordinates: Tuple[np.ndarray, np.ndarray, np.ndarray]) -> CurvilinearMesh:
        """
        创建曲线网格 (CurvilinearMesh)
        
        Parameters:
        -----------
        coordinates : tuple of arrays
            网格节点坐标 (X, Y, Z)
            
        Returns:
        --------
        mesh : CurvilinearMesh
            创建的曲线网格
        """
        self.mesh = CurvilinearMesh(coordinates)
        self.mesh_type = 'curvilinear'
        
        print(f"创建曲线网格: {self.mesh.n_cells} 个网格单元")
        print(f"网格节点数: {self.mesh.n_nodes}")
        
        return self.mesh
        
    def from_gempy_model(self, gempy_model, padding_cells: int = 5):
        """
        从 GemPy 地质模型创建网格
        
        Parameters:
        -----------
        gempy_model : gempy.core.model.Model
            GemPy 地质模型
        padding_cells : int
            边界填充网格数量
            
        Returns:
        --------
        mesh : TensorMesh
            基于 GemPy 模型的网格
        """
        try:
            import gempy as gp
        except ImportError:
            raise ImportError("需要安装 GemPy: pip install gempy")
            
        # 获取模型范围
        extent = gempy_model.grid.regular_grid.extent
        resolution = gempy_model.grid.regular_grid.resolution
        
        # 计算网格大小
        dx = (extent[1] - extent[0]) / resolution[0]
        dy = (extent[3] - extent[2]) / resolution[1]
        dz = (extent[5] - extent[4]) / resolution[2]
        
        # 构建边界信息
        bounds = {
            'x': [extent[0], extent[1]],
            'y': [extent[2], extent[3]],
            'z': [extent[4], extent[5]]
        }
        
        core_cell_sizes = {'x': dx, 'y': dy, 'z': dz}
        padding = {'x': [padding_cells, padding_cells], 
                  'y': [padding_cells, padding_cells], 
                  'z': [padding_cells, padding_cells]}
        
        mesh = self.create_tensor_mesh_from_bounds(bounds, core_cell_sizes, padding)
        
        print(f"从 GemPy 模型创建网格完成")
        print(f"原始分辨率: {resolution}")
        print(f"网格大小: {dx:.1f} x {dy:.1f} x {dz:.1f}")
        
        return mesh
        
    def import_external_mesh(self, file_path: str, format: str = 'vtk'):
        """
        导入外部网格文件
        
        Parameters:
        -----------
        file_path : str
            网格文件路径
        format : str
            文件格式 ('vtk', 'vtu', 'msh', etc.)
            
        Returns:
        --------
        mesh : discretize mesh object
            导入的网格
        """
        if format.lower() == 'vtk':
            # 使用 PyVista 读取 VTK 文件
            pv_mesh = pv.read(file_path)
            
            # 转换为 discretize 网格格式
            if pv_mesh.GetDataObjectType() == 6:  # VTK_UNSTRUCTURED_GRID
                # 不规则网格，可能需要转换为规则网格
                bounds = pv_mesh.bounds
                n_cells = [50, 50, 50]  # 默认分辨率
                
                # 创建规则网格来近似
                bounds_dict = {
                    'x': [bounds[0], bounds[1]],
                    'y': [bounds[2], bounds[3]],
                    'z': [bounds[4], bounds[5]]
                }
                
                dx = (bounds[1] - bounds[0]) / n_cells[0]
                dy = (bounds[3] - bounds[2]) / n_cells[1]
                dz = (bounds[5] - bounds[4]) / n_cells[2]
                
                core_sizes = {'x': dx, 'y': dy, 'z': dz}
                
                self.mesh = self.create_tensor_mesh_from_bounds(bounds_dict, core_sizes)
                
        else:
            raise NotImplementedError(f"格式 {format} 暂不支持")
            
        print(f"从文件导入网格: {file_path}")
        print(f"网格类型: {format}")
        
        return self.mesh
        
    def optimize_mesh(self, max_cells: int = 1e6):
        """
        优化网格 - 减少网格数量，提高计算效率
        
        Parameters:
        -----------
        max_cells : int
            最大网格数量限制
        """
        if self.mesh is None:
            print("没有可优化的网格")
            return
            
        current_cells = self.mesh.n_cells
        
        if current_cells <= max_cells:
            print(f"网格已经满足要求: {current_cells} <= {max_cells}")
            return
            
        # 对于张量网格，通过增大网格尺寸来减少网格数量
        if self.mesh_type == 'tensor':
            reduction_factor = (current_cells / max_cells) ** (1/3)
            
            new_h = []
            for direction_h in self.mesh.h:
                new_direction_h = direction_h * reduction_factor
                new_h.append(new_direction_h)
                
            optimized_mesh = TensorMesh(new_h, origin=self.mesh.origin)
            
            print(f"网格优化完成:")
            print(f"  优化前: {current_cells} 个网格")
            print(f"  优化后: {optimized_mesh.n_cells} 个网格")
            print(f"  减少比例: {(1 - optimized_mesh.n_cells/current_cells)*100:.1f}%")
            
            self.mesh = optimized_mesh
            
        else:
            print(f"网格类型 {self.mesh_type} 的优化功能待实现")
            
    def check_mesh_quality(self):
        """
        检查网格质量
        
        Returns:
        --------
        quality_report : dict
            网格质量报告
        """
        if self.mesh is None:
            return {"error": "没有网格可检查"}
            
        report = {
            "mesh_type": self.mesh_type,
            "n_cells": self.mesh.n_cells,
            "n_nodes": self.mesh.n_nodes,
            "n_faces": self.mesh.n_faces,
            "n_edges": self.mesh.n_edges,
            "dimensions": self.mesh.dim
        }
        
        # 网格大小统计
        if hasattr(self.mesh, 'h_gridded'):
            cell_sizes = self.mesh.h_gridded
            report.update({
                "min_cell_size": float(np.min(cell_sizes)),
                "max_cell_size": float(np.max(cell_sizes)),
                "mean_cell_size": float(np.mean(cell_sizes)),
                "size_ratio": float(np.max(cell_sizes) / np.min(cell_sizes))
            })
            
        # 网格边界
        bounds = [
            [float(self.mesh.nodes_x.min()), float(self.mesh.nodes_x.max())],
            [float(self.mesh.nodes_y.min()), float(self.mesh.nodes_y.max())],
            [float(self.mesh.nodes_z.min()), float(self.mesh.nodes_z.max())]
        ]
        report["bounds"] = bounds
        
        # 网格体积
        if hasattr(self.mesh, 'cell_volumes'):
            volumes = self.mesh.cell_volumes
            report.update({
                "total_volume": float(np.sum(volumes)),
                "min_volume": float(np.min(volumes)),
                "max_volume": float(np.max(volumes)),
                "volume_ratio": float(np.max(volumes) / np.min(volumes))
            })
            
        return report
        
    def plot_mesh(self, show_edges: bool = True, opacity: float = 0.3):
        """
        绘制网格
        
        Parameters:
        -----------
        show_edges : bool
            是否显示网格边
        opacity : float
            透明度
        """
        if self.mesh is None:
            print("没有网格可绘制")
            return None
            
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))
        
        # XY 平面 (Z=0 切片)
        z_slice = 0
        if hasattr(self.mesh, 'plot_slice'):
            self.mesh.plot_slice(
                np.ones(self.mesh.n_cells), 
                normal='Z', 
                ind=z_slice,
                ax=axes[0],
                grid=show_edges
            )
            axes[0].set_title('XY 平面视图')
            
        # XZ 平面 (Y中点切片)
        y_slice = self.mesh.n_cells_y // 2 if hasattr(self.mesh, 'n_cells_y') else 0
        if hasattr(self.mesh, 'plot_slice'):
            self.mesh.plot_slice(
                np.ones(self.mesh.n_cells), 
                normal='Y', 
                ind=y_slice,
                ax=axes[1],
                grid=show_edges
            )
            axes[1].set_title('XZ 平面视图')
            
        # YZ 平面 (X中点切片)
        x_slice = self.mesh.n_cells_x // 2 if hasattr(self.mesh, 'n_cells_x') else 0
        if hasattr(self.mesh, 'plot_slice'):
            self.mesh.plot_slice(
                np.ones(self.mesh.n_cells), 
                normal='X', 
                ind=x_slice,
                ax=axes[2],
                grid=show_edges
            )
            axes[2].set_title('YZ 平面视图')
            
        plt.tight_layout()
        plt.show()
        
        return fig
        
    def to_pyvista(self):
        """
        转换为 PyVista 网格对象
        
        Returns:
        --------
        pv_mesh : pyvista mesh
            PyVista 网格对象
        """
        if self.mesh is None:
            return None
            
        # 使用 discretize 的 to_vtk 方法
        vtk_dataset = self.mesh.to_vtk()
        pv_mesh = pv.wrap(vtk_dataset)
        
        return pv_mesh
        
    def save_mesh(self, file_path: str, format: str = 'vtk'):
        """
        保存网格到文件
        
        Parameters:
        -----------
        file_path : str
            保存路径
        format : str
            文件格式
        """
        if self.mesh is None:
            print("没有网格可保存")
            return
            
        if format.lower() == 'vtk':
            # 转换为 PyVista 格式并保存
            pv_mesh = self.to_pyvista()
            if pv_mesh is not None:
                pv_mesh.save(file_path)
                print(f"网格已保存到: {file_path}")
            else:
                print("网格转换失败")
        else:
            raise NotImplementedError(f"格式 {format} 暂不支持保存")


# 示例使用
def create_example_meshes():
    """创建示例网格"""
    builder = MeshBuilder()
    
    print("=== 创建张量网格示例 ===")
    # 定义网格大小
    dx = np.ones(20) * 50  # X方向: 20个网格，每个50米
    dy = np.ones(15) * 50  # Y方向: 15个网格，每个50米
    dz = np.ones(10) * 25  # Z方向: 10个网格，每个25米
    
    tensor_mesh = builder.create_tensor_mesh([dx, dy, dz])
    
    print("\n=== 网格质量检查 ===")
    quality = builder.check_mesh_quality()
    for key, value in quality.items():
        print(f"{key}: {value}")
        
    print("\n=== 创建树形网格示例 ===")
    # 定义需要加密的区域
    refinement_points = np.random.rand(50, 3) * 500  # 随机50个点
    tree_mesh = builder.create_tree_mesh(tensor_mesh, refinement_points, refinement_levels=2)
    
    return builder


if __name__ == "__main__":
    # 运行示例
    mesh_builder = create_example_meshes()
