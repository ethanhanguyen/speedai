#!/usr/bin/env python3
import argparse
from pathlib import Path
from PIL import Image
import math

parser = argparse.ArgumentParser()
parser.add_argument('directory', help='Directory containing PNG files')
args = parser.parse_args()

images = []
for f in sorted(Path(args.directory).glob('*.png')):
    try:
        images.append((f.name, Image.open(f).convert('RGBA')))
    except Exception as e:
        print(f"Skipped {f.name}: {e}")

if not images:
    print("No PNG files found")
    exit(1)

cols = math.ceil(math.sqrt(len(images)))
rows = math.ceil(len(images) / cols)
cell_w = max(i.width for _, i in images) + 10
cell_h = max(i.height for _, i in images) + 10

output = Image.new('RGBA', (cols * cell_w, rows * cell_h), (0, 0, 0, 0))

for idx, (_, img) in enumerate(images):
    x = (idx % cols) * cell_w + 5
    y = (idx // cols) * cell_h + 5
    output.paste(img, (x, y), img)

output.save('output_spreadsheet.png')
print(f"✓ Saved {len(images)} images to output_spreadsheet.png")
