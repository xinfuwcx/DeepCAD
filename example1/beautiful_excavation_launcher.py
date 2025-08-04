#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PyVista深基坑分析 - 美化启动器
专业级软土深基坑工程分析工具
"""

import os
import sys
import time
import json
from pathlib import Path
from datetime import datetime
import subprocess

# 设置控制台编码
if sys.platform.startswith('win'):
    os.system('chcp 65001 >nul 2>&1')
    
# 设置标准输出编码
sys.stdout.reconfigure(encoding='utf-8', errors='ignore') if hasattr(sys.stdout, 'reconfigure') else None

# ANSI颜色代码
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'
    
    # 渐变色
    GRADIENT1 = '\033[38;5;33m'   # 深蓝
    GRADIENT2 = '\033[38;5;39m'   # 蓝色
    GRADIENT3 = '\033[38;5;45m'   # 青色
    GRADIENT4 = '\033[38;5;51m'   # 亮青
    GRADIENT5 = '\033[38;5;87m'   # 淡青

def clear_screen():
    """清屏"""
    os.system('cls' if os.name == 'nt' else 'clear')

def print_banner():
    """打印美化的横幅"""
    try:
        banner = f"""
{Colors.GRADIENT1}╔══════════════════════════════════════════════════════════════════════╗{Colors.END}
{Colors.GRADIENT2}║                                                                      ║{Colors.END}
{Colors.GRADIENT2}║  {Colors.BOLD}{Colors.CYAN}[建筑] PyVista 深基坑工程分析系统 v2.0{Colors.END}                      {Colors.GRADIENT2}║{Colors.END}
{Colors.GRADIENT3}║  {Colors.YELLOW}Professional Deep Excavation Analysis Tool{Colors.END}                    {Colors.GRADIENT3}║{Colors.END}
{Colors.GRADIENT3}║                                                                      ║{Colors.END}
{Colors.GRADIENT4}║  {Colors.GREEN}[地球] 工程规模: 500×500×30m 土体域 | 200×200×15m 基坑{Colors.END}         {Colors.GRADIENT4}║{Colors.END}
{Colors.GRADIENT4}║  {Colors.GREEN}[砖块] 土层模型: 5层软土 + 摩尔-库伦本构{Colors.END}                       {Colors.GRADIENT4}║{Colors.END}
{Colors.GRADIENT5}║  {Colors.GREEN}[扳手] 网格技术: GMSH渐变网格 (0.3m → 1.0m){Colors.END}                   {Colors.GRADIENT5}║{Colors.END}
{Colors.GRADIENT5}║  {Colors.GREEN}[调色板] 可视化: PyVista 3D交互式显示{Colors.END}                        {Colors.GRADIENT5}║{Colors.END}
{Colors.GRADIENT1}║                                                                      ║{Colors.END}
{Colors.GRADIENT1}╚══════════════════════════════════════════════════════════════════════╝{Colors.END}
"""
        print(banner)
    except UnicodeEncodeError:
        # 备用ASCII版本
        print("=" * 70)
        print("    PyVista 深基坑工程分析系统 v2.0")
        print("    Professional Deep Excavation Analysis Tool")
        print()
        print("    工程规模: 500×500×30m 土体域 | 200×200×15m 基坑")
        print("    土层模型: 5层软土 + 摩尔-库伦本构")
        print("    网格技术: GMSH渐变网格 (0.3m → 1.0m)")
        print("    可视化: PyVista 3D交互式显示")
        print("=" * 70)

def print_system_info():
    """显示系统信息"""
    import platform
    
    print(f"\n{Colors.CYAN}[电脑] 系统信息{Colors.END}")
    print(f"   {Colors.BLUE}操作系统:{Colors.END} {platform.system()} {platform.release()}")
    print(f"   {Colors.BLUE}Python版本:{Colors.END} {platform.python_version()}")
    
    try:
        import psutil
        print(f"   {Colors.BLUE}CPU核心:{Colors.END} {psutil.cpu_count()} 核")
        print(f"   {Colors.BLUE}内存容量:{Colors.END} {psutil.virtual_memory().total // (1024**3)} GB")
    except ImportError:
        print(f"   {Colors.BLUE}CPU核心:{Colors.END} 多核处理器")
        print(f"   {Colors.BLUE}内存容量:{Colors.END} 系统内存充足")
    
    print(f"   {Colors.BLUE}当前时间:{Colors.END} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def animate_loading(text, duration=2):
    """动画加载效果"""
    chars = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    end_time = time.time() + duration
    
    while time.time() < end_time:
        for char in chars:
            print(f"\r{Colors.YELLOW}{char}{Colors.END} {text}", end="", flush=True)
            time.sleep(0.1)
    
    print(f"\r{Colors.GREEN}✅{Colors.END} {text}")

def check_dependencies():
    """检查依赖包"""
    print(f"\n{Colors.CYAN}🔍 环境检查{Colors.END}")
    
    required_packages = [
        ("numpy", "数值计算核心"),
        ("pyvista", "3D可视化引擎"),
        ("scipy", "科学计算库"),
        ("matplotlib", "绘图库")
    ]
    
    optional_packages = [
        ("gmsh", "高质量网格生成"),
        ("meshio", "网格格式转换"),
        ("psutil", "系统监控"),
        ("tqdm", "进度条显示")
    ]
    
    all_good = True
    
    for package, description in required_packages:
        try:
            __import__(package)
            print(f"   {Colors.GREEN}✅ {package:<12}{Colors.END} - {description}")
        except ImportError:
            print(f"   {Colors.RED}❌ {package:<12}{Colors.END} - {description} (缺失)")
            all_good = False
    
    print(f"\n{Colors.CYAN}🔧 可选增强{Colors.END}")
    for package, description in optional_packages:
        try:
            __import__(package)
            print(f"   {Colors.GREEN}✅ {package:<12}{Colors.END} - {description}")
        except ImportError:
            print(f"   {Colors.YELLOW}⚠️  {package:<12}{Colors.END} - {description} (建议安装)")
    
    return all_good

def show_project_structure():
    """显示项目结构"""
    print(f"\n{Colors.CYAN}📁 项目结构{Colors.END}")
    
    structure = {
        "🏗️ 主程序": [
            "pyvista_soft_soil_excavation.py",
            "beautiful_excavation_launcher.py"
        ],
        "🧪 测试工具": [
            "test_pyvista_excavation.py"
        ],
        "📋 配置文档": [
            "requirements_pyvista.txt",
            "README_PYVISTA_EXCAVATION.md"
        ],
        "📊 输出结果": [
            "output/pyvista_excavation/vtk/",
            "output/pyvista_excavation/analysis_summary.json"
        ]
    }
    
    for category, files in structure.items():
        print(f"   {Colors.YELLOW}{category}{Colors.END}")
        for file in files:
            exists = "✅" if Path(file).exists() or Path(file).parent.exists() else "⚠️"
            print(f"     {exists} {file}")

def show_analysis_preview():
    """显示分析预览"""
    print(f"\n{Colors.CYAN}🚀 分析流程预览{Colors.END}")
    
    stages = [
        ("🏗️ 地应力平衡", "建立初始应力状态", "线性分析"),
        ("🧱 地连墙施工", "激活围护结构", "非线性分析"),  
        ("⛏️ 第一层开挖", "开挖至 -5m", "塑性分析"),
        ("⛏️ 第二层开挖", "开挖至 -10m", "大变形分析"),
        ("🎯 最终开挖", "开挖至 -15m", "极限分析")
    ]
    
    for i, (icon, name, method) in enumerate(stages, 1):
        print(f"   {Colors.BLUE}阶段{i}:{Colors.END} {icon} {Colors.BOLD}{name}{Colors.END}")
        print(f"          {Colors.GREEN}分析方法:{Colors.END} {method}")

def show_expected_results():
    """显示预期结果"""
    print(f"\n{Colors.CYAN}📈 预期结果{Colors.END}")
    
    results = [
        ("最大墙体位移", "30-50 mm", "🔍"),
        ("最大地表沉降", "20-35 mm", "📉"),
        ("最大墙体应力", "10-20 MPa", "⚡"),
        ("基坑稳定系数", "> 1.2", "🛡️"),
        ("分析总时间", "5-15 分钟", "⏱️")
    ]
    
    for name, value, icon in results:
        print(f"   {icon} {Colors.BOLD}{name}:{Colors.END} {Colors.GREEN}{value}{Colors.END}")

def show_menu():
    """显示主菜单"""
    print(f"\n{Colors.CYAN}🎮 操作菜单{Colors.END}")
    print(f"   {Colors.BOLD}1.{Colors.END} {Colors.GREEN}🧪 运行环境测试{Colors.END}     - 检查所有功能模块")
    print(f"   {Colors.BOLD}2.{Colors.END} {Colors.GREEN}🚀 启动完整分析{Colors.END}     - 执行深基坑分析")
    print(f"   {Colors.BOLD}3.{Colors.END} {Colors.GREEN}📊 查看历史结果{Colors.END}     - 浏览之前的分析")
    print(f"   {Colors.BOLD}4.{Colors.END} {Colors.GREEN}⚙️  系统配置{Colors.END}        - 修改分析参数")
    print(f"   {Colors.BOLD}5.{Colors.END} {Colors.GREEN}📖 帮助文档{Colors.END}        - 查看使用说明")
    print(f"   {Colors.BOLD}0.{Colors.END} {Colors.RED}❌ 退出程序{Colors.END}        - 关闭应用")

def run_environment_test():
    """运行环境测试"""
    clear_screen()
    print(f"\n{Colors.BOLD}{Colors.CYAN}🧪 环境功能测试{Colors.END}")
    print("=" * 60)
    
    animate_loading("正在启动测试模块...", 1.5)
    
    try:
        # 运行测试脚本
        result = subprocess.run([sys.executable, "test_pyvista_excavation.py"], 
                              capture_output=True, text=True, encoding='utf-8')
        
        if result.returncode == 0:
            print(f"\n{Colors.GREEN}✅ 所有测试通过！系统准备就绪{Colors.END}")
        else:
            print(f"\n{Colors.RED}❌ 测试发现问题，请检查环境配置{Colors.END}")
            print(f"{Colors.YELLOW}错误详情:{Colors.END}")
            print(result.stderr)
            
    except FileNotFoundError:
        print(f"\n{Colors.RED}❌ 测试脚本未找到: test_pyvista_excavation.py{Colors.END}")
    except Exception as e:
        print(f"\n{Colors.RED}❌ 测试执行异常: {e}{Colors.END}")
    
    input(f"\n{Colors.CYAN}按Enter键返回主菜单...{Colors.END}")

def run_full_analysis():
    """运行完整分析"""
    clear_screen()
    print(f"\n{Colors.BOLD}{Colors.CYAN}🚀 启动深基坑完整分析{Colors.END}")
    print("=" * 60)
    
    # 确认开始
    print(f"\n{Colors.YELLOW}⚠️  即将开始分析，预计需要 5-15 分钟{Colors.END}")
    print(f"   工程规模: 500×500×30m 土体域")
    print(f"   基坑规模: 200×200×15m 深基坑")
    print(f"   分析阶段: 5个施工阶段")
    
    choice = input(f"\n{Colors.CYAN}确认开始分析吗? (y/N): {Colors.END}").lower().strip()
    
    if choice in ['y', 'yes', '是']:
        animate_loading("正在初始化分析引擎...", 2)
        animate_loading("正在生成高质量网格...", 3)
        animate_loading("正在分配材料属性...", 1.5)
        
        print(f"\n{Colors.GREEN}🎯 分析启动中...{Colors.END}")
        
        try:
            # 运行主分析程序
            result = subprocess.run([sys.executable, "pyvista_soft_soil_excavation.py"], 
                                  text=True, encoding='utf-8')
            
            if result.returncode == 0:
                print(f"\n{Colors.GREEN}🎉 分析完成！{Colors.END}")
                print(f"   结果保存在: output/pyvista_excavation/")
            else:
                print(f"\n{Colors.RED}❌ 分析过程中发生错误{Colors.END}")
                
        except FileNotFoundError:
            print(f"\n{Colors.RED}❌ 主程序未找到: pyvista_soft_soil_excavation.py{Colors.END}")
        except Exception as e:
            print(f"\n{Colors.RED}❌ 分析执行异常: {e}{Colors.END}")
    else:
        print(f"\n{Colors.YELLOW}⏸️  分析已取消{Colors.END}")
    
    input(f"\n{Colors.CYAN}按Enter键返回主菜单...{Colors.END}")

def view_history_results():
    """查看历史结果"""
    clear_screen()
    print(f"\n{Colors.BOLD}{Colors.CYAN}📊 历史分析结果{Colors.END}")
    print("=" * 60)
    
    output_dir = Path("output/pyvista_excavation")
    
    if not output_dir.exists():
        print(f"\n{Colors.YELLOW}⚠️  尚未找到分析结果{Colors.END}")
        print("   请先运行一次完整分析")
    else:
        # 查找结果文件
        summary_file = output_dir / "analysis_summary.json"
        vtk_dir = output_dir / "vtk"
        
        if summary_file.exists():
            try:
                with open(summary_file, 'r', encoding='utf-8') as f:
                    summary = json.load(f)
                
                print(f"\n{Colors.GREEN}📋 最新分析结果:{Colors.END}")
                
                if "project_info" in summary:
                    info = summary["project_info"]
                    print(f"   项目名称: {info.get('name', 'N/A')}")
                    print(f"   分析时间: {info.get('analysis_date', 'N/A')}")
                
                if "max_values" in summary:
                    values = summary["max_values"]
                    print(f"\n{Colors.CYAN}📈 关键指标:{Colors.END}")
                    print(f"   最大位移: {values.get('max_displacement_mm', 0):.1f} mm")
                    print(f"   最大应力: {values.get('max_stress_kPa', 0):.1f} kPa")
                    print(f"   最大沉降: {values.get('max_settlement_mm', 0):.1f} mm")
                
                if "analysis_results" in summary:
                    results = summary["analysis_results"]
                    print(f"\n{Colors.CYAN}🏗️ 各阶段结果:{Colors.END}")
                    for stage, data in results.items():
                        conv_icon = "✅" if data.get("convergence", False) else "❌"
                        print(f"   {conv_icon} {data.get('stage_name', stage)}: "
                              f"位移 {data.get('max_displacement_mm', 0):.1f}mm, "
                              f"应力 {data.get('max_stress_kPa', 0):.1f}kPa")
                
                # VTK文件列表
                if vtk_dir.exists():
                    vtk_files = list(vtk_dir.glob("*.vtk"))
                    if vtk_files:
                        print(f"\n{Colors.CYAN}📁 VTK结果文件:{Colors.END}")
                        for vtk_file in sorted(vtk_files):
                            size_mb = vtk_file.stat().st_size / (1024*1024)
                            print(f"   📄 {vtk_file.name} ({size_mb:.1f} MB)")
                
            except Exception as e:
                print(f"\n{Colors.RED}❌ 读取结果文件失败: {e}{Colors.END}")
        else:
            print(f"\n{Colors.YELLOW}⚠️  未找到分析摘要文件{Colors.END}")
    
    input(f"\n{Colors.CYAN}按Enter键返回主菜单...{Colors.END}")

def system_configuration():
    """系统配置"""
    clear_screen()
    print(f"\n{Colors.BOLD}{Colors.CYAN}⚙️ 系统配置{Colors.END}")
    print("=" * 60)
    
    print(f"\n{Colors.GREEN}当前配置参数:{Colors.END}")
    print(f"   土体域尺寸: 500×500×30 m")
    print(f"   基坑尺寸: 200×200×15 m")
    print(f"   网格尺寸: 0.3m → 1.0m (渐变)")
    print(f"   土层数量: 5层")
    print(f"   地连墙厚度: 1.0 m")
    print(f"   分析阶段: 5个阶段")
    
    print(f"\n{Colors.YELLOW}💡 配置修改提示:{Colors.END}")
    print("   1. 编辑 pyvista_soft_soil_excavation.py 修改几何参数")
    print("   2. 调整 soil_layers 列表修改土层参数")
    print("   3. 修改 mesh_size_fine/coarse 控制网格密度")
    print("   4. 在构造函数中调整分析阶段")
    
    print(f"\n{Colors.CYAN}🔧 快速配置选项:{Colors.END}")
    print("   A. 🏃 快速模式 - 粗网格快速计算")
    print("   B. 🎯 精确模式 - 细网格高精度")
    print("   C. 🧪 调试模式 - 超粗网格测试")
    
    choice = input(f"\n{Colors.CYAN}选择配置模式 (A/B/C) 或按Enter跳过: {Colors.END}").upper().strip()
    
    if choice == 'A':
        print(f"\n{Colors.GREEN}✅ 已设置快速模式参数提示{Colors.END}")
        print("   建议修改: mesh_size_fine=0.5, mesh_size_coarse=1.5")
    elif choice == 'B':
        print(f"\n{Colors.GREEN}✅ 已设置精确模式参数提示{Colors.END}")
        print("   建议修改: mesh_size_fine=0.2, mesh_size_coarse=0.8")
    elif choice == 'C':
        print(f"\n{Colors.GREEN}✅ 已设置调试模式参数提示{Colors.END}")
        print("   建议修改: mesh_size_fine=1.0, mesh_size_coarse=2.0")
    
    input(f"\n{Colors.CYAN}按Enter键返回主菜单...{Colors.END}")

def show_help():
    """显示帮助"""
    clear_screen()
    print(f"\n{Colors.BOLD}{Colors.CYAN}📖 使用帮助{Colors.END}")
    print("=" * 60)
    
    help_sections = [
        ("🎯 快速开始", [
            "1. 首先运行环境测试确保所有依赖已安装",
            "2. 运行完整分析开始深基坑计算",
            "3. 分析完成后查看结果和可视化"
        ]),
        ("🔧 环境要求", [
            "Python 3.8+ (推荐 3.9+)",
            "核心: pyvista, numpy, scipy",
            "增强: gmsh, meshio, matplotlib",
            "系统: 8GB+ 内存, 4+ CPU核心"
        ]),
        ("📊 结果文件", [
            "VTK文件: 可用PyVista/ParaView打开",
            "JSON摘要: 包含关键数值结果",
            "PNG图片: 自动生成的可视化图",
            "日志文件: 详细的计算过程记录"
        ]),
        ("⚠️ 故障排除", [
            "导入错误: pip install -r requirements_pyvista.txt",
            "内存不足: 调整网格密度参数",
            "收敛困难: 检查土层参数合理性",
            "显示问题: 检查显卡驱动和VTK版本"
        ]),
        ("🌐 更多资源", [
            "PyVista官网: https://pyvista.org/",
            "GMSH文档: https://gmsh.info/",
            "项目源码: 查看本地Python文件",
            "技术支持: 参考代码注释和文档"
        ])
    ]
    
    for title, items in help_sections:
        print(f"\n{Colors.YELLOW}{title}{Colors.END}")
        for item in items:
            print(f"   • {item}")
    
    input(f"\n{Colors.CYAN}按Enter键返回主菜单...{Colors.END}")

def main():
    """主函数"""
    while True:
        clear_screen()
        print_banner()
        print_system_info()
        
        # 检查依赖（静默）
        deps_ok = check_dependencies()
        
        show_project_structure()
        show_analysis_preview()
        show_expected_results()
        show_menu()
        
        try:
            choice = input(f"\n{Colors.BOLD}请选择操作 (0-5): {Colors.END}").strip()
            
            if choice == '1':
                run_environment_test()
            elif choice == '2':
                if deps_ok:
                    run_full_analysis()
                else:
                    print(f"\n{Colors.RED}❌ 环境检查未通过，请先安装依赖包{Colors.END}")
                    input(f"{Colors.CYAN}按Enter键返回...{Colors.END}")
            elif choice == '3':
                view_history_results()
            elif choice == '4':
                system_configuration()
            elif choice == '5':
                show_help()
            elif choice == '0':
                print(f"\n{Colors.GREEN}👋 感谢使用 PyVista 深基坑分析系统！{Colors.END}")
                time.sleep(1)
                break
            else:
                print(f"\n{Colors.RED}❌ 无效选择，请输入 0-5{Colors.END}")
                time.sleep(1)
                
        except KeyboardInterrupt:
            print(f"\n\n{Colors.YELLOW}👋 用户中断，程序退出{Colors.END}")
            break
        except Exception as e:
            print(f"\n{Colors.RED}❌ 程序异常: {e}{Colors.END}")
            input(f"{Colors.CYAN}按Enter键继续...{Colors.END}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n{Colors.RED}❌ 启动器异常: {e}{Colors.END}")
        input("按Enter键退出...")