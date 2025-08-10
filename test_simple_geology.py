#!/usr/bin/env python3
"""
简化的地质建模测试 - 使用最小数据集进行快速验证
"""

import json
import sys
import os
from pathlib import Path

# 添加项目路径
sys.path.insert(0, os.path.abspath('.'))

def test_direct_service_simple():
    """测试直接地质服务 - 最简单的例子"""
    print("=" * 60)
    print("测试直接地质建模服务")
    print("=" * 60)
    
    try:
        from gateway.modules.geology.direct_geology_service import get_direct_geology_service
        service = get_direct_geology_service()
        
        # 创建最简单的3点测试数据
        simple_points = [
            {"id": "P1", "x": 0.0, "y": 0.0, "z": 0.0, "soil_type": "clay", "layer_id": 1},
            {"id": "P2", "x": 50.0, "y": 0.0, "z": -2.0, "soil_type": "sand", "layer_id": 2}, 
            {"id": "P3", "x": 25.0, "y": 50.0, "z": -1.0, "soil_type": "clay", "layer_id": 1}
        ]
        
        print(f"使用 {len(simple_points)} 个简单数据点测试...")
        
        # 加载数据
        service.load_borehole_data(simple_points)
        print("数据加载完成")
        
        # 执行插值 - 使用大的网格间距快速测试
        mesh_data = service.interpolate_and_generate_mesh(
            grid_resolution=25.0,  # 25米网格间距 (粗糙但快速)
            expansion=20.0         # 向外扩展20米
        )
        
        print("\n建模结果:")
        success = mesh_data is not None
        print(f"  网格生成: {'成功' if success else '失败'}")
        
        if success:
            metadata = mesh_data.get('metadata', {})
            print(f"  网格顶点: {metadata.get('n_vertices', 0):,}")
            print(f"  三角形: {metadata.get('n_triangles', 0):,}")
            print(f"  钻孔数: {metadata.get('n_boreholes', 0)}")
            print(f"  网格分辨率: {metadata.get('grid_resolution', 0):.1f}m")
            
            # 获取统计信息
            stats = service.get_statistics()
            if stats and 'mesh_info' in stats:
                bounds = stats['mesh_info']['bounds']
                print(f"  边界: X({bounds['x'][0]:.1f}, {bounds['x'][1]:.1f}) Y({bounds['y'][0]:.1f}, {bounds['y'][1]:.1f}) Z({bounds['z'][0]:.1f}, {bounds['z'][1]:.1f})")
            
            # 尝试导出Three.js数据
            try:
                output_path = service.export_to_json("data/test_geology")
                print(f"  导出文件: {output_path}")
            except Exception as e:
                print(f"  导出失败: {e}")
        
        return success
        
    except Exception as e:
        print(f"直接服务测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主测试函数"""
    print("开始简化的地质建模系统测试")
    
    # 测试直接建模服务
    direct_ok = test_direct_service_simple()
    
    # 总结
    print("\n" + "=" * 60)
    print("简化测试总结")
    print("=" * 60)
    
    if direct_ok:
        print("地质建模系统核心功能可用")
    else:
        print("系统存在基础问题，需要进一步调试")
    
    return direct_ok

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)