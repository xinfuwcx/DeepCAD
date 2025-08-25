#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
运行两阶段-全锚杆-摩尔库伦.fpn计算并生成结果
"""

import sys
import os
from pathlib import Path

# 设置环境
os.environ['QT_OPENGL'] = 'software'
os.environ['PYTHONIOENCODING'] = 'utf-8'
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def run_fpn_calculation():
    """运行FPN文件计算"""
    print("运行两阶段-全锚杆-摩尔库伦.fpn计算...")
    print("=" * 60)
    
    try:
        # 1. 加载FPN数据
        from optimized_fpn_parser import OptimizedFPNParser
        parser = OptimizedFPNParser()
        
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        if not fpn_file.exists():
            print(f"错误: FPN文件不存在: {fpn_file}")
            return False
        
        fpn_data = parser.parse_file_streaming(str(fpn_file))
        print("FPN数据加载成功")
        
        # 显示模型基本信息
        nodes_count = len(fpn_data.get('nodes', []))
        elements_count = len(fpn_data.get('elements', []))
        materials_count = len(fpn_data.get('materials', []))
        
        print(f"模型信息:")
        print(f"  节点数: {nodes_count:,}")
        print(f"  单元数: {elements_count:,}")
        print(f"  材料数: {materials_count}")
        
        # 2. 创建Kratos接口并运行分析
        from kratos_interface import KratosInterface
        ki = KratosInterface()
        
        print("\\n设置模型...")
        success = ki.setup_model(fpn_data)
        if not success:
            print("错误: 模型设置失败")
            return False
        
        print("模型设置成功")
        
        # 3. 运行分析
        print("\\n开始Kratos分析...")
        result_success, result_data = ki.run_analysis()
        
        if result_success:
            print("计算成功完成!")
            print(f"结果数据键: {list(result_data.keys()) if result_data else 'None'}")
            
            # 检查生成的文件
            output_dirs = [
                Path("temp_kratos_analysis"),
                Path("temp_kratos_final"),
                Path("data/VTK_Output_Stage_1"),
                Path("data/VTK_Output_Stage_2")
            ]
            
            print("\\n检查生成的输出文件:")
            for output_dir in output_dirs:
                if output_dir.exists():
                    files = list(output_dir.glob("*"))
                    print(f"  {output_dir}: {len(files)} 个文件")
                    if files:
                        for f in files[:3]:  # 显示前3个文件
                            print(f"    - {f.name}")
                        if len(files) > 3:
                            print(f"    ... 还有 {len(files)-3} 个文件")
                else:
                    print(f"  {output_dir}: 目录不存在")
            
            return True
        else:
            print("计算失败!")
            print(f"错误信息: {result_data.get('error', '未知错误') if result_data else '无错误信息'}")
            return False
            
    except Exception as e:
        print(f"运行出错: {e}")
        import traceback
        traceback.print_exc()
        return False

def start_gui_postprocessor():
    """启动GUI后处理"""
    print("\\n启动主界面后处理...")
    print("=" * 60)
    
    try:
        from PyQt6.QtWidgets import QApplication
        
        # 创建或获取QApplication
        app = QApplication.instance()
        if app is None:
            app = QApplication(sys.argv)
            app.setApplicationName("Example2 Post-Processing")
        
        # 导入主窗口
        from gui.main_window import MainWindow
        
        # 创建主窗口
        main_window = MainWindow()
        
        # 尝试自动加载计算结果
        try:
            # 检查是否有VTK结果文件
            vtk_dirs = [
                Path("data/VTK_Output_Stage_1"),
                Path("data/VTK_Output_Stage_2")
            ]
            
            for vtk_dir in vtk_dirs:
                if vtk_dir.exists():
                    vtk_files = list(vtk_dir.glob("*.vtk"))
                    if vtk_files:
                        print(f"发现结果文件: {vtk_dir}")
                        # 这里可以添加自动加载结果的逻辑
                        break
        except Exception as e:
            print(f"自动加载结果时出错: {e}")
        
        # 显示主窗口
        main_window.show()
        print("主界面已启动，请在界面中查看后处理结果")
        
        # 运行应用程序
        return app.exec()
        
    except Exception as e:
        print(f"启动GUI失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主函数"""
    print("两阶段-全锚杆-摩尔库伦.fpn 计算与后处理")
    print("=" * 60)
    
    # 1. 运行计算
    calculation_success = run_fpn_calculation()
    
    if calculation_success:
        print("\\n计算完成! 准备启动后处理界面...")
        
        # 询问是否启动GUI
        response = input("\\n是否启动主界面后处理? (y/n): ").lower().strip()
        if response in ['y', 'yes', '是', '']:
            # 2. 启动后处理GUI
            start_gui_postprocessor()
        else:
            print("计算已完成，结果文件已保存。")
            print("可以手动运行 'python start_example2.py' 启动主界面查看结果。")
    else:
        print("\\n计算失败，无法启动后处理。")

if __name__ == "__main__":
    main()