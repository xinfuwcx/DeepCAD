"""
多阶段FPN到Kratos转换器
处理包含开挖阶段的施工序列分析
"""

import sys
import json
import math
from pathlib import Path

def parse_fpn_stages(fpn_data):
    """解析FPN文件中的施工阶段信息"""
    stages = []
    
    # 从FPN数据中提取阶段信息
    # 这里需要根据实际FPN格式来解析
    # 目前创建默认的两阶段分析
    stages = [
        {
            "id": 1,
            "name": "初始应力平衡",
            "type": "initial_stress",
            "description": "地应力平衡阶段",
            "activate_elements": "all",
            "deactivate_elements": [],
            "apply_gravity": True,
            "apply_initial_stress": True
        },
        {
            "id": 2, 
            "name": "基坑开挖",
            "type": "excavation",
            "description": "开挖阶段，移除开挖区域土体",
            "activate_elements": [],
            "deactivate_elements": "excavation_zone",
            "apply_gravity": True,
            "apply_initial_stress": False
        }
    ]
    
    return stages

def identify_excavation_elements(nodes, elements):
    """识别需要开挖的单元（基于几何位置）"""
    excavation_elements = []

    # 计算模型边界
    x_coords = [node['coordinates'][0] for node in nodes]
    y_coords = [node['coordinates'][1] for node in nodes]
    z_coords = [node['coordinates'][2] for node in nodes]

    x_min, x_max = min(x_coords), max(x_coords)
    y_min, y_max = min(y_coords), max(y_coords)
    z_min, z_max = min(z_coords), max(z_coords)

    print(f"📏 模型边界:")
    print(f"   X: [{x_min:.2f}, {x_max:.2f}] (范围: {x_max-x_min:.2f}m)")
    print(f"   Y: [{y_min:.2f}, {y_max:.2f}] (范围: {y_max-y_min:.2f}m)")
    print(f"   Z: [{z_min:.2f}, {z_max:.2f}] (范围: {z_max-z_min:.2f}m)")

    # 更合理的开挖区域定义：
    # 1. 基坑通常在模型中心区域
    # 2. 开挖深度通常从地表向下
    # 3. 假设开挖深度为15-20米（典型基坑深度）

    # 中心区域（40%的模型范围）
    center_x = (x_min + x_max) / 2
    center_y = (y_min + y_max) / 2

    excavation_width = 0.4 * (x_max - x_min)  # 开挖宽度
    excavation_length = 0.4 * (y_max - y_min)  # 开挖长度
    excavation_depth = 15.0  # 开挖深度15米

    excavation_x_min = center_x - excavation_width / 2
    excavation_x_max = center_x + excavation_width / 2
    excavation_y_min = center_y - excavation_length / 2
    excavation_y_max = center_y + excavation_length / 2
    excavation_z_min = z_max - excavation_depth  # 从地表向下开挖
    excavation_z_max = z_max  # 地表

    print(f"🏗️ 开挖区域定义:")
    print(f"   X: [{excavation_x_min:.2f}, {excavation_x_max:.2f}] (宽度: {excavation_width:.2f}m)")
    print(f"   Y: [{excavation_y_min:.2f}, {excavation_y_max:.2f}] (长度: {excavation_length:.2f}m)")
    print(f"   Z: [{excavation_z_min:.2f}, {excavation_z_max:.2f}] (深度: {excavation_depth:.2f}m)")

    # 创建节点位置映射
    node_positions = {node['id']: node['coordinates'] for node in nodes}

    # 检查每个单元的中心点是否在开挖区域内
    for element in elements:
        if element['type'] == 'Tetrahedra3D4N':
            # 计算单元中心点
            element_nodes = element['nodes']
            center_x = sum(node_positions[node_id][0] for node_id in element_nodes) / 4
            center_y = sum(node_positions[node_id][1] for node_id in element_nodes) / 4
            center_z = sum(node_positions[node_id][2] for node_id in element_nodes) / 4

            # 检查是否在开挖区域内
            if (excavation_x_min <= center_x <= excavation_x_max and
                excavation_y_min <= center_y <= excavation_y_max and
                excavation_z_min <= center_z <= excavation_z_max):
                excavation_elements.append(element['id'])

    print(f"🔍 识别开挖单元: {len(excavation_elements)} 个")

    if len(excavation_elements) == 0:
        print("⚠️  警告：未识别到开挖单元，可能需要调整开挖区域定义")
        print("   建议检查模型坐标系统和开挖区域参数")

    return excavation_elements

def create_multi_stage_analysis():
    """创建多阶段分析"""
    print("🚀 开始多阶段FPN到Kratos转换...")
    
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

    # 2. 解析施工阶段
    print("🏗️ 解析施工阶段...")
    stages = parse_fpn_stages(fpn_data)
    print(f"   发现 {len(stages)} 个施工阶段:")
    for stage in stages:
        print(f"   - 阶段{stage['id']}: {stage['name']} ({stage['type']})")

    # 3. 转换基础数据
    print("🔄 转换基础数据...")
    nodes = fpn_data.get('nodes', [])
    elements = fpn_data.get('elements', [])
    materials = fpn_data.get('materials', {})
    
    # 转换节点
    converted_nodes = []
    for node in nodes:
        converted_node = {
            'id': node['id'],
            'coordinates': [node['x'], node['y'], node['z']]
        }
        converted_nodes.append(converted_node)
    
    # 转换单元
    converted_elements = []
    for element in elements:
        # FPN中的四面体单元类型可能是不同的名称
        if element.get('type') in ['C3D4', 'TETRA', 'Tetrahedra3D4N', 'tetrahedron']:
            converted_element = {
                'id': element['id'],
                'type': 'Tetrahedra3D4N',
                'nodes': element['nodes'],
                'material_id': element.get('material_id', 1)
            }
            converted_elements.append(converted_element)

    print(f"   转换单元: {len(converted_elements)} 个四面体单元")

    # 如果没有转换到单元，检查原始单元类型
    if len(converted_elements) == 0:
        element_types = set(el.get('type', 'unknown') for el in elements[:10])  # 检查前10个单元的类型
        print(f"   ⚠️  警告：未找到四面体单元，原始单元类型: {element_types}")
        print(f"   尝试转换所有单元类型...")

        # 尝试转换所有单元
        for element in elements:
            converted_element = {
                'id': element['id'],
                'type': 'Tetrahedra3D4N',
                'nodes': element['nodes'],
                'material_id': element.get('material_id', 1)
            }
            converted_elements.append(converted_element)

        print(f"   强制转换单元: {len(converted_elements)} 个")
    
    # 4. 识别开挖单元
    print("🔍 识别开挖区域...")
    excavation_elements = identify_excavation_elements(converted_nodes, converted_elements)
    
    # 5. 创建输出目录
    output_dir = Path('multi_stage_kratos_conversion')
    output_dir.mkdir(exist_ok=True)
    print(f"📁 创建输出目录: {output_dir}")
    
    # 6. 为每个阶段创建分析文件
    for stage in stages:
        stage_id = stage['id']
        stage_name = stage['name']
        stage_type = stage['type']
        
        print(f"\n🔧 创建阶段{stage_id}分析文件: {stage_name}")
        
        # 创建阶段目录
        stage_dir = output_dir / f"stage_{stage_id}"
        stage_dir.mkdir(exist_ok=True)
        
        # 确定该阶段的活跃单元
        if stage_type == "initial_stress":
            # 初始应力阶段：所有单元都活跃
            active_elements = converted_elements.copy()
        elif stage_type == "excavation":
            # 开挖阶段：移除开挖区域单元
            active_elements = [el for el in converted_elements 
                             if el['id'] not in excavation_elements]
            print(f"   移除开挖单元: {len(excavation_elements)} 个")
            print(f"   剩余活跃单元: {len(active_elements)} 个")
        else:
            active_elements = converted_elements.copy()
        
        # 生成该阶段的MDPA文件
        mdpa_file = stage_dir / f"stage_{stage_id}_analysis.mdpa"
        generate_stage_mdpa(mdpa_file, converted_nodes, active_elements, materials, stage)
        
        # 生成该阶段的项目参数文件
        params_file = stage_dir / "ProjectParameters.json"
        generate_stage_parameters(params_file, stage, stage_id)
        
        # 生成材料文件
        materials_file = stage_dir / "materials.json"
        generate_materials_file(materials_file, materials)
    
    print(f"\n🎉 多阶段转换完成！")
    print(f"   输出目录: {output_dir}")
    print(f"   阶段数量: {len(stages)}")
    print(f"   每个阶段都有独立的分析文件")
    
    return True

def generate_stage_mdpa(mdpa_file, nodes, elements, materials, stage):
    """生成阶段MDPA文件"""
    with open(mdpa_file, 'w') as f:
        f.write(f"// Stage {stage['id']}: {stage['name']}\n")
        f.write("Begin ModelPartData\n")
        f.write("End ModelPartData\n\n")

        # 写入材料属性
        f.write("Begin Properties 0\n")
        f.write("End Properties\n\n")

        # 为每个材料ID写入属性块
        used_material_ids = set()
        if elements:
            used_material_ids = set(el['material_id'] for el in elements)

        for mat_id in sorted(used_material_ids):
            f.write(f"Begin Properties {mat_id}\n")
            f.write("End Properties\n\n")

        # 写入节点
        f.write("Begin Nodes\n")
        for node in nodes:
            f.write(f"{node['id']} {node['coordinates'][0]} {node['coordinates'][1]} {node['coordinates'][2]}\n")
        f.write("End Nodes\n\n")

        # 写入单元
        if elements:
            f.write("Begin Elements SmallDisplacementElement3D4N\n")
            for el in elements:
                nodes_str = ' '.join(map(str, el['nodes']))
                f.write(f"{el['id']} {el['material_id']} {nodes_str}\n")
            f.write("End Elements\n\n")

        # 为每个材料创建子模型部分
        if elements:
            # 按材料ID分组单元
            elements_by_material = {}
            for el in elements:
                mat_id = el['material_id']
                if mat_id not in elements_by_material:
                    elements_by_material[mat_id] = []
                elements_by_material[mat_id].append(el)

            # 为每个材料创建子模型部分
            for mat_id in sorted(elements_by_material.keys()):
                f.write(f"Begin SubModelPart MAT_{mat_id}\n")

                # 收集该材料的所有节点
                material_nodes = set()
                for el in elements_by_material[mat_id]:
                    material_nodes.update(el['nodes'])

                # 写入节点
                f.write("Begin SubModelPartNodes\n")
                for node_id in sorted(material_nodes):
                    f.write(f"{node_id}\n")
                f.write("End SubModelPartNodes\n")

                # 写入单元
                f.write("Begin SubModelPartElements\n")
                for el in elements_by_material[mat_id]:
                    f.write(f"{el['id']}\n")
                f.write("End SubModelPartElements\n")

                f.write("End SubModelPart\n\n")

        # 创建底部支撑子模型部分
        # 找到Z坐标最小的节点作为底部支撑
        min_z = min(node['coordinates'][2] for node in nodes)
        bottom_nodes = [node for node in nodes if abs(node['coordinates'][2] - min_z) < 1.0]  # 1米容差

        if bottom_nodes:
            f.write("Begin SubModelPart BOTTOM_SUPPORT\n")
            f.write("Begin SubModelPartNodes\n")
            for node in bottom_nodes:
                f.write(f"{node['id']}\n")
            f.write("End SubModelPartNodes\n")
            f.write("End SubModelPart\n\n")

            print(f"   创建底部支撑: {len(bottom_nodes)} 个节点 (Z={min_z:.2f}m)")

def generate_stage_parameters(params_file, stage, stage_id):
    """生成阶段参数文件"""
    params = {
        "problem_data": {
            "problem_name": f"stage_{stage_id}_analysis",
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
                "input_filename": f"stage_{stage_id}_analysis"
            },
            "material_import_settings": {
                "materials_filename": "materials.json"
            },
            "time_stepping": {
                "time_step": 1.0
            },
            "line_search": False,
            "convergence_criterion": "residual_criterion",
            "displacement_relative_tolerance": 1e-4,
            "displacement_absolute_tolerance": 1e-9,
            "residual_relative_tolerance": 1e-4,
            "residual_absolute_tolerance": 1e-9,
            "max_iteration": 20,
            "use_old_stiffness_in_first_iteration": False,
            "problem_domain_sub_model_part_list": ["Structure"],
            "processes_sub_model_part_list": ["BOTTOM_SUPPORT"],
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
                        "modulus": 98.0665,
                        "direction": [0.0, 0.0, -1.0],
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
                        "output_interval": 1,
                        "file_format": "ascii",
                        "output_precision": 7,
                        "output_sub_model_parts": False,
                        "output_path": "VTK_Output",
                        "save_output_files_in_folder": True,
                        "nodal_solution_step_data_variables": ["DISPLACEMENT", "REACTION"],
                        "element_data_value_variables": ["VON_MISES_STRESS"],
                        "condition_data_value_variables": []
                    }
                }
            ]
        }
    }

    with open(params_file, 'w') as f:
        json.dump(params, f, indent=2, ensure_ascii=False)

def generate_materials_file(materials_file, materials):
    """生成材料文件"""
    # Kratos材料文件格式：一个ModelPart条目包含多个properties
    properties_list = []

    # 转换材料属性
    for mat_id, mat_props in materials.items():
        # 提取材料参数
        young_modulus = mat_props.get('elastic_modulus', 5e6)  # 默认5 MPa
        poisson_ratio = mat_props.get('poisson_ratio', 0.3)
        density = mat_props.get('density', 2000.0)  # kg/m³

        material_entry = {
            "properties_id": int(mat_id),
            "Material": {
                "constitutive_law": {
                    "name": "LinearElastic3DLaw"
                },
                "Variables": {
                    "YOUNG_MODULUS": young_modulus,
                    "POISSON_RATIO": poisson_ratio,
                    "DENSITY": density
                },
                "Tables": {}
            }
        }
        properties_list.append(material_entry)

    # 如果没有材料，创建默认材料
    if not properties_list:
        default_material = {
            "properties_id": 1,
            "Material": {
                "constitutive_law": {
                    "name": "LinearElastic3DLaw"
                },
                "Variables": {
                    "YOUNG_MODULUS": 5e6,  # 5 MPa
                    "POISSON_RATIO": 0.3,
                    "DENSITY": 2000.0
                },
                "Tables": {}
            }
        }
        properties_list.append(default_material)

    # 正确的Kratos材料文件格式 - 每个材料都是独立的条目，使用MAT_X格式
    final_properties_list = []
    for mat_entry in properties_list:
        mat_id = mat_entry["properties_id"]
        final_entry = {
            "model_part_name": f"Structure.MAT_{mat_id}",
            "properties_id": mat_id,
            "Material": mat_entry["Material"]
        }
        final_properties_list.append(final_entry)

    materials_data = {
        "properties": final_properties_list
    }

    with open(materials_file, 'w') as f:
        json.dump(materials_data, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    create_multi_stage_analysis()
