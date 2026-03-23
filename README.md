<div align="center">
  <img src="public/favicon.svg" alt="Qwen Logo" width="100" />
  <h1>Qwen3-TTS Web Playground</h1>
  <p><strong>A seamless, state-of-the-art Web UI for high-fidelity speech synthesis utilizing the Qwen3-TTS architecture.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Architecture-Apple%20Silicon%20(MLX)-black?style=for-the-badge&logo=apple" alt="Apple Silicon" />
    <img src="https://img.shields.io/badge/Language-Python%203.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Frontend-Vanilla%20JS%20%7C%20CSS3-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="Vanilla JS" />
    <img src="https://img.shields.io/badge/Support-CUDA%20%7C%20CPU-76B900?style=for-the-badge&logo=nvidia&logoColor=white" alt="CUDA Support" />
  </p>
  
---

  ![App Preview](https://github.com/user-attachments/assets/e67fc6fb-5498-4fb0-89b5-43e7fe2236e8)
  
</div>

<hr />

## Core Features

- **Custom Voice:** Select a prebuilt speaker identity and combine it with expressive style modifiers such as "happy", "whispered", or "shouting".
- **Voice Design:** Synthesize unprecedented speaker profiles natively by inputting explicit textual descriptions (e.g., "Old British man with a deep, rasping tone").
- **Voice Cloning (Zero-Shot):** Provide a brief reference audio file of an individual; the underlying model extracts and replicates the target's vocal profile seamlessly.
- **Continuous Generation:** Smart syntax chunking logic partitions elongated string inputs into functional vectors, avoiding token buffer limits to output continuous long-form audio streams.

## UI/UX Engineering

- **State Morphing:** Dynamically adapts interface structures, configuration panels, and instructions according to the selected inference mode gracefully, eliminating DOM reloading.
- **Ambient Hardware Awareness:** Intelligent navigation-bar badges evaluate deployment environments and explicitly denote active backend inference hardware in real-time (MLX, CUDA, or CPU).
- **Execution Skeletons:** Employs minimalist high-contrast skeletal loaders and chronological localized history cards optimal for unencumbered, sustained user testing sequences.
- **Robust Resource Management:** Implements discrete UUID-bound temp operations, aggressive Blob-revocation on the frontend preventing Zombie DOM elements and memory leaks, alongside dedicated background garbage collection on sequential API calls.

## Quick Start (Automated)

We provide comprehensive one-liner bootstrapper scripts bundled with automated environment isolation, browser redirecting (if Python dependencies are missing), and dynamic active-port conflict resolution algorithms.

### macOS & Linux
Deploy via terminal within the underlying directory:
```bash
chmod +x start.sh
./start.sh
```

### Windows
Initialize the environment via Command Prompt or execute `start.bat` directly:
```cmd
start.bat
```

> **Note on Environment Check:** 
> The startup scripts enforce a continuous diagnostic test for Python availability. If the engine is missing, they autonomously navigate your system browser to the official Python download registry, pause the local sequence, and intuitively resume initialization upon installation validation.

---

## Manual Installation

For explicit dependency management via standard CLI conventions:

### 1. Construct Virtual Environment
Ensure you are running Python 3.10+.
```bash
python3 -m venv .venv
source .venv/bin/activate    # Mac/Linux
# .venv\Scripts\activate.bat # Windows
```

### 2. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Launch the Server
```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```
Proceed to `http://localhost:8000/` in your browser to interact with the API interface.

## Technology Stack

- **Frontend:** Vanilla HTML5, ES6 JavaScript, and structural CSS3 variables ensuring strict layout isolation. Zero external JS framework footprint allows maximum functional optimization.
- **Backend API:** Fast, asynchronous local request routing running on Python utilizing `FastAPI` combined with an `Uvicorn` base.
- **Inference Engine:** Quantized routines optimized heavily for `MLX` (`mlx-audio`) on Apple M-Series Silicon, supported by Python runtime environment bridges extending compatibility across x86 structural processing units (CUDA / ROCm / CPU fallback operations).

