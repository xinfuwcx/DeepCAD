#!/usr/bin/env python3
"""
真实地质建模测试 - 创建符合深基坑工程的测试数据
模拟上海地区典型地质条件
"""

import json
import numpy as np
import pandas as pd
from pathlib import Path

# 上海地区典型土层类型
SHANGHAI_SOIL_TYPES = {
    1: {"name": "素填土", "depth_range": [0, 3], "color": "#8B7D6B", "density": 1800},
    2: {"name": "粘土", "depth_range": [2, 8], "color": "#8B4513", "density": 1900},
    3: {"name": "淤泥质粘土", "depth_range": [6, 15], "color": "#556B2F", "density": 1750},
    4: {"name": "粉质粘土", "depth_range": [12, 25], "color": "#CD853F", "density": 1850},
    5: {"name": "粉砂", "depth_range": [20, 35], "color": "#DEB887", "density": 1950},
    6: {"name": "细砂", "depth_range": [30, 50], "color": "#F4A460", "density": 2000},
    7: {"name": "中砂", "depth_range": [45, 70], "color": "#D2691E", "density": 2050},
    8: {"name": "砂质粘土", "depth_range": [65, 90], "color": "#A0522D", "density": 1900}
}

def generate_realistic_boreholes(n_holes=12, project_area=200):
    """
    生成符合实际工程的钻孔数据
    
    Args:
        n_holes: 钻孔数量
        project_area: 项目区域边长(m)
    """
    print(f"生成 {n_holes} 个钻孔的真实地质数据...")
    
    boreholes = []
    
    # 基础地面标高 (上海地区典型值)
    base_elevation = 3.2  
    elevation_variation = 1.5  # 地面起伏
    
    for i in range(n_holes):
        hole_id = f"BH{i+1:03d}"
        
        # 在项目区域内均匀分布钻孔
        if i == 0:
            # 中心点
            x, y = 0, 0
        elif i <= 4:
            # 四角
            corner_offset = project_area * 0.4
            corners = [
                (-corner_offset, -corner_offset),
                (corner_offset, -corner_offset), 
                (corner_offset, corner_offset),
                (-corner_offset, corner_offset)
            ]
            x, y = corners[(i-1) % 4]
        else:
            # 随机分布其余钻孔
            angle = 2 * np.pi * i / n_holes
            radius = np.random.uniform(project_area * 0.2, project_area * 0.45)
            x = radius * np.cos(angle) + np.random.normal(0, project_area * 0.05)
            y = radius * np.sin(angle) + np.random.normal(0, project_area * 0.05)
        
        # 地面标高变化
        ground_elevation = base_elevation + np.random.normal(0, elevation_variation)
        
        # 生成土层序列
        layers = []
        current_depth = 0
        max_depth = np.random.uniform(35, 60)  # 钻孔深度变化
        
        # 按概率选择出现的土层
        layer_sequence = [1, 2, 3, 4, 5, 6, 7, 8]  # 从上到下的土层序列
        
        for layer_id in layer_sequence:
            if current_depth >= max_depth:
                break
                
            soil_info = SHANGHAI_SOIL_TYPES[layer_id]
            
            # 土层厚度变化
            min_thickness = 1.5
            max_thickness = soil_info["depth_range"][1] - soil_info["depth_range"][0]
            thickness = np.random.uniform(min_thickness, min_thickness + max_thickness * 0.6)
            
            # 检查是否在合理深度范围内
            layer_center_depth = current_depth + thickness / 2
            expected_min, expected_max = soil_info["depth_range"]
            
            if layer_center_depth < expected_max + 10:  # 允许一定的地质变异
                layers.append({
                    "layer_id": layer_id,
                    "name": soil_info["name"],
                    "soil_type": soil_info["name"],
                    "top_depth": current_depth,
                    "bottom_depth": current_depth + thickness,
                    "thickness": thickness,
                    "color": soil_info["color"],
                    "density": soil_info["density"] + np.random.normal(0, 50),
                    "properties": {
                        "cohesion": np.random.uniform(10, 50),
                        "friction_angle": np.random.uniform(15, 35),
                        "elastic_modulus": np.random.uniform(8000, 25000),
                        "poisson_ratio": np.random.uniform(0.25, 0.4),
                        "permeability": np.random.uniform(1e-8, 1e-5)
                    }
                })
                current_depth += thickness
        
        # 计算钻孔底标高
        z_bottom = ground_elevation - current_depth
        
        borehole = {
            "id": hole_id,
            "name": f"钻孔{hole_id}",
            "x": round(x, 2),
            "y": round(y, 2),
            "z": round(z_bottom, 2),  # 钻孔底标高
            "ground_elevation": round(ground_elevation, 2),
            "depth": round(current_depth, 2),
            "water_level": round(ground_elevation - np.random.uniform(1.5, 4.0), 2),  # 地下水位
            "layers": layers,
            "metadata": {
                "drilling_date": f"2024-{np.random.randint(1,13):02d}-{np.random.randint(1,29):02d}",
                "drilling_method": "回转钻进",
                "sample_quality": np.random.choice(["A", "B", "C"], p=[0.6, 0.3, 0.1]),
                "location_accuracy": "±0.1m"
            }
        }
        
        boreholes.append(borehole)
        
        print(f"  {hole_id}: ({x:.1f}, {y:.1f}) 深度{current_depth:.1f}m, {len(layers)}层土")
    
    return boreholes

def create_test_datasets():
    """创建多种测试数据集"""
    
    # 1. 标准项目数据集
    standard_holes = generate_realistic_boreholes(n_holes=12, project_area=200)
    
    # 2. 大型项目数据集
    large_holes = generate_realistic_boreholes(n_holes=25, project_area=400)
    
    # 3. 密集钻孔数据集
    dense_holes = generate_realistic_boreholes(n_holes=8, project_area=100)
    
    datasets = {
        "standard_project": {
            "description": "标准深基坑项目 - 200x200m区域，12个钻孔",
            "holes": standard_holes,
            "recommended_domain": {
                "x_extend": 250,
                "y_extend": 250,
                "z_top": 6,
                "z_bottom": -65
            },
            "recommended_resolution": [40, 40, 30]
        },
        "large_project": {
            "description": "大型深基坑项目 - 400x400m区域，25个钻孔", 
            "holes": large_holes,
            "recommended_domain": {
                "x_extend": 500,
                "y_extend": 500,
                "z_top": 8,
                "z_bottom": -85
            },
            "recommended_resolution": [50, 50, 35]
        },
        "dense_project": {
            "description": "密集钻孔项目 - 100x100m区域，8个钻孔",
            "holes": dense_holes,
            "recommended_domain": {
                "x_extend": 150,
                "y_extend": 150, 
                "z_top": 5,
                "z_bottom": -45
            },
            "recommended_resolution": [30, 30, 25]
        }
    }
    
    # 保存数据集
    output_dir = Path("data/test_geology")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    for name, dataset in datasets.items():
        # JSON格式
        json_file = output_dir / f"{name}_boreholes.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(dataset, f, ensure_ascii=False, indent=2)
        
        # CSV格式 (扁平化)
        csv_data = []
        for hole in dataset["holes"]:
            for layer in hole["layers"]:
                csv_data.append({
                    "hole_id": hole["id"],
                    "hole_name": hole["name"],
                    "x": hole["x"],
                    "y": hole["y"],
                    "z": hole["z"],
                    "ground_elevation": hole["ground_elevation"],
                    "total_depth": hole["depth"],
                    "water_level": hole["water_level"],
                    "layer_id": layer["layer_id"],
                    "layer_name": layer["name"],
                    "soil_type": layer["soil_type"],
                    "top_depth": layer["top_depth"],
                    "bottom_depth": layer["bottom_depth"],
                    "thickness": layer["thickness"],
                    "density": layer["density"],
                    "cohesion": layer["properties"]["cohesion"],
                    "friction_angle": layer["properties"]["friction_angle"],
                    "elastic_modulus": layer["properties"]["elastic_modulus"],
                    "poisson_ratio": layer["properties"]["poisson_ratio"],
                    "permeability": layer["properties"]["permeability"]
                })
        
        csv_file = output_dir / f"{name}_boreholes.csv"
        df = pd.DataFrame(csv_data)
        df.to_csv(csv_file, index=False, encoding='utf-8')
        
        print(f"保存数据集: {name}")
        print(f"   JSON: {json_file}")
        print(f"   CSV:  {csv_file}")
        print(f"   钻孔数: {len(dataset['holes'])}, 土层记录: {len(csv_data)}")
    
    return datasets

def print_data_summary(datasets):
    """打印数据集摘要"""
    print("\n" + "="*60)
    print("地质建模测试数据集生成完成")
    print("="*60)
    
    for name, dataset in datasets.items():
        holes = dataset["holes"]
        print(f"\n{name.upper()}: {dataset['description']}")
        print("-" * 50)
        
        # 统计信息
        total_layers = sum(len(h["layers"]) for h in holes)
        soil_types = set()
        depth_range = []
        
        for hole in holes:
            depth_range.append(hole["depth"])
            for layer in hole["layers"]:
                soil_types.add(layer["soil_type"])
        
        print(f"钻孔数量: {len(holes)}")
        print(f"土层记录: {total_layers}")
        print(f"土壤类型: {len(soil_types)} 种")
        print(f"深度范围: {min(depth_range):.1f}m - {max(depth_range):.1f}m")
        print(f"坐标范围: X({min(h['x'] for h in holes):.1f} ~ {max(h['x'] for h in holes):.1f}), "
              f"Y({min(h['y'] for h in holes):.1f} ~ {max(h['y'] for h in holes):.1f})")
        
        print("主要土层:", ", ".join(list(soil_types)[:5]) + ("..." if len(soil_types) > 5 else ""))

if __name__ == "__main__":
    print("开始生成真实地质建模测试数据...")
    datasets = create_test_datasets()
    print_data_summary(datasets)
    print("\n测试数据准备完成，可以开始地质建模测试！")