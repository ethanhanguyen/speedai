import argparse
import cv2
import numpy as np
from pathlib import Path


def remove_white_bg_with_dilation_protection(
    input_path: str,
    output_path: str = None,
    white_threshold: int = 235,       # lower = more aggressive
    erode_kernel_size: int = 5,       # 3–9 most common
    dilate_kernel_size: int = 9,      # usually larger than erode
    erode_iterations: int = 2,
    dilate_iterations: int = 3,
    blur_size: int = 3,               # optional light blur to reduce JPEG noise
    border_size: int = 30,            # safety padding to protect sprite edges
    bg_color: str = 'white'           # 'white' or 'black'
) -> None:
    """
    Removes white or black background while trying to preserve internal white/glow parts
    using morphological operations (erosion → dilation).

    Adds padding (matching bg_color) before processing to protect sprite edges from morphology.

    Args:
        bg_color: 'white' or 'black' - the background color to remove
    """
    # Read image
    img = cv2.imread(input_path, cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"Cannot read {input_path}")

    # Determine border padding color based on background type
    is_black_bg = bg_color.lower() == 'black'
    border_color = (0, 0, 0) if is_black_bg else (255, 255, 255)

    # Add border for safety (morphology won't eat real edges)
    if border_size > 0:
        img = cv2.copyMakeBorder(
            img,
            border_size, border_size, border_size, border_size,
            cv2.BORDER_CONSTANT,
            value=border_color
        )

    # Optional: slight blur helps with JPEG compression artifacts
    if blur_size > 0:
        img = cv2.GaussianBlur(img, (blur_size, blur_size), 0)

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Create initial binary mask based on background type
    if is_black_bg:
        # For black background: near-black = 255 (background candidate)
        black_threshold = 255 - white_threshold  # e.g., 235 -> 20
        _, mask = cv2.threshold(gray, black_threshold, 255, cv2.THRESH_BINARY_INV)

        # Also catch very low saturation blacks (dark colors)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        saturation_low = cv2.inRange(hsv, (0, 0, 0), (180, 30, black_threshold))
        mask = cv2.bitwise_or(mask, saturation_low)
    else:
        # For white background: near-white = 255 (background candidate)
        _, mask = cv2.threshold(gray, white_threshold, 255, cv2.THRESH_BINARY)

        # Also catch very low saturation whites
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        saturation_low = cv2.inRange(hsv, (0, 0, white_threshold), (180, 30, 255))
        mask = cv2.bitwise_or(mask, saturation_low)

    # Kernel for morphology
    kernel_erode = np.ones((erode_kernel_size, erode_kernel_size), np.uint8)
    kernel_dilate = np.ones((dilate_kernel_size, dilate_kernel_size), np.uint8)
    borderType = cv2.BORDER_REPLICATE

    # Step 1: Erode strongly → remove internal white regions
    eroded = cv2.erode(mask, kernel_erode, iterations=erode_iterations, borderType=borderType)

    # Step 2: Dilate back (often more iterations) → recover background
    dilated = cv2.dilate(eroded, kernel_dilate, iterations=dilate_iterations, borderType=borderType)

    # Optional: close small holes in background (very useful)
    dilated = cv2.morphologyEx(dilated, cv2.MORPH_CLOSE, kernel_dilate, iterations=1)

    # Step 3: Use connected components to identify background region
    # Only remove the background region touching the border, preserve internal whites
    _, labels = cv2.connectedComponents(dilated)

    # Background is the component that touches image border
    background_label = labels[0, 0]  # top-left corner pixel's label

    # Create mask with only the background region
    bg_only = np.zeros_like(dilated)
    bg_only[labels == background_label] = 255

    # Now bg_only = confident background region only
    # We want to REMOVE background → so invert for foreground
    fg_mask = cv2.bitwise_not(bg_only)

    # Remove safety border padding
    if border_size > 0:
        img = img[border_size:-border_size, border_size:-border_size]
        fg_mask = fg_mask[border_size:-border_size, border_size:-border_size]

    # Smooth mask edges to reduce pixelation (convert to float for anti-aliasing)
    fg_mask_float = fg_mask.astype(np.float32) / 255.0
    fg_mask_float = cv2.GaussianBlur(fg_mask_float, (3, 3), 0.5)
    fg_mask = (fg_mask_float * 255).astype(np.uint8)

    # Create alpha channel
    b, g, r = cv2.split(img)
    rgba = cv2.merge([b, g, r, fg_mask])

    # Save
    out_path = output_path or str(Path(input_path).with_suffix('.png'))
    cv2.imwrite(out_path, rgba)
    print(f"Saved transparent PNG ({bg_color} bg removed) → {out_path}")


def process_directory(
    input_dir: str,
    output_dir: str = None,
    **kwargs
) -> None:
    """
    Process all image files in a directory.
    """
    input_path = Path(input_dir)
    if not input_path.is_dir():
        raise NotADirectoryError(f"{input_dir} is not a directory")

    # Create output directory if specified
    output_path = Path(output_dir) if output_dir else input_path
    output_path.mkdir(parents=True, exist_ok=True)

    # Image extensions to process
    image_extensions = {'.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tiff'}
    image_files = [f for f in input_path.iterdir()
                   if f.is_file() and f.suffix.lower() in image_extensions]

    if not image_files:
        print(f"No image files found in {input_dir}")
        return

    print(f"Processing {len(image_files)} image(s) from {input_dir}")
    for idx, img_file in enumerate(image_files, 1):
        try:
            out_file = output_path / img_file.with_suffix('.png').name
            print(f"[{idx}/{len(image_files)}] Processing {img_file.name}...", end=" ")
            remove_white_bg_with_dilation_protection(
                input_path=str(img_file),
                output_path=str(out_file),
                **kwargs
            )
            print("✓")
        except Exception as e:
            print(f"✗ Error: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Remove white or black background from sprite images using morphological operations. "
                    "Accepts single file or directory of images."
    )
    parser.add_argument(
        "input",
        help="Path to input image file or directory of images"
    )
    parser.add_argument(
        "-o", "--output",
        default=None,
        help="Path to output PNG file (for single file) or output directory (for batch). "
             "Defaults to input location."
    )
    parser.add_argument(
        "--bg-color",
        type=str,
        choices=['white', 'black'],
        default='white',
        help="Background color to remove: 'white' or 'black' (default: white)"
    )
    parser.add_argument(
        "--white-threshold",
        type=int,
        default=235,
        help="Threshold value for white/black detection (lower = more aggressive, range: 220-245, default: 235). "
             "For black backgrounds, this is inverted automatically."
    )
    parser.add_argument(
        "--erode-kernel-size",
        type=int,
        default=3,
        help="Erosion kernel size (range: 3-9, default: 5)"
    )
    parser.add_argument(
        "--dilate-kernel-size",
        type=int,
        default=5,
        help="Dilation kernel size (usually larger than erode, default: 9)"
    )
    parser.add_argument(
        "--erode-iterations",
        type=int,
        default=1,
        help="Number of erosion iterations (default: 2)"
    )
    parser.add_argument(
        "--dilate-iterations",
        type=int,
        default=1,
        help="Number of dilation iterations (default: 3)"
    )
    parser.add_argument(
        "--blur-size",
        type=int,
        default=3,
        help="Gaussian blur kernel size for noise reduction (default: 3)"
    )
    parser.add_argument(
        "--border-size",
        type=int,
        default=30,
        help="Safety padding size in pixels to protect sprite edges (default: 30)"
    )

    args = parser.parse_args()

    # Common parameters
    kwargs = {
        'white_threshold': args.white_threshold,
        'erode_kernel_size': args.erode_kernel_size,
        'dilate_kernel_size': args.dilate_kernel_size,
        'erode_iterations': args.erode_iterations,
        'dilate_iterations': args.dilate_iterations,
        'blur_size': args.blur_size,
        'border_size': args.border_size,
        'bg_color': args.bg_color
    }

    input_path = Path(args.input)

    # Process directory or single file
    if input_path.is_dir():
        process_directory(args.input, args.output, **kwargs)
    else:
        remove_white_bg_with_dilation_protection(
            input_path=args.input,
            output_path=args.output,
            **kwargs
        )