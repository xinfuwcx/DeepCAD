@echo off
chcp 65001 > nul
echo ======================================
echo     创建DeepCAD桌面快捷方式
echo ======================================
echo.

set "DESKTOP=%USERPROFILE%\Desktop"
set "CURRENT_DIR=%CD%"

:: 创建启动快捷方式
echo 创建 DeepCAD 启动快捷方式...
powershell -Command "
$WshShell = New-Object -comObject WScript.Shell;
$Shortcut = $WshShell.CreateShortcut('%DESKTOP%\DeepCAD 启动.lnk');
$Shortcut.TargetPath = '%CURRENT_DIR%\start.bat';
$Shortcut.WorkingDirectory = '%CURRENT_DIR%';
$Shortcut.Description = 'DeepCAD深基坑CAE平台 - 一键启动';
$Shortcut.Save()
"

:: 创建开发模式快捷方式
echo 创建 DeepCAD 开发模式快捷方式...
powershell -Command "
$WshShell = New-Object -comObject WScript.Shell;
$Shortcut = $WshShell.CreateShortcut('%DESKTOP%\DeepCAD 开发模式.lnk');
$Shortcut.TargetPath = '%CURRENT_DIR%\dev.bat';
$Shortcut.WorkingDirectory = '%CURRENT_DIR%';
$Shortcut.Description = 'DeepCAD深基坑CAE平台 - 开发模式';
$Shortcut.Save()
"

:: 创建环境检查快捷方式
echo 创建环境检查快捷方式...
powershell -Command "
$WshShell = New-Object -comObject WScript.Shell;
$Shortcut = $WshShell.CreateShortcut('%DESKTOP%\DeepCAD 环境检查.lnk');
$Shortcut.TargetPath = '%CURRENT_DIR%\check_env.bat';
$Shortcut.WorkingDirectory = '%CURRENT_DIR%';
$Shortcut.Description = 'DeepCAD环境检查工具';
$Shortcut.Save()
"

echo.
echo ✅ 桌面快捷方式创建完成！
echo.
echo 📋 已创建的快捷方式：
echo   🚀 DeepCAD 启动 - 一键启动项目
echo   🛠️ DeepCAD 开发模式 - 开发调试模式  
echo   🔍 DeepCAD 环境检查 - 检查环境配置
echo.
pause