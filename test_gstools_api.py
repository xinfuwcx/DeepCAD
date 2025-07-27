#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试GSTools地质建模API
"""
import requests
import json
import time
import pandas as pd

def test_gstools_geology():
    print("测试GSTools地质建模API...")
    
    # 1. 加载CSV数据
    print("加载钻孔数据...")
    try:
        df = pd.read_csv('data/boreholes_with_undulation_fixed.csv')
        print(f"成功加载 {len(df)} 条数据记录")
        
        # 按钻孔分组
        boreholes = []
        for borehole_id in df['钻孔编号'].unique():
            borehole_data = df[df['钻孔编号'] == borehole_id].iloc[0]
            # 现在钻孔深度已经是正值，地面标高也是正值
            # 钻孔底部高程 = 地面标高 - 钻孔深度（钻孔深度为正值）
            bottom_elevation = float(borehole_data['地面标高'] - borehole_data['钻孔深度'])
            borehole = {
                "id": str(borehole_id),
                "x": float(borehole_data['X坐标']),
                "y": float(borehole_data['Y坐标']),
                "z": bottom_elevation,
                "soil_type": str(borehole_data['土层名称']),
                "layer_id": int(borehole_data['土层编号']),
                "description": f"钻孔{borehole_id}"
            }
            boreholes.append(borehole)
            print(f"钻孔{borehole_id}: x={borehole['x']:.1f}, y={borehole['y']:.1f}, z={borehole['z']:.1f}")
        
        print(f"处理了 {len(boreholes)} 个钻孔")
        
    except Exception as e:
        print(f"CSV数据加载失败: {e}")
        return False
    
    # 2. 构建API请求
    request_data = {
        "boreholes": boreholes[:10],  # 先测试10个钻孔
        "interpolation_method": "ordinary_kriging",
        "variogram_model": "exponential",
        "grid_resolution": 5.0,  # 降低分辨率加快测试
        "domain_expansion": [30.0, 30.0],
        "auto_fit_variogram": True,
        "colormap": "terrain",
        "uncertainty_analysis": False  # 先关闭不确定性分析加快测试
    }
    
    # 3. 发送请求
    print("发送GSTools建模请求...")
    try:
        response = requests.post(
            "http://localhost:8082/api/geology/gstools-geology",
            json=request_data,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print("GSTools建模成功!")
            print(f"插值方法: {result['interpolation_method']}")
            print(f"glTF模型URL: {result['gltf_url']}")
            print(f"网格信息: {result['mesh_info']}")
            
            # 测试模型文件是否可以访问
            model_url = f"http://localhost:8082{result['gltf_url']}"
            model_response = requests.head(model_url)
            if model_response.status_code == 200:
                print(f"glTF模型文件可以正常访问: {model_url}")
            else:
                print(f"glTF模型文件无法访问: {model_response.status_code}")
            
            return True
        else:
            print(f"API请求失败: {response.status_code}")
            try:
                error_info = response.json()
                print(f"错误详情: {error_info}")
            except:
                print(f"错误响应: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("请求超时 (60秒)")
        return False
    except Exception as e:
        print(f"请求异常: {e}")
        return False

if __name__ == "__main__":
    success = test_gstools_geology()
    if success:
        print("GSTools API测试成功!")
    else:
        print("GSTools API测试失败!")