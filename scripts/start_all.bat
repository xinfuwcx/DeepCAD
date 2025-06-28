@echo off
echo ====================================================
echo 深基坑CAE系统启动脚本
echo ====================================================
echo.

REM 设置环境变量
set PYTHONPATH=%PYTHONPATH%;%CD%
set PATH=%PATH%;%CD%\bin

REM 检查Python是否安装
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] Python未安装或未添加到PATH环境变量中
    echo 请安装Python 3.8或更高版本
    pause
    exit /b 1
)

echo [信息] 正在检查依赖项...
python check_all.py
if %ERRORLEVEL% NEQ 0 (
    echo [警告] 依赖检查可能不完整，但将继续启动系统
)

echo.
echo [信息] 正在启动后端服务器...
start /B cmd /c "cd src && python server\app.py"

echo [信息] 等待后端服务器启动...
timeout /t 5 /nobreak >nul

echo [信息] 正在启动前端服务...
cd frontend
npm run dev

echo.
echo [信息] 系统已关闭
pause 