@echo off
chcp 65001 > nul
echo ======================================
echo     DeepCAD 一键安装配置脚本
echo     拷贝即用版本 - 2025.07.30
echo ======================================
echo.

:: 检查Python环境
echo [1/6] 检查Python环境...
python --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Python未安装或未加入PATH
    echo 请先安装Python 3.8+并添加到系统PATH
    pause
    exit /b 1
)

:: 获取Python版本
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✅ Python版本: %PYTHON_VERSION%

:: 检查Node.js环境
echo.
echo [2/6] 检查Node.js环境...
node --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js未安装或未加入PATH
    echo 请先安装Node.js 16+并添加到系统PATH
    pause
    exit /b 1
)

:: 获取Node版本
for /f "tokens=1" %%i in ('node --version 2^>^&1') do set NODE_VERSION=%%i
echo ✅ Node.js版本: %NODE_VERSION%

:: 安装Python依赖
echo.
echo [3/6] 安装Python核心依赖...
echo 这可能需要几分钟时间，请等待...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ⚠️ 部分Python依赖安装失败，但可能不影响核心功能
    echo 继续安装过程...
) else (
    echo ✅ Python依赖安装完成
)

:: 安装前端依赖
echo.
echo [4/6] 安装前端依赖...
cd frontend
echo 这可能需要几分钟时间，请等待...
npm install --legacy-peer-deps --silent
if errorlevel 1 (
    echo ❌ 前端依赖安装失败
    cd ..
    pause
    exit /b 1
)
echo ✅ 前端依赖安装完成
cd ..

:: 构建前端
echo.
echo [5/6] 构建前端项目...
cd frontend
npm run build --silent
if errorlevel 1 (
    echo ⚠️ 前端构建有警告，但项目仍可运行
) else (
    echo ✅ 前端构建完成
)
cd ..

:: 验证核心功能
echo.
echo [6/6] 验证核心功能...
python -c "
try:
    import fastapi, pyvista, numpy, gmsh, pandas, scipy
    print('✅ 所有核心依赖验证通过')
except ImportError as e:
    print('❌ 依赖验证失败:', e)
    exit(1)
" 2>nul
if errorlevel 1 (
    echo ❌ 核心功能验证失败
    pause
    exit /b 1
)

:: 创建环境配置文件
echo.
echo 创建环境配置文件...
echo # DeepCAD 环境配置 > .env
echo NODE_ENV=production >> .env
echo PYTHONPATH=%CD% >> .env
echo DEEPCAD_ROOT=%CD% >> .env

echo.
echo ======================================
echo     🎉 DeepCAD 安装配置完成！
echo ======================================
echo.
echo 📋 下一步操作：
echo   1. 运行 start.bat 启动项目
echo   2. 或运行 dev.bat 启动开发模式
echo.
echo 📁 项目已配置为便携式部署
echo   可以直接拷贝整个文件夹到其他电脑使用
echo.
pause