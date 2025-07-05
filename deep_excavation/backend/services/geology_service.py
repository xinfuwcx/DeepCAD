import gempy as gp
import pandas as pd
import pyvista as pv
from io import StringIO
import uuid
import os

def create_geological_model_from_csv(csv_data: str) -> str:
    """
    Creates a geological model from CSV data using GemPy and saves it as a VTK file.

    Args:
        csv_data: A string containing the borehole data in CSV format.

    Returns:
        The file path to the generated VTK model.
    """
    # 1. Load data into a pandas DataFrame
    df_points = pd.read_csv(StringIO(csv_data))
    
    # Rename columns to what GemPy expects
    df_points = df_points.rename(columns={
        'x': 'X', 'y': 'Y', 'surface': 'Z', 'soil_layer': 'formation'
    })

    # 2. Initialize the GemPy model
    geo_model = gp.create_model('DeepExcavationGeology')
    
    # Define model extent and resolution
    gp.init_data(
        geo_model,
        extent=[
            df_points['X'].min() - 20, df_points['X'].max() + 20,
            df_points['Y'].min() - 20, df_points['Y'].max() + 20,
            df_points['Z'].min() - 20, df_points['Z'].max() + 20,
        ],
        resolution=[50, 50, 50]
    )

    # 3. Define the geological formations and their order
    formations = ['Fill', 'SiltyClay', 'Silt', 'FineSand', 'WeatheredRock']
    gp.map_stack_to_surfaces(
        geo_model,
        {"formations_stack": formations}
    )

    # Load the borehole points into the model
    gp.set_surface_points(geo_model, df_points, "declarations")

    # 4. Set up the interpolator
    gp.set_interpolator(
        geo_model,
        compile_theano=True,
        theano_optimizer='fast_run'
    )

    # 5. Compute the model
    sol = gp.compute_model(geo_model, compute_mesh=True)

    # 6. Extract the surfaces using PyVista and save to a VTK file
    vertices, triangles = gp.get_surfaces(sol)
    pv_mesh = pv.make_tri_mesh(vertices, triangles)
    
    # Ensure the results directory exists
    output_dir = "results"
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate a unique filename
    output_filename = f"geology_model_{uuid.uuid4()}.vtk"
    output_path = os.path.join(output_dir, output_filename)
    
    pv_mesh.save(output_path)

    return output_path 