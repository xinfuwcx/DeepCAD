#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的Kratos测试脚本
"""

import sys
import os
from pathlib import Path

def test_kratos_import():
    """测试Kratos导入"""
    print("=== 测试Kratos导入 ===")
    
    try:
        import KratosMultiphysics
        print(f"✅ KratosMultiphysics导入成功")
        print(f"   版本: {KratosMultiphysics.GetVersionString()}")
        
        from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
        print("✅ StructuralMechanicsApplication导入成功")
        
        return True
        
    except Exception as e:
        print(f"❌ Kratos导入失败: {e}")
        return False

def test_stage_files():
    """测试阶段文件"""
    print("\n=== 测试阶段文件 ===")
    
    stage_dir = Path("multi_stage_kratos_conversion/stage_1")
    
    # 检查文件存在性
    files_to_check = [
        "ProjectParameters.json",
        "materials.json", 
        "stage_1_analysis.mdpa"
    ]
    
    for filename in files_to_check:
        filepath = stage_dir / filename
        if filepath.exists():
            size = filepath.stat().st_size
            print(f"✅ {filename}: {size:,} bytes")
        else:
            print(f"❌ {filename}: 文件不存在")
            return False
    
    return True

def test_json_format():
    """测试JSON文件格式"""
    print("\n=== 测试JSON文件格式 ===")
    
    import json
    
    stage_dir = Path("multi_stage_kratos_conversion/stage_1")
    
    # 测试ProjectParameters.json
    try:
        with open(stage_dir / "ProjectParameters.json", 'r', encoding='utf-8') as f:
            params = json.load(f)
        print("✅ ProjectParameters.json格式正确")
    except Exception as e:
        print(f"❌ ProjectParameters.json格式错误: {e}")
        return False
    
    # 测试materials.json
    try:
        with open(stage_dir / "materials.json", 'r', encoding='utf-8') as f:
            materials = json.load(f)
        print("✅ materials.json格式正确")
        print(f"   材料数量: {len(materials.get('properties', []))}")
    except Exception as e:
        print(f"❌ materials.json格式错误: {e}")
        return False
    
    return True

def main():
    """主函数"""
    print("多阶段FPN到Kratos转换 - 简单测试")
    print("=" * 50)
    
    # 测试1: Kratos导入
    kratos_ok = test_kratos_import()
    
    # 测试2: 文件存在性
    files_ok = test_stage_files()
    
    # 测试3: JSON格式
    json_ok = test_json_format()
    
    print("\n" + "=" * 50)
    print("测试结果总结:")
    print(f"  Kratos导入: {'✅' if kratos_ok else '❌'}")
    print(f"  文件完整性: {'✅' if files_ok else '❌'}")
    print(f"  JSON格式: {'✅' if json_ok else '❌'}")
    
    if kratos_ok and files_ok and json_ok:
        print("\n🎉 所有基础测试通过！可以尝试运行Kratos分析。")
        return True
    else:
        print("\n⚠️ 存在问题，需要修复后再运行分析。")
        return False

if __name__ == "__main__":
    main()
