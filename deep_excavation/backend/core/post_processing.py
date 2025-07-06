"""
DeepCAD Pro 后处理模块
基于 PyVista 的专业科学可视化后处理管道
"""
import os
import numpy as np
import pyvista as pv
from typing import Dict, List, Optional, Tuple, Any
import logging

logger = logging.getLogger(__name__)


class PostProcessor:
    """PyVista后处理器 - 专业CAE结果可视化"""
    
    def __init__(self, working_dir: str):
        self.working_dir = working_dir
        self.plotter = None
        
    def load_vtk_results(self, vtk_file: str) -> pv.UnstructuredGrid:
        """加载VTK结果文件"""
        if not os.path.exists(vtk_file):
            raise FileNotFoundError(f"VTK文件不存在: {vtk_file}")
            
        mesh = pv.read(vtk_file)
        logger.info(f"加载VTK文件: {vtk_file}, 节点数: {mesh.n_points}, 单元数: {mesh.n_cells}")
        return mesh
    
    def create_displacement_visualization(self, mesh: pv.UnstructuredGrid, 
                                        displacement_field: str = "DISPLACEMENT") -> Dict[str, Any]:
        """创建位移场可视化"""
        if displacement_field not in mesh.array_names:
            logger.warning(f"未找到位移场 {displacement_field}")
            return {}
        
        # 位移矢量场
        displacement = mesh[displacement_field]
        displacement_magnitude = np.linalg.norm(displacement, axis=1)
        
        # 添加位移幅值标量场
        mesh[f"{displacement_field}_MAGNITUDE"] = displacement_magnitude
        
        # 变形后的网格
        deformed_mesh = mesh.copy()
        deformed_mesh.points += displacement
        
        return {
            "original_mesh": mesh,
            "deformed_mesh": deformed_mesh,
            "displacement_magnitude": displacement_magnitude,
            "max_displacement": np.max(displacement_magnitude),
            "min_displacement": np.min(displacement_magnitude)
        }
    
    def create_stress_visualization(self, mesh: pv.UnstructuredGrid,
                                  stress_field: str = "STRESS") -> Dict[str, Any]:
        """创建应力场可视化"""
        if stress_field not in mesh.array_names:
            logger.warning(f"未找到应力场 {stress_field}")
            return {}
        
        stress_tensor = mesh[stress_field]
        
        # 计算Von Mises应力
        if stress_tensor.shape[1] == 6:  # 3D应力张量 [σxx, σyy, σzz, τxy, τyz, τzx]
            sxx, syy, szz, txy, tyz, tzx = stress_tensor.T
            von_mises = np.sqrt(0.5 * ((sxx - syy)**2 + (syy - szz)**2 + (szz - sxx)**2 + 
                                      6 * (txy**2 + tyz**2 + tzx**2)))
        else:
            von_mises = np.linalg.norm(stress_tensor, axis=1)
        
        mesh["VON_MISES_STRESS"] = von_mises
        
        return {
            "mesh": mesh,
            "von_mises_stress": von_mises,
            "max_stress": np.max(von_mises),
            "min_stress": np.min(von_mises)
        }
    
    def create_seepage_visualization(self, mesh: pv.UnstructuredGrid,
                                   head_field: str = "TOTAL_HEAD",
                                   velocity_field: str = "VELOCITY") -> Dict[str, Any]:
        """创建渗流场可视化"""
        results = {}
        
        # 水头等值线
        if head_field in mesh.array_names:
            head = mesh[head_field]
            results["total_head"] = head
            results["max_head"] = np.max(head)
            results["min_head"] = np.min(head)
            
            # 创建等值面
            contours = mesh.contour(scalars=head_field, isosurfaces=10)
            results["head_contours"] = contours
        
        # 渗流速度矢量场
        if velocity_field in mesh.array_names:
            velocity = mesh[velocity_field]
            velocity_magnitude = np.linalg.norm(velocity, axis=1)
            mesh[f"{velocity_field}_MAGNITUDE"] = velocity_magnitude
            
            results["velocity"] = velocity
            results["velocity_magnitude"] = velocity_magnitude
            results["max_velocity"] = np.max(velocity_magnitude)
        
        return results
    
    def generate_cross_section(self, mesh: pv.UnstructuredGrid, 
                             plane_origin: Tuple[float, float, float],
                             plane_normal: Tuple[float, float, float]) -> pv.UnstructuredGrid:
        """生成横截面"""
        return mesh.slice(normal=plane_normal, origin=plane_origin)
    
    def export_visualization_data(self, mesh: pv.UnstructuredGrid, 
                                output_file: str) -> str:
        """导出可视化数据为前端可读格式"""
        # 转换为前端Three.js可以理解的格式
        points = mesh.points
        cells = mesh.cells.reshape(-1, 5)[:, 1:5] if mesh.cells.size > 0 else []
        
        # 提取标量场数据
        scalar_data = {}
        for array_name in mesh.array_names:
            if mesh[array_name].ndim == 1:  # 标量场
                scalar_data[array_name] = mesh[array_name].tolist()
        
        visualization_data = {
            "points": points.tolist(),
            "cells": cells.tolist() if len(cells) > 0 else [],
            "scalar_fields": scalar_data,
            "bounds": mesh.bounds.tolist(),
            "n_points": mesh.n_points,
            "n_cells": mesh.n_cells
        }
        
        import json
        with open(output_file, 'w') as f:
            json.dump(visualization_data, f)
        
        logger.info(f"可视化数据已导出: {output_file}")
        return output_file
    
    def create_interactive_plot(self, mesh: pv.UnstructuredGrid, 
                              scalar_field: str = None,
                              save_path: str = None) -> str:
        """创建交互式可视化图像"""
        plotter = pv.Plotter(off_screen=True)
        
        if scalar_field and scalar_field in mesh.array_names:
            plotter.add_mesh(mesh, scalars=scalar_field, show_edges=True, 
                           opacity=0.8, cmap='viridis')
            plotter.add_scalar_bar(scalar_field)
        else:
            plotter.add_mesh(mesh, show_edges=True, color='lightblue')
        
        plotter.add_axes()
        plotter.show_grid()
        
        if save_path:
            plotter.screenshot(save_path, transparent_background=True)
            logger.info(f"可视化截图已保存: {save_path}")
            return save_path
        
        return plotter.export_html(save_path or "visualization.html")


def process_kratos_results(working_dir: str, project_name: str) -> Dict[str, Any]:
    """处理Kratos分析结果的主函数"""
    processor = PostProcessor(working_dir)
    
    # 查找VTK结果文件
    vtk_output_folder = os.path.join(working_dir, "vtk_output")
    if not os.path.exists(vtk_output_folder):
        logger.error(f"VTK输出目录不存在: {vtk_output_folder}")
        return {"error": "未找到分析结果"}
    
    vtk_files = [f for f in os.listdir(vtk_output_folder) if f.endswith('.vtk')]
    if not vtk_files:
        logger.error("未找到VTK结果文件")
        return {"error": "未找到VTK结果文件"}
    
    # 使用最新的VTK文件
    latest_vtk = max([os.path.join(vtk_output_folder, f) for f in vtk_files], 
                    key=os.path.getctime)
    
    try:
        # 加载结果
        mesh = processor.load_vtk_results(latest_vtk)
        
        results = {
            "mesh_info": {
                "n_points": mesh.n_points,
                "n_cells": mesh.n_cells,
                "bounds": mesh.bounds.tolist(),
                "available_fields": mesh.array_names
            }
        }
        
        # 处理不同类型的结果
        if "DISPLACEMENT" in mesh.array_names:
            displacement_results = processor.create_displacement_visualization(mesh)
            results["displacement"] = displacement_results
        
        if "STRESS" in mesh.array_names:
            stress_results = processor.create_stress_visualization(mesh)
            results["stress"] = stress_results
        
        if "TOTAL_HEAD" in mesh.array_names:
            seepage_results = processor.create_seepage_visualization(mesh)
            results["seepage"] = seepage_results
        
        # 导出前端可视化数据
        viz_data_file = os.path.join(working_dir, f"{project_name}_visualization.json")
        processor.export_visualization_data(mesh, viz_data_file)
        results["visualization_data"] = viz_data_file
        
        # 生成预览图
        preview_image = os.path.join(working_dir, f"{project_name}_preview.png")
        processor.create_interactive_plot(mesh, save_path=preview_image)
        results["preview_image"] = preview_image
        
        logger.info("PyVista后处理完成")
        return results
        
    except Exception as e:
        logger.error(f"PyVista后处理失败: {str(e)}")
        return {"error": str(e)} 