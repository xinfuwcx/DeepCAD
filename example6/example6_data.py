#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Data utilities for example6

Provides helpers to build ScourParameters from simple dictionaries or presets.
"""

from __future__ import annotations
from typing import Dict, Any

from .core.empirical_solver import ScourParameters, PierShape


SHAPE_NAME_TO_ENUM = {
    "圆形": PierShape.CIRCULAR,
    "矩形": PierShape.RECTANGULAR,
    "椭圆形": PierShape.ELLIPTICAL,
    "复杂形状": getattr(PierShape, "COMPLEX", PierShape.CIRCULAR),
}


def params_from_dict(d: Dict[str, Any]) -> ScourParameters:
    """Create ScourParameters from a loose dict (GUI or API input)."""
    shape = d.get("pier_shape")
    if isinstance(shape, str):
        shape = SHAPE_NAME_TO_ENUM.get(shape, PierShape.CIRCULAR)

    return ScourParameters(
        pier_diameter=float(d.get("pier_diameter", 2.0)),
        pier_shape=shape or PierShape.CIRCULAR,
        flow_velocity=float(d.get("flow_velocity", 1.5)),
        water_depth=float(d.get("water_depth", 4.0)),
        d50=float(d.get("d50", 0.8)),
        approach_angle=float(d.get("approach_angle", 0.0)),
        pier_angle=float(d.get("pier_angle", 0.0)),
    )


def preset(name: str) -> Dict[str, Any]:
    """Return a small set of presets by name."""
    presets = {
        "山区河流": {"pier_diameter": 1.5, "flow_velocity": 2.5, "water_depth": 3.0, "d50": 2.0},
        "平原大河": {"pier_diameter": 3.0, "flow_velocity": 1.2, "water_depth": 8.0, "d50": 0.5},
        "海洋桥梁": {"pier_diameter": 4.0, "flow_velocity": 1.8, "water_depth": 12.0, "d50": 0.3},
        "城市桥梁": {"pier_diameter": 2.0, "flow_velocity": 1.0, "water_depth": 4.0, "d50": 1.0},
    }
    return presets.get(name, presets["城市桥梁"])  # default
