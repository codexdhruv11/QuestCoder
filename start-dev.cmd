@echo off
echo Starting QuestCoder Development Environment...
echo.

REM Start both servers concurrently without wait-on
echo Starting backend and frontend servers...
npm run dev

REM If the above fails, provide instructions
if errorlevel 1 (
    echo.
    echo ERROR: Failed to start development servers.
    echo.
    echo Alternative methods to start the servers:
    echo 1. Run: npm run dev
    echo 2. Run: npm run dev:smart
    echo 3. Run: powershell -ExecutionPolicy Bypass -File start-dev.ps1
    echo.
    echo Or start servers separately in two terminals:
    echo Terminal 1: cd backend ^&^& npm run dev
    echo Terminal 2: cd frontend ^&^& npm run dev
    echo.
    pause
)
