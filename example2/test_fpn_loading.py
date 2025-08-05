#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FPN文件加载测试脚本
用于诊断FPN文件导入和显示问题
"""

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from example2.modules.preprocessor import PreProcessor

def test_fpn_loading():
    """测试FPN文件加载"""
    print("=" * 60)
    print("FPN文件加载测试")
    print("=" * 60)
    
    # 创建前处理器
    preprocessor = PreProcessor()
    
    # 查找项目中的FPN文件
    fpn_files = list(Path("E:\\DeepCAD").rglob("*.fpn"))
    
    if fpn_files:
        fpn_file = fpn_files[0]
        print(f"🔍 找到FPN文件: {fpn_file}")
        print(f"📁 文件大小: {fpn_file.stat().st_size / 1024 / 1024:.2f} MB")
        
        try:
            # 测试解析
            print("\n🚀 开始解析FPN文件...")
            fpn_data = preprocessor.parse_fpn_file(str(fpn_file))
            
            print(f"\n✅ 解析结果:")
            print(f"   节点数量: {len(fpn_data.get('nodes', []))}")
            print(f"   单元数量: {len(fpn_data.get('elements', []))}")
            print(f"   材料数量: {len(fpn_data.get('materials', set()))}")
            print(f"   分析步数: {len(fpn_data.get('analysis_stages', []))}")
            
            # 显示坐标偏移信息
            if 'coordinate_offset' in fpn_data:
                offset = fpn_data['coordinate_offset']
                print(f"   坐标偏移: X={offset['x_offset']:.2f}, Y={offset['y_offset']:.2f}, Z={offset['z_offset']:.2f}")
            
            # 显示材料信息
            if fpn_data.get('materials'):
                print(f"   材料ID列表: {sorted(list(fpn_data['materials']))}")
                
            # 显示前几个节点的坐标
            nodes = fpn_data.get('nodes', [])
            if nodes:
                print(f"\n📍 前5个节点坐标:")
                for i, node in enumerate(nodes[:5]):
                    print(f"   节点{node['id']}: ({node['x']:.2f}, {node['y']:.2f}, {node['z']:.2f})")
                    
            # 显示前几个单元信息
            elements = fpn_data.get('elements', [])
            if elements:
                print(f"\n🔗 前5个单元信息:")
                for i, element in enumerate(elements[:5]):
                    if isinstance(element, dict):
                        nodes_list = element.get('nodes', [])
                        mat_id = element.get('material_id', 'N/A')
                        print(f"   单元{element.get('id', i+1)}: 材料ID={mat_id}, 节点={nodes_list}")
            
            print(f"\n🎯 测试创建网格...")
            try:
                preprocessor.create_mesh_from_fpn(fpn_data)
                if preprocessor.mesh:
                    print(f"✅ 网格创建成功!")
                    print(f"   网格节点数: {preprocessor.mesh.n_points}")
                    print(f"   网格单元数: {preprocessor.mesh.n_cells}")
                    print(f"   网格边界: {preprocessor.mesh.bounds}")
                    
                    # 检查材料数据
                    if hasattr(preprocessor.mesh, 'cell_data') and 'MaterialID' in preprocessor.mesh.cell_data:
                        import numpy as np
                        material_ids = np.unique(preprocessor.mesh.cell_data['MaterialID'])
                        print(f"   网格材料ID: {sorted(list(material_ids))}")
                    else:
                        print("   ⚠️ 网格中没有材料ID数据")
                else:
                    print("❌ 网格创建失败 - mesh为None")
            except Exception as mesh_e:
                print(f"❌ 网格创建失败: {mesh_e}")
                import traceback
                traceback.print_exc()
                
        except Exception as e:
            print(f"❌ FPN文件解析失败: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("❌ 未找到FPN文件")
        print("请将FPN文件放在项目目录中")
        
        # 创建示例数据测试
        print("\n🔄 测试示例数据...")
        try:
            sample_data = preprocessor.create_sample_fpn_data()
            preprocessor.create_mesh_from_fpn(sample_data)
            if preprocessor.mesh:
                print("✅ 示例数据测试成功!")
            else:
                print("❌ 示例数据测试失败")
        except Exception as sample_e:
            print(f"❌ 示例数据测试失败: {sample_e}")

if __name__ == "__main__":
    test_fpn_loading()