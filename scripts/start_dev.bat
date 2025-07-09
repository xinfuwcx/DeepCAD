@echo off
echo 启动深基坑CAE系统开发环境...

cd frontend
echo 安装依赖...
call npm install

echo 启动开发服务器...
call npm run dev

pause 