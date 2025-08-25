#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查Kratos分析状态
"""

import os
import time
import json
from pathlib import Path

def check_status():
    """检查分析状态"""
    print(f"🕐 当前时间: {time.strftime('%H:%M:%S')}")
    print(f"📁 当前目录: {os.getcwd()}")
    
    # 检查结果文件
    result_file = Path("analysis_results.json")
    if result_file.exists():
        print("✅ 发现结果文件!")
        with open(result_file, 'r') as f:
            results = json.load(f)
        
        if results.get('status') == 'SUCCESS':
            print("🎉 分析成功完成!")
            print(f"  最大位移: {results.get('max_displacement', 0):.6f} m")
            print(f"  计算时间: {results.get('computation_time', 0):.2f} 秒")
        else:
            print("❌ 分析失败")
            print(f"  错误: {results.get('error', 'Unknown error')}")
    else:
        print("⏳ 结果文件尚未生成，分析可能仍在进行中...")
    
    # 检查目录中的文件
    print("\n📋 目录文件:")
    for file in sorted(Path(".").glob("*")):
        if file.is_file():
            size = file.stat().st_size
            mtime = time.strftime('%H:%M:%S', time.localtime(file.stat().st_mtime))
            print(f"  {file.name:30} {size:>10} bytes  {mtime}")

if __name__ == "__main__":
    check_status()
