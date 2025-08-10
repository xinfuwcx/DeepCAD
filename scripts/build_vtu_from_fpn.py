from pathlib import Path
import sys
import numpy as np
import pyvista as pv

sys.path.insert(0, str(Path('example2')))
from core.optimized_fpn_parser import OptimizedFPNParser

fpn_path = Path('example2/data/两阶段计算2.fpn')
out_vtu = Path('example2/data/两阶段计算2.vtu')

print('Reading:', fpn_path)
parser = OptimizedFPNParser()
res = parser.parse_file_streaming(str(fpn_path))

nodes = res.get('nodes', {})
elements = res.get('elements', {})

# Convert dicts to ordered arrays
if isinstance(nodes, dict):
    node_ids = sorted(nodes.keys())
    node_index = {nid: i for i, nid in enumerate(node_ids)}
    points = np.array([[nodes[nid]['x'], nodes[nid]['y'], nodes[nid]['z']] for nid in node_ids], dtype=float)
elif isinstance(nodes, list):
    # fallback for legacy list format
    node_ids = [n['id'] for n in nodes]
    node_index = {nid: i for i, nid in enumerate(node_ids)}
    points = np.array([[n['x'], n['y'], n['z']] for n in nodes], dtype=float)
else:
    raise RuntimeError('Unsupported nodes format')

cells = []
cell_types = []
mat_ids = []
num_skipped = 0

if isinstance(elements, dict):
    elem_iter = (elements[eid] for eid in sorted(elements.keys()))
elif isinstance(elements, list):
    elem_iter = elements
else:
    raise RuntimeError('Unsupported elements format')

for e in elem_iter:
    conn = e.get('nodes', [])
    if len(conn) == 4 and all(n in node_index for n in conn):
        cells.extend([4, node_index[conn[0]], node_index[conn[1]], node_index[conn[2]], node_index[conn[3]]])
        cell_types.append(10)  # VTK_TETRA
        mat_ids.append(e.get('material_id', -1))
    else:
        num_skipped += 1

print(f'Nodes: {len(points)}, elements: {len(cell_types)}, skipped: {num_skipped}')

grid = pv.UnstructuredGrid(np.array(cells, dtype=np.int64), np.array(cell_types, dtype=np.uint8), points)
if mat_ids:
    grid.cell_data['MaterialID'] = np.array(mat_ids, dtype=np.int32)

print('Writing VTU to', out_vtu)
grid.save(out_vtu)
print('Done.')

