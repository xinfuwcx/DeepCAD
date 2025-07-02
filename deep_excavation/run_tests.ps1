#!/usr/bin/env pwsh
# 测试运行脚本，支持单元测试和集成测试

param(
    [switch]$unit,
    [switch]$integration,
    [switch]$coverage,
    [switch]$verbose
)

# 进入项目目录
cd $PSScriptRoot

# 确定测试参数
$testParams = @()

# 根据参数设置测试类型
if ($unit) {
    $testParams += "backend/tests/unit/"
}
if ($integration) {
    $testParams += "backend/tests/integration/"
}
if (-not $unit -and -not $integration) {
    # 默认运行所有测试
    $testParams += "backend/tests/"
}

# 设置测试覆盖率参数
if ($coverage) {
    $testParams += "--cov=backend"
    $testParams += "--cov-report=term"
    $testParams += "--cov-report=html:coverage_report"
}

# 详细模式
if ($verbose) {
    $testParams += "-v"
}

# 构建命令字符串
$command = "python -m pytest $($testParams -join ' ')"

# 输出执行的命令
Write-Host "执行命令: $command" -ForegroundColor Yellow

# 运行测试
Invoke-Expression $command

# 显示测试报告
if ($coverage) {
    Write-Host "测试覆盖率报告已生成在: $PSScriptRoot\coverage_report\index.html" -ForegroundColor Green
    
    # 如果在Windows系统上，可以自动打开报告
    if ($IsWindows -or ($null -eq $IsWindows)) {
        Start-Process "$PSScriptRoot\coverage_report\index.html"
    }
} 