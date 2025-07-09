#!/usr/bin/env python3
"""
DeepCAD Pro 开发环境启动脚本
同时启动前端和后端开发服务器
"""

import subprocess
import sys
import os
import time
from pathlib import Path


def main():
    print("=== DeepCAD Pro 开发环境启动 ===")
    print("正在启动前端和后端服务...")
    
    # 确保在正确的目录
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    processes = []
    
    try:
        # 启动后端服务器（简化版本）
        print("\n🚀 启动后端服务器...")
        backend_process = subprocess.Popen([
            sys.executable, "start_simple.py"
        ], cwd=script_dir)
        processes.append(backend_process)
        
        # 等待后端启动
        time.sleep(3)
        
        # 启动前端服务器
        print("\n🎨 启动前端服务器...")
        frontend_process = subprocess.Popen([
            sys.executable, "run_frontend.py"
        ], cwd=script_dir)
        processes.append(frontend_process)
        
        print("\n✅ 服务启动完成!")
        print("🌐 前端: http://localhost:3000")
        print("🔧 后端: http://localhost:8000")
        print("📚 API文档: http://localhost:8000/docs")
        print("\n按 Ctrl+C 停止所有服务")
        
        # 等待用户中断
        while True:
            time.sleep(1)
            # 检查进程是否还在运行
            for i, process in enumerate(processes):
                if process.poll() is not None:
                    print(f"进程 {i+1} 已退出，退出码: {process.returncode}")
                    return
                    
    except KeyboardInterrupt:
        print("\n\n🛑 正在停止所有服务...")
        
    finally:
        # 终止所有进程
        for i, process in enumerate(processes):
            if process.poll() is None:
                print(f"正在终止进程 {i+1}...")
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    print(f"强制终止进程 {i+1}")
                    process.kill()
        
        print("所有服务已停止")


if __name__ == "__main__":
    main() 