@echo off
setlocal

echo ======================================
echo       SERVIDOR LOCAL DOMINO ONLINE
echo ======================================
echo.

set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"
set "BACKEND_PORT=4000"
set "FRONTEND_PORT=5173"

echo [1/4] Verificando node...
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: No se encontro node.js en PATH. Instalalo y volve a ejecutar.
  pause
  exit /b 1
)

echo [2/4] Instalando dependencias backend...
pushd "%BACKEND_DIR%"
call npm install
popd

echo [3/4] Instalando dependencias frontend...
pushd "%FRONTEND_DIR%"
call npm install
popd

echo [4/4] Levantando servicios...
start "DOMINO-BACKEND" cmd /c "cd /d "%BACKEND_DIR%" && npm run dev"
start "DOMINO-FRONTEND" cmd /c "cd /d "%FRONTEND_DIR%" && npm run dev -- --host"

timeout /t 4 /nobreak >nul
start http://localhost:%FRONTEND_PORT%/

echo.
echo Backend:  http://localhost:%BACKEND_PORT%/
echo Frontend: http://localhost:%FRONTEND_PORT%/
echo.
echo Para detenerlos, cerrar las ventanas DOMINO-BACKEND y DOMINO-FRONTEND.
pause
