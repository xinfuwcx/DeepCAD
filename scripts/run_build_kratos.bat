@echo off
rem 此批处理文件用于启动构建Kratos的PowerShell脚本，确保使用正确的编码

echo 正在启动构建脚本...
powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0build_kratos_core.ps1" 