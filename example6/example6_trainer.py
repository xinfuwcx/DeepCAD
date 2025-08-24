#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Trainer/runner for example6

Provides a structured run loop for performing a computation and reporting progress.
"""

from __future__ import annotations
from typing import Callable, Optional

from .example6_model import Example6Model
from .core.empirical_solver import ScourParameters
from .core.fenics_solver import NumericalParameters
from .core.solver_manager import SolverType


ProgressCb = Callable[[int, str], None]


class Example6Trainer:
    def __init__(self, model: Example6Model):
        self.model = model

    def run_once(
        self,
        params: ScourParameters,
        *,
        numerical_params: Optional[NumericalParameters] = None,
        solver_type: Optional[SolverType] = None,
        on_progress: Optional[ProgressCb] = None,
    ):
        if on_progress:
            on_progress(10, "准备参数")
        if on_progress:
            on_progress(35, "执行求解")
        result = self.model.solve(params, numerical_params=numerical_params, solver_type=solver_type)
        if on_progress:
            on_progress(100, "完成")
        return result
