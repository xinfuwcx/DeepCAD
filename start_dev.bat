@echo off
echo === 启动深基坑工程分析平台开发环境 ===

:: 启动后端服务器
start cmd /k "cd /d E:\Deep Excavation && python deep_excavation/run_backend.py"

:: 等待3秒
timeout /t 3

:: 启动前端开发服务器
start cmd /k "cd /d E:\Deep Excavation && python deep_excavation/run_frontend.py"

echo === 开发环境已启动 ===
echo 后端服务器: http://localhost:8000
echo 前端服务器: http://localhost:3000
echo 请在浏览器中访问前端地址来使用应用。

pause 