@echo off
setlocal

echo ==========================================================
echo   🚀 Initializing Qwen3-TTS Playground
echo ==========================================================

:: 1. Check Python installation (Windows)
:CHECK_PYTHON
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Python is not installed or not added to PATH.
    echo 🌐 Opening browser to download Python 3.10+ ...
    echo ⚠️ IMPORTANT: Please make sure to check "Add Python to PATH" during installation!
    start https://www.python.org/downloads/
    echo.
    echo ⏳ Waiting for Python installation...
    echo After you have installed Python, press any key to try again...
    pause >nul
    goto CHECK_PYTHON
)

:: 2. Virtual Environment Setup
if not exist ".venv" (
    echo 📦 Creating virtual environment...
    python -m venv .venv
) else (
    echo ✅ Virtual environment found.
)

:: 3. Activate
echo 🔄 Activating environment...
call .venv\Scripts\activate.bat

:: 4. Install Dependencies
echo 📥 Installing dependencies (this might take a few minutes)...
python -m pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt

:: 5. Check for ffmpeg
where ffmpeg >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  WARNING: ffmpeg is not installed. Voice cloning might fail.
    echo    -^> Download from https://ffmpeg.org/download.html and add to PATH.
)

:: 6. Auto-Create Directories
for %%D in (models voices outputs) do (
    if not exist "%%D" (
        mkdir "%%D"
        echo 📁 Created missing directory: .\%%D
    )
)

:: 7. Start Server
echo 🔍 Finding an available port (Anti-Conflict)...
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

echo ==========================================================
echo   🎵 Starting Server at http://localhost:%PORT%
echo ==========================================================
uvicorn app:app --host 0.0.0.0 --port %PORT%

pause
