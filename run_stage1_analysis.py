#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
运行Stage 1分析的详细脚本
"""

import os
import sys
import time
import json
from pathlib import Path

def run_stage1_analysis():
    """运行Stage 1分析"""
    print("🚀 多阶段FPN到Kratos转换 - Stage 1分析")
    print("=" * 60)
    
    # 切换到stage_1目录
    stage1_dir = Path("multi_stage_kratos_conversion/stage_1")
    if not stage1_dir.exists():
        print(f"❌ Stage 1目录不存在: {stage1_dir}")
        return False
    
    os.chdir(stage1_dir)
    print(f"📁 工作目录: {os.getcwd()}")
    
    # 检查必需文件
    required_files = ["ProjectParameters.json", "materials.json", "stage_1_analysis.mdpa"]
    for filename in required_files:
        if not Path(filename).exists():
            print(f"❌ 缺少文件: {filename}")
            return False
        else:
            size = Path(filename).stat().st_size
            print(f"✅ {filename}: {size:,} bytes")
    
    try:
        # 1. 导入Kratos
        print("\n🔧 导入Kratos模块...")
        import KratosMultiphysics
        print("✅ KratosMultiphysics导入成功")
        
        from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
        print("✅ StructuralMechanicsApplication导入成功")
        
        # 2. 读取参数文件
        print("\n📖 读取ProjectParameters.json...")
        with open('ProjectParameters.json', 'r', encoding='utf-8') as f:
            params_text = f.read()
        
        # 验证JSON格式
        try:
            params_dict = json.loads(params_text)
            print("✅ JSON格式验证通过")
            print(f"   求解器类型: {params_dict.get('solver_settings', {}).get('solver_type', '未知')}")
            print(f"   分析类型: {params_dict.get('problem_data', {}).get('problem_name', '未知')}")
        except json.JSONDecodeError as e:
            print(f"❌ JSON格式错误: {e}")
            return False
        
        # 3. 创建Kratos对象
        print("\n🏗️ 创建Kratos模型和分析...")
        model = KratosMultiphysics.Model()
        parameters = KratosMultiphysics.Parameters(params_text)
        
        print("✅ 模型创建成功")
        
        # 4. 初始化分析
        print("\n⚙️ 初始化分析...")
        analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
        print("✅ 分析初始化成功")
        
        # 5. 运行分析
        print("\n🔄 开始运行分析...")
        print("   这可能需要几分钟时间，请耐心等待...")
        
        start_time = time.time()
        
        # 运行分析
        analysis.Run()
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"\n✅ Stage 1分析完成!")
        print(f"⏱️ 分析用时: {duration:.2f}秒")
        
        # 6. 检查输出文件
        print("\n📄 检查输出文件...")
        output_files = list(Path(".").glob("*.vtk")) + list(Path(".").glob("*.vtu")) + list(Path(".").glob("*.post.*"))
        
        if output_files:
            print("✅ 生成的输出文件:")
            for file in output_files:
                size = file.stat().st_size
                print(f"   - {file.name}: {size:,} bytes")
        else:
            print("⚠️ 未找到输出文件，可能需要检查配置")
        
        return True
        
    except Exception as e:
        print(f"\n❌ 分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主函数"""
    original_dir = os.getcwd()
    
    try:
        success = run_stage1_analysis()
        
        if success:
            print("\n🎉 Stage 1分析成功完成!")
            print("📋 下一步可以运行Stage 2分析")
        else:
            print("\n⚠️ Stage 1分析失败，需要检查配置")
            
    finally:
        # 恢复原始工作目录
        os.chdir(original_dir)
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
