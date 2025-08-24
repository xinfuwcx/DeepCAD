#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD-SCOUR 快速启动脚本
一键启动，自动检查依赖
"""

import sys
import os
import subprocess
from pathlib import Path

def check_python():
    """检查Python版本"""
    print("🐍 检查Python环境...")
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 7):
        print(f"❌ Python版本过低: {version.major}.{version.minor}")
        print("请升级到Python 3.7+")
        return False
    print(f"✅ Python版本: {version.major}.{version.minor}.{version.micro}")
    return True

def check_pyqt():
    """检查PyQt6"""
    print("🎨 检查PyQt6...")
    try:
        import PyQt6
        print("✅ PyQt6已安装")
        return True
    except ImportError:
        print("⚠️  PyQt6未安装，正在自动安装...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "PyQt6"])
            print("✅ PyQt6安装成功")
            return True
        except subprocess.CalledProcessError:
            print("❌ PyQt6安装失败")
            print("请手动运行: pip install PyQt6")
            return False

def check_dependencies():
    """检查其他依赖"""
    dependencies = ['numpy', 'matplotlib']
    missing = []
    
    print("📦 检查依赖包...")
    for dep in dependencies:
        try:
            __import__(dep)
            print(f"✅ {dep}")
        except ImportError:
            missing.append(dep)
            print(f"⚠️  {dep} 缺失")
    
    if missing:
        print(f"正在安装缺失的包: {', '.join(missing)}")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing)
            print("✅ 依赖包安装完成")
        except subprocess.CalledProcessError:
            print("❌ 部分包安装失败，程序可能无法完整运行")

def launch_app():
    """启动应用程序"""
    print("\n🚀 启动DeepCAD-SCOUR...")
    print("=" * 50)
    
    try:
        # 切换到脚本目录
        script_dir = Path(__file__).parent
        os.chdir(script_dir)
        
        # 导入并启动应用
        from simple_main import main as app_main
        app_main()
        
    except ImportError as e:
        print(f"❌ 导入错误: {e}")
        print("请检查simple_main.py是否存在")
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        import traceback
        traceback.print_exc()

def main():
    """主函数"""
    print("🌊 DeepCAD-SCOUR 桥墩冲刷分析系统")
    print("=" * 50)
    print("自动检查环境并启动程序...")
    print()
    
    # 检查环境
    if not check_python():
        input("按回车键退出...")
        return
    
    if not check_pyqt():
        input("按回车键退出...")
        return
    
    check_dependencies()
    
    # 启动应用
    print()
    launch_app()

if __name__ == "__main__":
    main()