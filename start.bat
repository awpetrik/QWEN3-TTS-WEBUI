@echo off
setlocal enabledelayedexpansion

:: Setup ANSI colors
for /f %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "RED=!ESC![0;31m"
set "GREEN=!ESC![0;32m"
set "YELLOW=!ESC![0;33m"
set "NC=!ESC![0m"

echo.
echo.           ___                     _____     _____ _____ _____ 
echo.          / _ \__      _____ _ __ |___ /_  _|_   _|_   _/ ___| 
echo.         | | | \ \ /\ / / _ \ '_ \  |_ \ \/ / | |   | | \___ \ 
echo.         | |_| |\ V  V /  __/ | | |___) >  <  | |   | |  ___) |
echo.          \__\_\ \_/\_/ \___|_| |_|____/_/\_\ |_|   |_| |____/ 
echo.

echo !GREEN!Starting Qwen3-TTS Web UI...!NC!
echo ==========================================
echo GitHub: https://github.com/awpetrik/QWEN3-TTS-WEBUI
echo Author: awpetrik
echo ==========================================
echo.

:: 1. Python check
:: requirements.txt pins packages that only publish for Python 3.13+
:: (audioop-lts, numpy 2.3.x, scipy 1.17.x, scikit-learn 1.8.x).
echo • Checking Python
:CHECK_PYTHON
set "PYTHON="
py -3.13 -c "import sys; sys.exit(0)" >nul 2>&1 && set "PYTHON=py -3.13"
if not defined PYTHON (
    python -c "import sys; sys.exit(0 if sys.version_info >= (3, 13) else 1)" >nul 2>&1 && set "PYTHON=python"
)
if not defined PYTHON (
    echo   !RED!✖ Python 3.13+ missing!NC!
    echo   → Opening download page
    start https://www.python.org/downloads/
    echo   → Press any key after install
    pause >nul
    goto CHECK_PYTHON
)
echo   !GREEN!✔ Python found!NC!
echo.

:: 2. Venv setup
echo • Checking environment
if exist ".venv" (
    .venv\Scripts\python.exe -c "import sys; sys.exit(0 if sys.version_info >= (3, 13) else 1)" >nul 2>&1
    if !ERRORLEVEL! NEQ 0 (
        echo   !RED!✖ Existing .venv is older than Python 3.13!NC!
        echo   → Delete it and re-run this script: rmdir /s /q .venv
        exit /b 1
    )
)
if not exist ".venv" (
    echo   → Creating venv
    !PYTHON! -m venv .venv
)
echo   → Activating venv
call .venv\Scripts\activate.bat
echo   !GREEN!✔ Environment ready!NC!
echo.

:: 3. Dependencies
:: Only stdout is discarded here; pip errors stay visible so a failed
:: install reports its own reason instead of passing silently.
echo • Installing dependencies
echo   → Upgrading pip
python -m pip install --upgrade pip >nul
echo   → Installing packages
pip install -r requirements.txt >nul
if !ERRORLEVEL! NEQ 0 (
    echo   !RED!✖ Dependency installation failed ^(see pip output above^)!NC!
    exit /b 1
)
echo   !GREEN!✔ Dependencies installed!NC!
echo.

:: 4. ffmpeg check
echo • Checking ffmpeg
where ffmpeg >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   !YELLOW!✖ ffmpeg missing!NC!
    echo   → Voice cloning disabled
) else (
    echo   !GREEN!✔ ffmpeg found!NC!
)
echo.

:: 5. Directories
echo • Checking directories
for %%D in (models voices outputs) do (
    if not exist "%%D" mkdir "%%D"
)
echo   !GREEN!✔ Directories ready!NC!
echo.

:: 6. Find port
echo • Finding port
echo import socket > .get_port.py
echo p = 8000 >> .get_port.py
echo while True: >> .get_port.py
echo     try: >> .get_port.py
echo         s = socket.socket() >> .get_port.py
echo         s.bind(('', p)) >> .get_port.py
echo         print(p) >> .get_port.py
echo         s.close() >> .get_port.py
echo         break >> .get_port.py
echo     except: >> .get_port.py
echo         p += 1 >> .get_port.py

for /f "tokens=*" %%p in ('python .get_port.py') do set PORT=%%p
del .get_port.py

echo   !GREEN!✔ Port %PORT% ready!NC!
echo.

echo !GREEN!✔ Setup complete!NC!
echo.
echo → Running server: http://localhost:%PORT%
echo.

uvicorn app:app --host 0.0.0.0 --port %PORT%
