"""
测试支护结构API
"""

import asyncio
import json
from gateway.modules.geometry.support_structure_service import (
    SupportStructureGeometryRequest,
    support_geometry_service
)

async def test_support_structure_api():
    """测试支护结构几何生成API"""
    
    print("=" * 60)
    print("支护结构API测试")
    print("=" * 60)
    
    # 测试1: 地连墙
    print("\n测试1: 地连墙几何生成")
    try:
        request = SupportStructureGeometryRequest(
            structure_type="diaphragm_wall",
            name="测试地连墙-1",
            parameters={
                "thickness": 1.2,
                "depth": 25,
                "length": 50,
                "concreteGrade": "C30",
                "reinforcement": "HRB400",
                "crownBeamWidth": 0.8,
                "crownBeamHeight": 1.0
            }
        )
        
        result = support_geometry_service.generate_support_structure_geometry(request)
        print(f"[OK] 地连墙生成成功:")
        print(f"   ID: {result.id}")
        print(f"   体积: {result.volume:.2f} m3")
        print(f"   表面积: {result.surface_area:.2f} m2")
        print(f"   顶点数量: {len(result.vertices)}")
        print(f"   面数量: {len(result.faces)}")
        
    except Exception as e:
        print(f"[ERROR] 地连墙生成失败: {str(e)}")
    
    # 测试2: 排桩系统
    print("\n测试2: 排桩系统几何生成")
    try:
        request = SupportStructureGeometryRequest(
            structure_type="pile_system",
            name="测试排桩-1",
            parameters={
                "diameter": 1.0,
                "depth": 20,
                "spacing": 1.5,
                "pile_count": 8,
                "pileType": "bored_cast_in_place",
                "concreteGrade": "C30",
                "reinforcement": "HRB400"
            }
        )
        
        result = support_geometry_service.generate_support_structure_geometry(request)
        print(f"[OK] 排桩系统生成成功:")
        print(f"   ID: {result.id}")
        print(f"   体积: {result.volume:.2f} m3")
        print(f"   表面积: {result.surface_area:.2f} m2")
        print(f"   顶点数量: {len(result.vertices)}")
        
    except Exception as e:
        print(f"[ERROR] 排桩系统生成失败: {str(e)}")
    
    # 测试3: 锚杆系统
    print("\n测试3: 锚杆系统几何生成")
    try:
        request = SupportStructureGeometryRequest(
            structure_type="anchor_system",
            name="测试锚杆-1",
            parameters={
                "angle": 15,
                "length": 12,
                "diameter": 32,
                "prestress": 300,
                "row_count": 2,
                "vertical_spacing": 3.0,
                "horizontal_spacing": 2.0,
                "anchor_count_per_row": 5,
                "waleBeamWidth": 0.3,
                "waleBeamHeight": 0.6
            }
        )
        
        result = support_geometry_service.generate_support_structure_geometry(request)
        print(f"[OK] 锚杆系统生成成功:")
        print(f"   ID: {result.id}")
        print(f"   体积: {result.volume:.2f} m3")
        print(f"   表面积: {result.surface_area:.2f} m2")
        print(f"   顶点数量: {len(result.vertices)}")
        
    except Exception as e:
        print(f"[ERROR] 锚杆系统生成失败: {str(e)}")
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_support_structure_api())