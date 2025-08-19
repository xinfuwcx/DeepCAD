import os
import sys
from pathlib import Path

# Make example2 importable
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# Off-screen for PyVista to avoid any GUI
os.environ.setdefault("PYVISTA_OFF_SCREEN", "true")

from core.optimized_fpn_parser import OptimizedFPNParser
import numpy as np
import pyvista as pv


def main():
    fpn = ROOT / 'data' / '两阶段计算2.fpn'
    print('FPN exists:', fpn.exists(), fpn)
    parser = OptimizedFPNParser()
    res = parser.parse_file_streaming(str(fpn))
    nodes = res.get('nodes')
    if isinstance(nodes, dict):
        nodes = list(nodes.values())
    elements = res.get('elements')
    if isinstance(elements, dict):
        elements = list(elements.values())
    print('Parsed counts -> nodes:', len(nodes), 'elements:', len(elements))

    # Build compressed points (continuous index)
    nodes_sorted = sorted(nodes, key=lambda n: int(n['id']))
    id_to_idx = {int(n['id']): i for i, n in enumerate(nodes_sorted)}
    points = np.array([[float(n['x']), float(n['y']), float(n['z'])] for n in nodes_sorted], dtype=float)

    VTK_TETRA = 10
    VTK_HEX = 12
    VTK_WEDGE = 13

    def map_nodes(raw, need):
        idxs = []
        for nid in raw[:need]:
            midx = id_to_idx.get(int(nid))
            if midx is None:
                return None
            idxs.append(midx)
        return idxs

    cells = []
    types = []
    for e in elements:
        et = str(e.get('type', '')).lower()
        raw = e.get('nodes', [])
        if et in ('tetra', 'tetra4', 't4'):
            idxs = map_nodes(raw, 4)
            if idxs and len(idxs) == 4:
                cells.extend([4] + idxs)
                types.append(VTK_TETRA)
        elif et in ('hexa', 'hex', 'hexa8', 'h8'):
            idxs = map_nodes(raw, 8)
            if idxs and len(idxs) == 8:
                cells.extend([8] + idxs)
                types.append(VTK_HEX)
        elif et in ('penta', 'wedge', 'p6', 'w6'):
            idxs = map_nodes(raw, 6)
            if idxs and len(idxs) == 6:
                cells.extend([6] + idxs)
                types.append(VTK_WEDGE)

    cells_array = np.asarray(cells, np.int64)
    types_array = np.asarray(types, np.uint8)
    print('Building grid...')
    grid = pv.UnstructuredGrid(cells_array, types_array, points)
    print('Grid built: n_points=', grid.n_points, 'n_cells=', grid.n_cells)

    print('Extracting surface...')
    surf = grid.extract_surface(pass_pointid=False)
    print('Surface cells:', surf.n_cells)

    # Save small sanity VTK to temp
    out_dir = ROOT / 'data' / 'VTK_Test'
    out_dir.mkdir(parents=True, exist_ok=True)
    pv.save_meshio(str(out_dir / 'surface.vtk'), surf)
    print('Saved surface to', out_dir / 'surface.vtk')


if __name__ == '__main__':
    main()

