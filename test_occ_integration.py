#!/usr/bin/env python3
"""
测试gmsh OCC集成
验证前后端API连接和基础功能
"""

import requests
import json
import time

# 配置
BASE_URL = "http://localhost:8080/api"

def test_health():
    """测试健康检查"""
    print("🔍 测试健康检查...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 健康检查通过: {data}")
            return True
        else:
            print(f"❌ 健康检查失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 健康检查异常: {e}")
        return False

def test_create_box():
    """测试创建立方体"""
    print("\n📦 测试创建立方体...")
    try:
        payload = {
            "geometryType": "box",
            "parameters": {
                "x": 0,
                "y": 0, 
                "z": 0,
                "dx": 10,
                "dy": 10,
                "dz": 10
            },
            "name": "test_box"
        }
        
        response = requests.post(f"{BASE_URL}/geometry/create", 
                               json=payload,
                               headers={"Content-Type": "application/json"})
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 立方体创建成功: {data}")
            return data.get("geometryTag")
        else:
            print(f"❌ 创建立方体失败: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ 创建立方体异常: {e}")
        return None

def test_create_sphere():
    """测试创建球体"""
    print("\n🌐 测试创建球体...")
    try:
        payload = {
            "geometryType": "sphere",
            "parameters": {
                "x": 15,
                "y": 0,
                "z": 0,
                "r": 5
            },
            "name": "test_sphere"
        }
        
        response = requests.post(f"{BASE_URL}/geometry/create",
                               json=payload,
                               headers={"Content-Type": "application/json"})
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 球体创建成功: {data}")
            return data.get("geometryTag")
        else:
            print(f"❌ 创建球体失败: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ 创建球体异常: {e}")
        return None

def test_boolean_operation(box_tag, sphere_tag):
    """测试布尔运算"""
    if not box_tag or not sphere_tag:
        print("\n⏭️  跳过布尔运算测试（几何体创建失败）")
        return None
        
    print("\n🔀 测试布尔运算...")
    try:
        payload = {
            "operation": "fuse",
            "objectTags": [box_tag],
            "toolTags": [sphere_tag],
            "removeObjectAndTool": True
        }
        
        response = requests.post(f"{BASE_URL}/geometry/boolean",
                               json=payload,
                               headers={"Content-Type": "application/json"})
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 布尔运算成功: {data}")
            return data.get("geometryTags", [])
        else:
            print(f"❌ 布尔运算失败: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ 布尔运算异常: {e}")
        return None

def test_geometry_info(tags):
    """测试获取几何体信息"""
    if not tags:
        print("\n⏭️  跳过几何体信息测试（无有效几何体）")
        return
        
    print("\n📊 测试获取几何体信息...")
    try:
        payload = {"tags": tags if isinstance(tags, list) else [tags]}
        
        response = requests.post(f"{BASE_URL}/geometry/info",
                               json=payload,
                               headers={"Content-Type": "application/json"})
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 几何体信息获取成功: {data}")
        else:
            print(f"❌ 获取几何体信息失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ 获取几何体信息异常: {e}")

def test_clear_all():
    """测试清空所有几何体"""
    print("\n🧹 测试清空所有几何体...")
    try:
        response = requests.delete(f"{BASE_URL}/geometry/clear")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 清空几何体成功: {data}")
        else:
            print(f"❌ 清空几何体失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ 清空几何体异常: {e}")

def main():
    """主测试函数"""
    print("🚀 开始gmsh OCC集成测试")
    print("=" * 50)
    
    # 测试健康检查
    if not test_health():
        print("❌ 后端服务不可用，终止测试")
        return
    
    # 测试创建几何体
    box_tag = test_create_box()
    sphere_tag = test_create_sphere()
    
    # 测试布尔运算
    result_tags = test_boolean_operation(box_tag, sphere_tag)
    
    # 测试获取几何体信息
    if result_tags:
        test_geometry_info(result_tags)
    elif box_tag:
        test_geometry_info(box_tag)
    
    # 测试清空
    test_clear_all()
    
    print("\n" + "=" * 50)
    print("🎯 gmsh OCC集成测试完成")

if __name__ == "__main__":
    main()