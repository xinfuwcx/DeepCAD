@echo off
chcp 65001 > nul
title DeepCAD 深基坑CAE平台
echo ======================================
echo     DeepCAD 深基坑CAE平台启动
echo ======================================
echo.

:: 设置环境变量
set PYTHONPATH=%CD%
set DEEPCAD_ROOT=%CD%

:: 检查环境
echo [1/3] 检查运行环境...
python --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Python环境异常，请先运行 setup.bat
    pause
    exit /b 1
)

if not exist "frontend\dist" (
    echo ⚠️ 前端未构建，正在构建...
    cd frontend
    npm run build --silent
    if errorlevel 1 (
        echo ❌ 前端构建失败
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

echo ✅ 环境检查通过

:: 启动后端服务
echo.
echo [2/3] 启动后端服务...
echo 后端服务将在 http://localhost:8000 运行
start "DeepCAD Backend" cmd /k "title DeepCAD 后端服务 && echo 启动FastAPI服务器... && python -m uvicorn gateway.main:app --host 0.0.0.0 --port 8000 --reload"

:: 等待后端启动
echo 等待后端服务启动...
timeout /t 3 /nobreak > nul

:: 启动前端服务
echo.
echo [3/3] 启动前端服务...
echo 前端服务将在 http://localhost:5173 运行
cd frontend
start "DeepCAD Frontend" cmd /k "title DeepCAD 前端服务 && echo 启动Vite开发服务器... && npm run dev"
cd ..

:: 等待前端启动
echo 等待前端服务启动...
timeout /t 3 /nobreak > nul

:: 自动打开浏览器
echo.
echo 🚀 正在打开DeepCAD应用...
timeout /t 2 /nobreak > nul
start http://localhost:5173

echo.
echo ======================================
echo     🎉 DeepCAD 启动完成！
echo ======================================
echo.
echo 📋 服务地址：
echo   前端界面: http://localhost:5173
echo   后端API:  http://localhost:8000
echo   API文档:  http://localhost:8000/docs
echo.
echo 💡 使用说明：
echo   - 关闭此窗口不会停止服务
echo   - 要停止服务请关闭对应的服务窗口
echo   - 或运行 stop.bat 停止所有服务
echo.
pause