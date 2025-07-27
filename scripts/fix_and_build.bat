@echo off
rem 此批处理文件用于修复googletest并构建Kratos Core

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
set FETCH_CONTENT_DIR=%BUILD_PATH%\_deps
set GOOGLETEST_DIR=%FETCH_CONTENT_DIR%\googletest-src
set TEMP_DIR=%TEMP%\googletest_fix
set GOOGLETEST_URL=https://github.com/google/googletest/archive/03597a01ee50ed33e9dfd640b249b4be3799d395.zip
set GOOGLETEST_ZIP=%TEMP_DIR%\googletest.zip

rem 创建临时目录
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

rem 检查并清理现有的googletest目录
if exist "%GOOGLETEST_DIR%" (
    echo 清理现有的googletest目录...
    rmdir /S /Q "%GOOGLETEST_DIR%"
)

rem 创建构建目录
if not exist "%KRATOS_BUILD%" mkdir "%KRATOS_BUILD%"
if not exist "%BUILD_PATH%" mkdir "%BUILD_PATH%"
if not exist "%FETCH_CONTENT_DIR%" mkdir "%FETCH_CONTENT_DIR%"

rem 清理之前的构建文件
echo 清理之前的构建文件...
if exist "%BUILD_PATH%\cmake_install.cmake" del /F /Q "%BUILD_PATH%\cmake_install.cmake"
if exist "%BUILD_PATH%\CMakeCache.txt" del /F /Q "%BUILD_PATH%\CMakeCache.txt"
if exist "%BUILD_PATH%\CMakeFiles" rmdir /S /Q "%BUILD_PATH%\CMakeFiles"

rem 下载googletest
echo 正在下载googletest...
curl -L %GOOGLETEST_URL% -o %GOOGLETEST_ZIP%

rem 确保下载成功
if not exist "%GOOGLETEST_ZIP%" (
    echo 下载googletest失败，请检查网络连接或代理设置。
    pause
    exit /b 1
)

rem 解压googletest
echo 正在解压googletest...
powershell -Command "Expand-Archive -Path '%GOOGLETEST_ZIP%' -DestinationPath '%TEMP_DIR%' -Force"

rem 移动解压的文件到正确位置
for /d %%i in ("%TEMP_DIR%\googletest*") do (
    echo 移动 %%i 到 %GOOGLETEST_DIR%
    xcopy "%%i" "%GOOGLETEST_DIR%" /E /I /Y
)

rem 修改CMakeLists.txt以跳过FetchContent下载
echo 修改CMakeLists.txt以使用本地googletest...
powershell -Command "(Get-Content '%KRATOS_SOURCE%\CMakeLists.txt') -replace 'FetchContent_Declare\(\s*googletest\s*URL\s*https://github.com/google/googletest/archive/03597a01ee50ed33e9dfd640b249b4be3799d395.zip\s*\)', 'FetchContent_Declare(googletest SOURCE_DIR \"%GOOGLETEST_DIR:\=/%\")' | Out-File '%KRATOS_SOURCE%\CMakeLists.txt' -Encoding utf8"

rem 设置Visual Studio环境
echo 设置Visual Studio 2022环境...
call "D:\Program Files\Microsoft Visual Studio\2022\Professional\Common7\Tools\VsDevCmd.bat"

rem 配置CMake
echo 配置Kratos Core...
cmake -G"Visual Studio 17 2022" -A x64 ^
      -H"%KRATOS_SOURCE%" ^
      -B"%BUILD_PATH%" ^
      -DUSE_MPI=OFF ^
      -DUSE_EIGEN_MKL=OFF ^
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