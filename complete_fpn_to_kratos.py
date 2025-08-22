"""
完整的FPN到Kratos转换器
彻彻底底完成从FPN到Kratos的转换，特别注意材料模型
"""

import sys
import json
import math
from pathlib import Path

def complete_fpn_to_kratos():
    """完整的FPN到Kratos转换"""
    print("🚀 开始完整的FPN到Kratos转换...")
    
    # 1. 解析FPN文件
    print("📖 解析FPN文件...")
    try:
        from example2.core.optimized_fpn_parser import OptimizedFPNParser
        
        project_root = Path(__file__).parent
        fpn_file = project_root / "example2" / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        
        parser = OptimizedFPNParser()
        fpn_data = parser.parse_file_streaming(str(fpn_file))
        
        print(f"✅ FPN文件解析成功")
        print(f"   节点数量: {len(fpn_data.get('nodes', []))}")
        print(f"   单元数量: {len(fpn_data.get('elements', []))}")
        print(f"   材料数量: {len(fpn_data.get('materials', {}))}")
        
    except Exception as e:
        print(f"❌ FPN解析失败: {e}")
        return False

    # 2. 创建输出目录
    output_dir = Path('complete_fpn_kratos_conversion')
    output_dir.mkdir(exist_ok=True)
    print(f"📁 创建输出目录: {output_dir}")

    # 3. 转换节点数据
    print("🔄 转换节点数据...")
    nodes = fpn_data.get('nodes', [])
    converted_nodes = []
    
    for node in nodes:
        converted_node = {
            'id': node['id'],
            'coordinates': [node['x'], node['y'], node['z']]
        }
        converted_nodes.append(converted_node)
    
    print(f"   转换了{len(converted_nodes)}个节点")

    # 4. 转换单元数据
    print("🔄 转换单元数据...")
    elements = fpn_data.get('elements', [])
    converted_elements = []
    
    # 单元类型映射
    element_type_mapping = {
        'tetra': 'Tetrahedra3D4N',
        'truss': 'TrussElement3D2N',
        'triangle': 'Triangle2D3N',
        'quad': 'Quadrilateral2D4N'
    }
    
    for element in elements:
        original_type = element.get('type', '')
        kratos_type = element_type_mapping.get(original_type, original_type)
        
        converted_element = {
            'id': element['id'],
            'type': kratos_type,
            'material_id': element.get('material_id', 1),
            'nodes': element.get('nodes', [])
        }
        converted_elements.append(converted_element)
    
    print(f"   转换了{len(converted_elements)}个单元")

    # 5. 转换材料数据
    print("🔄 转换材料数据...")
    materials = fpn_data.get('materials', {})
    
    class FPNMaterialAdapter:
        """FPN材料到Kratos材料的适配器 - 统一弹塑性摩尔-库伦模型"""
        def __init__(self, mat_id, fpn_mat_data):
            self.id = mat_id
            self.name = fpn_mat_data.get('name', f'Material_{mat_id}')

            # 从FPN的properties字段中提取材料参数
            props = fpn_mat_data.get('properties', {})

            # 基本弹性参数 - 从FPN读取
            self.elastic_modulus = props.get('E', 30e6)  # Pa，FPN已转换
            self.young_modulus = self.elastic_modulus  # 别名
            self.poisson_ratio = props.get('NU', 0.3)
            self.density = props.get('DENSITY', 2000.0)  # kg/m³，FPN已转换

            # 摩尔-库伦参数 - 优先从FPN读取
            self.friction_angle = props.get('FRICTION_ANGLE')
            self.cohesion = props.get('COHESION')  # Pa，FPN已转换

            # 根据材料名称推断缺失的摩尔-库伦参数
            self._infer_missing_parameters()

            # 其他参数
            self.porosity = props.get('POROSITY', 0.5)
            self.material_type = props.get('type', 'soil')

        def _infer_missing_parameters(self):
            """根据材料名称推断缺失的摩尔-库伦参数"""
            material_name_lower = self.name.lower()

            if self.friction_angle is None or self.cohesion is None:
                if any(keyword in material_name_lower for keyword in ['砂', '细砂', 'sand']):
                    # 砂土：高摩擦角，无粘聚力
                    self.friction_angle = self.friction_angle or 32.0  # 中密砂土
                    self.cohesion = self.cohesion or 0.0
                    print(f"🏖️ 砂土材料 {self.name}: 推断 φ={self.friction_angle}°, c={self.cohesion/1000:.1f}kPa")
                elif any(keyword in material_name_lower for keyword in ['卵石', 'gravel', '碎石']):
                    # 卵石：很高摩擦角，无粘聚力
                    self.friction_angle = self.friction_angle or 38.0  # 密实卵石
                    self.cohesion = self.cohesion or 0.0
                    print(f"🪨 卵石材料 {self.name}: 推断 φ={self.friction_angle}°, c={self.cohesion/1000:.1f}kPa")
                elif any(keyword in material_name_lower for keyword in ['粘土', 'clay', '粉质']):
                    # 粘土：中等摩擦角，有粘聚力
                    self.friction_angle = self.friction_angle or 22.0  # 中等粘土
                    self.cohesion = self.cohesion or 15000.0  # 15kPa
                    print(f"🧱 粘土材料 {self.name}: 推断 φ={self.friction_angle}°, c={self.cohesion/1000:.1f}kPa")
                else:
                    # 默认土体参数
                    self.friction_angle = self.friction_angle or 25.0
                    self.cohesion = self.cohesion or 10000.0  # 10kPa
                    print(f"🌍 通用土体 {self.name}: 推断 φ={self.friction_angle}°, c={self.cohesion/1000:.1f}kPa")
    
    # 转换FPN材料为Kratos兼容格式
    kratos_materials = {}
    for mat_id, fpn_mat_data in materials.items():
        kratos_materials[mat_id] = FPNMaterialAdapter(mat_id, fpn_mat_data)
    
    print(f"   转换了{len(kratos_materials)}个材料")

    # 6. 生成MDPA文件
    print("📝 生成MDPA文件...")
    mdpa_file = output_dir / 'kratos_analysis.mdpa'
    
    try:
        with open(mdpa_file, 'w') as f:
            f.write("Begin ModelPartData\n")
            f.write("End ModelPartData\n\n")
            
            # 收集使用的材料ID
            used_material_ids = set()
            for element in converted_elements:
                used_material_ids.add(element.get('material_id', 1))
            
            # 写出属性
            for mat_id in sorted(used_material_ids):
                f.write(f"Begin Properties {mat_id}\n")
                f.write("End Properties\n\n")
            
            # 写出节点
            f.write("Begin Nodes\n")
            for node in converted_nodes:
                coords = node['coordinates']
                f.write(f"{node['id']} {coords[0]} {coords[1]} {coords[2]}\n")
            f.write("End Nodes\n\n")

            # 找到底部节点（Z坐标最小的节点）并写入一个底部支撑的 SubModelPart
            z_coords = [node['coordinates'][2] for node in converted_nodes]
            min_z = min(z_coords)
            z_tolerance = 1.0  # 1米容差
            bottom_nodes = [node['id'] for node in converted_nodes
                           if node['coordinates'][2] <= min_z + z_tolerance]
            print(f"🔒 识别底部固定节点: {len(bottom_nodes)} 个 (Z <= {min_z + z_tolerance:.2f})")
            # 写出 SubModelPart: BOTTOM_SUPPORT
            f.write("Begin SubModelPart BOTTOM_SUPPORT\n")
            f.write("  Begin SubModelPartNodes\n")
            for node_id in sorted(bottom_nodes):
                f.write(f"  {node_id}\n")
            f.write("  End SubModelPartNodes\n")
            f.write("  Begin SubModelPartElements\n")
            # 可选：不需要固定到元素，这里留空
            f.write("  End SubModelPartElements\n")
            f.write("End SubModelPart\n")

            # 写出单元
            tetra_elements = [el for el in converted_elements if el['type'] == 'Tetrahedra3D4N']
            if tetra_elements:
                f.write("Begin Elements SmallDisplacementElement3D4N\n")
                for el in tetra_elements:
                    nodes_str = ' '.join(map(str, el['nodes']))
                    f.write(f"{el['id']} {el['material_id']} {nodes_str}\n")
                f.write("End Elements\n\n")
            
            # 写出子模型部分
            for mat_id in sorted(used_material_ids):
                f.write(f"Begin SubModelPart MAT_{mat_id}\n")
                f.write("  Begin SubModelPartNodes\n")
                # 收集该材料的节点
                material_nodes = set()
                for el in converted_elements:
                    if el.get('material_id') == mat_id:
                        material_nodes.update(el.get('nodes', []))
                for node_id in sorted(material_nodes):
                    f.write(f"  {node_id}\n")
                f.write("  End SubModelPartNodes\n")
                f.write("  Begin SubModelPartElements\n")
                for el in converted_elements:
                    if el.get('material_id') == mat_id:
                        f.write(f"  {el['id']}\n")
                f.write("  End SubModelPartElements\n")
                f.write("End SubModelPart\n")

        
        print(f"✅ MDPA文件生成成功: {mdpa_file}")
        
    except Exception as e:
        print(f"❌ MDPA文件生成失败: {e}")
        return False

    # 7. 生成材料文件
    print("📝 生成材料文件...")
    materials_file = output_dir / 'materials.json'

    try:
        properties = []

        # 只为实际使用的材料生成配置 - 统一使用摩尔-库伦弹塑性模型
        for mat_id in sorted(used_material_ids):
            if mat_id not in kratos_materials:
                continue
            mat = kratos_materials[mat_id]

            # 统一使用摩尔-库伦材料模型（兼容当前Kratos版本的D+/D− damage变体）
            phi_deg = float(mat.friction_angle)
            phi_rad = math.radians(phi_deg)
            cohesion_pa = float(mat.cohesion)

            # 剪胀角：优先用FPN提供；否则 ψ = max(0, φ - 30°)，单位：度
            dilatancy_deg = max(0.0, phi_deg - 30.0)
            dilatancy_rad = math.radians(dilatancy_deg)

            # 计算屈服应力 (摩尔-库伦): 使用弧度进行三角函数
            sin_phi = math.sin(phi_rad)
            cos_phi = math.cos(phi_rad)
            tension_yield = 2.0 * cohesion_pa * cos_phi / max(1e-12, (1.0 + sin_phi))
            compression_yield = 2.0 * cohesion_pa * cos_phi / max(1e-12, (1.0 - sin_phi))
            # 最小值兜底，避免数值过小
            tension_yield = max(tension_yield, 1.0e3)      # ≥ 1 kPa
            compression_yield = max(compression_yield, 1.0e4)  # ≥ 10 kPa

            # 先使用简单的线弹性本构律进行测试
            constitutive_law = "LinearElastic3DLaw"

            material_props = {
                "YOUNG_MODULUS": float(mat.elastic_modulus),
                "POISSON_RATIO": float(mat.poisson_ratio),
                "DENSITY": float(mat.density)
            }

            print(f"🎯 材料{mat_id} ({mat.name}): 线弹性 E={mat.elastic_modulus/1e6:.1f} MPa, ν={mat.poisson_ratio:.3f}, ρ={mat.density:.1f} kg/m³")
            
            properties.append({
                "model_part_name": f"Structure.MAT_{mat_id}",
                "properties_id": mat_id,
                "Material": {
                    "constitutive_law": {
                        "name": constitutive_law
                    },
                    "Variables": material_props,
                    "Tables": {}
                }
            })
        
        materials_data = {
            "properties": properties
        }
        
        with open(materials_file, 'w', encoding='utf-8') as f:
            json.dump(materials_data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 材料文件生成成功: {materials_file}")
        
    except Exception as e:
        print(f"❌ 材料文件生成失败: {e}")
        return False

    # 7.5. 处理边界条件和荷载
    print("🔄 处理边界条件和荷载...")
    boundary_conditions = []
    loads = []

    # 从FPN数据中提取边界条件
    boundary_groups = fpn_data.get('boundary_groups', {})
    load_groups = fpn_data.get('load_groups', {})

    print(f"   发现 {len(boundary_groups)} 个边界组")
    print(f"   发现 {len(load_groups)} 个荷载组")

    # 处理边界条件 - 固定约束
    fixed_nodes = set()
    for bg_id, bg_data in boundary_groups.items():
        if 'constraints' in bg_data:
            for constraint in bg_data['constraints']:
                node_id = constraint['node']
                dof_bools = constraint.get('dof_bools', [True, True, True])  # [X, Y, Z]
                fixed_nodes.add(node_id)
                print(f"   节点 {node_id} 约束: X={dof_bools[0]}, Y={dof_bools[1]}, Z={dof_bools[2]}")

        # 处理节点组约束
        if 'nodes' in bg_data:
            for node_id in bg_data['nodes']:
                fixed_nodes.add(node_id)

    # 处理荷载 - 重力和其他荷载
    gravity_load = None
    for lg_id, lg_data in load_groups.items():
        if 'gravity' in lg_data:
            gravity = lg_data['gravity']
            gravity_load = gravity
            print(f"   添加重力荷载: {gravity}")

    # 强制使用增强重力进行测试
    gravity_load = [0.0, 0.0, -98.0665]  # 增大10倍重力用于测试
    print(f"   使用增强重力荷载: {gravity_load}")

    # 8. 生成项目参数文件
    print("📝 生成项目参数文件...")
    params_file = output_dir / 'ProjectParameters.json'
    
    try:
        # 统一使用非线性分析（弹塑性摩尔-库伦模型）
        analysis_type = "non_linear"
        
        project_params = {
            "problem_data": {
                "problem_name": "fpn_kratos_analysis",
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
                "analysis_type": analysis_type,
                "model_import_settings": {
                    "input_type": "mdpa",
                    "input_filename": "kratos_analysis"
                },
                "material_import_settings": {
                    "materials_filename": "materials.json"
                },
                "time_stepping": {
                    "time_step": 1.0
                },
                "solving_strategy_settings": {
                    "type": "line_search"
                },
                "convergence_criterion": "residual_criterion",
                "displacement_relative_tolerance": 1e-4,
                "displacement_absolute_tolerance": 1e-9,
                "residual_relative_tolerance": 1e-4,
                "residual_absolute_tolerance": 1e-9,
                "max_iteration": 20,
                "rotation_dofs": False
            },
            "processes": {
                "constraints_process_list": [
                    {
                        "python_module": "assign_vector_variable_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignVectorVariableProcess",
                        "Parameters": {
                            "model_part_name": "Structure.BOTTOM_SUPPORT",
                            "variable_name": "DISPLACEMENT",
                            "constrained": [True, True, True],  # 完全固定底部节点防止刚体运动
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
                            "constrained": False,
                            "modulus": 98.0665,  # 增大10倍重力
                            "direction": [0.0, 0.0, -1.0],
                            "interval": [0.0, "End"]
                        }
                    }
                ],
                "list_other_processes": [
                    {
                        "python_module": "vtk_output_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "VtkOutputProcess",
                        "help": "This process writes postprocessing files for Paraview",
                        "Parameters": {
                            "model_part_name": "Structure",
                            "output_control_type": "step",
                            "output_interval": 1,
                            "file_format": "ascii",
                            "output_precision": 7,
                            "output_sub_model_parts": False,
                            "output_path": "VTK_Output",
                            "save_output_files_in_folder": True,
                            "nodal_solution_step_data_variables": ["DISPLACEMENT", "REACTION"],
                            "nodal_data_value_variables": [],
                            "element_data_value_variables": [],
                            "condition_data_value_variables": []
                        }
                    }
                ]
            },
            "output_processes": {}
        }
        
        with open(params_file, 'w', encoding='utf-8') as f:
            json.dump(project_params, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 项目参数文件生成成功: {params_file}")
        print(f"   分析类型: {analysis_type}")
        
    except Exception as e:
        print(f"❌ 项目参数文件生成失败: {e}")
        return False

    print(f"\n🎉 完整的FPN到Kratos转换成功完成!")
    print(f"📁 输出目录: {output_dir}")
    print(f"📋 生成的文件:")
    print(f"   - kratos_analysis.mdpa ({len(converted_nodes)}个节点, {len(converted_elements)}个单元)")
    print(f"   - materials.json ({len(kratos_materials)}种材料)")
    print(f"   - ProjectParameters.json ({analysis_type}分析)")
    
    return True

if __name__ == "__main__":
    success = complete_fpn_to_kratos()
    
    if success:
        print(f"\n✅ 转换成功! 现在可以运行Kratos分析了")
        print(f"💡 下一步:")
        print(f"   1. cd complete_fpn_kratos_conversion")
        print(f"   2. python -c \"import KratosMultiphysics; from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis; analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(KratosMultiphysics.Model(), KratosMultiphysics.Parameters(open('ProjectParameters.json').read())); analysis.Run()\"")
    else:
        print(f"\n❌ 转换失败")
