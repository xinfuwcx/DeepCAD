#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接测试FPN到Kratos的转换和文件生成
"""

import sys
import os
import json
from pathlib import Path

# 添加路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_kratos_conversion():
    """直接测试Kratos转换"""
    print("=" * 60)
    print("测试FPN到Kratos转换")
    print("=" * 60)
    
    try:
        # 1. 导入必要模块
        from modules.preprocessor import PreProcessor
        from core.kratos_interface import KratosInterface
        
        print("✅ 模块导入成功")
        
        # 2. 加载FPN数据
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        if not fpn_file.exists():
            print(f"❌ FPN文件不存在: {fpn_file}")
            return False
            
        preprocessor = PreProcessor()
        fpn_data = preprocessor.load_fpn_file(str(fpn_file), force_load=True)
        
        if not fpn_data:
            print("❌ FPN数据加载失败")
            return False
            
        print(f"✅ FPN数据加载成功:")
        print(f"  节点数: {len(fpn_data.get('nodes', []))}")
        print(f"  单元数: {len(fpn_data.get('elements', []))}")
        print(f"  材料数: {len(fpn_data.get('materials', []))}")
        
        # 3. 创建Kratos接口
        kratos_interface = KratosInterface()
        print("✅ Kratos接口创建成功")
        
        # 4. 转换数据
        success = kratos_interface.setup_model(fpn_data)
        if not success:
            print("❌ 模型设置失败")
            return False
            
        print("✅ 模型设置成功")
        
        # 5. 检查转换结果
        model_data = kratos_interface.model_data
        print(f"转换后数据:")
        print(f"  Kratos节点数: {len(model_data.get('nodes', []))}")
        print(f"  Kratos单元数: {len(model_data.get('elements', []))}")
        print(f"  材料数: {len(model_data.get('materials', []))}")
        
        # 6. 生成文件
        output_dir = project_root / "temp_kratos_test"
        output_dir.mkdir(exist_ok=True)
        
        print(f"\n生成Kratos文件到: {output_dir}")
        
        # 直接调用文件写入方法
        try:
            # MDPA文件
            mdpa_file = output_dir / "model.mdpa"
            kratos_interface._write_mdpa_file(mdpa_file)
            print(f"✅ MDPA文件: {mdpa_file.stat().st_size} bytes")
            
            # 材料文件
            materials_file = output_dir / "materials.json"
            kratos_interface._write_materials_file(materials_file)
            print(f"✅ 材料文件: {materials_file.stat().st_size} bytes")
            
            # 项目参数文件
            params_file = output_dir / "ProjectParameters.json"
            kratos_interface._write_project_parameters(params_file, "model", "materials.json")
            print(f"✅ 参数文件: {params_file.stat().st_size} bytes")
            
            # 检查文件内容
            print(f"\n检查生成的文件内容:")
            
            # 检查MDPA文件
            with open(mdpa_file, 'r') as f:
                mdpa_content = f.read()
                node_count = mdpa_content.count('Begin Nodes')
                element_count = mdpa_content.count('Begin Elements')
                print(f"  MDPA: {node_count} 节点块, {element_count} 单元块")
            
            # 检查材料文件
            with open(materials_file, 'r') as f:
                materials_data = json.load(f)
                print(f"  材料: {len(materials_data.get('properties', []))} 个材料定义")
            
            # 检查参数文件
            with open(params_file, 'r') as f:
                params_data = json.load(f)
                solver_type = params_data.get('solver_settings', {}).get('solver_type', 'unknown')
                print(f"  参数: 求解器类型 = {solver_type}")
            
            print(f"\n🎉 文件生成成功！可以手动运行Kratos:")
            print(f"  cd {output_dir}")
            print(f"  python -c \"import KratosMultiphysics; exec(open('MainKratos.py').read())\"")
            
            return True
            
        except Exception as e:
            print(f"❌ 文件生成失败: {e}")
            import traceback
            traceback.print_exc()
            return False
            
    except Exception as e:
        print(f"❌ 转换测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def analyze_fpn_structure():
    """分析FPN数据结构"""
    print("\n" + "=" * 60)
    print("分析FPN数据结构")
    print("=" * 60)
    
    try:
        from modules.preprocessor import PreProcessor
        
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        preprocessor = PreProcessor()
        fpn_data = preprocessor.load_fpn_file(str(fpn_file), force_load=True)
        
        if not fpn_data:
            print("❌ 无法加载FPN数据")
            return
            
        print("FPN数据结构分析:")
        for key, value in fpn_data.items():
            if isinstance(value, (list, dict)):
                count = len(value)
                print(f"  {key}: {type(value).__name__} ({count} 项)")
                
                # 显示前几个项目的结构
                if count > 0:
                    if isinstance(value, list) and len(value) > 0:
                        sample = value[0]
                        if isinstance(sample, dict):
                            print(f"    示例键: {list(sample.keys())}")
                    elif isinstance(value, dict):
                        sample_keys = list(value.keys())[:5]
                        print(f"    前5个键: {sample_keys}")
            else:
                print(f"  {key}: {type(value).__name__} = {value}")
                
    except Exception as e:
        print(f"❌ 分析失败: {e}")

if __name__ == "__main__":
    # 分析FPN结构
    analyze_fpn_structure()
    
    # 测试转换
    success = test_kratos_conversion()
    
    if success:
        print("\n✅ Kratos转换测试成功")
    else:
        print("\n❌ Kratos转换测试失败")
