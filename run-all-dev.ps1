#深基坑工程分析平台开发环境启动脚本
# 此脚本会启动前端和后端服务，并配置必要的环境变量

Write-Host "正在启动深基坑工程分析平台开发环境..." -ForegroundColor Cyan

# 设置Kratos环境变量
$KratosDir = Join-Path $PSScriptRoot "Kratos"
$KratosInstallDir = Join-Path $KratosDir "install"

if (-not (Test-Path $KratosInstallDir)) {
    Write-Host "Kratos尚未安装或构建，正在运行配置和构建脚本..." -ForegroundColor Yellow
    
    # 切换到Kratos目录并运行构建脚本
    Push-Location $KratosDir
    try {
        # Corrected script name from configure_and_build.bat to run build scripts
        & .\\configure.ps1
        & .\\build.ps1
    }
    finally {
        Pop-Location
    }
    
    if (-not (Test-Path $KratosInstallDir)) {
        Write-Host "Kratos构建失败，请检查错误信息并手动构建。" -ForegroundColor Red
        exit 1
    }
}

# 将Kratos添加到环境变量
$env:PYTHONPATH = "$KratosInstallDir;$env:PYTHONPATH"
$env:PATH = "$KratosInstallDir;$env:PATH"

Write-Host "Kratos环境变量已配置。" -ForegroundColor Green

# 启动后端服务
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot
    python run_backend.py
}

Write-Host "后端服务正在启动..." -ForegroundColor Green

# 等待后端服务启动完成
Start-Sleep -Seconds 2

# 启动前端服务
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot
    python run_frontend.py
}

Write-Host "前端服务正在启动..." -ForegroundColor Green

# 显示作业状态
Write-Host "\`n当前运行的服务:" -ForegroundColor Cyan
Get-Job | Format-Table -Property Id, Name, State

# 等待用户按下Ctrl+C
Write-Host "\`n服务已启动。按 Ctrl+C 停止所有服务。" -ForegroundColor Yellow
Write-Host "访问 http://localhost:3000 查看前端界面。" -ForegroundColor Yellow
Write-Host "后端API地址为 http://localhost:8000/api" -ForegroundColor Yellow

try {
    # 保持脚本运行，直到用户按下Ctrl+C
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    # 停止所有作业
    Get-Job | Stop-Job
    Get-Job | Remove-Job
    
    Write-Host "\`n已停止所有服务。" -ForegroundColor Cyan
} 