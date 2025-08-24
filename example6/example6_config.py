#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Example6 configuration module

Holds UI/app defaults and solver-related settings in one place.
"""

from dataclasses import dataclass, field
from typing import Literal, List

# Core enums are optional at import time (keep loose coupling for CLI use)
try:
    from .core.solver_manager import SolverType, ComputationMode
except Exception:  # pragma: no cover
    # Lightweight fallbacks to avoid hard import dependency at config load
    class SolverType:
        EMPIRICAL = "empirical"  # type: ignore
        NUMERICAL = "numerical"  # type: ignore
        HYBRID = "hybrid"        # type: ignore
        AUTO = "auto"            # type: ignore

    class ComputationMode:
        FAST = "fast"            # type: ignore
        BALANCED = "balanced"    # type: ignore
        ACCURATE = "accurate"    # type: ignore


@dataclass
class UIConfig:
    app_name: str = "DeepCAD-SCOUR"
    version: str = "3.0"
    ui: Literal["beautiful", "professional"] = "beautiful"
    language: str = "zh-CN"


@dataclass
class SolverConfig:
    solver_type: str = getattr(SolverType, "AUTO", "auto")  # AUTO by default
    computation_mode: str = getattr(ComputationMode, "BALANCED", "balanced")
    empirical_methods: List[str] = field(default_factory=lambda: ["HEC-18", "Melville-Coleman"]) 
    use_consensus: bool = True
    numerical_enabled: bool = True
    fallback_to_empirical: bool = True


@dataclass
class Example6Config:
    ui: UIConfig = field(default_factory=UIConfig)
    solver: SolverConfig = field(default_factory=SolverConfig)


def default_config() -> Example6Config:
    """Return a default configuration instance."""
    return Example6Config()
