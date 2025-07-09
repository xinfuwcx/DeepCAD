# 修复 googletest 构建问题的 PowerShell 脚本
# 使用UTF-8编码，避免乱码问题

# 设置输出编码为UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "开始修复 googletest 构建问题..." -ForegroundColor Green

# 设置路径
$kratosSource = Join-Path $PSScriptRoot "..\core\kratos_source\kratos"
$buildDir = Join-Path $kratosSource "build\Release"
$fetchContentDir = Join-Path $buildDir "_deps"
$googletestDir = Join-Path $fetchContentDir "googletest-src"

# 创建临时目录
$tempDir = Join-Path $env:TEMP "googletest_fix"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
}

# 检查并清理现有的 googletest 目录
if (Test-Path $googletestDir) {
    Write-Host "清理现有的 googletest 目录..." -ForegroundColor Cyan
    Remove-Item -Path $googletestDir -Recurse -Force -ErrorAction SilentlyContinue
}

# 下载 googletest
$googletestUrl = "https://github.com/google/googletest/archive/03597a01ee50ed33e9dfd640b249b4be3799d395.zip"
$googletestZip = Join-Path $tempDir "googletest.zip"

Write-Host "正在下载 googletest..." -ForegroundColor Cyan
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $googletestUrl -OutFile $googletestZip
} catch {
    Write-Host "下载失败，尝试使用备用方法..." -ForegroundColor Yellow
    Start-Process -FilePath "curl" -ArgumentList "-L", $googletestUrl, "-o", $googletestZip -Wait -NoNewWindow
}

# 确保下载成功
if (-not (Test-Path $googletestZip) -or (Get-Item $googletestZip).Length -eq 0) {
    Write-Host "下载 googletest 失败，请检查网络连接或代理设置。" -ForegroundColor Red
    exit 1
}

# 解压 googletest
Write-Host "正在解压 googletest..." -ForegroundColor Cyan
if (-not (Test-Path $fetchContentDir)) {
    New-Item -ItemType Directory -Path $fetchContentDir | Out-Null
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($googletestZip, $tempDir)

# 移动解压的文件到正确位置
$extractedDir = Get-ChildItem -Path $tempDir -Directory | Where-Object { $_.Name -like "googletest*" } | Select-Object -First 1
if ($extractedDir) {
    Move-Item -Path $extractedDir.FullName -Destination $googletestDir -Force
} else {
    Write-Host "无法找到解压后的 googletest 目录。" -ForegroundColor Red
    exit 1
}

# 修改 CMakeLists.txt 以跳过 FetchContent 下载
$cmakeListsPath = Join-Path $kratosSource "CMakeLists.txt"
$cmakeContent = Get-Content $cmakeListsPath -Raw

if ($cmakeContent -match "FetchContent_Declare\(\s*googletest") {
    Write-Host "修改 CMakeLists.txt 以使用本地 googletest..." -ForegroundColor Cyan
    
    # 创建备份
    Copy-Item $cmakeListsPath "$cmakeListsPath.bak"
    
    # 替换 FetchContent_Declare 部分
    $newContent = $cmakeContent -replace "FetchContent_Declare\(\s*googletest\s*URL\s*https://github.com/google/googletest/archive/03597a01ee50ed33e9dfd640b249b4be3799d395.zip\s*\)", "FetchContent_Declare(googletest SOURCE_DIR `"$($googletestDir -replace '\\', '/')`")"
    
    # 写入修改后的文件
    $newContent | Out-File $cmakeListsPath -Encoding utf8
}

Write-Host "修复完成。请重新运行构建脚本。" -ForegroundColor Green
Write-Host "如果问题仍然存在，请考虑以下解决方案：" -ForegroundColor Yellow
Write-Host "1. 检查 CMake 版本是否为 3.14 或更高版本" -ForegroundColor Yellow
Write-Host "2. 确保 Visual Studio 2022 已安装 C++ 桌面开发工具" -ForegroundColor Yellow
Write-Host "3. 尝试在 CMake 配置中添加 -DBUILD_SHARED_LIBS=ON" -ForegroundColor Yellow
Write-Host "4. 尝试在 CMake 配置中添加 -Dgtest_force_shared_crt=ON" -ForegroundColor Yellow

# 防止窗口立即关闭
Write-Host "按任意键继续..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 