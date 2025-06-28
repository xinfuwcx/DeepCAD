@echo off
REM 一键编译Kratos - 深基坑工程专用
REM 确保安装到本项目目录下

echo ==============================================
echo Kratos一键编译 - 深基坑工程专用
echo ==============================================

REM 检查Python环境
echo [INFO] 激活Python虚拟环境...
call "env\Scripts\activate.bat"
if errorlevel 1 (
    echo [ERROR] 无法激活Python环境，请确保虚拟环境存在
    pause
    exit /b 1
)

echo [INFO] 检查Python版本...
python --version

echo [INFO] 检查Kratos源码...
if not exist "Kratos" (
    echo [ERROR] Kratos源码目录不存在，请先运行git clone
    pause
    exit /b 1
)

REM 检查Visual Studio环境
echo [INFO] 检查Visual Studio环境...
cl >nul 2>&1
if errorlevel 1 (
    echo [WARNING] 未检测到Visual Studio编译器
    echo [INFO] 尝试自动配置Visual Studio环境...
    
    REM 尝试不同的Visual Studio版本
    if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" (
        call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
    ) else if exist "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat" (
        call "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat"
    ) else if exist "C:\Program Files\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat" (
        call "C:\Program Files\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat"
    ) else (
        echo [ERROR] 未找到Visual Studio安装，请先安装Visual Studio 2019/2022
        echo 并确保包含C++开发工具
        pause
        exit /b 1
    )
)

echo [INFO] 开始编译Kratos...
python tools\setup\build_kratos_fixed.py

if errorlevel 1 (
    echo [ERROR] 编译失败，请检查日志
    pause
    exit /b 1
)

echo [SUCCESS] Kratos编译完成！
echo [INFO] 安装目录: %CD%\kratos_install_fixed
echo [INFO] 请运行以下命令测试安装:
echo python -c "import KratosMultiphysics; print('Kratos版本:', KratosMultiphysics.Kernel().Version())"

pause
