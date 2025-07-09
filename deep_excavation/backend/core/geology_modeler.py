"""
This module provides the core functionality for geological modeling,
transforming borehole data into 3D geometric representations of geological layers.
The process is designed to be robust, handling imperfect data and providing
clear logging for traceability.
"""

import pandas as pd
import pyvista as pv
from loguru import logger
from typing import List, Dict, Any, Optional

# Ensure PyVista runs in headless mode on servers, crucial for deployment
pv.OFF_SCREEN = True

# A predefined list of colors for consistent and visually distinct layer rendering.
PREDEFINED_COLORS = [
    "#5F9EA0", "#D2B48C", "#A0522D", "#66CDAA", "#DEB887", "#4682B4",
    "#BDB76B", "#BC8F8F", "#8FBC8F", "#CD853F", "#F4A460", "#2E8B57"
]


def _prepare_geology_data(borehole_data: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Converts borehole data into a clean pandas DataFrame, ensuring data integrity.
    It robustly handles non-numeric values and drops rows with missing data.
    """
    df = pd.DataFrame(borehole_data)
    initial_count = len(df)
    
    # Force conversion of coordinate columns to numeric, coercing errors to NaN.
    # This is a critical step to clean 'dirty' data (e.g., empty strings).
    for col in ['x', 'y', 'z']:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Drop rows with any missing values in essential columns
    df.dropna(subset=['x', 'y', 'z', 'formation'], inplace=True)
    
    if len(df) < initial_count:
        logger.warning(f"Dropped {initial_count - len(df)} rows with invalid or missing data.")
    
    logger.info(f"Prepared data with {len(df)} valid points across {df['formation'].nunique()} unique formations.")
    return df


def _determine_processing_order(formations_config: Dict[str, str], df: pd.DataFrame) -> List[str]:
    """
    Determines the effective order for processing geological formations based on
    frontend specification and data availability. It also ensures the uniqueness
    of the formation order.
    """
    raw_order = [f.strip() for f in formations_config.get("DefaultSeries", "").split(',') if f.strip()]
    
    # Ensure uniqueness while preserving order
    seen = set()
    frontend_order = [f for f in raw_order if not (f in seen or seen.add(f))]
    if len(frontend_order) < len(raw_order):
        logger.warning(f"Removed {len(raw_order) - len(frontend_order)} duplicate formations from processing list.")

    actual_formations = df['formation'].unique()
    
    if not frontend_order:
        logger.info("No formation order specified by frontend, using data's natural order.")
        return list(actual_formations)
        
    # Filter frontend_order to include only formations present in the actual data
    processing_order = [f for f in frontend_order if f in actual_formations]
    
    ignored = set(frontend_order) - set(processing_order)
    if ignored:
        logger.info(f"Ignoring specified formations not found in data: {list(ignored)}")
        
    logger.info(f"Effective formation processing order: {processing_order}")
    return processing_order


def _create_delaunay_surface(
    formation_df: pd.DataFrame, alpha: float
) -> Optional[pv.PolyData]:
    """
    Creates a 3D surface for a single formation using PyVista's Delaunay triangulation.
    This method is robust against duplicate points and generally faster than Kriging.
    """
    formation_name = formation_df.iloc[0]['formation'] if not formation_df.empty else "Unknown"

    # Pre-process data: remove duplicate (x, y) coordinates. This is critical for
    # many triangulation algorithms. We average the z values for any duplicates.
    processed_df = formation_df.groupby(['x', 'y']).agg({'z': 'mean'}).reset_index()

    if len(processed_df) < len(formation_df):
        msg = (
            f"Removed {len(formation_df) - len(processed_df)} duplicate (x,y) points "
            f"for formation '{formation_name}' by averaging Z values."
        )
        logger.warning(msg)

    if len(processed_df) < 3:
        logger.warning(f"Skipping '{formation_name}': needs at least 3 unique points for Delaunay triangulation.")
        return None

    try:
        points = processed_df[['x', 'y', 'z']].values
        polydata = pv.PolyData(points)
        
        # Perform 2.5D Delaunay triangulation with intelligent alpha handling
        if alpha > 0:
            # Use alpha-shape for trimming, which is sensitive
            surface = polydata.delaunay_2d(alpha=alpha)
        else:
            # Default to standard Delaunay (convex hull of points)
            surface = polydata.delaunay_2d()
        
        if surface.n_points == 0 or surface.n_cells == 0:
            log_msg = f"Delaunay triangulation for '{formation_name}'"
            if alpha > 0:
                log_msg += f" with alpha={alpha}"
            log_msg += " resulted in an empty mesh. This can happen if alpha is too large or points are collinear."
            logger.warning(log_msg)
            
            # Fallback for alpha-shapes: try again with standard Delaunay
            if alpha > 0:
                logger.info(f"Falling back to standard Delaunay for '{formation_name}'.")
                surface = polydata.delaunay_2d()
                if surface.n_points == 0 or surface.n_cells == 0:
                    logger.error(f"Fallback Delaunay also failed for '{formation_name}'.")
                    return None
            else:
                return None

        return surface
    except Exception as e:
        logger.error(f"Failed during Delaunay triangulation for formation '{formation_name}': {e}", exc_info=True)
        return None


def _create_vtk_interpolated_surface(
    formation_df: pd.DataFrame,
    resolution: List[int],
    kernel_radius: float = 0.0,
) -> Optional[pv.PolyData]:
    """Create a smooth surface for a formation using VTK's ``vtkPointInterpolator``
    + ``vtkGaussianKernel`` and then warping the resulting scalar field.

    Parameters
    ----------
    formation_df : pd.DataFrame
        DataFrame containing *at least* columns ``x``, ``y``, ``z``.
    resolution : List[int]
        Resolution of the sampling grid in **x** and **y** (e.g. ``[50, 50]``).
    kernel_radius : float, optional
        Influence radius for the Gaussian kernel. If ``<= 0``, the kernel
        decides automatically based on bounds size.

    Returns
    -------
    Optional[pv.PolyData]
        The interpolated surface mesh or *None* if the interpolation failed.
    """
    if formation_df.empty:
        return None

    import vtk  # local import to avoid hard dependency in environments without VTK

    formation_name = formation_df.iloc[0]["formation"]

    # ------------------------------------------------------
    # 1. Source point set preparation
    # ------------------------------------------------------
    points = formation_df[["x", "y", "z"]].to_numpy(float)
    src = pv.PolyData(points)
    src.point_data["elev"] = points[:, 2]  # scalar field is Z value

    # ------------------------------------------------------
    # 2. Create a sampling image grid (XY plane, one cell thick in Z)
    # ------------------------------------------------------
    res_x, res_y = max(2, resolution[0]), max(2, resolution[1])

    min_x, max_x = points[:, 0].min(), points[:, 0].max()
    min_y, max_y = points[:, 1].min(), points[:, 1].max()

    spacing_x = (max_x - min_x) / (res_x - 1)
    spacing_y = (max_y - min_y) / (res_y - 1)

    img = pv.ImageData()
    img.dimensions = (res_x, res_y, 1)
    img.origin = (min_x, min_y, 0.0)  # z origin 0, we'll warp later
    img.spacing = (spacing_x, spacing_y, 1.0)

    # ------------------------------------------------------
    # 3. VTK PointInterpolator with Gaussian kernel
    # ------------------------------------------------------
    interp = vtk.vtkPointInterpolator()
    interp.SetInputData(img)
    interp.SetSourceData(src)

    gkernel = vtk.vtkGaussianKernel()
    if kernel_radius > 0:
        gkernel.SetRadius(kernel_radius)
    interp.SetKernel(gkernel)

    try:
        interp.Update()
    except Exception as exc:
        logger.error(
            f"VTK PointInterpolator failed for formation '{formation_name}': {exc}",
            exc_info=True,
        )
        return None

    interpolated = pv.wrap(interp.GetOutput())

    # The scalar field might be named 'elev', ensure it exists
    if "elev" not in interpolated.point_data:
        logger.error(
            f"Interpolated grid for '{formation_name}' lacks expected 'elev' scalar data.")
        return None

    # ------------------------------------------------------
    # 4. Warp the image grid by the interpolated elevation scalar
    # ------------------------------------------------------
    try:
        warped = interpolated.warp_by_scalar("elev")
        surface = warped.extract_surface().triangulate()
        if surface.n_points == 0 or surface.n_cells == 0:
            logger.error(
                f"Warped surface for '{formation_name}' is empty after triangulation.")
            return None
        return surface
    except Exception as exc:
        logger.error(
            f"Failed to warp or extract surface for '{formation_name}': {exc}",
            exc_info=True,
        )
        return None


def create_geological_model_geometry(
    borehole_data: List[Dict[str, Any]],
    formations: Dict[str, str],
    options: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Orchestrates the creation of geological model geometry from borehole data.

    This function implements a robust two-pass process:
    1.  Computes all individual formation surfaces.
    2.  Constructs the solid layer volumes between these surfaces.
    """
    logger.info(f"Starting geological model generation with options: {options}")
    
    df = _prepare_geology_data(borehole_data)
    if df.empty:
        logger.error("No valid borehole data available after cleaning. Aborting.")
        return []

    processing_order = _determine_processing_order(formations, df)
    
    # Define model bounds
    min_x, max_x = df['x'].min(), df['x'].max()
    min_y, max_y = df['y'].min(), df['y'].max()
    min_z, max_z = df['z'].min(), df['z'].max()
    
    logger.info(f"Model bounds (x, y): [{min_x:.2f}, {max_x:.2f}, {min_y:.2f}, {max_y:.2f}]")

    # --- Pass 1: Compute all formation surfaces ---
    logger.info("--- Starting Pass 1: Computing all formation surfaces ---")
    alpha = options.get('alpha', 0.0)  # Changed default alpha to 0.0 for safety
    grid_res = options.get('resolution', [100, 100])
    kernel_radius_opt = options.get('kernel_radius', 0.0)
    clip_to_bounds = options.get('clip_to_bounds', False)
    computed_surfaces = {}
    for name in processing_order:
        # Try robust VTK interpolated surface first
        surface = _create_vtk_interpolated_surface(
            df[df['formation'] == name],
            resolution=grid_res,
            kernel_radius=kernel_radius_opt,
        )

        # Fallback to Delaunay if interpolation failed
        if surface is None:
            surface = _create_delaunay_surface(df[df['formation'] == name], alpha=alpha)
        if surface and clip_to_bounds:
            # Clip surface to model XY bounds to avoid extrapolation artefacts
            bounds_surface = [min_x, max_x, min_y, max_y, min_z - 1.0, max_z + 1.0]
            try:
                surface = surface.clip_box(bounds_surface, invert=False)
            except Exception as exc2:
                logger.warning(
                    f"Clipping surface '{name}' to bounds failed: {exc2}. Keeping original surface.")

        if surface:
            computed_surfaces[name] = surface
            logger.info(f"Successfully computed surface for '{name}'.")

    if not computed_surfaces:
        logger.error("Could not compute any valid surfaces from the provided data.")
        return []

    # --- Pass 2: Build volumes between surfaces ---
    logger.info("--- Starting Pass 2: Building layer volumes ---")
    layers_data = []
    
    # Re-filter processing order to only include successfully computed surfaces
    valid_order = [name for name in processing_order if name in computed_surfaces]

    for i, name in enumerate(valid_order):
        top_surface = computed_surfaces[name]
        bottom_surface = None
        
        # Find the next valid surface in the order to use as the bottom boundary
        if i + 1 < len(valid_order):
            bottom_surface = computed_surfaces[valid_order[i+1]]

        try:
            if bottom_surface:
                # Create a volume between the current surface and the one below it
                solid = top_surface.extrude_trim((0, 0, (min_z - max_z) * 2), bottom_surface)
            else:
                # For the last layer, extrude downwards by a fixed amount
                solid = top_surface.extrude((0, 0, -20), capping=True)

            layer_mesh = solid.extract_surface().triangulate()
            
            # Clip the generated mesh to the data bounds for clean edges
            bounds = [min_x, max_x, min_y, max_y, min_z - 50, max_z + 50]
            final_mesh = layer_mesh.clip_box(bounds, invert=False)

            color_index = processing_order.index(name) % len(PREDEFINED_COLORS)
            
            layers_data.append({
                "name": name,
                "color": PREDEFINED_COLORS[color_index],
                "opacity": 0.9,
                "geometry": final_mesh
            })
            logger.info(f"Successfully created volume for layer '{name}'.")
        except Exception as e:
            logger.error(f"Failed to create volume for layer '{name}': {e}")
    
    logger.info(f"Successfully generated {len(layers_data)} geological layers.")
    return layers_data 