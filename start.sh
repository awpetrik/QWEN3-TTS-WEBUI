#!/usr/bin/env bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

cat << "EOF"
   ___                     _____     _____ _____ _____ 
  / _ \__      _____ _ __ |___ /_  _|_   _|_   _/ ___| 
 | | | \ \ /\ / / _ \ '_ \  |_ \ \/ / | |   | | \___ \ 
 | |_| |\ V  V /  __/ | | |___) >  <  | |   | |  ___) |
  \__\_\ \_/\_/ \___|_| |_|____/_/\_\ |_|   |_| |____/ 
                                                       
EOF

echo -e "\n${GREEN}Starting Qwen3-TTS Web UI...${NC}"
echo -e "=========================================="
echo -e "GitHub: https://github.com/awpetrik/QWEN3-TTS-WEBUI"
echo -e "Author: awpetrik"
echo -e "==========================================\n"

# requirements.txt pins packages that only publish for Python 3.13+
# (audioop-lts, numpy 2.3.x, scipy 1.17.x, scikit-learn 1.8.x).
MIN_PYTHON="3.13"

is_supported_python() {
    "$1" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 13) else 1)' &> /dev/null
}

find_python() {
    local candidate
    for candidate in python3.13 python3 python3.14; do
        if command -v "$candidate" &> /dev/null && is_supported_python "$candidate"; then
            echo "$candidate"
            return 0
        fi
    done
    return 1
}

# 1. Python check
echo -e "• Checking Python"
until PYTHON=$(find_python); do
    echo -e "  ${RED}✖ Python ${MIN_PYTHON}+ missing${NC}"
    echo -e "  → Opening download page"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "https://www.python.org/downloads/"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "https://www.python.org/downloads/"
    fi
    read -p "  → Press [Enter] after install"
done
echo -e "  ${GREEN}✔ Python found ($("$PYTHON" -V 2>&1))${NC}\n"

# 2. Venv setup
echo -e "• Checking environment"
if [ -d ".venv" ] && ! is_supported_python ".venv/bin/python"; then
    echo -e "  ${RED}✖ Existing .venv is older than Python ${MIN_PYTHON}${NC}"
    echo -e "  → Delete it and re-run this script: rm -rf .venv"
    exit 1
fi
if [ ! -d ".venv" ]; then
    echo -e "  → Creating venv"
    "$PYTHON" -m venv .venv
fi
echo -e "  → Activating venv"
source .venv/bin/activate
echo -e "  ${GREEN}✔ Environment ready${NC}\n"

# 3. Dependencies
# Only stdout is discarded here; pip errors stay visible so a failed
# install reports its own reason instead of aborting silently.
echo -e "• Installing dependencies"
echo -e "  → Upgrading pip"
python3 -m pip install --upgrade pip > /dev/null
echo -e "  → Installing packages"
if ! pip install -r requirements.txt > /dev/null; then
    echo -e "  ${RED}✖ Dependency installation failed (see pip output above)${NC}"
    exit 1
fi
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
PORT=$(python3 -c "import socket; p=8000; exec('while True:\n s=socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1);\n try: s.bind((\"\",p)); s.close(); break\n except: p+=1'); print(p)")
echo -e "  ${GREEN}✔ Port $PORT ready${NC}\n"

echo -e "${GREEN}✔ Setup complete${NC}\n"
echo -e "→ Running server: http://localhost:$PORT\n"

uvicorn app:app --host 0.0.0.0 --port $PORT
