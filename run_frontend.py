"""
Frontend Development Server Runner

This script starts the Vite development server for the Deep Excavation frontend.
"""
import os
import subprocess
import sys

def main():
    """启动前端开发服务器"""
    # 获取前端目录的绝对路径
    current_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(current_dir, "frontend")
    
    print("=== Starting Deep Excavation Frontend Dev Server ===")
    print(f"Frontend directory: {frontend_dir}")
    
    # 切换到前端目录
    os.chdir(frontend_dir)
    
    # 构建命令
    if sys.platform.startswith("win"):
        cmd = "npm run dev"
    else:
        cmd = "npm run dev"
    
    # 执行命令
    try:
        subprocess.run(cmd, shell=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error starting frontend server: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nFrontend server stopped.")

if __name__ == "__main__":
    main() 