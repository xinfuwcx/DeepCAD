import ezdxf
import numpy as np
import pyvista as pv
from typing import Tuple
import os
import uuid

class ExcavationGenerator:
    """
    Handles the creation of an excavation pit from a DXF file and performs
    a boolean cut on a given soil domain mesh.
    """

    def _load_dxf_contour(self, dxf_path: str) -> np.ndarray:
        """Loads a 2D contour from a DXF file, expecting LWPOLYLINE entities."""
        try:
            doc = ezdxf.readfile(dxf_path)
            msp = doc.modelspace()
            
            lwpolyline = msp.query('LWPOLYLINE').first
            if not lwpolyline:
                raise ValueError("No LWPOLYLINE found in the DXF file.")
            
            points = np.array([(p[0], p[1]) for p in lwpolyline.get_points(format='xy')])
            
            if not lwpolyline.is_closed:
                points = np.vstack([points, points[0]])
                
            return points

        except IOError:
            raise FileNotFoundError(f"DXF file not found at {dxf_path}")
        except Exception as e:
            raise ValueError(f"Failed to parse DXF file: {e}")

    def _calculate_centroid(self, points_2d: np.ndarray) -> np.ndarray:
        """Calculates the centroid of a 2D polygon."""
        x = points_2d[:, 0]
        y = points_2d[:, 1]
        a = np.sum(x[:-1] * y[1:] - x[1:] * y[:-1]) * 0.5
        cx = np.sum((x[:-1] + x[1:]) * (x[:-1] * y[1:] - x[1:] * y[:-1])) / (6 * a)
        cy = np.sum((y[:-1] + y[1:]) * (x[:-1] * y[1:] - x[1:] * y[:-1])) / (6 * a)
        return np.array([cx, cy])

    def create_excavation(
        self,
        dxf_path: str,
        soil_domain_mesh: pv.PolyData,
        excavation_depth: float
    ) -> pv.PolyData:
        """
        Creates the final soil model with the excavation pit cut out.
        """
        if not isinstance(soil_domain_mesh, pv.core.dataset.DataSet):
             raise TypeError("soil_domain_mesh must be a valid PyVista mesh object.")

        contour_points_2d = self._load_dxf_contour(dxf_path)
        contour_centroid = self._calculate_centroid(contour_points_2d)

        soil_bounds = soil_domain_mesh.bounds
        soil_centroid_2d = np.array([
            (soil_bounds[0] + soil_bounds[1]) / 2,
            (soil_bounds[2] + soil_bounds[3]) / 2
        ])

        translation_vector = soil_centroid_2d - contour_centroid
        moved_contour_points = contour_points_2d + translation_vector
        
        contour_points_3d = np.hstack([moved_contour_points, np.zeros((len(moved_contour_points), 1))])
        
        pit_polydata = pv.PolyData(contour_points_3d)
        pit_solid = pit_polydata.extrude([0, 0, -excavation_depth], capping=True)

        final_mesh = soil_domain_mesh.boolean_difference(pit_solid)

        return final_mesh

    def export_mesh_to_gltf(self, mesh: pv.PolyData, output_dir: str, filename_prefix: str) -> str:
        """Exports the mesh to a glTF file and returns its path."""
        os.makedirs(output_dir, exist_ok=True)
        filename = f"{filename_prefix}_{uuid.uuid4().hex}.gltf"
        output_path = os.path.join(output_dir, filename)
        
        plotter = pv.Plotter(off_screen=True)
        plotter.add_mesh(mesh, cmap='coolwarm')
        plotter.export_gltf(output_path)
        
        return output_path 