@echo off
REM ======================================================
REM  Deep Excavation System - Run Excavation Case Example
REM  Version 1.5.0
REM ======================================================

echo Starting Deep Excavation System...
echo.

REM 设置Python路径
SET PYTHONPATH=%PYTHONPATH%;%~dp0..\

REM 检查是否指定了配置文件
IF "%~1"=="" (
    SET CONFIG_FILE=config.json
) ELSE (
    SET CONFIG_FILE=%~1
)

echo Using configuration file: %CONFIG_FILE%
echo.

REM 执行主Python脚本
echo Running excavation analysis with IGA and Physics AI...
echo This may take several minutes, please be patient.
echo.

python %~dp0excavation_case.py --config %CONFIG_FILE% --use_iga --with_physics_ai

echo.
IF %ERRORLEVEL% NEQ 0 (
    echo Error occurred during execution. Please check the logs.
    pause
    exit /b %ERRORLEVEL%
) ELSE (
    echo Excavation analysis completed successfully!
    echo.
    echo Options:
    echo [1] Visualize results
    echo [2] Export results
    echo [3] Run Physics AI analysis
    echo [4] Exit
    echo.
    
    SET /P OPTION="Enter your choice (1-4): "
    
    IF "%OPTION%"=="1" (
        echo.
        echo Starting visualization server...
        python %~dp0visualize_results.py --results %~dp0..\workspace\results\latest_results.vtk
    ) ELSE IF "%OPTION%"=="2" (
        echo.
        SET /P EXPORT_FILE="Enter export file path (or press Enter for default): "
        IF "%EXPORT_FILE%"=="" (
            SET EXPORT_FILE=%~dp0..\workspace\results\excavation_results.vtk
        )
        echo Exporting results to %EXPORT_FILE%...
        python %~dp0excavation_case.py --config %CONFIG_FILE% --export %EXPORT_FILE%
    ) ELSE IF "%OPTION%"=="3" (
        echo.
        echo Running Physics AI analysis...
        python %~dp0excavation_case.py --config %CONFIG_FILE% --physics_ai
    ) ELSE (
        echo Exiting...
    )
)

echo.
echo Thank you for using Deep Excavation System!
pause




