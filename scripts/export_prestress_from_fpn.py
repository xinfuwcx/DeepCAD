from pathlib import Path
import json
from typing import Dict, Any, List, Tuple

# Ensure example2 is importable
import sys
ROOT = Path(__file__).resolve().parent.parent
EX2 = ROOT / 'example2'
if str(EX2) not in sys.path:
    sys.path.insert(0, str(EX2))

from core.optimized_fpn_parser import OptimizedFPNParser


def unit_vector(a, b):
    import math
    dx = b[0] - a[0]
    dy = b[1] - a[1]
    dz = b[2] - a[2]
    L = math.sqrt(dx*dx + dy*dy + dz*dz) or 1.0
    return (dx/L, dy/L, dz/L)


def main():
    parser = OptimizedFPNParser()
    fpn_path = EX2 / 'data' / '两阶段计算2.fpn'
    res = parser.parse_file_streaming(str(fpn_path))

    # Build node coord map
    nodes = res.get('nodes', {})
    nid2xyz = {int(nid): (ndata['x'], ndata['y'], ndata['z']) for nid, ndata in nodes.items()} if isinstance(nodes, dict) else {n['id']: (n['x'], n['y'], n['z']) for n in nodes}

    # Map element line (truss) to endpoints
    line_elems: Dict[int, Dict] = res.get('line_elements', {})

    # Collect prestress loads
    prestress: List[Dict[str, Any]] = res.get('prestress_loads', [])

    # Build nodal forces per stage/group
    stage_forces: Dict[int, List[Dict[str, Any]]] = {}
    for item in prestress:
        grp = int(item.get('group') or 1)
        eid = int(item['element_id'])
        F = float(item['force'])
        le = line_elems.get(eid)
        if not le:
            # if cannot find line element, skip
            continue
        n1, n2 = le['n1'], le['n2']
        a, b = nid2xyz.get(n1), nid2xyz.get(n2)
        if not a or not b:
            continue
        ex, ey, ez = unit_vector(a, b)
        # Apply +F to n1, -F to n2 along element axis
        stage_forces.setdefault(grp, []).append({'node': n1, 'force': [ F*ex,  F*ey,  F*ez]})
        stage_forces.setdefault(grp, []).append({'node': n2, 'force': [-F*ex, -F*ey, -F*ez]})

    out = {
        'prestress_stage_forces': stage_forces,
        'counts': {
            'line_elements': len(line_elems),
            'prestress_items': len(prestress)
        }
    }
    out_path = ROOT / 'example2' / 'out' / 'prestress_preview.json'
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Wrote {out_path} with {len(stage_forces)} stage groups')


if __name__ == '__main__':
    main()

