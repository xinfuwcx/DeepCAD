@echo off
REM ========================================================
REM 运行高级CAE示例程序
REM 包括自适应网格细化、FEM-PINN耦合和参数反演功能
REM ========================================================

echo 深基坑分析系统 - 高级CAE功能示例
echo.

REM 设置Python路径
set PYTHONPATH=%~dp0..

REM 检查Python是否可用
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 未找到Python，请确保Python已安装并添加到PATH环境变量
    exit /b 1
)

REM 创建目录
if not exist "%~dp0..\data\mesh" mkdir "%~dp0..\data\mesh"
if not exist "%~dp0..\data\exchange" mkdir "%~dp0..\data\exchange"
if not exist "%~dp0..\data\results\physics_ai" mkdir "%~dp0..\data\results\physics_ai"

echo 运行示例...
echo.

REM 运行示例脚本
echo 1. 自适应网格细化与FEM-PINN耦合示例
python "%~dp0..\examples\advanced\mesh_refinement_demo.py"
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 示例运行失败
    exit /b 1
)

echo.
echo 2. 运行分步施工分析示例
python "%~dp0..\examples\advanced\staged_construction_analysis.py"
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 示例运行失败
    exit /b 1
)

echo.
echo 3. 运行渗流-结构耦合示例
python "%~dp0..\examples\advanced\seepage_structure_coupling.py"
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 示例运行失败
    exit /b 1
)

echo.
echo 4. 运行非线性收敛加速示例
python "%~dp0..\examples\advanced\convergence_acceleration_demo.py"
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 示例运行失败
    exit /b 1
)

echo.
echo 所有示例运行完成！
echo.

REM 暂停以查看结果
pause 