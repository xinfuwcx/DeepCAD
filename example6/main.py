#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD-SCOUR 桥墩浅蚀模拟系统主程序
Bridge Pier Scour Simulation System

简洁美观的界面设计，专注核心功能
"""

import sys
from pathlib import Path

# 确保能找到模块
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def main():
    """主程序入口"""
    try:
        # 导入美观界面
        from beautiful_main import main as beautiful_main
        
        print("🌊 启动DeepCAD-SCOUR美观版桥墩冲刷分析系统...")
        print("✨ 现代化美观3D可视化界面")
        print("🎯 正确的桥墩朝向和流场显示")
        print("🎨 Figma风格现代设计")
        
        # 启动美观界面
        beautiful_main()
        
    except ImportError as e:
        print(f"❌ 界面模块导入失败: {e}")
        print("请检查PyQt6是否正确安装")
        print("安装命令: pip install PyQt6")
        sys.exit(1)
    
    except Exception as e:
        print(f"❌ 程序启动失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()