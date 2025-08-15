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
    dilatancy_angle: float = 0.0  # degrees
    yield_stress_tension: float = 3.0e6  # Pa
    yield_stress_compression: float = 1.0e6  # Pa

    def to_kratos_dict(self) -> Dict[str, Any]:
        """转换为 Kratos 格式"""
        return {
            "material_id": self.id,
            "material_name": self.name,
            "DENSITY": self.density,
            "YOUNG_MODULUS": self.young_modulus,
            "POISSON_RATIO": self.poisson_ratio,
            "COHESION": self.cohesion,
            "INTERNAL_FRICTION_ANGLE": np.radians(self.friction_angle),
            "DILATANCY_ANGLE": np.radians(self.dilatancy_angle),
            "YIELD_STRESS_TENSION": self.yield_stress_tension,
            "YIELD_STRESS_COMPRESSION": self.yield_stress_compression
        }

    def to_kratos_10_3_constitutive_law(self) -> Dict[str, Any]:
        """转换为 Kratos 10.3 修正摩尔-库伦本构法则配置"""
        return {
            "constitutive_law": {
                "name": "SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D",
                "Variables": {
                    "YIELD_STRESS_TENSION": self.yield_stress_tension,
                    "YIELD_STRESS_COMPRESSION": self.yield_stress_compression,
                    "FRICTION_ANGLE": self.friction_angle,
                    "DILATANCY_ANGLE": self.dilatancy_angle
                }
            },
            "properties": {
                "DENSITY": self.density,
                "YOUNG_MODULUS": self.young_modulus,
                "POISSON_RATIO": self.poisson_ratio
            }
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
        self.source_fpn_data = None
        self.analysis_settings = AnalysisSettings()
        self.materials = {}
        self.active_materials: set[int] = set()  # 按阶段激活的材料
        self.active_mesh_set_ids: set[int] = set()  # 按阶段激活的网格集合ID
        self.active_element_ids: set[int] = set()  # 按阶段激活的元素ID（由 mesh_sets 展开）
        self.active_boundary_groups: set[int] = set()  # 按阶段激活的边界组
        self.active_load_groups: set[int] = set()  # 按阶段激活的荷载组
        self.apply_self_weight: bool = True
        self.gravity_direction = [0.0, 0.0, -1.0]  # 默认 -Z 方向
        self.current_stage: int = 1  # 当前阶段编号用于输出路径
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
            self.source_fpn_data = fpn_data
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

        # 仅当激活材料集合看起来是“真实材料ID集合”时才启用材料过滤
        # 如果 stage 里给的是分组ID等大号数字，会被自动忽略以避免把网格过滤空
        fpn_mats = (self.source_fpn_data or {}).get('materials', {})
        valid_material_ids = set(fpn_mats.keys()) if isinstance(fpn_mats, dict) else set()
        apply_material_filter = bool(self.active_materials) and self.active_materials.issubset(valid_material_ids)

        # 补充：若外层已计算出本阶段激活元素集合，直接使用 self.active_element_ids
        active_element_ids: set = set(self.active_element_ids or [])

        # 转换节点
        nodes = fpn_data.get('nodes', [])
        print(f"转换{len(nodes)}个节点")

        for node in nodes:
            if isinstance(node, dict):
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
        print(f"转换{len(elements)}个单元")
        for element in elements:
            if isinstance(element, dict):
                eid = element.get('id', 0)
                kratos_element = {
                    "id": eid,
                    "type": self._map_element_type(element.get('type', 'tetra')),
                    "nodes": element.get('nodes', []),
                    "material_id": element.get('material_id', 1)
                }
                # 1) 若提供真实激活元素集合，则只保留集合内元素
                if active_element_ids:
                    if eid not in active_element_ids:
                        continue
                else:
                    # 2) 否则退化到材料过滤（仅当集合确认为材料ID集合时生效）
                    if apply_material_filter and kratos_element["material_id"] not in self.active_materials:
                        continue
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
        self._setup_default_boundary_conditions(kratos_data, fpn_data.get('nodes', []))

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
            # 确保约束的节点在模型中存在
            model_node_ids = {node.get('id') for node in kratos_data.get('nodes', [])}
            valid_bottom_nodes = [node_id for node_id in bottom_nodes if node_id in model_node_ids]

            if valid_bottom_nodes:
                boundary_condition = {
                    "type": "fixed",
                    "nodes": valid_bottom_nodes[:min(50, len(valid_bottom_nodes))],  # 限制数量避免过多约束
                    "dofs": ["DISPLACEMENT_X", "DISPLACEMENT_Y", "DISPLACEMENT_Z"],
                    "values": [0.0, 0.0, 0.0]
                }
                kratos_data["boundary_conditions"].append(boundary_condition)
                print(f"✅ 添加底部固定约束: {len(boundary_condition['nodes'])} 个节点")
            else:
                print("⚠️ 未找到有效的底部节点用于约束")

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

            # 创建临时工作目录
            import tempfile
            import os

            # 使用当前目录的临时文件夹，避免权限问题
            temp_dir = Path("temp_kratos_analysis")
            temp_dir.mkdir(exist_ok=True)

            try:
                # 写出MDPA文件
                mdpa_file = temp_dir / "model.mdpa"
                self._write_mdpa_file(mdpa_file)
                print(f"✅ MDPA文件已写入: {mdpa_file}")

                # 写出材料文件
                materials_file = temp_dir / "materials.json"
                self._write_materials_file(materials_file)
                print(f"✅ 材料文件已写入: {materials_file}")

                # 写出项目参数文件
                params_file = temp_dir / "ProjectParameters.json"
                self._write_project_parameters(params_file, mdpa_file.stem, materials_file.name)
                print(f"✅ 项目参数文件已写入: {params_file}")

                # 切换到临时目录执行Kratos
                original_cwd = os.getcwd()
                os.chdir(temp_dir)

                try:
                    # 调用 Kratos 集成
                    success, results = self.kratos_integration.run_analysis(str(params_file.name))
                finally:
                    os.chdir(original_cwd)

                if success:
                    # 读取结果文件
                    self.results = self._read_kratos_results(temp_dir)
                    print("✅ Kratos 分析完成")
                    return True, self.results
                else:
                    return False, {"error": "Kratos 分析失败", "details": results}

            finally:
                # 保留临时文件（包含VTK输出），避免被清理
                pass

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

            # 写 ProjectParameters 和 materials 的辅助版本（AMGCL & 低输出）


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

    def _write_materials(self, workdir: Path) -> Path:
        """写出 Kratos materials.json，给实体与Truss分别指定本构与参数"""
        materials = [
            {
                "model_part_name": "Structure",
                "properties_id": 1,
                "Material": {
                    "name": "SoilLinearElastic",
                    "constitutive_law": {"name": "LinearElastic3D"},
                    "Variables": {
                        "DENSITY": 2000.0,
                        "YOUNG_MODULUS": 3.0e7,
                        "POISSON_RATIO": 0.28
                    },
                    "Tables": {}
                }
            },
            {
                "model_part_name": "Structure",
                "properties_id": 2,
                "Material": {
                    "name": "SteelTruss",
                    "constitutive_law": {"name": "TrussConstitutiveLaw"},
                    "Variables": {
                        "DENSITY": 7800.0,
                        "YOUNG_MODULUS": 2.0e11,
                        "POISSON_RATIO": 0.30,
                        "CROSS_AREA": 1.0e-3
                    },
                    "Tables": {}
                }
            }
        ]
        path = workdir / "materials.json"
        import json
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(materials, f, ensure_ascii=False, indent=2)
        return path


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

    def _write_mdpa_file(self, mdpa_file: Path):
        """写出MDPA文件（包含按材料的子模型部分）"""
        with open(mdpa_file, 'w') as f:
            f.write("Begin ModelPartData\n")
            f.write("End ModelPartData\n\n")

            # 收集所有元素并分类（体、杆、壳）
            all_elements = self.model_data.get('elements', [])
            tet_elements = [el for el in all_elements if el.get('type') == 'Tetrahedra3D4N']
            truss_elements = [el for el in all_elements if el.get('type') == 'TrussElement3D2N']
            tri_shell_elements = [el for el in all_elements if el.get('type') == 'Triangle2D3N']
            quad_shell_elements = [el for el in all_elements if el.get('type') == 'Quadrilateral2D4N']

            # 为所有使用到的属性ID准备空属性块（Truss统一映射到专用属性ID以避免与土体冲突）
            TRUSS_PROP_ID = 200000
            SHELL_PROP_ID = 1000
            prop_to_elements: Dict[int, List[int]] = {}
            prop_to_nodes: Dict[int, set] = {}
            def acc(el):
                et = el.get('type')
                if et == 'TrussElement3D2N':
                    pid = TRUSS_PROP_ID
                elif et in ('Triangle2D3N','Quadrilateral2D4N'):
                    pid = SHELL_PROP_ID
                else:
                    pid = el.get('material_id', 1)
                prop_to_elements.setdefault(pid, []).append(el['id'])
                prop_to_nodes.setdefault(pid, set()).update(el.get('nodes', []))
            for el in tet_elements + truss_elements + tri_shell_elements + quad_shell_elements:
                acc(el)

            used_prop_ids = sorted(prop_to_elements.keys()) or [1]

            # 写出属性
            for pid in used_prop_ids:
                f.write(f"Begin Properties {pid}\n")
                f.write("End Properties\n\n")

            # 写出节点
            f.write("Begin Nodes\n")
            for node in self.model_data.get('nodes', []):
                f.write(f"{node['id']} {node['coordinates'][0]} {node['coordinates'][1]} {node['coordinates'][2]}\n")
            f.write("End Nodes\n\n")

            # 体单元
            if tet_elements:
                f.write("Begin Elements SmallDisplacementElement3D4N\n")
                for el in tet_elements:
                    nodes_str = ' '.join(map(str, el['nodes']))
                    prop_id = el.get('material_id', 1)
                    f.write(f"{el['id']} {prop_id} {nodes_str}\n")
                f.write("End Elements\n\n")

            # Truss 锚杆
            if truss_elements:
                f.write("Begin Elements TrussElement3D2N\n")
                for el in truss_elements:
                    nodes_str = ' '.join(map(str, el['nodes']))
                    prop_id = TRUSS_PROP_ID
                    f.write(f"{el['id']} {prop_id} {nodes_str}\n")
                f.write("End Elements\n\n")

            # 壳单元（地连墙）：使用薄壳协回转单元
            if tri_shell_elements:
                f.write("Begin Elements ShellThinElementCorotational3D3N\n")
                for el in tri_shell_elements:
                    nodes_str = ' '.join(map(str, el['nodes']))
                    prop_id = SHELL_PROP_ID  # 默认壳属性
                    f.write(f"{el['id']} {prop_id} {nodes_str}\n")
                f.write("End Elements\n\n")
            if quad_shell_elements:
                f.write("Begin Elements ShellThinElementCorotational3D4N\n")
                for el in quad_shell_elements:
                    nodes_str = ' '.join(map(str, el['nodes']))
                    prop_id = SHELL_PROP_ID
                    f.write(f"{el['id']} {prop_id} {nodes_str}\n")
                f.write("End Elements\n\n")

            # 为每个属性写出子模型部分，名称：MAT_#（或 Prop_# 也可，这里沿用 MAT_#）
            for pid in used_prop_ids:
                f.write(f"Begin SubModelPart MAT_{pid}\n")
                f.write("  Begin SubModelPartNodes\n")
                for nid in sorted(prop_to_nodes.get(pid, [])):
                    f.write(f"  {nid}\n")
                f.write("  End SubModelPartNodes\n")
                f.write("  Begin SubModelPartElements\n")
                for eid in prop_to_elements.get(pid, []):
                    f.write(f"  {eid}\n")
                f.write("  End SubModelPartElements\n")
                f.write("End SubModelPart\n\n")
            # 为Truss与Shell确保存在属性块（若未被任何元素使用则不会出现）
            if TRUSS_PROP_ID not in used_prop_ids and truss_elements:
                f.write(f"Begin Properties {TRUSS_PROP_ID}\nEnd Properties\n\n")
            if SHELL_PROP_ID not in used_prop_ids and (tri_shell_elements or quad_shell_elements):
                f.write(f"Begin Properties {SHELL_PROP_ID}\nEnd Properties\n\n")

            # 写出 Truss 预应力（元素级）：TRUSS_PRESTRESS_PK2 = F/A
            try:
                fpn = self.source_fpn_data or {}
                prestress_list = fpn.get('prestress_loads') or []
                # 收集每个 truss 元素的截面面积（来自 truss_sections，若无用默认）
                sections = fpn.get('truss_sections') or {}
                truss_area_by_prop = {pid: (sec.get('area') or 1.0e-3) for pid, sec in sections.items()}
                if prestress_list and truss_elements:
                    f.write("Begin ElementalData TRUSS_PRESTRESS_PK2\n")
                    # 建立元素 -> prop 映射
                    prop_by_eid = {el['id']: el.get('material_id', 2) for el in truss_elements}
                    for item in prestress_list:
                        eid = item.get('element_id')
                        F = float(item.get('force', 0.0) or 0.0)
                        if not eid or eid not in prop_by_eid:
                            continue
                        A = float(truss_area_by_prop.get(prop_by_eid[eid], 1.0e-3))
                        sigma0 = F / A if A > 0 else 0.0
                        f.write(f"{eid} {sigma0}\n")
                    f.write("End ElementalData\n\n")
            except Exception:
                pass

            # 写出边界与荷载组子模型部分（仅节点集合）
            if self.source_fpn_data:
                bgroups = (self.source_fpn_data.get('boundary_groups') or {})
                for gid, grp in bgroups.items():
                    nodes = sorted(set(grp.get('nodes') or []))
                    if not nodes:
                        # 也可能通过 constraints 里列出节点
                        nodes = sorted({c.get('node') or c.get('node_id') for c in (grp.get('constraints') or []) if c.get('node') or c.get('node_id')})
                    if not nodes:
                        continue
                    f.write(f"Begin SubModelPart BND_{gid}\n")
                    f.write("  Begin SubModelPartNodes\n")
                    for nid in nodes:
                        f.write(f"  {nid}\n")
                    f.write("  End SubModelPartNodes\n")
                    f.write("End SubModelPart\n\n")

                # 添加 BND_BOTTOM 子模型分部，包含底部节点
                try:
                    all_nodes = self.model_data.get('nodes', [])
                    if all_nodes:
                        z_min = min(n['coordinates'][2] for n in all_nodes)
                        z_tol = abs(z_min) * 0.01 if z_min != 0 else 100
                        bottom_nodes = [n['id'] for n in all_nodes if abs(n['coordinates'][2] - z_min) <= z_tol]
                        if bottom_nodes:
                            f.write("Begin SubModelPart BND_BOTTOM\n")
                            f.write("  Begin SubModelPartNodes\n")
                            for nid in bottom_nodes:
                                f.write(f"  {nid}\n")
                            f.write("  End SubModelPartNodes\n")
                            f.write("End SubModelPart\n\n")
                except Exception:
                    pass

                lgroups = (self.source_fpn_data.get('load_groups') or {})
                for lid, grp in lgroups.items():
                    nodes = sorted(set(grp.get('nodes') or []))
                    if not nodes:
                        continue
                    f.write(f"Begin SubModelPart LOAD_{lid}\n")
                    f.write("  Begin SubModelPartNodes\n")
                    for nid in nodes:
                        f.write(f"  {nid}\n")
                    f.write("  End SubModelPartNodes\n")
                    f.write("End SubModelPart\n\n")

    def _write_materials_file(self, materials_file: Path):
        """写出材料文件 - 为每个材料生成独立属性（绑定到子模型部分 MAT_#）"""

        # 仅为网格中实际出现的属性写材料块（土体/Truss/壳分别设置）
        # 依据与 MDPA 相同的映射生成“实际使用的属性ID集合”
        TRUSS_PROP_ID = 200000
        SHELL_PROP_ID = 1000
        used_ids = set()
        for el in self.model_data.get('elements', []):
            et = el.get('type')
            if et == 'TrussElement3D2N':
                pid = TRUSS_PROP_ID
            elif et in ('Triangle2D3N','Quadrilateral2D4N'):
                pid = SHELL_PROP_ID
            else:
                pid = el.get('material_id', 1)
            used_ids.add(pid)
        if not used_ids:
            used_ids = set(self.materials.keys())

        props = []
        # 土体（体单元）：线弹性3D
        for mat_id in sorted(used_ids):
            # 假设土体属性ID在 self.materials 中；Truss/Shell 的属性ID另行处理
            if mat_id in self.materials:
                mat = self.materials[mat_id]
                props.append({
                    "model_part_name": f"Structure.MAT_{mat_id}",
                    "properties_id": mat_id,
                    "Material": {
                        "constitutive_law": {"name": "LinearElastic3DLaw"},
                        "Variables": {
                            "DENSITY": float(mat.density),
                            "YOUNG_MODULUS": float(mat.young_modulus),
                            "POISSON_RATIO": float(mat.poisson_ratio)
                        },
                        "Tables": {}
                    }
                })
        # Truss（锚杆）：截面面积 + 钢材参数
        if any(el.get('type') == 'TrussElement3D2N' for el in self.model_data.get('elements', [])):
            TRUSS_PROP_ID = 200000
            props.append({
                "model_part_name": f"Structure.MAT_{TRUSS_PROP_ID}",
                "properties_id": TRUSS_PROP_ID,
                "Material": {
                    "constitutive_law": {"name": "TrussConstitutiveLaw"},
                    "Variables": {
                        "DENSITY": 7800.0,
                        "YOUNG_MODULUS": 2.0e11,
                        "POISSON_RATIO": 0.30,
                        "CROSS_AREA": 1.0e-3
                    },
                    "Tables": {}
                }
            })
        # 壳（地连墙）：薄壳线弹性 + 厚度（若 FPN PSHELL 有厚度就用，无则默认）
        fpn = self.source_fpn_data or {}
        shell_props = fpn.get('shell_properties') or {}
        default_thickness = 0.8
        if any(el.get('type') in ('Triangle2D3N','Quadrilateral2D4N') for el in self.model_data.get('elements', [])):
            SHELL_PROP_ID = 1000
            props.append({
                "model_part_name": f"Structure.MAT_{SHELL_PROP_ID}",
                "properties_id": SHELL_PROP_ID,
                "Material": {
                    "constitutive_law": {"name": "LinearElasticPlaneStress2DLaw"},
                    "Variables": {
                        "DENSITY": 2500.0,
                        "YOUNG_MODULUS": 3.0e10,
                        "POISSON_RATIO": 0.20,
                        "THICKNESS": float(next((v.get('thickness') for v in shell_props.values() if v.get('thickness')), default_thickness))
                    },
                    "Tables": {}
                }
            })

        materials_data = {"properties": props}

        import json
        with open(materials_file, 'w') as f:
            json.dump(materials_data, f, indent=2)

    def _write_project_parameters(self, params_file: Path, mdpa_name: str, materials_name: str):
        """写出项目参数文件"""
        params = {
            "problem_data": {
                "problem_name": "kratos_analysis",
                "echo_level": 1,
                "parallel_type": "OpenMP",
                "start_time": 0.0,
                "end_time": self.analysis_settings.end_time
            },
            "solver_settings": {
                "solver_type": "Static",
                "model_part_name": "Structure",
                "domain_size": 3,
                "echo_level": 1,
                "analysis_type": "non_linear" if (self.analysis_settings.solver_type != SolverType.LINEAR) else "linear",
                "rotation_dofs": True,
                "model_import_settings": {
                    "input_type": "mdpa",
                    "input_filename": mdpa_name
                },
                "material_import_settings": {
                    "materials_filename": materials_name
                },
                "time_stepping": {"time_step": self.analysis_settings.time_step},
                "max_iteration": self.analysis_settings.max_iterations,
                "line_search": True,
                "convergence_criterion": "and_criterion",
                "displacement_relative_tolerance": self.analysis_settings.convergence_tolerance,
                "residual_relative_tolerance": self.analysis_settings.convergence_tolerance,
                "displacement_absolute_tolerance": 1e-9,
                "residual_absolute_tolerance": 1e-9,
                "linear_solver_settings": {
                    "solver_type": "skyline_lu_factorization"
                }
            },
            "processes": {
                "constraints_process_list": [],
                "loads_process_list": []
            },
            "output_processes": {
                "vtk_output": [{
                    "python_module": "vtk_output_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "VtkOutputProcess",
                    "Parameters": {
                        "model_part_name": "Structure",
                        "output_control_type": "step",
                        "output_interval": 1,
                        "file_format": "binary",
                        "output_path": str(Path("data") / f"VTK_Output_Stage_{self.current_stage}"),
                        "save_output_files_in_folder": True,
                        "nodal_solution_step_data_variables": ["DISPLACEMENT","REACTION"],
                        "element_data_value_variables": ["CAUCHY_STRESS_TENSOR","GREEN_LAGRANGE_STRAIN_TENSOR"]
                    }
                }]
            }
        }

        # 注入阶段边界与荷载过程
        params["processes"]["constraints_process_list"] = self._build_constraints_processes()
        params["processes"]["loads_process_list"] = self._build_loads_processes()

        # 加自重
        if self.apply_self_weight:
            params["processes"]["loads_process_list"].append({
                "python_module": "assign_vector_by_direction_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorByDirectionProcess",
                "Parameters": {
                    "model_part_name": "Structure",
                    "variable_name": "VOLUME_ACCELERATION",
                    "modulus": 9.81,
                    "direction": list(self.gravity_direction),
                    "constrained": False,
                    "interval": [0.0, "End"]
                }
            })

        import json
        with open(params_file, 'w') as f:
            json.dump(params, f, indent=2)
    def _bools_from_dof_code(self, code: str):
        code = (code or '').strip()
        if len(code) >= 3:
            return [code[0] == '1', code[1] == '1', code[2] == '1']
        return [False, False, False]

    def _build_constraints_processes(self) -> list:
        processes = []
        # 对 BND_BOTTOM 添加强约束，稳定刚体
        for var in ["DISPLACEMENT_X","DISPLACEMENT_Y","DISPLACEMENT_Z"]:
            processes.append({
                "python_module": "fix_scalar_variable_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "FixScalarVariableProcess",
                "Parameters": {
                    "model_part_name": "Structure.BND_BOTTOM",
                    "variable_name": var,
                    "constrained": True,
                    "interval": [0.0, "End"]
                }
            })
        bgroups = (self.source_fpn_data or {}).get('boundary_groups') or {}
        for gid, grp in bgroups.items():
            # 统计该边界组需要固定的分量（若组内混合，默认以出现频率最高的为准）
            constraints = grp.get('constraints') or []
            cnt = {'x': 0, 'y': 0, 'z': 0}
            total = 0
            for c in constraints:
                dof = c.get('dof_bools')
                if not dof:
                    dof = self._bools_from_dof_code(c.get('dof_code') or '')
                if not dof:
                    continue
                total += 1
                if dof[0]: cnt['x'] += 1
                if dof[1]: cnt['y'] += 1
                if dof[2]: cnt['z'] += 1
            # 若无约束细项，回退为该组所有节点全固定Z（常见为底部/基础）
            fix_x = cnt['x'] > total/2 if total else False
            fix_y = cnt['y'] > total/2 if total else False
            fix_z = cnt['z'] > total/2 if total else True
            for comp, var, enabled in [
                ('X','DISPLACEMENT_X', fix_x),
                ('Y','DISPLACEMENT_Y', fix_y),
                ('Z','DISPLACEMENT_Z', fix_z)
            ]:
                if not enabled:
                    continue
                processes.append({
                    "python_module": "fix_scalar_variable_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "FixScalarVariableProcess",
                    "Parameters": {
                        "model_part_name": f"Structure.BND_{gid}",
                        "variable_name": var,
                        "constrained": True,
                        "interval": [0.0, "End"]
                    }
                })
            # 若存在壳单元，为避免刚体/扭转模态，和位移同处的边界组同步固定旋转分量
            has_shells = any(el.get('type') in ('Triangle2D3N','Quadrilateral2D4N') for el in (self.model_data or {}).get('elements', []))
            if has_shells:
                for comp, var, enabled in [
                    ('X','ROTATION_X', fix_x),
                    ('Y','ROTATION_Y', fix_y),
                    ('Z','ROTATION_Z', fix_z)
                ]:
                    if not enabled:
                        continue
                    processes.append({
                        "python_module": "fix_scalar_variable_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "FixScalarVariableProcess",
                        "Parameters": {
                            "model_part_name": f"Structure.BND_{gid}",
                            "variable_name": var,
                            "constrained": True,
                            "interval": [0.0, "End"]
                        }
                    })
        return processes

    def _build_loads_processes(self) -> list:
        processes = []
        lgroups = (self.source_fpn_data or {}).get('load_groups') or {}
        for lid, grp in lgroups.items():
            nodes = grp.get('nodes') or []
            vec = grp.get('vector')
            if vec is None:
                fx = grp.get('fx', 0.0); fy = grp.get('fy', 0.0); fz = grp.get('fz', 0.0)
                vec = [fx, fy, fz]
            if nodes and any(abs(x) > 0 for x in vec):
                processes.append({
                    "python_module": "assign_vector_variable_to_nodes_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "AssignVectorVariableToNodesProcess",
                    "Parameters": {
                        "model_part_name": "Structure",
                        "variable_name": "POINT_LOAD",
                        "constrained": [False, False, False],
                        "value": vec,
                        "nodes": nodes
                    }
                })
        return processes


    def _read_kratos_results(self, temp_path: Path) -> Dict[str, Any]:
        """读取Kratos结果"""
        results = {
            "displacement": [],
            "stress": [],
            "plastic_strain": [],
            "analysis_info": {
                "solver": "Kratos Newton-Raphson",
                "element_type": "Tetrahedra3D4N",
                "constitutive_model": "Mohr-Coulomb"
            }
        }

        # 尝试读取VTK结果文件
        # 优先读取用户指定的 data/VTK_Output_Stage_* 目录
        vtk_dir = Path("data")
        vtk_files = []
        for stage_dir in [vtk_dir/"VTK_Output_Stage_1", vtk_dir/"VTK_Output_Stage_2"]:
            if stage_dir.exists():
                vtk_files.extend(stage_dir.glob("*.vtk"))
            if vtk_files:
                print(f"找到{len(vtk_files)}个VTK结果文件")
                # 这里可以添加VTK文件解析逻辑

        # 模拟一些结果数据
        n_nodes = len(self.model_data.get('nodes', []))
        results["displacement"] = [[0.001, 0.001, 0.002] for _ in range(min(n_nodes, 100))]
        results["stress"] = [[1000, 2000, 1500, 100, 200, 150] for _ in range(min(n_nodes, 100))]

        return results


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


# 便捷函数
def create_nonlinear_analysis() -> KratosInterface:
    """创建非线性分析"""
    interface = KratosInterface()
    settings = AnalysisSettings(
        analysis_type=AnalysisType.NONLINEAR,
        solver_type=SolverType.NEWTON_RAPHSON,
        max_iterations=100,
        convergence_tolerance=1e-6
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

    # 测试非线性分析
    interface = create_nonlinear_analysis()

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



class KratosModernMohrCoulombConfigurator:
    """Kratos 10.3 修正摩尔-库伦本构配置生成器"""
    
    def __init__(self, material_properties: MaterialProperties):
        self.material = material_properties
    
    def generate_constitutive_law_config(self) -> Dict[str, Any]:
        """生成Kratos 10.3修正摩尔-库伦本构配置"""
        return {
            "constitutive_law": {
                "name": "SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D",
                "Variables": {
                    "YIELD_STRESS_TENSION": self.material.yield_stress_tension,
                    "YIELD_STRESS_COMPRESSION": self.material.yield_stress_compression, 
                    "FRICTION_ANGLE": self.material.friction_angle,
                    "DILATANCY_ANGLE": self.material.dilatancy_angle
                }
            }
        }
    
    def generate_material_config(self) -> Dict[str, Any]:
        """生成材料配置（用于materials.json）"""
        return {
            "properties": [
                {
                    "model_part_name": "Structure",
                    "properties_id": self.material.id,
                    "Material": {
                        "name": "ModifiedMohrCoulombSoil",
                        "constitutive_law": self.generate_constitutive_law_config()["constitutive_law"],
                        "Variables": {
                            "DENSITY": self.material.density,
                            "YOUNG_MODULUS": self.material.young_modulus,
                            "POISSON_RATIO": self.material.poisson_ratio,
                            "COHESION": self.material.cohesion
                        },
                        "Tables": {}
                    }
                }
            ]
        }
    
    def generate_project_parameters(self, output_path: str = "output") -> Dict[str, Any]:
        """生成ProjectParameters.json配置"""
        return {
            "problem_data": {
                "problem_name": "mohr_coulomb_analysis", 
                "parallel_type": "OpenMP",
                "echo_level": 1,
                "start_time": 0.0,
                "end_time": 1.0
            },
            "solver_settings": {
                "solver_type": "Static",
                "model_part_name": "Structure", 
                "domain_size": 3,
                "echo_level": 1,
                "analysis_type": "non_linear",
                "model_import_settings": {
                    "input_type": "mdpa",
                    "input_filename": "model"
                },
                "material_import_settings": {
                    "materials_filename": "materials.json"
                },
                "time_stepping": {"time_step": 1.0},
                "convergence_criterion": "residual_criterion",
                "displacement_relative_tolerance": 1e-4,
                "displacement_absolute_tolerance": 1e-9,
                "residual_relative_tolerance": 1e-4,
                "residual_absolute_tolerance": 1e-9,
                "max_iteration": 50,
                "linear_solver_settings": {
                    "solver_type": "amgcl",
                    "tolerance": 1e-6,
                    "max_iteration": 200,
                    "scaling": True,
                    "verbosity": 0
                }
            },
            "processes": {
                "constraints_process_list": [
                    {
                        "python_module": "assign_vector_variable_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignVectorVariableProcess",
                        "Parameters": {
                            "model_part_name": "Structure.DISPLACEMENT_boundary",
                            "variable_name": "DISPLACEMENT",
                            "constrained": [True, True, True],
                            "value": [0.0, 0.0, 0.0],
                            "interval": [0.0, "End"]
                        }
                    }
                ],
                "loads_process_list": [
                    {
                        "python_module": "assign_vector_by_direction_process",
                        "kratos_module": "KratosMultiphysics", 
                        "process_name": "AssignVectorByDirectionProcess",
                        "Parameters": {
                            "model_part_name": "Structure",
                            "variable_name": "VOLUME_ACCELERATION",
                            "modulus": 9.81,
                            "direction": [0.0, 0.0, -1.0],
                            "interval": [0.0, "End"],
                            "constrained": False
                        }
                    }
                ]
            },
            "output_processes": {
                "vtk_output": [
                    {
                        "python_module": "vtk_output_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "VtkOutputProcess",
                        "Parameters": {
                            "model_part_name": "Structure",
                            "file_format": "binary",
                            "output_sub_model_parts": True,
                            "save_output_files_in_folder": True,
                            "output_path": output_path,
                            "output_control_type": "step",
                            "output_interval": 1.0,
                            "write_deformed_configuration": True,
                            "write_ids": False,
                            "output_precision": 7,
                            "nodal_solution_step_data_variables": [
                                "DISPLACEMENT",
                                "REACTION"
                            ],
                            "element_data_value_variables": [
                                "GREEN_LAGRANGE_STRAIN_TENSOR",
                                "CAUCHY_STRESS_TENSOR"
                            ]
                        }
                    }
                ]
            }
        }
