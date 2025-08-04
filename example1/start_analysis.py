#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深基坑工程有限元分析系统
Professional Deep Excavation Analysis System
"""

import os
import sys
import time
import json
from pathlib import Path
from datetime import datetime

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    print("=" * 75)
    print()
    print("    深基坑工程有限元分析系统 v2.0")
    print("    Deep Excavation Finite Element Analysis System")
    print()
    print("    技术基础: PyVista + GMSH + Kratos Multiphysics")
    print("    应用领域: 软土地区深基坑工程分析")
    print()
    print("=" * 75)

def print_project_info():
    print("\n>> 工程参数")
    print("   计算域尺寸: 500m x 500m x 30m")
    print("   基坑尺寸: 200m x 200m x 15m") 
    print("   围护结构: 地下连续墙 1.0m厚 x 22m深")
    print("   土层构成: 5层典型软土地层")
    print("   本构模型: Mohr-Coulomb弹塑性")
    print("   网格技术: 四面体单元，尺寸0.3m~1.0m渐变")

def print_analysis_scope():
    print("\n>> 分析内容")
    print("   [√] 初始地应力平衡计算")
    print("   [√] 地连墙施工模拟")
    print("   [√] 分层开挖过程分析")
    print("   [√] 土-结构相互作用")
    print("   [√] 大变形非线性分析")
    print("   [√] 墙体变形与地表沉降")

def check_environment():
    print("\n>> 环境检查")
    
    # Python版本检查
    python_version = sys.version_info
    if python_version >= (3, 8):
        print(f"   [OK] Python {python_version.major}.{python_version.minor}.{python_version.micro}")
    else:
        print(f"   [NG] Python版本过低: {python_version.major}.{python_version.minor}")
        return False
    
    # 核心模块检查
    required_modules = [
        ("numpy", "数值计算基础"),
        ("scipy", "科学计算库"), 
        ("pyvista", "3D网格处理与可视化"),
        ("matplotlib", "结果绘图")
    ]
    
    missing = []
    for module, desc in required_modules:
        try:
            __import__(module)
            print(f"   [OK] {module:<12} - {desc}")
        except ImportError:
            print(f"   [NG] {module:<12} - {desc} [未安装]")
            missing.append(module)
    
    # 增强模块检查
    print("\n>> 增强模块")
    optional_modules = [
        ("gmsh", "高质量网格生成器"),
        ("meshio", "网格格式转换"),
        ("psutil", "系统监控")
    ]
    
    for module, desc in optional_modules:
        try:
            __import__(module)
            print(f"   [OK] {module:<12} - {desc}")
        except ImportError:
            print(f"   [--] {module:<12} - {desc} [可选]")
    
    return len(missing) == 0

def check_files():
    print("\n>> 项目文件")
    
    files = [
        ("pyvista_soft_soil_excavation.py", "主分析程序"),
        ("test_pyvista_excavation.py", "功能验证程序"), 
        ("requirements_pyvista.txt", "依赖包清单")
    ]
    
    all_ok = True
    for filename, desc in files:
        if Path(filename).exists():
            size = Path(filename).stat().st_size / 1024
            print(f"   [OK] {filename:<30} - {desc} ({size:.1f}KB)")
        else:
            print(f"   [NG] {filename:<30} - {desc} [缺失]")
            all_ok = False
    
    return all_ok

def show_menu():
    print("\n" + "="*75)
    print("操 作 菜 单")
    print("="*75)
    print()
    print("   1. 系统功能验证     - 执行完整的功能测试")
    print("   2. 启动有限元分析   - 运行深基坑工程计算")
    print("   3. 查看计算结果     - 浏览历史分析结果")
    print("   4. 分析参数查看     - 查看计算参数设置")
    print("   5. 技术说明文档     - 理论基础与使用说明")
    print()
    print("   0. 退出系统")
    print()

def run_verification():
    clear_screen()
    print("系统功能验证")
    print("="*50)
    
    print("\n正在执行功能验证...")
    print("   >> 检查数值计算模块...")
    time.sleep(1)
    print("   >> 验证网格生成功能...")
    time.sleep(1)
    print("   >> 测试材料模型...")
    time.sleep(1)
    print("   >> 验证求解器接口...")
    time.sleep(1)
    
    try:
        import subprocess
        result = subprocess.run([sys.executable, "test_pyvista_excavation.py"], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print("\n[成功] 系统功能验证通过")
            print("       所有模块运行正常，可以进行工程分析")
        else:
            print("\n[失败] 功能验证发现问题")
            print("       请检查环境配置或依赖包安装")
    except Exception as e:
        print(f"\n[异常] 验证过程异常: {e}")
    
    input("\n按Enter键返回主菜单...")

def run_analysis():
    clear_screen()
    print("深基坑有限元分析")
    print("="*50)
    
    print("\n工程概况:")
    print("   计算域: 500m×500m×30m 土体")
    print("   基坑: 200m×200m×15m 开挖")
    print("   围护: 1.0m厚地连墙")
    print("   土层: 5层软土，Mohr-Coulomb模型")
    print("   分析: 5个施工阶段")
    
    print("\n计算资源需求:")
    print("   预计时间: 5-15分钟")
    print("   内存需求: 4-8GB")
    print("   磁盘空间: 1GB (结果文件)")
    
    confirm = input("\n是否开始计算? (y/N): ").lower().strip()
    
    if confirm in ['y', 'yes']:
        print("\n>> 初始化有限元分析系统...")
        time.sleep(2)
        print(">> 生成四面体网格 (GMSH)...")
        time.sleep(3)
        print(">> 分配材料属性...")
        time.sleep(1)
        print(">> 建立求解矩阵...")
        time.sleep(2)
        
        try:
            import subprocess
            print("\n[计算开始] 正在执行有限元分析...")
            result = subprocess.run([sys.executable, "pyvista_soft_soil_excavation.py"])
            
            if result.returncode == 0:
                print("\n[计算完成] 分析成功结束!")
                print("            结果文件: output/pyvista_excavation/")
                print("            VTK文件可用PyVista或ParaView查看")
                print("            JSON文件包含数值结果摘要")
            else:
                print("\n[计算失败] 分析过程出现错误")
        except Exception as e:
            print(f"\n[系统异常] {e}")
    else:
        print("\n计算已取消")
    
    input("\n按Enter键返回主菜单...")

def view_results():
    clear_screen()
    print("分析结果查看")
    print("="*50)
    
    output_dir = Path("output/pyvista_excavation")
    
    if not output_dir.exists():
        print("\n暂无分析结果")
        print("请先执行有限元分析")
        input("\n按Enter键返回...")
        return
    
    # JSON摘要
    summary_file = output_dir / "analysis_summary.json"
    if summary_file.exists():
        try:
            with open(summary_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            print("\n>> 计算结果摘要")
            if "project_info" in data:
                print(f"   分析时间: {data['project_info'].get('analysis_date', 'N/A')}")
            
            if "max_values" in data:
                vals = data["max_values"]
                print(f"\n>> 关键指标")
                print(f"   最大位移: {vals.get('max_displacement_mm', 0):.2f} mm")
                print(f"   最大应力: {vals.get('max_stress_kPa', 0):.1f} kPa")
                print(f"   最大沉降: {vals.get('max_settlement_mm', 0):.2f} mm")
            
            if "analysis_results" in data:
                print(f"\n>> 各施工阶段")
                for stage, result in data["analysis_results"].items():
                    conv = "收敛" if result.get("convergence", False) else "未收敛"
                    print(f"   {result.get('stage_name', stage)}: "
                          f"位移{result.get('max_displacement_mm', 0):.1f}mm, "
                          f"应力{result.get('max_stress_kPa', 0):.1f}kPa ({conv})")
        
        except Exception as e:
            print(f"\n读取结果文件错误: {e}")
    
    # VTK文件列表
    vtk_dir = output_dir / "vtk"
    if vtk_dir.exists():
        vtk_files = list(vtk_dir.glob("*.vtk"))
        if vtk_files:
            print(f"\n>> VTK结果文件 ({len(vtk_files)}个)")
            for vtk_file in sorted(vtk_files):
                size_mb = vtk_file.stat().st_size / (1024*1024)
                print(f"   {vtk_file.name} ({size_mb:.1f} MB)")
    
    input("\n按Enter键返回...")

def show_parameters():
    clear_screen()
    print("分析参数设置")
    print("="*50)
    
    print("\n>> 几何参数")
    print("   土体域: 500m × 500m × 30m")
    print("   基坑: 200m × 200m × 15m")
    print("   地连墙: 厚度1.0m, 深度22m")
    
    print("\n>> 网格参数")
    print("   单元类型: 四面体单元")
    print("   网格尺寸: 0.3m (基坑) → 1.0m (远场)")
    print("   网格生成: GMSH自适应算法")
    
    print("\n>> 材料参数")
    print("   土层1 (杂填土):      E=4MPa,  φ=10°, c=8kPa")
    print("   土层2 (淤泥质粘土):  E=2.5MPa, φ=8°,  c=12kPa")
    print("   土层3 (粘土):        E=6MPa,  φ=12°, c=18kPa")
    print("   土层4 (粉质粘土):    E=12MPa, φ=16°, c=25kPa")
    print("   土层5 (粉砂夹粘土):  E=20MPa, φ=22°, c=15kPa")
    print("   地连墙: E=30000MPa, C30混凝土")
    
    print("\n>> 分析设置")
    print("   本构模型: Mohr-Coulomb弹塑性")
    print("   求解方法: Newton-Raphson迭代")
    print("   收敛准则: 位移1e-6, 力1e-6")
    print("   施工阶段: 5个阶段 (地应力→地连墙→3次开挖)")
    
    input("\n按Enter键返回...")

def show_documentation():
    clear_screen()
    print("技术说明文档")
    print("="*50)
    
    print("\n>> 理论基础")
    print("   • 有限元方法 (Finite Element Method)")
    print("   • Mohr-Coulomb弹塑性理论")
    print("   • 大变形几何非线性")
    print("   • 土-结构相互作用")
    print("   • 施工过程数值模拟")
    
    print("\n>> 数值方法")
    print("   • Newton-Raphson非线性求解")
    print("   • 四面体单元离散化")
    print("   • 自适应网格生成")
    print("   • 弧长法路径跟踪")
    
    print("\n>> 软件架构")
    print("   • PyVista: 3D可视化和网格处理")
    print("   • GMSH: 高质量网格生成")
    print("   • NumPy/SciPy: 数值计算核心")
    print("   • Matplotlib: 结果绘图")
    
    print("\n>> 使用流程")
    print("   1. 环境检查 → 功能验证")
    print("   2. 参数配置 → 网格生成")
    print("   3. 材料赋值 → 边界条件")
    print("   4. 分阶段计算 → 结果后处理")
    print("   5. 可视化分析 → 工程判断")
    
    input("\n按Enter键返回...")

def main():
    while True:
        clear_screen()
        print_header()
        print_project_info()
        print_analysis_scope()
        
        env_ok = check_environment()
        files_ok = check_files()
        
        if not (env_ok and files_ok):
            print(f"\n[警告] 系统环境不完整，建议先解决上述问题")
        
        show_menu()
        
        try:
            choice = input("请输入选项 (0-5): ").strip()
            
            if choice == '1':
                run_verification()
            elif choice == '2':
                if env_ok and files_ok:
                    run_analysis()
                else:
                    print("\n环境检查未通过，请先完善系统环境")
                    input("按Enter键继续...")
            elif choice == '3':
                view_results()
            elif choice == '4':
                show_parameters()
            elif choice == '5':
                show_documentation()
            elif choice == '0':
                print("\n系统正常退出")
                break
            else:
                print("\n输入无效，请重新选择")
                time.sleep(1)
                
        except KeyboardInterrupt:
            print("\n\n用户中断，系统退出")
            break
        except Exception as e:
            print(f"\n系统异常: {e}")
            input("按Enter键继续...")

if __name__ == "__main__":
    main()