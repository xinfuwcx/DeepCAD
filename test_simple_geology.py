#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试简化地质建模API功能实现
"""
import requests
import pandas as pd

def test_simple_geology():
    print("测试简化地质建模API功能...")
    
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
        "expansion": 40.0,
        "colormap": "viridis"
    }
    
    # 3. 发送请求
    try:
        print("发送简化地质建模请求...")
        response = requests.post(
            "http://localhost:8084/api/geology/simple-geology",
            json=request_data,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print("简化地质建模成功!")
            print(f"建模方法: {result['modeling_method']}")
            print(f"glTF模型URL: {result['gltf_url']}")
            print(f"统计信息:")
            for key, value in result['statistics'].items():
                print(f"  {key}: {value}")
            
            # 测试模型文件访问
            model_url = f"http://localhost:8084{result['gltf_url']}"
            model_response = requests.head(model_url)
            if model_response.status_code == 200:
                print(f"glTF模型文件可以正常访问: {model_url}")
                return True
            else:
                print(f"glTF模型文件无法访问: {model_response.status_code}")
                return False
            
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

if __name__ == "__main__":
    success = test_simple_geology()
    if success:
        print("简化地质API功能测试成功!")
    else:
        print("简化地质API功能测试失败!")