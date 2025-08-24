@echo off
title 安装3D可视化依赖
echo.
echo 🔧 DeepCAD-SCOUR 专业版依赖安装
echo ==========================================
echo.
echo 正在安装3D可视化依赖...
echo.

echo ⚡ 安装PyVista (3D可视化核心)
pip install pyvista
if %ERRORLEVEL% NEQ 0 (
    echo ❌ PyVista安装失败
) else (
    echo ✅ PyVista安装成功
)

echo.
echo 🎨 安装PyVistaQt (Qt集成)
pip install pyvistaqt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ PyVistaQt安装失败
) else (
    echo ✅ PyVistaQt安装成功
)

echo.
echo 📊 安装其他依赖
pip install vtk numpy matplotlib scipy
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 部分依赖安装失败
) else (
    echo ✅ 所有依赖安装成功
)

echo.
echo 🎉 安装完成！现在可以启动专业版3D界面了
echo.
pause