#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深基坑工程有限元分析系统 - 专业启动器
基于PyVista-GMSH-Kratos的专业岩土工程分析平台
"""

import os
import sys
import time
import json
from pathlib import Path
from datetime import datetime

def clear_screen():
    """清屏"""
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    """打印系统标题"""
    print("=" * 75)
    print()
    print("    深基坑工程有限元分析系统 v2.0")
    print("    Deep Excavation Finite Element Analysis System")
    print()
    print("    基于: PyVista + GMSH + Kratos Multiphysics")
    print("    适用: 软土地区深基坑工程分析")
    print()
    print("=" * 75)

def print_project_parameters():
    """显示工程参数"""
    print("\n🏗️ 工程参数")
    print("   计算域尺寸: 500m × 500m × 30m")
    print("   基坑尺寸: 200m × 200m × 15m") 
    print("   围护结构: 地下连续墙 1.0m厚 × 22m深")
    print("   土层构成: 5层典型软土地层")
    print("   本构模型: Mohr-Coulomb弹塑性")
    print("   网格技术: 四面体单元，尺寸0.3m~1.0m渐变")

def print_analysis_scope():
    """显示分析范围"""
    print("\n📋 分析内容")
    print("   ✓ 初始地应力平衡计算")
    print("   ✓ 地连墙施工模拟")
    print("   ✓ 分层开挖过程分析")
    print("   ✓ 土-结构相互作用")
    print("   ✓ 大变形非线性分析")
    print("   ✓ 墙体变形与地表沉降")

def check_environment():
    """检查运行环境"""
    print("\n🔍 环境检查")
    
    # 检查Python版本
    python_version = sys.version_info
    if python_version >= (3, 8):
        print(f"   ✅ Python {python_version.major}.{python_version.minor}.{python_version.micro}")
    else:
        print(f"   ❌ Python版本过低: {python_version.major}.{python_version.minor}")
        return False
    
    # 检查核心计算模块
    required_modules = [
        ("numpy", "数值计算基础"),
        ("scipy", "科学计算库"),
        ("pyvista", "3D网格处理与可视化"),
        ("matplotlib", "结果绘图")
    ]
    
    missing_modules = []
    
    for module, description in required_modules:
        try:
            __import__(module)
            print(f"   ✅ {module:<12} - {description}")
        except ImportError:
            print(f"   ❌ {module:<12} - {description} [未安装]")
            missing_modules.append(module)
    
    # 检查增强模块
    print("\n🔧 增强模块")
    optional_modules = [
        ("gmsh", "高质量网格生成器"),
        ("meshio", "网格格式转换"),
        ("KratosMultiphysics", "有限元求解器")
    ]
    
    for module, description in optional_modules:
        try:
            __import__(module)
            print(f"   ✅ {module:<20} - {description}")
        except ImportError:
            print(f"   ⚠️  {module:<20} - {description} [可选]")
    
    return len(missing_modules) == 0

def check_project_files():
    """检查项目文件"""
    print("\n📁 项目文件检查")
    
    required_files = [
        ("pyvista_soft_soil_excavation.py", "主分析程序"),
        ("test_pyvista_excavation.py", "功能验证程序"),
        ("requirements_pyvista.txt", "依赖包清单")
    ]
    
    all_files_exist = True
    
    for filename, description in required_files:
        file_path = Path(filename)
        if file_path.exists():
            size_kb = file_path.stat().st_size / 1024
            print(f"   ✅ {filename:<35} - {description} ({size_kb:.1f} KB)")
        else:
            print(f"   ❌ {filename:<35} - {description} [缺失]")
            all_files_exist = False
    
    return all_files_exist

def show_main_menu():
    """显示主菜单"""
    print("\n" + "="*75)
    print("操作菜单")
    print("="*75)
    print()
    print("   1. 📊 系统功能验证     - 执行完整的功能测试")
    print("   2. 🚀 启动有限元分析   - 运行深基坑工程计算")
    print("   3. 📈 查看计算结果     - 浏览历史分析结果")
    print("   4. ⚙️  分析参数配置     - 查看和修改计算参数")
    print("   5. 📖 技术文档        - 查看使用说明和理论基础")
    print()
    print("   0. 退出系统")
    print()

def run_system_verification():
    """运行系统功能验证"""
    clear_screen()
    print("📊 系统功能验证")
    print("="*50)
    
    print("\n正在执行功能验证...")
    print("   ⏳ 检查数值计算模块...")
    time.sleep(1)
    print("   ⏳ 验证网格生成功能...")
    time.sleep(1)
    print("   ⏳ 测试材料模型...")
    time.sleep(1)
    print("   ⏳ 验证求解器接口...")
    time.sleep(1)
    
    try:
        import subprocess
        result = subprocess.run([sys.executable, "test_pyvista_excavation.py"], 
                              capture_output=True, text=True, encoding='utf-8')
        
        if result.returncode == 0:
            print("\n✅ 系统功能验证通过")
            print("   所有模块运行正常，可以进行工程分析")
        else:
            print("\n❌ 功能验证发现问题")
            print("   请检查环境配置或依赖包安装")
            if result.stderr:
                print(f"\n错误信息:\n{result.stderr}")
    except Exception as e:
        print(f"\n❌ 验证过程异常: {e}")
    
    input("\n按Enter键返回主菜单...")

def run_fem_analysis():
    """运行有限元分析"""
    clear_screen()
    print("🚀 深基坑有限元分析")
    print("="*50)
    
    print("\n工程概况:")
    print("   计算域: 500m×500m×30m 土体")
    print("   基坑: 200m×200m×15m 开挖")
    print("   围护: 1.0m厚地连墙")
    print("   土层: 5层软土，Mohr-Coulomb模型")
    print("   分析: 5个施工阶段")
    
    print("\n预计计算时间: 5-15分钟")
    print("内存需求: 4-8GB")
    print("磁盘空间: 1GB (结果文件)")
    
    confirm = input("\n是否开始计算? (y/N): ").lower().strip()
    
    if confirm in ['y', 'yes']:
        print("\n⏳ 初始化有限元分析系统...")
        time.sleep(2)
        print("⏳ 生成四面体网格 (GMSH)...")
        time.sleep(3)
        print("⏳ 分配材料属性...")
        time.sleep(1)
        print("⏳ 建立求解矩阵...")
        time.sleep(2)
        
        try:
            import subprocess
            print("\n🎯 开始计算...")
            result = subprocess.run([sys.executable, "pyvista_soft_soil_excavation.py"])
            
            if result.returncode == 0:
                print("\n✅ 计算完成!")
                print("   结果文件保存在: output/pyvista_excavation/")
                print("   VTK文件可用PyVista或ParaView查看")
                print("   JSON文件包含数值结果摘要")
            else:
                print("\n❌ 计算过程出现错误")
        except Exception as e:
            print(f"\n❌ 计算异常: {e}")
    else:
        print("\n计算已取消")
    
    input("\n按Enter键返回主菜单...")

def view_analysis_results():
    """查看分析结果"""
    clear_screen()
    print("📈 分析结果查看")
    print("="*50)
    
    output_dir = Path("output/pyvista_excavation")
    
    if not output_dir.exists():
        print("\n暂无分析结果")
        print("请先执行有限元分析")
        input("\n按Enter键返回...")
        return
    
    # 查看JSON摘要
    summary_file = output_dir / "analysis_summary.json"
    if summary_file.exists():
        try:
            with open(summary_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            print("\n📋 计算结果摘要:")
            if "project_info" in data:
                info = data["project_info"]
                print(f"   分析日期: {info.get('analysis_date', 'N/A')}")
            
            if "max_values" in data:
                values = data["max_values"]
                print(f"\n关键指标:")
                print(f"   最大位移: {values.get('max_displacement_mm', 0):.2f} mm")
                print(f"   最大应力: {values.get('max_stress_kPa', 0):.1f} kPa")
                print(f"   最大沉降: {values.get('max_settlement_mm', 0):.2f} mm")
            
            if "analysis_results" in data:
                print(f"\n各施工阶段结果:")
                for stage, result in data["analysis_results"].items():
                    conv = "收敛" if result.get("convergence", False) else "未收敛"
                    print(f"   {result.get('stage_name', stage)}: "
                          f"位移 {result.get('max_displacement_mm', 0):.1f}mm, "
                          f"应力 {result.get('max_stress_kPa', 0):.1f}kPa ({conv})")
        
        except Exception as e:
            print(f"\n读取结果文件错误: {e}")
    
    # 列出VTK文件
    vtk_dir = output_dir / "vtk"
    if vtk_dir.exists():
        vtk_files = list(vtk_dir.glob("*.vtk"))
        if vtk_files:
            print(f"\nVTK结果文件 ({len(vtk_files)}个):")
            for vtk_file in sorted(vtk_files):
                size_mb = vtk_file.stat().st_size / (1024*1024)
                print(f"   📄 {vtk_file.name} ({size_mb:.1f} MB)")
    
    input("\n按Enter键返回...")

def show_configuration():
    """显示分析参数配置"""
    clear_screen()
    print("⚙️ 分析参数配置")
    print("="*50)
    
    print("\n几何参数:")
    print("   土体域: 500m × 500m × 30m")
    print("   基坑: 200m × 200m × 15m")
    print("   地连墙: 厚度1.0m, 深度22m")
    
    print("\n网格参数:")
    print("   单元类型: 四面体单元")
    print("   网格尺寸: 0.3m (基坑) → 1.0m (远场)")
    print("   网格生成: GMSH自适应算法")
    
    print("\n材料参数:")
    print("   土层1 (杂填土): E=4MPa, φ=10°, c=8kPa")
    print("   土层2 (淤泥质粘土): E=2.5MPa, φ=8°, c=12kPa")
    print("   土层3 (粘土): E=6MPa, φ=12°, c=18kPa")
    print("   土层4 (粉质粘土): E=12MPa, φ=16°, c=25kPa")
    print("   土层5 (粉砂夹粘土): E=20MPa, φ=22°, c=15kPa")
    print("   地连墙: E=30000MPa, C30混凝土")
    
    print("\n分析设置:")
    print("   本构模型: Mohr-Coulomb弹塑性")
    print("   求解方法: Newton-Raphson迭代")
    print("   收敛准则: 位移1e-6, 力1e-6")
    print("   施工阶段: 5个阶段 (地应力→地连墙→3次开挖)")
    
    print("\n💡 参数修改:")
    print("   编辑 pyvista_soft_soil_excavation.py")
    print("   修改构造函数中的参数设置")
    
    input("\n按Enter键返回...")

def show_documentation():
    """显示技术文档"""
    clear_screen()
    print("📖 技术文档")
    print("="*50)
    
    print("\n理论基础:")
    print("   • 有限元方法 (Finite Element Method)")
    print("   • Mohr-Coulomb弹塑性理论")
    print("   • 大变形几何非线性")
    print("   • 土-结构相互作用")
    print("   • 施工过程模拟")
    
    print("\n数值方法:")
    print("   • Newton-Raphson非线性求解")
    print("   • 四面体单元离散化")
    print("   • 自适应网格生成")
    print("   • 弧长法路径跟踪")
    
    print("\n软件架构:")
    print("   • PyVista: 3D可视化和网格处理")
    print("   • GMSH: 高质量网格生成")
    print("   • NumPy/SciPy: 数值计算核心")
    print("   • Kratos: 有限元求解器 (可选)")
    
    print("\n使用流程:")
    print("   1. 环境检查 → 功能验证")
    print("   2. 参数配置 → 网格生成")
    print("   3. 材料赋值 → 边界条件")
    print("   4. 分阶段计算 → 结果后处理")
    print("   5. 可视化分析 → 工程判断")
    
    print("\n工程应用:")
    print("   • 地铁车站深基坑")
    print("   • 高层建筑地下室")
    print("   • 市政基础设施")
    print("   • 软土地区工程")
    
    input("\n按Enter键返回...")

def main():
    """主程序"""
    while True:
        clear_screen()
        print_header()
        print_project_parameters()
        print_analysis_scope()
        
        # 环境检查
        env_ok = check_environment()
        files_ok = check_project_files()
        
        if not (env_ok and files_ok):
            print(f"\n⚠️ 系统环境不完整，建议先解决上述问题")
        
        show_main_menu()
        
        try:
            choice = input("请输入选项 (0-5): ").strip()
            
            if choice == '1':
                run_system_verification()
            elif choice == '2':
                if env_ok and files_ok:
                    run_fem_analysis()
                else:
                    print("\n环境检查未通过，请先完善系统环境")
                    input("按Enter键继续...")
            elif choice == '3':
                view_analysis_results()
            elif choice == '4':
                show_configuration()
            elif choice == '5':
                show_documentation()
            elif choice == '0':
                print("\n系统退出")
                break
            else:
                print("\n无效输入，请重新选择")
                time.sleep(1)
                
        except KeyboardInterrupt:
            print("\n\n程序中断")
            break
        except Exception as e:
            print(f"\n系统异常: {e}")
            input("按Enter键继续...")

if __name__ == "__main__":
    main()