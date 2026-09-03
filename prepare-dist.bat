@echo off
echo ============================================
echo Study Time Tracker - Prepare Distribution
echo ============================================
echo.

if not exist "dist\StudyTracker.exe" (
    echo ERROR: dist\StudyTracker.exe not found!
    echo Please run "npm run build" first.
    echo.
    pause
    exit /b 1
)

echo Copying configuration files...
copy /Y ".env.example" "dist\.env.example" >nul 2>&1

if exist ".env" (
    echo.
    echo Found .env file in project root.
    echo Do you want to copy it to dist folder? (Y/N)
    set /p COPY_ENV=
    if /i "%COPY_ENV%"=="Y" (
        copy /Y ".env" "dist\.env" >nul 2>&1
        echo ✓ Copied .env to dist folder
    ) else (
        echo.
        echo Remember to create dist\.env manually before running StudyTracker.exe
    )
) else (
    echo.
    echo No .env file found in project root.
    echo Remember to create dist\.env before running StudyTracker.exe
)

echo.
echo ============================================
echo Distribution files ready in dist\ folder:
echo   - StudyTracker.exe
echo   - .env.example
if exist "dist\.env" echo   - .env
echo ============================================
echo.
echo To run: Double-click dist\StudyTracker.exe
echo Make sure .env is configured with your MongoDB URI!
echo.
pause
