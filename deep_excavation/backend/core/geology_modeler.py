import numpy as np
import pandas as pd
import pyvista as pv
from pykrige.ok import OrdinaryKriging
from loguru import logger
from typing import List, Dict, Any


# Ensure PyVista runs in headless mode on servers
pv.OFF_SCREEN = True


# Predefined colors to replace the gempy dependency
# A simple list of hex codes for consistent layer coloring.
PREDEFINED_COLORS = [
    "#5F9EA0",  # CadetBlue
    "#D2B48C",  # Tan
    "#A0522D",  # Sienna
    "#66CDAA",  # MediumAquamarine
    "#DEB887",  # BurlyWood
    "#4682B4",  # SteelBlue
    "#BDB76B",  # DarkKhaki
    "#BC8F8F",  # RosyBrown
    "#8FBC8F",  # DarkSeaGreen
    "#CD853F",  # Peru
]

def _prepare_geology_data(borehole_data: List[Dict[str, Any]]) -> pd.DataFrame:
    """Converts borehole data from a list of dicts to a pandas DataFrame."""
    df = pd.DataFrame(borehole_data)
    logger.info(f"Prepared data with {len(df)} points and {df['formation'].nunique()} unique formations.")
    return df


def create_geological_model_geometry(
    borehole_data: List[Dict[str, Any]],
    formations: Dict[str, str],
    options: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Creates geological model geometry from borehole data, using specified options.

    This function now returns a list of dictionaries, where each dictionary
    represents a geological layer and contains its name, color, and PyVista geometry.
    """
    logger.info(f"Starting geological model computation with options: {options}")
    df = _prepare_geology_data(borehole_data)

    # Use the order of formations from the request, not from the file
    series_order = [f.strip() for f in formations.get("DefaultSeries", "").split(',') if f.strip()]
    if not series_order:
        series_order = df['formation'].unique()
    logger.info(f"Using formation series order: {series_order}")
    
    # Calculate unified bounds for the model
    min_x, max_x = df['x'].min(), df['x'].max()
    min_y, max_y = df['y'].min(), df['y'].max()
    min_z, max_z = df['z'].min(), df['z'].max()

    # Add a buffer to the bounds
    x_buffer = (max_x - min_x) * 0.1
    y_buffer = (max_y - min_y) * 0.1

    # Get grid resolution from options, with a default value
    resolution = options.get("resolution", [50, 50])
    grid_x = np.linspace(min_x - x_buffer, max_x + x_buffer, resolution[0])
    grid_y = np.linspace(min_y - y_buffer, max_y + y_buffer, resolution[1])

    logger.info(f"Calculated model bounds (x, y): [{min_x}, {max_x}, {min_y}, {max_y}]")

    layers_data = []
    
    # Use the specified series order
    for i, formation in enumerate(series_order):
        formation_data = df[df['formation'] == formation]
        
        if len(formation_data) < 3:
            logger.warning(f"Skipping '{formation}': needs at least 3 points for Kriging.")
            continue

        try:
            variogram_model = options.get('variogram_model', 'linear')
            ok = OrdinaryKriging(
                formation_data['x'],
                formation_data['y'],
                formation_data['z'],
                variogram_model=variogram_model,
                verbose=False,
                enable_plotting=False
            )
            
            z_pred, _ = ok.execute('grid', grid_x, grid_y)
            
            # Create a surface from the kriging results
            surface = pv.StructuredGrid(grid_x, grid_y, z_pred.data)
            clipped_surface = surface.delaunay_2d()

            # The layer above will define the bottom of the current layer
            if i > 0:
                # Find the previous valid formation in the series
                prev_formation = None
                for j in range(i - 1, -1, -1):
                    if len(df[df['formation'] == series_order[j]]) >= 3:
                        prev_formation = series_order[j]
                        break

                if prev_formation:
                    prev_formation_data = df[df['formation'] == prev_formation]
                    prev_ok = OrdinaryKriging(
                        prev_formation_data['x'],
                        prev_formation_data['y'],
                        prev_formation_data['z'],
                        variogram_model=variogram_model,
                        verbose=False, enable_plotting=False
                    )
                    prev_z, _ = prev_ok.execute('grid', grid_x, grid_y)
                    bottom_surface = pv.StructuredGrid(grid_x, grid_y, prev_z.data).delaunay_2d()
                    
                    # Create a volume between the two surfaces and then extract the skin
                    solid = clipped_surface.extrude_trim((0, 0, -100), bottom_surface)
                    layer_mesh = solid.extract_surface().triangulate()
                else:
                    # If no valid layer above, just extrude downwards
                    layer_mesh = clipped_surface.extrude((0, 0, -10), capping=True).triangulate()
            else:
                # For the top layer, extrude downwards
                layer_mesh = clipped_surface.extrude((0, 0, -10), capping=True).triangulate()

            # Make the sides flat by clipping with a bounding box
            bounds = [min_x, max_x, min_y, max_y, min_z - 50, max_z + 50]
            bbox = pv.Box(bounds)
            final_mesh = layer_mesh.clip_box(bbox, invert=False)

            # Assign color from the predefined list based on the layer index
            color = PREDEFINED_COLORS[i % len(PREDEFINED_COLORS)]

            layer_info = {
                "name": formation,
                "color": color,
                "opacity": 0.8,
                "geometry": final_mesh
            }
            layers_data.append(layer_info)
            logger.info(f"Successfully computed geometry for: {formation}")

        except Exception as e:
            logger.error(f"Failed to process formation {formation}: {e}")

    logger.info("Successfully computed all geological geometry layers.")
    return layers_data 