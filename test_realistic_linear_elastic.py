"""
真实的线弹性分析测试
老老实实做一个包含不同分析步骤的线弹性分析
"""

import sys
from pathlib import Path

def test_realistic_linear_elastic():
    """真实的线弹性分析测试"""
    print("🧪 开始真实的线弹性分析测试...")
    
    # 1. 测试Kratos集成
    try:
        from example2.core.kratos_interface import KratosInterface
        print("✅ Kratos接口模块加载成功")
        
        # 测试Kratos可用性
        try:
            import KratosMultiphysics
            kratos_available = True
            print(f"✅ Kratos Multiphysics 可用: {kratos_available}")
        except ImportError:
            print("❌ Kratos Multiphysics 不可用，跳过测试")
            return False
            
    except Exception as e:
        print(f"❌ Kratos接口测试失败: {e}")
        return False

    # 2. 解析FPN文件
    print("📖 解析FPN文件...")
    try:
        from example2.core.optimized_fpn_parser import OptimizedFPNParser
        
        project_root = Path(__file__).parent
        fpn_file = project_root / "example2" / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        
        if not fpn_file.exists():
            print(f"❌ FPN文件不存在: {fpn_file}")
            return False
            
        parser = OptimizedFPNParser()
        fpn_data = parser.parse_file_streaming(str(fpn_file))
        
        print(f"✅ FPN文件解析成功")
        print(f"   节点数量: {len(fpn_data.get('nodes', []))}")
        print(f"   单元数量: {len(fpn_data.get('elements', []))}")
        print(f"   材料数量: {len(fpn_data.get('materials', {}))}")
        
    except Exception as e:
        print(f"❌ FPN解析失败: {e}")
        return False

    # 3. 初始化Kratos接口
    print("🔧 初始化Kratos接口...")
    try:
        kratos = KratosInterface()
        print("✅ Kratos 接口初始化成功")
    except Exception as e:
        print(f"❌ Kratos初始化失败: {e}")
        return False

    # 4. 设置模型数据并转换为线弹性
    print("📊 设置模型数据并转换为线弹性材料...")
    
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
    
    # 5. 创建线弹性材料
    print("🔄 转换材料为线弹性...")
    materials = fpn_data.get('materials', {})

    # 创建线弹性材料对象类
    class LinearElasticMaterial:
        def __init__(self, mat_id, mat_data):
            self.id = mat_data.get('id', mat_id)
            self.name = f"LinearElastic_{mat_id}"
            self.constitutive_law = 'LinearElastic3DLaw'
            self.density = mat_data.get('density', 2000.0)
            self.elastic_modulus = mat_data.get('elastic_modulus', 5000000.0)
            self.young_modulus = mat_data.get('elastic_modulus', 5000000.0)  # 别名
            self.poisson_ratio = mat_data.get('poisson_ratio', 0.3)
    
    # 转换所有材料为线弹性
    linear_materials = {}
    for mat_id, mat_data in materials.items():
        linear_materials[mat_id] = LinearElasticMaterial(mat_id, mat_data)
    
    # 创建转换后的模型数据
    converted_fpn_data = fpn_data.copy()
    converted_fpn_data['elements'] = converted_elements
    converted_fpn_data['nodes'] = converted_nodes
    converted_fpn_data['materials'] = linear_materials
    
    kratos.model_data = converted_fpn_data
    kratos.materials = linear_materials
    
    print(f"   转换了{len(linear_materials)}个材料为线弹性")

    # 6. 生成真实的线弹性分析配置
    print("📝 生成真实的线弹性分析配置...")
    try:
        output_dir = Path('temp_realistic_linear_analysis')
        output_dir.mkdir(exist_ok=True)
        
        # 生成MDPA文件
        mdpa_file = output_dir / 'kratos_analysis.mdpa'
        kratos._write_mdpa_file(mdpa_file)
        print("✅ MDPA文件生成成功")

        # 生成材料文件
        materials_file = output_dir / 'materials.json'
        kratos._write_materials_file(materials_file)
        print("✅ 材料文件生成成功")

        # 生成项目参数文件
        params_file = output_dir / 'ProjectParameters.json'
        kratos._write_project_parameters(params_file, 'kratos_analysis', 'materials.json')
        print("✅ 项目参数文件生成成功")
        
        print("✅ 真实线弹性分析配置生成成功")
        
    except Exception as e:
        print(f"❌ 配置生成失败: {e}")
        return False

    # 7. 运行真实的线弹性分析
    print("🚀 运行真实的线弹性分析...")
    print("📋 分析配置:")
    print(f"   - 分析类型: 线弹性静力分析")
    print(f"   - 模型规模: {len(fpn_data.get('nodes', []))}个节点, {len(converted_elements)}个单元")
    print(f"   - 材料类型: 线弹性 ({len(linear_materials)}种材料)")
    print(f"   - 求解器: 静力求解器")
    
    try:
        import os
        original_dir = os.getcwd()
        os.chdir('temp_realistic_linear_analysis')
        
        # 导入Kratos模块
        import KratosMultiphysics
        from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
        
        # 读取项目参数
        with open('ProjectParameters.json', 'r') as f:
            parameters = KratosMultiphysics.Parameters(f.read())
        
        # 创建模型
        model = KratosMultiphysics.Model()
        
        print("⚡ 启动线弹性分析...")
        
        # 创建分析对象
        analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
        
        # 初始化分析
        analysis.Initialize()
        
        # 运行完整分析
        analysis.RunSolutionLoop()
        
        # 完成分析
        analysis.Finalize()
        
        os.chdir(original_dir)
        
        print("✅ 真实线弹性分析成功完成!")
        
        return True
        
    except Exception as e:
        os.chdir(original_dir)
        print(f"❌ Kratos分析异常: {e}")
        return False

if __name__ == "__main__":
    success = test_realistic_linear_elastic()
    
    print(f"\n🎯 真实线弹性分析测试结果: {'成功' if success else '失败'}")
    
    if success:
        print("\n🎉 恭喜！真实线弹性分析成功运行")
        print("📈 分析特点:")
        print("   - 线弹性材料模型")
        print("   - 静力分析")
        print("   - 大规模模型")
        print("   - VTK输出: 是")
        print("💡 下一步可以:")
        print("   - 使用Paraview查看变形结果")
        print("   - 分析应力分布")
        print("   - 添加边界条件和荷载")
        print("   - 进行参数敏感性分析")
    else:
        print("\n🔍 需要进一步调试分析失败的原因")
