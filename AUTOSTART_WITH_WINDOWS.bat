@echo off
title Configure Indira Lodge Windows Autostart
color 0E

echo =======================================================================
echo                 INDIRA LODGE PROPERTY MANAGEMENT SYSTEM
echo                 WINDOWS AUTOSTART SERVICE CONFIGURATION
echo =======================================================================
echo.

set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set TARGET_BAT=%~dp0START_INDIRA_LODGE.bat

echo [*] Adding Indira Lodge to Windows Startup Folder:
echo     Path: %STARTUP_FOLDER%
echo.

Set VBS_SCRIPT=%TEMP%\CreateStartupShortcut.vbs
echo Set WshShell = CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo Set objShortcut = WshShell.CreateShortcut("%STARTUP_FOLDER%\Indira Lodge PMS Autostart.lnk") >> "%VBS_SCRIPT%"
echo objShortcut.TargetPath = "%TARGET_BAT%" >> "%VBS_SCRIPT%"
echo objShortcut.WorkingDirectory = "%~dp0" >> "%VBS_SCRIPT%"
echo objShortcut.WindowStyle = 7 >> "%VBS_SCRIPT%"
echo objShortcut.Save >> "%VBS_SCRIPT%"

cscript //nologo "%VBS_SCRIPT%"
del "%VBS_SCRIPT%"

echo.
echo =======================================================================
echo [SUCCESS] Indira Lodge is now set to AUTOSTART whenever this PC turns on!
echo.
echo Every time Windows boots, Indira Lodge will run silently in the background
echo and will ALWAYS be accessible at: http://localhost:3000
echo =======================================================================
echo.
pause
