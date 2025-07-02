@echo off
echo ==================================================
echo  Deep Excavation Frontend Starter
echo ==================================================
echo.
echo This script will start the frontend development server.
echo Please keep this window open. The server is running when you see a URL like http://localhost:xxxx
echo.

REM Change directory to the frontend folder
cd /d "%~dp0\deep_excavation\frontend"

REM Start the development server
npm run dev

echo.
echo The server has been stopped. You can close this window now.
pause 