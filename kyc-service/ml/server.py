"""
server.py — FastAPI 3D Video Deepfake Detection Inference Server
Runs on port 8001. Called by Node.js services/deepfake.js.

Usage:
    python ml/server.py
"""

import os
import io
import sys
import time
import logging
import tempfile
from pathlib import Path

import cv2
import numpy as np
import torch
import uvicorn
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from PIL import Image
from torchvision import transforms

sys.path.insert(0, str(Path(__file__).parent))
from model import load_trained_model, get_model, VIDEO_MEAN, VIDEO_STD

# ── Config ────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger("deepfake-server")

MODEL_PATH = Path(__file__).parent / "saved_model" / "deepfake_video_model.pth"
PORT       = int(os.getenv("PORT", "8001"))
NUM_FRAMES = 16  # Must match the 3D CNN requirements

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    
    if not MODEL_PATH.exists():
        log.info(f"Model not found at {MODEL_PATH}. Attempting to download from Google Drive...")
        try:
            import gdown
            MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
            file_id = "1OMmSw63CYRgbBZhq3_R3B1P4pUfDNx4z"
            url = f"https://drive.google.com/uc?id={file_id}"
            gdown.download(url, str(MODEL_PATH), quiet=False)
        except Exception as e:
            log.warning(f"Failed to download model from Google Drive: {e}")

    if MODEL_PATH.exists():
        log.info(f"Loading trained 3D video model from {MODEL_PATH}")
        model = load_trained_model(str(MODEL_PATH), device)
        log.info("✅ Model loaded successfully")
    else:
        log.warning(
            f"⚠ No trained model found at {MODEL_PATH}. "
            "Run `python ml/train.py` first. "
            "Falling back to untrained model (random weights — for testing only)."
        )
        model = get_model(device)
        model.eval()
    log.info(f"Device: {device}  |  Listening on port {PORT}")
    yield

# ── App ───────────────────────────────────────────────────────────────────────
app    = FastAPI(title="Video Deepfake API", version="1.0.0", lifespan=lifespan)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

INFER_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(VIDEO_MEAN, VIDEO_STD),
])

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": MODEL_PATH.exists(),
        "device": str(device)
    }

def predict_video(pil_frames: list[Image.Image]) -> dict:
    """Run 3D CNN inference on a sequence of 16 frames."""
    tensor_frames = [INFER_TRANSFORM(img) for img in pil_frames]
    # Stack into (Frames, Channels, H, W) -> permute to (Channels, Frames, H, W)
    video_tensor = torch.stack(tensor_frames).permute(1, 0, 2, 3).unsqueeze(0).to(device)
    
    with torch.no_grad():
        logits = model(video_tensor)
        probs  = torch.softmax(logits, dim=1)[0]

    real_prob = float(probs[0].item()) * 100
    fake_prob = float(probs[1].item()) * 100
    
    return {
        "real_confidence": round(real_prob, 2),
        "fake_confidence": round(fake_prob, 2),
        "is_real":  real_prob >= 50.0,
        "predicted": "real" if real_prob >= 50.0 else "fake"
    }

def extract_frames(video_bytes: bytes, n_frames: int = 16) -> list[Image.Image]:
    """Extract n uniformly-spaced frames from a video byte stream."""
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    frames = []
    try:
        cap = cv2.VideoCapture(tmp_path)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total <= 0: total = n_frames
        
        indices = np.linspace(0, max(total - 1, 0), num=min(n_frames, total), dtype=int)
        idx_set = set(indices.tolist())
        
        frame_idx = 0
        while len(frames) < len(idx_set):
            ret, frame = cap.read()
            if not ret: break
            if frame_idx in idx_set:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(Image.fromarray(rgb))
            frame_idx += 1
        cap.release()
        
        # Pad if short
        while len(frames) < n_frames and len(frames) > 0:
            frames.append(frames[-1].copy())
            
    finally:
        os.unlink(tmp_path)

    return frames

@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    mode: str = Form("auto")
):
    """
    Analyze an uploaded video for deepfake detection using a 3D CNN.
    """
    t_start = time.perf_counter()
    raw     = await file.read()
    content_type = file.content_type or ""

    is_video = "video" in content_type or mode == "video" or \
               file.filename.endswith((".webm", ".mp4", ".mov", ".avi"))

    if is_video:
        frames = extract_frames(raw, n_frames=NUM_FRAMES)
        if not frames:
            # Fallback
            try:
                img = Image.open(io.BytesIO(raw)).convert("RGB")
                frames = [img] * NUM_FRAMES
            except Exception:
                raise HTTPException(status_code=422, detail="Could not extract frames")
    else:
        # Fallback for single image: simulate a static video
        try:
            img = Image.open(io.BytesIO(raw)).convert("RGB")
            frames = [img] * NUM_FRAMES
        except Exception:
            raise HTTPException(status_code=422, detail="Could not decode image")

    # Run inference using the 3D CNN sequence model
    result_dict = predict_video(frames)
    
    elapsed_ms = round((time.perf_counter() - t_start) * 1000, 1)

    return JSONResponse({
        "real_confidence":   result_dict["real_confidence"],
        "is_real":           result_dict["is_real"],
        "analyzed_frames":   len(frames),
        "inference_time_ms": elapsed_ms,
        "device":            str(device)
    })

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=PORT, log_level="info")
