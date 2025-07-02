"""
Backend Server Runner

This script starts the FastAPI backend server for the Deep Excavation application.
It sets up the proper Python path and runs the app.py file.
"""
import os
import sys
import uvicorn

# 添加当前目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

if __name__ == "__main__":
    print("=== Starting Deep Excavation Backend Server ===")
    # 启动FastAPI服务器
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True) 