#!/usr/bin/env python3
"""
生成钻孔数据 - 100组钻孔，8个土层，300x300分布区域
适用于多层分段三区混合地质建模系统
"""

import numpy as np
import pandas as pd
import json
import os
from typing import List, Dict, Any

def generate_realistic_borehole_data():
    """生成符合工程实际的钻孔数据"""
    
    print("Starting borehole data generation...")
    
    # 基础参数设置
    num_boreholes = 100
    study_area_size = 300  # 300x300米的研究区域
    total_domain_size = 500  # 500x500米的总计算域
    max_depth = 30  # 最大深度30米
    
    # 8层典型地层定义 (从上到下)
    soil_layers = [
        {'name': 'fill', 'label': '填土', 'color': '#D2B48C', 'typical_thickness': (1.5, 3.5), 'density_range': (1700, 1850), 'cohesion_range': (8, 20), 'friction_range': (15, 25)},
        {'name': 'clay', 'label': '粘土', 'color': '#8B4513', 'typical_thickness': (2.0, 4.0), 'density_range': (1850, 1950), 'cohesion_range': (25, 50), 'friction_range': (8, 18)},
        {'name': 'silt', 'label': '粉土', 'color': '#DDD', 'typical_thickness': (1.0, 2.5), 'density_range': (1800, 1900), 'cohesion_range': (15, 35), 'friction_range': (18, 28)},
        {'name': 'sand', 'label': '砂土', 'color': '#F4A460', 'typical_thickness': (3.0, 6.0), 'density_range': (1900, 2050), 'cohesion_range': (0, 10), 'friction_range': (28, 38)},
        {'name': 'clay', 'label': '粘土2', 'color': '#654321', 'typical_thickness': (2.5, 5.0), 'density_range': (1900, 2000), 'cohesion_range': (30, 60), 'friction_range': (10, 20)},
        {'name': 'gravel', 'label': '卵石', 'color': '#696969', 'typical_thickness': (2.0, 4.0), 'density_range': (2000, 2150), 'cohesion_range': (0, 15), 'friction_range': (35, 45)},
        {'name': 'sand', 'label': '砂土2', 'color': '#DEB887', 'typical_thickness': (3.0, 5.0), 'density_range': (1950, 2100), 'cohesion_range': (0, 8), 'friction_range': (30, 40)},
        {'name': 'rock', 'label': '基岩', 'color': '#2F4F4F', 'typical_thickness': (5.0, 10.0), 'density_range': (2200, 2600), 'cohesion_range': (200, 800), 'friction_range': (40, 55)}
    ]
    
    boreholes = []
    
    # 生成钻孔分布 - 在300x300区域内，考虑边界缓冲
    np.random.seed(42)  # 固定种子以便复现
    
    # 使用分层抽样确保良好的空间分布
    grid_size = 10  # 10x10网格
    points_per_cell = num_boreholes // (grid_size * grid_size)
    extra_points = num_boreholes % (grid_size * grid_size)
    
    borehole_positions = []
    borehole_id = 1
    
    for i in range(grid_size):
        for j in range(grid_size):
            # 每个网格单元的边界
            x_min = -150 + i * (study_area_size / grid_size)
            x_max = -150 + (i + 1) * (study_area_size / grid_size)
            y_min = -150 + j * (study_area_size / grid_size)
            y_max = -150 + (j + 1) * (study_area_size / grid_size)
            
            # 在每个网格单元中生成点
            num_points = points_per_cell
            if extra_points > 0:
                num_points += 1
                extra_points -= 1
            
            for _ in range(num_points):
                x = np.random.uniform(x_min, x_max)
                y = np.random.uniform(y_min, y_max)
                borehole_positions.append((x, y))
    
    # 生成地面标高 - 模拟自然地形起伏
    def get_ground_elevation(x, y):
        """根据位置生成地面标高"""
        # 基础标高 + 地形起伏
        base_elev = 3.0
        # 添加一些地形变化
        terrain_variation = 2.0 * np.sin(x / 100) * np.cos(y / 80) + \
                          1.5 * np.sin(x / 60) * np.sin(y / 90) + \
                          0.8 * np.random.normal(0, 0.5)
        return base_elev + terrain_variation
    
    # 为每个钻孔生成详细数据
    for idx, (x, y) in enumerate(borehole_positions):
        borehole_id = f"BH{idx+1:03d}"
        borehole_name = f"ZK{idx+1:03d}"
        
        # 地面标高
        ground_elev = get_ground_elevation(x, y)
        
        # 生成各层厚度 (有空间相关性)
        layers = []
        current_top = ground_elev
        
        for layer_idx, layer_info in enumerate(soil_layers):
            # 厚度有随机性但保持合理性
            thickness_min, thickness_max = layer_info['typical_thickness']
            
            # 根据位置添加空间相关性
            spatial_factor = 1.0 + 0.3 * np.sin(x / 50) * np.cos(y / 40)
            thickness = np.random.uniform(thickness_min, thickness_max) * spatial_factor
            
            # 确保不超过最大深度
            bottom_elev = current_top - thickness
            if current_top - ground_elev >= max_depth:
                break
            if bottom_elev < ground_elev - max_depth:
                bottom_elev = ground_elev - max_depth
                thickness = current_top - bottom_elev
            
            # 生成土层参数
            density = np.random.uniform(*layer_info['density_range'])
            cohesion = np.random.uniform(*layer_info['cohesion_range'])
            friction = np.random.uniform(*layer_info['friction_range'])
            
            # 添加一些随机变异
            density += np.random.normal(0, 20)
            cohesion += np.random.normal(0, 3)
            friction += np.random.normal(0, 2)
            
            # 确保参数在合理范围内
            density = max(1500, min(2800, density))
            cohesion = max(0, min(1000, cohesion))
            friction = max(0, min(60, friction))
            
            layer = {
                'id': f'S{layer_idx+1}',
                'top_elev': round(current_top, 2),
                'bottom_elev': round(bottom_elev, 2),
                'soil_type': layer_info['name'],
                'density': round(density, 0),
                'cohesion': round(cohesion, 1),
                'friction': round(friction, 1)
            }
            
            layers.append(layer)
            current_top = bottom_elev
            
            # 如果达到最大深度就停止
            if current_top <= ground_elev - max_depth:
                break
        
        # 创建钻孔记录
        borehole = {
            'id': borehole_id,
            'name': borehole_name,
            'x': round(x, 2),
            'y': round(y, 2),
            'ground_elevation': round(ground_elev, 2),
            'total_depth': round(ground_elev - layers[-1]['bottom_elev'], 1),
            'strata': layers
        }
        
        boreholes.append(borehole)
    
    print(f"Generated {len(boreholes)} boreholes")
    print(f"   - Study area: {study_area_size}m x {study_area_size}m")
    print(f"   - Total domain: {total_domain_size}m x {total_domain_size}m x {max_depth}m")
    print(f"   - Soil layers: {len(soil_layers)} types")
    print(f"   - Avg layers per borehole: {np.mean([len(bh['strata']) for bh in boreholes]):.1f}")
    
    return boreholes, soil_layers

def save_to_csv(boreholes: List[Dict], output_dir: str):
    """保存为CSV格式"""
    
    # 创建钻孔基本信息表
    borehole_info = []
    strata_info = []
    
    for bh in boreholes:
        borehole_info.append({
            'borehole_id': bh['id'],
            'borehole_name': bh['name'],
            'x_coord': bh['x'],
            'y_coord': bh['y'],
            'ground_elevation': bh['ground_elevation'],
            'total_depth': bh['total_depth'],
            'num_strata': len(bh['strata'])
        })
        
        # 土层详细信息
        for stratum in bh['strata']:
            strata_info.append({
                'borehole_id': bh['id'],
                'borehole_name': bh['name'],
                'x_coord': bh['x'],
                'y_coord': bh['y'],
                'stratum_id': stratum['id'],
                'soil_type': stratum['soil_type'],
                'top_elevation': stratum['top_elev'],
                'bottom_elevation': stratum['bottom_elev'],
                'thickness': stratum['top_elev'] - stratum['bottom_elev'],
                'density': stratum['density'],
                'cohesion': stratum['cohesion'],
                'friction_angle': stratum['friction']
            })
    
    # 保存CSV文件
    df_boreholes = pd.DataFrame(borehole_info)
    df_strata = pd.DataFrame(strata_info)
    
    borehole_csv = os.path.join(output_dir, 'boreholes_basic_info.csv')
    strata_csv = os.path.join(output_dir, 'boreholes_strata_details.csv')
    
    df_boreholes.to_csv(borehole_csv, index=False, encoding='utf-8-sig')
    df_strata.to_csv(strata_csv, index=False, encoding='utf-8-sig')
    
    print(f"CSV files saved:")
    print(f"   - Borehole basic info: {borehole_csv}")
    print(f"   - Strata details: {strata_csv}")
    
    return borehole_csv, strata_csv

def save_to_json(boreholes: List[Dict], soil_layers: List[Dict], output_dir: str):
    """保存为JSON格式（直接适配前端接口）"""
    
    # 完整的数据结构，适配前端GeologyParamsAdvanced接口
    geology_data = {
        "metadata": {
            "project_name": "DeepCAD地质建模示例数据",
            "created_date": "2025-01-21",
            "description": "100个钻孔，8层土体，300x300分布区域",
            "coordinate_system": "Local Grid",
            "units": "meters",
            "total_boreholes": len(boreholes),
            "study_area": "300m x 300m",
            "total_domain": "500m x 500m x 30m",
            "soil_types": [layer['name'] for layer in soil_layers]
        },
        "boreholes": boreholes,
        "soil_layer_definitions": soil_layers,
        "recommended_domain": {
            "extension_method": "convex_hull",
            "x_extend": 100,
            "y_extend": 100,
            "bottom_elevation": -35,
            "mesh_resolution": 2.0
        },
        "recommended_algorithm": {
            "core_radius": 80,
            "transition_distance": 200,
            "variogram_model": "spherical",
            "trend_order": "linear",
            "uncertainty_analysis": False
        }
    }
    
    # 保存完整JSON
    json_file = os.path.join(output_dir, 'borehole_geology_data.json')
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(geology_data, f, ensure_ascii=False, indent=2)
    
    # 保存仅钻孔数据（适配前端导入）
    boreholes_only_file = os.path.join(output_dir, 'boreholes_for_import.json')
    with open(boreholes_only_file, 'w', encoding='utf-8') as f:
        json.dump(boreholes, f, ensure_ascii=False, indent=2)
    
    print(f"JSON files saved:")
    print(f"   - Complete geology data: {json_file}")
    print(f"   - Boreholes for import: {boreholes_only_file}")
    
    return json_file, boreholes_only_file

def generate_statistics(boreholes: List[Dict], soil_layers: List[Dict]):
    """生成数据统计报告"""
    
    print(f"\nData Statistics Report:")
    print(f"=" * 50)
    
    # 钻孔分布统计
    x_coords = [bh['x'] for bh in boreholes]
    y_coords = [bh['y'] for bh in boreholes]
    ground_elevs = [bh['ground_elevation'] for bh in boreholes]
    depths = [bh['total_depth'] for bh in boreholes]
    
    print(f"Borehole Distribution:")
    print(f"  - X coordinate range: {min(x_coords):.1f} ~ {max(x_coords):.1f}m")
    print(f"  - Y coordinate range: {min(y_coords):.1f} ~ {max(y_coords):.1f}m") 
    print(f"  - Ground elevation: {min(ground_elevs):.1f} ~ {max(ground_elevs):.1f}m")
    print(f"  - Borehole depth: {min(depths):.1f} ~ {max(depths):.1f}m")
    
    # 土层统计
    soil_type_count = {}
    total_strata = 0
    
    for bh in boreholes:
        total_strata += len(bh['strata'])
        for stratum in bh['strata']:
            soil_type = stratum['soil_type']
            soil_type_count[soil_type] = soil_type_count.get(soil_type, 0) + 1
    
    print(f"\nStrata Distribution:")
    print(f"  - Total strata: {total_strata}")
    print(f"  - Average per borehole: {total_strata/len(boreholes):.1f} layers")
    for soil_type, count in sorted(soil_type_count.items()):
        percentage = count / total_strata * 100
        print(f"  - {soil_type}: {count} segments ({percentage:.1f}%)")
    
    # 参数范围统计
    print(f"\nParameter Statistics:")
    densities = []
    cohesions = []
    frictions = []
    
    for bh in boreholes:
        for stratum in bh['strata']:
            densities.append(stratum['density'])
            cohesions.append(stratum['cohesion'])
            frictions.append(stratum['friction'])
    
    print(f"  - Density: {min(densities):.0f} ~ {max(densities):.0f} kg/m3")
    print(f"  - Cohesion: {min(cohesions):.1f} ~ {max(cohesions):.1f} kPa")
    print(f"  - Friction angle: {min(frictions):.1f} ~ {max(frictions):.1f} degrees")
    
    print(f"=" * 50)

def main():
    """主函数"""
    
    # 确保输出目录存在
    output_dir = "E:\\DeepCAD\\data"
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # 生成钻孔数据
        boreholes, soil_layers = generate_realistic_borehole_data()
        
        # 保存为不同格式
        save_to_csv(boreholes, output_dir)
        save_to_json(boreholes, soil_layers, output_dir)
        
        # 生成统计报告
        generate_statistics(boreholes, soil_layers)
        
        print(f"\nData generation completed!")
        print(f"Output directory: {output_dir}")
        print(f"\nUsage suggestions:")
        print(f"   1. Frontend import: Use boreholes_for_import.json")
        print(f"   2. Data analysis: Use CSV files for statistical analysis")
        print(f"   3. Complete configuration: Use borehole_geology_data.json")
        print(f"\nRecommended modeling parameters:")
        print(f"   - Domain method: Convex hull buffer")
        print(f"   - X/Y extension: 100m")
        print(f"   - Core radius: 80m")
        print(f"   - Transition distance: 200m")
        print(f"   - Mesh resolution: 2.0m")
        
    except Exception as e:
        print(f"Generation error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()