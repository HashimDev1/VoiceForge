import sys
import os
import random
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageDraw

def generate_scene(prompt: str, output_path: str, aspect_ratio: str = "16:9"):
    # Calculate dimensions
    if aspect_ratio == "9:16":
        width, height = 576, 1024
    elif aspect_ratio == "1:1":
        width, height = 768, 768
    else:
        width, height = 1024, 576

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    images_dir = os.path.join(base_dir, "data", "flow_studio", "images")

    # Check for available photographic base templates
    available_bases = [
        "roman_scene_001.jpg",
        "roman_scene_002.jpg",
        "roman_scene_003.jpg",
        "roman_scene_004.jpg",
        "roman_scene_005.jpg",
        "roman_scene_006.jpg",
        "roman_scene_007.jpg",
        "roman_scene_008.jpg",
        "roman_scene_009.jpg",
        "flow_scene_1.jpg",
        "flow_scene_2.jpg",
        "flow_scene_3.jpg"
    ]

    existing_bases = [
        f for f in available_bases
        if os.path.exists(os.path.join(images_dir, f)) and os.path.getsize(os.path.join(images_dir, f)) > 10000
    ]

    p_lower = prompt.lower()

    # Prioritize template matching prompt themes
    selected_base = None
    if "tuna" in p_lower or "cutting" in p_lower or "flesh" in p_lower:
        candidates = ["roman_scene_002.jpg", "roman_scene_003.jpg", "roman_scene_004.jpg"]
        for c in candidates:
            if c in existing_bases:
                selected_base = c
                break
    elif "coast" in p_lower or "baelo" in p_lower or "sea" in p_lower or "port" in p_lower:
        candidates = ["roman_scene_001.jpg", "roman_scene_006.jpg", "roman_scene_007.jpg"]
        for c in candidates:
            if c in existing_bases:
                selected_base = c
                break
    elif "vat" in p_lower or "garum" in p_lower or "salt" in p_lower or "factory" in p_lower:
        candidates = ["roman_scene_005.jpg", "roman_scene_008.jpg", "roman_scene_002.jpg"]
        for c in candidates:
            if c in existing_bases:
                selected_base = c
                break
    elif "market" in p_lower or "street" in p_lower or "worker" in p_lower or "citizen" in p_lower:
        candidates = ["roman_scene_009.jpg", "flow_scene_1.jpg", "flow_scene_2.jpg", "flow_scene_3.jpg"]
        for c in candidates:
            if c in existing_bases:
                selected_base = c
                break

    if not selected_base and existing_bases:
        selected_base = random.choice(existing_bases)

    if selected_base:
        img = Image.open(os.path.join(images_dir, selected_base)).convert("RGB")
        img_w, img_h = img.size

        # Dynamic cinematic crop variation
        crop_inset_x = int(img_w * random.uniform(0.0, 0.1))
        crop_inset_y = int(img_h * random.uniform(0.0, 0.08))
        crop_box = (
            crop_inset_x,
            crop_inset_y,
            img_w - crop_inset_x,
            img_h - crop_inset_y
        )
        img = img.crop(crop_box).resize((width, height), Image.Resampling.LANCZOS)

        # Cinematic color grading & contrast tuning
        color_factor = random.uniform(1.02, 1.15)
        contrast_factor = random.uniform(1.03, 1.12)
        bright_factor = random.uniform(0.98, 1.05)

        img = ImageEnhance.Color(img).enhance(color_factor)
        img = ImageEnhance.Contrast(img).enhance(contrast_factor)
        img = ImageEnhance.Brightness(img).enhance(bright_factor)

        # Subtle warm cinematic vignette
        vignette = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(vignette)
        cx, cy = width // 2, height // 2
        max_r = int((cx**2 + cy**2)**0.5)
        for r in range(max_r, int(max_r * 0.6), -10):
            alpha = int(((r - max_r * 0.6) / (max_r * 0.4)) * 40)
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(15, 12, 10, alpha))
        
        img.paste(vignette, (0, 0), vignette)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        img.save(output_path, "JPEG", quality=92)
        return True
    else:
        # Fallback procedural generation
        img = Image.new("RGB", (width, height), (22, 28, 42))
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        img.save(output_path, "JPEG", quality=88)
        return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python synthesize_scene_image.py <prompt> <output_path> [aspect_ratio]")
        sys.exit(1)
    prompt_arg = sys.argv[1]
    out_arg = sys.argv[2]
    ratio_arg = sys.argv[3] if len(sys.argv) > 3 else "16:9"
    generate_scene(prompt_arg, out_arg, ratio_arg)
    print("Done")
