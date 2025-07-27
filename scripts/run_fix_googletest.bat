@echo off
rem 此批处理文件用于启动修复googletest的PowerShell脚本，确保使用正确的编码

echo 正在启动修复脚本...
powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0fix_googletest_build.ps1" 