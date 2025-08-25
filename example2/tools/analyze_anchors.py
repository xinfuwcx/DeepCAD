#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Analyze anchors in a MIDAS FPN file:
- Count total anchors (chains of LINE elements with attribute 15 = PETRUSS)
- Count anchors per free-segment MSET (names starting with 'ê')
- Explain segmentation: average segments per anchor per MSET
- Inspect connection to diaphragm wall: shared nodes? min distances to wall nodes
Outputs JSON and TXT reports under output/.
"""
import sys
from pathlib import Path
from collections import defaultdict, deque
import json

DEFAULT_FPN = Path(__file__).resolve().parents[1] / 'data' / '两阶段-全锚杆-摩尔库伦.fpn'
ATTR_ANCHOR = 15  # PETRUSS
FREE_MSET_NAME_PREFIXES = ('ê', 'e')  # handle possible encoding issues


def parse_fpn(fpn_path: Path):
    nodes = {}  # id -> (x,y,z)
    line_attr = {}  # eid -> attr_id
    line_nodes = {}  # eid -> (n1,n2)
    msets = {}  # id(str) -> {name, elements:set[int], nodes:set[int]}

    current_mset = None
    with open(fpn_path, 'r', encoding='utf-8', errors='ignore') as f:
        for raw in f:
            if raw.startswith('NODE'):
                parts = [p.strip() for p in raw.split(',')]
                if len(parts) >= 5:
                    try:
                        nid = int(parts[1])
                        x = float(parts[2]); y = float(parts[3]); z = float(parts[4])
                        nodes[nid] = (x, y, z)
                    except Exception:
                        pass
                continue
            if raw.startswith('LINE'):
                parts = [p.strip() for p in raw.split(',')]
                if len(parts) >= 5:
                    try:
                        eid = int(parts[1])
                        attr = int(parts[2])
                        n1 = int(parts[3]); n2 = int(parts[4])
                        line_attr[eid] = attr
                        line_nodes[eid] = (n1, n2)
                    except Exception:
                        pass
                continue
            if raw.startswith('MSET'):
                parts = [p.strip() for p in raw.split(',')]
                if parts[0] == 'MSET':
                    # New MSET header
                    mid = parts[1]
                    name = parts[2] if len(parts) > 2 else ''
                    current_mset = mid
                    msets.setdefault(mid, {'name': name, 'elements': set(), 'nodes': set()})
                    continue
                if parts[0] == 'MSETE' and current_mset is not None:
                    # elements continuation lines or header with count
                    # Subsequent lines with just comma-separated ids also belong here
                    # Collect any integer tokens from this line (after the first 2 tokens)
                    ids = []
                    for tok in parts[1:]:
                        try:
                            val = int(tok)
                            if val > 0:
                                ids.append(val)
                        except Exception:
                            pass
                    msets[current_mset]['elements'].update(ids)
                    continue
                if parts[0] == 'MSETN' and current_mset is not None:
                    ids = []
                    for tok in parts[1:]:
                        try:
                            val = int(tok)
                            if val > 0:
                                ids.append(val)
                        except Exception:
                            pass
                    msets[current_mset]['nodes'].update(ids)
                    continue
                # Lines with only numbers (continuation of MSETE/MSETN) are captured above too
                continue
            # Continuation lines (start with spaces) after MSETE/MSETN
            if current_mset and raw.startswith(' '):
                parts = [p.strip() for p in raw.split(',')]
                ids = []
                for tok in parts:
                    try:
                        val = int(tok)
                        if val > 0:
                            ids.append(val)
                    except Exception:
                        pass
                # Heuristic: try to add to either elements or nodes depending on which is non-empty last
                if ids:
                    # We cannot strictly know; add to both, will filter later by existence in line_nodes/nodes
                    msets[current_mset]['elements'].update(ids)
                    msets[current_mset]['nodes'].update(ids)
                continue
    return nodes, line_attr, line_nodes, msets


def edges_from_eids(eids, line_attr, line_nodes, attr_filter=None):
    edges = []
    for eid in eids:
        if eid in line_nodes:
            if attr_filter is None or line_attr.get(eid) == attr_filter:
                n1, n2 = line_nodes[eid]
                if n1 != n2:
                    edges.append((n1, n2))
    return edges


def build_components(edges):
    adj = defaultdict(set)
    nodes = set()
    for a, b in edges:
        adj[a].add(b); adj[b].add(a)
        nodes.add(a); nodes.add(b)
    comps = []
    seen = set()
    for v in nodes:
        if v in seen:
            continue
        q = deque([v]); seen.add(v)
        comp = []
        while q:
            u = q.popleft(); comp.append(u)
            for w in adj[u]:
                if w not in seen:
                    seen.add(w); q.append(w)
        comps.append(comp)
    return comps, adj


def estimate_rods(comps, adj):
    rods = 0
    endpoints_total = 0
    segs_per_comp = []
    for comp in comps:
        deg1 = sum(1 for n in comp if len(adj[n]) == 1)
        endpoints_total += deg1
        # edges in comp
        edge_count = sum(len(adj[n]) for n in comp) // 2
        segs_per_comp.append(edge_count)
        if deg1 >= 2:
            rods += deg1 // 2
        elif edge_count > 0:
            rods += 1
    return rods, endpoints_total, segs_per_comp


def min_dist_to_set(p, nodes_coords):
    # nodes_coords: list[(nid, (x,y,z))]
    # naive O(N) search sufficient for one-off analysis
    import math
    px, py, pz = p
    md = float('inf')
    mn = None
    for nid, (x, y, z) in nodes_coords:
        d = math.sqrt((px-x)**2 + (py-y)**2 + (pz-z)**2)
        if d < md:
            md = d; mn = nid
    return md, mn


def analyze(fpn_path: Path, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    nodes, line_attr, line_nodes, msets = parse_fpn(fpn_path)

    # Global edges for anchors
    all_anchor_eids = [eid for eid, attr in line_attr.items() if attr == ATTR_ANCHOR]
    all_anchor_edges = edges_from_eids(all_anchor_eids, line_attr, line_nodes, ATTR_ANCHOR)
    comps_all, adj_all = build_components(all_anchor_edges)
    rods_all, endpoints_all, segs_per_comp_all = estimate_rods(comps_all, adj_all)

    # Per-MSET for free segments (ê*)
    per_mset = []
    for mid, data in msets.items():
        name = data.get('name') or ''
        # Only names starting with ê/e
        if not name:
            continue
        if not name.startswith(FREE_MSET_NAME_PREFIXES):
            continue
        eids = [eid for eid in data['elements'] if eid in line_nodes and line_attr.get(eid) == ATTR_ANCHOR]
        if not eids:
            continue
        edges = edges_from_eids(eids, line_attr, line_nodes, ATTR_ANCHOR)
        comps, adj = build_components(edges)
        rods, endpoints, segs_per_comp = estimate_rods(comps, adj)
        avg_segs = (sum(segs_per_comp)/len(segs_per_comp)) if segs_per_comp else 0.0
        per_mset.append({
            'mset_id': mid,
            'name': name,
            'elements_in_set': len(data['elements']),
            'anchor_edges_in_set': len(edges),
            'connected_components': len(comps),
            'estimated_rods': rods,
            'endpoints_total': endpoints,
            'avg_segments_per_comp': avg_segs,
        })
    per_mset.sort(key=lambda x: int(x['mset_id']))

    # Diaphragm wall node set: try known MSET ids (89 wall, 91 top) and any name containing wall
    wall_node_ids = set()
    for mid, data in msets.items():
        add = False
        try:
            if int(mid) in (89, 91):
                add = True
        except Exception:
            pass
        nm = (data.get('name') or '').lower()
        if '墙' in nm or 'wall' in nm or '连' in nm:
            add = True
        if add:
            # only keep actual node ids that exist in nodes
            wall_node_ids.update([nid for nid in data['nodes'] if nid in nodes])
    wall_coords = [(nid, nodes[nid]) for nid in wall_node_ids]

    # Anchor endpoint proximity to wall
    # endpoints: nodes with degree 1 in global graph
    endpoints = [n for n in adj_all.keys() if len(adj_all[n]) == 1]
    import math
    dist_hist = {'<=0.5':0,'<=1':0,'<=2':0,'<=5':0,'<=10':0,'>10':0}
    sample_near = []
    for n in endpoints:
        if n not in nodes:
            continue
        d, nn = min_dist_to_set(nodes[n], wall_coords) if wall_coords else (math.inf, None)
        if d <= 0.5: dist_hist['<=0.5'] += 1
        elif d <= 1: dist_hist['<=1'] += 1
        elif d <= 2: dist_hist['<=2'] += 1
        elif d <= 5: dist_hist['<=5'] += 1
        elif d <= 10: dist_hist['<=10'] += 1
        else: dist_hist['>10'] += 1
        if d <= 2 and len(sample_near) < 10:
            sample_near.append({'endpoint': n, 'nearest_wall_node': nn, 'distance': d})

    report = {
        'fpn': str(fpn_path),
        'global': {
            'anchor_edges': len(all_anchor_edges),
            'connected_components': len(comps_all),
            'estimated_rods': rods_all,
            'endpoints_total': endpoints_all,
            'avg_segments_per_comp': (sum(segs_per_comp_all)/len(segs_per_comp_all)) if segs_per_comp_all else 0.0,
        },
        'per_mset': per_mset,
        'wall': {
            'wall_node_count': len(wall_node_ids),
            'endpoint_to_wall_distance_hist': dist_hist,
            'sample_near_endpoints': sample_near,
            'shared_nodes_with_wall': len(set(endpoints) & wall_node_ids),
        }
    }

    out_json = out_dir / 'anchor_analysis.json'
    out_txt = out_dir / 'anchor_analysis.txt'
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    with open(out_txt, 'w', encoding='utf-8') as f:
        f.write(json.dumps(report, ensure_ascii=False, indent=2))

    return report, out_json, out_txt


def main():
    fpn_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_FPN
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else (Path(__file__).resolve().parents[1] / 'output')
    report, out_json, out_txt = analyze(fpn_path, out_dir)
    print(f"Analysis written to: {out_json}\n{out_txt}")


if __name__ == '__main__':
    main()

