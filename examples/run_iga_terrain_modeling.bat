@echo off
echo =====================================
echo 启动IGA地形建模示例
echo =====================================

REM 检测Python环境
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Python未安装或未添加到PATH，请安装Python并确保添加到PATH
    exit /b 1
)

REM 检测项目根目录
cd ..
if not exist src (
    echo 未发现项目结构，请在项目根目录中的examples文件夹中运行此批处理文件
    exit /b 1
)

echo 运行IGA地形建模示例...
python examples/iga_terrain_modeling.py

if %errorlevel% neq 0 (
    echo 运行失败，请检查错误信息
    pause
    exit /b 1
)

echo =====================================
echo IGA地形建模示例运行完成!
echo =====================================
pause 