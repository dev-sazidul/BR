import dataclasses
import io
import time

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

import background_remover as br


@pytest.fixture(autouse=True)
def test_settings(monkeypatch):
    base = dataclasses.replace(
        br.settings,
        max_upload_bytes=10 * 1024 * 1024,
        max_dimension_px=4096,
        max_image_pixels=16_000_000,
        timeout_seconds=5,
        token="",
        preload=False,
    )
    monkeypatch.setattr(br, "settings", base)
    return base


def use_settings(monkeypatch, **changes):
    monkeypatch.setattr(br, "settings", dataclasses.replace(br.settings, **changes))


@pytest.fixture
def client():
    return TestClient(br.app)


@pytest.fixture
def fake_model(monkeypatch):
    """Skip ONNX: an opaque square in the middle, transparent elsewhere."""

    def predict(image):
        mask = Image.new("L", image.size, 0)
        margin = max(1, image.width // 4)
        ImageDraw.Draw(mask).rectangle(
            (margin, margin, image.width - margin - 1, image.height - margin - 1), fill=255
        )
        return mask

    monkeypatch.setattr(br, "predict_mask", predict)
    monkeypatch.setattr(
        br,
        "model_status",
        lambda: {"model": "test", "available": True, "model_cached": True, "detail": "ok"},
    )


def image_bytes(fmt="PNG", size=(32, 32), color=(10, 120, 200, 255)) -> bytes:
    mode = "RGB" if fmt == "JPEG" else "RGBA"
    buffer = io.BytesIO()
    Image.new(mode, size, color[:3] if mode == "RGB" else color).save(buffer, format=fmt)
    return buffer.getvalue()


def post(client, data: bytes, **headers):
    return client.post(
        "/remove", content=data, headers={"content-type": "application/octet-stream", **headers}
    )


# ------------------------------------------------------------------------------ matte


def test_green_spill_on_a_soft_edge_is_removed():
    rgb = np.zeros((40, 40, 3), dtype=np.float32)
    alpha = np.zeros((40, 40), dtype=np.float32)
    rgb[:] = (40, 180, 60)
    rgb[12:28, 12:28] = (200, 40, 40)
    alpha[12:28, 12:28] = 1
    alpha[9:12, 12:28] = 0.55
    alpha[28:31, 12:28] = 0.55
    alpha[12:28, 9:12] = 0.55
    alpha[12:28, 28:31] = 0.55

    cleaned, next_alpha = br.refine_matte(rgb, alpha)
    assert float(next_alpha[9:12, 12:28].mean()) < 0.08
    interior = cleaned[16:24, 16:24]
    assert float(interior[:, :, 0].mean()) > 180
    assert float(interior[:, :, 1].mean()) < 60


def test_dark_hair_against_a_bright_background_is_kept():
    rgb = np.zeros((48, 48, 3), dtype=np.float32)
    alpha = np.zeros((48, 48), dtype=np.float32)
    rgb[:] = (250, 220, 40)
    rgb[:, 24] = (12, 10, 8)
    alpha[:, 24] = 0.42
    alpha[:, 23] = 0.5

    cleaned, next_alpha = br.refine_matte(rgb, alpha)
    assert float(next_alpha[:, 24].mean()) > 0.3
    assert float(cleaned[:, 24, 0].mean()) < 40
    assert float(next_alpha[:, 23].mean()) < 0.08


def test_opaque_subject_color_is_not_recolored():
    rgb = np.zeros((32, 32, 3), dtype=np.float32)
    alpha = np.zeros((32, 32), dtype=np.float32)
    rgb[:] = (0, 160, 220)
    rgb[8:24, 8:24] = (210, 170, 140)
    alpha[8:24, 8:24] = 1

    cleaned, next_alpha = br.refine_matte(rgb, alpha)
    expected = np.full((8, 8, 3), (210, 170, 140), dtype=np.float32)
    np.testing.assert_allclose(cleaned[12:20, 12:20], expected, atol=1)
    assert float(next_alpha[12:20, 12:20].mean()) > 0.99


def test_a_full_frame_subject_is_left_unchanged():
    rgb = np.full((16, 16, 3), 80, dtype=np.float32)
    alpha = np.ones((16, 16), dtype=np.float32)
    cleaned, next_alpha = br.refine_matte(rgb, alpha)
    np.testing.assert_array_equal(cleaned, rgb)
    np.testing.assert_array_equal(next_alpha, alpha)


# ------------------------------------------------------------------------- validation


def test_decompression_bomb_is_rejected(monkeypatch):
    def bomb(*_args, **_kwargs):
        raise Image.DecompressionBombError("too many pixels")

    monkeypatch.setattr(br.Image, "open", bomb)
    with pytest.raises(br.RemoverError) as caught:
        br.open_upload(b"\x89PNG\r\n\x1a\nnot-real")
    assert caught.value.code == "dimensions_too_large"


def test_animated_webp_is_rejected():
    frames = [
        Image.new("RGBA", (8, 8), (255, 0, 0, 255)),
        Image.new("RGBA", (8, 8), (0, 0, 255, 255)),
    ]
    buffer = io.BytesIO()
    frames[0].save(
        buffer, format="WEBP", save_all=True, append_images=frames[1:], duration=100, loop=0
    )
    with pytest.raises(br.RemoverError) as caught:
        br.open_upload(buffer.getvalue())
    assert caught.value.code == "unsupported_format"


@pytest.mark.parametrize(
    ("data", "status", "code"),
    [
        (b"hello", 400, "invalid_image"),
        (b"", 400, "empty_file"),
    ],
)
def test_bad_bytes_are_rejected(client, fake_model, data, status, code):
    response = post(client, data)
    assert response.status_code == status
    assert response.json()["error"]["code"] == code


def test_gif_is_rejected(client, fake_model):
    response = post(client, image_bytes(fmt="GIF"))
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "unsupported_format"


def test_oversized_file_is_rejected(client, fake_model, monkeypatch):
    use_settings(monkeypatch, max_upload_bytes=100)
    response = post(client, image_bytes())
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "file_too_large"


def test_large_dimensions_are_rejected(client, fake_model, monkeypatch):
    use_settings(monkeypatch, max_dimension_px=8)
    response = post(client, image_bytes(size=(16, 16)))
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "dimensions_too_large"


def test_too_many_pixels_are_rejected(client, fake_model, monkeypatch):
    use_settings(monkeypatch, max_image_pixels=10)
    response = post(client, image_bytes(size=(8, 8)))
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "dimensions_too_large"


# ------------------------------------------------------------------------------- API


def test_successful_png_is_transparent(client, fake_model):
    response = post(client, image_bytes())
    assert response.status_code == 200, response.content[:200]
    assert response.headers["content-type"] == "image/png"
    assert response.headers["x-image-width"] == "32"
    assert response.headers["x-image-height"] == "32"
    with Image.open(io.BytesIO(response.content)) as result:
        assert result.mode == "RGBA"
        assert result.getpixel((0, 0))[3] == 0
        assert result.getpixel((16, 16))[3] == 255


@pytest.mark.parametrize("fmt", ["JPEG", "WEBP"])
def test_jpeg_and_webp_are_accepted(client, fake_model, fmt):
    assert post(client, image_bytes(fmt=fmt)).status_code == 200


def test_unavailable_model_does_not_return_an_image(client, monkeypatch):
    monkeypatch.setattr(
        br,
        "model_status",
        lambda: {
            "model": "x",
            "available": False,
            "model_cached": False,
            "detail": "Model missing.",
        },
    )
    response = post(client, image_bytes())
    assert response.status_code == 503
    assert response.json()["error"] == {
        "code": "ai_unavailable",
        "message": "Model missing.",
        "details": {},
    }


def test_inference_failure_is_a_service_error(client, fake_model, monkeypatch):
    def broken(_image):
        raise RuntimeError("onnx exploded")

    monkeypatch.setattr(br, "predict_mask", broken)
    response = post(client, image_bytes())
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "ai_unavailable"


def test_timeout_returns_504(client, fake_model, monkeypatch):
    use_settings(monkeypatch, timeout_seconds=1)
    slow_mask = br.predict_mask

    def slow(image):
        time.sleep(2)
        return slow_mask(image)

    monkeypatch.setattr(br, "predict_mask", slow)
    response = post(client, image_bytes())
    assert response.status_code == 504
    assert response.json()["error"]["code"] == "timeout"


def test_token_is_required_when_configured(client, fake_model, monkeypatch):
    use_settings(monkeypatch, token="shared-secret")
    assert post(client, image_bytes()).status_code == 401
    assert post(client, image_bytes(), **{"x-remover-token": "wrong"}).status_code == 401
    assert post(client, image_bytes(), **{"x-remover-token": "shared-secret"}).status_code == 200


def test_health_is_honest_about_the_model(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] in {"ok", "degraded"}
    assert isinstance(body["available"], bool)
    assert isinstance(body["model_cached"], bool)
    assert body["detail"]


def test_missing_model_cache_is_false(monkeypatch, tmp_path):
    monkeypatch.setenv("U2NET_HOME", str(tmp_path / "empty"))
    assert br.model_is_cached("u2net") is False


def test_real_model_returns_a_transparent_png():
    if not br.model_status()["available"]:
        pytest.skip("onnxruntime is not installed.")
    if not br.model_is_cached(br.settings.model):
        pytest.skip("ONNX weights are not downloaded. Run: python background_remover.py download")
    source = Image.new("RGB", (64, 64), (0, 180, 0))
    ImageDraw.Draw(source).ellipse((8, 8, 56, 56), fill=(220, 30, 30))
    buffer = io.BytesIO()
    source.save(buffer, format="PNG")
    png, width, height = br.process_image(buffer.getvalue())
    with Image.open(io.BytesIO(png)) as result:
        assert (width, height) == (64, 64)
        assert result.mode == "RGBA"
        assert result.getpixel((0, 0))[3] < 40
        assert result.getpixel((32, 32))[3] > 200
