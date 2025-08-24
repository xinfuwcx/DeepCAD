#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
启动Example2的完整且漂亮的主界面
并加载深基坑两阶段分析结果
"""

import sys
import os
from pathlib import Path
import json

# 添加路径
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / "example2"))

def launch_example2_gui():
    """启动Example2主界面"""
    print("🎨 启动Example2完整且漂亮的主界面")
    print("=" * 60)
    
    try:
        # 检查PyQt6
        from PyQt6.QtWidgets import QApplication, QMessageBox
        from PyQt6.QtCore import Qt
        from PyQt6.QtGui import QIcon
        print("✅ PyQt6可用")
        
        # 导入主窗口
        from example2.gui.main_window import MainWindow
        print("✅ 主窗口模块导入成功")
        
        # 创建应用程序
        app = QApplication(sys.argv)
        app.setApplicationName("DeepCAD - 深基坑分析系统")
        app.setApplicationVersion("2.0")
        
        # 设置应用程序样式
        app.setStyle('Fusion')
        
        # 创建主窗口
        main_window = MainWindow()
        print("✅ 主窗口创建成功")
        
        # 加载我们的分析结果
        results_config_file = "two_stage_analysis_results.json"
        if os.path.exists(results_config_file):
            with open(results_config_file, 'r', encoding='utf-8') as f:
                results_config = json.load(f)
            
            print("📊 加载分析结果配置:")
            print(f"   项目: {results_config['project_name']}")
            print(f"   阶段数: {len(results_config['stages'])}")
            
            # 设置结果路径到主窗口
            try:
                # 尝试设置结果文件路径
                if hasattr(main_window, 'load_analysis_results'):
                    main_window.load_analysis_results(results_config)
                    print("✅ 分析结果已加载到主界面")
                elif hasattr(main_window, 'set_vtk_files'):
                    vtk_files = [stage['vtk_file'] for stage in results_config['stages']]
                    main_window.set_vtk_files(vtk_files)
                    print("✅ VTK文件路径已设置")
                else:
                    print("ℹ️ 主窗口暂不支持自动加载，请手动导入结果文件")
            except Exception as e:
                print(f"⚠️ 结果加载失败: {e}")
        else:
            print("⚠️ 未找到分析结果配置文件")
        
        # 显示主窗口
        main_window.show()
        main_window.raise_()
        main_window.activateWindow()
        
        print("🎉 Example2主界面已启动！")
        print("📁 VTK结果文件位置:")
        print("   阶段1: multi_stage_kratos_conversion/stage_1/VTK_Output/Structure_0_1.vtk")
        print("   阶段2: multi_stage_kratos_conversion/stage_2/VTK_Output/Structure_0_1.vtk")
        print("💡 请在界面中导入这些VTK文件进行结果查看")
        
        # 运行应用程序
        sys.exit(app.exec())
        
    except ImportError as e:
        print(f"❌ 导入失败: {e}")
        print("请确保已安装PyQt6: pip install PyQt6")
        return False
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def copy_results_to_example2():
    """将结果文件复制到example2目录"""
    print("\n📂 复制结果文件到example2目录...")
    
    import shutil
    
    # 源文件路径
    stage1_src = Path("multi_stage_kratos_conversion/stage_1/VTK_Output/Structure_0_1.vtk")
    stage2_src = Path("multi_stage_kratos_conversion/stage_2/VTK_Output/Structure_0_1.vtk")
    
    # 目标目录
    example2_output = Path("example2/output/two_stage_analysis")
    example2_output.mkdir(parents=True, exist_ok=True)
    
    # 复制文件
    if stage1_src.exists():
        stage1_dst = example2_output / "stage1_excavation.vtk"
        shutil.copy2(stage1_src, stage1_dst)
        print(f"✅ 阶段1结果已复制: {stage1_dst}")
    
    if stage2_src.exists():
        stage2_dst = example2_output / "stage2_excavation.vtk"
        shutil.copy2(stage2_src, stage2_dst)
        print(f"✅ 阶段2结果已复制: {stage2_dst}")
    
    # 创建结果索引文件
    results_index = {
        "project_name": "深基坑两阶段开挖分析",
        "analysis_date": "2024-12-19",
        "results": [
            {
                "name": "阶段1 - 初始开挖",
                "file": "stage1_excavation.vtk",
                "description": "第一阶段开挖和支护安装"
            },
            {
                "name": "阶段2 - 进一步开挖", 
                "file": "stage2_excavation.vtk",
                "description": "第二阶段开挖至最终状态"
            }
        ]
    }
    
    index_file = example2_output / "results_index.json"
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(results_index, f, indent=2, ensure_ascii=False)
    
    print(f"✅ 结果索引已创建: {index_file}")
    return example2_output

if __name__ == "__main__":
    # 复制结果文件
    output_dir = copy_results_to_example2()
    
    # 启动主界面
    launch_example2_gui()
