"""
测试没有type字段的材料添加
"""
import requests

BASE_URL = "http://127.0.0.1:8001"

def test_add_material_no_type():
    """测试添加不包含type字段的材料"""
    material_data = {
        "name": "测试材料_无类型",
        "constitutive_model": "MohrCoulomb",
        "properties": {
            "YOUNG_MODULUS": 30,
            "POISSON_RATIO": 0.3,
            "DENSITY": 2000,
            "COHESION": 15,
            "FRICTION_ANGLE": 20
        },
        "source": "测试",
        "description": "测试移除type字段后的材料添加功能"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/materials/add", json=material_data)
        if response.status_code == 200:
            print("✓ 成功添加无type字段的材料")
            result = response.json()
            print(f"响应: {result}")
            return True
        else:
            print(f"✗ 添加失败: {response.status_code}")
            print(f"错误: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 请求失败: {e}")
        return False

def test_get_stats():
    """测试获取统计信息"""
    try:
        response = requests.get(f"{BASE_URL}/api/materials/stats")
        if response.status_code == 200:
            print("✓ 统计信息获取成功")
            stats = response.json()
            print(f"材料总数: {stats['total_materials']}")
            print(f"类型分布: {stats['type_distribution']}")
            return True
        else:
            print(f"✗ 统计信息获取失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ 统计信息请求失败: {e}")
        return False

if __name__ == "__main__":
    print("测试无type字段的材料系统...")
    print()
    
    print("1. 测试添加材料:")
    test_add_material_no_type()
    print()
    
    print("2. 测试统计信息:")
    test_get_stats()
    print()
    
    print("测试完成!")