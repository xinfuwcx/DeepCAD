@echo off
chcp 65001 >nul
title 🚀 PyVista深基坑分析 - 快速安装

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║                                                                      ║
echo ║    🚀 PyVista深基坑分析 - 快速环境安装                               ║
echo ║    Quick Environment Setup                                           ║
echo ║                                                                      ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.

echo 🔍 检查Python环境...
python --version
if errorlevel 1 (
    echo ❌ Python未安装或未添加到PATH！
    echo 请先安装Python 3.8+: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo.
echo 🔍 检查pip工具...
pip --version
if errorlevel 1 (
    echo ❌ pip未找到！
    pause
    exit /b 1
)

echo.
echo 📦 开始安装依赖包...
echo.

echo 🔧 安装核心依赖...
pip install numpy scipy matplotlib
if errorlevel 1 (
    echo ❌ 核心依赖安装失败！
    pause
    exit /b 1
)

echo.
echo 🎨 安装PyVista 3D可视化...
pip install pyvista
if errorlevel 1 (
    echo ❌ PyVista安装失败！
    pause
    exit /b 1
)

echo.
echo 🔧 安装增强功能...
pip install gmsh meshio psutil tqdm
if errorlevel 1 (
    echo ⚠️ 增强功能安装部分失败，但核心功能可用
)

echo.
echo 📋 安装其他依赖...
if exist "requirements_pyvista.txt" (
    pip install -r requirements_pyvista.txt
    if errorlevel 1 (
        echo ⚠️ 部分依赖安装失败，但基本功能可用
    )
) else (
    echo ⚠️ requirements_pyvista.txt文件未找到
)

echo.
echo ✅ 安装完成！
echo.
echo 🎯 下一步操作：
echo    1. 运行 start_beautiful_analysis.bat 启动程序
echo    2. 或者直接运行: python beautiful_excavation_launcher.py
echo.

pause