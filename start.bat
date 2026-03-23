@echo off
setlocal enabledelayedexpansion

:: Setup ANSI colors
for /f %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "RED=!ESC![0;31m"
set "GREEN=!ESC![0;32m"
set "YELLOW=!ESC![0;33m"
set "NC=!ESC![0m"

echo.
echo Starting Qwen3-TTS
echo ------------------
echo.

:: 1. Python check
echo • Checking Python
:CHECK_PYTHON
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   !RED!✖ Python missing!NC!
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
if not exist ".venv" (
    echo   → Creating venv
    python -m venv .venv
)
echo   → Activating venv
call .venv\Scripts\activate.bat
echo   !GREEN!✔ Environment ready!NC!
echo.

:: 3. Dependencies
echo • Installing dependencies
echo   → Upgrading pip
python -m pip install --upgrade pip >nul 2>&1
echo   → Installing packages
pip install -r requirements.txt >nul 2>&1
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
