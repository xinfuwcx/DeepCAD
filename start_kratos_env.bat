@echo off
REM Kratos环境启动脚本 - Windows版本
REM 自动生成于DeepCAD项目

echo ========================================
echo DeepCAD Kratos环境配置
echo ========================================

REM 设置Kratos路径
set KRATOS_ROOT=E:\DeepCAD\core\kratos_source\kratos\bin\Release
set KRATOS_DATA_DIR=E:\DeepCAD\core\kratos_source\kratos\kratos

REM 添加Kratos库到PATH
set PATH=%KRATOS_ROOT%\libs;%PATH%

REM 设置Python路径
set PYTHONPATH=%KRATOS_ROOT%;%PYTHONPATH%

echo ✅ Kratos环境已配置
echo Kratos根目录: %KRATOS_ROOT%
echo Python路径已更新
echo ========================================

REM 启动Python并测试Kratos
echo 🧪 测试Kratos导入...
C:\Users\xinfu\AppData\Local\Programs\Python\Python313\python.exe -c "import KratosMultiphysics; print('✅ Kratos导入成功')"

cmd /k
