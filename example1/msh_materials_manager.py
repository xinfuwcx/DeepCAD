"""
MSH材料参数管理器 - example1项目专用
定义高强度土体材料参数(类似软岩)和分层属性
支持摩尔-库伦本构模型
"""
import json
import os
from typing import Dict, Any, List
import math

class MSHMaterialsManager:
    """材料参数管理器，用于example1项目"""
    
    def __init__(self, output_dir: str = "H:/DeepCAD/data"):
        """
        初始化材料管理器
        
        Args:
            output_dir: 材料文件输出目录
        """
        self.output_dir = output_dir
        self.materials = {}
        self.soil_layers = {}
        self.ensure_output_dir()
        
    def ensure_output_dir(self):
        """确保输出目录存在"""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
    
    def define_soil_layer_materials(self) -> Dict[str, Dict[str, Any]]:
        """
        定义7层土体材料参数 (高强度，类似软岩)
        从表层到基岩逐渐增强
        
        Returns:
            包含7层土体材料参数的字典
        """
        print("定义高强度分层土体材料参数...")
        
        # 基础参数范围定义
        base_params = {
            "density_range": (2000, 2500),           # kg/m³
            "young_modulus_range": (50e6, 2000e6),   # Pa
            "poisson_ratio_range": (0.28, 0.12),     # 无量纲
            "cohesion_range": (80000, 1000000),      # Pa
            "friction_angle_range": (35, 55),        # 度
            "dilatancy_angle_range": (5, 25)         # 度
        }
        
        for layer in range(1, 8):  # Layer_1 到 Layer_7
            # 计算各参数的线性插值系数 (0到1)
            factor = (layer - 1) / 6.0
            
            # 线性插值计算各参数
            density = self._interpolate(base_params["density_range"], factor)
            young_modulus = self._interpolate(base_params["young_modulus_range"], factor)
            poisson_ratio = self._interpolate_reverse(base_params["poisson_ratio_range"], factor)
            cohesion = self._interpolate(base_params["cohesion_range"], factor)
            friction_angle = self._interpolate(base_params["friction_angle_range"], factor)
            dilatancy_angle = self._interpolate(base_params["dilatancy_angle_range"], factor)
            
            # 计算剪切模量和体积模量
            shear_modulus = young_modulus / (2 * (1 + poisson_ratio))
            bulk_modulus = young_modulus / (3 * (1 - 2 * poisson_ratio))
            
            # 计算静止土压力系数
            K0 = 1 - math.sin(math.radians(friction_angle))
            
            layer_name = f"Layer_{layer}"
            self.soil_layers[layer_name] = {
                # 基本物理参数
                "layer_id": layer,
                "material_type": "MohrCoulombPlastic3D",
                "description": f"第{layer}层土体 - {'表层硬塑粘土' if layer == 1 else '硬土层' if layer <= 3 else '强风化岩' if layer <= 5 else '基岩状土'}",
                
                # 密度参数
                "density": round(density, 1),                    # kg/m³
                "unit_weight": round(density * 9.81, 1),        # N/m³
                
                # 弹性参数
                "young_modulus": int(young_modulus),             # Pa
                "poisson_ratio": round(poisson_ratio, 3),       # 无量纲
                "shear_modulus": int(shear_modulus),             # Pa
                "bulk_modulus": int(bulk_modulus),               # Pa
                
                # 强度参数 (摩尔-库伦)
                "cohesion": int(cohesion),                       # Pa
                "friction_angle": round(friction_angle, 1),     # 度
                "dilatancy_angle": round(dilatancy_angle, 1),   # 度
                "tension_cutoff": int(cohesion * 0.1),          # 拉应力截止值
                
                # 初始应力参数
                "K0": round(K0, 3),                             # 静止土压力系数
                "OCR": 1.5,                                      # 超固结比
                
                # Kratos专用参数
                "constitutive_law_name": "MohrCoulombPlastic3DLaw",
                "element_type": "SmallDisplacementElement3D10N",
                "integration_method": "GI_GAUSS_4",
                
                # 数值计算参数
                "yield_surface_tolerance": 1e-6,
                "plastic_potential_tolerance": 1e-6,
                "maximum_iterations": 100,
                
                # 层底深度 (用于初始应力计算)
                "depth_top": (layer - 1) * 50.0 / 7,           # 层顶深度
                "depth_bottom": layer * 50.0 / 7,               # 层底深度
                "layer_thickness": 50.0 / 7                     # 层厚度
            }
            
            print(f"  {layer_name}: E={young_modulus/1e6:.0f}MPa, c={cohesion/1000:.0f}kPa, φ={friction_angle:.1f}°")
        
        return self.soil_layers
    
    def _interpolate(self, value_range: tuple, factor: float) -> float:
        """线性插值 (正向)"""
        return value_range[0] + (value_range[1] - value_range[0]) * factor
    
    def _interpolate_reverse(self, value_range: tuple, factor: float) -> float:
        """线性插值 (反向)"""
        return value_range[0] - (value_range[0] - value_range[1]) * factor
    
    def generate_kratos_materials_json(self) -> str:
        """
        生成Kratos材料JSON文件
        
        Returns:
            生成的JSON文件路径
        """
        if not self.soil_layers:
            self.define_soil_layer_materials()
        
        print("生成Kratos材料JSON文件...")
        
        # 构建Kratos材料格式
        kratos_materials = {
            "properties": []
        }
        
        for layer_name, params in self.soil_layers.items():
            material_property = {
                "model_part_name": layer_name,
                "properties_id": params["layer_id"],
                "Material": {
                    "constitutive_law": {
                        "name": params["constitutive_law_name"]
                    },
                    "Variables": {
                        "DENSITY": params["density"],
                        "YOUNG_MODULUS": params["young_modulus"],
                        "POISSON_RATIO": params["poisson_ratio"],
                        "COHESION": params["cohesion"],
                        "INTERNAL_FRICTION_ANGLE": params["friction_angle"],
                        "DILATANCY_ANGLE": params["dilatancy_angle"],
                        "YIELD_STRESS": params["cohesion"],
                        "ISOTROPIC_HARDENING_MODULUS": params["young_modulus"] * 0.01,
                        "EXPONENTIAL_SATURATION_YIELD_STRESS": params["cohesion"] * 2.0,
                        "HARDENING_CURVE": 0,
                        "MAXIMUM_STRESS": params["tension_cutoff"],
                        "MAXIMUM_STRESS_PRINCIPAL": params["tension_cutoff"],
                        "DAMAGE_ONSET_STRESS_COMPRESSION": params["cohesion"] * 10,
                        "BIAXIAL_COMPRESSION_MULTIPLIER": 1.16,
                        "VISCOSITY": 1e-6
                    },
                    "Tables": {}
                }
            }
            kratos_materials["properties"].append(material_property)
        
        # 保存JSON文件
        json_path = os.path.join(self.output_dir, "materials.json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(kratos_materials, f, indent=4, ensure_ascii=False)
        
        print(f"Kratos材料文件已生成: {json_path}")
        return json_path
    
    def generate_analysis_config(self) -> str:
        """
        生成分析配置JSON文件
        包含边界条件、荷载、分析步骤等配置
        
        Returns:
            生成的配置文件路径
        """
        print("生成分析配置文件...")
        
        analysis_config = {
            "problem_data": {
                "problem_name": "MSH_Example1_Analysis",
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
                    "input_filename": "soil_analysis"
                },
                "material_import_settings": {
                    "materials_filename": "materials.json"
                },
                "time_stepping": {
                    "time_step": 0.1
                },
                "line_search": True,
                "convergence_criteria": "mixed_criteria",
                "displacement_relative_tolerance": 1e-6,
                "residual_relative_tolerance": 1e-6,
                "displacement_absolute_tolerance": 1e-9,
                "residual_absolute_tolerance": 1e-9,
                "max_iteration": 100,
                "move_mesh_flag": False
            },
            
            "processes": {
                "constraints_process_list": [
                    {
                        "python_module": "assign_vector_variable_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignVectorVariableProcess",
                        "Parameters": {
                            "model_part_name": "Structure.BottomBoundary",
                            "variable_name": "DISPLACEMENT",
                            "constrained": [True, True, True],
                            "value": [0.0, 0.0, 0.0],
                            "interval": [0.0, "End"]
                        }
                    },
                    {
                        "python_module": "assign_vector_variable_process", 
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignVectorVariableProcess",
                        "Parameters": {
                            "model_part_name": "Structure.SideBoundary",
                            "variable_name": "DISPLACEMENT",
                            "constrained": [True, True, False],
                            "value": [0.0, 0.0, 0.0],
                            "interval": [0.0, "End"]
                        }
                    }
                ],
                "loads_process_list": [
                    {
                        "python_module": "assign_vector_by_direction_to_condition_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignVectorByDirectionToConditionProcess",
                        "Parameters": {
                            "model_part_name": "Structure",
                            "variable_name": "VOLUME_ACCELERATION",
                            "modulus": 9.81,
                            "direction": [0.0, 0.0, -1.0],
                            "interval": [0.0, "End"]
                        }
                    },
                    {
                        "python_module": "assign_scalar_variable_to_condition_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignScalarVariableToConditionProcess", 
                        "Parameters": {
                            "model_part_name": "Structure.TopBoundary",
                            "variable_name": "POSITIVE_FACE_PRESSURE",
                            "value": 20000.0,
                            "interval": [0.0, "End"]
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
                            "output_control_type": "step",
                            "output_frequency": 1,
                            "file_format": "binary",
                            "output_precision": 7,
                            "output_sub_model_parts": False,
                            "folder_name": "vtk_output",
                            "save_output_files_in_folder": True,
                            "nodal_solution_step_data_variables": [
                                "DISPLACEMENT",
                                "REACTION",
                                "VELOCITY",
                                "ACCELERATION"
                            ],
                            "gauss_point_variables": [
                                "STRESS_TENSOR",
                                "STRAIN_TENSOR",
                                "PLASTIC_STRAIN_TENSOR"
                            ]
                        }
                    }
                ]
            },
            
            "analysis_stages": {
                "stage_1": {
                    "name": "Geostatic_Equilibrium",
                    "description": "地应力平衡分析",
                    "active_parts": ["Layer_1", "Layer_2", "Layer_3", "Layer_4", "Layer_5", "Layer_6", "Layer_7"],
                    "initial_stress_application": True,
                    "time_range": [0.0, 0.3]
                },
                "stage_2": {
                    "name": "Tunnel_Excavation", 
                    "description": "隧道开挖",
                    "active_parts": ["Layer_1", "Layer_2", "Layer_3", "Layer_4", "Layer_5", "Layer_6", "Layer_7"],
                    "deactivated_parts": ["TunnelZone"],
                    "time_range": [0.3, 0.6]
                },
                "stage_3": {
                    "name": "Pit_Excavation_Stage1",
                    "description": "基坑开挖第一阶段",
                    "active_parts": ["Layer_1", "Layer_2", "Layer_3", "Layer_4", "Layer_5", "Layer_6", "Layer_7"],
                    "deactivated_parts": ["TunnelZone", "ExcavationZone_Upper"],
                    "time_range": [0.6, 0.8]
                },
                "stage_4": {
                    "name": "Pit_Excavation_Final",
                    "description": "基坑开挖最终阶段", 
                    "active_parts": ["Layer_1", "Layer_2", "Layer_3", "Layer_4", "Layer_5", "Layer_6", "Layer_7"],
                    "deactivated_parts": ["TunnelZone", "ExcavationZone"],
                    "time_range": [0.8, 1.0]
                }
            },
            
            "initial_stress_settings": {
                "method": "K0_method",
                "K0_coefficient": 0.5,
                "overconsolidation_ratio": 1.5,
                "water_table_depth": 2.0,
                "unit_weight_water": 9810.0,
                "apply_effective_stress": True
            },
            
            "monitoring_points": {
                "tunnel_crown": {"coordinates": [0.0, 0.0, 31.75], "variables": ["DISPLACEMENT"]},
                "tunnel_springline": {"coordinates": [2.5, 0.0, 30.0], "variables": ["DISPLACEMENT", "STRESS_TENSOR"]},
                "pit_corner": {"coordinates": [12.5, 12.5, 38.0], "variables": ["DISPLACEMENT"]},
                "pit_bottom_center": {"coordinates": [0.0, 0.0, 38.0], "variables": ["DISPLACEMENT"]},
                "surface_settlement": {"coordinates": [0.0, 0.0, 50.0], "variables": ["DISPLACEMENT"]}
            }
        }
        
        # 保存配置文件
        config_path = os.path.join(self.output_dir, "analysis_config.json")
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(analysis_config, f, indent=4, ensure_ascii=False)
        
        print(f"分析配置文件已生成: {config_path}")
        return config_path
    
    def calculate_initial_stress(self, depth: float, layer_params: Dict[str, Any]) -> List[float]:
        """
        计算初始地应力 (增强K0法)
        
        Args:
            depth: 埋深 (m)
            layer_params: 土层参数
            
        Returns:
            6个应力分量 [σxx, σyy, σzz, τxy, τxz, τyz]
        """
        # 获取参数
        unit_weight = layer_params["unit_weight"]
        K0 = layer_params["K0"]
        OCR = layer_params["OCR"]
        
        # 计算竖向应力
        sigma_v = unit_weight * depth
        
        # 考虑超固结的水平应力
        sigma_h = K0 * sigma_v * (OCR ** 0.5)
        
        # 返回应力张量 (6个分量)
        return [sigma_h, sigma_h, sigma_v, 0.0, 0.0, 0.0]
    
    def export_materials_summary(self) -> str:
        """
        导出材料参数汇总表
        
        Returns:
            汇总文件路径
        """
        if not self.soil_layers:
            self.define_soil_layer_materials()
        
        print("导出材料参数汇总...")
        
        summary_lines = [
            "=== MSH Example1 材料参数汇总 ===\n",
            f"项目: 高强度分层土体 (类似软岩)\n",
            f"本构模型: 摩尔-库伦塑性\n",
            f"网格类型: 二次四面体 (TET10)\n",
            f"总层数: {len(self.soil_layers)}\n\n"
        ]
        
        # 表头
        summary_lines.append("层号 | 描述             | 密度    | 弹模    | 泊松比 | 粘聚力  | 摩擦角 | 剪胀角\n")
        summary_lines.append("-----|------------------|---------|---------|--------|---------|-------|-------\n")
        
        # 各层参数
        for layer_name, params in self.soil_layers.items():
            line = f"{params['layer_id']:4d} | {params['description']:<15s} | " \
                   f"{params['density']:7.0f} | {params['young_modulus']/1e6:7.0f} | " \
                   f"{params['poisson_ratio']:6.3f} | {params['cohesion']/1000:7.0f} | " \
                   f"{params['friction_angle']:5.1f}° | {params['dilatancy_angle']:5.1f}°\n"
            summary_lines.append(line)
        
        summary_lines.append(f"\n注: 密度单位kg/m³, 弹模单位MPa, 粘聚力单位kPa\n")
        
        # 保存汇总文件
        summary_path = os.path.join(self.output_dir, "materials_summary.txt")
        with open(summary_path, 'w', encoding='utf-8') as f:
            f.writelines(summary_lines)
        
        print(f"材料参数汇总已导出: {summary_path}")
        return summary_path
    
    def generate_all_material_files(self) -> Dict[str, str]:
        """
        生成所有材料相关文件
        
        Returns:
            生成文件路径的字典
        """
        print("开始生成example1所需的所有材料文件...")
        
        file_paths = {}
        
        try:
            # 1. 定义土层材料
            self.define_soil_layer_materials()
            
            # 2. 生成各种文件
            file_paths['materials_json'] = self.generate_kratos_materials_json()
            file_paths['analysis_config'] = self.generate_analysis_config()
            file_paths['materials_summary'] = self.export_materials_summary()
            
            print("\n=== 材料文件生成完成 ===")
            for name, path in file_paths.items():
                print(f"{name}: {path}")
            
            return file_paths
            
        except Exception as e:
            print(f"材料文件生成过程中出现错误: {e}")
            raise

def main():
    """测试材料管理器"""
    manager = MSHMaterialsManager()
    file_paths = manager.generate_all_material_files()
    
    print("\n材料管理器测试完成!")
    
    # 显示第一层和最后一层的对比
    layer1 = manager.soil_layers["Layer_1"]
    layer7 = manager.soil_layers["Layer_7"]
    
    print(f"\n=== 材料参数对比 ===")
    print(f"表层 (Layer_1): E={layer1['young_modulus']/1e6:.0f}MPa, c={layer1['cohesion']/1000:.0f}kPa, φ={layer1['friction_angle']:.1f}°")
    print(f"基岩 (Layer_7): E={layer7['young_modulus']/1e6:.0f}MPa, c={layer7['cohesion']/1000:.0f}kPa, φ={layer7['friction_angle']:.1f}°")

if __name__ == "__main__":
    main()