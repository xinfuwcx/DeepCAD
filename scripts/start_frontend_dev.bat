@echo off
chcp 65001 > nul
echo =============================================
echo 深基坑CAE系统 - 启动前端开发服务器
echo =============================================
echo.

REM 设置工作目录为项目根目录
cd /d %~dp0\..

REM 设置Node.js路径
set NODE_PATH="C:\Program Files\nodejs"
set PATH=%NODE_PATH%;%PATH%

REM 检查Node.js版本
%NODE_PATH%\node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到Node.js，请确保Node.js已安装在C:\Program Files\nodejs
    goto :error
)

echo Node.js版本:
%NODE_PATH%\node --version
echo.

echo 进入前端目录...
cd frontend

REM 检查是否安装了依赖
if not exist node_modules (
    echo 前端依赖未安装，开始安装...
    call %NODE_PATH%\npm install
) else (
    echo 依赖已安装，继续启动...
)

echo 启动前端开发服务器...
echo.
call %NODE_PATH%\npm run dev

echo.
goto :end

:error
echo.
echo 启动失败，请检查错误信息
pause
exit /b 1

:end
echo.
echo 前端服务器已关闭
pause 