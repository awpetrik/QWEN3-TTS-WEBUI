#!/usr/bin/env bash

# Stop execution on any error
set -e

echo "=========================================================="
echo "  🚀 Initializing Qwen3-TTS Playground"
echo "=========================================================="

# 1. Check Python installation
while ! command -v python3 &> /dev/null; do
    echo "❌ ERROR: Python3 is not installed or not in PATH."
    echo "🌐 Opening your browser to the Python download page..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "https://www.python.org/downloads/"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "https://www.python.org/downloads/"
    else
        echo "Please download and install Python from https://www.python.org/downloads/"
    fi
    
    echo ""
    echo "⏳ Waiting for Python installation..."
    read -p "After you have installed Python, press [Enter] to try again..."
done

# 2. Virtual Environment Setup
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment (.venv)..."
    python3 -m venv .venv
else
    echo "✅ Virtual environment found."
fi

# 3. Activate Virtual Environment
echo "🔄 Activating environment..."
source .venv/bin/activate

# 4. Install Dependencies
echo "📥 Installing dependencies (this might take a minute)..."
python3 -m pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt

# 5. Check for ffmpeg (Required for Audio Conversion)
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  WARNING: ffmpeg is not installed. Voice cloning features may fail."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "   -> Please run: brew install ffmpeg"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            echo "   -> Please run: sudo apt-get install ffmpeg"
        elif command -v dnf &> /dev/null; then
            echo "   -> Please run: sudo dnf install ffmpeg"
        elif command -v pacman &> /dev/null; then
            echo "   -> Please run: sudo pacman -S ffmpeg"
        elif command -v zypper &> /dev/null; then
            echo "   -> Please run: sudo zypper install ffmpeg"
        elif command -v apk &> /dev/null; then
            echo "   -> Please run: sudo apk add ffmpeg"
        else
            echo "   -> Please install 'ffmpeg' using your distribution's package manager."
        fi
    else
        echo "   -> Please install 'ffmpeg' manually for your OS."
    fi
fi

# 6. Auto-Create Required Directories
for dir in models voices outputs; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo "📁 Created missing directory: ./$dir"
    fi
done

# 7. Start the Server
echo "🔍 Finding an available port (Anti-Conflict)..."
export PORT=$(python3 -c "import socket; p=8000; s=socket.socket(); exec('while True:\n try: s.bind((\"\",p)); print(p); s.close(); break\n except: p+=1')")

echo "=========================================================="
echo "  🎵 Starting Server at http://localhost:$PORT"
echo "=========================================================="
uvicorn app:app --host 0.0.0.0 --port $PORT
