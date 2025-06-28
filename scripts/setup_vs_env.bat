@echo off
REM 设置Visual Studio编译环境的批处理脚本
echo Setting up Visual Studio build environment...

REM 查找Visual Studio安装路径
set "VS_INSTALL_PATH="

REM 检查常见的Visual Studio安装路径
for %%i in (2022 2019) do (
    for %%j in (Community Professional Enterprise) do (
        if exist "C:\Program Files\Microsoft Visual Studio\%%i\%%j\VC\Auxiliary\Build\vcvarsall.bat" (
            set "VS_INSTALL_PATH=C:\Program Files\Microsoft Visual Studio\%%i\%%j\VC\Auxiliary\Build\vcvarsall.bat"
            goto :found
        )
        if exist "C:\Program Files (x86)\Microsoft Visual Studio\%%i\%%j\VC\Auxiliary\Build\vcvarsall.bat" (
            set "VS_INSTALL_PATH=C:\Program Files (x86)\Microsoft Visual Studio\%%i\%%j\VC\Auxiliary\Build\vcvarsall.bat"
            goto :found
        )
    )
)

REM 检查Build Tools
for %%i in (2022 2019) do (
    if exist "C:\Program Files (x86)\Microsoft Visual Studio\%%i\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" (
        set "VS_INSTALL_PATH=C:\Program Files (x86)\Microsoft Visual Studio\%%i\BuildTools\VC\Auxiliary\Build\vcvarsall.bat"
        goto :found
    )
)

:found
if "%VS_INSTALL_PATH%"=="" (
    echo ERROR: Visual Studio not found!
    echo Please install Visual Studio 2019 or later with C++ workload
    echo Available downloads:
    echo - Visual Studio Community: https://visualstudio.microsoft.com/vs/community/
    echo - Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
    pause
    exit /b 1
)

echo Found Visual Studio at: %VS_INSTALL_PATH%
echo Setting up x64 build environment...

REM 设置64位编译环境
call "%VS_INSTALL_PATH%" amd64

REM 验证编译器
echo Testing compiler...
cl /? >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS: Visual Studio environment is ready!
    echo Compiler version:
    cl 2>&1 | findstr "Microsoft"
) else (
    echo ERROR: Failed to initialize Visual Studio environment
    exit /b 1
)

echo.
echo You can now run:
echo   python build_kratos.py
echo.
pause
