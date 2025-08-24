#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Model facade for example6

Wraps SolverManager with simpler methods for UI/trainer usage.
"""

from __future__ import annotations
from typing import Optional, Union

from .example6_config import Example6Config, default_config
from .core.solver_manager import (
    SolverManager,
    SolverConfiguration,
    SolverType,
    ComputationMode,
    ComparisonResult,
)
from .core.empirical_solver import ScourParameters, ScourResult
from .core.fenics_solver import NumericalParameters, NumericalResult


class Example6Model:
    def __init__(self, cfg: Optional[Example6Config] = None):
        cfg = cfg or default_config()
        sm_cfg = SolverConfiguration(
            solver_type=getattr(SolverType, str(cfg.solver.solver_type).upper(), SolverType.AUTO),
            computation_mode=getattr(ComputationMode, str(cfg.solver.computation_mode).upper(), ComputationMode.BALANCED),
            empirical_methods=cfg.solver.empirical_methods,
            use_consensus=cfg.solver.use_consensus,
            numerical_enabled=cfg.solver.numerical_enabled,
            fallback_to_empirical=cfg.solver.fallback_to_empirical,
        )
        self.manager = SolverManager(sm_cfg)

    def solve(
        self,
        params: ScourParameters,
        *,
        numerical_params: Optional[NumericalParameters] = None,
        solver_type: Optional[SolverType] = None,
    ) -> Union[ScourResult, NumericalResult, ComparisonResult]:
        return self.manager.solve(params, numerical_params=numerical_params, solver_type=solver_type)

    def available(self) -> dict:
        return self.manager.get_available_solvers()
