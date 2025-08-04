#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PyVista深基坑分析 - 简化启动器
适配Windows环境
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

def print_banner():
    """打印横幅"""
    print("=" * 70)
    print()
    print("    🏗️  PyVista 深基坑工程分析系统 v2.0")
    print("    Professional Deep Excavation Analysis Tool")
    print()
    print("    ✨ 工程规模: 500×500×30m 土体域 | 200×200×15m 基坑")
    print("    ✨ 土层模型: 5层软土 + 摩尔-库伦本构")
    print("    ✨ 网格技术: GMSH渐变网格 (0.3m → 1.0m)")
    print("    ✨ 可视化: PyVista 3D交互式显示")
    print()
    print("=" * 70)

def print_system_info():
    """显示系统信息"""
    import platform
    
    print("\n💻 系统信息")
    print(f"   操作系统: {platform.system()} {platform.release()}")
    print(f"   Python版本: {platform.python_version()}")
    print(f"   当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def check_dependencies():
    """检查依赖包"""
    print("\n🔍 环境检查")
    
    required_packages = [
        ("numpy", "数值计算核心"),
        ("pyvista", "3D可视化引擎"),
        ("scipy", "科学计算库"),
        ("matplotlib", "绘图库")
    ]
    
    optional_packages = [
        ("gmsh", "高质量网格生成"),
        ("meshio", "网格格式转换")
    ]
    
    all_good = True
    
    for package, description in required_packages:
        try:
            __import__(package)
            print(f"   ✅ {package:<12} - {description}")
        except ImportError:
            print(f"   ❌ {package:<12} - {description} (缺失)")
            all_good = False
    
    print("\n🔧 可选增强")
    for package, description in optional_packages:
        try:
            __import__(package)
            print(f"   ✅ {package:<12} - {description}")
        except ImportError:
            print(f"   ⚠️  {package:<12} - {description} (建议安装)")
    
    return all_good

def show_menu():
    """显示主菜单"""
    print("\n🎮 操作菜单")
    print("   1. 🧪 运行环境测试     - 检查所有功能模块")
    print("   2. 🚀 启动完整分析     - 执行深基坑分析")
    print("   3. 📊 查看历史结果     - 浏览之前的分析")
    print("   4. 📖 帮助说明        - 查看使用指南")
    print("   0. ❌ 退出程序        - 关闭应用")

def run_environment_test():
    """运行环境测试"""
    clear_screen()
    print("\n🧪 环境功能测试")
    print("=" * 50)
    
    print("\n⏳ 正在启动测试模块...")
    time.sleep(1)
    
    try:
        import subprocess
        result = subprocess.run([sys.executable, "test_pyvista_excavation.py"], 
                              capture_output=True, text=True, encoding='utf-8')
        
        if result.returncode == 0:
            print("\n✅ 所有测试通过！系统准备就绪")
        else:
            print("\n❌ 测试发现问题，请检查环境配置")
            if result.stderr:
                print(f"错误详情: {result.stderr}")
            
    except FileNotFoundError:
        print("\n❌ 测试脚本未找到: test_pyvista_excavation.py")
    except Exception as e:
        print(f"\n❌ 测试执行异常: {e}")
    
    input("\n按Enter键返回主菜单...")

def run_full_analysis():
    """运行完整分析"""
    clear_screen()
    print("\n🚀 启动深基坑完整分析")
    print("=" * 50)
    
    print("\n⚠️  即将开始分析，预计需要 5-15 分钟")
    print("   工程规模: 500×500×30m 土体域")
    print("   基坑规模: 200×200×15m 深基坑")
    print("   分析阶段: 5个施工阶段")
    
    choice = input("\n确认开始分析吗? (y/N): ").lower().strip()
    
    if choice in ['y', 'yes', '是']:
        print("\n⏳ 正在初始化分析引擎...")
        time.sleep(1)
        print("⏳ 正在生成高质量网格...")
        time.sleep(2)
        print("⏳ 正在分配材料属性...")
        time.sleep(1)
        
        print("\n🎯 分析启动中...")
        
        try:
            import subprocess
            result = subprocess.run([sys.executable, "pyvista_soft_soil_excavation.py"])
            
            if result.returncode == 0:
                print("\n🎉 分析完成！")
                print("   结果保存在: output/pyvista_excavation/")
            else:
                print("\n❌ 分析过程中发生错误")
                
        except FileNotFoundError:
            print("\n❌ 主程序未找到: pyvista_soft_soil_excavation.py")
        except Exception as e:
            print(f"\n❌ 分析执行异常: {e}")
    else:
        print("\n⏸️  分析已取消")
    
    input("\n按Enter键返回主菜单...")

def view_history_results():
    """查看历史结果"""
    clear_screen()
    print("\n📊 历史分析结果")
    print("=" * 50)
    
    output_dir = Path("output/pyvista_excavation")
    
    if not output_dir.exists():
        print("\n⚠️  尚未找到分析结果")
        print("   请先运行一次完整分析")
    else:
        summary_file = output_dir / "analysis_summary.json"
        
        if summary_file.exists():
            try:
                with open(summary_file, 'r', encoding='utf-8') as f:
                    summary = json.load(f)
                
                print("\n📋 最新分析结果:")
                
                if "project_info" in summary:
                    info = summary["project_info"]
                    print(f"   项目名称: {info.get('name', 'N/A')}")
                    print(f"   分析时间: {info.get('analysis_date', 'N/A')}")
                
                if "max_values" in summary:
                    values = summary["max_values"]
                    print(f"\n📈 关键指标:")
                    print(f"   最大位移: {values.get('max_displacement_mm', 0):.1f} mm")
                    print(f"   最大应力: {values.get('max_stress_kPa', 0):.1f} kPa")
                    print(f"   最大沉降: {values.get('max_settlement_mm', 0):.1f} mm")
                
                # VTK文件列表
                vtk_dir = output_dir / "vtk"
                if vtk_dir.exists():
                    vtk_files = list(vtk_dir.glob("*.vtk"))
                    if vtk_files:
                        print(f"\n📁 VTK结果文件:")
                        for vtk_file in sorted(vtk_files):
                            size_mb = vtk_file.stat().st_size / (1024*1024)
                            print(f"   📄 {vtk_file.name} ({size_mb:.1f} MB)")
                
            except Exception as e:
                print(f"\n❌ 读取结果文件失败: {e}")
        else:
            print("\n⚠️  未找到分析摘要文件")
    
    input("\n按Enter键返回主菜单...")

def show_help():
    """显示帮助"""
    clear_screen()
    print("\n📖 使用帮助")
    print("=" * 50)
    
    print("\n🎯 快速开始")
    print("   1. 首先运行环境测试确保所有依赖已安装")
    print("   2. 运行完整分析开始深基坑计算")
    print("   3. 分析完成后查看结果和可视化")
    
    print("\n🔧 环境要求")
    print("   Python 3.8+ (推荐 3.9+)")
    print("   核心: pyvista, numpy, scipy")
    print("   增强: gmsh, meshio, matplotlib")
    print("   系统: 8GB+ 内存, 4+ CPU核心")
    
    print("\n📊 结果文件")
    print("   VTK文件: 可用PyVista/ParaView打开")
    print("   JSON摘要: 包含关键数值结果")
    print("   PNG图片: 自动生成的可视化图")
    
    print("\n⚠️ 故障排除")
    print("   导入错误: pip install -r requirements_pyvista.txt")
    print("   内存不足: 调整网格密度参数")
    print("   收敛困难: 检查土层参数合理性")
    
    input("\n按Enter键返回主菜单...")

def main():
    """主函数"""
    while True:
        clear_screen()
        print_banner()
        print_system_info()
        
        # 检查依赖
        deps_ok = check_dependencies()
        
        print("\n📁 项目结构")
        files_to_check = [
            "pyvista_soft_soil_excavation.py",
            "test_pyvista_excavation.py", 
            "requirements_pyvista.txt"
        ]
        
        for file in files_to_check:
            exists = "✅" if Path(file).exists() else "⚠️"
            print(f"   {exists} {file}")
        
        show_menu()
        
        try:
            choice = input(f"\n请选择操作 (0-4): ").strip()
            
            if choice == '1':
                run_environment_test()
            elif choice == '2':
                if deps_ok:
                    run_full_analysis()
                else:
                    print("\n❌ 环境检查未通过，请先安装依赖包")
                    input("按Enter键返回...")
            elif choice == '3':
                view_history_results()
            elif choice == '4':
                show_help()
            elif choice == '0':
                print("\n👋 感谢使用 PyVista 深基坑分析系统！")
                time.sleep(1)
                break
            else:
                print("\n❌ 无效选择，请输入 0-4")
                time.sleep(1)
                
        except KeyboardInterrupt:
            print("\n\n👋 用户中断，程序退出")
            break
        except Exception as e:
            print(f"\n❌ 程序异常: {e}")
            input("按Enter键继续...")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ 启动器异常: {e}")
        input("按Enter键退出...")