# PowerShell script to build Kratos Core with Visual Studio 2022
# This script sets up the Visual Studio environment and calls the batch file
# 使用UTF-8编码，避免乱码问题

# 设置输出编码为UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "设置Visual Studio 2022环境..." -ForegroundColor Green

# Path to Visual Studio 2022
$vsPath = "D:\Program Files\Microsoft Visual Studio\2022\Professional"
$vsDevCmd = "$vsPath\Common7\Tools\VsDevCmd.bat"

if (-not (Test-Path $vsDevCmd)) {
    Write-Host "错误：未在 $vsPath 找到Visual Studio 2022" -ForegroundColor Red
    Write-Host "请检查您的Visual Studio安装路径。" -ForegroundColor Red
    exit 1
}

# Get the directory of this script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$batchFile = Join-Path $scriptDir "configure_kratos_core.bat"

if (-not (Test-Path $batchFile)) {
    Write-Host "错误：在 $scriptDir 中未找到configure_kratos_core.bat" -ForegroundColor Red
    exit 1
}

Write-Host "找到Visual Studio在: $vsPath" -ForegroundColor Cyan
Write-Host "运行Kratos Core构建配置..." -ForegroundColor Cyan

# 创建一个临时批处理文件
$tempBatchFile = Join-Path $env:TEMP "run_kratos_build_temp.bat"
@"
@echo off
call "$vsDevCmd"
call "$batchFile"
"@ | Out-File -FilePath $tempBatchFile -Encoding ASCII

# 使用cmd执行批处理文件
Write-Host "执行构建命令..." -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList "/c", $tempBatchFile -Wait -NoNewWindow

# 删除临时批处理文件
Remove-Item $tempBatchFile -Force -ErrorAction SilentlyContinue

Write-Host "`n构建过程完成。" -ForegroundColor Green 

# 防止窗口立即关闭
Write-Host "按任意键继续..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 