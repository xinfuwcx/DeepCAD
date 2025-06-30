"""
@file netgen_reader.py
@description Netgen网格数据读取和处理模块
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from typing import Dict, Any, List, Optional, Tuple, Union
import os
import numpy as np
import netgen.meshing as ngmesh
import netgen.csg as csg
import meshio
import logging

logger = logging.getLogger(__name__)


class NetgenReader:
    """
    Netgen网格读取和处理类
    负责从Netgen生成的网格文件中读取数据，并转换为系统内部格式
    支持VOL、VTK等Netgen输出格式
    """
    
    def __init__(self):
        """初始化Netgen读取器"""
        self.mesh = None
        self.mesh_data = {}
        self.physical_groups = {}
        self.has_pyvista = self._check_pyvista()
    
    def _check_pyvista(self) -> bool:
        """检查是否安装了PyVista可视化库"""
        try:
            import pyvista
            return True
        except ImportError:
            logger.info("PyVista未安装，某些可视化功能将不可用")
            return False
    
    def read_mesh_file(self, file_path: str) -> bool:
        """
        读取Netgen网格文件
        
        Args:
            file_path: 网格文件路径，支持.vol、.vtk等格式
            
        Returns:
            bool: 读取是否成功
        """
        if not os.path.exists(file_path):
            logger.error(f"网格文件不存在: {file_path}")
            return False
        
        file_ext = os.path.splitext(file_path)[1].lower()
        
        try:
            if file_ext == '.vol':
                # 读取Netgen原生格式
                self.mesh = ngmesh.Mesh(dim=3)
                self.mesh.Load(file_path)
                logger.info(f"成功读取Netgen VOL文件: {file_path}")
                self._parse_vol_mesh()
                
            elif file_ext == '.vtk':
                # 读取VTK格式
                self.mesh = meshio.read(file_path)
                logger.info(f"成功读取VTK文件: {file_path}")
                self._parse_vtk_mesh()
                
            else:
                logger.error(f"不支持的文件格式: {file_ext}")
                return False
                
            logger.info(f"网格包含 {len(self.mesh_data.get('nodes', []))} 个节点和 {len(self.mesh_data.get('elements', []))} 个单元")
            return True
            
        except Exception as e:
            logger.error(f"读取网格文件时出错: {str(e)}")
            return False
    
    def _parse_vol_mesh(self):
        """解析Netgen VOL格式网格数据"""
        if self.mesh is None:
            return
            
        # 提取节点数据
        nodes = []
        for i in range(self.mesh.nv):
            # Netgen节点索引从1开始
            point = self.mesh.Point(i+1)
            nodes.append([point.p[0], point.p[1], point.p[2]])
            
        # 提取单元数据
        elements = []
        for i in range(self.mesh.ne):
            # 获取单元顶点索引
            element = self.mesh.VolumeElement(i+1)
            element_type = self._get_element_type(element.vertices)
            element_data = {
                "id": i,
                "type": element_type,
                "nodes": [v-1 for v in element.vertices],  # 转换为0基索引
                "material": element.mat  # 材料标识
            }
            elements.append(element_data)
            
        # 提取物理组数据
        physical_groups = {}
        for material in self.mesh.GetMaterials():
            if material == "":
                continue
                
            # 收集指定材料的单元
            elements_in_group = []
            for i, elem in enumerate(elements):
                if elem["material"] == material:
                    elements_in_group.append(i)
                    
            physical_groups[material] = {
                "elements": elements_in_group,
                "dimension": 3  # 体单元为3维
            }
                
        self.mesh_data = {
            "nodes": nodes,
            "elements": elements,
            "dimension": 3
        }
        
        self.physical_groups = physical_groups
    
    def _parse_vtk_mesh(self):
        """解析VTK格式网格数据"""
        if self.mesh is None:
            return
            
        # 提取节点数据
        nodes = self.mesh.points.tolist()
        
        # 提取单元数据
        elements = []
        elem_id = 0
        
        # 处理四面体单元
        if 'tetra' in self.mesh.cells_dict:
            for cell in self.mesh.cells_dict['tetra']:
                elements.append({
                    "id": elem_id,
                    "type": "tetra",
                    "nodes": cell.tolist(),
                    "material": "default"  # 默认材料
                })
                elem_id += 1
                
        # 处理六面体单元
        if 'hexahedron' in self.mesh.cells_dict:
            for cell in self.mesh.cells_dict['hexahedron']:
                elements.append({
                    "id": elem_id,
                    "type": "hexa",
                    "nodes": cell.tolist(),
                    "material": "default"  # 默认材料
                })
                elem_id += 1
                
        # 提取物理组/材料数据
        physical_groups = {}
        if 'cell_data' in self.mesh.cell_data:
            for key, data in self.mesh.cell_data.items():
                if key.startswith('material') or key.startswith('gmsh:physical'):
                    # 按材料ID分组
                    material_groups = {}
                    for i, mat_id in enumerate(data[0]):
                        mat_name = f"material_{mat_id}"
                        if mat_name not in material_groups:
                            material_groups[mat_name] = []
                        material_groups[mat_name].append(i)
                        
                    # 更新单元的材料信息
                    for mat_name, elem_indices in material_groups.items():
                        for idx in elem_indices:
                            if idx < len(elements):
                                elements[idx]["material"] = mat_name
                        
                        physical_groups[mat_name] = {
                            "elements": elem_indices,
                            "dimension": 3
                        }
        
        # 如果没有找到物理组，创建默认组
        if not physical_groups:
            physical_groups["default"] = {
                "elements": list(range(len(elements))),
                "dimension": 3
            }
                
        self.mesh_data = {
            "nodes": nodes,
            "elements": elements,
            "dimension": 3
        }
        
        self.physical_groups = physical_groups
    
    def _get_element_type(self, vertices: list) -> str:
        """根据顶点数量确定单元类型"""
        if len(vertices) == 4:
            return "tetra"
        elif len(vertices) == 8:
            return "hexa"
        elif len(vertices) == 6:
            return "prism"
        elif len(vertices) == 5:
            return "pyramid"
        else:
            return "unknown"
    
    def get_nodes(self) -> List[List[float]]:
        """获取网格节点坐标列表"""
        return self.mesh_data.get("nodes", [])
    
    def get_elements(self) -> List[Dict[str, Any]]:
        """获取网格单元数据列表"""
        return self.mesh_data.get("elements", [])
    
    def get_physical_groups(self) -> Dict[str, Dict[str, Any]]:
        """获取物理组数据"""
        return self.physical_groups
    
    def convert_to_fem_format(self) -> Dict[str, Any]:
        """
        将网格数据转换为FEM分析所需的格式
        
        Returns:
            Dict[str, Any]: FEM格式的网格数据
        """
        fem_data = {
            "nodes": {i: {"coordinates": node} for i, node in enumerate(self.mesh_data.get("nodes", []))},
            "elements": {elem["id"]: {
                "type": elem["type"],
                "nodes": elem["nodes"],
                "material": elem["material"]
            } for elem in self.mesh_data.get("elements", [])},
            "physical_groups": self.physical_groups
        }
        
        return fem_data
    
    def convert_to_kratos_format(self) -> Dict[str, Any]:
        """
        将网格数据转换为Kratos所需的格式
        
        Returns:
            Dict[str, Any]: Kratos格式的网格数据
        """
        # 节点数据
        kratos_nodes = {}
        for i, coords in enumerate(self.mesh_data.get("nodes", [])):
            # Kratos节点ID从1开始
            kratos_nodes[i+1] = {
                "coordinates": coords,
                "id": i+1  # 显式存储ID
            }
        
        # 单元数据
        kratos_elements = {}
        for elem in self.mesh_data.get("elements", []):
            # Kratos单元ID从1开始
            elem_id = elem["id"] + 1
            elem_type = self._get_kratos_element_type(elem["type"])
            # 节点ID从1开始
            nodes = [node_id + 1 for node_id in elem["nodes"]]
            
            kratos_elements[elem_id] = {
                "type": elem_type,
                "nodes": nodes,
                "properties": elem["material"],
                "id": elem_id  # 显式存储ID
            }
        
        # 物理组/子模型部件数据
        kratos_submodelparts = {}
        for group_name, group_data in self.physical_groups.items():
            # 元素ID从1开始
            element_ids = [elem_id + 1 for elem_id in group_data["elements"]]
            
            # 收集节点ID
            node_ids = set()
            for elem_id in group_data["elements"]:
                for node_id in self.mesh_data["elements"][elem_id]["nodes"]:
                    # 节点ID从1开始
                    node_ids.add(node_id + 1)
            
            kratos_submodelparts[group_name] = {
                "elements": element_ids,
                "nodes": list(node_ids)
            }
        
        return {
            "nodes": kratos_nodes,
            "elements": kratos_elements,
            "submodelparts": kratos_submodelparts,
            "dimension": self.mesh_data.get("dimension", 3)
        }
    
    def _get_kratos_element_type(self, element_type: str) -> str:
        """将内部单元类型转换为Kratos单元类型"""
        element_type_map = {
            "tetra": "Tetrahedra3D4",
            "hexa": "Hexahedra3D8",
            "prism": "Prism3D6",
            "pyramid": "Pyramid3D5"
        }
        return element_type_map.get(element_type, "Unknown")
    
    def extract_boundary_mesh(self) -> Dict[str, Any]:
        """
        提取模型的边界网格
        
        Returns:
            Dict[str, Any]: 边界网格数据
        """
        # 此功能需要更复杂的实现，这里给出基本框架
        boundary_elements = []
        boundary_nodes = set()
        
        # 在实际实现中，这里需要分析体网格的拓扑结构，找出边界面
        # 简化版实现：将所有被单个单元引用的面视为边界
        
        logger.info(f"提取了 {len(boundary_elements)} 个边界面单元")
        
        return {
            "nodes": list(boundary_nodes),
            "elements": boundary_elements
        }
    
    def export_to_vtk(self, output_file: str) -> bool:
        """
        将网格导出为VTK格式
        
        Args:
            output_file: 输出文件路径
            
        Returns:
            bool: 导出是否成功
        """
        if not self.mesh_data:
            logger.error("没有网格数据可导出")
            return False
        
        try:
            # 准备meshio数据
            points = np.array(self.mesh_data.get("nodes", []))
            cells = []
            
            # 按单元类型分组
            elem_by_type = {}
            for elem in self.mesh_data.get("elements", []):
                elem_type = elem["type"]
                if elem_type not in elem_by_type:
                    elem_by_type[elem_type] = []
                elem_by_type[elem_type].append(elem["nodes"])
            
            # 添加单元数据
            for elem_type, node_indices in elem_by_type.items():
                meshio_type = self._get_meshio_element_type(elem_type)
                cells.append((meshio_type, np.array(node_indices)))
            
            # 准备单元数据
            cell_data = {}
            if self.physical_groups:
                material_data = np.zeros(len(self.mesh_data["elements"]), dtype=int)
                material_map = {}
                
                for i, (material, group_data) in enumerate(self.physical_groups.items()):
                    material_map[material] = i + 1  # 材料ID从1开始
                    for elem_id in group_data["elements"]:
                        material_data[elem_id] = i + 1
                
                # 按单元类型拆分材料数据
                material_data_by_type = []
                start_idx = 0
                for elem_type, node_indices in elem_by_type.items():
                    end_idx = start_idx + len(node_indices)
                    material_data_by_type.append(material_data[start_idx:end_idx])
                    start_idx = end_idx
                
                cell_data["material"] = material_data_by_type
            
            # 创建meshio网格
            output_mesh = meshio.Mesh(
                points,
                cells,
                cell_data=cell_data if cell_data else None
            )
            
            # 导出VTK文件
            meshio.write(output_file, output_mesh)
            logger.info(f"成功导出网格到VTK文件: {output_file}")
            return True
            
        except Exception as e:
            logger.error(f"导出VTK文件时出错: {str(e)}")
            return False
    
    def _get_meshio_element_type(self, element_type: str) -> str:
        """将内部单元类型转换为meshio单元类型"""
        element_type_map = {
            "tetra": "tetra",
            "hexa": "hexahedron",
            "prism": "wedge",
            "pyramid": "pyramid"
        }
        return element_type_map.get(element_type, "unknown")
    
    def visualize(self, show_edges=True, opacity=0.7):
        """
        使用PyVista可视化网格
        
        Args:
            show_edges: 是否显示边线
            opacity: 透明度 (0-1)
        """
        if not self.has_pyvista:
            logger.error("PyVista未安装，无法可视化网格")
            return False
        
        if not self.mesh_data:
            logger.error("没有网格数据可视化")
            return False
        
        try:
            import pyvista as pv
            
            # 创建临时VTK文件
            temp_file = "temp_mesh_viz.vtk"
            self.export_to_vtk(temp_file)
            
            # 读取VTK并可视化
            mesh_pv = pv.read(temp_file)
            
            # 创建绘图
            plotter = pv.Plotter()
            plotter.add_mesh(mesh_pv, show_edges=show_edges, opacity=opacity)
            plotter.add_axes()
            plotter.show_grid()
            plotter.show()
            
            # 删除临时文件
            if os.path.exists(temp_file):
                os.remove(temp_file)
                
            return True
            
        except Exception as e:
            logger.error(f"可视化网格时出错: {str(e)}")
            return False


# 测试函数
def test_netgen_reader():
    """测试NetgenReader功能"""
    reader = NetgenReader()
    
    # 测试读取VTK格式
    vtk_file = "data/mesh/simple_box.vtk"
    if os.path.exists(vtk_file):
        print(f"测试读取VTK文件: {vtk_file}")
        if reader.read_mesh_file(vtk_file):
            print(f"节点数量: {len(reader.get_nodes())}")
            print(f"单元数量: {len(reader.get_elements())}")
            print(f"物理组: {reader.get_physical_groups().keys()}")
            
            # 转换为FEM格式
            fem_data = reader.convert_to_fem_format()
            print(f"FEM格式节点数量: {len(fem_data['nodes'])}")
            
            # 可视化
            reader.visualize()
    else:
        print(f"找不到测试文件: {vtk_file}")


if __name__ == "__main__":
    test_netgen_reader() 