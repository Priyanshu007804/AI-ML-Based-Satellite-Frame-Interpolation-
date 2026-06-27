"""
PyTorch Dataset for Satellite Frame Interpolation.

Loads (im1, im2, im3) triplets created by prepare_goes_data.py
and applies data augmentation suitable for satellite imagery.
"""

import os
import random
import cv2
import numpy as np
import torch
from torch.utils.data import Dataset
from pathlib import Path


class SatelliteVimeoDataset(Dataset):
    """
    Dataset loader mimicking the Vimeo90K triplet structure but for satellite data.
    Folder structure expected:
    data_root/
        sequence_0000/
            im1.png
            im2.png (ground truth middle frame)
            im3.png
        sequence_0001/
            ...
    """

    def __init__(self, data_root, is_training=True, crop_size=(256, 256)):
        self.data_root = Path(data_root)
        self.is_training = is_training
        self.crop_size = crop_size
        
        # Find all sequence directories
        self.sequence_dirs = sorted([d for d in self.data_root.iterdir() if d.is_dir()])
        
        if len(self.sequence_dirs) == 0:
            raise ValueError(f"No sequences found in {data_root}")

    def __len__(self):
        return len(self.sequence_dirs)

    def __getitem__(self, index):
        seq_dir = self.sequence_dirs[index]
        
        img0_path = seq_dir / "im1.png"
        gt_path = seq_dir / "im2.png"
        img1_path = seq_dir / "im3.png"

        # Load as BGR uint8
        img0 = cv2.imread(str(img0_path))
        gt = cv2.imread(str(gt_path))
        img1 = cv2.imread(str(img1_path))
        
        if img0 is None or gt is None or img1 is None:
            raise RuntimeError(f"Missing images in {seq_dir}")

        if self.is_training:
            # Random Crop
            h, w = img0.shape[:2]
            ch, cw = self.crop_size
            
            if h >= ch and w >= cw:
                x = random.randint(0, w - cw)
                y = random.randint(0, h - ch)
                
                img0 = img0[y:y+ch, x:x+cw]
                gt = gt[y:y+ch, x:x+cw]
                img1 = img1[y:y+ch, x:x+cw]
            else:
                img0 = cv2.resize(img0, self.crop_size)
                gt = cv2.resize(gt, self.crop_size)
                img1 = cv2.resize(img1, self.crop_size)

            # Data Augmentations for Satellite Imagery
            
            # 1. Random Flip (Horizontal / Vertical)
            if random.random() < 0.5:
                img0 = img0[:, ::-1]
                gt = gt[:, ::-1]
                img1 = img1[:, ::-1]
            if random.random() < 0.5:
                img0 = img0[::-1, :]
                gt = gt[::-1, :]
                img1 = img1[::-1, :]

            # 2. Random Temporal Reverse
            # (Reversing time is physically valid for training flow)
            if random.random() < 0.5:
                img0, img1 = img1, img0

        # Convert to torch tensors (C, H, W) in [0, 1] range
        img0 = torch.from_numpy(img0.transpose(2, 0, 1).copy()).float() / 255.0
        gt = torch.from_numpy(gt.transpose(2, 0, 1).copy()).float() / 255.0
        img1 = torch.from_numpy(img1.transpose(2, 0, 1).copy()).float() / 255.0

        return img0, gt, img1
