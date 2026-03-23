import os
import shutil
import time
import re
import gc
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from main import (
    MODELS, SPEAKER_MAP, EMOTION_EXAMPLES, VOICES_DIR, BASE_OUTPUT_DIR,
    get_smart_path, make_temp_dir, convert_audio_if_needed, get_saved_voices,
    clean_memory
)

backend = "cpu"

try:
    from mlx_audio.tts.utils import load_model
    from mlx_audio.tts.generate import generate_audio
    backend = "mlx"
except ImportError:
    try:
        import torch
        if torch.cuda.is_available():
            backend = "cuda"
        else:
            backend = "cpu"
            
        print(f"MLX not found. Falling back to PyTorch ({backend.upper()})")
        def load_model(*args, **kwargs):
            raise NotImplementedError("PyTorch load_model is not implemented yet.")
        def generate_audio(*args, **kwargs):
            raise NotImplementedError("PyTorch generate_audio is not implemented yet.")
            
    except ImportError:
        print("Error: Neither mlx_audio nor torch is available.")
        import sys
        sys.exit(1)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CURRENT_MODEL_KEY = None
CURRENT_MODEL = None

def get_loaded_model(model_key: str):
    global CURRENT_MODEL_KEY, CURRENT_MODEL
    
    if CURRENT_MODEL_KEY == model_key and CURRENT_MODEL is not None:
        return CURRENT_MODEL
    
    CURRENT_MODEL = None
    CURRENT_MODEL_KEY = None
    clean_memory()
    
    info = MODELS.get(model_key)
    if not info:
        raise HTTPException(status_code=400, detail="Invalid model key")
        
    model_path = get_smart_path(info["folder"])
    if not model_path:
        raise HTTPException(status_code=500, detail=f"Model {info['name']} not found at {info['folder']}")
        
    try:
        print(f"Loading model from {model_path}...")
        CURRENT_MODEL = load_model(model_path)
        CURRENT_MODEL_KEY = model_key
        return CURRENT_MODEL
    except Exception as e:
        clean_memory()
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

@app.get("/api/metadata")
async def get_metadata():
    speakers = [n for names in SPEAKER_MAP.values() for n in names]
    return {
        "models": MODELS,
        "speaker_map": SPEAKER_MAP,
        "speakers": speakers,
        "emotions": EMOTION_EXAMPLES,
        "backend": backend
    }

@app.get("/api/voices")
async def list_voices():
    # Return list of enrolled voice names
    return {"voices": get_saved_voices()}

@app.post("/api/enroll")
async def enroll_voice(
    name: str = Form(...),
    transcript: str = Form(...),
    reference_audio: UploadFile = File(...)
):
    safe_name = re.sub(r'[^\w\s-]', '', name).strip().replace(' ', '_')
    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid name for voice")
        
    os.makedirs(VOICES_DIR, exist_ok=True)
    
    # Save uploaded file to temp
    temp_wav_path = os.path.join(os.getcwd(), f"temp_enroll_{int(time.time())}.wav")
    with open(temp_wav_path, "wb") as f:
        shutil.copyfileobj(reference_audio.file, f)
        
    # Convert if necessary
    clean_wav_path = convert_audio_if_needed(temp_wav_path)
    if not clean_wav_path:
        if os.path.exists(temp_wav_path):
            os.remove(temp_wav_path)
        raise HTTPException(status_code=400, detail="Could not convert reference audio to compatible format")
        
    target_wav = os.path.join(VOICES_DIR, f"{safe_name}.wav")
    target_txt = os.path.join(VOICES_DIR, f"{safe_name}.txt")
    
    shutil.copy(clean_wav_path, target_wav)
    with open(target_txt, "w", encoding='utf-8') as f:
        f.write(transcript)
        
    if os.path.exists(temp_wav_path):
        os.remove(temp_wav_path)
    if clean_wav_path != temp_wav_path and os.path.exists(clean_wav_path):
        os.remove(clean_wav_path)
        
    return {"message": "Voice enrolled successfully", "name": safe_name}

import uuid

@app.post("/api/generate")
async def generate_speech(
    model_key: str = Form(...),
    mode: str = Form(...), # custom, design, clone
    text: str = Form(...),
    speaker: Optional[str] = Form(None),
    instruct: Optional[str] = Form(None),
    speed: Optional[float] = Form(1.0),
    ref_voice: Optional[str] = Form(None),
    ref_audio: Optional[UploadFile] = File(None),
    ref_text: Optional[str] = Form(None)
):
    temp_dir = None
    temp_r_audio = None
    converted_audio = None
    
    try:
        model = get_loaded_model(model_key)
        info = MODELS[model_key]
        
        req_uuid = uuid.uuid4().hex[:8]
        temp_dir = make_temp_dir() + f"_{req_uuid}"
        
        # --- SMART CHUNKING FIX FOR LONG TEXT ---
        import re
        import soundfile as sf
        import numpy as np
        
        # 1. Split text into manageable chunks by punctuation
        sentences = re.split(r'([.!?;\n]+)', text)
        chunks = []
        current_chunk = ""
        for i in range(len(sentences)):
            part = sentences[i].strip()
            if not part: continue
            if re.match(r'^[.!?;\n]+$', part):
                current_chunk += part
                continue
                
            if len(current_chunk) + len(part) < 250:
                current_chunk += (" " + part if current_chunk and not current_chunk.endswith("\n") else part)
            else:
                if current_chunk: chunks.append(current_chunk.strip())
                current_chunk = part
        if current_chunk: chunks.append(current_chunk.strip())

        # 2. Iteratively Generate and Stitch Audio
        audio_fragments = []
        sr = 24000
        
        os.makedirs(temp_dir, exist_ok=True)
        
        for idx, chunk in enumerate(chunks):
            if not chunk.strip(): continue
            chunk_temp_dir = f"{temp_dir}_{idx}"
            
            try:
                if mode == "custom":
                    if not speaker or not instruct:
                        raise HTTPException(status_code=400, detail="Speaker and instruction are required for Custom mode")
                    generate_audio(
                        model=model, text=chunk, voice=speaker, 
                        instruct=instruct, speed=speed, output_path=chunk_temp_dir
                    )
                elif mode == "design":
                    if not instruct:
                        raise HTTPException(status_code=400, detail="Instruction is required for Design mode")
                    generate_audio(
                        model=model, text=chunk, instruct=instruct, output_path=chunk_temp_dir
                    )
                elif mode == "clone":
                    r_audio_path = None
                    r_text = None
                    if ref_voice:
                        r_audio_path = os.path.join(VOICES_DIR, f"{ref_voice}.wav")
                        txt_path = os.path.join(VOICES_DIR, f"{ref_voice}.txt")
                        if os.path.exists(txt_path):
                            with open(txt_path, 'r', encoding='utf-8') as f:
                                r_text = f.read().strip()
                        if not os.path.exists(r_audio_path):
                            raise HTTPException(status_code=400, detail="Selected reference voice not found")
                    elif ref_audio:
                        r_audio_path = converted_audio
                        r_text = ref_text or "."
                        
                    if not r_audio_path:
                        raise HTTPException(status_code=400, detail="A reference voice is required")
                        
                    generate_audio(
                        model=model, text=chunk, ref_audio=r_audio_path, 
                        ref_text=r_text, output_path=chunk_temp_dir
                    )
                else:
                    raise HTTPException(status_code=400, detail="Invalid mode specified")

                # Load generated chunk
                chunk_file = os.path.join(chunk_temp_dir, "audio_000.wav")
                if os.path.exists(chunk_file):
                    data, samplerate = sf.read(chunk_file)
                    audio_fragments.append(data)
                    sr = samplerate
                    
            finally:
                if os.path.exists(chunk_temp_dir):
                    shutil.rmtree(chunk_temp_dir, ignore_errors=True)

        if not audio_fragments:
            raise HTTPException(status_code=500, detail="Audio generation failed (empty output).")
            
        # 3. Stitch seamlessly and save into main expected output path
        final_audio = np.concatenate(audio_fragments)
        sf.write(os.path.join(temp_dir, "audio_000.wav"), final_audio, sr)

        timestamp = datetime.now().strftime("%H-%M-%S")
        clean_text = re.sub(r'[^\w\s-]', '', text)[:20].strip().replace(' ', '_') or "audio"
        filename = f"{timestamp}_{clean_text}.wav"
        
        save_path = os.path.join(BASE_OUTPUT_DIR, info["output_subfolder"])
        os.makedirs(save_path, exist_ok=True)
        final_path = os.path.join(save_path, filename)
        
        source_file = os.path.join(temp_dir, "audio_000.wav")
        if os.path.exists(source_file):
            shutil.move(source_file, final_path)
            
        if not os.path.exists(final_path):
            raise HTTPException(status_code=500, detail="Audio generation failed. File not output.")
            
        return FileResponse(final_path, media_type="audio/wav", filename=filename)
        
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        print(f"Error generating audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        if temp_r_audio and os.path.exists(temp_r_audio):
            try: os.remove(temp_r_audio)
            except: pass
        if converted_audio and converted_audio != temp_r_audio and os.path.exists(converted_audio):
            try: os.remove(converted_audio)
            except: pass
        
        clean_memory()

app.mount("/", StaticFiles(directory="public", html=True), name="public")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
