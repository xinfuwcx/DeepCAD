#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试完整几何建模服务
RBF插值 + GMSH+OCC几何建模 + 物理组定义 + Three.js显示
"""
import requests
import pandas as pd
import json

def test_complete_geometry_modeling():
    print("测试完整几何建模服务...")
    
    # 1. 测试服务端点
    try:
        print("\n测试几何建模服务端点...")
        response = requests.get("http://localhost:8087/api/geology/test-geometry-service")
        
        if response.status_code == 200:
            result = response.json()
            print("服务端点测试成功!")
            print(f"服务可用: {result['service_available']}")
            
            test_results = result.get('test_results', {})
            print("测试结果:")
            for key, value in test_results.items():
                print(f"  {key}: {value}")
        else:
            print(f"服务端点测试失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"服务端点测试异常: {e}")
        return False
    
    # 2. 加载真实钻孔数据
    try:
        df = pd.read_csv('data/boreholes_with_undulation_fixed.csv')
        print(f"\n成功加载 {len(df)} 条钻孔数据记录")
        
        # 处理钻孔数据（取前15个钻孔进行几何建模）
        boreholes = []
        for borehole_id in df['钻孔编号'].unique()[:15]:
            borehole_data = df[df['钻孔编号'] == borehole_id].iloc[0]
            borehole = {
                "id": str(borehole_id),
                "x": float(borehole_data['X坐标']),
                "y": float(borehole_data['Y坐标']),
                "z": float(borehole_data['地面标高'] - borehole_data['钻孔深度']),  # 钻孔底标高
                "ground_elevation": float(borehole_data['地面标高']),
                "depth": float(borehole_data['钻孔深度']),
                "soil_type": str(borehole_data['土层名称']),
                "layer_id": int(borehole_data['土层编号'])
            }
            boreholes.append(borehole)
        
        print(f"处理了 {len(boreholes)} 个钻孔用于几何建模")
        
        # 显示钻孔信息
        for i, bh in enumerate(boreholes[:3]):
            print(f"  钻孔{i+1}: x={bh['x']:.1f}, y={bh['y']:.1f}, 地面={bh['ground_elevation']:.1f}, 底部={bh['z']:.1f}, 深度={bh['depth']:.1f}m, 土层={bh['soil_type']}")
        
    except Exception as e:
        print(f"钻孔数据加载失败: {e}")
        return False
    
    # 3. 构建完整几何建模请求
    request_data = {
        "boreholes": boreholes,
        "computation_domain": {
            # 让系统自动计算计算域，支持外推
            "buffer_ratio": 0.3  # 30%的缓冲区用于外推
        },
        "rbf_params": {
            "grid_resolution": 8.0,  # 8米网格分辨率
            "rbf_function": "multiquadric",  # 多二次RBF，适合外推
            "smooth": 0.1
        },
        "gmsh_params": {
            "characteristic_length": 10.0,  # 10米特征长度
            "use_bspline_surface": True  # 使用B-Spline曲面
        },
        "export_files": True  # 导出几何文件
    }
    
    # 4. 发送完整几何建模请求
    try:
        print("\n发送完整几何建模请求...")
        response = requests.post(
            "http://localhost:8087/api/geology/geometry-modeling",
            json=request_data,
            timeout=120  # 几何建模可能需要更长时间
        )
        
        if response.status_code == 200:
            result = response.json()
            print("完整几何建模成功!")
            print(f"建模方法: {result['modeling_method']}")
            
            # 检查几何数据
            geometry_data = result.get('geometry_data', {})
            if geometry_data:
                metadata = geometry_data.get('metadata', {})
                print(f"\nThree.js几何数据:")
                print(f"  建模阶段: {metadata.get('modeling_stage', 'unknown')}")
                print(f"  地表顶点数: {metadata.get('n_surface_vertices', 0)}")
                print(f"  地表三角形数: {metadata.get('n_surface_triangles', 0)}")
                print(f"  钻孔数量: {metadata.get('n_boreholes', 0)}")
                print(f"  物理组数量: {metadata.get('n_physical_groups', 0)}")
                print(f"  插值方法: {metadata.get('interpolation_method', 'unknown')}")
                print(f"  计算域: {metadata.get('computation_domain', {})}")
                
                # 检查物理组
                physical_groups = geometry_data.get('physical_groups', {})
                if physical_groups:
                    print(f"\n物理组定义:")
                    for name, group in physical_groups.items():
                        print(f"  {name}: 维度={group['dimension']}, 类型={group['type']}, 标签={group['tag']}")
            
            # 检查几何文件
            geometry_files = result.get('geometry_files', {})
            if geometry_files:
                print(f"\n导出的几何文件:")
                for file_type, url in geometry_files.items():
                    print(f"  {file_type}: {url}")
            
            # 统计信息
            statistics = result.get('statistics', {})
            print(f"\n统计信息:")
            for key, value in statistics.items():
                if key not in ['physical_groups_info', 'layer_info']:
                    print(f"  {key}: {value}")
            
            # 功能特性
            capabilities = result.get('capabilities', [])
            print(f"\n功能特性:")
            for cap in capabilities:
                print(f"  - {cap}")
            
            return True
            
        else:
            print(f"几何建模请求失败: {response.status_code}")
            try:
                error_info = response.json()
                print(f"错误详情: {error_info}")
            except:
                print(f"错误响应: {response.text}")
            return False
            
    except Exception as e:
        print(f"几何建模请求异常: {e}")
        return False

if __name__ == "__main__":
    success = test_complete_geometry_modeling()
    if success:
        print("\n完整几何建模服务测试成功!")
        print("数据流验证: 钻孔数据 -> RBF外推插值 -> GMSH+OCC几何建模 -> 物理组定义 -> Three.js几何显示")
    else:
        print("\n完整几何建模服务测试失败!")