# This script automates the full end-to-end test.
# 1. It starts the backend server in a new terminal window.
# 2. It waits for the server to initialize.
# 3. It runs the client-side test script to perform the analysis.

Write-Host "Starting the full end-to-end test..." -ForegroundColor Cyan

# --- Step 1: Start the backend server ---
Write-Host "Starting backend server in a new window..."
$projectRoot = Join-Path $PSScriptRoot ".."
# The command for the new window. It changes directory, runs python, and then waits for user input to close.
$backendCommand = "cd '$projectRoot'; python run_backend.py; Read-Host -Prompt 'Backend server stopped. Press Enter to exit.'"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand

# --- Step 2: Wait for initialization ---
$waitTime = 15
Write-Host "Waiting $waitTime seconds for the backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds $waitTime

# --- Step 3: Run the analysis test script ---
Write-Host "Running the analysis script..." -ForegroundColor Cyan
$scriptPath = Join-Path $PSScriptRoot "run_shanghai_case.ps1"
powershell -ExecutionPolicy Bypass -File $scriptPath

Write-Host "`nFull test process finished. Please check the new window for backend server logs." -ForegroundColor Green
Write-Host "You can close the backend server window when you are done." -ForegroundColor Green 