#!/usr/bin/env bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo -e "\nStarting Qwen3-TTS"
echo -e "------------------\n"

# 1. Python check
echo -e "• Checking Python"
while ! command -v python3 &> /dev/null; do
    echo -e "  ${RED}✖ Python missing${NC}"
    echo -e "  → Opening download page"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "https://www.python.org/downloads/"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "https://www.python.org/downloads/"
    fi
    read -p "  → Press [Enter] after install"
done
echo -e "  ${GREEN}✔ Python found${NC}\n"

# 2. Venv setup
echo -e "• Checking environment"
if [ ! -d ".venv" ]; then
    echo -e "  → Creating venv"
    python3 -m venv .venv
fi
echo -e "  → Activating venv"
source .venv/bin/activate
echo -e "  ${GREEN}✔ Environment ready${NC}\n"

# 3. Dependencies
echo -e "• Installing dependencies"
echo -e "  → Upgrading pip"
python3 -m pip install --upgrade pip > /dev/null 2>&1
echo -e "  → Installing packages"
pip install -r requirements.txt > /dev/null 2>&1
echo -e "  ${GREEN}✔ Dependencies installed${NC}\n"

# 4. ffmpeg check
echo -e "• Checking ffmpeg"
if ! command -v ffmpeg &> /dev/null; then
    echo -e "  ${YELLOW}✖ ffmpeg missing${NC}"
    echo -e "  → Voice cloning disabled\n"
else
    echo -e "  ${GREEN}✔ ffmpeg found${NC}\n"
fi

# 5. Directories
echo -e "• Checking directories"
for dir in models voices outputs; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
    fi
done
echo -e "  ${GREEN}✔ Directories ready${NC}\n"

# 6. Find port
echo -e "• Finding port"
PORT=$(python3 -c "import socket; p=8000; s=socket.socket(); exec('while True:\n try: s.bind((\"\",p)); s.close(); break\n except: p+=1'); print(p)")
echo -e "  ${GREEN}✔ Port $PORT ready${NC}\n"

echo -e "${GREEN}✔ Setup complete${NC}\n"
echo -e "→ Running server: http://localhost:$PORT\n"

uvicorn app:app --host 0.0.0.0 --port $PORT
