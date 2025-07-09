@echo off
echo 启动深基坑CAE系统开发环境(带模拟API)...

cd frontend
echo 安装依赖...
call npm install

echo 启动开发服务器(使用模拟API)...
call npm run dev:mock

pause 