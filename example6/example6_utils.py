#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Utility helpers for example6
"""

from __future__ import annotations
from typing import Any


def format_result(result: Any) -> str:
    try:
        depth = float(getattr(result, "scour_depth"))
    except Exception:
        depth = None
    try:
        width = float(getattr(result, "scour_width"))
    except Exception:
        width = None
    method = getattr(result, "method", "")
    if depth is None and width is None:
        return "(no result)"
    parts = []
    if depth is not None:
        parts.append(f"冲刷深度: {depth:.3f} m")
    if width is not None:
        parts.append(f"冲刷宽度: {width:.3f} m")
    if method:
        parts.append(f"方法: {method}")
    return " | ".join(parts)


def select_ui_main(ui: str = "beautiful"):
    """Return the main() callable of the target UI module."""
    if ui == "professional":
        from .professional_main import main as ui_main  # lazy import
    else:
        from .beautiful_main import main as ui_main  # lazy import
    return ui_main
