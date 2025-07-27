@echo off
rem Configure script for Kratos Core only - DeepCAD Project
rem This script compiles only the Kratos Core without any applications

rem Set compiler
set CC=cl.exe
set CXX=cl.exe

rem Set variables based on user's system paths
set KRATOS_SOURCE=%~dp0..\core\kratos_source\kratos
set KRATOS_BUILD=%KRATOS_SOURCE%\build

rem Set basic configuration
set KRATOS_BUILD_TYPE=Release
set BOOST_ROOT=D:\Program Files\boost_1_88_0
set PYTHON_EXECUTABLE=D:\ProgramData\miniconda3\python.exe

rem No applications - Core only
set KRATOS_APPLICATIONS=

rem Clean previous builds
echo Cleaning previous build files...
if exist "%KRATOS_BUILD%\%KRATOS_BUILD_TYPE%" (
    del /F /Q "%KRATOS_BUILD%\%KRATOS_BUILD_TYPE%\cmake_install.cmake" 2>nul
    del /F /Q "%KRATOS_BUILD%\%KRATOS_BUILD_TYPE%\CMakeCache.txt" 2>nul
    rmdir /S /Q "%KRATOS_BUILD%\%KRATOS_BUILD_TYPE%\CMakeFiles" 2>nul
)

rem Create build directory if it doesn't exist
if not exist "%KRATOS_BUILD%" mkdir "%KRATOS_BUILD%"
if not exist "%KRATOS_BUILD%\%KRATOS_BUILD_TYPE%" mkdir "%KRATOS_BUILD%\%KRATOS_BUILD_TYPE%"

rem Enable parallel compilation for faster builds
set KRATOS_PARALLEL_BUILD_FLAG=/MP8

rem Configure
echo.
echo Configuring Kratos Core...
echo Source: %KRATOS_SOURCE%
echo Build: %KRATOS_BUILD%\%KRATOS_BUILD_TYPE%
echo Python: %PYTHON_EXECUTABLE%
echo Boost: %BOOST_ROOT%
echo.

cmake -G"Visual Studio 17 2022" -A x64 ^
      -H"%KRATOS_SOURCE%" ^
      -B"%KRATOS_BUILD%\%KRATOS_BUILD_TYPE%" ^
      -DUSE_MPI=OFF ^
      -DUSE_EIGEN_MKL=OFF ^
      -DCMAKE_CXX_FLAGS="%KRATOS_PARALLEL_BUILD_FLAG%" ^
      -DPYTHON_EXECUTABLE="%PYTHON_EXECUTABLE%" ^
      -DBOOST_ROOT="%BOOST_ROOT%"

if %ERRORLEVEL% NEQ 0 (
    echo Configuration failed!
    pause
    exit /b 1
)

rem Build
echo.
echo Building Kratos Core...
cmake --build "%KRATOS_BUILD%\%KRATOS_BUILD_TYPE%" --target install --config %KRATOS_BUILD_TYPE% -- /p:Platform=x64 /m:4

if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Kratos Core build completed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Add Kratos to your PYTHONPATH:
echo    set PYTHONPATH=%PYTHONPATH%;%KRATOS_SOURCE%\bin\%KRATOS_BUILD_TYPE%
echo.
echo 2. Add Kratos libs to your PATH:
echo    set PATH=%PATH%;%KRATOS_SOURCE%\bin\%KRATOS_BUILD_TYPE%\libs
echo.
echo 3. Install additional Kratos applications via pip:
echo    pip install KratosMultiphysics-StructuralMechanicsApplication
echo    pip install KratosMultiphysics-FluidDynamicsApplication
echo    etc.
echo.
pause 