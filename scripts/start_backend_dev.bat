@echo off
chcp 65001 > nul
echo =============================================
echo 深基坑CAE系统 - 启动后端开发服务器
echo =============================================
echo.

REM 设置工作目录为项目根目录
cd /d %~dp0\..

REM 检查Python是否安装
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: 未找到Python，请确保Python已安装并添加到PATH中
    goto :error
)

REM 显示Python版本
echo Python版本:
python --version
echo.

REM 清理Python缓存文件
echo 清理Python缓存文件...
for /d /r . %%d in (__pycache__) do (
    if exist "%%d" (
        echo 删除: %%d
        rmdir /s /q "%%d"
    )
)
echo 缓存清理完成
echo.

REM 检查是否安装了依赖
pip list | findstr fastapi >nul 2>nul
if %errorlevel% neq 0 (
    echo 后端依赖未安装，开始安装...
    pip install -r requirements.minimal.txt
) else (
    echo 依赖已安装，继续启动...
)

echo 启动后端API服务器...
echo.
python -m src.server.app

echo.
goto :end

:error
echo.
echo 启动失败，请检查错误信息
pause
exit /b 1

:end
echo.
echo 后端服务器已关闭
pause 