@echo off
chcp 65001 > nul
echo =============================================
echo 深基坑CAE系统 - 系统启动脚本
echo =============================================
echo.

REM 设置工作目录为项目根目录
cd /d %~dp0\..

echo 检查Python环境...
python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到Python，请确保Python已安装并添加到PATH中
    goto :error
)

echo 检查Node.js环境...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到Node.js，请确保Node.js已安装并添加到PATH中
    goto :error
)

echo 启动后端API服务器...
start cmd /k "title 深基坑CAE系统-后端 && python -m src.server.app"

echo 等待后端启动...
timeout /t 5 /nobreak > nul

echo 启动前端开发服务器...
start powershell -NoExit -Command "& '%~dp0\start_frontend.ps1'"

echo.
echo 系统启动完成!
echo 前端地址: http://localhost:1000
echo 后端API地址: http://localhost:6000
echo API文档: http://localhost:6000/docs
echo.
echo 按任意键退出此启动脚本...
pause > nul
exit /b 0

:error
echo.
echo 启动失败，请检查错误信息
pause
exit /b 1 