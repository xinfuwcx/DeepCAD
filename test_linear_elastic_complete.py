#!/usr/bin/env python3
"""完整的线弹性测试 - 使用正确的FPN边界条件"""

import sys
sys.path.append('.')

from example2.core.optimized_fpn_parser import OptimizedFPNParser
from example2.core.kratos_interface import KratosInterface

def test_complete_linear_elastic():
    """完整的线弹性测试"""
    
    print("🧪 开始完整的线弹性测试...")
    
    # 1. 解析FPN文件
    print("📖 解析FPN文件...")
    parser = OptimizedFPNParser()
    fpn_data = parser.parse_file_streaming('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    
    # 2. 创建分析设置 - 线弹性
    print("⚙️  配置线弹性分析...")

    # 创建简单的分析设置对象
    class AnalysisSettings:
        def __init__(self):
            self.analysis_type = 'static'
            self.solver_type = 'linear'  # 线弹性
            self.max_iterations = 1
            self.convergence_tolerance = 1e-6
            self.time_step = 1.0
            self.end_time = 1.0

    analysis_settings = AnalysisSettings()
    
    # 3. 创建KratosInterface
    print("🔧 初始化Kratos接口...")
    kratos = KratosInterface()
    kratos.source_fpn_data = fpn_data
    kratos.current_stage = 1
    kratos.analysis_settings = analysis_settings
    
    # 4. 设置模型数据并转换单元类型
    print("📊 设置模型数据...")

    # 转换单元类型名称以匹配Kratos期望
    elements = fpn_data.get('elements', [])
    converted_elements = []

    type_mapping = {
        'tetra': 'Tetrahedra3D4N',
        'truss': 'TrussElement3D2N',
        'triangle': 'Triangle2D3N',
        'quad': 'Quadrilateral2D4N'
    }

    for el in elements:
        converted_el = el.copy()
        original_type = el.get('type', '')
        if original_type in type_mapping:
            converted_el['type'] = type_mapping[original_type]
        converted_elements.append(converted_el)

    # 转换节点数据结构
    nodes = fpn_data.get('nodes', [])
    converted_nodes = []

    for node in nodes:
        converted_node = node.copy()
        # 转换坐标格式：从 x,y,z 字段转为 coordinates 数组
        if 'x' in node and 'y' in node and 'z' in node:
            converted_node['coordinates'] = [node['x'], node['y'], node['z']]
        converted_nodes.append(converted_node)

    # 创建转换后的模型数据
    converted_fpn_data = fpn_data.copy()
    converted_fpn_data['elements'] = converted_elements
    converted_fpn_data['nodes'] = converted_nodes

    kratos.model_data = converted_fpn_data

    # 调试：检查转换结果
    print(f"   节点数量: {len(fpn_data.get('nodes', []))}")
    print(f"   单元数量: {len(converted_elements)}")
    print(f"   材料数量: {len(fpn_data.get('materials', {}))}")

    # 统计转换后的单元类型
    converted_types = {}
    for el in converted_elements[:10]:
        el_type = el.get('type', 'Unknown')
        converted_types[el_type] = converted_types.get(el_type, 0) + 1
    print(f"   转换后单元类型: {converted_types}")

    # 调试：检查节点数据结构
    nodes = fpn_data.get('nodes', [])
    if nodes:
        print(f"   第一个节点: {nodes[0]}")
    
    # 5. 修改材料为线弹性
    print("🔄 转换材料为线弹性...")
    materials = fpn_data.get('materials', {})

    # 创建简单的材料对象类
    class LinearMaterial:
        def __init__(self, mat_id, mat_data):
            self.id = mat_data.get('id', mat_id)
            self.name = f"LinearElastic_{mat_id}"
            self.constitutive_law = 'LinearElastic3DLaw'
            self.density = mat_data.get('density', 2000.0)
            self.elastic_modulus = mat_data.get('elastic_modulus', 5000000.0)
            self.young_modulus = mat_data.get('elastic_modulus', 5000000.0)  # 别名
            self.poisson_ratio = mat_data.get('poisson_ratio', 0.3)

    linear_materials = {}
    for mat_id, mat_data in materials.items():
        linear_materials[mat_id] = LinearMaterial(mat_id, mat_data)

    kratos.materials = linear_materials
    print(f"   转换了{len(linear_materials)}个材料为线弹性")
    
    # 6. 生成Kratos配置
    print("📝 生成Kratos配置...")
    try:
        # 创建输出目录
        import os
        from pathlib import Path
        output_dir = Path('temp_kratos_analysis')
        output_dir.mkdir(exist_ok=True)

        # 生成MDPA文件
        mdpa_file = output_dir / 'kratos_analysis.mdpa'
        kratos._write_mdpa_file(mdpa_file)
        print("✅ MDPA文件生成成功")

        # 生成材料文件
        materials_file = output_dir / 'materials.json'
        kratos._write_materials_file(materials_file)
        print("✅ 材料文件生成成功")

        # 生成ProjectParameters.json
        params_file = output_dir / 'ProjectParameters.json'
        mdpa_name = 'kratos_analysis'  # 不包含扩展名，Kratos会自动添加
        materials_name = 'materials.json'

        kratos._write_project_parameters(params_file, mdpa_name, materials_name)
        print("✅ 项目参数文件生成成功")

        print("✅ Kratos配置生成成功")
    except Exception as e:
        print(f"❌ Kratos配置生成异常: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # 7. 运行Kratos分析
    print("🚀 运行Kratos分析...")
    try:
        import os
        os.chdir('temp_kratos_analysis')
        
        import KratosMultiphysics
        from KratosMultiphysics.StructuralMechanicsApplication.structural_mechanics_analysis import StructuralMechanicsAnalysis
        
        with open('ProjectParameters.json', 'r') as f:
            parameters = KratosMultiphysics.Parameters(f.read())
        
        print("📋 分析配置:")
        solver_settings = parameters["solver_settings"]
        print(f"   - 分析类型: {solver_settings['analysis_type'].GetString()}")
        print(f"   - 最大迭代: {solver_settings['max_iteration'].GetInt()}")
        print(f"   - 线性求解器: {solver_settings['linear_solver_settings']['solver_type'].GetString()}")
        
        print("⚡ 启动分析...")
        analysis = StructuralMechanicsAnalysis(KratosMultiphysics.Model(), parameters)
        analysis.Run()
        
        print("✅ 线弹性分析成功完成!")
        return True
        
    except Exception as e:
        print(f"❌ Kratos分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        os.chdir('..')

if __name__ == "__main__":
    success = test_complete_linear_elastic()
    print(f"\n🎯 完整线弹性测试结果: {'成功' if success else '失败'}")
    
    if success:
        print("\n🎉 恭喜！线弹性分析成功运行")
        print("💡 下一步可以尝试非线性材料分析")
    else:
        print("\n🔍 需要进一步调试分析失败的原因")
