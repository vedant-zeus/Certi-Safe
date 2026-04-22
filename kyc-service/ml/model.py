"""
model.py — 3D Video ResNet Deepfake Detector
Native Video Classifier for (Batch, Channels, Frames, Height, Width) tensors.
Classifies videos as Real (0) vs Fake (1).
"""

import torch
import torch.nn as nn
from torchvision.models.video import r3d_18, R3D_18_Weights

class DeepfakeVideoDetector(nn.Module):
    def __init__(self, pretrained: bool = True):
        super().__init__()
        weights = R3D_18_Weights.KINETICS400_V1 if pretrained else None
        self.base = r3d_18(weights=weights)
        
        # Freeze the very early 3D layers so it trains faster and doesn't overfit
        if pretrained:
            for param in self.base.stem.parameters():
                param.requires_grad = False
            for param in self.base.layer1.parameters():
                param.requires_grad = False

        # Replace Kinetics-400 classification head with binary classification
        in_features = self.base.fc.in_features
        self.base.fc = nn.Sequential(
            nn.Dropout(p=0.4),
            nn.Linear(in_features, 2)  # 2 classes: Real vs Fake
        )

    def forward(self, x):
        # Input x must be shape: (B, C, T, H, W)
        # B=Batch, C=Channels(3), T=Frames(e.g. 16), H=Height, W=Width
        return self.base(x)


def get_model(device: torch.device) -> DeepfakeVideoDetector:
    model = DeepfakeVideoDetector(pretrained=True)
    return model.to(device)


def load_trained_model(model_path: str, device: torch.device) -> DeepfakeVideoDetector:
    model = DeepfakeVideoDetector(pretrained=False)
    state = torch.load(model_path, map_location=device, weights_only=True)
    model.load_state_dict(state)
    model.eval()
    return model.to(device)


# Standard Kinetics-400 normalization constants for video models
VIDEO_MEAN = [0.43216, 0.394666, 0.37645]
VIDEO_STD  = [0.22803, 0.22145, 0.216989]
