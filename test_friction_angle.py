#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速测试摩擦角参数
"""

import os
import sys
import json
from pathlib import Path

def test_friction_angle():
    """快速测试摩擦角参数"""
    print("🧪 快速测试摩擦角参数")
    print("=" * 40)
    
    # 切换到stage_1目录
    stage1_dir = Path("multi_stage_kratos_conversion/stage_1")
    os.chdir(stage1_dir)
    print(f"📁 工作目录: {os.getcwd()}")
    
    try:
        # 导入Kratos
        print("\n🔧 导入Kratos...")
        import KratosMultiphysics
        from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
        
        # 读取参数
        print("📖 读取参数...")
        with open('ProjectParameters.json', 'r', encoding='utf-8') as f:
            params_text = f.read()
        
        # 创建模型
        print("🏗️ 创建模型...")
        model = KratosMultiphysics.Model()
        parameters = KratosMultiphysics.Parameters(params_text)
        
        # 创建分析对象
        print("⚙️ 初始化分析...")
        analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
        
        # 只初始化，不运行完整分析
        print("🔍 测试材料参数读取...")
        analysis.Initialize()
        
        print("✅ 材料参数读取成功!")
        print("   如果没有摩擦角警告，说明参数设置正确")
        
        return True
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

def main():
    """主函数"""
    original_dir = os.getcwd()
    
    try:
        success = test_friction_angle()
        return success
    finally:
        os.chdir(original_dir)

if __name__ == "__main__":
    success = main()
    print(f"\n{'✅ 测试成功' if success else '❌ 测试失败'}")
    sys.exit(0 if success else 1)
