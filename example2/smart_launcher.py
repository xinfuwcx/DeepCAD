#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Example2 Smart Launcher
自动检测环境并选择最佳启动方式的智能启动器
"""

import sys
import os
import subprocess
from pathlib import Path

def check_dependencies():
    """检查依赖包可用性"""
    deps_status = {}
    
    # 检查核心依赖
    try:
        import PyQt6
        deps_status['PyQt6'] = True
        print("✅ PyQt6 可用")
    except ImportError:
        deps_status['PyQt6'] = False
        print("❌ PyQt6 不可用")
    
    try:
        import pyvista
        deps_status['PyVista'] = True
        print("✅ PyVista 可用")
    except ImportError:
        deps_status['PyVista'] = False
        print("⚠️  PyVista 不可用 (3D功能受限)")
    
    try:
        import numpy
        deps_status['NumPy'] = True
        print("✅ NumPy 可用")
    except ImportError:
        deps_status['NumPy'] = False
        print("❌ NumPy 不可用")
    
    return deps_status

def suggest_installation():
    """建议安装命令"""
    print("\n📦 安装建议:")
    print("pip install PyQt6 pyvista numpy pandas scipy")
    print("\n或者只安装核心组件:")
    print("pip install PyQt6 numpy")

def launch_demo_mode():
    """启动演示模式（无需 GUI 依赖）"""
    print("\n🎯 启动核心功能演示模式...")
    try:
        demo_script = Path(__file__).parent / "demo_core_functionality.py"
        if demo_script.exists():
            subprocess.run([sys.executable, str(demo_script)])
        else:
            print("❌ 演示脚本不存在")
    except Exception as e:
        print(f"❌ 演示模式启动失败: {e}")

def launch_full_gui():
    """启动完整 GUI 应用"""
    print("\n🖥️  启动完整桌面应用...")
    try:
        main_script = Path(__file__).parent / "main.py"
        if main_script.exists():
            subprocess.run([sys.executable, str(main_script)])
        else:
            print("❌ 主程序不存在")
    except Exception as e:
        print(f"❌ GUI 启动失败: {e}")

def launch_stable_gui():
    """启动稳定测试 GUI"""
    print("\n🧪 启动稳定测试界面...")
    try:
        stable_script = Path(__file__).parent / "simple_stable_gui.py"
        if stable_script.exists():
            subprocess.run([sys.executable, str(stable_script)])
        else:
            print("❌ 稳定测试脚本不存在")
    except Exception as e:
        print(f"❌ 稳定GUI 启动失败: {e}")

def main():
    """主启动函数"""
    print("=" * 60)
    print("🖥️  Example2 智能启动器")
    print("=" * 60)
    print("岩土工程 CAE 桌面应用程序")
    print()
    
    # 检查依赖
    print("📋 检查系统环境...")
    deps = check_dependencies()
    
    print("\n🎯 选择启动模式:")
    print("1. 核心功能演示 (无需 GUI 依赖)")
    print("2. 完整桌面应用 (需要 PyQt6)")
    print("3. 稳定测试界面 (需要 PyQt6)")
    print("4. 查看安装建议")
    print("5. 退出")
    
    while True:
        try:
            choice = input("\n请选择 [1-5]: ").strip()
            
            if choice == "1":
                launch_demo_mode()
                break
            elif choice == "2":
                if deps.get('PyQt6'):
                    launch_full_gui()
                else:
                    print("❌ PyQt6 未安装，无法启动完整 GUI")
                    suggest_installation()
                break
            elif choice == "3":
                if deps.get('PyQt6'):
                    launch_stable_gui()
                else:
                    print("❌ PyQt6 未安装，无法启动 GUI")
                    suggest_installation()
                break
            elif choice == "4":
                suggest_installation()
            elif choice == "5":
                print("👋 再见!")
                break
            else:
                print("❌ 无效选择，请输入 1-5")
        except KeyboardInterrupt:
            print("\n\n👋 用户取消，再见!")
            break
        except Exception as e:
            print(f"❌ 错误: {e}")
            break

if __name__ == "__main__":
    main()