@echo off
chcp 65001 > nul
echo =============================================
echo 深基坑CAE系统 - 启动前端开发服务器
echo =============================================
echo.

REM 检查Node.js版本
node --version > temp.txt
findstr /C:"v20" temp.txt > nul
if %errorlevel% equ 0 (
    echo 检测到Node.js v20，继续启动...
) else (
    echo 警告: 推荐使用Node.js v20版本运行此系统
    echo 当前版本可能依然兼容，继续启动...
)
del temp.txt

REM 切换到前端目录
echo 进入前端目录...
cd frontend

REM 检查是否安装了依赖
if not exist node_modules (
    echo 前端依赖未安装，开始安装...
    call npm install
) else (
    echo 依赖已安装，继续启动...
)

echo 启动前端开发服务器...
echo.
call npm run dev 