@echo off
echo ========================================
echo Example2 - DeepCAD系统测试程序启动器
echo ========================================

cd /d "%~dp0"

echo 检查Python环境...
python --version
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

echo.
echo 启动Example2桌面程序...
python main.py

if errorlevel 1 (
    echo.
    echo 程序启动失败，请检查错误信息
    pause
)