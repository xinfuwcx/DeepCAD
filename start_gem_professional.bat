@echo off
REM GEM Professional Implicit Modeling System 启动脚本 (Windows)
REM 专业级地质隐式建模系统

title GEM Professional Implicit Modeling System

echo.
echo ========================================================
echo   🌍 GEM Professional Implicit Modeling System v2.0
echo   专业级地质隐式建模系统
echo ========================================================
echo.

REM 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到Python解释器
    echo 请确保Python 3.8+已安装并添加到PATH环境变量
    echo.
    echo 下载地址: https://python.org/downloads/
    echo.
    pause
    exit /b 1
)

REM 显示Python版本
echo 🐍 检测到Python版本:
python --version
echo.

REM 切换到脚本目录
cd /d "%~dp0"

REM 启动GEM系统
echo 🚀 正在启动GEM专业隐式建模系统...
echo.
python start_gem_professional.py

REM 检查退出状态
if errorlevel 1 (
    echo.
    echo ❌ 程序异常退出，错误代码: %errorlevel%
    echo.
    pause
) else (
    echo.
    echo ✅ 程序正常退出
)

echo.
echo 👋 感谢使用GEM Professional System!
timeout /t 3 >nul