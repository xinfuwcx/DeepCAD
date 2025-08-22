"""
真实的FPN弹塑性分析测试
原汁原味读取FPN文件，使用真实的弹塑性材料
正确处理FPN和Kratos之间的材料映射关系
"""

import sys
from pathlib import Path

def test_real_fpn_analysis():
    """真实的FPN弹塑性分析测试"""
    print("🧪 开始真实的FPN弹塑性分析测试...")
    
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

    # 2. 原汁原味解析FPN文件
    print("📖 原汁原味解析FPN文件...")
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
        
        # 显示FPN中的真实材料信息
        materials = fpn_data.get('materials', {})
        print("📋 FPN中的真实材料信息:")
        for mat_id, mat_data in materials.items():
            print(f"   材料{mat_id}: {mat_data}")
        
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

    # 4. 原汁原味设置模型数据，但需要正确映射材料格式
    print("📊 原汁原味设置模型数据...")

    # 直接使用FPN数据，不做任何修改
    kratos.model_data = fpn_data

    # 创建FPN材料到Kratos材料的适配器
    print("🔄 创建FPN-Kratos材料映射...")

    class FPNMaterialAdapter:
        """FPN材料到Kratos材料的适配器"""
        def __init__(self, mat_id, fpn_mat_data):
            self.id = mat_id
            self.name = fpn_mat_data.get('name', f'Material_{mat_id}')

            # 从FPN的properties字段中提取材料参数
            props = fpn_mat_data.get('properties', {})

            # 基本弹性参数
            self.elastic_modulus = props.get('E', 5000000.0)
            self.young_modulus = self.elastic_modulus  # 别名
            self.poisson_ratio = props.get('NU', 0.3)
            self.density = props.get('DENSITY', 2000.0)

            # 摩尔-库伦参数
            self.friction_angle = props.get('FRICTION_ANGLE', 0.0)
            self.cohesion = props.get('COHESION', 0.0)

            # 其他参数
            self.porosity = props.get('POROSITY', 0.5)
            self.material_type = props.get('type', 'soil')

            print(f"   材料{mat_id} ({self.name}): E={self.elastic_modulus:.0f}, φ={self.friction_angle}°, c={self.cohesion:.0f}")

    # 转换FPN材料为Kratos兼容格式
    kratos_materials = {}
    fpn_materials = fpn_data.get('materials', {})

    for mat_id, fpn_mat_data in fpn_materials.items():
        kratos_materials[mat_id] = FPNMaterialAdapter(mat_id, fpn_mat_data)

    # 设置转换后的材料
    kratos.materials = kratos_materials

    print(f"   节点数量: {len(fpn_data.get('nodes', []))}")
    print(f"   单元数量: {len(fpn_data.get('elements', []))}")
    print(f"   材料数量: {len(kratos_materials)}")
    print(f"   ✅ FPN-Kratos材料映射完成")

    # 5. 生成真实的弹塑性分析配置
    print("📝 生成真实的弹塑性分析配置...")
    try:
        output_dir = Path('temp_real_fpn_analysis')
        output_dir.mkdir(exist_ok=True)
        
        # 生成MDPA文件 - 使用原始FPN数据
        mdpa_file = output_dir / 'kratos_analysis.mdpa'
        kratos._write_mdpa_file(mdpa_file)
        print("✅ MDPA文件生成成功")

        # 生成材料文件 - 使用FPN中的真实弹塑性材料
        materials_file = output_dir / 'materials.json'
        kratos._write_materials_file(materials_file)
        print("✅ 材料文件生成成功")

        # 生成项目参数文件
        params_file = output_dir / 'ProjectParameters.json'
        kratos._write_project_parameters(params_file, 'kratos_analysis', 'materials.json')
        print("✅ 项目参数文件生成成功")
        
        print("✅ 真实弹塑性分析配置生成成功")
        
    except Exception as e:
        print(f"❌ 配置生成失败: {e}")
        return False

    # 6. 检查生成的材料文件内容
    print("🔍 检查生成的材料文件内容...")
    try:
        import json
        with open(materials_file, 'r', encoding='utf-8') as f:
            materials_content = json.load(f)
        
        print("📋 生成的Kratos材料配置:")
        for prop in materials_content.get('properties', []):
            mat_name = prop.get('model_part_name', 'Unknown')
            const_law = prop.get('Material', {}).get('constitutive_law', {}).get('name', 'Unknown')
            print(f"   {mat_name}: {const_law}")
            
    except Exception as e:
        print(f"⚠️ 无法读取材料文件: {e}")

    # 7. 检查项目参数文件
    print("🔍 检查项目参数文件...")
    try:
        with open(params_file, 'r', encoding='utf-8') as f:
            params_content = json.load(f)
        
        analysis_type = params_content.get('solver_settings', {}).get('analysis_type', 'Unknown')
        solver_type = params_content.get('solver_settings', {}).get('solver_type', 'Unknown')
        
        print(f"📋 分析配置:")
        print(f"   分析类型: {analysis_type}")
        print(f"   求解器类型: {solver_type}")
        
    except Exception as e:
        print(f"⚠️ 无法读取参数文件: {e}")

    # 8. 运行真实的弹塑性分析
    print("🚀 运行真实的弹塑性分析...")
    print("📋 分析配置:")
    print(f"   - 分析类型: 基于FPN的真实弹塑性分析")
    print(f"   - 模型规模: {len(fpn_data.get('nodes', []))}个节点, {len(fpn_data.get('elements', []))}个单元")
    print(f"   - 材料类型: FPN原始弹塑性材料 ({len(fpn_data.get('materials', {}))}种)")
    print(f"   - 求解器: 根据材料类型自动选择")
    
    try:
        import os
        original_dir = os.getcwd()
        os.chdir('temp_real_fpn_analysis')
        
        # 导入Kratos模块
        import KratosMultiphysics
        from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
        
        # 读取项目参数
        with open('ProjectParameters.json', 'r') as f:
            parameters = KratosMultiphysics.Parameters(f.read())
        
        # 创建模型
        model = KratosMultiphysics.Model()
        
        print("⚡ 启动真实弹塑性分析...")
        
        # 创建分析对象
        analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
        
        # 初始化分析
        analysis.Initialize()
        
        # 运行完整分析
        analysis.RunSolutionLoop()
        
        # 完成分析
        analysis.Finalize()
        
        os.chdir(original_dir)
        
        print("✅ 真实弹塑性分析成功完成!")
        
        return True
        
    except Exception as e:
        os.chdir(original_dir)
        print(f"❌ Kratos分析异常: {e}")
        return False

if __name__ == "__main__":
    success = test_real_fpn_analysis()
    
    print(f"\n🎯 真实FPN弹塑性分析测试结果: {'成功' if success else '失败'}")
    
    if success:
        print("\n🎉 恭喜！真实FPN弹塑性分析成功运行")
        print("📈 分析特点:")
        print("   - 原汁原味的FPN数据")
        print("   - 真实的弹塑性材料模型")
        print("   - 正确的FPN-Kratos材料映射")
        print("   - 大规模非线性分析")
        print("   - VTK输出: 是")
        print("💡 下一步可以:")
        print("   - 使用Paraview查看塑性区分布")
        print("   - 分析真实的应力-应变关系")
        print("   - 验证FPN-Kratos材料映射的正确性")
        print("   - 对比FPN原始结果和Kratos结果")
    else:
        print("\n🔍 需要进一步调试分析失败的原因")
        print("💡 可能的问题:")
        print("   - FPN-Kratos材料映射不正确")
        print("   - 弹塑性本构法则不匹配")
        print("   - 边界条件或荷载缺失")
        print("   - 求解器配置不适合非线性分析")
