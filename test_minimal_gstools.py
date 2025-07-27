#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最小化测试GSTools API - 只用3个点
"""
import requests
import json

def test_minimal_gstools():
    print("最小化测试GSTools API...")
    
    # 构建最简单的3点测试数据
    request_data = {
        "boreholes": [
            {"id": "test1", "x": 0.0, "y": 0.0, "z": -4.0, "soil_type": "粘土", "layer_id": 1},
            {"id": "test2", "x": 100.0, "y": 0.0, "z": -4.5, "soil_type": "砂土", "layer_id": 2},
            {"id": "test3", "x": 50.0, "y": 100.0, "z": -3.5, "soil_type": "粘土", "layer_id": 1}
        ],
        "interpolation_method": "ordinary_kriging",
        "variogram_model": "exponential",
        "grid_resolution": 20.0,  # 很低分辨率
        "domain_expansion": [20.0, 20.0],  # 很小的扩展
        "auto_fit_variogram": True,
        "colormap": "terrain",
        "uncertainty_analysis": False
    }
    
    print("发送3点测试请求...")
    try:
        response = requests.post(
            "http://localhost:8084/api/geology/gstools-geology",
            json=request_data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("GSTools建模成功!")
            print(f"glTF模型URL: {result['gltf_url']}")
            return True
        else:
            print(f"API请求失败: {response.status_code}")
            error_info = response.json()
            print(f"错误详情: {error_info}")
            return False
            
    except Exception as e:
        print(f"请求异常: {e}")
        return False

if __name__ == "__main__":
    success = test_minimal_gstools()
    if success:
        print("最小化测试成功!")
    else:
        print("最小化测试失败!")