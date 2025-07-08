import logging
import pandas as pd
import pyvista as pv
import numpy as np
import gempy as gp
from typing import List, Dict, Any

from deep_excavation.backend.core.pyvista_web_bridge import pyvista_mesh_to_json
from deep_excavation.backend.core.gmsh_occ_integration import GmshOCCIntegration

logger = logging.getLogger(__name__)


class GeologyModeler:
    """
    Handles the core logic of creating geological models using GemPy.
    This class is designed to be framework-agnostic and operate in memory.
    """
    def _prepare_dataframes(
        self,
        surface_points: List[Dict[str, Any]],
        borehole_data: List[Dict[str, Any]]
    ) -> (pd.DataFrame, pd.DataFrame):
        """Converts raw data into pandas DataFrames for GemPy."""
        all_points = []
        for p in (surface_points or []):
            all_points.append({
                'X': p['x'], 'Y': p['y'], 'Z': p['z'], 'formation': p['surface']
            })

        for bh in (borehole_data or []):
            # 支持嵌套结构 (一个钻孔对应多个地层)
            if 'layers' in bh and bh.get('layers'):
                for layer in bh.get('layers', []):
                    all_points.append({
                        'X': bh['x'],
                        'Y': bh['y'],
                        'Z': layer.get('z'),
                        'formation': layer.get('formation')
                    })
            # 支持扁平结构 (每一项都是一个独立的点)
            elif 'x' in bh and 'y' in bh and 'z' in bh and 'formation' in bh:
                all_points.append({
                    'X': bh['x'],
                    'Y': bh['y'],
                    'Z': bh['z'],
                    'formation': bh['formation']
                })
        
        if not all_points:
            raise ValueError("没有提供有效的地表点或钻孔数据。")

        df_points = pd.DataFrame(all_points)
        # GemPy expects 'surface' column, not 'formation'
        df_points_renamed = df_points.rename(columns={'formation': 'surface'})
        return df_points_renamed, pd.DataFrame()  # Returning empty orientations for now

    def create_model_in_memory(
        self,
        surface_points: List[Dict[str, Any]],
        borehole_data: List[Dict[str, Any]],
        series_mapping: Dict[str, List[str]],
        options: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Creates a geological model in memory using GemPy and returns it in a
        serializable format.
        """
        try:
            logger.info("Starting geological model creation.")
            
            # 1. Prepare data
            df_points, df_orientations = self._prepare_dataframes(
                surface_points, borehole_data
            )
            if df_points.empty:
                logger.warning("Dataframe is empty, cannot create model.")
                raise ValueError("No data available to create model.")

            # 2. Define model extent
            min_coords = df_points[['X', 'Y', 'Z']].min()
            max_coords = df_points[['X', 'Y', 'Z']].max()
            padding = (max_coords - min_coords).abs().replace(0, 100) * 0.2
            extent = [
                min_coords['X'] - padding['X'], max_coords['X'] + padding['X'],
                min_coords['Y'] - padding['Y'], max_coords['Y'] + padding['Y'],
                min_coords['Z'] - padding['Z'], max_coords['Z'] + padding['Z'],
            ]
            
            # 3. Initialize GemPy model
            geo_model = gp.create_geomodel(
                project_name="in-memory-model",
                extent=extent,
                resolution=options.get('resolution', [50, 50, 50]),
            )

            # 4. Set geological data
            gp.set_surface_points(geo_model, df_points, update_surfaces=True)
            if not df_orientations.empty:
                gp.set_orientations(geo_model, df_orientations)

            if not series_mapping:
                # Default series if none provided
                all_surfaces = list(df_points['surface'].unique())
                series_mapping = {"DefaultSeries": all_surfaces}

            gp.map_stack_to_surfaces(geo_model, series_mapping)

            # 5. Compute the model
            logger.info("Setting interpolator and computing model...")
            gp.set_interpolator(geo_model)
            solutions = gp.compute_model(geo_model, compute_mesh=True)
            logger.info("Successfully computed GemPy model.")

            # 6. Extract explicit surfaces from GemPy model
            explicit_surfaces = []
            surfaces: gp.data.Surfaces = solutions.surfaces
            for surface_name in surfaces.surface_names:
                try:
                    vertices, faces = surfaces.get_surface_mesh(surface_name)
                    if vertices is not None and faces is not None:
                        pv_faces = np.insert(faces, 0, 3, axis=1)
                        pv_mesh = pv.PolyData(
                            vertices,
                            pv_faces,
                            n_faces=len(faces),
                        )
                        pv_mesh.field_data['name'] = [surface_name]
                        explicit_surfaces.append(pv_mesh)
                except Exception as e:
                    logger.warning(
                        "Could not extract surface '%s': %s", surface_name, e
                    )
            
            if not explicit_surfaces:
                raise ValueError("Failed to extract any explicit surfaces from the model.")

            # 7. Use Gmsh to create and mesh volumes from surfaces
            logger.info("Handing off to Gmsh for meshing.")
            gmsh_integrator = GmshOCCIntegration(surfaces=explicit_surfaces)
            gmsh_result = (
                gmsh_integrator.create_geological_volumes_and_mesh()
            )

            if gmsh_result["status"] != "success":
                raise RuntimeError(
                    f"Gmsh processing failed: {gmsh_result['message']}"
                )

            logger.info("Successfully created and meshed volumes with Gmsh.")

            # 8. Serialize the visualization mesh and store the solver mesh path
            viz_mesh = gmsh_result.get("visualization_mesh")
            mdpa_path = gmsh_result.get("mesh_file_path")

            if not viz_mesh:
                # Even if Kratos mesh exists, we need something to show
                raise ValueError("Gmsh did not return a final visualization mesh.")
            
            serialized_mesh = pyvista_mesh_to_json(viz_mesh, "FinalGeologicalModel")

            return {
                "meshes": [serialized_mesh],
                "kratos_mesh_path": mdpa_path,  # Path for the solver
                "model_info": {
                    "extent": extent,
                    "resolution": options.get('resolution', [50, 50, 50]),
                    "gmsh_stats": gmsh_result.get("stats")
                }
            }

        except Exception as e:
            logger.error(
                "Geological model creation failed: %s", e, exc_info=True
            )
            raise  # 将异常向上抛出，由服务层和API层处理 