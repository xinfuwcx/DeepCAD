"""
简化版材料导入脚本
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8001"

# 从图片提取的材料数据
materials = [
    {"name": "杂填土_1-0-0", "E": 5.32, "v": 0.3, "density": 1834, "c": 0, "phi": 15},
    {"name": "细砂_2-0-0", "E": 15, "v": 0.3, "density": 2038, "c": 0, "phi": 20},
    {"name": "粉质粘土_3-0-0", "E": 5, "v": 0.3, "density": 1988, "c": 26, "phi": 9},
    {"name": "粉质粘土_4-0-0", "E": 5, "v": 0.3, "density": 1947, "c": 24, "phi": 10},
    {"name": "粉质粘土_5-0-0", "E": 5, "v": 0.3, "density": 2121, "c": 22, "phi": 13},
    {"name": "卵石_6-0-0", "E": 40, "v": 0.3, "density": 1988, "c": 0, "phi": 21},
    {"name": "粉质粘土_7-0-0", "E": 8, "v": 0.3, "density": 2121, "c": 14, "phi": 25},
    {"name": "粘土_7-2-0", "E": 5, "v": 0.3, "density": 2007, "c": 36, "phi": 9},
    {"name": "粉质粘土_7-0-0_2", "E": 9, "v": 0.3, "density": 2111, "c": 20, "phi": 16},
    {"name": "细砂_8-0-0", "E": 22, "v": 0.3, "density": 1988, "c": 0, "phi": 21},
    {"name": "重粉质粘土_8-1-0", "E": 9, "v": 0.3, "density": 2060, "c": 23, "phi": 14},
    {"name": "细砂_9-0-0", "E": 22, "v": 0.3, "density": 1988, "c": 0, "phi": 23},
    {"name": "卵石_10-0-0", "E": 40, "v": 0.3, "density": 2141, "c": 0, "phi": 35},
    {"name": "粉质粘土_11-0-0", "E": 12, "v": 0.3, "density": 2060, "c": 24, "phi": 17},
    {"name": "细砂_12-0-0", "E": 20, "v": 0.3, "density": 2070, "c": 0, "phi": 26}
]

def add_material(mat):
    material_data = {
        "name": mat["name"],
        "constitutive_model": "MohrCoulomb",
        "properties": {
            "YOUNG_MODULUS": mat["E"],
            "POISSON_RATIO": mat["v"],
            "DENSITY": mat["density"],
            "COHESION": mat["c"],
            "FRICTION_ANGLE": mat["phi"]
        },
        "source": "地质勘察报告",
        "description": f"弹性模量: {mat['E']}MPa, 密度: {mat['density']}kg/m3"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/materials/add", json=material_data)
        if response.status_code == 200:
            print(f"成功添加: {mat['name']}")
            return True
        else:
            print(f"失败: {mat['name']} - {response.status_code}")
            return False
    except Exception as e:
        print(f"错误: {mat['name']} - {e}")
        return False

if __name__ == "__main__":
    print("开始导入材料...")
    
    success = 0
    for mat in materials:
        if add_material(mat):
            success += 1
    
    print(f"导入完成: {success}/{len(materials)} 个材料成功")
    
    # 检查结果
    try:
        response = requests.get(f"{BASE_URL}/api/materials/stats")
        if response.status_code == 200:
            stats = response.json()
            print(f"当前材料库: {stats['total_materials']} 个材料")
    except:
        pass