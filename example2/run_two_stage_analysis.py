#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基于两阶段计算2.fpn的真正求解计算
使用四面体单元和摩尔-库伦本构进行非线性分析
"""

import os
import sys
import json
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
            print(f"   分析步数: {len(self.fpn_data.get('analysis_steps', {}))}")

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
        """设置材料属性 - 重点配置摩尔-库伦本构"""
        materials = {}
        
        # 从FPN数据中提取材料信息
        fpn_materials = self.fpn_data.get('materials', {})

        # 如果材料数据为空，创建默认材料
        if not fpn_materials:
            print("⚠️ 未找到材料定义，创建默认土体材料")
            fpn_materials = {
                1: {'name': '默认土体', 'properties': {'type': 'soil', 'DENSITY': 1900, 'YOUNG_MODULUS': 25e6, 'POISSON_RATIO': 0.35, 'COHESION': 25000, 'FRICTION_ANGLE': 28}}
            }

        for mat_id, mat_data in fpn_materials.items():
            # 确保mat_data是字典类型
            if not isinstance(mat_data, dict):
                print(f"⚠️ 材料{mat_id}数据格式异常，跳过")
                continue
            props = mat_data.get('properties', {})
            mat_type = props.get('type', 'soil')
            
            if mat_type == 'soil':
                # 土体材料 - 使用摩尔-库伦本构
                material = MaterialProperties(
                    id=mat_id,
                    name=mat_data.get('name', f'Soil_{mat_id}'),
                    density=props.get('DENSITY', 1900.0),  # kg/m³
                    young_modulus=props.get('YOUNG_MODULUS', 25e6),  # Pa
                    poisson_ratio=props.get('POISSON_RATIO', 0.35),
                    cohesion=props.get('COHESION', 25000.0),  # Pa
                    friction_angle=props.get('FRICTION_ANGLE', 28.0)  # degrees
                )
                
                print(f"🏗️ 土体材料 {mat_id}: E={material.young_modulus/1e6:.0f}MPa, "
                      f"φ={material.friction_angle}°, c={material.cohesion/1000:.0f}kPa")
                      
            else:
                # 结构材料 - 使用线弹性本构
                material = MaterialProperties(
                    id=mat_id,
                    name=mat_data.get('name', f'Structure_{mat_id}'),
                    density=props.get('DENSITY', 2500.0),
                    young_modulus=props.get('YOUNG_MODULUS', 30e9),
                    poisson_ratio=props.get('POISSON_RATIO', 0.2),
                    cohesion=1e6,  # 高强度
                    friction_angle=45.0
                )
                
                print(f"🏢 结构材料 {mat_id}: E={material.young_modulus/1e9:.0f}GPa")
            
            materials[mat_id] = material
            
        return materials
    
    def create_kratos_materials_json(self, materials: Dict[int, MaterialProperties]) -> str:
        """创建Kratos材料配置文件 - 简化版本，使用统一的土体材料"""

        # 使用第一个土体材料作为代表性材料
        representative_material = None
        for material in materials.values():
            if material.young_modulus < 1e9:  # 土体材料
                representative_material = material
                break

        if not representative_material:
            # 如果没有土体材料，使用第一个材料
            representative_material = list(materials.values())[0]

        # 创建单一的材料定义
        properties = [{
            "model_part_name": "Structure",
            "properties_id": 1,  # 使用统一的属性ID
            "Material": {
                "constitutive_law": {
                    "name": "MohrCoulombPlastic3DLaw"
                },
                "Variables": {
                    "DENSITY": representative_material.density,
                    "YOUNG_MODULUS": representative_material.young_modulus,
                    "POISSON_RATIO": representative_material.poisson_ratio,
                    "COHESION": representative_material.cohesion,
                    "INTERNAL_FRICTION_ANGLE": np.radians(representative_material.friction_angle),
                    "DILATANCY_ANGLE": np.radians(max(0, representative_material.friction_angle - 30)),
                    "YIELD_STRESS": representative_material.cohesion,
                    "ISOTROPIC_HARDENING_MODULUS": representative_material.young_modulus * 0.01,
                    "EXPONENTIAL_SATURATION_YIELD_STRESS": representative_material.cohesion * 2.0,
                    "HARDENING_CURVE": 0,
                    "VISCOSITY": 1e-6
                },
                "Tables": {}
            }
        }]

        materials_data = {"properties": properties}

        print(f"🎯 使用代表性材料: E={representative_material.young_modulus/1e6:.0f}MPa, φ={representative_material.friction_angle}°, c={representative_material.cohesion/1000:.0f}kPa")
        
        # 保存材料文件
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
                "max_iteration": 100,
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
                        "output_control_type": "step",  # 每步输出一份，便于时程后处理
                        "output_frequency": 1,
                        "file_format": "binary",
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
                        "element_data_value_variables": [
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

            # 1. 设置Kratos接口
            self.kratos_interface = KratosInterface()
            self.kratos_interface.current_stage = stage_num

            # 2. 配置分析设置 - 非线性（牛顿-拉夫森），便于判断收敛情况
            analysis_settings = AnalysisSettings(
                analysis_type=AnalysisType.NONLINEAR,
                solver_type=SolverType.NEWTON_RAPHSON,
                max_iterations=50,
                convergence_tolerance=1e-6,
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
            print(f"   执行Newton-Raphson非线性求解...")
            print(f"   求解器配置:")
            print(f"     - 最大迭代次数: {analysis_settings.max_iterations}")
            print(f"     - 收敛容差: {analysis_settings.convergence_tolerance}")
            print(f"     - 线搜索: 启用")
            print(f"     - 本构模型: 摩尔-库伦塑性")

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
        print("🏗️ 两阶段基坑开挖非线性分析")
        print("   四面体单元 + 摩尔-库伦本构 + Newton-Raphson求解器")
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
        for gid in active_sets_1:
            active_elems_1.update(mesh_sets.get(gid, {}).get('elements') or [])

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
        for gid in active_sets_2:
            active_elems_2.update(mesh_sets.get(gid, {}).get('elements') or [])

        print(f"\n🗑️ 第二阶段开挖/激活变更 (集合ID):")
        print(f"   Stage1 激活集合: {sorted(list(active_sets_1))}")
        print(f"   Stage2 激活集合: {sorted(list(active_sets_2))}")
        print(f"   Stage1 激活元素: {len(active_elems_1)}，Stage2 激活元素: {len(active_elems_2)}")

        # 设置当前阶段号用于输出路径
        self.kratos_interface = self.kratos_interface or KratosInterface()
        self.kratos_interface.current_stage = 2
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
                "constitutive_model": "Mohr-Coulomb Plasticity",
                "solver": "Newton-Raphson Nonlinear Solver",
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
            f.write(f"本构模型: {report['analysis_info']['constitutive_model']}\n")
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

    # 检查FPN文件
    fpn_file = Path("data/两阶段计算2.fpn")
    if not fpn_file.exists():
        print(f"❌ FPN文件不存在: {fpn_file}")
        print("请确保文件路径正确")
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
