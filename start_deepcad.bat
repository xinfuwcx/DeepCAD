@echo off
REM DeepCAD Professional CAE System 启动脚本 (Windows)
REM 自动检查Python环境并启动程序

title DeepCAD Professional CAE System

echo ======================================================
echo  DeepCAD Professional CAE System v2.0
echo  专业级工程分析平台
echo ======================================================
echo.

REM 检查Python是否可用
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Python解释器
    echo 请确保Python 3.8+已安装并添加到PATH环境变量
    echo.
    echo 下载地址: https://python.org/downloads/
    pause
    exit /b 1
)

REM 显示Python版本
echo 检测到Python版本:
python --version
echo.

REM 切换到脚本目录
cd /d "%~dp0"

REM 启动应用程序
echo 正在启动DeepCAD Professional CAE System...
echo.
python start_deepcad.py

REM 如果程序异常退出，暂停以便查看错误信息
if errorlevel 1 (
    echo.
    echo 程序异常退出，错误代码: %errorlevel%
    pause
)