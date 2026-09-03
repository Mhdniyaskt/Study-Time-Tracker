@echo off
REM Study Time Tracker - Startup Script for Windows
REM This script checks configuration and starts the application

echo ====================================
echo Study Time Tracker - Startup
echo ====================================
echo.

REM Check if running from source or executable
if exist "server.js" (
    echo Running from source code...
    echo.
    
    REM Check if Node.js is installed
    node --version >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Node.js is not installed!
        echo Please install Node.js from https://nodejs.org
        echo.
        pause
        exit /b 1
    )
    
    echo Node.js is installed
    echo.
    
    REM Check if node_modules exists
    if not exist "node_modules" (
        echo Installing dependencies...
        call npm install
        if errorlevel 1 (
            echo ERROR: Failed to install dependencies
            pause
            exit /b 1
        )
        echo.
    )
    
    REM Run setup check
    echo Running configuration check...
    call npm run check
    if errorlevel 1 (
        echo.
        echo ERROR: Configuration check failed
        echo Please fix the issues above before starting
        pause
        exit /b 1
    )
    
    echo.
    echo Starting application...
    echo.
    call npm start
) else (
    REM Running as packaged executable
    echo Running as packaged executable...
    echo.
    
    REM Check if .env exists
    if not exist ".env" (
        echo ERROR: .env file not found!
        echo.
        echo Please create a .env file with your configuration:
        echo   MONGODB_URI=mongodb://localhost:27017/study_tracker
        echo   PORT=3000
        echo.
        if exist ".env.example" (
            echo You can copy .env.example to .env and edit it.
        )
        echo.
        pause
        exit /b 1
    )
    
    echo Configuration file found
    echo.
    
    echo Starting application...
    echo.
    
    REM Check if executable exists
    if exist "study-time-tracker.exe" (
        study-time-tracker.exe
    ) else (
        echo ERROR: study-time-tracker.exe not found!
        pause
        exit /b 1
    )
)
