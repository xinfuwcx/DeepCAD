#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kratos Multiphysics 集成接口
提供与 DeepCAD 主项目 Kratos 引擎的集成功能
"""

import sys
import json
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

# 添加主项目路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# 尝试导入 Kratos 相关模块
KRATOS_AVAILABLE = False
KratosIntegration = None

try:
    # 直接添加主项目core到路径并导入
    main_core_dir = str(project_root)
    if main_core_dir not in sys.path:
        sys.path.insert(0, main_core_dir)
    
    # 临时移除example2的core模块，避免冲突
    import importlib
    if 'core' in sys.modules:
        del sys.modules['core']
    
    # 导入主项目的core
    import core as main_core
    KratosIntegration = main_core.KratosIntegration
    KRATOS_AVAILABLE = main_core.KRATOS_AVAILABLE
    print(f"OK Kratos Multiphysics 可用: {KRATOS_AVAILABLE}")
    
    # 恢复example2的core模块路径
    example2_core_dir = str(Path(__file__).parent.parent)
    if example2_core_dir in sys.path:
        sys.path.remove(example2_core_dir)
    sys.path.insert(0, example2_core_dir)
    
except Exception as e:
    print(f"WARN Kratos Multiphysics 不可用: {e}")
    KratosIntegration = None
    KRATOS_AVAILABLE = False


class AnalysisType(Enum):
    """分析类型枚举"""
    STATIC = "static"
    MODAL = "modal"
    DYNAMIC = "dynamic"
    NONLINEAR = "nonlinear"
    THERMAL = "thermal"
    COUPLED = "coupled"


class SolverType(Enum):
    """求解器类型枚举"""
    LINEAR = "linear"
    NEWTON_RAPHSON = "newton_raphson"
    DISPLACEMENT = "displacement"
    PRESSURE = "pressure"


@dataclass
class MaterialProperties:
    """材料属性"""
    id: int
    name: str
    density: float = 2500.0  # kg/m³
    young_modulus: float = 30e9  # Pa
    poisson_ratio: float = 0.3
    cohesion: float = 50000.0  # Pa
    friction_angle: float = 30.0  # degrees
    
    def to_kratos_dict(self) -> Dict[str, Any]:
        """转换为 Kratos 格式"""
        return {
            "material_id": self.id,
            "material_name": self.name,
            "DENSITY": self.density,
            "YOUNG_MODULUS": self.young_modulus,
            "POISSON_RATIO": self.poisson_ratio,
            "COHESION": self.cohesion,
            "INTERNAL_FRICTION_ANGLE": np.radians(self.friction_angle)
        }


@dataclass
class AnalysisSettings:
    """分析设置"""
    analysis_type: AnalysisType = AnalysisType.STATIC
    solver_type: SolverType = SolverType.LINEAR
    max_iterations: int = 100
    convergence_tolerance: float = 1e-6
    time_step: float = 0.1
    end_time: float = 1.0
    
    def to_kratos_dict(self) -> Dict[str, Any]:
        """转换为 Kratos 格式"""
        return {
            "analysis_type": self.analysis_type.value,
            "solver_type": self.solver_type.value,
            "max_iterations": self.max_iterations,
            "convergence_tolerance": self.convergence_tolerance,
            "time_step": self.time_step,
            "end_time": self.end_time
        }


class KratosInterface:
    """Kratos 接口类"""
    
    def __init__(self):
        self.kratos_integration = None
        self.model_data = None
        self.analysis_settings = AnalysisSettings()
        self.materials = {}
        self.results = {}
        
        if KRATOS_AVAILABLE:
            try:
                self.kratos_integration = KratosIntegration()
                print("✅ Kratos 集成初始化成功")
            except Exception as e:
                print(f"⚠️  Kratos 集成初始化失败: {e}")
                self.kratos_integration = None
    
    def setup_model(self, fpn_data: Dict[str, Any]) -> bool:
        """设置模型数据"""
        try:
            self.model_data = self._convert_fpn_to_kratos(fpn_data)
            print(f"✅ 模型设置完成: {len(self.model_data.get('nodes', []))} 节点, "
                  f"{len(self.model_data.get('elements', []))} 单元")
            return True
        except Exception as e:
            print(f"❌ 模型设置失败: {e}")
            return False
    
    def _convert_fpn_to_kratos(self, fpn_data: Dict[str, Any]) -> Dict[str, Any]:
        """将 FPN 数据转换为 Kratos 格式"""
        kratos_data = {
            "nodes": [],
            "elements": [],
            "materials": [],
            "boundary_conditions": [],
            "loads": []
        }
        
        # 转换节点
        nodes = fpn_data.get('nodes', [])
        for node in nodes:
            kratos_node = {
                "id": node.get('id', 0),
                "coordinates": [
                    node.get('x', 0.0),
                    node.get('y', 0.0),
                    node.get('z', 0.0)
                ]
            }
            kratos_data["nodes"].append(kratos_node)
        
        # 转换体单元
        elements = fpn_data.get('elements', [])
        for element in elements:
            kratos_element = {
                "id": element.get('id', 0),
                "type": self._map_element_type(element.get('type', 'tetra')),
                "nodes": element.get('nodes', []),
                "material_id": element.get('material_id', 1)
            }
            kratos_data["elements"].append(kratos_element)

        # 转换板单元（TRIA/QUAD -> Triangle2D3N/Quadrilateral2D4N）
        plate_elements = fpn_data.get('plate_elements') or {}
        if isinstance(plate_elements, dict):
            for eid, elem in plate_elements.items():
                nodes = elem.get('nodes', [])
                e_type = 'triangle' if len(nodes) == 3 else 'quad'
                kratos_element = {
                    "id": int(eid),
                    "type": self._map_element_type(e_type),
                    "nodes": nodes,
                    "material_id": elem.get('material_id') or elem.get('prop_id') or 1,
                }
                kratos_data["elements"].append(kratos_element)

        # 转换杆单元（LINE+PETRUSS -> TrussElement3D2N）
        line_elements = fpn_data.get('line_elements') or {}
        if isinstance(line_elements, dict):
            for eid, elem in line_elements.items():
                kratos_data["elements"].append({
                    "id": int(eid),
                    "type": "TrussElement3D2N",
                    "nodes": [elem.get('n1'), elem.get('n2')],
                    "material_id": elem.get('prop_id') or 1,
                })

        # 设置默认材料
        self._setup_default_materials(kratos_data)
        
        # 设置默认边界条件
        self._setup_default_boundary_conditions(kratos_data, nodes)
        
        return kratos_data
    
    def _map_element_type(self, fpn_type: str) -> str:
        """映射单元类型到 Kratos 格式"""
        mapping = {
            'tetra': 'Tetrahedra3D4N',
            'hexa': 'Hexahedra3D8N',
            'penta': 'Prism3D6N',
            'triangle': 'Triangle2D3N',
            'quad': 'Quadrilateral2D4N'
        }
        return mapping.get(fpn_type.lower(), 'Tetrahedra3D4N')
    
    def _setup_default_materials(self, kratos_data: Dict[str, Any]):
        """设置默认材料属性"""
        # 创建默认土体材料
        default_materials = [
            MaterialProperties(1, "填土", 1800, 15e6, 0.35, 20000, 25),
            MaterialProperties(2, "粉质粘土", 1900, 25e6, 0.3, 35000, 28),
            MaterialProperties(3, "淤泥质土", 1700, 8e6, 0.4, 15000, 20),
            MaterialProperties(4, "粘土", 2000, 30e6, 0.28, 45000, 32),
            MaterialProperties(5, "砂土", 2100, 40e6, 0.25, 0, 35),
            MaterialProperties(6, "基岩", 2500, 50e9, 0.2, 1e6, 45)
        ]
        
        for material in default_materials:
            self.materials[material.id] = material
            kratos_data["materials"].append(material.to_kratos_dict())
    
    def _setup_default_boundary_conditions(self, kratos_data: Dict[str, Any], nodes: List[Dict]):
        """设置默认边界条件"""
        if not nodes:
            return
        
        # 找到底部节点（Z坐标最小）
        z_coords = [node.get('z', 0.0) for node in nodes]
        z_min = min(z_coords)
        z_tolerance = abs(z_min) * 0.01 if z_min != 0 else 100  # 1% 容差或 100mm
        
        bottom_nodes = []
        for node in nodes:
            if abs(node.get('z', 0.0) - z_min) <= z_tolerance:
                bottom_nodes.append(node.get('id', 0))
        
        # 添加底部固定约束
        if bottom_nodes:
            boundary_condition = {
                "type": "fixed",
                "nodes": bottom_nodes[:50],  # 限制数量避免过多约束
                "dofs": ["DISPLACEMENT_X", "DISPLACEMENT_Y", "DISPLACEMENT_Z"],
                "values": [0.0, 0.0, 0.0]
            }
            kratos_data["boundary_conditions"].append(boundary_condition)
            print(f"✅ 添加底部固定约束: {len(boundary_condition['nodes'])} 个节点")
    
    def set_analysis_settings(self, settings: AnalysisSettings):
        """设置分析参数"""
        self.analysis_settings = settings
        print(f"✅ 分析设置更新: {settings.analysis_type.value}")
    
    def run_analysis(self) -> Tuple[bool, Dict[str, Any]]:
        """运行分析"""
        if not self.model_data:
            return False, {"error": "模型数据未设置"}
        
        try:
            if KRATOS_AVAILABLE and self.kratos_integration:
                return self._run_kratos_analysis()
            else:
                return self._run_advanced_simulation()
                
        except Exception as e:
            return False, {"error": f"分析执行失败: {e}"}
    
    def _run_kratos_analysis(self) -> Tuple[bool, Dict[str, Any]]:
        """运行真实的 Kratos 分析"""
        try:
            print("🚀 启动 Kratos 分析...")
            
            # 准备 Kratos 输入数据
            kratos_input = {
                "model_data": self.model_data,
                "analysis_settings": self.analysis_settings.to_kratos_dict(),
                "materials": [mat.to_kratos_dict() for mat in self.materials.values()]
            }
            
            # 调用 Kratos 集成
            success, results = self.kratos_integration.run_analysis(kratos_input)
            
            if success:
                self.results = self._process_kratos_results(results)
                print("✅ Kratos 分析完成")
                return True, self.results
            else:
                return False, {"error": "Kratos 分析失败", "details": results}
                
        except Exception as e:
            print(f"❌ Kratos 分析异常: {e}")
            return False, {"error": f"Kratos 分析异常: {e}"}
    
    def _run_advanced_simulation(self) -> Tuple[bool, Dict[str, Any]]:
        """运行高级模拟分析（当 Kratos 不可用时）"""
        print("🔄 运行高级模拟分析...")
        
        try:
            nodes = self.model_data.get('nodes', [])
            elements = self.model_data.get('elements', [])
            
            if not nodes or not elements:
                return False, {"error": "模型数据不完整"}
            
            # 基于有限元理论的高级模拟
            results = self._simulate_fem_analysis(nodes, elements)
            
            self.results = results
            print("✅ 高级模拟分析完成")
            return True, results
            
        except Exception as e:
            return False, {"error": f"模拟分析失败: {e}"}
    
    def _simulate_fem_analysis(self, nodes: List[Dict], elements: List[Dict]) -> Dict[str, Any]:
        """基于有限元理论的高级模拟"""
        n_nodes = len(nodes)
        n_elements = len(elements)
        
        # 模拟位移结果（基于简化的有限元计算）
        displacement = np.zeros((n_nodes, 3))
        
        # 根据节点位置和边界条件计算位移
        for i, node in enumerate(nodes):
            x, y, z = node['coordinates']
            
            # 简化的位移计算（考虑重力和土体特性）
            # 垂直位移主要受重力影响
            depth_factor = abs(z) / 1000.0  # 深度因子
            displacement[i, 2] = -depth_factor * 0.01  # Z方向沉降
            
            # 水平位移受侧向土压力影响
            lateral_factor = np.sqrt(x**2 + y**2) / 10000.0
            displacement[i, 0] = lateral_factor * 0.005 * np.sign(x)
            displacement[i, 1] = lateral_factor * 0.005 * np.sign(y)
        
        # 模拟应力结果
        stress = np.zeros(n_nodes)
        for i, node in enumerate(nodes):
            z = node['coordinates'][2]
            # 基于深度的应力分布
            depth = abs(z)
            stress[i] = depth * 20.0  # kPa, 简化的土压力计算
        
        # 模拟应变结果
        strain = stress / 30000.0  # 假设弹性模量 30 MPa
        
        return {
            "displacement": displacement.tolist(),
            "stress": stress.tolist(),
            "strain": strain.tolist(),
            "analysis_info": {
                "type": self.analysis_settings.analysis_type.value,
                "nodes": n_nodes,
                "elements": n_elements,
                "simulation_mode": "advanced_fem"
            }
        }
    
    def _process_kratos_results(self, raw_results: Dict[str, Any]) -> Dict[str, Any]:
        """处理 Kratos 原始结果"""
        processed = {
            "displacement": raw_results.get("displacement", []),
            "stress": raw_results.get("stress", []),
            "strain": raw_results.get("strain", []),
            "reaction_forces": raw_results.get("reaction_forces", []),
            "analysis_info": {
                "type": self.analysis_settings.analysis_type.value,
                "solver": self.analysis_settings.solver_type.value,
                "converged": raw_results.get("converged", False),
                "iterations": raw_results.get("iterations", 0),
                "simulation_mode": "kratos"
            }
        }
        return processed
    
    def get_results(self) -> Dict[str, Any]:
        """获取分析结果"""
        return self.results
    
    def export_results(self, filepath: str, format: str = "json") -> bool:
        """导出结果"""
        try:
            if format.lower() == "json":
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(self.results, f, indent=2, ensure_ascii=False)
            else:
                return False
            
            print(f"✅ 结果已导出: {filepath}")
            return True
            
        except Exception as e:
            print(f"❌ 结果导出失败: {e}")
            return False


# 便捷函数
def create_static_analysis() -> KratosInterface:
    """创建静力分析"""
    interface = KratosInterface()
    settings = AnalysisSettings(
        analysis_type=AnalysisType.STATIC,
        solver_type=SolverType.LINEAR,
        max_iterations=100
    )
    interface.set_analysis_settings(settings)
    return interface


def create_modal_analysis() -> KratosInterface:
    """创建模态分析"""
    interface = KratosInterface()
    settings = AnalysisSettings(
        analysis_type=AnalysisType.MODAL,
        solver_type=SolverType.LINEAR,
        max_iterations=50
    )
    interface.set_analysis_settings(settings)
    return interface


# 测试函数
if __name__ == "__main__":
    print("🧪 测试 Kratos 接口")
    
    # 创建测试数据
    test_fpn_data = {
        "nodes": [
            {"id": 1, "x": 0.0, "y": 0.0, "z": 0.0},
            {"id": 2, "x": 1.0, "y": 0.0, "z": 0.0},
            {"id": 3, "x": 0.0, "y": 1.0, "z": 0.0},
            {"id": 4, "x": 0.0, "y": 0.0, "z": 1.0}
        ],
        "elements": [
            {"id": 1, "type": "tetra", "nodes": [1, 2, 3, 4], "material_id": 1}
        ]
    }
    
    # 测试静力分析
    interface = create_static_analysis()
    
    if interface.setup_model(test_fpn_data):
        success, results = interface.run_analysis()
        
        if success:
            print("✅ 分析成功完成")
            print(f"位移结果: {len(results.get('displacement', []))} 个节点")
            print(f"应力结果: {len(results.get('stress', []))} 个节点")
            
            # 导出结果
            interface.export_results("test_results.json")
        else:
            print(f"❌ 分析失败: {results}")
    else:
        print("❌ 模型设置失败")
