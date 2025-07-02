# PowerShell脚本：启动深基坑工程分析平台开发环境
# 此脚本用于Windows环境，解决&&操作符不支持的问题

Write-Host "=== 启动深基坑工程分析平台开发环境 ===" -ForegroundColor Green

# 定义工作目录
$workDir = "E:\Deep Excavation"

# 启动后端服务器
Write-Host "启动后端服务器..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workDir'; python deep_excavation/run_backend.py"

# 等待3秒
Write-Host "等待后端启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 启动前端开发服务器
Write-Host "启动前端开发服务器..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workDir'; python deep_excavation/run_frontend.py"

Write-Host "=== 开发环境已启动 ===" -ForegroundColor Green
Write-Host "后端服务器: http://localhost:8000" -ForegroundColor Magenta
Write-Host "前端服务器: http://localhost:3000" -ForegroundColor Magenta
Write-Host "请在浏览器中访问前端地址来使用应用。" -ForegroundColor White

# 等待用户按键
Write-Host "按Enter键退出脚本..." -ForegroundColor Gray
Read-Host 