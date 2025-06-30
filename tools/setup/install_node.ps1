# 安装Node.js和npm到项目环境
param(
    [string]$InstallPath = "e:\Deep Excavation\env"
)

Write-Host "开始安装Node.js和npm到项目环境..." -ForegroundColor Green

# 创建下载目录
$DownloadPath = Join-Path $InstallPath "Downloads"
if (-not (Test-Path $DownloadPath)) {
    New-Item -ItemType Directory -Path $DownloadPath -Force | Out-Null
}

# Node.js 版本
$NodeVersion = "v20.10.0"
$NodeUrl = "https://nodejs.org/dist/$NodeVersion/node-$NodeVersion-win-x64.zip"
$NodeZipPath = Join-Path $DownloadPath "node-$NodeVersion-win-x64.zip"
$NodeExtractPath = Join-Path $InstallPath "node"

try {
    # 下载Node.js
    Write-Host "下载Node.js $NodeVersion ..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $NodeUrl -OutFile $NodeZipPath -UseBasicParsing
    
    # 解压Node.js
    Write-Host "解压Node.js..." -ForegroundColor Yellow
    if (Test-Path $NodeExtractPath) {
        Remove-Item -Path $NodeExtractPath -Recurse -Force
    }
    
    Expand-Archive -Path $NodeZipPath -DestinationPath $InstallPath -Force
    Rename-Item -Path (Join-Path $InstallPath "node-$NodeVersion-win-x64") -NewName "node"
    
    # 创建符号链接到Scripts目录
    $ScriptsPath = Join-Path $InstallPath "Scripts"
    if (-not (Test-Path $ScriptsPath)) {
        New-Item -ItemType Directory -Path $ScriptsPath -Force | Out-Null
    }
    
    $NodeExePath = Join-Path $NodeExtractPath "node.exe"
    $NpmPath = Join-Path $NodeExtractPath "npm"
    $NpmCmdPath = Join-Path $NodeExtractPath "npm.cmd"
    $NpxPath = Join-Path $NodeExtractPath "npx"
    $NpxCmdPath = Join-Path $NodeExtractPath "npx.cmd"
    
    # 复制执行文件到Scripts目录
    Copy-Item -Path $NodeExePath -Destination (Join-Path $ScriptsPath "node.exe") -Force
    Copy-Item -Path $NpmPath -Destination (Join-Path $ScriptsPath "npm") -Force
    Copy-Item -Path $NpmCmdPath -Destination (Join-Path $ScriptsPath "npm.cmd") -Force
    Copy-Item -Path $NpxPath -Destination (Join-Path $ScriptsPath "npx") -Force
    Copy-Item -Path $NpxCmdPath -Destination (Join-Path $ScriptsPath "npx.cmd") -Force
    
    # 复制node_modules目录
    $NodeModulesSource = Join-Path $NodeExtractPath "node_modules"
    $NodeModulesTarget = Join-Path $ScriptsPath "node_modules"
    if (Test-Path $NodeModulesSource) {
        Copy-Item -Path $NodeModulesSource -Destination $NodeModulesTarget -Recurse -Force
    }
    
    # 测试安装
    Write-Host "测试Node.js安装..." -ForegroundColor Yellow
    $NodeTestPath = Join-Path $ScriptsPath "node.exe"
    $NodeTestResult = & $NodeTestPath --version
    Write-Host "Node.js版本: $NodeTestResult" -ForegroundColor Green
    
    $NpmTestPath = Join-Path $ScriptsPath "npm.cmd"
    $NpmTestResult = & $NpmTestPath --version
    Write-Host "npm版本: $NpmTestResult" -ForegroundColor Green
    
    # 清理下载文件
    Remove-Item -Path $DownloadPath -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-Host "Node.js和npm安装完成!" -ForegroundColor Green
    
} catch {
    Write-Host "安装失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
