"""
@file result_processor.py
@description 有限元分析结果处理模块
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import numpy as np
import matplotlib.pyplot as plt
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Union, Optional, Any

# 尝试导入VTK
try:
    import vtk
    from vtk.util import numpy_support
    VTK_AVAILABLE = True
except ImportError:
    VTK_AVAILABLE = False
    logging.warning("VTK导入失败，部分可视化功能将不可用")

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ResultProcessor")

class ResultProcessor:
    """有限元分析结果处理类"""
    
    def __init__(self, result_dir: Optional[str] = None):
        """初始化结果处理器
        
        Args:
            result_dir: 结果文件目录
        """
        self.result_dir = result_dir or os.getcwd()
        self.vtk_available = VTK_AVAILABLE
        
        logger.info(f"结果处理器初始化完成，结果目录: {self.result_dir}")
        
        if not self.vtk_available:
            logger.warning("VTK不可用，部分可视化功能将不可用")
    
    def load_vtk_result(self, vtk_file: str) -> Dict[str, Any]:
        """加载VTK格式的结果文件
        
        Args:
            vtk_file: VTK文件路径
            
        Returns:
            结果数据字典
        """
        if not self.vtk_available:
            raise RuntimeError("VTK不可用，无法加载VTK结果文件")
        
        if not os.path.exists(vtk_file):
            raise FileNotFoundError(f"结果文件不存在: {vtk_file}")
        
        # 创建VTK读取器
        if vtk_file.lower().endswith('.vtk'):
            reader = vtk.vtkUnstructuredGridReader()
        elif vtk_file.lower().endswith('.vtu'):
            reader = vtk.vtkXMLUnstructuredGridReader()
        else:
            raise ValueError(f"不支持的文件格式: {vtk_file}")
        
        reader.SetFileName(vtk_file)
        reader.Update()
        
        # 获取网格数据
        grid = reader.GetOutput()
        
        # 提取节点坐标
        points = grid.GetPoints()
        num_points = points.GetNumberOfPoints()
        coordinates = np.zeros((num_points, 3))
        for i in range(num_points):
            coordinates[i, :] = points.GetPoint(i)
        
        # 提取单元数据
        num_cells = grid.GetNumberOfCells()
        cells = []
        for i in range(num_cells):
            cell = grid.GetCell(i)
            cell_type = cell.GetCellType()
            num_points_in_cell = cell.GetNumberOfPoints()
            cell_points = [cell.GetPointId(j) for j in range(num_points_in_cell)]
            cells.append({
                'type': cell_type,
                'points': cell_points
            })
        
        # 提取点数据
        point_data = {}
        pd = grid.GetPointData()
        num_arrays = pd.GetNumberOfArrays()
        
        for i in range(num_arrays):
            array = pd.GetArray(i)
            name = array.GetName()
            num_components = array.GetNumberOfComponents()
            num_tuples = array.GetNumberOfTuples()
            
            data = numpy_support.vtk_to_numpy(array)
            
            if num_components > 1:
                data = data.reshape(num_tuples, num_components)
                
                # 对于矢量数据，计算幅值
                if num_components == 3:
                    magnitude = np.sqrt(np.sum(data**2, axis=1))
                    point_data[f"{name}_magnitude"] = magnitude
                    
                    # 分量数据
                    point_data[f"{name}_x"] = data[:, 0]
                    point_data[f"{name}_y"] = data[:, 1]
                    point_data[f"{name}_z"] = data[:, 2]
                else:
                    point_data[name] = data
            else:
                point_data[name] = data
        
        # 提取单元数据
        cell_data = {}
        cd = grid.GetCellData()
        num_arrays = cd.GetNumberOfArrays()
        
        for i in range(num_arrays):
            array = cd.GetArray(i)
            name = array.GetName()
            num_components = array.GetNumberOfComponents()
            num_tuples = array.GetNumberOfTuples()
            
            data = numpy_support.vtk_to_numpy(array)
            
            if num_components > 1:
                data = data.reshape(num_tuples, num_components)
                
                # 对于矢量数据，计算幅值
                if num_components == 3:
                    magnitude = np.sqrt(np.sum(data**2, axis=1))
                    cell_data[f"{name}_magnitude"] = magnitude
                    
                    # 分量数据
                    cell_data[f"{name}_x"] = data[:, 0]
                    cell_data[f"{name}_y"] = data[:, 1]
                    cell_data[f"{name}_z"] = data[:, 2]
                else:
                    cell_data[name] = data
            else:
                cell_data[name] = data
        
        # 返回结果数据
        result = {
            'coordinates': coordinates,
            'cells': cells,
            'point_data': point_data,
            'cell_data': cell_data
        }
        
        logger.info(f"加载VTK结果文件: {vtk_file}")
        logger.info(f"节点数: {num_points}, 单元数: {num_cells}")
        logger.info(f"点数据: {list(point_data.keys())}")
        logger.info(f"单元数据: {list(cell_data.keys())}")
        
        return result
    
    def extract_displacement(self, result_data: Dict[str, Any]) -> Dict[str, Any]:
        """从结果数据中提取位移场
        
        Args:
            result_data: 结果数据字典
            
        Returns:
            位移数据字典
        """
        point_data = result_data.get('point_data', {})
        
        # 尝试不同的可能的位移字段名称
        displacement_keys = [
            'displacement', 'DISPLACEMENT', 'Displacement',
            'U', 'u', 'disp'
        ]
        
        displacement = None
        for key in displacement_keys:
            if key in point_data:
                displacement = point_data[key]
                break
        
        if displacement is None:
            # 尝试查找分量
            if all(f"displacement_{comp}" in point_data for comp in ['x', 'y', 'z']):
                x = point_data['displacement_x']
                y = point_data['displacement_y']
                z = point_data['displacement_z']
                displacement = np.column_stack((x, y, z))
            elif all(f"U{comp}" in point_data for comp in ['X', 'Y', 'Z']):
                x = point_data['UX']
                y = point_data['UY']
                z = point_data['UZ']
                displacement = np.column_stack((x, y, z))
        
        if displacement is None:
            raise ValueError("结果数据中未找到位移场数据")
        
        # 计算位移幅值
        if len(displacement.shape) > 1 and displacement.shape[1] >= 3:
            magnitude = np.sqrt(np.sum(displacement[:, :3]**2, axis=1))
        else:
            magnitude = displacement
        
        # 返回位移数据
        disp_data = {
            'coordinates': result_data['coordinates'],
            'magnitude': magnitude
        }
        
        # 如果有分量，添加分量数据
        if len(displacement.shape) > 1 and displacement.shape[1] >= 3:
            disp_data['x'] = displacement[:, 0]
            disp_data['y'] = displacement[:, 1]
            disp_data['z'] = displacement[:, 2]
        
        return disp_data
    
    def extract_stress(self, result_data: Dict[str, Any]) -> Dict[str, Any]:
        """从结果数据中提取应力场
        
        Args:
            result_data: 结果数据字典
            
        Returns:
            应力数据字典
        """
        # 尝试从点数据和单元数据中提取应力
        point_data = result_data.get('point_data', {})
        cell_data = result_data.get('cell_data', {})
        
        # 尝试不同的可能的应力字段名称
        stress_keys = [
            'stress', 'STRESS', 'Stress',
            'S', 's', 'sigma'
        ]
        
        stress = None
        stress_source = None
        
        # 先尝试点数据
        for key in stress_keys:
            if key in point_data:
                stress = point_data[key]
                stress_source = 'point'
                break
        
        # 如果点数据中没有，尝试单元数据
        if stress is None:
            for key in stress_keys:
                if key in cell_data:
                    stress = cell_data[key]
                    stress_source = 'cell'
                    break
        
        # 尝试查找von Mises应力
        von_mises_keys = [
            'von_mises', 'vonMises', 'VON_MISES', 'VonMises',
            'vm', 'VM', 'mises'
        ]
        
        von_mises = None
        for key in von_mises_keys:
            if key in point_data:
                von_mises = point_data[key]
                break
            elif key in cell_data:
                von_mises = cell_data[key]
                break
        
        if stress is None and von_mises is None:
            raise ValueError("结果数据中未找到应力场数据")
        
        # 返回应力数据
        stress_data = {
            'coordinates': result_data['coordinates']
        }
        
        if stress is not None:
            stress_data['tensor'] = stress
            
            # 如果应力是张量，提取主应力
            if len(stress.shape) > 1 and stress.shape[1] >= 6:
                # 假设应力顺序为 [σxx, σyy, σzz, σxy, σyz, σxz]
                sigma_xx = stress[:, 0]
                sigma_yy = stress[:, 1]
                sigma_zz = stress[:, 2]
                sigma_xy = stress[:, 3]
                sigma_yz = stress[:, 4] if stress.shape[1] > 4 else np.zeros_like(sigma_xx)
                sigma_xz = stress[:, 5] if stress.shape[1] > 5 else np.zeros_like(sigma_xx)
                
                # 计算von Mises应力
                if von_mises is None:
                    von_mises = np.sqrt(0.5 * ((sigma_xx - sigma_yy)**2 + 
                                              (sigma_yy - sigma_zz)**2 + 
                                              (sigma_zz - sigma_xx)**2 + 
                                              6 * (sigma_xy**2 + sigma_yz**2 + sigma_xz**2)))
        
        if von_mises is not None:
            stress_data['von_mises'] = von_mises
        
        return stress_data
    
    def plot_displacement(self, displacement_data: Dict[str, Any], 
                        output_file: Optional[str] = None,
                        title: str = "位移场分布",
                        component: str = "magnitude") -> None:
        """绘制位移场分布图
        
        Args:
            displacement_data: 位移数据字典
            output_file: 输出文件路径，None则显示图像
            title: 图像标题
            component: 绘制的分量，可选 'magnitude', 'x', 'y', 'z'
        """
        if component not in displacement_data:
            raise ValueError(f"位移数据中不存在分量: {component}")
        
        # 获取坐标和位移数据
        coordinates = displacement_data['coordinates']
        values = displacement_data[component]
        
        # 创建图像
        plt.figure(figsize=(10, 8))
        
        # 绘制散点图，颜色表示位移大小
        sc = plt.scatter(coordinates[:, 0], coordinates[:, 1], c=values, 
                       cmap='jet', s=10, alpha=0.7)
        
        # 添加颜色条
        cbar = plt.colorbar(sc)
        cbar.set_label(f"位移{component} (m)")
        
        # 设置图像属性
        plt.title(title)
        plt.xlabel("X (m)")
        plt.ylabel("Y (m)")
        plt.grid(True)
        plt.axis('equal')
        
        # 保存或显示图像
        if output_file:
            plt.savefig(output_file, dpi=300, bbox_inches='tight')
            logger.info(f"位移场分布图已保存到: {output_file}")
        else:
            plt.show()
        
        plt.close()
    
    def plot_wall_displacement(self, wall_displacements: List[Dict[str, Any]],
                             output_file: Optional[str] = None,
                             title: str = "地下连续墙水平位移随深度变化",
                             labels: Optional[List[str]] = None) -> None:
        """绘制地下连续墙水平位移随深度变化图
        
        Args:
            wall_displacements: 墙体位移数据列表，每个元素为一个阶段的位移数据
            output_file: 输出文件路径，None则显示图像
            title: 图像标题
            labels: 图例标签列表，None则使用默认标签
        """
        # 创建图像
        plt.figure(figsize=(10, 8))
        
        # 每个阶段使用不同颜色
        colors = ['b', 'g', 'r', 'c', 'm', 'y', 'k']
        
        for i, disp_data in enumerate(wall_displacements):
            # 提取深度和水平位移
            coordinates = disp_data['coordinates']
            depth = -coordinates[:, 2]  # 转为正值表示深度
            
            # 获取水平位移
            if 'x' in disp_data:
                x_displacement = disp_data['x'] * 1000  # 转为mm
            else:
                continue
            
            # 按深度排序
            sort_idx = np.argsort(depth)
            depth = depth[sort_idx]
            x_displacement = x_displacement[sort_idx]
            
            # 绘制曲线
            label = labels[i] if labels and i < len(labels) else f"阶段 {i+1}"
            plt.plot(x_displacement, depth, 
                    color=colors[i % len(colors)], 
                    linewidth=2, 
                    label=label)
        
        plt.grid(True)
        plt.xlabel("水平位移 (mm)")
        plt.ylabel("深度 (m)")
        plt.title(title)
        plt.legend()
        plt.gca().invert_yaxis()  # 反转Y轴，使深度增加向下
        
        # 保存或显示图像
        if output_file:
            plt.savefig(output_file, dpi=300, bbox_inches='tight')
            logger.info(f"墙体位移图已保存到: {output_file}")
        else:
            plt.show()
        
        plt.close()
    
    def plot_surface_settlement(self, displacement_data: Dict[str, Any],
                              output_file: Optional[str] = None,
                              title: str = "地表沉降分布",
                              excavation_width: float = 30.0) -> None:
        """绘制地表沉降分布图
        
        Args:
            displacement_data: 位移数据字典
            output_file: 输出文件路径，None则显示图像
            title: 图像标题
            excavation_width: 基坑宽度，用于标记基坑位置
        """
        # 获取坐标和位移数据
        coordinates = displacement_data['coordinates']
        
        # 找出地表点（z坐标接近0的点）
        surface_mask = np.abs(coordinates[:, 2]) < 0.1
        surface_x = coordinates[surface_mask, 0]
        
        # 获取竖向位移（向下为正）
        if 'z' in displacement_data:
            surface_settlement = -displacement_data['z'][surface_mask] * 1000  # 转为mm，向下为正
        else:
            raise ValueError("位移数据中不存在z分量")
        
        # 按x坐标排序
        sort_idx = np.argsort(surface_x)
        surface_x = surface_x[sort_idx]
        surface_settlement = surface_settlement[sort_idx]
        
        # 创建图像
        plt.figure(figsize=(12, 6))
        
        # 绘制沉降曲线
        plt.plot(surface_x, surface_settlement, 'b-', linewidth=2)
        
        # 标记基坑位置
        plt.axvspan(-excavation_width/2, excavation_width/2, alpha=0.2, color='gray')
        plt.axvline(-excavation_width/2, color='k', linestyle='--')
        plt.axvline(excavation_width/2, color='k', linestyle='--')
        
        # 设置图像属性
        plt.title(title)
        plt.xlabel("距离 (m)")
        plt.ylabel("沉降量 (mm)")
        plt.grid(True)
        
        # Y轴反向，使沉降向下
        plt.gca().invert_yaxis()
        
        # 保存或显示图像
        if output_file:
            plt.savefig(output_file, dpi=300, bbox_inches='tight')
            logger.info(f"地表沉降分布图已保存到: {output_file}")
        else:
            plt.show()
        
        plt.close()
    
    def plot_stress_contour(self, stress_data: Dict[str, Any],
                          output_file: Optional[str] = None,
                          title: str = "应力分布",
                          stress_type: str = "von_mises") -> None:
        """绘制应力云图
        
        Args:
            stress_data: 应力数据字典
            output_file: 输出文件路径，None则显示图像
            title: 图像标题
            stress_type: 应力类型，可选 'von_mises' 或其他可用的应力分量
        """
        if stress_type not in stress_data:
            raise ValueError(f"应力数据中不存在类型: {stress_type}")
        
        # 获取坐标和应力数据
        coordinates = stress_data['coordinates']
        values = stress_data[stress_type]
        
        # 创建图像
        plt.figure(figsize=(10, 8))
        
        # 绘制散点图，颜色表示应力大小
        sc = plt.scatter(coordinates[:, 0], coordinates[:, 1], c=values, 
                       cmap='jet', s=10, alpha=0.7)
        
        # 添加颜色条
        cbar = plt.colorbar(sc)
        cbar.set_label(f"{stress_type}应力 (Pa)")
        
        # 设置图像属性
        plt.title(title)
        plt.xlabel("X (m)")
        plt.ylabel("Y (m)")
        plt.grid(True)
        plt.axis('equal')
        
        # 保存或显示图像
        if output_file:
            plt.savefig(output_file, dpi=300, bbox_inches='tight')
            logger.info(f"应力分布图已保存到: {output_file}")
        else:
            plt.show()
        
        plt.close()
    
    def export_results_to_csv(self, result_data: Dict[str, Any], 
                            output_file: str,
                            data_type: str = 'displacement') -> None:
        """将结果数据导出为CSV文件
        
        Args:
            result_data: 结果数据字典
            output_file: 输出文件路径
            data_type: 数据类型，可选 'displacement', 'stress' 等
        """
        import pandas as pd
        
        # 获取坐标
        coordinates = result_data['coordinates']
        
        # 根据数据类型提取数据
        if data_type == 'displacement':
            data = self.extract_displacement(result_data)
        elif data_type == 'stress':
            data = self.extract_stress(result_data)
        else:
            data = result_data.get('point_data', {})
        
        # 创建DataFrame
        df_data = {
            'X': coordinates[:, 0],
            'Y': coordinates[:, 1],
            'Z': coordinates[:, 2]
        }
        
        # 添加结果数据
        for key, values in data.items():
            if key != 'coordinates' and isinstance(values, np.ndarray) and len(values) == len(coordinates):
                df_data[key] = values
        
        df = pd.DataFrame(df_data)
        
        # 保存为CSV
        df.to_csv(output_file, index=False)
        logger.info(f"结果数据已导出到CSV文件: {output_file}")
        
        return output_file