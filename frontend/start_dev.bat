@echo off
set PATH=%PATH%;C:\Program Files\nodejs
cd "E:\Deep Excavation\frontend"
node_modules\.bin\vite.cmd --config src/vite.config.ts --port 1000
pause
