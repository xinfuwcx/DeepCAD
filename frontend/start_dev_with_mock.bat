@echo off
echo 启动深基坑CAE系统开发环境(带模拟后端)...

cd src
set VITE_USE_MOCK_API=true
npx vite --port 3000 --host

pause 