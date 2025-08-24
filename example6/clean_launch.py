#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简洁启动脚本
"""
import subprocess
import sys
import os

def main():
    try:
        # 切换到正确目录
        os.chdir(r"E:\DeepCAD\example6")
        
        # 直接启动界面
        result = subprocess.run([sys.executable, "beautiful_main.py"], 
                              capture_output=False, 
                              text=True)
        
    except KeyboardInterrupt:
        print("用户中断")
    except Exception as e:
        print(f"启动失败: {e}")

if __name__ == "__main__":
    main()