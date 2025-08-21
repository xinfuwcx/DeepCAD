
@echo off
echo 两阶段-全锚杆-摩尔库伦基坑分析系统 安装脚本
echo ================================================

echo 1. 检查Python环境...
python --version
if %errorlevel% neq 0 (
    echo 错误: 未找到Python 3.12+
    pause
    exit /b 1
)

echo 2. 安装Python依赖...
pip install numpy scipy matplotlib
pip install PyQt6
pip install chardet

echo 3. 安装Kratos Multiphysics...
echo 请手动安装Kratos Multiphysics 10.3.0
echo 下载地址: https://github.com/KratosMultiphysics/Kratos

echo 4. 验证安装...
python -c "import KratosMultiphysics; print('Kratos版本:', KratosMultiphysics.GetVersionString())"

echo 5. 安装完成!
echo 运行: python main.py
pause
