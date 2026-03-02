@echo off
echo.
echo ============================================================
echo   Starting BarTender Print Service
echo ============================================================
echo.
echo This will start the BarTender SDK print service
echo Keep this window open while using the application
echo.
echo Press Ctrl+C to stop the service when done
echo.
echo ============================================================
echo.

cd /d "%~dp0"

echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js found!
echo.

echo Checking if dependencies are installed...
if not exist "node_modules\" (
    echo Dependencies not found. Installing...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Starting service...
echo.

npm start

pause
