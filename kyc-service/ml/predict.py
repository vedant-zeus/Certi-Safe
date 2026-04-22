"""
predict.py — CLI tool for single video deepfake testing
Suitable for testing the 3D Video model sequence.

Usage:
    python ml/predict.py --input path/to/video.webm
"""

import argparse
import sys
from pathlib import Path

import cv2
import torch
import numpy as np
from PIL import Image
from torchvision import transforms

sys.path.insert(0, str(Path(__file__).parent))
from model import load_trained_model, get_model, VIDEO_MEAN, VIDEO_STD

MODEL_PATH = Path(__file__).parent / "saved_model" / "deepfake_video_model.pth"
NUM_FRAMES = 16

INFER_TF = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(VIDEO_MEAN, VIDEO_STD),
])

def run(input_path: str):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    if MODEL_PATH.exists():
        model = load_trained_model(str(MODEL_PATH), device)
        print(f"✅ Loaded trained 3D video model from {MODEL_PATH}")
    else:
        model = get_model(device)
        model.eval()
        print(f"⚠ No trained model found — using random network weights (run train.py first)")

    path = Path(input_path)
    if not path.exists():
        print(f"❌ File not found: {input_path}")
        sys.exit(1)

    ext = path.suffix.lower()
    if ext in ('.webm', '.mp4', '.mov', '.avi'):
        cap = cv2.VideoCapture(str(path))
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total <= 0: total = NUM_FRAMES
        indices = set(np.linspace(0, max(total-1,0), num=min(NUM_FRAMES, total), dtype=int).tolist())
        frames, fi = [], 0
        while len(frames) < len(indices):
            ret, frame = cap.read()
            if not ret: break
            if fi in indices:
                frames.append(Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)))
            fi += 1
        cap.release()
        
        while len(frames) < NUM_FRAMES and len(frames) > 0:
            frames.append(frames[-1].copy())
            
        print(f"📹 Extracted block of {len(frames)} frames from video")
    else:
        # Static image fallback
        img = Image.open(input_path).convert('RGB')
        frames = [img] * NUM_FRAMES
        print(f"🖼 Loaded single image as a static {NUM_FRAMES}-frame sequence: {path.name}")

    tensor_frames = [INFER_TF(img) for img in frames]
    # (Frames, Channels, H, W) -> (Channels, Frames, H, W)
    video_tensor = torch.stack(tensor_frames).permute(1, 0, 2, 3).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(video_tensor)
        probs  = torch.softmax(logits, dim=1)[0]
    
    real = float(probs[0]) * 100
    fake = float(probs[1]) * 100
    
    verdict = "✅ REAL" if real >= 50 else "🚫 FAKE / DEEPFAKE"
    print(f"\n{'─'*40}")
    print(f"  Real sequence confidence : {real:.1f}%")
    print(f"  Verdict : {verdict}")
    print(f"{'─'*40}\n")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True, help='Path to video file')
    args = parser.parse_args()
    run(args.input)
