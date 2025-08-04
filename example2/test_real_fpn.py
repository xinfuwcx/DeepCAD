#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试真实的MIDAS GTS 2022 FPN文件解析
"""

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_real_fpn():
    """测试真实FPN文件解析"""
    print("=== 测试真实MIDAS GTS 2022 FPN文件解析 ===")
    
    try:
        from modules.preprocessor import PreProcessor
        
        # 创建预处理器
        preprocessor = PreProcessor()
        
        # 真实FPN文件路径
        fpn_file = project_root / "data" / "基坑fpn.fpn"
        print(f"FPN文件路径: {fpn_file}")
        print(f"文件存在: {fpn_file.exists()}")
        
        if not fpn_file.exists():
            print("❌ 真实FPN文件不存在")
            return False
            
        # 解析FPN文件
        print("\n开始解析真实FPN文件...")
        preprocessor.load_fpn_file(str(fpn_file))
        
        # 检查解析结果
        if hasattr(preprocessor, 'fpn_data'):
            data = preprocessor.fpn_data
            print(f"\n=== 解析结果统计 ===")
            print(f"节点数量: {len(data.get('nodes', []))}")
            print(f"单元数量: {len(data.get('elements', []))}")
            print(f"材料数量: {len(data.get('materials', set()))}")
            print(f"材料类型: {sorted(list(data.get('materials', set())))}")
            
            # 检查文件信息
            file_info = data.get('file_info', {})
            if file_info:
                print(f"\n=== 文件信息 ===")
                print(f"版本: {file_info.get('version', 'N/A')}")
                print(f"单位: {file_info.get('units', 'N/A')}")
            
            # 检查坐标偏移
            coord_offset = data.get('coordinate_offset', {})
            if coord_offset:
                print(f"\n=== 坐标偏移信息 ===")
                print(f"X偏移: {coord_offset.get('x_offset', 0):.2f}")
                print(f"Y偏移: {coord_offset.get('y_offset', 0):.2f}")
                print(f"Z偏移: {coord_offset.get('z_offset', 0):.2f}")
            
            # 显示节点坐标范围（偏移后）
            nodes = data.get('nodes', [])
            if nodes:
                x_coords = [node['x'] for node in nodes]
                y_coords = [node['y'] for node in nodes]
                z_coords = [node['z'] for node in nodes]
                
                print(f"\n=== 工程坐标范围（偏移后）===")
                print(f"X: {min(x_coords):.2f} ~ {max(x_coords):.2f}")
                print(f"Y: {min(y_coords):.2f} ~ {max(y_coords):.2f}")
                print(f"Z: {min(z_coords):.2f} ~ {max(z_coords):.2f}")
            
            # 检查网格信息
            mesh_info = preprocessor.get_mesh_info()
            print(f"\n=== PyVista网格信息 ===")
            print(f"PyVista节点数: {mesh_info.get('n_points', 0)}")
            print(f"PyVista单元数: {mesh_info.get('n_cells', 0)}")
            print(f"约束数量: {mesh_info.get('constraints_count', 0)}")
            print(f"荷载数量: {mesh_info.get('loads_count', 0)}")
            print(f"材料种类: {len(preprocessor.materials)}")
            
            # 检查网格
            if preprocessor.mesh:
                print(f"\n=== 网格详细信息 ===")
                print(f"网格类型: {type(preprocessor.mesh).__name__}")
                print(f"网格边界: {preprocessor.mesh.bounds}")
                if hasattr(preprocessor.mesh, 'cell_data'):
                    print(f"单元数据字段: {list(preprocessor.mesh.cell_data.keys())}")
                    
            print("\n✅ 真实FPN文件解析成功!")
            return True
            
        else:
            print("❌ 没有找到解析数据")
            return False
            
    except Exception as e:
        print(f"❌ 真实FPN文件解析失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("真实MIDAS GTS 2022 FPN文件解析测试")
    print("=" * 50)
    
    result = test_real_fpn()
    
    print("\n" + "=" * 50)
    if result:
        print("🎉 测试成功! 真实FPN文件解析功能正常工作。")
        print("现在可以在Example2应用程序中导入真实的基坑FPN文件了！")
    else:
        print("⚠️  测试失败，需要检查解析器代码。")