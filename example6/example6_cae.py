#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
example6_cae

CAE orchestrator that follows the stack:
- Geometry: Gmsh OCC (via core.gmsh_meshing)
- Meshing: Gmsh
- Compute: FEniCS (with graceful fallback already in core.fenics_solver)
- Post-processing: PyVista (optional if available)

This module provides a small, stable API to run a CAE case end-to-end and to
validate the local environment. It does not attempt to deeply couple the Gmsh
mesh into FEniCS yet; instead, it ensures we can generate the geometry/mesh
artifacts with Gmsh and run the numerical solution using the existing FEniCS
solver pipeline. This keeps things robust across environments.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, Optional
import json
import time
import sys

# Optional deps checks (don’t crash if missing)
try:
	import gmsh  # noqa: F401
	_HAS_GMSH = True
except Exception:
	_HAS_GMSH = False

try:
	import pyvista as pv  # noqa: F401
	_HAS_PYVISTA = True
except Exception:
	_HAS_PYVISTA = False

# Optional mesh conversion
try:
	import meshio  # type: ignore  # noqa: F401
	_HAS_MESHIO = True
except Exception:
	_HAS_MESHIO = False

try:
	import dolfin  # noqa: F401
	_HAS_FENICS = True
except Exception:
	_HAS_FENICS = False

# Local imports from package
from .core.gmsh_meshing import (
	GMSHMeshGenerator,
	create_default_mesh_parameters,
	create_circular_pier_geometry,
	MeshQuality,
)
from .core.fenics_solver import (
	FEniCSScourSolver,
	NumericalParameters,
)
from .core.empirical_solver import (
	ScourParameters,
	PierShape,
)


@dataclass
class CAECase:
	"""Input parameters for a CAE simulation case."""
	# Geometry/flow basics
	pier_diameter: float = 2.0
	pier_shape: str = "circular"  # circular | rectangular | elliptical
	flow_velocity: float = 1.0
	water_depth: float = 3.0
	approach_angle: float = 0.0
	d50: float = 0.5  # mm
	sediment_density: float = 2650.0
	water_density: float = 1000.0
	gravity: float = 9.81

	# Meshing controls (coarse/medium/fine)
	mesh_quality: str = "medium"  # coarse|medium|fine|ultra_fine

	# Numerical settings (mapped to core NumericalParameters)
	mesh_resolution: float = 0.1
	time_step: float = 0.1
	max_iterations: int = 50
	convergence_tolerance: float = 1e-5

	# Output directory
	output_dir: str = "outputs"


def _to_pier_shape(shape: str) -> PierShape:
	s = (shape or "").lower()
	if s == "rectangular":
		return PierShape.RECTANGULAR
	if s == "elliptical":
		return PierShape.ELLIPTICAL
	if s == "complex":
		return PierShape.COMPLEX
	return PierShape.CIRCULAR


def _to_quality(val: str) -> MeshQuality:
	s = (val or "").lower()
	return {
		"coarse": MeshQuality.COARSE,
		"fine": MeshQuality.FINE,
		"ultra_fine": MeshQuality.ULTRA_FINE,
	}.get(s, MeshQuality.MEDIUM)


class CAEOrchestrator:
	"""High-level runner that wires Gmsh + FEniCS + PyVista together."""

	def __init__(self, base_dir: Optional[Path] = None):
		self.base_dir = Path(base_dir) if base_dir else Path(__file__).parent
		self.outputs = self.base_dir / "outputs"
		self.outputs.mkdir(parents=True, exist_ok=True)

	def validate_setup(self) -> Dict[str, Any]:
		"""Return a quick environment readiness report."""
		# Probe FEniCS availability using the core solver flag too
		fenics_flag = False
		try:
			solver = FEniCSScourSolver()
			fenics_flag = solver.fenics_available
		except Exception:
			fenics_flag = False

		return {
			"gmsh_available": _HAS_GMSH,
			"pyvista_available": _HAS_PYVISTA,
			"meshio_available": _HAS_MESHIO,
			"fenics_available": fenics_flag,
			"notes": [
				"Gmsh is used for OCC geometry + mesh generation.",
				"FEniCS solver in core handles compute with an internal fallback if FEniCS is missing.",
				"PyVista is optional for VTK reading/plots of the Gmsh mesh and summary visuals.",
				"meshio is optional for converting .msh to .xdmf for FEniCS/dolfinx pipelines.",
			],
		}

	def _generate_gmsh_occ_mesh(self, case: CAECase) -> Dict[str, Any]:
		"""Generate geometry/mesh using Gmsh OCC API and export artifacts.

		Returns dict with success flag and paths to mesh files (msh/vtk/xdmf if possible).
		"""
		if not _HAS_GMSH:
			return {"success": False, "warning": "gmsh not available"}

		# Domain extents based on pier diameter and water depth
		D = float(case.pier_diameter)
		L = 20.0 * D
		W = 8.0 * D
		H = max(2.0, float(case.water_depth))  # keep positive height

		pier_radius = 0.5 * D
		pier_height = H

		msh_path = self.outputs / "occ_domain.msh"
		vtk_path = self.outputs / "occ_domain.vtk"
		xdmf_path = self.outputs / "occ_domain.xdmf"

		try:
			# Initialize OCC model
			gmsh.initialize()
			gmsh.option.setNumber("General.Terminal", 0)
			gmsh.model.add("occ_scour")

			# Build domain box centered at origin, z from -2 to H
			dom_tag = gmsh.model.occ.addBox(-L/2.0, -W/2.0, -2.0, L, W, H + 2.0)

			# Build vertical cylinder for pier at origin
			cyl_tag = gmsh.model.occ.addCylinder(0.0, 0.0, -2.0, 0.0, 0.0, pier_height + 2.0, pier_radius)

			# Subtract pier from domain
			cut_entities, _ = gmsh.model.occ.cut([(3, dom_tag)], [(3, cyl_tag)], removeObject=True, removeTool=True)

			# Sync CAD with mesh module
			gmsh.model.occ.synchronize()

			# Mesh settings: size near pier smaller
			try:
				# Set element size fields
				# Background mesh size field: min of two fields
				gmsh.model.mesh.field.add("Ball", 1)
				gmsh.model.mesh.field.setNumber(1, "Radius", 3.0 * D)
				gmsh.model.mesh.field.setNumber(1, "VIn", max(0.05 * D, 0.02))
				gmsh.model.mesh.field.setNumber(1, "VOut", max(0.5 * D, 0.2))
				gmsh.model.mesh.field.setNumber(1, "XCenter", 0.0)
				gmsh.model.mesh.field.setNumber(1, "YCenter", 0.0)
				gmsh.model.mesh.field.setNumber(1, "ZCenter", 0.0)

				gmsh.model.mesh.field.add("Min", 2)
				gmsh.model.mesh.field.setNumbers(2, "FieldsList", [1])
				gmsh.model.mesh.field.setAsBackgroundMesh(2)
			except Exception:
				pass

			# Generate 3D mesh
			gmsh.model.mesh.generate(3)

			# Export mesh
			gmsh.write(str(msh_path))
			gmsh.write(str(vtk_path))

		except Exception as e:
			try:
				gmsh.finalize()
			except Exception:
				pass
			return {"success": False, "error": f"occ mesh failed: {e}"}
		finally:
			try:
				gmsh.finalize()
			except Exception:
				pass

		# Optional conversion to XDMF via meshio
		xdmf_written = False
		if _HAS_MESHIO:
			try:
				import meshio  # type: ignore
				msh = meshio.read(str(msh_path))
				meshio.write(str(xdmf_path), msh)
				xdmf_written = True
			except Exception:
				xdmf_written = False

		return {
			"success": True,
			"mesh_msh": str(msh_path),
			"mesh_vtk": str(vtk_path),
			"mesh_xdmf": str(xdmf_path) if xdmf_written else None,
		}

	def _generate_gmsh_mesh(self, case: CAECase) -> Dict[str, Any]:
		if not _HAS_GMSH:
			return {
				"success": False,
				"warning": "gmsh not available; skipping geometry/mesh generation",
			}

		# Prefer OCC pipeline; fall back to legacy generator if something goes wrong
		occ_info = self._generate_gmsh_occ_mesh(case)
		if occ_info.get("success"):
			return {
				"success": True,
				"mesh_file": occ_info.get("mesh_vtk") or occ_info.get("mesh_msh"),
				"mesh_files": occ_info,
				"stats": {},
			}

		# Legacy path using high-level generator
		gen = GMSHMeshGenerator()
		geom = create_circular_pier_geometry(diameter=case.pier_diameter, height=case.water_depth)
		params = create_default_mesh_parameters(_to_quality(case.mesh_quality))

		mesh = gen.create_flow_domain_mesh(geom, params)
		mesh_file = self.outputs / "flow_domain.vtk"
		try:
			gen.export_mesh(str(mesh_file), format="vtk")
		except Exception:
			pass

		stats = {}
		try:
			stats = gen.get_mesh_statistics()
		except Exception:
			stats = {}
		finally:
			try:
				gen.cleanup()
			except Exception:
				pass

		return {
			"success": mesh is not None,
			"mesh_file": str(mesh_file) if mesh is not None else None,
			"stats": stats,
		}

	def _run_fenics_compute(self, case: CAECase) -> Dict[str, Any]:
		# Build core parameter objects
		sparams = ScourParameters(
			pier_diameter=case.pier_diameter,
			pier_shape=_to_pier_shape(case.pier_shape),
			flow_velocity=case.flow_velocity,
			water_depth=case.water_depth,
			d50=case.d50,
			approach_angle=case.approach_angle,
			sediment_density=case.sediment_density,
			water_density=case.water_density,
			gravity=case.gravity,
		)
		nparams = NumericalParameters(
			mesh_resolution=case.mesh_resolution,
			time_step=case.time_step,
			max_iterations=case.max_iterations,
			convergence_tolerance=case.convergence_tolerance,
		)

		solver = FEniCSScourSolver()
		start = time.time()
		try:
			result = solver.solve(sparams, nparams)
		except Exception as e:
			return {
				"success": False,
				"error": str(e),
				"fenics_available": solver.fenics_available,
			}
		dur = time.time() - start

		# Persist a small JSON summary
		summary = {
			"method": result.method,
			"scour_depth": result.scour_depth,
			"scour_width": result.scour_width,
			"scour_volume": result.scour_volume,
			"max_velocity": result.max_velocity,
			"max_shear_stress": result.max_shear_stress,
			"reynolds_number": result.reynolds_number,
			"froude_number": result.froude_number,
			"equilibrium_time": result.equilibrium_time,
			"computation_time": result.computation_time,
			"solver_runtime": dur,
			"warnings": result.warnings,
			"fenics_available": solver.fenics_available,
		}
		out_json = self.outputs / "fenics_result_summary.json"
		try:
			with open(out_json, "w", encoding="utf-8") as f:
				json.dump(summary, f, ensure_ascii=False, indent=2)
		except Exception:
			pass

		return {"success": True, "result": summary, "result_file": str(out_json)}

	def simulate(self, case: CAECase | Dict[str, Any]) -> Dict[str, Any]:
		"""
		Run a CAE case end-to-end. Returns a dict with artifacts and metrics.

		Contract:
		- input: CAECase or mapping with fields matching CAECase
		- output: {
			success: bool,
			artifacts: { mesh_file?, result_file? },
			mesh: { stats? },
			compute: { method, scour_depth, ... } on success
		  }
		"""
		if not isinstance(case, CAECase):
			case = CAECase(**case)

		artifacts: Dict[str, Any] = {}
		mesh_info: Dict[str, Any] = {}

		# 1) Geometry + meshing via Gmsh
		gmsh_info = self._generate_gmsh_mesh(case)
		if gmsh_info.get("success"):
			artifacts["mesh_file"] = gmsh_info.get("mesh_file")
			mesh_info = {"stats": gmsh_info.get("stats", {})}
		else:
			mesh_info = {"warning": gmsh_info.get("warning")}

		# 2) Compute via FEniCS (with internal fallback)
		comp_info = self._run_fenics_compute(case)
		if comp_info.get("success"):
			artifacts["result_file"] = comp_info.get("result_file")
			compute = comp_info.get("result", {})
		else:
			compute = {"error": comp_info.get("error"), "fenics_available": comp_info.get("fenics_available")}

		# 3) Optional quick visualization (PyVista)
		preview_file = None
		if _HAS_PYVISTA and artifacts.get("mesh_file"):
			try:
				import pyvista as pv  # local import to avoid hard dep upfront
				plotter = pv.Plotter(off_screen=True)
				grid = pv.read(artifacts["mesh_file"])  # type: ignore[arg-type]
				plotter.add_mesh(grid, color="#7aa6ff", opacity=0.5)
				plotter.add_axes()
				plotter.set_background("white")
				preview_file = str(self.outputs / "mesh_preview.png")
				plotter.show(screenshot=preview_file)
			except Exception:
				preview_file = None

		if preview_file:
			artifacts["mesh_preview"] = preview_file

		return {
			"success": True,
			"artifacts": artifacts,
			"mesh": mesh_info,
			"compute": compute,
			"inputs": asdict(case),
		}


# Convenience run helpers
def run_quick_demo() -> Dict[str, Any]:
	orchestrator = CAEOrchestrator()
	case = CAECase(pier_diameter=2.0, flow_velocity=1.2, water_depth=4.0, d50=0.6)
	return orchestrator.simulate(case)


if __name__ == "__main__":
	# Allow quick manual run: python example6_cae.py [optional_json_case]
	payload: Dict[str, Any] = {}
	if len(sys.argv) > 1:
		try:
			file_content = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
			# If file contains a list of cases, use the first one
			if isinstance(file_content, list) and len(file_content) > 0:
				payload = file_content[0]
			else:
				payload = file_content
		except Exception:
			payload = {}

	orch = CAEOrchestrator()
	if not payload:
		print(json.dumps(orch.validate_setup(), ensure_ascii=False, indent=2))
		res = run_quick_demo()
	else:
		res = orch.simulate(payload)
	print(json.dumps(res, ensure_ascii=False, indent=2))

