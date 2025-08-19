"""
Terra GMSH 几何引擎 (桌面版)
基于 GMSH 内置 OCC 的核心几何建模引擎
"""

import gmsh
import logging
import tempfile
import os
from typing import Dict, Any, List, Tuple, Optional
from PyQt6.QtCore import QObject, pyqtSignal

logger = logging.getLogger(__name__)

class GMSHEngine(QObject):
    """Terra 核心几何建模引擎 (支持 Qt 信号)"""
    
    # Qt 信号定义
    geometry_changed = pyqtSignal()
    mesh_generated = pyqtSignal(dict)
    operation_completed = pyqtSignal(str, bool, str)  # operation, success, message
    
    def __init__(self, config=None):
        """初始化 GMSH 引擎"""
        super().__init__()
        
        self.config = config
        self._initialized = False
        self._current_model = None
        self.geometry_entities = []  # 存储几何实体
        self.mesh_info = {}
        
        self.initialize()
    
    def initialize(self):
        """初始化 GMSH"""
        try:
            if not self._initialized:
                gmsh.initialize()
                
                # 从配置获取设置
                if self.config:
                    verbosity = self.config.get("gmsh.verbosity", 1)
                    terminal = self.config.get("gmsh.terminal", 1)
                else:
                    verbosity = 1
                    terminal = 1
                
                gmsh.option.setNumber("General.Terminal", terminal)
                gmsh.option.setNumber("General.Verbosity", verbosity)
                
                self._initialized = True
                logger.info("GMSH 引擎初始化成功")
                
        except Exception as e:
            logger.error(f"❌ GMSH 引擎初始化失败: {e}")
            raise
    
    def cleanup(self):
        """清理 GMSH 资源"""
        try:
            if self._initialized:
                gmsh.finalize()
                self._initialized = False
                logger.info("GMSH 引擎清理完成")
        except Exception as e:
            logger.error(f"❌ GMSH 引擎清理失败: {e}")
    
    def create_new_model(self, name: str = "TerraModel") -> str:
        """创建新的几何模型"""
        try:
            model_name = f"{name}_{id(self)}"
            gmsh.model.add(model_name)
            self._current_model = model_name
            self.geometry_entities = []
            
            logger.info(f"📐 创建新模型: {model_name}")
            self.geometry_changed.emit()
            
            return model_name
            
        except Exception as e:
            logger.error(f"创建模型失败: {e}")
            self.operation_completed.emit("create_model", False, str(e))
            raise
    
    def create_box(self, x=0, y=0, z=0, dx=1, dy=1, dz=1, name="Box") -> int:
        """创建立方体"""
        try:
            box_tag = gmsh.model.occ.addBox(x, y, z, dx, dy, dz)
            gmsh.model.occ.synchronize()
            
            # 记录几何实体
            entity_info = {
                "type": "box",
                "tag": box_tag,
                "name": name,
                "parameters": {"x": x, "y": y, "z": z, "dx": dx, "dy": dy, "dz": dz}
            }
            self.geometry_entities.append(entity_info)
            
            logger.info(f"📦 创建立方体: {name} (tag={box_tag})")
            self.geometry_changed.emit()
            self.operation_completed.emit("create_box", True, f"立方体 {name} 创建成功")
            
            return box_tag
            
        except Exception as e:
            logger.error(f"创建立方体失败: {e}")
            self.operation_completed.emit("create_box", False, str(e))
            raise
    
    def create_cylinder(self, x=0, y=0, z=0, dx=0, dy=0, dz=1, r=0.5, name="Cylinder") -> int:
        """创建圆柱体"""
        try:
            cylinder_tag = gmsh.model.occ.addCylinder(x, y, z, dx, dy, dz, r)
            gmsh.model.occ.synchronize()
            
            # 记录几何实体
            entity_info = {
                "type": "cylinder",
                "tag": cylinder_tag,
                "name": name,
                "parameters": {"x": x, "y": y, "z": z, "dx": dx, "dy": dy, "dz": dz, "r": r}
            }
            self.geometry_entities.append(entity_info)
            
            logger.info(f"🟢 创建圆柱体: {name} (tag={cylinder_tag})")
            self.geometry_changed.emit()
            self.operation_completed.emit("create_cylinder", True, f"圆柱体 {name} 创建成功")
            
            return cylinder_tag
            
        except Exception as e:
            logger.error(f"创建圆柱体失败: {e}")
            self.operation_completed.emit("create_cylinder", False, str(e))
            raise
    
    def create_sphere(self, x=0, y=0, z=0, r=0.5, name="Sphere") -> int:
        """创建球体"""
        try:
            sphere_tag = gmsh.model.occ.addSphere(x, y, z, r)
            gmsh.model.occ.synchronize()
            
            # 记录几何实体
            entity_info = {
                "type": "sphere",
                "tag": sphere_tag,
                "name": name,
                "parameters": {"x": x, "y": y, "z": z, "r": r}
            }
            self.geometry_entities.append(entity_info)
            
            logger.info(f"🔵 创建球体: {name} (tag={sphere_tag})")
            self.geometry_changed.emit()
            self.operation_completed.emit("create_sphere", True, f"球体 {name} 创建成功")
            
            return sphere_tag
            
        except Exception as e:
            logger.error(f"创建球体失败: {e}")
            self.operation_completed.emit("create_sphere", False, str(e))
            raise
    
    def boolean_operation(self, operation: str, objects: List[Tuple[int, int]], 
                         tools: List[Tuple[int, int]], name: str = None) -> List[Tuple[int, int]]:
        """布尔运算"""
        try:
            if operation == 'union' or operation == 'fuse':
                result, _ = gmsh.model.occ.fuse(objects, tools)
            elif operation == 'cut':
                result, _ = gmsh.model.occ.cut(objects, tools)
            elif operation == 'intersect':
                result, _ = gmsh.model.occ.intersect(objects, tools)
            elif operation == 'fragment':
                result, _ = gmsh.model.occ.fragment(objects, tools)
            else:
                raise ValueError(f"不支持的布尔运算: {operation}")
            
            gmsh.model.occ.synchronize()
            
            # 记录操作结果
            if name:
                entity_info = {
                    "type": f"boolean_{operation}",
                    "tag": result[0][1] if result else None,
                    "name": name,
                    "parameters": {"operation": operation, "objects": objects, "tools": tools}
                }
                self.geometry_entities.append(entity_info)
            
            logger.info(f"🔄 布尔运算完成: {operation}")
            self.geometry_changed.emit()
            self.operation_completed.emit(f"boolean_{operation}", True, f"{operation} 运算完成")
            
            return result
            
        except Exception as e:
            logger.error(f"布尔运算失败: {e}")
            self.operation_completed.emit(f"boolean_{operation}", False, str(e))
            raise
    
    def generate_mesh(self, mesh_size: float = None) -> Dict[str, Any]:
        """生成网格"""
        try:
            if mesh_size is None:
                mesh_size = self.config.get("gmsh.default_mesh_size", 1.0) if self.config else 1.0
            
            # 设置网格尺寸
            gmsh.model.mesh.setSize(gmsh.model.getEntities(0), mesh_size)
            
            # 生成网格
            gmsh.model.mesh.generate(3)
            
            # 获取网格统计信息
            nodes, coords, _ = gmsh.model.mesh.getNodes()
            elements_info = gmsh.model.mesh.getElements()
            
            mesh_info = {
                "num_nodes": len(nodes),
                "num_elements": sum(len(elem_tags) for elem_tags in elements_info[1]),
                "mesh_size": mesh_size,
                "status": "success"
            }
            
            self.mesh_info = mesh_info
            
            logger.info(f"🕸️ 网格生成完成: {mesh_info['num_nodes']} 节点, {mesh_info['num_elements']} 单元")
            self.mesh_generated.emit(mesh_info)
            self.operation_completed.emit("generate_mesh", True, "网格生成成功")
            
            return mesh_info
            
        except Exception as e:
            logger.error(f"网格生成失败: {e}")
            self.operation_completed.emit("generate_mesh", False, str(e))
            raise
    
    def get_geometry_entities(self) -> List[Dict[str, Any]]:
        """获取几何实体列表"""
        return self.geometry_entities.copy()
    
    def get_mesh_info(self) -> Dict[str, Any]:
        """获取网格信息"""
        return self.mesh_info.copy()
    
    def export_mesh(self, filename: str) -> str:
        """导出网格文件"""
        try:
            # 确保输出目录存在
            output_dir = self.config.create_output_dir() if self.config else Path("output")
            output_dir = Path(output_dir)
            output_dir.mkdir(exist_ok=True)
            
            # 构建完整路径
            full_path = output_dir / filename
            
            # 导出文件
            gmsh.write(str(full_path))
            
            logger.info(f"💾 网格导出成功: {full_path}")
            self.operation_completed.emit("export_mesh", True, f"网格已导出到: {filename}")
            
            return str(full_path)
            
        except Exception as e:
            logger.error(f"网格导出失败: {e}")
            self.operation_completed.emit("export_mesh", False, str(e))
            raise
    
    def clear_model(self):
        """清空当前模型"""
        try:
            if self._current_model:
                gmsh.model.remove()
                self.geometry_entities = []
                self.mesh_info = {}
                
                logger.info("🗑️ 模型已清空")
                self.geometry_changed.emit()
                
        except Exception as e:
            logger.error(f"清空模型失败: {e}")
    
    def get_model_bounds(self) -> Tuple[float, float, float, float, float, float]:
        """获取模型边界框"""
        try:
            entities = gmsh.model.getEntities()
            if not entities:
                return (-1, 1, -1, 1, -1, 1)  # 默认边界
            
            # 获取所有实体的边界框
            min_x = min_y = min_z = float('inf')
            max_x = max_y = max_z = float('-inf')
            
            for dim, tag in entities:
                try:
                    bbox = gmsh.model.getBoundingBox(dim, tag)
                    min_x = min(min_x, bbox[0])
                    min_y = min(min_y, bbox[1])
                    min_z = min(min_z, bbox[2])
                    max_x = max(max_x, bbox[3])
                    max_y = max(max_y, bbox[4])
                    max_z = max(max_z, bbox[5])
                except:
                    continue
            
            if min_x == float('inf'):
                return (-1, 1, -1, 1, -1, 1)
            
            return (min_x, max_x, min_y, max_y, min_z, max_z)
            
        except Exception as e:
            logger.error(f"获取模型边界失败: {e}")
            return (-1, 1, -1, 1, -1, 1)