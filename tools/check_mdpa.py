import sys
from pathlib import Path
import re

mdpa_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('two_stage_analysis/two_stage.mdpa')
text = mdpa_path.read_text(encoding='utf-8', errors='ignore').splitlines()

node_ids = set()
elem_node_ids = set()
subparts = {}
cur_smp = None
mode = None

for ln in text:
    if ln.startswith('Begin Nodes'):
        mode = 'nodes'; continue
    if ln.startswith('End Nodes'):
        mode = None; continue
    if ln.startswith('Begin Elements'):
        mode = 'elems'; continue
    if ln.startswith('End Elements') and mode == 'elems':
        mode = None; continue
    if ln.startswith('Begin SubModelPart '):
        cur_smp = ln.split()[2]
        subparts[cur_smp] = {'nodes': set(), 'elems': set()}
        mode = None; continue
    if ln.startswith('End SubModelPart'):
        cur_smp = None; continue
    if ln.strip() == 'Begin SubModelPartNodes':
        mode = 'smp_nodes'; continue
    if ln.strip() == 'End SubModelPartNodes':
        mode = None; continue
    if ln.strip() == 'Begin SubModelPartElements':
        mode = 'smp_elems'; continue
    if ln.strip() == 'End SubModelPartElements':
        mode = None; continue

    if mode == 'nodes':
        parts = ln.split()
        if parts and parts[0].isdigit():
            node_ids.add(int(parts[0]))
    elif mode == 'elems':
        parts = ln.split()
        if len(parts) >= 4 and parts[0].isdigit():
            try:
                # element line: id prop n1 n2 ...
                ids = list(map(int, parts))
                for nid in ids[2:]:
                    elem_node_ids.add(nid)
            except Exception:
                pass
    elif mode == 'smp_nodes' and cur_smp is not None:
        parts = ln.split()
        for p in parts:
            if p.isdigit():
                subparts[cur_smp]['nodes'].add(int(p))
    elif mode == 'smp_elems' and cur_smp is not None:
        parts = ln.split()
        for p in parts:
            if p.isdigit():
                subparts[cur_smp]['elems'].add(int(p))

isolated = sorted(node_ids - elem_node_ids)
print('Total nodes:', len(node_ids))
print('Nodes referenced by elements:', len(elem_node_ids))
print('Isolated nodes (no attached elements):', len(isolated))
if isolated:
    print('First 20 isolated:', isolated[:20])

# Check boundary submodel parts connectivity
for name in sorted(k for k in subparts if name.startswith('BOUNDARY') or name in ('BOTTOM_SUPPORT',)):
    s = subparts[name]
    n = len(s['nodes'])
    connected = sum(1 for nid in s['nodes'] if nid in elem_node_ids)
    print(f'SMP {name}: nodes={n}, connected={connected}, ratio={connected/(n or 1):.3f}')

