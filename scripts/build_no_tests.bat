@echo off
rem 此批处理文件用于构建Kratos Core（禁用测试）

echo 设置环境变量...
set CC=cl.exe
set CXX=cl.exe
set BOOST_ROOT=D:\Program Files\boost_1_88_0
set PYTHON_EXECUTABLE=D:\ProgramData\miniconda3\python.exe

rem 设置路径
set KRATOS_SOURCE=%~dp0..\core\kratos_source\kratos
set KRATOS_BUILD=%KRATOS_SOURCE%\build
set BUILD_TYPE=Release
set BUILD_PATH=%KRATOS_BUILD%\%BUILD_TYPE%

rem 创建构建目录
if not exist "%KRATOS_BUILD%" mkdir "%KRATOS_BUILD%"
if not exist "%BUILD_PATH%" mkdir "%BUILD_PATH%"

rem 清理之前的构建文件
echo 清理之前的构建文件...
if exist "%BUILD_PATH%\cmake_install.cmake" del /F /Q "%BUILD_PATH%\cmake_install.cmake"
if exist "%BUILD_PATH%\CMakeCache.txt" del /F /Q "%BUILD_PATH%\CMakeCache.txt"
if exist "%BUILD_PATH%\CMakeFiles" rmdir /S /Q "%BUILD_PATH%\CMakeFiles"

rem 设置Visual Studio环境
echo 设置Visual Studio 2022环境...
call "D:\Program Files\Microsoft Visual Studio\2022\Professional\Common7\Tools\VsDevCmd.bat"

rem 配置CMake
echo 配置Kratos Core（禁用测试）...
cmake -G"Visual Studio 17 2022" -A x64 ^
      -H"%KRATOS_SOURCE%" ^
      -B"%BUILD_PATH%" ^
      -DUSE_MPI=OFF ^
      -DUSE_EIGEN_MKL=OFF ^
      -DKRATOS_BUILD_TESTING=OFF ^
      -DCMAKE_CXX_FLAGS="/MP8" ^
      -DPYTHON_EXECUTABLE="%PYTHON_EXECUTABLE%" ^
      -DBOOST_ROOT="%BOOST_ROOT%"

if %ERRORLEVEL% NEQ 0 (
    echo 配置失败！
    pause
    exit /b 1
)

rem 构建
echo 构建Kratos Core...
cmake --build "%BUILD_PATH%" --target install --config %BUILD_TYPE% -- /p:Platform=x64 /m:4

if %ERRORLEVEL% NEQ 0 (
    echo 构建失败！
    pause
    exit /b 1
)

echo.
echo ========================================
echo Kratos Core构建成功完成！
echo ========================================
echo.
echo 下一步:
echo 1. 添加Kratos到您的PYTHONPATH:
echo    set PYTHONPATH=%%PYTHONPATH%%;%KRATOS_SOURCE%\bin\%BUILD_TYPE%
echo.
echo 2. 添加Kratos库到您的PATH:
echo    set PATH=%%PATH%%;%KRATOS_SOURCE%\bin\%BUILD_TYPE%\libs
echo.

pause 