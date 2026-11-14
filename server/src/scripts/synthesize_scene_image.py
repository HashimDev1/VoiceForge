import sys
import os
import random
import math
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageDraw

def create_gradient_scene(prompt: str, output_path: str, aspect_ratio: str = "16:9", style: str = "cinematic"):
    if aspect_ratio == "9:16":
        width, height = 720, 1280
    elif aspect_ratio == "1:1":
        width, height = 1080, 1080
    else:
        width, height = 1280, 720

    # Color palettes per style: [bg_top, bg_bottom, accent, glow]
    palettes = {
        "cyberpunk": [(10, 15, 30), (28, 12, 45), (0, 242, 220), (255, 0, 128)],
        "cinematic": [(14, 20, 26), (36, 28, 22), (245, 175, 95), (20, 180, 190)],
        "dark_mystery": [(8, 9, 12), (18, 22, 28), (140, 150, 170), (50, 60, 80)],
        "anime": [(25, 45, 95), (240, 120, 150), (255, 230, 140), (120, 210, 255)],
        "pixar_3d": [(40, 30, 70), (90, 140, 220), (255, 200, 80), (255, 120, 140)],
        "vintage": [(35, 28, 22), (80, 68, 55), (210, 180, 140), (160, 130, 90)],
        "stock_video": [(18, 26, 36), (32, 48, 64), (19, 226, 202), (90, 170, 250)]
    }

    chosen = palettes.get(style, palettes["cinematic"])
    c1, c2, accent1, accent2 = chosen

    # 1. Base vertical gradient
    base = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(base)

    for y in range(height):
        factor = y / max(1, height - 1)
        # Add slight non-linear ease curve
        eased = factor * factor * (3.0 - 2.0 * factor)
        r = int(c1[0] + (c2[0] - c1[0]) * eased)
        g = int(c1[1] + (c2[1] - c1[1]) * eased)
        b = int(c1[2] + (c2[2] - c1[2]) * eased)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # 2. Add atmospheric lighting spheres (Glow blooms)
    glow_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)

    # Main light bloom
    bx = int(width * random.uniform(0.3, 0.7))
    by = int(height * random.uniform(0.25, 0.55))
    max_radius = int(min(width, height) * 0.7)

    for r in range(max_radius, 10, -20):
        intensity = 1.0 - (r / max_radius)
        alpha = int(intensity * intensity * 55)
        glow_draw.ellipse(
            [bx - r, by - r, bx + r, by + r],
            fill=(accent1[0], accent1[1], accent1[2], alpha)
        )

    # Secondary rim light
    sx = int(width * (0.85 if bx < width / 2 else 0.15))
    sy = int(height * random.uniform(0.6, 0.85))
    s_radius = int(min(width, height) * 0.5)

    for r in range(s_radius, 10, -20):
        intensity = 1.0 - (r / s_radius)
        alpha = int(intensity * intensity * 40)
        glow_draw.ellipse(
            [sx - r, sy - r, sx + r, sy + r],
            fill=(accent2[0], accent2[1], accent2[2], alpha)
        )

    base.paste(Image.alpha_composite(Image.new("RGBA", (width, height), (0, 0, 0, 0)), glow_layer).convert("RGB"), (0, 0), glow_layer)

    # 3. Add subtle particles/stars/dust for realism
    particle_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    p_draw = ImageDraw.Draw(particle_layer)
    for _ in range(80):
        px = random.randint(0, width - 1)
        py = random.randint(0, height - 1)
        pr = random.randint(1, 3)
        pa = random.randint(30, 160)
        p_draw.ellipse([px - pr, py - pr, px + pr, py + pr], fill=(255, 255, 255, pa))

    base.paste(Image.alpha_composite(Image.new("RGBA", (width, height), (0, 0, 0, 0)), particle_layer).convert("RGB"), (0, 0), particle_layer)

    # 4. Cinematic Vignette
    vignette = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    v_draw = ImageDraw.Draw(vignette)
    cx, cy = width // 2, height // 2
    max_d = int(math.hypot(cx, cy))
    inner_d = int(max_d * 0.55)

    for d in range(max_d, inner_d, -15):
        alpha = int(((d - inner_d) / (max_d - inner_d)) * 95)
        v_draw.ellipse([cx - d, cy - d, cx + d, cy + d], fill=(0, 0, 0, alpha))

    base.paste(vignette, (0, 0), vignette)

    # Ensure output directory exists and save
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    base.save(output_path, "JPEG", quality=92)
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python synthesize_scene_image.py <prompt> <output_path> [aspect_ratio] [style]")
        sys.exit(1)
    prompt_arg = sys.argv[1]
    out_arg = sys.argv[2]
    ratio_arg = sys.argv[3] if len(sys.argv) > 3 else "16:9"
    style_arg = sys.argv[4] if len(sys.argv) > 4 else "cinematic"
    create_gradient_scene(prompt_arg, out_arg, ratio_arg, style_arg)
    print("Done")
