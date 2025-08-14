@echo off
chcp 65001 > nul
title DeepCAD 深基坑CAE平台
echo ======================================
echo     DeepCAD 深基坑CAE平台启动器
echo ======================================
echo.

:: 设置环境变量
set PYTHONPATH=%CD%
set DEEPCAD_ROOT=%CD%

:: 检查Python环境
echo [1/4] 检查运行环境...
python --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Python环境异常，请先安装Python或运行 setup.bat
    pause
    exit /b 1
)
echo ✅ Python环境检查通过

:: 选择启动模式
echo.
echo [2/4] 请选择启动模式：
echo.
echo   1. 只启动后端服务 (推荐开发使用)
echo   2. 启动完整服务 (前端+后端，生产环境)
echo   3. 退出
echo.
set /p choice="请输入选项 (1-3): "

if "%choice%"=="1" goto backend_only
if "%choice%"=="2" goto full_service
if "%choice%"=="3" goto exit
echo 无效选项，默认启动后端服务
goto backend_only

:backend_only
echo.
echo [3/4] 启动后端服务...
echo 后端服务将在 http://localhost:8000 运行
echo 按 Ctrl+C 停止服务
echo.
python -m uvicorn gateway.main:app --host 0.0.0.0 --port 8000 --reload
goto end

:full_service
echo.
echo [3/4] 检查前端构建...
if not exist "frontend\dist" (
    echo 正在构建前端...
    cd frontend
    npm install --silent
    npm run build --silent
    if errorlevel 1 (
        echo ❌ 前端构建失败
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo ✅ 前端构建完成
)

echo.
echo [4/4] 启动完整服务...
echo 后端服务: http://localhost:8000
echo 前端服务: http://localhost:5310
echo.

:: 启动后端服务（在新窗口中）
start "DeepCAD Backend" cmd /k "title DeepCAD 后端服务 && python -m uvicorn gateway.main:app --host 0.0.0.0 --port 8000 --reload"

:: 等待后端启动
timeout /t 3 /nobreak > nul

:: 启动前端服务
cd frontend
start "DeepCAD Frontend" cmd /k "title DeepCAD 前端服务 && npm run dev"
cd ..

:: 等待前端启动并打开浏览器
timeout /t 5 /nobreak > nul
start http://localhost:5310

echo.
echo 🚀 DeepCAD 启动完成！
echo.
echo 📋 服务地址：
echo   前端界面: http://localhost:5310
echo   后端API:  http://localhost:8000
echo   API文档:  http://localhost:8000/docs
echo.
goto end

:exit
echo 退出启动器
exit /b 0

:end
pause