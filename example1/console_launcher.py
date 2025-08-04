#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深基坑工程有限元分析系统 - 控制台启动器
完全兼容Windows控制台
"""

import os
import sys
import time
import json
import subprocess
from pathlib import Path
from datetime import datetime

def clear_screen():
    """清屏"""
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    """打印系统标题"""
    print("=" * 70)
    print()
    print("    深基坑工程有限元分析系统 v2.0")
    print("    Deep Excavation Finite Element Analysis System")
    print()
    print("    基于: PyVista + GMSH + 有限元分析")
    print("    适用: 软土地区深基坑工程计算")
    print()
    print("=" * 70)

def print_project_info():
    """显示工程参数"""
    print("\n>> 工程规模")
    print("   计算域: 500m x 500m x 30m 土体")
    print("   基坑: 200m x 200m x 15m 开挖")
    print("   围护: 1.0m厚地连墙 x 22m深")
    print("   土层: 5层软土 + Mohr-Coulomb本构")
    print("   网格: GMSH四面体 (0.3m -> 1.0m渐变)")

def print_analysis_stages():
    """显示分析阶段"""
    print("\n>> 计算阶段")
    print("   阶段1: 地应力平衡 - 建立初始应力场")
    print("   阶段2: 地连墙施工 - 激活围护结构")
    print("   阶段3: 第一层开挖 - 开挖至-5m深度")
    print("   阶段4: 第二层开挖 - 开挖至-10m深度")
    print("   阶段5: 最终开挖 - 开挖至-15m深度")

def check_environment():
    """检查运行环境"""
    print("\n>> 环境检查")
    
    # Python版本
    python_version = sys.version_info
    if python_version >= (3, 8):
        print(f"   [OK] Python {python_version.major}.{python_version.minor}.{python_version.micro}")
        env_ok = True
    else:
        print(f"   [NG] Python版本过低: {python_version.major}.{python_version.minor}")
        env_ok = False
    
    # 核心模块
    required_modules = [
        ("numpy", "数值计算"),
        ("pyvista", "3D可视化"),
        ("scipy", "科学计算"),
        ("matplotlib", "结果绘图")
    ]
    
    for module, desc in required_modules:
        try:
            __import__(module)
            print(f"   [OK] {module:<12} - {desc}")
        except ImportError:
            print(f"   [NG] {module:<12} - {desc} (未安装)")
            env_ok = False
    
    # 可选模块
    print("\n>> 增强模块")
    optional_modules = [
        ("gmsh", "网格生成"),
        ("meshio", "格式转换")
    ]
    
    for module, desc in optional_modules:
        try:
            __import__(module)
            print(f"   [OK] {module:<12} - {desc}")
        except ImportError:
            print(f"   [--] {module:<12} - {desc} (可选)")
    
    return env_ok

def check_project_files():
    """检查项目文件"""
    print("\n>> 项目文件")
    
    files = [
        ("pyvista_soft_soil_excavation.py", "主分析程序"),
        ("test_pyvista_excavation.py", "功能测试"),
        ("requirements_pyvista.txt", "依赖清单")
    ]
    
    all_ok = True
    for filename, desc in files:
        if Path(filename).exists():
            size = Path(filename).stat().st_size / 1024
            print(f"   [OK] {filename:<30} ({size:.1f}KB)")
        else:
            print(f"   [NG] {filename:<30} (缺失)")
            all_ok = False
    
    return all_ok

def show_results_summary():
    """显示结果摘要"""
    output_dir = Path("output/pyvista_excavation")
    summary_file = output_dir / "analysis_summary.json"
    
    if summary_file.exists():
        try:
            with open(summary_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            print("\n>> 最新分析结果")
            if "max_values" in data:
                values = data["max_values"]
                print(f"   最大位移: {values.get('max_displacement_mm', 0):.1f} mm")
                print(f"   最大应力: {values.get('max_stress_kPa', 0):.1f} kPa")
                print(f"   最大沉降: {values.get('max_settlement_mm', 0):.1f} mm")
            
            if "project_info" in data:
                print(f"   分析时间: {data['project_info'].get('analysis_date', 'N/A')}")
                
        except Exception as e:
            print(f"\n>> 结果文件读取失败: {e}")
    else:
        print("\n>> 暂无分析结果")

def show_menu():
    """显示操作菜单"""
    print("\n" + "=" * 70)
    print("操作菜单")
    print("=" * 70)
    print()
    print("   1. 运行环境测试     - 验证所有功能模块")
    print("   2. 启动完整分析     - 执行深基坑计算")
    print("   3. 查看分析结果     - 浏览计算结果")
    print("   4. 系统配置信息     - 查看参数设置")
    print("   5. 帮助说明        - 使用指南")
    print()
    print("   0. 退出程序")
    print()

def run_test():
    """运行测试"""
    clear_screen()
    print("系统功能测试")
    print("=" * 50)
    
    print("\n正在启动测试模块...")
    time.sleep(1)
    
    try:
        result = subprocess.run([sys.executable, "test_pyvista_excavation.py"], 
                              capture_output=True, text=True, encoding='utf-8')
        
        if result.returncode == 0:
            print("\n[成功] 所有测试通过")
        else:
            print("\n[失败] 测试发现问题")
            if result.stderr:
                print(f"错误: {result.stderr}")
                
    except Exception as e:
        print(f"\n[异常] 测试执行失败: {e}")
    
    input("\n按Enter键返回...")

def run_analysis():
    """运行分析"""
    clear_screen()
    print("深基坑有限元分析")
    print("=" * 50)
    
    print("\n即将开始分析:")
    print("   工程规模: 500x500x30m")
    print("   基坑规模: 200x200x15m")
    print("   预计时间: 5-15分钟")
    
    choice = input("\n确认开始分析? (y/N): ").lower().strip()
    
    if choice in ['y', 'yes']:
        print("\n正在初始化...")
        time.sleep(1)
        print("正在生成网格...")
        time.sleep(2)
        
        try:
            print("\n[计算中] 正在执行有限元分析...")
            result = subprocess.run([sys.executable, "pyvista_soft_soil_excavation.py"])
            
            if result.returncode == 0:
                print("\n[完成] 分析成功!")
                print("结果保存在: output/pyvista_excavation/")
            else:
                print("\n[失败] 分析过程出错")
                
        except Exception as e:
            print(f"\n[异常] 执行失败: {e}")
    else:
        print("\n分析已取消")
    
    input("\n按Enter键返回...")

def view_results():
    """查看结果"""
    clear_screen()
    print("分析结果查看")
    print("=" * 50)
    
    output_dir = Path("output/pyvista_excavation")
    
    if not output_dir.exists():
        print("\n暂无分析结果")
        print("请先执行有限元分析")
    else:
        summary_file = output_dir / "analysis_summary.json"
        
        if summary_file.exists():
            try:
                with open(summary_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                print("\n计算结果摘要:")
                
                if "project_info" in data:
                    info = data["project_info"]
                    print(f"   项目: {info.get('name', 'N/A')}")
                    print(f"   时间: {info.get('analysis_date', 'N/A')}")
                
                if "max_values" in data:
                    values = data["max_values"]
                    print(f"\n关键指标:")
                    print(f"   最大位移: {values.get('max_displacement_mm', 0):.2f} mm")
                    print(f"   最大应力: {values.get('max_stress_kPa', 0):.1f} kPa")
                    print(f"   最大沉降: {values.get('max_settlement_mm', 0):.2f} mm")
                
                # VTK文件
                vtk_count = len(list(output_dir.glob("*.vtk")))
                if vtk_count > 0:
                    print(f"\nVTK结果文件: {vtk_count} 个")
                    print("可用PyVista/ParaView查看")
                
            except Exception as e:
                print(f"\n读取结果失败: {e}")
        else:
            print("\n未找到分析摘要文件")
    
    input("\n按Enter键返回...")

def show_config():
    """显示配置"""
    clear_screen()
    print("系统配置参数")
    print("=" * 50)
    
    print("\n几何参数:")
    print("   土体域: 500m x 500m x 30m")
    print("   基坑: 200m x 200m x 15m")
    print("   地连墙: 1.0m厚 x 22m深")
    
    print("\n网格参数:")
    print("   类型: 四面体单元")
    print("   尺寸: 0.3m (基坑) -> 1.0m (远场)")
    print("   生成: GMSH自适应")
    
    print("\n材料参数:")
    print("   土层1: E=4MPa, phi=10°, c=8kPa")
    print("   土层2: E=2.5MPa, phi=8°, c=12kPa")
    print("   土层3: E=6MPa, phi=12°, c=18kPa")
    print("   土层4: E=12MPa, phi=16°, c=25kPa")
    print("   土层5: E=20MPa, phi=22°, c=15kPa")
    print("   地连墙: E=30000MPa (C30混凝土)")
    
    print("\n分析设置:")
    print("   本构: Mohr-Coulomb弹塑性")
    print("   求解: Newton-Raphson迭代")
    print("   阶段: 5个施工阶段")
    
    input("\n按Enter键返回...")

def show_help():
    """显示帮助"""
    clear_screen()
    print("使用帮助")
    print("=" * 50)
    
    print("\n快速开始:")
    print("   1. 运行环境测试确保依赖完整")
    print("   2. 启动完整分析执行计算")
    print("   3. 查看结果了解分析成果")
    
    print("\n环境要求:")
    print("   Python 3.8+")
    print("   numpy, pyvista, scipy")
    print("   8GB+ 内存推荐")
    
    print("\n结果文件:")
    print("   VTK: 可视化结果文件")
    print("   JSON: 数值结果摘要")
    print("   MSH: 网格文件")
    
    print("\n技术支持:")
    print("   查看源码注释")
    print("   参考配置文件")
    print("   检查依赖安装")
    
    input("\n按Enter键返回...")

def main():
    """主程序"""
    while True:
        clear_screen()
        print_header()
        print_project_info()
        print_analysis_stages()
        
        env_ok = check_environment()
        files_ok = check_project_files()
        
        show_results_summary()
        
        if not (env_ok and files_ok):
            print("\n[警告] 系统环境不完整")
        
        show_menu()
        
        try:
            choice = input("请选择操作 (0-5): ").strip()
            
            if choice == '1':
                run_test()
            elif choice == '2':
                if env_ok and files_ok:
                    run_analysis()
                else:
                    print("\n环境检查未通过")
                    input("按Enter键继续...")
            elif choice == '3':
                view_results()
            elif choice == '4':
                show_config()
            elif choice == '5':
                show_help()
            elif choice == '0':
                print("\n系统退出")
                break
            else:
                print("\n输入无效")
                time.sleep(1)
                
        except KeyboardInterrupt:
            print("\n\n程序中断")
            break
        except Exception as e:
            print(f"\n系统异常: {e}")
            input("按Enter键继续...")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n启动器异常: {e}")
        input("按Enter键退出...")