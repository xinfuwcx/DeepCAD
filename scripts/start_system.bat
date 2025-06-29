@echo off
chcp 65001 > nul
echo =============================================
echo 深基坑CAE系统 - 启动服务
echo =============================================
echo.

REM 设置工作目录为项目根目录
cd /d %~dp0\..

echo 正在启动后端服务器...
start cmd /k "%~dp0start_backend_dev.bat"

echo 等待后端服务器启动...
timeout /t 5 /nobreak > nul

echo 正在启动前端服务器...
start cmd /k "%~dp0start_frontend_dev.bat"

echo.
echo 系统已启动！
echo 后端API地址: http://localhost:6000
echo 前端界面地址: http://localhost:1000
echo.
echo 请在浏览器中访问前端地址来使用系统
echo 按任意键关闭此窗口...

pause > nul 