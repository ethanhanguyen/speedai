#!/usr/bin/env python3
"""
Crop sprites from a spritesheet into individual image files.
Supports configurable grid dimensions (rows x columns).
"""

import argparse
import sys
from pathlib import Path
from PIL import Image


def crop_spritesheet(
    input_path: str,
    output_dir: str,
    rows: int,
    cols: int,
    prefix: str = "sprite",
) -> None:
    """
    Crop a spritesheet into individual sprites.

    Args:
        input_path: Path to the input spritesheet image
        output_dir: Directory to save cropped sprites
        rows: Number of rows in the grid
        cols: Number of columns in the grid
        prefix: Prefix for output filenames
    """
    # Validate inputs
    if rows <= 0 or cols <= 0:
        raise ValueError("Rows and columns must be positive integers")

    # Load image
    input_file = Path(input_path)
    if not input_file.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    image = Image.open(input_file)
    img_width, img_height = image.size

    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Calculate sprite dimensions
    sprite_width = img_width // cols
    sprite_height = img_height // rows

    if sprite_width <= 0 or sprite_height <= 0:
        raise ValueError(
            f"Invalid grid dimensions: {cols} cols × {rows} rows "
            f"cannot divide {img_width}×{img_height} image"
        )

    print(f"Cropping {input_file.name}")
    print(f"  Image size: {img_width}×{img_height}")
    print(f"  Grid: {rows} rows × {cols} cols")
    print(f"  Sprite size: {sprite_width}×{sprite_height}")
    print(f"  Total sprites: {rows * cols}")

    # Crop sprites
    sprite_index = 0
    for row in range(rows):
        for col in range(cols):
            left = col * sprite_width
            top = row * sprite_height
            right = left + sprite_width
            bottom = top + sprite_height

            # Crop sprite
            sprite = image.crop((left, top, right, bottom))

            # Save sprite
            output_file = output_path / f"{prefix}_{sprite_index:03d}.png"
            sprite.save(output_file)
            print(f"  Saved: {output_file.name}")

            sprite_index += 1

    print(f"\n✓ Successfully cropped {sprite_index} sprites to {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Crop sprites from a spritesheet into individual image files.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Default 3 rows × 4 cols
  python crop_spritesheet.py tileset.png output/

  # Custom 4 rows × 8 cols
  python crop_spritesheet.py tileset.png output/ -r 4 -c 8

  # With custom prefix
  python crop_spritesheet.py enemies.png output/ -r 2 -c 3 --prefix enemy
        """,
    )

    parser.add_argument(
        "input",
        help="Path to the input spritesheet image",
    )

    parser.add_argument(
        "output",
        help="Directory to save cropped sprites",
    )

    parser.add_argument(
        "-r", "--rows",
        type=int,
        default=3,
        help="Number of rows in the grid (default: 3)",
    )

    parser.add_argument(
        "-c", "--cols",
        type=int,
        default=4,
        help="Number of columns in the grid (default: 4)",
    )

    parser.add_argument(
        "--prefix",
        type=str,
        default="sprite",
        help="Prefix for output filenames (default: sprite)",
    )

    args = parser.parse_args()

    try:
        crop_spritesheet(
            input_path=args.input,
            output_dir=args.output,
            rows=args.rows,
            cols=args.cols,
            prefix=args.prefix,
        )
    except (FileNotFoundError, ValueError) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
