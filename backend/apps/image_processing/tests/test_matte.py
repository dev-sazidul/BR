import numpy as np
from django.test import SimpleTestCase

from apps.image_processing.services.matte import refine_matte


class MatteRefineTests(SimpleTestCase):
    def test_green_spill_on_a_soft_edge_is_removed(self):
        rgb = np.zeros((40, 40, 3), dtype=np.float32)
        alpha = np.zeros((40, 40), dtype=np.float32)
        rgb[:] = (40, 180, 60)
        rgb[12:28, 12:28] = (200, 40, 40)
        alpha[12:28, 12:28] = 1
        # The mask spills three pixels into the green background.
        alpha[9:12, 12:28] = 0.55
        alpha[28:31, 12:28] = 0.55
        alpha[12:28, 9:12] = 0.55
        alpha[12:28, 28:31] = 0.55

        cleaned, next_alpha = refine_matte(rgb, alpha)
        spill = next_alpha[9:12, 12:28]
        self.assertLess(float(spill.mean()), 0.08)
        interior = cleaned[16:24, 16:24]
        self.assertGreater(float(interior[:, :, 0].mean()), 180)
        self.assertLess(float(interior[:, :, 1].mean()), 60)

    def test_dark_hair_against_a_bright_background_is_kept(self):
        rgb = np.zeros((48, 48, 3), dtype=np.float32)
        alpha = np.zeros((48, 48), dtype=np.float32)
        rgb[:] = (250, 220, 40)
        rgb[:, 24] = (12, 10, 8)
        alpha[:, 24] = 0.42
        alpha[:, 23] = 0.5
        rgb[:, 23] = (250, 220, 40)

        cleaned, next_alpha = refine_matte(rgb, alpha)
        self.assertGreater(float(next_alpha[:, 24].mean()), 0.3)
        self.assertLess(float(cleaned[:, 24, 0].mean()), 40)
        self.assertLess(float(next_alpha[:, 23].mean()), 0.08)

    def test_opaque_subject_color_is_not_recolored(self):
        rgb = np.zeros((32, 32, 3), dtype=np.float32)
        alpha = np.zeros((32, 32), dtype=np.float32)
        rgb[:] = (0, 160, 220)
        rgb[8:24, 8:24] = (210, 170, 140)
        alpha[8:24, 8:24] = 1

        cleaned, next_alpha = refine_matte(rgb, alpha)
        expected = np.full((8, 8, 3), (210, 170, 140), dtype=np.float32)
        np.testing.assert_allclose(cleaned[12:20, 12:20], expected, atol=1)
        self.assertGreater(float(next_alpha[12:20, 12:20].mean()), 0.99)

    def test_a_full_frame_subject_is_left_unchanged(self):
        rgb = np.full((16, 16, 3), 80, dtype=np.float32)
        alpha = np.ones((16, 16), dtype=np.float32)
        cleaned, next_alpha = refine_matte(rgb, alpha)
        np.testing.assert_array_equal(cleaned, rgb)
        np.testing.assert_array_equal(next_alpha, alpha)
