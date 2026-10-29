"""Clean a cutout's edge without a second model.

U²-Net only replaces the alpha channel. Pixels on the soft edge still contain
the old background color, and that color shows up as a halo on a new background.
This estimates the nearby background color, removes it from the edge, and drops
alpha where a pixel is still the old background. Solid interior pixels are left
alone so skin, clothes, and hair color stay put.
"""

from __future__ import annotations

import numpy as np
from PIL import Image


def refine_cutout(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"))
    rgb = rgba[:, :, :3].astype(np.float32)
    alpha = rgba[:, :, 3].astype(np.float32) / 255.0
    cleaned_rgb, cleaned_alpha = refine_matte(rgb, alpha)
    output = np.empty_like(rgba)
    output[:, :, :3] = np.clip(np.rint(cleaned_rgb), 0, 255).astype(np.uint8)
    output[:, :, 3] = np.clip(np.rint(cleaned_alpha * 255.0), 0, 255).astype(np.uint8)
    return Image.fromarray(output, "RGBA")


def refine_matte(rgb: np.ndarray, alpha: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    height, width = alpha.shape
    known = alpha < 0.08
    if float(known.mean()) < 0.01:
        return rgb, alpha

    radius = int(np.clip(round(min(height, width) / 80), 3, 12))
    weight = known.astype(np.float32)
    blurred_weight = _box_blur(weight, radius)
    blurred_color = _box_blur(rgb * weight[:, :, None], radius)
    safe = blurred_weight > 0.02
    background = np.empty_like(rgb)
    background[safe] = blurred_color[safe] / blurred_weight[safe, None]
    background[~safe] = rgb[known].mean(axis=0) if known.any() else rgb.reshape(-1, 3).mean(axis=0)

    distance = np.linalg.norm(rgb - background, axis=2)
    # Only pixels that still match the old background lose alpha. A color 55
    # steps away (blonde hair on a warm wall, a white shirt on gray) is kept.
    similarity = np.clip((48.0 - distance) / 48.0, 0.0, 1.0)
    uncertain = alpha < 0.86
    next_alpha = np.where(uncertain, alpha * (1.0 - similarity), alpha)
    next_alpha = np.where(next_alpha < 2 / 255, 0.0, next_alpha)

    coverage = np.clip(alpha, 0.12, 1.0)[:, :, None]
    foreground = (rgb - background * (1.0 - coverage)) / coverage
    edge = (next_alpha > 0.04) & (alpha < 0.98)
    next_rgb = np.where(edge[:, :, None], np.clip(foreground, 0.0, 255.0), rgb)
    return next_rgb.astype(np.float32), next_alpha.astype(np.float32)


def _box_blur(values: np.ndarray, radius: int) -> np.ndarray:
    blurred = _blur_axis(values, radius, axis=1)
    return _blur_axis(blurred, radius, axis=0)


def _blur_axis(values: np.ndarray, radius: int, axis: int) -> np.ndarray:
    pad = [(0, 0)] * values.ndim
    pad[axis] = (radius, radius)
    padded = np.pad(values, pad, mode="edge")
    cumulative = np.cumsum(padded, axis=axis, dtype=np.float64)
    zero_shape = list(cumulative.shape)
    zero_shape[axis] = 1
    cumulative = np.concatenate([np.zeros(zero_shape, dtype=np.float64), cumulative], axis=axis)
    window = 2 * radius + 1
    end = np.take(cumulative, range(window, cumulative.shape[axis]), axis=axis)
    start = np.take(cumulative, range(0, cumulative.shape[axis] - window), axis=axis)
    return ((end - start) / window).astype(np.float32)
