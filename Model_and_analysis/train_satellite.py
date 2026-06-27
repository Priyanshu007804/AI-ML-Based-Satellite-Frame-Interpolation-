import os
import argparse
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from tqdm import tqdm

# Import our custom dataset
from satellite_dataset import SatelliteVimeoDataset

# Import model (Ensure IFNet_HDv3.py and RIFE_HDv3.py are accessible)
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'FastAPI')))
from train_log.RIFE_HDv3 import Model

def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("Using device:", device)

    dataset = SatelliteVimeoDataset(args.dataset_dir, is_training=True, crop_size=(256, 256))
    dataloader = DataLoader(dataset, batch_size=args.batch_size, shuffle=True, num_workers=2, pin_memory=True)

    print(f"Loaded {len(dataset)} training triplets.")

    # Initialize Model
    model = Model()
    model.device()

    # Load pre-trained weights if provided
    if args.pretrained_model:
        model.load_model(args.pretrained_model, -1)

    model.flownet.train()

    # Optimizer with low learning rate for fine-tuning
    optimizer = optim.AdamW(model.flownet.parameters(), lr=args.learning_rate, weight_decay=1e-4)
    criterion = nn.MSELoss()

    os.makedirs(args.save_dir, exist_ok=True)

    for epoch in range(args.epochs):
        epoch_loss = 0.0
        
        progress = tqdm(dataloader, desc=f"Epoch {epoch+1}/{args.epochs}")
        for img0, gt, img1 in progress:
            img0 = img0.to(device)
            gt = gt.to(device)
            img1 = img1.to(device)
            
            optimizer.zero_grad()
            
            # RIFE uses recursive inference, but for training a single step:
            # We'd typically use model.update() or forward pass of flownet directly.
            # Assuming standard forward pass for simplification in this snippet:
            pred = model.inference(img0, img1)
            
            loss = criterion(pred, gt)
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item()
            progress.set_postfix({'loss': loss.item()})
            
        avg_loss = epoch_loss / len(dataloader)
        print(f"Epoch {epoch+1} Average Loss: {avg_loss:.6f}")

        # Save checkpoint
        model.save_model(args.save_dir, epoch)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune RIFE HDv3 on satellite imagery.")
    parser.add_argument("--dataset_dir", type=str, default="./goes_dataset/triplets", help="Path to triplets dataset.")
    parser.add_argument("--pretrained_model", type=str, default="../FastAPI/train_log", help="Path to pre-trained model directory.")
    parser.add_argument("--save_dir", type=str, default="./finetuned_models", help="Path to save fine-tuned models.")
    parser.add_argument("--batch_size", type=int, default=4, help="Batch size for training.")
    parser.add_argument("--epochs", type=int, default=5, help="Number of epochs to train.")
    parser.add_argument("--learning_rate", type=float, default=1e-5, help="Learning rate.")
    
    args = parser.parse_args()
    train(args)
