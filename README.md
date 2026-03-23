# Qwen3-TTS Web Playground

A state-of-the-art, Web UI designed for seamless speech synthesis using the advanced Qwen3-TTS architecture. It is ruthlessly optimized for the Apple Silicon architecture (`mlx`) and built with top-tier user experience in mind.

## Core Features
- **Custom Voice**: Pick a prebuilt speaker identity and mix it with expressive style directions like "happy", "whispered", or "shouting".
- **Voice Design**: Forge brand-new, unique voices directly from pure text descriptions (e.g., "Old British man with a deep, rasping tone").
- **Voice Cloning (Zero-Shot)**: Upload a brief reference audio file of anyone speaking, and the model will seamlessly clone the subject's voice profile.

## UI/UX
- **Dynamic State Morphing**: Automatically adapts configuration settings, parameters, and instruction spaces based on the exact mode you are activating without page refreshes.
- **Dark-First Elegance**: Built with a sleek, immersive high-contrast dark theme optimized for sustained creative workflows and professional generative sandboxes. Features shimmering CSS execution skeletons and chronological audio-card logging.
- **Data Integrity & Memory Leaks Prevention**: Generates distinct UUID-bound files, aggressively prevents frontend Blob memory/Zombie objects, and sequentially applies background-garbage cleaning routines across UI events and API processes.

## Installation & Setup

Ensure you are on an Apple Silicon machine and have created a virtual python environment before proceeding.

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Launch the Application
Start the Uvicorn server to mount both the FastAPI endpoints and the frontend application:
```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

### 3. Open
Navigate to `http://localhost:8000/` in your browser to start synthesizing text to speech!

## Technology Stack
- **Frontend**: Vanilla Modern JS/HTML, CSS3 animations (Zero heavy JS framework dependencies, high-performance DOM routing).
- **Backend API**: Python, FastAPI.
- **Inference Engine**: MLX (`mlx-audio`).
