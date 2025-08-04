#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试FPN文件导入功能
"""

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_fpn_parsing():
    """测试FPN文件解析"""
    print("=== 测试FPN文件解析 ===")
    
    try:
        from modules.preprocessor import PreProcessor
        
        # 创建预处理器
        preprocessor = PreProcessor()
        
        # 测试FPN文件路径
        fpn_file = project_root / "test_sample.fpn"
        print(f"FPN文件路径: {fpn_file}")
        print(f"文件存在: {fpn_file.exists()}")
        
        if not fpn_file.exists():
            print("FPN文件不存在，退出测试")
            return False
            
        # 解析FPN文件
        print("\n开始解析FPN文件...")
        preprocessor.load_fpn_file(str(fpn_file))
        
        # 检查解析结果
        if hasattr(preprocessor, 'fpn_data'):
            data = preprocessor.fpn_data
            print(f"\n=== 解析结果 ===")
            print(f"节点数量: {len(data.get('nodes', []))}")
            print(f"单元数量: {len(data.get('elements', []))}")  
            print(f"材料数量: {len(data.get('materials', []))}")
            print(f"约束数量: {len(data.get('constraints', []))}")
            print(f"荷载数量: {len(data.get('loads', []))}")
            
            # 显示详细信息
            nodes = data.get('nodes', [])
            if nodes:
                print(f"\n前3个节点:")
                for i, node in enumerate(nodes[:3]):
                    print(f"  节点{node['id']}: ({node['x']:.1f}, {node['y']:.1f}, {node['z']:.1f})")
                    
            elements = data.get('elements', [])
            if elements:
                print(f"\n前2个单元:")
                for i, elem in enumerate(elements[:2]):
                    print(f"  单元{elem['id']}: 类型={elem['type']}, 节点={elem['nodes']}")
            
            # 检查网格信息
            mesh_info = preprocessor.get_mesh_info()
            print(f"\n=== 网格信息 ===")
            print(f"PyVista节点数: {mesh_info.get('n_points', 0)}")
            print(f"PyVista单元数: {mesh_info.get('n_cells', 0)}")
            print(f"约束数量: {mesh_info.get('constraints_count', 0)}")
            print(f"荷载数量: {mesh_info.get('loads_count', 0)}")
            
            print("\n✅ FPN文件解析成功!")
            return True
            
        else:
            print("❌ 没有找到解析数据")
            return False
            
    except Exception as e:
        print(f"❌ FPN文件解析失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_simple_fpn():
    """测试简单的FPN文件内容"""
    fpn_content = """*VERSION
MIDAS Gen 2022

*NODE
1    0.0    0.0    0.0
2   10.0    0.0    0.0

*ELEMENT  
1   BEAM   1   2

*MATERIAL
1   Steel   200000   0.3

*CONSTRAINT
1   1 1 1 0 0 0

*LOAD
2   FORCE   0.0   0.0   -10.0
"""
    
    # 创建临时FPN文件
    temp_fpn = project_root / "temp_test.fpn" 
    with open(temp_fpn, 'w', encoding='utf-8') as f:
        f.write(fpn_content)
    
    print(f"\n=== 测试简单FPN文件 ===")
    print(f"临时文件: {temp_fpn}")
    
    try:
        from modules.preprocessor import PreProcessor
        preprocessor = PreProcessor()
        preprocessor.load_fpn_file(str(temp_fpn))
        
        if hasattr(preprocessor, 'fpn_data'):
            data = preprocessor.fpn_data
            print(f"简单测试结果:")
            print(f"  节点: {len(data.get('nodes', []))}")
            print(f"  单元: {len(data.get('elements', []))}")
            print(f"  材料: {len(data.get('materials', []))}")
            print(f"  约束: {len(data.get('constraints', []))}")
            print(f"  荷载: {len(data.get('loads', []))}")
            
        # 删除临时文件
        temp_fpn.unlink()
        print("✅ 简单FPN测试成功!")
        return True
        
    except Exception as e:
        print(f"❌ 简单FPN测试失败: {e}")
        if temp_fpn.exists():
            temp_fpn.unlink()
        return False

if __name__ == "__main__":
    print("FPN文件导入功能测试")
    print("=" * 40)
    
    # 测试1: 解析现有FPN文件
    result1 = test_fpn_parsing()
    
    # 测试2: 简单FPN内容
    result2 = test_simple_fpn()
    
    print("\n" + "=" * 40)
    print("测试总结:")
    print(f"  现有FPN文件测试: {'✅ 通过' if result1 else '❌ 失败'}")
    print(f"  简单FPN内容测试: {'✅ 通过' if result2 else '❌ 失败'}")
    
    if result1 and result2:
        print("\n🎉 所有测试通过! FPN导入功能正常工作。")
    else:
        print("\n⚠️  部分测试失败，需要检查代码。")