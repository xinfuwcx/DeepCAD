#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
执行方案B：严格按照FPN结果的多阶段分析
"""

import os
import sys
import time
import json
import shutil
from pathlib import Path

def run_stage_analysis(stage_dir: Path, stage_name: str) -> bool:
    """运行单个阶段的分析"""
    print(f"\n🔧 === {stage_name}分析开始 ===")
    
    try:
        # 切换到阶段目录
        original_cwd = os.getcwd()
        os.chdir(stage_dir)
        print(f"📁 工作目录: {stage_dir}")
        
        # 检查必需文件
        required_files = ["ProjectParameters.json", "StructuralMaterials.json"]

        # 检查必需文件是否存在
        for filename in required_files:
            file_path = stage_dir / filename
            if not file_path.exists():
                print(f"❌ 缺少文件: {filename} (路径: {file_path})")
                return False
            else:
                size = file_path.stat().st_size
                print(f"✅ {filename}: {size:,} bytes")

        # 检查MDPA文件
        mdpa_files = list(stage_dir.glob("*.mdpa"))

        if not mdpa_files:
            print(f"❌ 未找到MDPA文件")
            return False

        mdpa_file = mdpa_files[0]
        print(f"✅ 使用MDPA文件: {mdpa_file.name}")

        # 更新ProjectParameters.json中的MDPA文件名
        with open(stage_dir / "ProjectParameters.json", 'r', encoding='utf-8') as f:
            params_dict = json.load(f)

        # 更新模型导入设置中的文件名（去掉.mdpa扩展名）
        mdpa_name_without_ext = mdpa_file.stem
        params_dict['solver_settings']['model_import_settings']['input_filename'] = mdpa_name_without_ext

        # 保存更新后的配置
        with open(stage_dir / "ProjectParameters.json", 'w', encoding='utf-8') as f:
            json.dump(params_dict, f, indent=2, ensure_ascii=False)

        print(f"✅ 更新配置文件中的MDPA文件名: {mdpa_name_without_ext}")
        
        # 导入Kratos
        print(f"\n🔧 导入Kratos模块...")
        import KratosMultiphysics
        from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
        
        # 读取参数
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
        
        # 创建Kratos参数对象
        parameters = KratosMultiphysics.Parameters(params_text)
        
        # 创建分析对象
        print(f"\n🚀 开始{stage_name}计算...")
        start_time = time.time()
        
        analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(parameters)
        
        # 检查VTK输出配置
        vtk_config = params_dict.get('output_processes', {}).get('vtk_output', [])
        if vtk_config:
            vtk_path = vtk_config[0].get('Parameters', {}).get('output_path', 'VTK_Output')
            print(f"📊 VTK输出路径: {vtk_path}")
            
            # 检查应力输出配置
            gauss_vars = vtk_config[0].get('Parameters', {}).get('gauss_point_variables_in_elements', [])
            element_vars = vtk_config[0].get('Parameters', {}).get('element_data_value_variables', [])
            print(f"   高斯点变量: {gauss_vars}")
            print(f"   单元变量: {element_vars}")
        
        # 运行分析
        analysis.Run()
        
        end_time = time.time()
        computation_time = end_time - start_time
        
        print(f"✅ {stage_name}计算完成！")
        print(f"⏱️  计算时间: {computation_time:.2f}秒")
        
        # 检查输出文件
        vtk_output_dir = Path(vtk_path)
        if vtk_output_dir.exists():
            vtk_files = list(vtk_output_dir.glob("*.vtk"))
            print(f"📁 生成VTK文件: {len(vtk_files)}个")
            for vtk_file in vtk_files[:3]:  # 显示前3个
                size = vtk_file.stat().st_size
                print(f"   {vtk_file.name}: {size:,} bytes")
        
        return True
        
    except Exception as e:
        print(f"❌ {stage_name}分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # 恢复工作目录
        os.chdir(original_cwd)

def copy_shared_files(source_dir: Path, target_dirs: list):
    """复制共享文件到各个阶段目录"""
    print("📋 复制共享文件...")
    
    # 需要复制的文件
    shared_files = [
        "StructuralMaterials.json",
        "*.mdpa"
    ]
    
    for target_dir in target_dirs:
        target_dir.mkdir(parents=True, exist_ok=True)
        
        for pattern in shared_files:
            if '*' in pattern:
                # 通配符文件
                for file_path in source_dir.glob(pattern):
                    target_path = target_dir / file_path.name
                    shutil.copy2(file_path, target_path)
                    print(f"   复制: {file_path.name} -> {target_dir.name}/")
            else:
                # 具体文件
                source_file = source_dir / pattern
                if source_file.exists():
                    target_file = target_dir / pattern
                    shutil.copy2(source_file, target_file)
                    print(f"   复制: {pattern} -> {target_dir.name}/")

def main():
    """主函数"""
    print("🚀 方案B：严格按照FPN结果的多阶段分析")
    print("=" * 60)
    
    # 1. 运行FPN到Kratos转换
    print("🔄 步骤1: 运行FPN到Kratos转换...")
    try:
        import multi_stage_fpn_to_kratos_v2
        success = multi_stage_fpn_to_kratos_v2.main()
        if not success:
            print("❌ FPN转换失败")
            return False
    except Exception as e:
        print(f"❌ FPN转换失败: {e}")
        return False
    
    # 2. 检查生成的目录
    base_dir = Path("multi_stage_kratos_v2").absolute()
    if not base_dir.exists():
        print(f"❌ 转换目录不存在: {base_dir}")
        return False

    stage_dirs = list(base_dir.glob("stage_*"))
    if not stage_dirs:
        print("❌ 未找到阶段目录")
        return False

    stage_dirs.sort()  # 按名称排序
    print(f"📂 发现阶段目录: {[d.name for d in stage_dirs]}")
    print(f"📁 基础目录: {base_dir}")
    
    # 3. 复制共享文件
    # 假设从现有的multi_stage_kratos_conversion目录复制
    source_dir = Path("multi_stage_kratos_conversion/stage_1")
    if source_dir.exists():
        copy_shared_files(source_dir, stage_dirs)
    else:
        print("⚠️ 未找到源文件目录，请手动复制MDPA和材料文件")
    
    # 4. 运行各阶段分析
    results = {}
    
    for i, stage_dir in enumerate(stage_dirs, 1):
        stage_name = f"阶段{i}"
        success = run_stage_analysis(stage_dir, stage_name)
        
        results[stage_name] = {
            'success': success,
            'directory': str(stage_dir)
        }
        
        if not success:
            print(f"❌ {stage_name}分析失败，停止后续分析")
            break
    
    # 5. 总结结果
    print(f"\n📊 === 分析结果总结 ===")
    for stage_name, result in results.items():
        status = "✅ 成功" if result['success'] else "❌ 失败"
        print(f"   {stage_name}: {status}")
    
    # 6. 更新界面配置
    if all(r['success'] for r in results.values()):
        print(f"\n🎯 更新界面配置...")
        update_interface_config(stage_dirs)
        print(f"✅ 所有阶段分析完成！可以启动界面查看结果。")
        return True
    else:
        print(f"❌ 部分阶段分析失败")
        return False

def update_interface_config(stage_dirs: list):
    """更新界面配置以指向新的结果文件"""
    try:
        # 更新auto_load_results.py中的路径
        config_updates = {}
        
        for i, stage_dir in enumerate(stage_dirs, 1):
            vtk_files = list(stage_dir.glob("data/VTK_Output_*/Structure_*.vtk"))
            if vtk_files:
                config_updates[f'stage_{i}'] = str(vtk_files[0].absolute())
        
        print(f"   发现结果文件: {len(config_updates)}个")
        for stage, path in config_updates.items():
            print(f"     {stage}: {Path(path).name}")
        
    except Exception as e:
        print(f"⚠️ 界面配置更新失败: {e}")

if __name__ == "__main__":
    main()
