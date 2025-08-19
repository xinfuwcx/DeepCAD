"""
Export smoke test for example3: validates VTKJS → HTML → PNG fallback chain without launching the full GUI.

Usage (Windows PowerShell):
  python example3/export_smoke_test.py
  python example3/export_smoke_test.py --out example3/exports/test_scene
"""
from __future__ import annotations
import argparse
import os
from pathlib import Path

import numpy as np
import pyvista as pv


def build_minimal_scene() -> pv.Plotter:
    """Create a tiny PyVista scene that renders in headless or GUI environments.
    Returns a Plotter with a simple mesh added.
    """
    pl = pv.Plotter(off_screen=True)
    pl.set_background(0.95, 0.97, 1.0)

    # Add a simple mesh: a colored sphere and axes
    sphere = pv.Sphere(radius=1.0, center=(0, 0, 0), theta_resolution=24, phi_resolution=24)
    sphere["scalars"] = np.linspace(0, 1, sphere.n_points)
    pl.add_mesh(sphere, scalars="scalars", cmap="viridis", show_edges=False)

    pl.add_axes()
    pl.camera_position = "iso"
    return pl


def try_export_chain(pl: pv.Plotter, out_prefix: Path) -> tuple[bool, str, Path]:
    """Attempt export in order: VTKJS → HTML → PNG.

    Returns (ok, mode, path) where mode in {"VTKJS", "HTML", "PNG"} when ok.
    """
    # 1) VTKJS
    vtkjs = out_prefix.with_suffix(".vtkjs")
    try:
        pl.export_vtkjs(str(vtkjs))
        return True, "VTKJS", vtkjs
    except Exception:
        pass

    # 2) HTML
    html = out_prefix.with_suffix(".html")
    try:
        pl.export_html(str(html))
        return True, "HTML", html
    except Exception:
        pass

    # 3) PNG screenshot (last resort)
    png = out_prefix.with_suffix(".png")
    try:
        pl.screenshot(str(png), window_size=(800, 600))
        return True, "PNG", png
    except Exception as e:
        return False, f"ERROR: {e}", png


def main() -> int:
    parser = argparse.ArgumentParser(description="Export smoke test (VTKJS→HTML→PNG)")
    parser.add_argument("--out", default="example3/exports/test_scene", help="Output prefix without extension")
    args = parser.parse_args()

    out_prefix = Path(args.out)
    out_dir = out_prefix.parent
    out_dir.mkdir(parents=True, exist_ok=True)

    pl = build_minimal_scene()
    ok, mode, path = try_export_chain(pl, out_prefix)

    if ok:
        print(f"SMOKE_OK: {mode} -> {path}")
        return 0
    else:
        print(f"SMOKE_FAIL: {mode}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
