#!/usr/bin/env python3
import argparse
from pathlib import Path
from PIL import Image
import math
import re

def natural_sort_key(path):
    """Convert filename to a key that sorts naturally (handling numbers properly)."""
    filename = path.name
    # Split filename into text and number parts
    parts = re.split(r'(\d+)', filename)
    return [int(part) if part.isdigit() else part.lower() for part in parts]

parser = argparse.ArgumentParser()
parser.add_argument('directory', help='Directory containing PNG files')
parser.add_argument('--sort', action='store_true', default=True,
                    help='Sort images alphabetically (default: True)')
parser.add_argument('--no-sort', dest='sort', action='store_false',
                    help='Disable alphabetical sorting')
parser.add_argument('--natural-sort', action='store_true',
                    help='Sort images naturally (handles numbers: image_1, image_2, ..., image_10)')
args = parser.parse_args()

images = []
png_files = list(Path(args.directory).glob('*.png'))

if args.natural_sort:
    png_files.sort(key=natural_sort_key)
elif args.sort:
    png_files.sort()

for f in png_files:
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
