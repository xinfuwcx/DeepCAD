@echo off
title DeepCAD-SCOUR Professional v2.0
color 0A

echo.
echo     ████████╗  ██████╗ ███████╗██████╗  ██████╗ █████╗ ██████╗        
echo     ██╔══════║ ██╔════╝ ██╔════╝██╔══██╗██╔════╝██╔══██╗██╔══██╗       
echo     ██████╗   █████╗   █████╗  ██████╔╝██║     ███████║██║  ██║       
echo     ██╔═══╝   ██╔══╝   ██╔══╝  ██╔═══╝ ██║     ██╔══██║██║  ██║       
echo     ██████╗   ███████╗ ███████╗██║     ╚██████╗██║  ██║██████╔╝       
echo     ╚═════╝   ╚══════╝ ╚══════╝╚═╝      ╚═════╝╚═╝  ╚═╝╚═════╝        
echo.                                                                      
echo     S C O U R   S I M U L A T I O N   S Y S T E M   P r o f e s s i o n a l
echo     ========================================================================
echo.
echo     [信息] 桥墩浅蚀数值模拟专业版 - Abaqus级工程分析软件
echo     [版本] DeepCAD-SCOUR Professional v2.0 
echo     [环境] FEniCSx + PyVista + Qt6 Professional Suite
echo.

echo [1/4] 正在激活FEniCS专业计算环境...
call "D:\ProgramData\miniconda3\Scripts\activate.bat" fenicsx-final

echo.
echo [2/4] 检查核心组件状态...
python -c "import sys; print('     ✓ Python:', sys.version[:5])" 2>nul || echo "     ✗ Python环境异常"
python -c "import pyvista; print('     ✓ PyVista:', pyvista.__version__, '(3D渲染引擎)')" 2>nul || echo "     ✗ PyVista不可用"
python -c "import numpy; print('     ✓ NumPy:', numpy.__version__, '(数值计算)')" 2>nul || echo "     ✗ NumPy不可用"
python -c "import matplotlib; print('     ✓ Matplotlib:', matplotlib.__version__, '(可视化)')" 2>nul || echo "     ✗ Matplotlib不可用"

echo.
echo [3/4] 检查数值求解器状态...
python -c "try: import basix; print('     ✓ Basix:', basix.__version__, '(有限元基函数)'); except: print('     ○ Basix: 简化模式')" 2>nul
python -c "try: import ufl; print('     ✓ UFL:', ufl.__version__, '(统一形式语言)'); except: print('     ○ UFL: 简化模式')" 2>nul
python -c "try: import dolfinx; print('     ✓ FEniCSx: 完整功能'); except: print('     ○ FEniCSx: 简化数值模拟 (经验公式+3D可视化)')" 2>nul

echo.
echo [4/4] 启动专业级分析界面...
echo     [界面] Abaqus风格暗色主题 + 高质量3D渲染
echo     [视口] 2400x1400分辨率 + 物理基础渲染 (PBR)
echo     [光照] 工作室级多光源系统 + 渐变背景
echo     [材质] 高级金属/混凝土材质 + 阴影效果
echo.

cd /d "E:\DeepCAD\example6"
python main.py

echo.
if errorlevel 1 (
    echo [错误] 程序异常退出 - 错误代码: %ERRORLEVEL%
    echo [建议] 检查Python环境和依赖包安装状态
) else (
    echo [完成] DeepCAD-SCOUR Professional 已正常关闭
)

echo.
pause