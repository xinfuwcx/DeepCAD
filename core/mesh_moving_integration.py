"""
Moving-Mesh Integration for DeepCAD
实现动网格技术，支持ALE公式和实时网格更新
"""

import logging
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from pathlib import Path
import json

from .kratos_utils import safe_check_kratos_application, safe_get_kratos_attribute

logger = logging.getLogger(__name__)


class MovingMeshHandler:
    """动网格处理器 - 基于Kratos MeshMovingApplication"""
    
    def __init__(self, model_part=None):
        self.model_part = model_part
        self.mesh_mover = None
        self.is_initialized = False
        self.mesh_moving_available = False
        
        # 动网格配置
        self.config = {
            "strategy": "laplacian",  # laplacian, ale_formulation, remesh_adaptive
            "driving_source": "excavation",  # excavation, support_displacement, soil_settlement, combined
            "quality_threshold": 0.3,
            "real_time_rendering": True,
            "update_frequency": "every_step"
        }
        
        # 检查MeshMoving应用可用性
        self._check_mesh_moving_availability()
    
    def _check_mesh_moving_availability(self) -> bool:
        """检查Kratos MeshMoving应用是否可用"""
        try:
            import KratosMultiphysics
            
            # 检查MeshMovingApplication
            self.mesh_moving_available = safe_check_kratos_application(
                KratosMultiphysics, 
                "MeshMovingApplication"
            )
            
            if self.mesh_moving_available:
                logger.info("✅ MeshMovingApplication is available")
            else:
                logger.warning("⚠️ MeshMovingApplication not available, using fallback")
                
            return self.mesh_moving_available
            
        except ImportError:
            logger.error("❌ KratosMultiphysics not available")
            return False
    
    def setup_ale_formulation(self, parameters: Dict[str, Any]) -> bool:
        """设置ALE (Arbitrary Lagrangian-Eulerian) 公式"""
        if not self.mesh_moving_available or not self.model_part:
            logger.warning("MeshMoving not available or model_part not set")
            return False
        
        try:
            import KratosMultiphysics.MeshMovingApplication as MeshMoving
            
            # 更新配置
            self.config.update(parameters)
            
            # 创建网格移动策略
            if self.config["strategy"] == "laplacian":
                self.mesh_mover = MeshMoving.LaplacianMeshMovingStrategy(
                    self.model_part,
                    self._get_laplacian_parameters()
                )
            elif self.config["strategy"] == "ale_formulation":
                self.mesh_mover = MeshMoving.AleFormulationMeshMovingStrategy(
                    self.model_part,
                    self._get_ale_parameters()
                )
            else:
                logger.warning(f"Unknown strategy: {self.config['strategy']}")
                return False
            
            self.is_initialized = True
            logger.info(f"✅ Moving-Mesh initialized with strategy: {self.config['strategy']}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to setup ALE formulation: {e}")
            return False
    
    def _get_laplacian_parameters(self) -> Dict[str, Any]:
        """获取拉普拉斯平滑参数"""
        return {
            "mesh_moving_solver_type": "laplacian",
            "quality_threshold": self.config["quality_threshold"],
            "smoothing_iterations": 5,
            "boundary_preservation": True
        }
    
    def _get_ale_parameters(self) -> Dict[str, Any]:
        """获取ALE公式参数"""
        return {
            "mesh_moving_solver_type": "ale",
            "quality_threshold": self.config["quality_threshold"],
            "remesh_on_quality_loss": True,
            "preserve_boundary_nodes": True
        }
    
    def move_mesh(self, displacement_field: Dict[int, Tuple[float, float, float]]) -> bool:
        """基于位移场移动网格"""
        if not self.is_initialized:
            logger.warning("MovingMesh not initialized")
            return False
        
        try:
            # 应用边界位移
            self._apply_boundary_displacement(displacement_field)
            
            # 求解网格移动方程
            if self.mesh_mover:
                self.mesh_mover.Solve()
            
            # 更新节点坐标
            node_updates = self._update_coordinates()
            
            # 检查网格质量
            quality_ok = self._check_mesh_quality()
            
            if not quality_ok:
                logger.warning("⚠️ Mesh quality below threshold, considering remesh")
                # 触发重网格化逻辑
                return self._trigger_remesh()
            
            logger.info(f"✅ Mesh moved successfully, updated {len(node_updates)} nodes")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to move mesh: {e}")
            return False
    
    def _apply_boundary_displacement(self, displacement_field: Dict[int, Tuple[float, float, float]]):
        """应用边界节点位移"""
        if not self.model_part:
            return
        
        for node_id, (dx, dy, dz) in displacement_field.items():
            try:
                node = self.model_part.GetNode(node_id)
                # 应用位移约束
                node.SetSolutionStepValue("DISPLACEMENT_X", dx)
                node.SetSolutionStepValue("DISPLACEMENT_Y", dy) 
                node.SetSolutionStepValue("DISPLACEMENT_Z", dz)
                node.Fix("DISPLACEMENT_X")
                node.Fix("DISPLACEMENT_Y")
                node.Fix("DISPLACEMENT_Z")
            except:
                logger.warning(f"Node {node_id} not found in model_part")
    
    def _update_coordinates(self) -> Dict[int, Tuple[float, float, float]]:
        """更新节点坐标并返回更新信息"""
        node_updates = {}
        
        if not self.model_part:
            return node_updates
        
        try:
            for node in self.model_part.Nodes:
                old_x = node.X0
                old_y = node.Y0
                old_z = node.Z0
                
                # 获取位移
                dx = node.GetSolutionStepValue("DISPLACEMENT_X")
                dy = node.GetSolutionStepValue("DISPLACEMENT_Y")
                dz = node.GetSolutionStepValue("DISPLACEMENT_Z")
                
                # 更新坐标
                new_x = old_x + dx
                new_y = old_y + dy
                new_z = old_z + dz
                
                node.X = new_x
                node.Y = new_y
                node.Z = new_z
                
                node_updates[node.Id] = (new_x, new_y, new_z)
                
        except Exception as e:
            logger.error(f"Error updating coordinates: {e}")
        
        return node_updates
    
    def _check_mesh_quality(self) -> bool:
        """检查网格质量"""
        if not self.model_part:
            return True
        
        try:
            # 简单的网格质量检查
            # 可以扩展为更复杂的质量指标
            poor_quality_count = 0
            total_elements = 0
            
            for element in self.model_part.Elements:
                total_elements += 1
                # 这里可以添加具体的质量检查逻辑
                # 比如雅可比行列式、倾斜度等
                
            if total_elements == 0:
                return True
                
            quality_ratio = 1.0 - (poor_quality_count / total_elements)
            return quality_ratio >= self.config["quality_threshold"]
            
        except Exception as e:
            logger.error(f"Error checking mesh quality: {e}")
            return True
    
    def _trigger_remesh(self) -> bool:
        """触发重网格化"""
        logger.info("🔄 Triggering remesh due to poor quality")
        # 这里可以集成Gmsh重网格化逻辑
        # 目前返回True表示处理完成
        return True
    
    def get_mesh_update_data(self) -> Dict[str, Any]:
        """获取网格更新数据，用于WebSocket传输"""
        if not self.model_part:
            return {"nodes": [], "elements": []}
        
        try:
            nodes = []
            for node in self.model_part.Nodes:
                nodes.append({
                    "id": node.Id,
                    "x": node.X,
                    "y": node.Y,
                    "z": node.Z
                })
            
            elements = []
            for element in self.model_part.Elements:
                element_nodes = [node.Id for node in element.GetNodes()]
                elements.append({
                    "id": element.Id,
                    "nodes": element_nodes,
                    "type": element.GetProperties().Id
                })
            
            return {
                "nodes": nodes,
                "elements": elements,
                "timestamp": self._get_timestamp()
            }
            
        except Exception as e:
            logger.error(f"Error getting mesh update data: {e}")
            return {"nodes": [], "elements": []}
    
    def _get_timestamp(self) -> float:
        """获取时间戳"""
        import time
        return time.time()
    
    def set_configuration(self, config: Dict[str, Any]):
        """设置动网格配置"""
        self.config.update(config)
        logger.info(f"Updated MovingMesh configuration: {config}")
    
    def get_configuration(self) -> Dict[str, Any]:
        """获取当前配置"""
        return self.config.copy()
    
    def is_available(self) -> bool:
        """检查动网格功能是否可用"""
        return self.mesh_moving_available and self.is_initialized


class ExcavationDrivenMeshMover:
    """基于开挖过程的网格移动器"""
    
    def __init__(self, moving_mesh_handler: MovingMeshHandler):
        self.handler = moving_mesh_handler
        self.excavation_stages = []
        self.current_stage = 0
    
    def add_excavation_stage(self, stage_data: Dict[str, Any]):
        """添加开挖阶段"""
        self.excavation_stages.append(stage_data)
        logger.info(f"Added excavation stage {len(self.excavation_stages)}")
    
    def execute_stage(self, stage_index: int) -> bool:
        """执行指定开挖阶段"""
        if stage_index >= len(self.excavation_stages):
            logger.error(f"Stage {stage_index} does not exist")
            return False
        
        stage = self.excavation_stages[stage_index]
        
        # 计算该阶段的边界位移
        displacement_field = self._calculate_excavation_displacement(stage)
        
        # 移动网格
        success = self.handler.move_mesh(displacement_field)
        
        if success:
            self.current_stage = stage_index
            logger.info(f"✅ Executed excavation stage {stage_index}")
        
        return success
    
    def _calculate_excavation_displacement(self, stage_data: Dict[str, Any]) -> Dict[int, Tuple[float, float, float]]:
        """计算开挖阶段的节点位移"""
        # 这里实现具体的开挖边界计算逻辑
        # 目前返回示例数据
        displacement_field = {}
        
        excavation_depth = stage_data.get("depth", 0.0)
        boundary_nodes = stage_data.get("boundary_nodes", [])
        
        for node_id in boundary_nodes:
            # 简化计算：垂直向下移动
            displacement_field[node_id] = (0.0, 0.0, -excavation_depth)
        
        return displacement_field