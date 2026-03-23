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
echo ==========================================================
echo   🎵 Starting Server at http://localhost:8000
echo ==========================================================
uvicorn app:app --host 0.0.0.0 --port 8000

pause
