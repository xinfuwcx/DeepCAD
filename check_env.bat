@echo off
chcp 65001 > nul
echo ======================================
echo     DeepCAD 环境检查工具
echo ======================================
echo.

set "ERROR_COUNT=0"

:: 检查Python
echo [检查Python环境]
python --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Python未安装或未加入PATH
    set /a ERROR_COUNT+=1
) else (
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
    echo ✅ Python版本: %PYTHON_VERSION%
)

:: 检查Node.js
echo.
echo [检查Node.js环境]
node --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js未安装或未加入PATH
    set /a ERROR_COUNT+=1
) else (
    for /f "tokens=1" %%i in ('node --version 2^>^&1') do set NODE_VERSION=%%i
    echo ✅ Node.js版本: %NODE_VERSION%
)

:: 检查npm
npm --version > nul 2>&1
if errorlevel 1 (
    echo ❌ npm不可用
    set /a ERROR_COUNT+=1
) else (
    for /f "tokens=1" %%i in ('npm --version 2^>^&1') do set NPM_VERSION=%%i
    echo ✅ npm版本: %NPM_VERSION%
)

:: 检查Python核心包
echo.
echo [检查Python核心依赖]
python -c "import fastapi; print('✅ FastAPI:', fastapi.__version__)" 2>nul || (echo ❌ FastAPI缺失 & set /a ERROR_COUNT+=1)
python -c "import pyvista; print('✅ PyVista:', pyvista.__version__)" 2>nul || (echo ❌ PyVista缺失 & set /a ERROR_COUNT+=1)
python -c "import numpy; print('✅ NumPy:', numpy.__version__)" 2>nul || (echo ❌ NumPy缺失 & set /a ERROR_COUNT+=1)
python -c "import gmsh; print('✅ Gmsh: 可用')" 2>nul || (echo ❌ Gmsh缺失 & set /a ERROR_COUNT+=1)

:: 检查前端依赖
echo.
echo [检查前端环境]
if exist "frontend\node_modules" (
    echo ✅ 前端依赖已安装
) else (
    echo ❌ 前端依赖未安装
    set /a ERROR_COUNT+=1
)

if exist "frontend\dist" (
    echo ✅ 前端已构建
) else (
    echo ⚠️ 前端未构建
)

:: 检查Kratos
echo.
echo [检查Kratos环境]
python -c "import KratosMultiphysics; print('✅ Kratos:', KratosMultiphysics.__version__)" 2>nul || (echo ⚠️ Kratos未安装或不可用)

:: 总结
echo.
echo ======================================
if %ERROR_COUNT%==0 (
    echo ✅ 环境检查通过！项目可以正常运行
    echo 运行 start.bat 启动项目
) else (
    echo ❌ 发现 %ERROR_COUNT% 个问题
    echo 运行 setup.bat 重新配置环境
)
echo ======================================
echo.
pause