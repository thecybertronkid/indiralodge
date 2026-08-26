@echo off
title Reset Indira Lodge Database to Fresh State
color 0C

echo =======================================================================
echo                 INDIRA LODGE PROPERTY MANAGEMENT SYSTEM
echo                       DATABASE RESET TO FRESH STATE
echo =======================================================================
echo.
echo [WARNING] This will permanently clear:
echo   - All guest bookings & reservations
echo   - All financial invoices & receipts
echo   - All registered guest records
echo   - All audit logs & housekeeping tasks
echo.
echo Master settings (Room Types, Rooms, Admin Users) WILL BE PRESERVED.
echo.

set /p confirm="Are you sure you want to reset all portal data to fresh? (Y/N): "
if /i "%confirm%" neq "Y" (
    echo.
    echo Reset cancelled.
    pause
    exit /b 0
)

echo.
echo [*] Resetting database...
call node scripts/reset_fresh_db.js

echo.
pause
