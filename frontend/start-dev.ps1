# DeepCAD Frontend Development Server Startup Script
Write-Host "Starting DeepCAD Frontend Development Server..." -ForegroundColor Green
Write-Host ""

# Change to frontend directory
Set-Location -Path "E:\DeepCAD\frontend"

# Start development server
npm run dev

# Keep window open
Read-Host "Press Enter to exit"