"""
从图片中的材料参数表格导入数据到系统材料库
"""
import requests
import json

# 后端API基础URL
BASE_URL = "http://127.0.0.1:8001"

# 从图片中提取的材料参数数据
materials_data = [
    {
        "序号": 1,
        "土层名称": "杂填土",
        "地层编号": "1-0-0",
        "弹性模量": 5.32,  # MPa
        "泊松比": 0.3,
        "容重": 18,      # kN/m³
        "粘聚力": 0,     # kPa
        "摩擦角": 15     # 度
    },
    {
        "序号": 2,
        "土层名称": "细砂",
        "地层编号": "2-0-0",
        "弹性模量": 15,
        "泊松比": 0.3,
        "容重": 20,
        "粘聚力": 0,
        "摩擦角": 20
    },
    {
        "序号": 3,
        "土层名称": "粉质粘土",
        "地层编号": "3-0-0",
        "弹性模量": 5,
        "泊松比": 0.3,
        "容重": 19.5,
        "粘聚力": 26,
        "摩擦角": 9
    },
    {
        "序号": 4,
        "土层名称": "粉质粘土",
        "地层编号": "4-0-0",
        "弹性模量": 5,
        "泊松比": 0.3,
        "容重": 19.1,
        "粘聚力": 24,
        "摩擦角": 10
    },
    {
        "序号": 5,
        "土层名称": "粉质粘土",
        "地层编号": "5-0-0",
        "弹性模量": 5,
        "泊松比": 0.3,
        "容重": 20.8,
        "粘聚力": 22,
        "摩擦角": 13
    },
    {
        "序号": 6,
        "土层名称": "卵石",
        "地层编号": "6-0-0",
        "弹性模量": 40,
        "泊松比": 0.3,
        "容重": 19.5,
        "粘聚力": 0,
        "摩擦角": 21
    },
    {
        "序号": 7,
        "土层名称": "粉质粘土",
        "地层编号": "7-0-0",
        "弹性模量": 8,
        "泊松比": 0.3,
        "容重": 20.8,
        "粘聚力": 14,
        "摩擦角": 25
    },
    {
        "序号": 8,
        "土层名称": "粘土",
        "地层编号": "7-2-0",
        "弹性模量": 5,
        "泊松比": 0.3,
        "容重": 19.7,
        "粘聚力": 36,
        "摩擦角": 9
    },
    {
        "序号": 9,
        "土层名称": "粉质粘土",
        "地层编号": "7-0-0",
        "弹性模量": 9,
        "泊松比": 0.3,
        "容重": 20.7,
        "粘聚力": 20,
        "摩擦角": 16
    },
    {
        "序号": 10,
        "土层名称": "细砂",
        "地层编号": "8-0-0",
        "弹性模量": 22,
        "泊松比": 0.3,
        "容重": 19.5,
        "粘聚力": 0,
        "摩擦角": 21
    },
    {
        "序号": 11,
        "土层名称": "重粉质粘土",
        "地层编号": "8-1-0",
        "弹性模量": 9,
        "泊松比": 0.3,
        "容重": 20.2,
        "粘聚力": 23,
        "摩擦角": 14
    },
    {
        "序号": 12,
        "土层名称": "细砂",
        "地层编号": "9-0-0",
        "弹性模量": 22,
        "泊松比": 0.3,
        "容重": 19.5,
        "粘聚力": 0,
        "摩擦角": 23
    },
    {
        "序号": 13,
        "土层名称": "卵石",
        "地层编号": "10-0-0",
        "弹性模量": 40,
        "泊松比": 0.3,
        "容重": 21,
        "粘聚力": 0,
        "摩擦角": 35
    },
    {
        "序号": 14,
        "土层名称": "粉质粘土",
        "地层编号": "11-0-0",
        "弹性模量": 12,
        "泊松比": 0.3,
        "容重": 20.2,
        "粘聚力": 24,
        "摩擦角": 17
    },
    {
        "序号": 15,
        "土层名称": "细砂",
        "地层编号": "12-0-0",
        "弹性模量": 20,
        "泊松比": 0.3,
        "容重": 20.3,
        "粘聚力": 0,
        "摩擦角": 26
    }
]

def convert_to_material_format(material_data):
    """
    将材料数据转换为系统所需的格式
    """
    # 容重 kN/m³ 转换为密度 kg/m³ (近似: ρ = γ / 9.81 * 1000)
    density = material_data["容重"] / 9.81 * 1000
    
    # 弹性模量 MPa 保持不变
    young_modulus = material_data["弹性模量"]
    
    # 生成唯一的材料名称
    name = f"{material_data['土层名称']}_{material_data['地层编号']}"
    
    return {
        "name": name,
        "material_type": "soil",
        "constitutive_model": "MohrCoulomb",
        "properties": {
            "YOUNG_MODULUS": young_modulus,
            "POISSON_RATIO": material_data["泊松比"],
            "DENSITY": density,
            "COHESION": material_data["粘聚力"],
            "FRICTION_ANGLE": material_data["摩擦角"],
        },
        "source": "项目地质勘察报告",
        "description": f"地层编号: {material_data['地层编号']}, 序号: {material_data['序号']}",
        "tags": [material_data["土层名称"], material_data["地层编号"]],
        "project_id": "current_project"
    }

def add_material_to_system(material):
    """
    将单个材料添加到系统
    """
    try:
        # 首先检查后端是否可用
        health_response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        if health_response.status_code != 200:
            print(f"后端服务不可用")
            return False
        
        # 尝试通过API添加材料
        response = requests.post(
            f"{BASE_URL}/api/materials/add",
            json=material,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            print(f"✓ 成功添加材料: {material['name']}")
            return True
        else:
            print(f"✗ 添加材料失败: {material['name']} - {response.status_code}")
            print(f"  错误信息: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"✗ 网络错误 - {material['name']}: {e}")
        return False
    except Exception as e:
        print(f"✗ 未知错误 - {material['name']}: {e}")
        return False

def batch_add_materials():
    """
    批量添加所有材料到系统
    """
    print("开始批量添加材料到系统材料库...\n")
    
    success_count = 0
    total_count = len(materials_data)
    
    for i, raw_material in enumerate(materials_data, 1):
        print(f"[{i}/{total_count}] 处理材料: {raw_material['土层名称']} ({raw_material['地层编号']})")
        
        # 转换数据格式
        material = convert_to_material_format(raw_material)
        
        # 显示转换后的主要参数
        props = material["properties"]
        print(f"  - 弹性模量: {props['YOUNG_MODULUS']} MPa")
        print(f"  - 密度: {props['DENSITY']:.1f} kg/m³")
        print(f"  - 粘聚力: {props['COHESION']} kPa")
        print(f"  - 内摩擦角: {props['FRICTION_ANGLE']}°")
        
        # 添加到系统
        if add_material_to_system(material):
            success_count += 1
        
        print()  # 空行分隔
    
    print(f"批量添加完成!")
    print(f"总计: {total_count} 个材料")
    print(f"成功: {success_count} 个")
    print(f"失败: {total_count - success_count} 个")
    
    if success_count == total_count:
        print("🎉 所有材料都已成功添加到系统材料库!")
    elif success_count > 0:
        print(f"⚠️  部分材料添加成功，请检查失败的材料")
    else:
        print("❌ 没有材料被成功添加，请检查系统状态")

def create_excel_file():
    """
    创建包含这些材料参数的Excel文件，以备用
    """
    try:
        import pandas as pd
        
        # 准备Excel数据
        excel_data = []
        for raw_material in materials_data:
            material = convert_to_material_format(raw_material)
            props = material["properties"]
            
            excel_data.append({
                "名称": material["name"],
                "材料类型": "土壤",
                "弹性模量": props["YOUNG_MODULUS"],
                "泊松比": props["POISSON_RATIO"],
                "密度": props["DENSITY"],
                "粘聚力": props["COHESION"],
                "内摩擦角": props["FRICTION_ANGLE"],
                "描述": material["description"],
                "来源": material["source"]
            })
        
        df = pd.DataFrame(excel_data)
        output_file = "项目材料参数_地质勘察.xlsx"
        df.to_excel(output_file, index=False)
        print(f"✓ 已创建Excel备份文件: {output_file}")
        
    except ImportError:
        print("⚠️  pandas未安装，跳过Excel文件创建")
    except Exception as e:
        print(f"✗ 创建Excel文件失败: {e}")

if __name__ == "__main__":
    print("材料参数导入工具")
    print("=" * 50)
    print(f"发现 {len(materials_data)} 个材料参数")
    print()
    
    # 显示材料概览
    print("材料概览:")
    for material in materials_data:
        print(f"  {material['序号']:2d}. {material['土层名称']:8s} ({material['地层编号']:6s}) - E={material['弹性模量']:4.1f}MPa, c={material['粘聚力']:2.0f}kPa, φ={material['摩擦角']:2.0f}°")
    print()
    
    # 创建Excel备份
    create_excel_file()
    print()
    
    # 批量添加到系统
    batch_add_materials()