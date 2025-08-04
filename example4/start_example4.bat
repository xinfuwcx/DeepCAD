@echo off
echo ====================================
echo Example4 - 3D瓦片查看器启动脚本
echo ====================================

cd /d "%~dp0"

echo 检查Python环境...
python --version
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

echo.
echo 检查依赖包...
python -c "import PyQt6; print('PyQt6: OK')" 2>nul
if errorlevel 1 (
    echo 警告: PyQt6未安装
    echo 正在安装PyQt6...
    pip install PyQt6
)

python -c "import vtk; print('VTK: OK')" 2>nul
if errorlevel 1 (
    echo 警告: VTK未安装
    echo 正在安装VTK...
    pip install vtk
)

python -c "import numpy; print('NumPy: OK')" 2>nul
if errorlevel 1 (
    echo 警告: NumPy未安装
    echo 正在安装NumPy...
    pip install numpy
)

echo.
echo 启动Example4 3D瓦片查看器...
python main.py

if errorlevel 1 (
    echo.
    echo 程序启动失败，请检查错误信息
    pause
)