@echo off
REM SimPEG 界面启动脚本 (Windows)

echo ================================================
echo SimPEG 专业地球物理界面启动脚本
echo ================================================

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

echo 检查Python环境... 完成

REM 进入项目目录
cd /d "%~dp0"

echo 当前目录: %CD%

REM 检查虚拟环境
if exist ".venv\Scripts\activate.bat" (
    echo 激活虚拟环境...
    call .venv\Scripts\activate.bat
) else (
    echo 警告: 未找到虚拟环境，使用系统Python
)

REM 检查依赖包
echo 检查依赖包...
python -c "import sys; print('Python版本:', sys.version)"

REM 尝试导入关键包
python -c "import numpy, scipy, matplotlib; print('科学计算包: 正常')"
if errorlevel 1 (
    echo 错误: 科学计算包缺失，正在安装...
    pip install numpy scipy matplotlib pandas
)

python -c "import PyQt6; print('PyQt6: 正常')"
if errorlevel 1 (
    echo 错误: PyQt6缺失，正在安装...
    pip install PyQt6
)

python -c "import pyvista; print('PyVista: 正常')"
if errorlevel 1 (
    echo 错误: PyVista缺失，正在安装...
    pip install pyvista pyvistaqt
)

REM 检查SimPEG
python -c "import SimPEG; print('SimPEG版本:', SimPEG.__version__)"
if errorlevel 1 (
    echo 错误: SimPEG缺失，正在安装...
    pip install simpeg discretize
)

echo.
echo 依赖包检查完成，启动界面...
echo.

REM 启动界面
python run_simpeg_gui.py

if errorlevel 1 (
    echo.
    echo 启动失败，尝试运行示例...
    python complete_workflow_example.py
)

echo.
echo 程序已退出
pause
