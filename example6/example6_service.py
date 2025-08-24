#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
example6_service

Thin service layer exposing convenient methods for API/CLI/GUI usage:
- quick_solve: empirical/numerical/hybrid via core.solver_manager
- cae_validate: environment readiness for CAE stack
- cae_simulate: end-to-end CAE run using example6_cae orchestrator
"""

from __future__ import annotations

from dataclasses import asdict
from typing import Any, Dict, Optional

from .core.solver_manager import SolverManager, SolverConfiguration, SolverType
from .core.empirical_solver import ScourParameters, PierShape
from .core.fenics_solver import NumericalParameters

from .example6_cae import CAEOrchestrator, CAECase

# Try to import advanced CAE capabilities
try:
    from .example6_cae_advanced import CAESolver as AdvancedCAESolver, CAEConfig, validate_environment
    _HAS_ADVANCED_CAE = True
except ImportError:
    _HAS_ADVANCED_CAE = False


def _to_pier_shape(shape: str) -> PierShape:
	s = (shape or "").lower()
	if s == "rectangular":
		return PierShape.RECTANGULAR
	if s == "elliptical":
		return PierShape.ELLIPTICAL
	if s == "complex":
		return PierShape.COMPLEX
	return PierShape.CIRCULAR


class Example6Service:
	def __init__(self, config: Optional[SolverConfiguration] = None):
		self.manager = SolverManager(config)
		self.cae = CAEOrchestrator()

	# Empirical/Numerical entry
	def quick_solve(self, data: Dict[str, Any], solver: str = "auto") -> Dict[str, Any]:
		params = ScourParameters(
			pier_diameter=float(data.get("pier_diameter", 2.0)),
			pier_shape=_to_pier_shape(str(data.get("pier_shape", "circular"))),
			flow_velocity=float(data.get("flow_velocity", 1.0)),
			water_depth=float(data.get("water_depth", 3.0)),
			d50=float(data.get("d50", 0.5)),
			approach_angle=float(data.get("approach_angle", 0.0)),
			sediment_density=float(data.get("sediment_density", 2650.0)),
			water_density=float(data.get("water_density", 1000.0)),
			gravity=float(data.get("gravity", 9.81)),
		)
		nparams = NumericalParameters()

		stype = {
			"empirical": SolverType.EMPIRICAL,
			"numerical": SolverType.NUMERICAL,
			"hybrid": SolverType.HYBRID,
			"auto": SolverType.AUTO,
		}.get(str(solver).lower(), SolverType.AUTO)

		result = self.manager.solve(params, nparams, solver_type=stype)
		# Normalize to dict for easy JSON serialization
		if hasattr(result, "__dict__"):
			out = dict(result.__dict__)
			# Convert Enums to str if present
			for k, v in list(out.items()):
				if hasattr(v, "value"):
					out[k] = v.value
			return out
		return result  # ComparisonResult is already dict-like in manager

	# CAE API
	def cae_validate(self) -> Dict[str, Any]:
		"""Validate CAE setup with both basic and advanced capabilities."""
		basic_info = self.cae.validate_setup()
		
		if _HAS_ADVANCED_CAE:
			try:
				advanced_info = validate_environment()
				return {
					"basic_cae": basic_info,
					"advanced_cae": advanced_info,
					"recommended": "advanced" if advanced_info["status"]["full_cae_available"] else "basic"
				}
			except Exception as e:
				return {
					"basic_cae": basic_info,
					"advanced_cae": {"error": str(e)},
					"recommended": "basic"
				}
		else:
			return {
				"basic_cae": basic_info,
				"advanced_cae": {"available": False},
				"recommended": "basic"
			}

	def cae_simulate(self, case: Dict[str, Any]) -> Dict[str, Any]:
		"""Run CAE simulation using advanced stack if available, fallback to basic."""
		# Try advanced CAE first if available
		if _HAS_ADVANCED_CAE and case.get("use_advanced", True):
			try:
				config = CAEConfig(
					mesh_resolution=case.get("mesh_resolution", "medium"),
					time_stepping=case.get("time_stepping", False),
					use_gmsh=case.get("use_gmsh", True),
					use_fenics=case.get("use_fenics", True),
					use_pyvista=case.get("use_pyvista", True)
				)
				solver = AdvancedCAESolver(config)
				result = solver.solve(case)
				result["cae_backend"] = "advanced"
				return result
			except Exception as e:
				# Fall back to basic CAE
				# Filter out advanced-only parameters for basic CAE
				basic_case = {k: v for k, v in case.items() 
							  if k not in ['use_advanced', 'use_gmsh', 'use_fenics', 'use_pyvista']}
				basic_result = self.cae.simulate(CAECase(**basic_case))
				basic_result["cae_backend"] = "basic"
				basic_result["advanced_fallback_reason"] = str(e)
				return basic_result
		else:
			# Use basic CAE
			# Filter out advanced-only parameters for basic CAE
			basic_case = {k: v for k, v in case.items() 
						  if k not in ['use_advanced', 'use_gmsh', 'use_fenics', 'use_pyvista']}
			basic_result = self.cae.simulate(CAECase(**basic_case))
			basic_result["cae_backend"] = "basic"
			return basic_result

