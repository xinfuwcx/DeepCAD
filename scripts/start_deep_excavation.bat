@echo off
echo Starting Deep Excavation System...

:: 创建工作目录
if not exist workspace mkdir workspace
if not exist workspace\results mkdir workspace\results

:: 设置环境变量
set PYTHONPATH=%~dp0..
set FLASK_APP=src.server.app
set FLASK_ENV=development
set PORT=6000

:: 启动后端服务
start cmd /k "echo Starting backend server on port %PORT%... && python -m src.server.app"

:: 等待3秒，让后端先初始化
timeout /t 3

:: 启动前端
cd frontend\src
start cmd /k "echo Starting frontend on port 1000... && npm run dev"

echo System startup initiated. Please check the command windows for details. 