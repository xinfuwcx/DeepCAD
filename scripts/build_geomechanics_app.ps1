# PowerShell script to build Kratos GeoMechanics Application
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

# Get the directory of this script and project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

# Kratos paths
$kratosSource = Join-Path $projectRoot "core\kratos_source\kratos"
$kratosBuild = Join-Path $kratosSource "build"
$kratosBin = Join-Path $kratosSource "bin\Release"

# Check if Kratos Core is already built
if (-not (Test-Path $kratosBin)) {
    Write-Host "错误：未找到Kratos Core编译结果，请先运行build_kratos_core.ps1" -ForegroundColor Red
    exit 1
}

# Set build configuration
$buildType = "Release"
$pythonExe = "D:\ProgramData\miniconda3\python.exe"
$boostRoot = "D:\Program Files\boost_1_88_0"

Write-Host "找到Visual Studio在: $vsPath" -ForegroundColor Cyan
Write-Host "Kratos源码路径: $kratosSource" -ForegroundColor Cyan
Write-Host "构建类型: $buildType" -ForegroundColor Cyan
Write-Host "Python解释器: $pythonExe" -ForegroundColor Cyan

# Create build directory for GeoMechanics application
$geoAppBuildDir = Join-Path $kratosBuild "GeoMechanicsApplication"
if (-not (Test-Path $geoAppBuildDir)) {
    New-Item -Path $geoAppBuildDir -ItemType Directory -Force | Out-Null
}

# 创建一个临时批处理文件
$tempBatchFile = Join-Path $env:TEMP "build_geomechanics_temp.bat"
@"
@echo off
call "$vsDevCmd"
echo 配置Kratos GeoMechanics应用...

cd /d "$kratosSource"

cmake -G"Visual Studio 17 2022" -A x64 ^
      -H"$kratosSource\applications\GeoMechanicsApplication" ^
      -B"$geoAppBuildDir" ^
      -DUSE_MPI=OFF ^
      -DCMAKE_CXX_FLAGS="/MP8" ^
      -DPYTHON_EXECUTABLE="$pythonExe" ^
      -DBOOST_ROOT="$boostRoot" ^
      -DKRATOS_SOURCE="$kratosSource" ^
      -DKRATOS_BUILD="$kratosBin"

if %ERRORLEVEL% NEQ 0 (
    echo 配置失败!
    exit /b 1
)

echo 编译Kratos GeoMechanics应用...
cmake --build "$geoAppBuildDir" --target install --config $buildType -- /p:Platform=x64 /m:4

if %ERRORLEVEL% NEQ 0 (
    echo 编译失败!
    exit /b 1
)

echo GeoMechanics应用编译完成!
"@ | Out-File -FilePath $tempBatchFile -Encoding ASCII

# 使用cmd执行批处理文件
Write-Host "执行构建命令..." -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList "/c", $tempBatchFile -Wait -NoNewWindow

# 删除临时批处理文件
Remove-Item $tempBatchFile -Force -ErrorAction SilentlyContinue

Write-Host "`n构建过程完成。" -ForegroundColor Green 
Write-Host "如果编译成功，GeoMechanics应用现在应该可用。" -ForegroundColor Green

# 防止窗口立即关闭
Write-Host "按任意键继续..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
