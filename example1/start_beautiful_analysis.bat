@echo off
chcp 65001 >nul
title 🏗️ PyVista深基坑分析系统

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║                                                                      ║
echo ║    🏗️  PyVista 深基坑工程分析系统 v2.0                               ║
echo ║    Professional Deep Excavation Analysis Tool                       ║
echo ║                                                                      ║
echo ║    正在启动美化界面...                                               ║
echo ║                                                                      ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.

REM 检查Python是否可用
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python未找到！请确保Python已安装并添加到PATH环境变量
    echo.
    pause
    exit /b 1
)

REM 检查必要文件是否存在
if not exist "beautiful_excavation_launcher.py" (
    echo ❌ 启动文件未找到: beautiful_excavation_launcher.py
    echo.
    pause
    exit /b 1
)

REM 启动美化启动器
python beautiful_excavation_launcher.py

REM 如果出错，显示错误信息
if errorlevel 1 (
    echo.
    echo ❌ 程序执行异常，请检查错误信息
    echo.
)

pause