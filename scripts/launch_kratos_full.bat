@echo off
setlocal enableextensions enabledelayedexpansion

REM Activate conda env and run Kratos full analysis in a detached way
call "D:\ProgramData\miniconda3\condabin\conda.bat" activate deepcad
cd /d E:\DeepCAD

if not exist "example2\out\kratos_full" mkdir "example2\out\kratos_full"
set LOG=example2\out\kratos_full\run.log
set STAT=example2\out\kratos_full\status.txt

echo [START] %date% %time% > "%LOG%"
python -u scripts\run_kratos_full.py >> "%LOG%" 2>&1
echo [END] %date% %time% >> "%LOG%"
echo DONE > "%STAT%"

endlocal

