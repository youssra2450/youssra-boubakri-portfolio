@echo off
rem =========================================================================
rem  Portfolio - Youssra Boubakri : ARRETER LE PROJET (double-cliquer ici)
rem  Portfolio - Youssra Boubakri : STOP THE PROJECT (double-click here)
rem
rem  Arrete l'API, le site et la base de donnees lances par start.bat.
rem  Stops the API, the website and the database started by start.bat.
rem  Options: stop.bat -KeepDatabase
rem =========================================================================
setlocal
title Portfolio - arret / stop
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-windows.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" goto failed
timeout /t 8 >nul 2>nul
exit /b 0

:failed
echo.
echo   L'arret a rencontre un probleme : lisez les messages ci-dessus.
echo   Stopping ran into a problem: read the messages above.
echo.
pause
exit /b %EXIT_CODE%
