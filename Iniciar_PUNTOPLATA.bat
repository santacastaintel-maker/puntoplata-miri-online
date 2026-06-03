@echo off
title Lanzador PUNTOPLATA
:: Cambiar al directorio del proyecto
cd /d "%~dp0"

echo ==========================================
echo    INICIANDO PUNTOPLATA POS...
echo ==========================================
echo.
echo 1. Abriendo navegador en http://localhost:5173/
start http://localhost:5173/
echo.
echo 2. Encendiendo el servidor (No cierres esta ventana)
echo.
npm run dev

pause
