import numpy as np
import types

# Import the PostProcessor class
from example2.modules.postprocessor import PostProcessor, PYVISTA_AVAILABLE


def make_mesh_with_materials(pv):
    # build a tiny unstructured grid with two cells and MaterialID
    # use a simple tetra + tetra sharing points
    points = np.array([
        [0.0, 0.0, 0.0],
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
        [0.0, 0.0, 1.0],
        [1.0, 1.0, 1.0],
    ])

    cells = np.array([
        4, 0, 1, 2, 3,  # tetra
        4, 1, 2, 3, 4,  # tetra
    ])
    cell_types = np.array([10, 10])
    mesh = pv.UnstructuredGrid(cells, cell_types, points)
    mesh.cell_data['MaterialID'] = np.array([1, 2])
    return mesh


def test_compute_cell_rgb_colors_distinct():
    pp = PostProcessor()
    if not PYVISTA_AVAILABLE:
        # When pyvista not available, just ensure helper path doesn't crash
        colors = pp._compute_cell_rgb_colors(types.SimpleNamespace(cell_data={'MaterialID': [1, 2, 3]}))
        assert colors is None or colors.shape[1] == 3
        return

    import pyvista as pv
    mesh = make_mesh_with_materials(pv)
    colors = pp._compute_cell_rgb_colors(mesh)
    assert colors is not None
    assert colors.shape == (mesh.n_cells, 3)
    # Distinct materials should map to distinct RGBs
    assert not np.array_equal(colors[0], colors[1])
