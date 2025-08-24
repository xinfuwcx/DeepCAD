#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为Kratos分析添加正确的重力加载
"""

import json
import os
from pathlib import Path

def add_gravity_to_project_parameters(stage_dir):
    """为ProjectParameters.json添加重力加载"""
    print(f"🌍 为{stage_dir}添加重力加载")
    
    params_file = Path(stage_dir) / "ProjectParameters.json"
    
    # 读取现有参数
    with open(params_file, 'r', encoding='utf-8') as f:
        params = json.load(f)
    
    # 添加重力加载过程
    gravity_process = {
        "python_module": "assign_vector_variable_process",
        "kratos_module": "KratosMultiphysics",
        "process_name": "AssignVectorVariableProcess",
        "Parameters": {
            "model_part_name": "Structure",
            "variable_name": "VOLUME_ACCELERATION",
            "value": [0.0, 0.0, -9.81],
            "interval": [0.0, "End"]
        }
    }
    
    # 确保loads_process_list存在
    if "loads_process_list" not in params["processes"]:
        params["processes"]["loads_process_list"] = []
    
    # 添加重力过程
    params["processes"]["loads_process_list"].append(gravity_process)
    
    # 保存更新后的参数
    with open(params_file, 'w', encoding='utf-8') as f:
        json.dump(params, f, indent=2, ensure_ascii=False)
    
    print(f"✅ 重力加载已添加到 {params_file}")
    print("   使用VOLUME_ACCELERATION变量")
    print("   重力加速度: [0, 0, -9.81] m/s²")

def main():
    """主函数"""
    print("🌍 添加重力加载到Kratos分析")
    print("=" * 40)
    
    # 为两个阶段都添加重力
    stages = [
        "multi_stage_kratos_conversion/stage_1",
        "multi_stage_kratos_conversion/stage_2"
    ]
    
    for stage in stages:
        if Path(stage).exists():
            add_gravity_to_project_parameters(stage)
        else:
            print(f"⚠️ 目录不存在: {stage}")
    
    print("\n✅ 重力加载配置完成!")
    print("💡 现在可以重新运行分析，应该会有更真实的结果")

if __name__ == "__main__":
    main()
