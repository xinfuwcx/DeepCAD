# 设置编码
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "============================================="
Write-Host "深基坑CAE系统 - 启动前端开发服务器"
Write-Host "============================================="
Write-Host ""

# 检查Node.js版本
$nodeVersion = node --version
if ($nodeVersion -like "*v20*") {
    Write-Host "检测到Node.js v20，继续启动..."
} else {
    Write-Host "警告: 推荐使用Node.js v20版本运行此系统" -ForegroundColor Yellow
    Write-Host "当前版本可能依然兼容，继续启动..." -ForegroundColor Yellow
}

# 切换到前端目录
Write-Host "进入前端目录..."
Set-Location -Path "$PSScriptRoot\..\frontend"

# 检查是否安装了依赖
if (-not (Test-Path -Path "node_modules")) {
    Write-Host "前端依赖未安装，开始安装..." -ForegroundColor Cyan
    npm install
} else {
    Write-Host "依赖已安装，继续启动..." -ForegroundColor Green
}

# 启动前端开发服务器
Write-Host "启动前端开发服务器..." -ForegroundColor Green
Write-Host ""
npm run dev 