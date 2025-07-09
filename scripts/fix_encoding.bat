@echo off
rem 此批处理文件用于修复PowerShell中的编码问题

echo 正在设置PowerShell编码...

rem 创建临时PowerShell脚本
echo $OutputEncoding = [System.Text.Encoding]::UTF8 > "%TEMP%\set_encoding.ps1"
echo [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 >> "%TEMP%\set_encoding.ps1"
echo [Console]::InputEncoding = [System.Text.Encoding]::UTF8 >> "%TEMP%\set_encoding.ps1"
echo $PSDefaultParameterValues['*:Encoding'] = 'utf8' >> "%TEMP%\set_encoding.ps1"
echo Write-Host "PowerShell编码已设置为UTF-8" -ForegroundColor Green >> "%TEMP%\set_encoding.ps1"
echo Write-Host "您现在可以运行其他PowerShell脚本而不会出现乱码" -ForegroundColor Green >> "%TEMP%\set_encoding.ps1"

rem 使用UTF-8编码运行PowerShell
powershell -ExecutionPolicy Bypass -NoExit -Command "& {chcp 65001 | Out-Null; . '%TEMP%\set_encoding.ps1'}" 