#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基于两阶段计算2.fpn的真正求解计算
使用四面体单元和线弹性本构进行线性静力分析
"""

import os
import sys
import json
import math
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Tuple

# 添加项目路径
sys.path.append(str(Path(__file__).parent))

from core.optimized_fpn_parser import OptimizedFPNParser
from core.kratos_interface import KratosInterface, AnalysisSettings, AnalysisType, SolverType, MaterialProperties

class TwoStageAnalysis:
    """两阶段基坑开挖分析"""

    def __init__(self, fpn_file: str, output_dir: str = "output/two_stage_analysis"):
        self.fpn_file = Path(fpn_file)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.fpn_data = None
        self.kratos_interface = None
        self.analysis_results = {}

    def load_fpn_data(self) -> bool:
        """加载FPN数据"""
        try:
            print(f"📂 加载FPN文件: {self.fpn_file}")
            parser = OptimizedFPNParser()
            self.fpn_data = parser.parse_file_streaming(str(self.fpn_file))

            if not self.fpn_data:
                print("❌ FPN文件解析失败")
                return False

            print(f"✅ 成功解析FPN文件")
            print(f"   节点数: {len(self.fpn_data.get('nodes', {}))}")
            print(f"   单元数: {len(self.fpn_data.get('elements', {}))}")
            print(f"   材料数: {len(self.fpn_data.get('materials', {}))}")
            print(f"   分析步数: {len(self.fpn_data.get('analysis_stages', []))}")

            # 调试：检查数据结构
            print(f"\n🔍 数据结构检查:")
            print(f"   fpn_data keys: {list(self.fpn_data.keys())}")

            nodes = self.fpn_data.get('nodes', [])
            if nodes:
                print(f"   第一个节点: {nodes[0] if isinstance(nodes, list) else 'nodes不是列表'}")
                print(f"   节点类型: {type(nodes)}")

            elements = self.fpn_data.get('elements', [])
            if elements:
                print(f"   第一个单元: {elements[0] if isinstance(elements, list) else 'elements不是列表'}")
                print(f"   单元类型: {type(elements)}")

            materials = self.fpn_data.get('materials', {})
            if materials:
                first_mat_id = list(materials.keys())[0]
                print(f"   第一个材料 (ID {first_mat_id}): {materials[first_mat_id]}")
                print(f"   材料类型: {type(materials)}")

            return True

        except Exception as e:
            print(f"❌ 加载FPN文件失败: {e}")
            return False

    def setup_materials(self) -> Dict[int, MaterialProperties]:
        """设置材料属性 - 与FPN一致，使用线弹性本构参数"""
        materials = {}

        fpn_materials = self.fpn_data.get('materials', {})
        if not fpn_materials:
            print("⚠️ 未找到材料定义，创建默认土体材料(线弹性)")
            fpn_materials = {
                1: {'name': '默认土体', 'properties': {'type': 'soil', 'DENSITY': 1900.0, 'YOUNG_MODULUS': 25e6, 'POISSON_RATIO': 0.35}}
            }

        for mat_id, mat_data in fpn_materials.items():
            if not isinstance(mat_data, dict):
                print(f"⚠️ 材料{mat_id}数据格式异常，跳过")
                continue
            props = mat_data.get('properties', {})
            # 统一按线弹性读取：密度/弹模/泊松比（兼容 FPN 字段名：E/NU）
            density = props.get('DENSITY', 1900.0)
            E_val = props.get('YOUNG_MODULUS', None)
            if E_val is None:
                E_val = props.get('E', None)
            nu_val = props.get('POISSON_RATIO', None)
            if nu_val is None:
                nu_val = props.get('NU', None)

            material = MaterialProperties(
                id=mat_id,
                name=mat_data.get('name', f'Material_{mat_id}'),
                density=float(density),
                young_modulus=float(E_val if E_val is not None else 25e6),
                poisson_ratio=float(nu_val if nu_val is not None else 0.35),
                cohesion=0.0,
                friction_angle=0.0
            )
            print(f"🏗️ 材料 {mat_id}: 线弹性, E={material.young_modulus/1e6:.0f}MPa, ν={material.poisson_ratio}")
            materials[mat_id] = material
        return materials

    def create_kratos_materials_json(self, materials: Dict[int, MaterialProperties]) -> str:
        """创建Kratos材料配置文件 - 严格按FPN数据，正确映射摩尔库伦参数"""

        # 严格按FPN材料数据生成Kratos配置
        properties = []
        for mat in materials.values():
            # 检查是否有摩尔库伦参数
            has_friction = hasattr(mat, 'friction_angle') and mat.friction_angle > 0
            has_cohesion = hasattr(mat, 'cohesion') and mat.cohesion > 0

            if has_friction and has_cohesion:
                # 使用Kratos损伤版摩尔库伦本构（与当前系统兼容）
                # 参数映射：FPN粘聚力 → Kratos屈服应力
                phi_rad = math.radians(float(mat.friction_angle))
                cohesion_pa = float(mat.cohesion)

                # 使用标准摩尔-库伦屈服应力转换公式（Abaqus理论手册）
                # σ_t = 2c × cos(φ) / (1 + sin(φ))
                # σ_c = 2c × cos(φ) / (1 - sin(φ))
                sin_phi = math.sin(phi_rad)
                cos_phi = math.cos(phi_rad)
                yield_tension = 2.0 * cohesion_pa * cos_phi / (1.0 + sin_phi)
                yield_compression = 2.0 * cohesion_pa * cos_phi / (1.0 - sin_phi)

                # 确保最小值
                yield_tension = max(yield_tension, 1000.0)  # 最小1kPa
                yield_compression = max(yield_compression, 10000.0)  # 最小10kPa

                properties.append({
                    "model_part_name": f"Structure.MAT_{mat.id}",
                    "properties_id": mat.id,
                    "Material": {
                        "constitutive_law": {"name": "SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D"},
                        "Variables": {
                            "DENSITY": float(mat.density),
                            "YOUNG_MODULUS": float(mat.young_modulus),
                            "POISSON_RATIO": float(mat.poisson_ratio),
                            "YIELD_STRESS_TENSION": yield_tension,
                            "YIELD_STRESS_COMPRESSION": yield_compression,
                            "FRICTION_ANGLE": float(mat.friction_angle),  # 度数，不转弧度
                            "DILATANCY_ANGLE": max(0.0, float(mat.friction_angle) - 30.0),  # Bolton关系: ψ = φ - 30°
                            "FRACTURE_ENERGY": 1000.0,
                            "SOFTENING_TYPE": 1
                        },
                        "Tables": {}
                    }
                })
                # 计算剪胀角和K比值用于显示
                dilatancy_angle = max(0.0, float(mat.friction_angle) - 30.0)
                K_ratio = yield_tension / yield_compression
                theoretical_K = (1.0 - sin_phi) / (1.0 + sin_phi)

                print(f"🎯 材料{mat.id}: 摩尔库伦本构 (φ={mat.friction_angle}°, c={mat.cohesion/1000:.1f}kPa)")
                print(f"   → 拉伸屈服: {yield_tension/1000:.1f}kPa, 压缩屈服: {yield_compression/1000:.1f}kPa")
                print(f"   → 剪胀角: {dilatancy_angle:.1f}° (Bolton), K比值: {K_ratio:.3f} (理论: {theoretical_K:.3f})")
            else:
                # 使用线弹性本构
                properties.append({
                    "model_part_name": f"Structure.MAT_{mat.id}",
                    "properties_id": mat.id,
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
                print(f"🎯 材料{mat.id}: 线弹性本构")

        materials_data = {"properties": properties}

        # 保存材料文件（报告目录）
        materials_file = self.output_dir / "materials.json"
        with open(materials_file, 'w', encoding='utf-8') as f:
            json.dump(materials_data, f, indent=2, ensure_ascii=False)

        print(f"💾 材料配置保存到: {materials_file}")
        return str(materials_file)

    def create_project_parameters(self, stage_name: str, stage_num: int) -> str:
        """创建Kratos项目参数文件 - 配置非线性求解器"""

        # 非线性求解器配置
        project_params = {
            "problem_data": {
                "problem_name": f"two_stage_excavation_stage_{stage_num}",
                "echo_level": 1,
                "parallel_type": "OpenMP",
                "start_time": 0.0,
                "end_time": float(stage_num)
            },
            "solver_settings": {
                "solver_type": "Static",
                "model_part_name": "Structure",
                "domain_size": 3,
                "echo_level": 1,
                "analysis_type": "non_linear",  # 非线性分析
                "model_import_settings": {
                    "input_type": "mdpa",
                    "input_filename": f"excavation_model_stage_{stage_num}"
                },
                "material_import_settings": {
                    "materials_filename": "materials.json"
                },
                "time_stepping": {
                    "time_step": 1.0
                },
                # Newton-Raphson非线性求解器设置
                "max_iteration": 200,
                "reform_dofs_at_each_step": True,
                "compute_reactions": True,
                "line_search": True,  # 启用线搜索
                "convergence_criterion": "mixed_criterion",  # 混合收敛准则
                "displacement_relative_tolerance": 1e-6,
                "displacement_absolute_tolerance": 1e-9,
                "residual_relative_tolerance": 1e-6,
                "residual_absolute_tolerance": 1e-9,
                # 线性求解器设置
                "linear_solver_settings": {
                    "solver_type": "amgcl",  # 代数多重网格
                    "max_iteration": 1000,
                    "tolerance": 1e-8,
                    "preconditioner_type": "ilu0",
                    "smoother_type": "spai0",
                    "coarsening_type": "smoothed_aggregation",
                    "scaling": True,
                    "verbosity": 1
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
                        "file_format": "ascii",
                        "output_precision": 7,
                        "output_sub_model_parts": False,
                        "output_path": str(Path("data") / f"VTK_Output_Stage_{stage_num}"),
                        "save_output_files_in_folder": True,
                        "nodal_solution_step_data_variables": [
                            "DISPLACEMENT",
                            "REACTION",
                            "VELOCITY",
                            "ACCELERATION"
                        ],
                        "gauss_point_variables_in_elements": [
                            "CAUCHY_STRESS_TENSOR",
                            "GREEN_LAGRANGE_STRAIN_TENSOR",
                            "PLASTIC_STRAIN_TENSOR"
                        ]
                    }
                }]
            }
        }

        # 保存参数文件
        params_file = self.output_dir / f"ProjectParameters_Stage_{stage_num}.json"
        with open(params_file, 'w', encoding='utf-8') as f:
            json.dump(project_params, f, indent=2, ensure_ascii=False)

        print(f"⚙️ 项目参数保存到: {params_file}")
        return str(params_file)

    def run_stage_analysis(self, stage_num: int, active_materials: List[int], active_element_ids=None, active_mesh_set_ids=None) -> bool:
        """运行单个阶段的分析"""
        try:
            print(f"\n🚀 开始第{stage_num}阶段分析")
            print(f"   激活材料: {active_materials}")

            # 1. 设置Kratos接口（不要覆盖外面已经设置好的激活组等状态）
            self.kratos_interface = self.kratos_interface or KratosInterface()
            self.kratos_interface.current_stage = stage_num

            # 地应力平衡近似：使用非严格模式 + 自重 + 自动约束（若FPN未提供完整边界）
            self.kratos_interface.strict_mode = False
            self.kratos_interface.apply_self_weight = True
            self.kratos_interface.gravity_direction = (0.0, 0.0, -1.0)

            # 2. 配置分析设置 - 线性静力 + AMGCL（按FPN“弹性材料、无锚杆”的意图）
            analysis_settings = AnalysisSettings(
                analysis_type=AnalysisType.STATIC,
                solver_type=SolverType.NEWTON_RAPHSON,  # 非线性求解器
                max_iterations=50,  # 非线性分析需要多次迭代
                convergence_tolerance=1e-6,  # 适中的收敛容差
                time_step=1.0,
                end_time=1.0
            )
            # 将设置传入 Kratos 接口，确保实际运行使用该时间步与结束时间
            self.kratos_interface.set_analysis_settings(analysis_settings)

            # 3. 设置材料 + 阶段激活集合/元素过滤（真实开挖）
            materials = self.setup_materials()
            self.kratos_interface.materials = materials  # 全量材料定义
            self.kratos_interface.active_materials = set(int(m) for m in (active_materials or []))
            # 本阶段激活集合/元素由外层传入（已按 stages 的 group_commands 计算）
            # 这里不再访问未定义的 stage1/stage2
            self.kratos_interface.active_mesh_set_ids = set(active_mesh_set_ids or [])
            self.kratos_interface.active_element_ids = set(active_element_ids or [])
            # 从 stages 的 group_commands 同步本阶段激活的荷载/边界组
            try:
                active_loads = set()
                active_bounds = set()
                for cmd in (self.fpn_data.get('analysis_stages', [])[stage_num-1].get('group_commands') or []):
                    if cmd.get('command') == 'LADD':
                        active_loads.update(cmd.get('group_ids') or [])
                    elif cmd.get('command') == 'BADD':
                        active_bounds.update(cmd.get('group_ids') or [])
                self.kratos_interface.active_load_groups = active_loads
                self.kratos_interface.active_boundary_groups = active_bounds
            except Exception:
                pass
            # 日志包含荷载/边界组
            print(f"   激活荷载组: {sorted(list(getattr(self.kratos_interface,'active_load_groups', set())))}")
            print(f"   激活边界组: {sorted(list(getattr(self.kratos_interface,'active_boundary_groups', set())))}")

            print(f"   配置了{len(self.kratos_interface.materials)}种材料，激活集合数: {len(self.kratos_interface.active_mesh_set_ids)}, 激活元素数: {len(self.kratos_interface.active_element_ids)}")

            # 4. 设置模型
            print("   设置Kratos模型...")
            print(f"   FPN数据: {len(self.fpn_data.get('nodes', []))} 节点, {len(self.fpn_data.get('elements', []))} 单元")

            if not self.kratos_interface.setup_model(self.fpn_data):
                print(f"❌ 第{stage_num}阶段模型设置失败")
                return False

            # 5. 创建配置文件
            materials_file = self.create_kratos_materials_json(materials)
            params_file = self.create_project_parameters(f"Stage_{stage_num}", stage_num)

            # 6. 运行分析
            print(f"   执行非线性静力求解(Newton-Raphson + AMGCL)...")
            print(f"   求解器配置:")
            print(f"     - 最大迭代次数: {analysis_settings.max_iterations}")
            print(f"     - 收敛容差: {analysis_settings.convergence_tolerance}")
            print(f"     - 线搜索: {'启用' if analysis_settings.solver_type != SolverType.LINEAR else '禁用'}")
            print(f"     - 本构模型: 摩尔-库伦非线性")

            success, results = self.kratos_interface.run_analysis()

            if success:
                print(f"✅ 第{stage_num}阶段分析成功完成")

                # 保存结果
                self.analysis_results[f"stage_{stage_num}"] = {
                    "success": True,
                    "active_materials": active_materials,
                    "results": results,
                    "displacement_max": self._get_max_displacement(results),
                    "stress_max": self._get_max_stress(results),
                    "plastic_elements": self._count_plastic_elements(results)
                }

                # 导出结果
                result_file = self.output_dir / f"results_stage_{stage_num}.json"
                self.kratos_interface.export_results(str(result_file))

                print(f"   最大位移: {self.analysis_results[f'stage_{stage_num}']['displacement_max']:.6f} m")
                print(f"   最大应力: {self.analysis_results[f'stage_{stage_num}']['stress_max']:.0f} Pa")
                print(f"   塑性单元数: {self.analysis_results[f'stage_{stage_num}']['plastic_elements']}")

                return True
            else:
                print(f"❌ 第{stage_num}阶段分析失败: {results}")
                return False

        except Exception as e:
            print(f"❌ 第{stage_num}阶段分析异常: {e}")
            return False

    def _get_max_displacement(self, results: Dict) -> float:
        """获取最大位移"""
        displacements = results.get('displacement', [])
        if not displacements:
            return 0.0

        max_disp = 0.0
        for disp in displacements:
            if isinstance(disp, (list, tuple)) and len(disp) >= 3:
                magnitude = np.sqrt(disp[0]**2 + disp[1]**2 + disp[2]**2)
                max_disp = max(max_disp, magnitude)

        return max_disp

    def _get_max_stress(self, results: Dict) -> float:
        """获取最大应力"""
        stresses = results.get('stress', [])
        if not stresses:
            return 0.0

        max_stress = 0.0
        for stress in stresses:
            if isinstance(stress, (list, tuple)) and len(stress) >= 6:
                # 计算von Mises应力
                s11, s22, s33, s12, s13, s23 = stress[:6]
                von_mises = np.sqrt(0.5 * ((s11-s22)**2 + (s22-s33)**2 + (s33-s11)**2 + 6*(s12**2 + s13**2 + s23**2)))
                max_stress = max(max_stress, von_mises)

        return max_stress

    def _count_plastic_elements(self, results: Dict) -> int:
        """统计塑性单元数量"""
        plastic_strain = results.get('plastic_strain', [])
        if not plastic_strain:
            return 0

        plastic_count = 0
        for strain in plastic_strain:
            if isinstance(strain, (list, tuple)) and len(strain) >= 6:
                # 检查是否有塑性应变
                plastic_magnitude = np.sqrt(sum(s**2 for s in strain))
                if plastic_magnitude > 1e-8:  # 塑性应变阈值
                    plastic_count += 1

        return plastic_count

    def _create_simplified_model(self, fpn_data: Dict, max_nodes: int = 100, max_elements: int = 50) -> Dict:
        """创建简化的测试模型"""
        nodes = fpn_data.get('nodes', [])
        elements = fpn_data.get('elements', [])

        # 选择前max_nodes个节点
        selected_nodes = nodes[:max_nodes]
        node_ids = {node['id'] for node in selected_nodes}

        # 选择包含这些节点的单元
        valid_elements = []
        for element in elements:
            if len(valid_elements) >= max_elements:
                break

            # 检查单元的所有节点是否都在选定的节点中
            element_nodes = element.get('nodes', [])
            if all(node_id in node_ids for node_id in element_nodes):
                valid_elements.append(element)

        # 如果有效单元太少，创建一些简单的四面体单元
        if len(valid_elements) < 10 and len(selected_nodes) >= 4:
            print(f"   创建简单四面体单元，当前有效单元: {len(valid_elements)}")

            # 创建简单的四面体单元
            for i in range(0, min(len(selected_nodes) - 3, max_elements - len(valid_elements)), 4):
                if i + 3 < len(selected_nodes):
                    simple_element = {
                        'id': 1000000 + i // 4,
                        'type': 'tetra',
                        'material_id': 1,  # 使用第一个材料
                        'nodes': [
                            selected_nodes[i]['id'],
                            selected_nodes[i+1]['id'],
                            selected_nodes[i+2]['id'],
                            selected_nodes[i+3]['id']
                        ]
                    }
                    valid_elements.append(simple_element)

        simplified_data = {
            'nodes': selected_nodes,
            'elements': valid_elements,
            'materials': fpn_data.get('materials', {})
        }

        return simplified_data

    def run_two_stage_analysis(self) -> bool:
        """运行完整的两阶段分析"""
        print("=" * 60)
        print("🏗️ 两阶段基坑开挖分析")
        print("   四面体单元 + 线弹性本构 + AMGCL 线性求解器")
        print("=" * 60)

        # 1. 加载FPN数据
        if not self.load_fpn_data():
            return False

        # 2. 分析FPN中的阶段定义（优先使用 analysis_stages）
        stages = self.fpn_data.get('analysis_stages')

        # 如果没有找到阶段，手动定义两阶段分析
        if not stages:
            print("⚠️ FPN文件中未找到分析阶段定义，使用默认两阶段配置")
            stages = {
                1: {
                    'name': '初始应力平衡',
                    'type': 'initial_stress',
                    'description': '建立初始地应力状态',
                    'active_materials': list(self.fpn_data.get('materials', {}).keys()),
                    'active_boundaries': [],
                    'active_loads': []
                },
                2: {
                    'name': '基坑开挖',
                    'type': 'excavation',
                    'description': '移除开挖区域土体',
                    'active_materials': list(self.fpn_data.get('materials', {}).keys()),
                    'active_boundaries': [],
                    'active_loads': []
                }
            }

        print(f"\n📋 分析步配置 ({len(stages)}个阶段):")
        if isinstance(stages, dict):
            iterable = stages.items()
        else:
            iterable = enumerate(stages, start=1)
        for step_id, step_data in iterable:
            print(f"   阶段{step_id}: {step_data.get('name', 'Unknown')} - {step_data.get('description', '')}")

        # 3. 执行各个阶段（按 analysis_stages 指定的激活集合/元素）
        # Stage 1
        stage1 = stages[0] if isinstance(stages, list) else stages.get(1)
        # 设置当前阶段号用于输出路径
        self.kratos_interface = self.kratos_interface or KratosInterface()
        self.kratos_interface.current_stage = 1
        mats1 = stage1.get('active_materials') or list(self.fpn_data.get('materials', {}).keys())
        # 计算 Stage1 激活的 mesh_set/element 集合
        mesh_sets = self.fpn_data.get('mesh_sets') or {}
        active_sets_1 = set()
        for cmd in (stage1.get('group_commands') or []):
            if cmd.get('command') == 'MADD':
                active_sets_1.update(cmd.get('group_ids') or [])
            elif cmd.get('command') == 'MDEL':
                active_sets_1.difference_update(cmd.get('group_ids') or [])
        active_elems_1 = set()
        # 调试：输出各集合的元素数量，帮助定位为何激活元素为0
        print("\n   Mesh sets parsed:", len(mesh_sets))
        for gid in sorted(list(active_sets_1)):
            elems = mesh_sets.get(gid, {}).get('elements') or []
            print(f"   - MSET {gid}: elements = {len(elems)}")
            active_elems_1.update(elems)

        # 激活的荷载/边界组（按 group_commands 汇总）
        active_loads_1 = set()
        active_bounds_1 = set()
        for cmd in (stage1.get('group_commands') or []):
            if cmd.get('command') == 'LADD':
                active_loads_1.update(cmd.get('group_ids') or [])
            elif cmd.get('command') == 'BADD':
                active_bounds_1.update(cmd.get('group_ids') or [])

        # 把阶段激活集合传给接口（用于过滤并构建进程）
        self.kratos_interface.active_load_groups = set(active_loads_1)
        self.kratos_interface.active_boundary_groups = set(active_bounds_1)

        # 确保严格按集合控制：若本阶段未定义任何集合且未计算出元素集，则报错并终止
        if not active_sets_1 and not active_elems_1:
            raise RuntimeError("阶段1未定义任何网格集合或元素激活，FPN不完整，请检查STAGE/MSET/MSETE")

        stage1_success = self.run_stage_analysis(1, mats1, active_element_ids=active_elems_1, active_mesh_set_ids=active_sets_1)
        if not stage1_success:
            print("❌ 第一阶段分析失败，终止计算")
            return False

        # Stage 2
        stage2 = stages[1] if isinstance(stages, list) else stages.get(2)
        mats2 = stage2.get('active_materials') or mats1
        active_sets_2 = set(active_sets_1)
        for cmd in (stage2.get('group_commands') or []):
            if cmd.get('command') == 'MADD':
                active_sets_2.update(cmd.get('group_ids') or [])
            elif cmd.get('command') == 'MDEL':
                active_sets_2.difference_update(cmd.get('group_ids') or [])
        active_elems_2 = set()
        for gid in sorted(list(active_sets_2)):
            elems = mesh_sets.get(gid, {}).get('elements') or []
            print(f"   - (Stage2) MSET {gid}: elements = {len(elems)}")
            active_elems_2.update(elems)

        if not active_sets_2 and not active_elems_2:
            raise RuntimeError("阶段2未定义任何网格集合或元素激活，FPN不完整，请检查STAGE/MSET/MSETE")

        print(f"\n🗑️ 第二阶段开挖/激活变更 (集合ID):")
        print(f"   Stage1 激活集合: {sorted(list(active_sets_1))}")
        print(f"   Stage2 激活集合: {sorted(list(active_sets_2))}")
        print(f"   Stage1 激活元素: {len(active_elems_1)}，Stage2 激活元素: {len(active_elems_2)}")

        # 设置当前阶段号用于输出路径
        self.kratos_interface = self.kratos_interface or KratosInterface()
        self.kratos_interface.current_stage = 2
        # 继承 Stage1 的激活，再应用 Stage2 的增量
        active_loads_2 = set(active_loads_1)
        active_bounds_2 = set(active_bounds_1)
        for cmd in (stage2.get('group_commands') or []):
            if cmd.get('command') == 'LADD':
                active_loads_2.update(cmd.get('group_ids') or [])
            elif cmd.get('command') == 'BADD':
                active_bounds_2.update(cmd.get('group_ids') or [])
        self.kratos_interface.active_load_groups = set(active_loads_2)
        self.kratos_interface.active_boundary_groups = set(active_bounds_2)

        stage2_success = self.run_stage_analysis(2, mats2, active_element_ids=active_elems_2, active_mesh_set_ids=active_sets_2)

        # 4. 生成分析报告
        self.generate_analysis_report()

        return stage1_success and stage2_success

    def generate_analysis_report(self):
        """生成分析报告"""
        print("\n" + "=" * 60)
        print("📊 两阶段分析结果报告")
        print("=" * 60)

        report = {
            "analysis_info": {
                "fpn_file": str(self.fpn_file),
                "analysis_type": "Two-Stage Excavation",
                "element_type": "Tetrahedra3D4N (四面体单元)",
                "constitutive_model": "Linear Elasticity",
                "solver": "AMGCL Linear Solver",
                "timestamp": str(np.datetime64('now'))
            },
            "model_statistics": {
                "total_nodes": len(self.fpn_data.get('nodes', {})),
                "total_elements": len(self.fpn_data.get('elements', {})),
                "total_materials": len(self.fpn_data.get('materials', {}))
            },
            "stage_results": self.analysis_results
        }

        # 打印关键结果
        for stage_name, stage_data in self.analysis_results.items():
            if stage_data["success"]:
                print(f"\n🎯 {stage_name.upper()}:")
                print(f"   状态: ✅ 成功")
                print(f"   最大位移: {stage_data['displacement_max']:.6f} m")
                print(f"   最大应力: {stage_data['stress_max']:.0f} Pa")
                print(f"   塑性单元: {stage_data['plastic_elements']} 个")
                print(f"   激活材料: {len(stage_data['active_materials'])} 种")
            else:
                print(f"\n❌ {stage_name.upper()}: 失败")

        # 保存详细报告
        report_file = self.output_dir / "analysis_report.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False, default=str)

        print(f"\n💾 详细报告保存到: {report_file}")

        # 生成简化的文本报告
        text_report = self.output_dir / "analysis_summary.txt"
        with open(text_report, 'w', encoding='utf-8') as f:
            f.write("两阶段基坑开挖分析报告\n")
            f.write("=" * 40 + "\n\n")
            f.write(f"FPN文件: {self.fpn_file}\n")
            f.write(f"分析时间: {report['analysis_info']['timestamp']}\n")
            f.write(f"单元类型: {report['analysis_info']['element_type']}\n")
            f.write(f"本构模型: {report['analysis_info']['constitutive_model']}\n")  # 与FPN一致：线弹性
            f.write(f"求解器: {report['analysis_info']['solver']}\n\n")

            f.write("模型统计:\n")
            f.write(f"  节点数: {report['model_statistics']['total_nodes']}\n")
            f.write(f"  单元数: {report['model_statistics']['total_elements']}\n")
            f.write(f"  材料数: {report['model_statistics']['total_materials']}\n\n")

            f.write("分析结果:\n")
            for stage_name, stage_data in self.analysis_results.items():
                f.write(f"  {stage_name}:\n")
                if stage_data["success"]:
                    f.write(f"    状态: 成功\n")
                    f.write(f"    最大位移: {stage_data['displacement_max']:.6f} m\n")
                    f.write(f"    最大应力: {stage_data['stress_max']:.0f} Pa\n")
                    f.write(f"    塑性单元: {stage_data['plastic_elements']} 个\n")
                else:
                    f.write(f"    状态: 失败\n")
                f.write("\n")

        print(f"📄 文本报告保存到: {text_report}")


def main():
    """主函数"""
    print("🚀 启动两阶段基坑开挖分析程序")

    # 并行设置：OpenMP 线程数使用本机CPU核数
    try:
        os.environ["OMP_NUM_THREADS"] = str(os.cpu_count() or 8)
    except Exception:
        pass

    # 检查FPN文件（支持命令行参数，优先使用你传入的实际项目FPN）
    cli_path = None
    try:
        if len(sys.argv) > 1 and sys.argv[1]:
            cli_path = sys.argv[1]
    except Exception:
        cli_path = None

    if cli_path:
        fpn_file = Path(cli_path)
    else:
        # 优先尝试：两阶段-全锚杆.fpn；回退：两阶段计算2.fpn
        candidate1 = Path("data/两阶段-全锚杆.fpn")
        candidate2 = Path("data/两阶段计算2.fpn")
        fpn_file = candidate1 if candidate1.exists() else candidate2

    if not fpn_file.exists():
        print(f"❌ FPN文件不存在: {fpn_file}")
        print("请确保文件路径正确，或将文件放在 example2/data 目录下")
        return False

    try:
        # 创建分析实例
        analysis = TwoStageAnalysis(
            fpn_file=str(fpn_file),
            output_dir="output/two_stage_analysis"
        )

        # 运行分析
        success = analysis.run_two_stage_analysis()

        if success:
            print("\n🎉 两阶段分析全部完成!")
            print(f"📁 结果文件保存在: {analysis.output_dir}")
            print("\n主要输出文件:")
            print("  - materials.json: 材料配置")
            print("  - ProjectParameters_Stage_*.json: Kratos项目参数")
            print("  - results_stage_*.json: 各阶段计算结果")
            print("  - analysis_report.json: 详细分析报告")
            print("  - analysis_summary.txt: 简化文本报告")

            return True
        else:
            print("\n❌ 分析过程中出现错误")
            return False

    except Exception as e:
        print(f"❌ 程序执行异常: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
