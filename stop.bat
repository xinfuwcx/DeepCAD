@echo off
chcp 65001 > nul
echo ======================================
echo     DeepCAD 服务停止工具
echo ======================================
echo.

echo [停止DeepCAD相关进程]

:: 停止端口占用的进程
echo 停止端口 8000 (后端服务)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    taskkill /PID %%a /F > nul 2>&1
)

echo 停止端口 5173 (前端服务)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /PID %%a /F > nul 2>&1
)

:: 停止特定进程
echo 停止Python相关服务...
taskkill /F /IM python.exe > nul 2>&1
taskkill /F /IM node.exe > nul 2>&1

:: 关闭相关窗口
echo 关闭DeepCAD服务窗口...
taskkill /F /FI "WindowTitle eq DeepCAD*" > nul 2>&1

echo.
echo ✅ DeepCAD服务已停止
echo.
timeout /t 2 /nobreak > nul