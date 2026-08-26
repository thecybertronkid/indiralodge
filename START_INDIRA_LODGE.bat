@echo off
title Starting Indira Lodge PMS...
color 0A

echo =======================================================================
echo                 INDIRA LODGE PROPERTY MANAGEMENT SYSTEM
echo                            1-CLICK LAUNCHER
echo =======================================================================
echo.

cd /d "%~dp0"

:: Check if .env file exists
if not exist .env (
    echo [!] .env configuration missing. Creating default .env...
    echo DATABASE_URL="file:./dev.db" > .env
    echo JWT_SECRET="indira-lodge-super-secret-jwt-key-2026-production-ready" >> .env
    echo NODE_ENV="production" >> .env
)

echo [*] Starting Indira Lodge Web Server on http://localhost:3000...
start /min "Indira Lodge Server" cmd /c "npm run start || npm run dev"

echo [*] Waiting 4 seconds for server to initialize...
timeout /t 4 /nobreak >nul

echo [*] Launching Web Portal in your default browser...
start http://localhost:3000

echo.
echo =======================================================================
echo [SUCCESS] Indira Lodge is running live at http://localhost:3000
echo Default Login Credentials:
echo   - Username: admin@indiralodge
echo   - Password: 12345678
echo =======================================================================
echo (You can minimize this window. Closing it will stop the server.)
echo.
pause
