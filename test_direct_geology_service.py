#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试直接地质建模服务 - 完整数据流测试
钻孔数据 -> 插值 -> Three.js渲染数据
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from gateway.modules.geology.direct_geology_service import DirectGeologyService
import pandas as pd
import json

def test_direct_geology_service():
    print("测试直接地质建模服务...")
    
    # 1. 创建服务实例
    service = DirectGeologyService()
    
    # 2. 加载真实钻孔数据
    try:
        df = pd.read_csv('data/boreholes_with_undulation_fixed.csv')
        print(f"成功加载 {len(df)} 条CSV记录")
        
        # 处理钻孔数据（取前20个钻孔）
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
        
        print(f"处理了 {len(boreholes)} 个钻孔")
        
        # 显示前几个钻孔数据
        for i, bh in enumerate(boreholes[:3]):
            print(f"  钻孔{i+1}: x={bh['x']:.1f}, y={bh['y']:.1f}, z={bh['z']:.1f}, 土层={bh['soil_type']}")
    
    except Exception as e:
        print(f"CSV数据加载失败: {e}")
        # 使用测试数据
        boreholes = [
            {"id": "test1", "x": 0.0, "y": 0.0, "z": -4.0, "soil_type": "粘土", "layer_id": 1},
            {"id": "test2", "x": 100.0, "y": 0.0, "z": -4.5, "soil_type": "砂土", "layer_id": 2},
            {"id": "test3", "x": 50.0, "y": 100.0, "z": -3.5, "soil_type": "粘土", "layer_id": 1}
        ]
        print("使用测试数据")
    
    # 3. 加载钻孔数据到服务
    service.load_borehole_data(boreholes)
    
    # 4. 执行插值和网格生成
    try:
        print("正在执行插值和网格生成...")
        mesh_data = service.interpolate_and_generate_mesh(
            grid_resolution=10.0,  # 更大的分辨率用于测试
            expansion=30.0
        )
        print("插值和网格生成成功")
        
        # 5. 检查生成的Three.js数据
        print("网格数据统计:")
        print(f"  顶点数: {len(mesh_data['vertices']) // 3}")
        print(f"  三角形数: {len(mesh_data['indices']) // 3}")
        print(f"  钻孔点数: {len(mesh_data['borehole_points']) // 3}")
        
        # 检查数据格式
        metadata = mesh_data['metadata']
        bounds = metadata['bounds']
        print(f"  网格边界:")
        print(f"    X: [{bounds['x'][0]:.1f}, {bounds['x'][1]:.1f}]")
        print(f"    Y: [{bounds['y'][0]:.1f}, {bounds['y'][1]:.1f}]")
        print(f"    Z: [{bounds['z'][0]:.1f}, {bounds['z'][1]:.1f}]")
        
        # 6. 测试数据导出
        print("测试JSON导出...")
        json_path = service.export_to_json()
        print(f"JSON导出成功: {json_path}")
        
        # 验证导出文件
        with open(json_path, 'r', encoding='utf-8') as f:
            exported_data = json.load(f)
        
        print(f"JSON文件验证成功，包含 {len(exported_data['vertices'])//3} 个顶点")
        
        # 7. 获取统计信息
        stats = service.get_statistics()
        print("服务统计信息:")
        for key, value in stats.items():
            if key != 'mesh_info':
                print(f"  {key}: {value}")
        
        print("\n直接地质建模服务测试完全成功!")
        print("数据流验证: 钻孔数据 -> RBF插值 -> Three.js BufferGeometry数据")
        return True
        
    except Exception as e:
        print(f"插值建模失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_direct_geology_service()
    if success:
        print("\n直接地质建模服务测试通过!")
    else:
        print("\n直接地质建模服务测试失败!")