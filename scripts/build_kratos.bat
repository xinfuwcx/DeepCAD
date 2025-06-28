@echo off
echo ======================================
echo Kratos编译脚本 - 深基坑工程专用
echo 包含IGA、优化、地质力学等模块
echo ======================================

REM 检查Python环境
python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python未安装或未添加到PATH
    echo 请先安装Python 3.7或更高版本
    pause
    exit /b 1
)

REM 检查CMake
cmake --version > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] CMake未安装或未添加到PATH
    echo 请先安装CMake 3.16或更高版本
    pause
    exit /b 1
)

REM 检查Git
git --version > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git未安装或未添加到PATH
    echo 请先安装Git
    pause
    exit /b 1
)

REM 检查Visual Studio
cl > nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Visual Studio编译器未检测到
    echo 请确保已安装Visual Studio 2019或更高版本
    echo 并运行了vcvars64.bat设置环境变量
    echo.
    echo 继续编译... (按任意键继续，Ctrl+C取消)
    pause > nul
)

echo [INFO] 环境检查完成，开始编译...
echo.

REM 运行Python编译脚本
python "tools\setup\build_kratos_quick.py"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] 编译失败！
    echo 请检查上述错误信息
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Kratos编译完成！
echo 请运行 setup_kratos_env.bat 设置环境变量
echo.
pause
