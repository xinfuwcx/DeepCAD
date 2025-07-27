#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试直接地质建模API - 完整API流程测试
"""
import requests
import pandas as pd
import json

def test_direct_geology_api():
    print("测试直接地质建模API...")
    
    # 1. 加载CSV数据
    try:
        df = pd.read_csv('data/boreholes_with_undulation_fixed.csv')
        print(f"成功加载 {len(df)} 条数据记录")
        
        # 处理钻孔数据（取前20个钻孔测试）
        boreholes = []
        for borehole_id in df['钻孔编号'].unique()[:20]:
            borehole_data = df[df['钻孔编号'] == borehole_id].iloc[0]
            borehole = {
                "id": str(borehole_id),
                "x": float(borehole_data['X坐标']),
                "y": float(borehole_data['Y坐标']),
                "z": float(borehole_data['地面标高'] - borehole_data['钻孔深度']),
                "soil_type": str(borehole_data['土层名称']),
                "layer_id": int(borehole_data['土层编号'])
            }
            boreholes.append(borehole)
            print(f"钻孔{borehole_id}: x={borehole['x']:.1f}, y={borehole['y']:.1f}, z={borehole['z']:.1f}, 土层={borehole['soil_type']}")
        
        print(f"处理了 {len(boreholes)} 个钻孔")
        
    except Exception as e:
        print(f"CSV数据加载失败: {e}")
        return False
    
    # 2. 构建API请求
    request_data = {
        "boreholes": boreholes,
        "grid_resolution": 8.0,  
        "expansion": 40.0
    }
    
    # 3. 发送请求
    try:
        print("发送直接地质建模请求...")
        response = requests.post(
            "http://localhost:8085/api/geology/simple-geology",
            json=request_data,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print("直接地质建模成功!")
            print(f"建模方法: {result['modeling_method']}")
            
            # 检查返回的Three.js数据
            mesh_data = result.get('mesh_data', {})
            if mesh_data:
                print("Three.js网格数据:")
                print(f"  顶点数: {len(mesh_data.get('vertices', [])) // 3}")
                print(f"  三角形数: {len(mesh_data.get('indices', [])) // 3}")
                print(f"  钻孔点数: {len(mesh_data.get('borehole_points', [])) // 3}")
                
                # 检查边界信息
                metadata = mesh_data.get('metadata', {})
                bounds = metadata.get('bounds', {})
                if bounds:
                    print(f"  边界信息:")
                    print(f"    X: {bounds.get('x', [0,0])}")
                    print(f"    Y: {bounds.get('y', [0,0])}")  
                    print(f"    Z: {bounds.get('z', [0,0])}")
            
            # 检查JSON文件
            json_url = result.get('json_url')
            if json_url:
                print(f"JSON文件URL: {json_url}")
                # 测试文件访问
                file_url = f"http://localhost:8085{json_url}"
                file_response = requests.head(file_url)
                if file_response.status_code == 200:
                    print(f"JSON文件可以正常访问: {file_url}")
                else:
                    print(f"JSON文件无法访问: {file_response.status_code}")
            
            print(f"统计信息:")
            for key, value in result['statistics'].items():
                print(f"  {key}: {value}")
                
            print("功能特性:")
            for feature in result.get('features', []):
                print(f"  - {feature}")
            
            return True
            
        else:
            print(f"API请求失败: {response.status_code}")
            try:
                error_info = response.json()
                print(f"错误详情: {error_info}")
            except:
                print(f"错误响应: {response.text}")
            return False
            
    except Exception as e:
        print(f"请求异常: {e}")
        return False

def test_direct_service_endpoint():
    """测试直接服务端点"""
    try:
        print("\n测试直接服务端点...")
        response = requests.get("http://localhost:8085/api/geology/test-direct-service")
        
        if response.status_code == 200:
            result = response.json()
            print("服务端点测试成功!")
            print(f"服务可用: {result['service_available']}")
            
            mesh_preview = result.get('mesh_preview', {})
            if mesh_preview:
                print("网格预览:")
                for key, value in mesh_preview.items():
                    print(f"  {key}: {value}")
            
            return True
        else:
            print(f"服务端点测试失败: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"服务端点测试异常: {e}")
        return False

if __name__ == "__main__":
    # 测试服务端点
    endpoint_success = test_direct_service_endpoint()
    
    # 测试完整API流程
    api_success = test_direct_geology_api()
    
    if endpoint_success and api_success:
        print("\n完整直接地质建模API测试成功!")
        print("数据流确认: 钻孔数据 -> 后端RBF插值 -> Three.js BufferGeometry -> 前端渲染")
    else:
        print("\n直接地质建模API测试失败!")