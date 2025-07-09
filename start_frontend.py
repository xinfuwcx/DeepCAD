#!/usr/bin/env python3
"""
DeepCAD Pro Frontend Startup Script
"""
import os
import sys
import subprocess


def start_frontend():
    """启动DeepCAD Pro前端开发服务器"""
    print("=== DeepCAD Pro Frontend 启动中 ===")
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(current_dir, "frontend")
    
    if not os.path.exists(frontend_dir):
        print(f"错误: 前端目录不存在 {frontend_dir}")
        return 1
    
    try:
        print(f"前端目录: {frontend_dir}")
        
        # 启动Vite开发服务器
        cmd = ["npm", "run", "dev"]
        print(f"启动命令: {' '.join(cmd)}")
        print("前端服务将在 http://localhost:3000 启动")
        print("按 Ctrl+C 停止服务")
        
        subprocess.run(cmd, cwd=frontend_dir)
        
    except KeyboardInterrupt:
        print("\n前端服务已停止")
    except Exception as e:
        print(f"启动失败: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(start_frontend()) 