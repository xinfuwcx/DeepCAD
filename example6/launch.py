#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD-SCOUR 启动脚本
"""

import os
import sys
from pathlib import Path

def main():
    # 改变到正确目录
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print("🌊 DeepCAD-SCOUR 桥墩冲刷分析系统")
    print("=" * 50)
    print(f"📂 工作目录: {script_dir}")
    print("🚀 正在启动界面...")
    
    try:
        # 启动界面
        exec(open('professional_main.py', 'r', encoding='utf-8').read())
    except FileNotFoundError:
        print("❌ 找不到 professional_main.py 文件")
        print("请确保文件存在于当前目录")
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        import traceback
        traceback.print_exc()
    
    input("\n按回车键退出...")

if __name__ == "__main__":
    main()