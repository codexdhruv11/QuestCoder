#!/usr/bin/env pwsh
# PowerShell script to start development servers

Write-Host "Starting QuestCoder Development Environment..." -ForegroundColor Green

# Start backend in a new PowerShell window
Write-Host "Starting backend server..." -ForegroundColor Cyan
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WindowStyle Normal

# Wait a bit for backend to initialize
Write-Host "Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if backend is running
$maxAttempts = 12
$attempt = 0
$backendReady = $false

while ($attempt -lt $maxAttempts -and -not $backendReady) {
    $attempt++
    Write-Host "Checking backend health (attempt $attempt/$maxAttempts)..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
            Write-Host "Backend is ready!" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "Backend not ready yet, waiting..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
}

if ($backendReady) {
    # Start frontend in a new PowerShell window
    Write-Host "Starting frontend server..." -ForegroundColor Cyan
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WindowStyle Normal
    
    Write-Host "" -ForegroundColor Green
    Write-Host "✅ Development environment started successfully!" -ForegroundColor Green
    Write-Host "" -ForegroundColor White
    Write-Host "📍 Backend:  http://localhost:5000" -ForegroundColor Cyan
    Write-Host "📍 Frontend: http://localhost:5173" -ForegroundColor Cyan
    Write-Host "" -ForegroundColor White
    Write-Host "Press Ctrl+C in each window to stop the servers" -ForegroundColor Yellow
}
else {
    Write-Host "❌ Failed to start backend server!" -ForegroundColor Red
    Write-Host "Please check the backend logs for errors." -ForegroundColor Red
}
