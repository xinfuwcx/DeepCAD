@echo off
chcp 65001 > nul
title DeepCAD 开发模式
echo ======================================
echo     DeepCAD 开发模式启动
echo ======================================
echo.

:: 设置环境变量
set PYTHONPATH=%CD%
set DEEPCAD_ROOT=%CD%
set NODE_ENV=development

:: 检查环境
echo [检查开发环境]
python --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Python环境异常
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo ❌ 前端依赖未安装，请先运行 setup.bat
    pause
    exit /b 1
)

echo ✅ 开发环境准备就绪

:: 启动开发服务
echo.
echo [启动开发服务]

:: 启动后端热重载
echo 启动后端服务 (热重载模式)...
start "DeepCAD Backend Dev" cmd /k "title DeepCAD 后端开发 && echo FastAPI开发服务器 - 热重载已启用 && python -m uvicorn gateway.main:app --host 0.0.0.0 --port 8000 --reload --log-level debug"

:: 启动前端热重载
echo 启动前端服务 (热重载模式)...
cd frontend
start "DeepCAD Frontend Dev" cmd /k "title DeepCAD 前端开发 && echo Vite开发服务器 - 热重载已启用 && npm run dev"
cd ..

:: 等待服务启动
echo.
echo 等待开发服务启动...
timeout /t 5 /nobreak > nul

:: 打开开发工具
echo.
echo 🛠️ 打开开发工具...
start http://localhost:5310
start http://localhost:8000/docs

echo.
echo ======================================
echo     🛠️ DeepCAD 开发模式已启动
echo ======================================
echo.
echo 📋 开发服务：
echo   前端开发: http://localhost:5173 (热重载)
echo   后端开发: http://localhost:8000 (热重载)  
echo   API调试:  http://localhost:8000/docs
echo.
echo 💡 开发模式特性：
echo   ✅ 代码热重载 - 修改代码自动刷新
echo   ✅ 详细日志 - 显示调试信息
echo   ✅ 源码映射 - 方便调试定位
echo.
echo ⚠️ 注意：开发模式仅用于开发调试
echo    生产部署请使用 start.bat
echo.
pause