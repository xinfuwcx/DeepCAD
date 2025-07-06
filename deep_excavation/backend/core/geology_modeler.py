from __future__ import annotations
"""geology_modeler.py

Pipeline:
    Borehole CSV -> GemPy implicit model -> surface STLs -> Gmsh OCC fragment
    -> volume mesh (.msh).

Isolates geological modelling so `mesh_generator` can focus on meshing.
"""

from pathlib import Path
from typing import Dict, Tuple, List

import pandas as pd
import gempy as gp
import gmsh

from .intelligent_cache import (
    compute_geometry_hash,
    compute_mesh_hash,
)


class GeologicalModelBuilder:
    """Build implicit geological model from borehole CSV using GemPy."""

    def __init__(
        self,
        csv_path: str | Path,
        extent: Dict[str, float],
        resolution: Tuple[int, int, int] = (100, 100, 100),
    ) -> None:
        self.points_df = pd.read_csv(csv_path)
        self.model = gp.create_model("deep_excavation_geo")
        self._setup_extent(extent, resolution)
        self._set_surface_points()
        self._interpolate()

    # ---------------------------------------------------------------------
    def _setup_extent(
        self, extent: Dict[str, float], resolution: Tuple[int, int, int]
    ) -> None:
        gp.init_data(
            self.model,
            extent=(
                extent["xmin"],
                extent["xmax"],
                extent["ymin"],
                extent["ymax"],
                extent["zmin"],
                extent["zmax"],
            ),
            resolution=resolution,
            path_i=None,
            path_o=None,
        )

    def _set_surface_points(self) -> None:
        # GemPy expects columns: X, Y, Z, surface
        df = self.points_df.rename(
            columns={
                "x": "X",
                "y": "Y",
                "z": "Z",
                "layer_id": "surface",
            }
        )
        self.model.set_surface_points(df[["X", "Y", "Z", "surface"]])

        # Simple vertical orientations
        o_df = df[["X", "Y", "Z"]].copy()
        o_df["g_x"] = 0
        o_df["g_y"] = 0
        o_df["g_z"] = 1
        o_df["surface"] = df["surface"]
        self.model.set_orientations(o_df)

    def _interpolate(self) -> None:
        gp.set_interpolator(
            self.model,
            compile_theano=False,
            theano_optimizer="fast_compile",
        )
        gp.compute_model(self.model)

    # ------------------------------------------------------------------
    def export_surfaces(self, export_dir: str | Path) -> List[str]:
        export_dir = Path(export_dir)
        export_dir.mkdir(parents=True, exist_ok=True)
        stl_paths: List[str] = []
        for surface_name in self.model.surface_points.df["surface"].unique():
            filepath = export_dir / f"{surface_name}.stl"
            gp.export_surface(self.model, surface=surface_name, filepath=filepath)
            stl_paths.append(str(filepath))
        return stl_paths


# -------------------------------------------------------------------------

def surfaces_to_volume_mesh(
    stl_paths: List[str],
    mesh_size: float,
    output_msh: str | Path,
) -> Tuple[str, str]:
    """Use Gmsh OCC to fragment volumes by surfaces and generate 3D mesh.

    Returns (mesh_path, mesh_hash).
    """
    output_msh = str(output_msh)
    gmsh.initialize()
    gmsh.model.add("geo_model")

    imported_entities = []
    for path in stl_paths:
        imported_tags = gmsh.model.occ.importShapes(str(path))
        imported_entities.extend(imported_tags)
    gmsh.model.occ.synchronize()

    # Fragment the base bounding box by surfaces if needed (simplified).
    if imported_entities:
        gmsh.model.occ.fragment([], imported_entities)
        gmsh.model.occ.synchronize()

    gmsh.option.setNumber("Mesh.MeshSizeMax", mesh_size)
    gmsh.model.mesh.generate(3)
    gmsh.write(output_msh)

    # Compute hashes
    node_tags, coords, _ = gmsh.model.mesh.getNodes()
    vertices = [
        (coords[i], coords[i + 1], coords[i + 2])
        for i in range(0, len(coords), 3)
    ]
    tri_tags, tri_nodes = gmsh.model.mesh.getElementsByType(2)
    faces = [
        (
            tri_nodes[i],
            tri_nodes[i + 1],
            tri_nodes[i + 2],
        )
        for i in range(0, len(tri_nodes), 3)
    ]
    g_hash = compute_geometry_hash(vertices, faces)
    m_hash = compute_mesh_hash(g_hash, {"mesh_size": mesh_size})

    hash_path = Path(output_msh).with_suffix(".hash")
    with open(hash_path, "w", encoding="utf-8") as fh:
        fh.write(m_hash)

    gmsh.finalize()
    return output_msh, m_hash 