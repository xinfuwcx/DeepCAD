# DeepCAD-SCOUR 启动脚本 (PowerShell)

Write-Host ""
Write-Host "🌊 DeepCAD-SCOUR 桥墩冲刷分析系统" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "✨ 启动全新简洁美观界面..." -ForegroundColor Green
Write-Host ""

# 检查Python是否安装
try {
    $pythonVersion = python --version 2>$null
    Write-Host "✅ Python已安装: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python未找到，请先安装Python" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit
}

# 检查PyQt6是否安装
try {
    python -c "import PyQt6" 2>$null
    Write-Host "✅ PyQt6已安装" -ForegroundColor Green
} catch {
    Write-Host "⚠️ PyQt6未安装，正在尝试安装..." -ForegroundColor Yellow
    pip install PyQt6
}

Write-Host ""
Write-Host "🚀 正在启动专业版界面 (3D 视口)..." -ForegroundColor Magenta

# 优先启动专业版界面；若失败则回退到简洁版
try {
    python professional_main.py
} catch {
    Write-Host "⚠️ 专业版启动失败，尝试启动简洁版界面..." -ForegroundColor Yellow
    python simple_main.py
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ 程序启动失败" -ForegroundColor Red
    Write-Host "可能的解决方案:" -ForegroundColor Yellow
    Write-Host "1. 确保Python和PyQt6正确安装" -ForegroundColor White
    Write-Host "2. 运行：pip install PyQt6" -ForegroundColor White
    Write-Host "3. 检查文件权限" -ForegroundColor White
}

Write-Host ""
Read-Host "按回车键退出"