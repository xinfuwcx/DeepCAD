#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Example6 快速测试脚本

验证重构后的各个模块功能
"""

import json
import sys
from pathlib import Path

# 添加父目录到路径以支持相对导入
sys.path.insert(0, str(Path(__file__).parent.parent))

from example6.example6_service import Example6Service


def test_basic_functionality():
    """测试基本功能"""
    print("=== Example6 重构验证测试 ===\n")
    
    # 初始化服务
    service = Example6Service()
    print("✓ 服务初始化成功")
    
    # 测试预设求解
    print("\n1. 测试预设求解:")
    presets = service.get_available_presets()
    print(f"   可用预设: {presets}")
    
    for preset_name in presets[:2]:  # 测试前两个预设
        result = service.solve_with_preset(preset_name)
        if result["success"]:
            print(f"   ✓ {preset_name}: {result['formatted_result']}")
        else:
            print(f"   ✗ {preset_name}: {result['error']}")
    
    # 测试自定义参数
    print("\n2. 测试自定义参数:")
    custom_params = {
        "pier_diameter": 2.5,
        "flow_velocity": 1.8,
        "water_depth": 6.0,
        "d50": 1.2
    }
    result = service.quick_solve(custom_params)
    if result["success"]:
        print(f"   ✓ 自定义参数: {result['formatted_result']}")
    else:
        print(f"   ✗ 自定义参数: {result['error']}")
    
    # 测试批量处理
    print("\n3. 测试批量处理:")
    batch_data = [
        {"pier_diameter": 1.5, "flow_velocity": 2.0, "water_depth": 3.0, "d50": 1.0},
        {"pier_diameter": 3.0, "flow_velocity": 1.2, "water_depth": 8.0, "d50": 0.5},
        {"pier_diameter": 2.0, "flow_velocity": 1.5, "water_depth": 5.0, "d50": 0.8}
    ]
    
    batch_results = service.batch_solve(batch_data)
    success_count = sum(1 for r in batch_results if r["success"])
    print(f"   批量处理: {success_count}/{len(batch_results)} 成功")
    
    # 测试系统信息
    print("\n4. 系统信息:")
    info = service.get_solver_info()
    print(f"   可用求解器: {list(info['available_solvers'].keys())}")
    
    print("\n=== 测试完成 ===")
    return True


def create_sample_batch_file():
    """创建示例批处理文件"""
    sample_data = [
        {
            "pier_diameter": 2.0,
            "flow_velocity": 1.5,
            "water_depth": 4.0,
            "d50": 0.8,
            "pier_shape": "圆形"
        },
        {
            "pier_diameter": 3.0,
            "flow_velocity": 1.2,
            "water_depth": 8.0,
            "d50": 0.5,
            "pier_shape": "矩形"
        },
        {
            "pier_diameter": 1.8,
            "flow_velocity": 2.2,
            "water_depth": 3.5,
            "d50": 1.2,
            "pier_shape": "圆形"
        }
    ]
    
    with open("sample_batch.json", "w", encoding="utf-8") as f:
        json.dump(sample_data, f, ensure_ascii=False, indent=2)
    
    print("已创建示例批处理文件: sample_batch.json")


if __name__ == "__main__":
    # 运行基本功能测试
    test_basic_functionality()
    
    # 创建示例文件
    print()
    create_sample_batch_file()
    
    print("\n可以尝试以下命令:")
    print("python -m example6 info")
    print("python -m example6 solve --preset 城市桥梁")
    print("python -m example6 batch sample_batch.json")
