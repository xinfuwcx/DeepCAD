#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD-SCOUR 桥墩浅蚀模拟系统主程序（修复版）
Bridge Pier Scour Simulation System (Fixed Version)

修复内容:
- Unicode编码问题
- 程序启动异常
- 中文显示乱码
"""

import sys
import os
from pathlib import Path

# 设置UTF-8编码
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    # 在Windows上强制使用UTF-8
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())

# 确保能找到模块
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def main():
    """主程序入口"""
    try:
        print("启动DeepCAD-SCOUR桥墩冲刷分析系统...")
        print("现代化美观3D可视化界面")
        print("正确的桥墩朝向和流场显示")
        print("Figma风格现代设计")
        
        # 导入美观界面
        from beautiful_main_fixed import main as beautiful_main
        
        # 启动美观界面
        beautiful_main()
        
    except ImportError as e:
        print(f"界面模块导入失败: {e}")
        print("请检查PyQt6是否正确安装")
        print("安装命令: pip install PyQt6")
        
        # 尝试简化版本
        try:
            from simple_main import main as simple_main
            print("启动简化版本...")
            simple_main()
        except:
            print("简化版本也无法启动，请检查环境配置")
        
    except Exception as e:
        print(f"程序启动失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()