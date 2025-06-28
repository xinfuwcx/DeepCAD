@echo off
chcp 65001 > nul
echo =============================================
echo 深基坑CAE系统 - 启动后端开发服务器
echo =============================================
echo.

REM 设置工作目录为项目根目录
cd /d %~dp0\..

REM 检查Python环境
python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到Python，请确保Python已安装并添加到PATH中
    goto :error
)

REM 检查是否安装了依赖
pip list | findstr fastapi > nul 2>&1
if %errorlevel% neq 0 (
    echo 后端依赖未安装，开始安装...
    pip install -r requirements.minimal.txt
) else (
    echo 依赖已安装，继续启动...
)

echo 启动后端API服务器...
echo.
python -m src.server.app

echo.
goto :end

:error
echo.
echo 启动失败，请检查错误信息
pause
exit /b 1

:end
echo.
echo 后端服务器已关闭
pause 