# PowerShell script to build Kratos Core with Visual Studio 2022
# This script disables testing to avoid googletest build issues
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
$kratosSource = Join-Path $scriptDir "..\core\kratos_source\kratos"
$kratosBuild = Join-Path $kratosSource "build"
$buildType = "Release"
$buildPath = Join-Path $kratosBuild $buildType

# Create build directory if it doesn't exist
if (-not (Test-Path $kratosBuild)) {
    New-Item -ItemType Directory -Path $kratosBuild | Out-Null
}
if (-not (Test-Path $buildPath)) {
    New-Item -ItemType Directory -Path $buildPath | Out-Null
}

# Clean previous builds
Write-Host "清理之前的构建文件..." -ForegroundColor Cyan
if (Test-Path "$buildPath\cmake_install.cmake") {
    Remove-Item "$buildPath\cmake_install.cmake" -Force -ErrorAction SilentlyContinue
}
if (Test-Path "$buildPath\CMakeCache.txt") {
    Remove-Item "$buildPath\CMakeCache.txt" -Force -ErrorAction SilentlyContinue
}
if (Test-Path "$buildPath\CMakeFiles") {
    Remove-Item "$buildPath\CMakeFiles" -Recurse -Force -ErrorAction SilentlyContinue
}

# Set environment variables
$env:CC = "cl.exe"
$env:CXX = "cl.exe"
$env:BOOST_ROOT = "D:\Program Files\boost_1_88_0"
$env:PYTHON_EXECUTABLE = "D:\ProgramData\miniconda3\python.exe"

Write-Host "找到Visual Studio在: $vsPath" -ForegroundColor Cyan
Write-Host "运行Kratos Core构建配置（禁用测试）..." -ForegroundColor Cyan

# Create the CMake command
$cmakeConfigureCmd = @"
cmake -G"Visual Studio 17 2022" -A x64 ^
      -H"$kratosSource" ^
      -B"$buildPath" ^
      -DUSE_MPI=OFF ^
      -DUSE_EIGEN_MKL=OFF ^
      -DKRATOS_BUILD_TESTING=OFF ^
      -DCMAKE_CXX_FLAGS="/MP8" ^
      -DPYTHON_EXECUTABLE="$env:PYTHON_EXECUTABLE" ^
      -DBOOST_ROOT="$env:BOOST_ROOT"
"@

$cmakeBuildCmd = @"
cmake --build "$buildPath" --target install --config $buildType -- /p:Platform=x64 /m:4
"@

# 创建一个批处理文件来运行命令
$batchFile = Join-Path $env:TEMP "build_kratos_temp.bat"
@"
@echo off
call "$vsDevCmd"
echo 配置Kratos Core（禁用测试）...
$cmakeConfigureCmd
echo 构建Kratos Core...
$cmakeBuildCmd
"@ | Out-File -FilePath $batchFile -Encoding ASCII

# 使用cmd执行批处理文件
Write-Host "执行构建命令..." -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList "/c", $batchFile -Wait -NoNewWindow

# 删除临时批处理文件
Remove-Item $batchFile -Force -ErrorAction SilentlyContinue

# Check if build was successful
if (Test-Path "$kratosSource\bin\$buildType\KratosMultiphysics.pyd") {
    Write-Host "`n构建过程成功完成。" -ForegroundColor Green
    
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "Kratos Core构建成功完成！" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    Write-Host "下一步:"
    Write-Host "1. 添加Kratos到您的PYTHONPATH:"
    Write-Host "   set PYTHONPATH=%PYTHONPATH%;$kratosSource\bin\$buildType" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. 添加Kratos库到您的PATH:"
    Write-Host "   set PATH=%PATH%;$kratosSource\bin\$buildType\libs" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. 通过pip安装额外的Kratos应用:"
    Write-Host "   pip install KratosMultiphysics-StructuralMechanicsApplication" -ForegroundColor Cyan
    Write-Host "   pip install KratosMultiphysics-FluidDynamicsApplication" -ForegroundColor Cyan
    Write-Host "   等等。"
    Write-Host ""
} else {
    Write-Host "`n构建过程失败。" -ForegroundColor Red
}

# 防止窗口立即关闭
Write-Host "按任意键继续..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 