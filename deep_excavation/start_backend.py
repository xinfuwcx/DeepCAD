#!/usr/bin/env python3
"""
DeepCAD Pro Backend Startup Script
简化的后端启动脚本，避免PowerShell执行策略问题
"""
import os
import sys
import subprocess

def start_backend():
    """启动DeepCAD Pro后端服务"""
    print("=== DeepCAD Pro Backend 启动中 ===")
    
    # 设置PYTHONPATH
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, current_dir)
    
    try:
        # 启动uvicorn服务器
        cmd = [
            sys.executable, "-m", "uvicorn", 
            "backend.app:app",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--reload"
        ]
        
        print(f"启动命令: {' '.join(cmd)}")
        print("后端服务将在 http://localhost:8000 启动")
        print("API文档: http://localhost:8000/docs")
        print("按 Ctrl+C 停止服务")
        
        subprocess.run(cmd, cwd=current_dir)
        
    except KeyboardInterrupt:
        print("\n后端服务已停止")
    except Exception as e:
        print(f"启动失败: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(start_backend()) 