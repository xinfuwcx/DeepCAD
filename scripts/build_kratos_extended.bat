@echo off
echo ========================================
echo Kratos扩展模块编译
echo 添加IGA、地质力学、优化等专业模块
echo ========================================

REM 检查当前Kratos安装
echo [INFO] 检查现有Kratos安装...
python -c "import KratosMultiphysics; print('[OK] 发现Kratos安装')" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] 未发现Kratos安装
    echo 请先运行 scripts\build_kratos.bat 安装基础Kratos
    pause
    exit /b 1
)

REM 检查缺失的模块
echo [INFO] 检查缺失模块...
python -c "import KratosMultiphysics.GeomechanicsApplication" 2>nul
if %errorlevel% neq 0 (
    echo [MISSING] GeomechanicsApplication
    set NEED_BUILD=1
)

python -c "import KratosMultiphysics.IgaApplication" 2>nul
if %errorlevel% neq 0 (
    echo [MISSING] IgaApplication
    set NEED_BUILD=1
)

python -c "import KratosMultiphysics.OptimizationApplication" 2>nul
if %errorlevel% neq 0 (
    echo [MISSING] OptimizationApplication
    set NEED_BUILD=1
)

if not defined NEED_BUILD (
    echo [OK] 所有扩展模块已安装!
    pause
    exit /b 0
)

echo.
echo [INFO] 发现缺失模块，需要编译扩展版本
echo.
echo 注意事项:
echo - 编译时间约2-4小时
echo - 需要16GB+内存和20GB+存储空间
echo - 确保Visual Studio环境已设置
echo.

choice /M "是否继续编译扩展模块"
if %errorlevel% neq 1 (
    echo [INFO] 用户取消编译
    pause
    exit /b 0
)

echo.
echo [INFO] 开始编译扩展模块...
python tools\setup\build_kratos_extended.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] 扩展模块编译失败!
    echo 请检查上述错误信息
    pause
    exit /b 1
)

echo.
echo [SUCCESS] 扩展模块编译完成!
echo.
echo 下一步:
echo 1. 运行 setup_kratos_extended_env.bat 设置环境
echo 2. 重启Python会话
echo 3. 测试新模块: python examples/kratos_geomech_example.py
echo.
pause
