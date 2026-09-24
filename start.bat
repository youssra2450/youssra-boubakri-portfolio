@echo off
rem =========================================================================
rem  Portfolio - Youssra Boubakri : LANCER LE PROJET (double-cliquer ici)
rem  Portfolio - Youssra Boubakri : START THE PROJECT (double-click here)
rem
rem  Demarre la base de donnees, l'API et le site, puis ouvre le navigateur.
rem  Starts the database, the API and the website, then opens the browser.
rem  Prerequis / requirements: Python 3.10-3.12 and Node.js (LTS).
rem  Options: start.bat -ApiPort 8001 -WebPort 5174 -DbPort 5434 -NoBrowser -NoNewWindows
rem  Arreter / stop: stop.bat      Guide: docs\LANCER-LE-PROJET.md
rem =========================================================================
setlocal
title Portfolio - demarrage / start
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-windows.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" goto failed
echo   Cette fenetre peut etre fermee. / This window can be closed.
timeout /t 15 >nul 2>nul
exit /b 0

:failed
echo.
echo   Le demarrage a echoue : lisez les messages ci-dessus.
echo   Startup failed: read the messages above.
echo   Aide / help: docs\LANCER-LE-PROJET.md
echo.
pause
exit /b %EXIT_CODE%
