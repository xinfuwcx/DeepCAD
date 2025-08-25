#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
监控Kratos计算进度
"""

import time
import subprocess
import json
from pathlib import Path

def monitor_kratos():
    """监控Kratos计算状态"""
    print("🔍 Kratos计算监控器")
    print("=" * 50)
    
    start_time = time.time()
    
    while True:
        current_time = time.strftime('%H:%M:%S')
        elapsed = time.time() - start_time
        
        print(f"\n🕐 {current_time} (运行 {elapsed/60:.1f} 分钟)")
        
        # 检查结果文件
        result_files = ['analysis_results.json', 'quick_test_results.json']
        for result_file in result_files:
            if Path(result_file).exists():
                print(f"🎉 发现结果文件: {result_file}")
                with open(result_file, 'r') as f:
                    results = json.load(f)
                
                if results.get('status') == 'SUCCESS':
                    print(f"✅ 分析成功完成!")
                    if 'max_displacement' in results:
                        print(f"  最大位移: {results['max_displacement']:.6f} m")
                    print(f"  计算时间: {results.get('computation_time', 0):.2f} 秒")
                    return True
                else:
                    print(f"❌ 分析失败: {results.get('error', 'Unknown')}")
                    return False
        
        # 检查Python进程
        try:
            result = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq python.exe'], 
                                  capture_output=True, text=True, timeout=5)
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                python_processes = []
                
                for line in lines[3:]:  # 跳过标题行
                    if 'python.exe' in line:
                        parts = line.split()
                        if len(parts) >= 5:
                            pid = parts[1]
                            memory_str = parts[4].replace(',', '').replace('K', '')
                            try:
                                memory_kb = int(memory_str)
                                if memory_kb > 100000:  # 大于100MB的进程
                                    python_processes.append((pid, memory_kb))
                            except:
                                pass
                
                if python_processes:
                    print(f"🔄 活跃的Kratos进程:")
                    for pid, memory_kb in python_processes:
                        print(f"  PID {pid}: {memory_kb/1024:.1f} MB")
                else:
                    print("⚠️ 没有发现大型Python进程")
                    
        except Exception as e:
            print(f"⚠️ 进程检查失败: {e}")
        
        # 等待30秒
        time.sleep(30)
        
        # 如果运行超过2小时，停止监控
        if elapsed > 7200:
            print("⏰ 监控超时 (2小时)")
            break

if __name__ == "__main__":
    try:
        monitor_kratos()
    except KeyboardInterrupt:
        print("\n🛑 监控已停止")
    except Exception as e:
        print(f"\n❌ 监控错误: {e}")
