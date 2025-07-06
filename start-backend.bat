@echo off
echo =================================================================
echo.
echo      Starting Deep Excavation Backend Server...
echo.
echo =================================================================

REM Activate a virtual environment if it exists
IF EXIST .\\deep_excavation\\backend\\.venv\\Scripts\\activate.bat (
    echo Activating Python virtual environment...
    call .\\deep_excavation\\backend\\.venv\\Scripts\\activate.bat
) ELSE (
    echo Virtual environment not found. Running with system Python.
    echo Please ensure all dependencies from requirements.txt are installed.
)

REM Start the FastAPI server
echo Starting Uvicorn...
python -m uvicorn deep_excavation.backend.app:app --host 127.0.0.1 --port 8000 --reload 