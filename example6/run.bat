@echo off
title DeepCAD-SCOUR 桥墩冲刷分析系统
echo.
echo 🌊 DeepCAD-SCOUR 桥墩冲刷分析系统
echo ==========================================
echo.
echo 正在启动简洁美观界面...
echo.

python simple_main.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ 启动失败，可能的原因：
    echo 1. Python未安装
    echo 2. PyQt6未安装 - 请运行：pip install PyQt6
    echo 3. 其他依赖缺失
    echo.
)

echo.
pause