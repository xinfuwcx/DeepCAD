@echo off
echo =============================================
echo 深基坑CAE系统 - 启动前端开发服务器
echo =============================================

:: 使用PowerShell设置Node.js路径
powershell -Command "$env:PATH += ';C:\Program Files\nodejs'; if ($?) { exit 0 } else { exit 1 }"
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 无法设置Node.js路径
    pause
    exit /b 1
)

:: 检查Node.js是否可用
powershell -Command "if (Get-Command node -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 未找到Node.js，请确保Node.js已安装并添加到PATH中
    echo 启动失败，请检查错误信息
    pause
    exit /b 1
)

echo Node.js版本:
powershell -Command "node --version"

:: 切换到前端目录
cd /d %~dp0\..\frontend

:: 检查是否安装了依赖
if not exist node_modules (
    echo 正在安装前端依赖...
    powershell -Command "npm install"
    if %ERRORLEVEL% NEQ 0 (
        echo 依赖安装失败，请检查错误信息
        pause
        exit /b 1
    )
) else (
    echo 依赖已安装，继续启动...
)

:: 启动开发服务器
echo 启动前端开发服务器...
powershell -Command "npm run dev"

:: 如果开发服务器关闭，显示消息
echo 前端开发服务器已关闭
pause 