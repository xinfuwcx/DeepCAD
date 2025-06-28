@echo off
echo =========================================
echo Kratos扩展模块编译 - 修复版本
echo 添加地质力学、IGA、优化等专业模块
echo =========================================

REM 检查Visual Studio环境
echo [INFO] 检查Visual Studio环境...
cl >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Visual Studio编译器环境未设置
    echo.
    echo 请先运行以下命令之一设置VS环境:
    echo.
    if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" (
        echo "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
    )
    if exist "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat" (
        echo "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat"
    )
    if exist "C:\Program Files\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat" (
        echo "C:\Program Files\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat"
    )
    echo.
    echo 然后重新运行此脚本
    pause
    exit /b 1
) else (
    echo [OK] Visual Studio编译器环境已设置
)

echo.
echo [INFO] 准备开始编译...
echo 预计时间: 2-4小时
echo 内存需求: 16GB+
echo 存储需求: 20GB+
echo.

choice /M "确认开始编译扩展模块"
if %errorlevel% neq 1 (
    echo [INFO] 用户取消编译
    pause
    exit /b 0
)

echo.
echo [INFO] 开始编译扩展模块...
python tools\setup\build_kratos_fixed.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] 扩展模块编译失败!
    echo 请检查上述错误信息
    echo.
    echo 常见问题和解决方案:
    echo 1. 内存不足 - 关闭其他程序，增加虚拟内存
    echo 2. 磁盘空间不足 - 清理磁盘空间
    echo 3. VS环境问题 - 重新设置Visual Studio环境
    echo 4. 网络问题 - 检查网络连接和防火墙
    pause
    exit /b 1
)

echo.
echo [SUCCESS] 扩展模块编译完成!
echo.
echo 下一步:
echo 1. 运行 setup_kratos_extended_env.bat 设置环境
echo 2. 重启Python会话
echo 3. 测试新模块功能
echo.
pause
