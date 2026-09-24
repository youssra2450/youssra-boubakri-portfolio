@echo off
rem =========================================================================
rem  Portfolio - Youssra Boubakri : METTRE A JOUR LE CONTENU (double-cliquer)
rem  Portfolio - Youssra Boubakri : UPDATE THE CONTENT (double-click)
rem
rem  1. Modifiez database\seed\portfolio.json   2. Double-cliquez ici
rem  1. Edit database\seed\portfolio.json       2. Double-click this file
rem  Le contenu du site est recharge depuis ce fichier (les messages de contact sont conserves).
rem  The site content is reloaded from that file (contact messages are kept).
rem =========================================================================
setlocal
title Portfolio - mise a jour du contenu / content update
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update-content.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"
echo.
pause
exit /b %EXIT_CODE%
