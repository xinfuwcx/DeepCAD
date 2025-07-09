# 深基坑工程开发环境启动脚本
Write-Host "深基坑工程分析平台开发环境启动向导" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# 检查是否安装了Node.js
$hasNode = $false
try {
    $nodeVersion = node -v
    $hasNode = $true
    Write-Host "检测到Node.js版本: $nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "未检测到Node.js。如需完整开发体验，请安装Node.js: https://nodejs.org/" -ForegroundColor Yellow
}

Write-Host "`n可用选项:" -ForegroundColor Cyan
Write-Host "1. 直接打开前端页面 (静态预览，无需Node.js)"
Write-Host "2. 尝试启动完整开发环境 (需要Node.js)"
Write-Host "3. 退出"

$choice = Read-Host "`n请选择操作 (输入数字1-3)"

switch ($choice) {
    "1" {
        Write-Host "`n正在打开前端页面..." -ForegroundColor Green
        Start-Process "$PSScriptRoot\frontend\index.html"
    }
    "2" {
        if (-not $hasNode) {
            Write-Host "`n未检测到Node.js，无法启动完整开发环境。" -ForegroundColor Red
            Write-Host "请先安装Node.js: https://nodejs.org/" -ForegroundColor Yellow
            return
        }
        
        Write-Host "`n正在尝试启动前端开发服务器..." -ForegroundColor Green
        try {
            Set-Location "$PSScriptRoot\frontend"
            npm run dev
        } catch {
            Write-Host "启动前端开发服务器失败: $_" -ForegroundColor Red
        }
    }
    "3" {
        Write-Host "`n感谢使用！再见！" -ForegroundColor Green
    }
    default {
        Write-Host "`n无效选择，请重新运行脚本并选择有效选项 (1-3)。" -ForegroundColor Red
    }
} 