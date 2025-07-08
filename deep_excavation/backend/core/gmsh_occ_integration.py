"""
Gmsh-OpenCASCADE (OCC) Integration Module
This module is responsible for taking geological surfaces (as meshes) and
using Gmsh's OCC kernel to build watertight volumes suitable for FEM analysis.
"""
import logging
import os
import tempfile
from typing import List, Dict, Any
import pyvista as pv
import gmsh
import numpy as np
from scipy.interpolate import griddata

logger = logging.getLogger(__name__)


class GmshOCCIntegration:
    """
    Integrates Gmsh's powerful OpenCASCADE kernel to perform robust geometric
    operations, such as boolean fragmentation, to create valid geological volumes
    from a set of intersecting surfaces by approximating them as B-Splines.
    """

    def __init__(
        self,
        surfaces: List[pv.PolyData],
        mesh_size: float = 10.0,
        grid_resolution: int = 50,
    ):
        """
        Initializes the integration class with the surfaces to be processed.

        Args:
            surfaces (List[pv.PolyData]): A list of PyVista meshes, where each
                                          mesh represents a geological surface.
            mesh_size (float): The target characteristic mesh size.
            grid_resolution (int): The resolution (N x N) for the interpolation
                                   grid to create B-Spline surfaces.
        """
        self.surfaces = surfaces
        self.mesh_size = mesh_size
        self.grid_resolution = grid_resolution
        self.model = None  # Will be set during run

    def create_geological_volumes_and_mesh(self) -> Dict[str, Any]:
        """
        High-level method to perform the full workflow:
        1. Initializes Gmsh.
        2. Creates native OCC B-Spline surfaces by interpolating input meshes.
        3. Creates a bounding box.
        4. Fragments surfaces with the box to create volumes.
        5. Identifies and tags volumes.
        6. Generates a 3D mesh.
        7. Extracts the mesh to PyVista.
        8. Finalizes Gmsh.
        """
        try:
            gmsh.initialize()
            gmsh.option.setNumber("General.Terminal", 1)
            self.model = gmsh.model
            self.model.add("GeologicalModel")

            logger.info("Creating B-Spline surfaces from PyVista meshes.")
            surface_tags = self._create_bspline_surfaces()
            if not surface_tags:
                raise RuntimeError("Failed to create any B-Spline surfaces.")

            bounding_box_tag = self._create_bounding_box()

            fragmented_tags, _ = self.model.occ.fragment(
                [(3, bounding_box_tag)],
                [(2, tag) for tag in surface_tags]
            )
            self.model.occ.synchronize()

            # The 'fragment' operation can create duplicate entities. Removing them
            # is crucial for creating a conforming mesh.
            self.model.occ.removeAllDuplicates()
            self.model.occ.synchronize()
            logger.info("Removed duplicate entities after fragmentation.")

            volume_tags = self._identify_and_tag_volumes()
            
            self._set_mesh_options()
            self.model.mesh.generate(3)
            logger.info("3D mesh generation completed.")

            # --- Final Step: Save mesh to MDPA and extract for visualization ---
            
            # Save the final mesh to a temporary MDPA file for Kratos
            fd, mdpa_path = tempfile.mkstemp(suffix=".mdpa", text=True)
            os.close(fd)
            gmsh.write(mdpa_path)
            logger.info(f"Successfully wrote Kratos mesh file to: {mdpa_path}")

            final_mesh_for_viz = self._extract_mesh_to_pyvista()

            return {
                "status": "success",
                "message": "Volumes created and meshed successfully.",
                "mesh_file_path": mdpa_path,
                "visualization_mesh": final_mesh_for_viz,
                "stats": {
                    "num_volumes": len(volume_tags),
                    "num_nodes": (
                        final_mesh_for_viz.n_points if final_mesh_for_viz else 0
                    ),
                    "num_elements": (
                        final_mesh_for_viz.n_cells if final_mesh_for_viz else 0
                    ),
                },
            }

        except Exception as e:
            logger.error(
                f"An error occurred during Gmsh processing: {e}", exc_info=True
            )
            return {"status": "error", "message": str(e)}
        finally:
            gmsh.finalize()
            logger.info("Gmsh finalized.")

    def _create_bspline_surfaces(self) -> List[int]:
        """
        Approximates the input PyVista meshes with native Gmsh OCC B-Spline surfaces.
        """
        surface_tags = []
        for i, pv_surface in enumerate(self.surfaces):
            logger.info(f"Processing surface {i}...")
            points = pv_surface.points
            bounds = pv_surface.bounds
            
            # Create a structured grid to interpolate onto
            x_coords = np.linspace(bounds[0], bounds[1], self.grid_resolution)
            y_coords = np.linspace(bounds[2], bounds[3], self.grid_resolution)
            grid_x, grid_y = np.meshgrid(x_coords, y_coords)

            # Interpolate the Z values from the unstructured points
            grid_z = griddata(
                points[:, :2], points[:, 2],
                (grid_x, grid_y), method='cubic'
            )

            # Handle NaNs that may result from interpolation, which can occur for
            # points outside the convex hull of the input data.
            if np.all(np.isnan(grid_z)):
                # If all points are NaN, interpolation failed completely.
                # Fall back to the mean Z of the original, valid surface points.
                logger.warning(
                    f"Cubic interpolation failed for surface {i}. "
                    f"Falling back to mean Z of original points."
                )
                mean_z = np.mean(points[:, 2])
            else:
                mean_z = np.nanmean(grid_z)
            
            grid_z[np.isnan(grid_z)] = mean_z

            # Create the Gmsh points for the B-Spline surface
            point_tags = []
            for row in range(self.grid_resolution):
                for col in range(self.grid_resolution):
                    px, py, pz = grid_x[row, col], grid_y[row, col], grid_z[row, col]
                    point_tags.append(self.model.occ.addPoint(px, py, pz))

            # Create the B-Spline surface
            try:
                spline_tag = self.model.occ.addBSplineSurface(
                    point_tags, numPointsU=self.grid_resolution
                )
                surface_tags.append(spline_tag)
                logger.info(f"Successfully created B-Spline surface with tag {spline_tag}.")
            except Exception as e:
                logger.error(f"Failed to create B-Spline for surface {i}: {e}")

        self.model.occ.synchronize()
        return surface_tags

    def _create_bounding_box(self) -> int:
        """Creates a bounding box encompassing all surfaces."""
        min_bounds = np.array(
            [s.bounds[0::2] for s in self.surfaces]
        ).min(axis=0)
        max_bounds = np.array(
            [s.bounds[1::2] for s in self.surfaces]
        ).max(axis=0)
        padding = (max_bounds - min_bounds) * 0.1
        min_bounds -= padding
        max_bounds += padding

        box_tag = self.model.occ.addBox(
            min_bounds[0], min_bounds[1], min_bounds[2],
            max_bounds[0] - min_bounds[0],
            max_bounds[1] - min_bounds[1],
            max_bounds[2] - min_bounds[2]
        )
        self.model.occ.synchronize()
        logger.info("Created bounding box for fragmentation.")
        return box_tag

    def _identify_and_tag_volumes(self) -> Dict[str, int]:
        """
        Identifies volumes by their center of mass and assigns sorted
        physical groups.
        """
        volume_tags_map = {}
        processed_volumes = self.model.getEntities(3)
        if not processed_volumes:
            logger.warning("No volumes found after fragmentation.")
            return {}

        # Sort volumes by the Z-coordinate of their center of mass (top to bottom)
        volume_coms = []
        for dim, tag in processed_volumes:
            try:
                com = self.model.occ.getCenterOfMass(dim, tag)
                volume_coms.append((tag, com))
            except Exception as e:
                logger.warning(f"Could not get CoM for volume {tag}: {e}")
        
        # Sort by Z-coordinate, descending (top first)
        volume_coms.sort(key=lambda x: x[1][2], reverse=True)

        for i, (tag, com) in enumerate(volume_coms):
            physical_tag = i + 1  # Start tagging from 1
            self.model.addPhysicalGroup(3, [tag], physical_tag)
            volume_name = f"GeologicalVolume_{physical_tag}"
            self.model.setPhysicalName(3, physical_tag, volume_name)
            volume_tags_map[volume_name] = tag
            logger.info(
                "Tagged volume %d at CoM %s as Physical Group %d (%s)",
                tag, np.round(com, 2), physical_tag, volume_name
            )

        self.model.occ.synchronize()
        return volume_tags_map

    def _set_mesh_options(self):
        """Sets global and local mesh size options."""
        gmsh.option.setNumber("Mesh.MeshSizeMin", self.mesh_size * 0.5)
        gmsh.option.setNumber("Mesh.MeshSizeMax", self.mesh_size * 1.5)
        gmsh.option.setNumber("Mesh.MeshSizeFromPoints", 0)
        gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 0)
        gmsh.option.setNumber("Mesh.Algorithm", 5)  # Delaunay
        gmsh.option.setNumber("Mesh.Optimize", 1)
        gmsh.option.setNumber("Mesh.OptimizeNetgen", 1)

    def _extract_mesh_to_pyvista(self) -> pv.UnstructuredGrid:
        """
        Extracts the generated mesh from Gmsh and converts it to a
        PyVista UnstructuredGrid, including physical group information.
        """
        node_tags, node_coords, _ = self.model.mesh.getNodes()
        
        if not node_tags.size:
            logger.warning("No nodes found in the Gmsh model.")
            return None

        points = node_coords.reshape(-1, 3)

        # Map Gmsh node tags to zero-based indices
        node_map = {tag: i for i, tag in enumerate(node_tags)}

        all_cells = []
        all_cell_types = []
        cell_data = []

        # Get elements by dimension
        for dim in [3]:  # Only interested in 3D elements
            elem_info = self.model.mesh.getElements(dim)
            element_types, element_tags, node_tags_by_type = elem_info
            
            for el_type, el_tags in zip(element_types, node_tags_by_type):
                # Get physical group for each element
                # This returns the physical tag for each element in el_tags
                _, physical_tags = self.model.getPhysicalGroupsForEntity(dim, el_type)
                if not physical_tags.size:
                    logger.warning(
                        f"No physical group for element type {el_type}. Skipping."
                    )
                    continue

                num_nodes_per_element = self.model.mesh.getElementProperties(el_type)[3]
                
                # Reshape node tags to (num_elements, num_nodes_per_element)
                conn = el_tags.reshape(-1, num_nodes_per_element)
                
                # Map gmsh 1-based tags to pyvista 0-based indices
                mapped_conn = np.vectorize(node_map.get)(conn)

                pv_cell_type = self._gmsh_type_to_vtk_type(el_type)
                if pv_cell_type is None:
                    logger.warning(f"Unsupported Gmsh element type {el_type}. Skipping.")
                    continue

                num_elements = len(mapped_conn)
                # Create the cell array for PyVista (n_points, p1, p2, ...)
                pv_cells = np.hstack([
                    np.full((num_elements, 1), num_nodes_per_element, dtype=np.int64),
                    mapped_conn
                ])
                
                all_cells.extend(pv_cells.ravel())
                all_cell_types.extend([pv_cell_type] * num_elements)

                # Each element tag corresponds to a physical group tag
                # We need to find which physical group each element belongs to.
                # This is a bit tricky. Let's find the physical group for the entity.
                
                # A simpler but potentially slow way: iterate elements
                element_physical_tags = []
                for element_tag in el_tags:
                    group_tag = self.model.mesh.getPhysicalGroupsForElement(
                        element_tag
                    )
                    # Assuming one physical group per element
                    phys_tag = group_tag[0] if group_tag.size > 0 else 0
                    element_physical_tags.append(phys_tag)

                cell_data.extend(element_physical_tags)

        if not all_cells:
            logger.warning(
                "No valid elements found to create a PyVista mesh."
            )
            return None

        mesh = pv.UnstructuredGrid(all_cells, np.array(all_cell_types), points)
        if cell_data:
            mesh.cell_data["PhysicalGroup"] = np.array(cell_data)

        return mesh

    @staticmethod
    def _gmsh_type_to_vtk_type(gmsh_type: int) -> int | None:
        """Maps Gmsh element type ID to VTK cell type ID."""
        mapping = {
            1: pv.VTK_LINE,
            2: pv.VTK_TRIANGLE,
            3: pv.VTK_QUAD,
            4: pv.VTK_TETRA,
            5: pv.VTK_HEXAHEDRON,
            6: pv.VTK_WEDGE,
            7: pv.VTK_PYRAMID,
        }
        return mapping.get(gmsh_type)


def create_example_and_run():
    """
    Example usage function for testing.
    Uses two intersecting spheres to test the B-spline meshing workflow.
    """
    logger.info("--- Running Gmsh Integration Example with B-Splines ---")
    
    # Create two intersecting spheres to simulate geological layers
    sphere1 = pv.Sphere(
        radius=10, center=(0, 0, 0), theta_resolution=30, phi_resolution=30
    ).triangulate()
    sphere2 = pv.Sphere(
        radius=8, center=(0, 0, 5), theta_resolution=30, phi_resolution=30
    ).triangulate()

    # Simulate a list of surfaces
    surfaces_to_process = [sphere1, sphere2]

    # Use the integration class
    integrator = GmshOCCIntegration(
        surfaces=surfaces_to_process, mesh_size=2.0, grid_resolution=40
    )
    result = integrator.create_geological_volumes_and_mesh()

    print("\n--- Integration Result ---")
    if result['status'] == 'success' and result.get('mesh'):
        final_pv_mesh = result['mesh']
        print("Mesh created successfully!")
        print(f"Number of cells: {final_pv_mesh.n_cells}")
        print(f"Number of points: {final_pv_mesh.n_points}")
        if "PhysicalGroup" in final_pv_mesh.cell_data:
            groups = np.unique(final_pv_mesh.cell_data['PhysicalGroup'])
            print(f"Physical groups found: {groups}")
        
        # Save the mesh to see the result
        output_path = "geological_model_from_stl.vtk"
        final_pv_mesh.save(output_path, binary=True)
        print(
            f"\nMesh file '{output_path}' saved. "
            "You can open this in ParaView."
        )
    else:
        print("Integration failed.")
        print("Status:", result.get('status'))
        print("Message:", result.get('message'))
    print("--------------------------")


if __name__ == '__main__':
    log_format = '%(asctime)s - %(levelname)s - %(message)s'
    logging.basicConfig(level=logging.INFO, format=log_format)
    # This allows running the script directly for testing purposes.
    create_example_and_run()