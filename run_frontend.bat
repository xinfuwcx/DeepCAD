@echo off
echo ==================================================
echo  Deep Excavation Frontend Starter (Direct Path)
echo ==================================================
echo.
echo This script will start the frontend development server.
echo Please keep this window open. The server is running when you see a URL like http://localhost:xxxx
echo.

REM Change directory to the frontend folder
cd /d "%~dp0\deep_excavation\frontend"

REM Using the full path to npm to bypass environment variable issues.
echo Attempting to run npm from: C:\Program Files\nodejs\npm.cmd
call "C:\Program Files\nodejs\npm.cmd" run dev

echo.
echo The server has been stopped. You can close this window now.
pause 