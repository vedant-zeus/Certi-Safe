"""
train.py — Deepfake Detection Video Training Pipeline (Colab Ready)

Usage:
    python train.py --epochs 5 --batch-size 4 --frames 8 --sample 200
"""

import os
import sys
import argparse
import time
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, random_split
from torchvision import transforms
from PIL import Image
from tqdm import tqdm
from sklearn.metrics import roc_auc_score

# ── Import model ─────────────────────────────────────────────
sys.path.insert(0, str(Path("/content")))
from model import get_model, VIDEO_MEAN, VIDEO_STD

# ── Paths ───────────────────────────────────────────────────
ML_DIR    = Path("/content")
MODEL_DIR = ML_DIR / "saved_model"
MODEL_DIR.mkdir(exist_ok=True)
MODEL_PATH = MODEL_DIR / "deepfake_video_model.pth"

# ── Dataset Download (AUTO) ─────────────────────────────────
def download_dataset():
    import kagglehub
    print("[1/5] Downloading dataset...")
    path = kagglehub.dataset_download("xdxd003/ff-c23")
    print(f"Dataset downloaded to: {path}")
    return path

# ── Video Frame Extraction ──────────────────────────────────
def extract_video_frames(video_path, num_frames=8):
    frames = []
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return frames

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        total_frames = num_frames

    indices = np.linspace(0, total_frames - 1, num=min(num_frames, total_frames), dtype=int)
    idx_set = set(indices.tolist())

    current = 0
    while len(frames) < len(idx_set):
        ret, frame = cap.read()
        if not ret:
            break
        if current in idx_set:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(Image.fromarray(rgb))
        current += 1

    cap.release()

    while len(frames) < num_frames and len(frames) > 0:
        frames.append(frames[-1].copy())

    return frames

# ── Find Video Files ────────────────────────────────────────
def find_video_files(root_dir):
    items = []
    fake_keywords = ['fake', 'deepfake', 'f2f', 'fs', 'nt']
    real_keywords = ['real', 'original']

    print(f"[2/5] Scanning dataset: {root_dir}")

    for dirpath, _, filenames in os.walk(root_dir):
        path_lower = dirpath.lower()

        label = None
        if any(x in path_lower for x in fake_keywords):
            label = 1
        elif any(x in path_lower for x in real_keywords):
            label = 0

        for f in filenames:
            if f.endswith(('.mp4', '.avi', '.mov')):
                if label is not None:
                    items.append((os.path.join(dirpath, f), label))

    return items

# ── Dataset Class ───────────────────────────────────────────
class VideoDataset(Dataset):
    def __init__(self, items, num_frames, transform):
        self.items = items
        self.num_frames = num_frames
        self.transform = transform

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        path, label = self.items[idx]
        frames = extract_video_frames(path, self.num_frames)

        if len(frames) == 0:
            return torch.zeros((3, self.num_frames, 224, 224)), label

        frames = [self.transform(img) for img in frames]
        video = torch.stack(frames).permute(1, 0, 2, 3)
        return video, label

# ── Transforms ──────────────────────────────────────────────
def get_transforms(size=224):
    tf = transforms.Compose([
        transforms.Resize((size, size)),
        transforms.ToTensor(),
        transforms.Normalize(VIDEO_MEAN, VIDEO_STD)
    ])
    return tf

# ── Train / Eval ────────────────────────────────────────────
def train_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss, correct, total = 0, 0, 0

    for x, y in tqdm(loader, desc="Train", leave=False):
        x, y = x.to(device), y.to(device)

        optimizer.zero_grad()
        out = model(x)
        loss = criterion(out, y)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * x.size(0)
        _, pred = out.max(1)
        correct += pred.eq(y).sum().item()
        total += x.size(0)

    return total_loss / total, correct / total

@torch.no_grad()
def eval_epoch(model, loader, criterion, device):
    model.eval()
    total_loss, correct, total = 0, 0, 0
    probs_all, labels_all = [], []

    for x, y in tqdm(loader, desc="Val", leave=False):
        x, y = x.to(device), y.to(device)

        out = model(x)
        loss = criterion(out, y)

        total_loss += loss.item() * x.size(0)
        probs = torch.softmax(out, dim=1)[:, 1]

        _, pred = out.max(1)
        correct += pred.eq(y).sum().item()
        total += x.size(0)

        probs_all.extend(probs.cpu().numpy())
        labels_all.extend(y.cpu().numpy())

    auc = roc_auc_score(labels_all, probs_all) if len(set(labels_all)) > 1 else 0
    return total_loss / total, correct / total, auc

# ── MAIN ────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--epochs', type=int, default=5)
    parser.add_argument('--batch-size', type=int, default=4)
    parser.add_argument('--frames', type=int, default=8)
    parser.add_argument('--sample', type=int, default=200)
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\nDevice: {device}\n")

    # Download dataset
    dataset_path = download_dataset()

    # Load dataset
    items = find_video_files(dataset_path)

    if args.sample > 0:
        import random
        random.shuffle(items)
        items = items[:args.sample]

    print(f"Total samples: {len(items)}")

    # Split
    val_size = int(0.2 * len(items))
    train_items = items[val_size:]
    val_items = items[:val_size]

    tf = get_transforms()

    train_loader = DataLoader(VideoDataset(train_items, args.frames, tf),
                              batch_size=args.batch_size, shuffle=True)

    val_loader = DataLoader(VideoDataset(val_items, args.frames, tf),
                            batch_size=args.batch_size)

    # Model
    model = get_model(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)

    best_auc = 0

    print("\n[3/5] Training...\n")

    for epoch in range(args.epochs):
        t0 = time.time()

        tr_loss, tr_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc, val_auc = eval_epoch(model, val_loader, criterion, device)

        print(f"Epoch {epoch+1}: "
              f"Train Acc {tr_acc:.2f} | Val Acc {val_acc:.2f} | AUC {val_auc:.4f}")

        if val_auc > best_auc:
            best_auc = val_auc
            torch.save(model.state_dict(), MODEL_PATH)
            print("✅ Model Saved")

        print(f"Time: {time.time()-t0:.1f}s\n")

    print(f"\nBest AUC: {best_auc}")
    print(f"Model saved at: {MODEL_PATH}")

if __name__ == "__main__":
    main()