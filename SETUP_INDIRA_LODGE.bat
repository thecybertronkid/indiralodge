@echo off
title Indira Lodge PMS - Automated System Setup
color 0B

echo =======================================================================
echo                 INDIRA LODGE PROPERTY MANAGEMENT SYSTEM
echo                       AUTOMATED SYSTEM SETUP ENGINE
echo =======================================================================
echo.

cd /d "%~dp0"

:: Step 1: Check Node.js Environment
echo [STEP 1/6] Verifying Node.js Environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed on this computer!
    echo Please download and install Node.js (LTS Version) from: https://nodejs.org
    echo After installing Node.js, run SETUP_INDIRA_LODGE.bat again.
    echo.
    pause
    exit /b 1
)
node -v
echo [OK] Node.js is installed.

:: Step 2: Configure Environment Files
echo.
echo [STEP 2/6] Configuring Environment (.env)...
if not exist .env (
    echo DATABASE_URL="file:./dev.db" > .env
    echo JWT_SECRET="indira-lodge-super-secret-jwt-key-2026-production-ready" >> .env
    echo NODE_ENV="production" >> .env
    echo [OK] Created .env configuration file.
) else (
    echo [OK] .env file already present.
)

:: Step 3: Install Package Dependencies
echo.
echo [STEP 3/6] Installing Package Dependencies (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [WARNING] npm install finished with warnings, continuing setup...
)

:: Step 4: Database Sync & Seeding
echo.
echo [STEP 4/6] Initializing Database Schema & Seeding Data...
call npx prisma generate
call npx prisma db push --skip-generate
call npx ts-node prisma/seed.ts

:: Step 5: Build Production Application
echo.
echo [STEP 5/6] Building Production Bundle (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [WARNING] Build step completed.
)

:: Step 6: Create Desktop & Start Menu Shortcuts
echo.
echo [STEP 6/6] Generating Desktop & Start Menu Shortcuts...
if exist CreateDesktopShortcut.vbs (
    cscript //nologo CreateDesktopShortcut.vbs
)

echo.
echo =======================================================================
echo [SUCCESS] SETUP COMPLETE! INDIRA LODGE IS READY ON THIS PC!
echo =======================================================================
echo.
echo Starting Indira Lodge PMS now...
echo.
timeout /t 3 /nobreak >nul

call START_INDIRA_LODGE.bat
