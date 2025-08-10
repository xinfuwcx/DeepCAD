import sys
from pathlib import Path

# Ensure example2 is on path
sys.path.insert(0, str(Path('example2')))

from modules.preprocessor import PreProcessor

fpn = Path('example2/data/两阶段计算2.fpn')
print('FPN exists:', fpn.exists())

p = PreProcessor()
# Use the robust loader (dict/list compatible)
p.load_fpn_file(str(fpn))

# If a mesh was built, report basic stats
if getattr(p, 'mesh', None) is not None:
    mesh = p.mesh
    try:
        n_cells = mesh.n_cells
        n_points = mesh.n_points
    except Exception:
        n_cells = n_points = -1
    print('Mesh built. cells:', n_cells, 'points:', n_points)
else:
    print('No mesh built')

