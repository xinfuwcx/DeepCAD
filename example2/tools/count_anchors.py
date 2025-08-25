#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Counting anchors (number of rods) from a MIDAS FPN file.
Rule used:
- Anchors are LINE elements that use PETRUSS attribute id=15 (which references material 13).
- Each anchor is a chain of LINE segments. Build a graph on nodes with edges = LINE(…, n1, n2, …).
- Number of anchors ~= sum over connected components of max(1, endpoints/2),
  where endpoints = number of nodes in the component with degree==1.
This is robust for polyline-like anchors (degree<=2).
"""
import sys
from collections import defaultdict, deque
from pathlib import Path

# Default FPN path (project-specific)
DEFAULT_FPN = Path(__file__).resolve().parents[1] / 'data' / '两阶段-全锚杆-摩尔库伦.fpn'

# Which attribute id marks anchor LINEs
ANCHOR_ATTRIBUTE_ID = 15  # PETRUSS (points to material 13 MISO)


def parse_anchor_edges(fpn_path: Path):
    edges = []  # list[(n1, n2)]
    line_count = 0
    with open(fpn_path, 'r', encoding='utf-8', errors='ignore') as f:
        for raw in f:
            # Fast path: skip anything that doesn't start with 'LINE'
            if not raw.startswith('LINE'):
                continue
            line_count += 1
            # Typical format: LINE   , <eid>, <attr_id>, <n1>, <n2>, <sec_id>, <angle>, ,
            parts = [p.strip() for p in raw.split(',')]
            if len(parts) < 5:
                continue
            try:
                attr_id = int(parts[2])
                if attr_id != ANCHOR_ATTRIBUTE_ID:
                    continue
                n1 = int(parts[3])
                n2 = int(parts[4])
                if n1 != n2:
                    edges.append((n1, n2))
            except Exception:
                # Ignore malformed rows
                continue
    return edges, line_count


def build_components(edges):
    # Build adjacency and collect nodes
    adj = defaultdict(set)
    nodes = set()
    for a, b in edges:
        adj[a].add(b)
        adj[b].add(a)
        nodes.add(a)
        nodes.add(b)

    # BFS/DFS to get connected components
    comps = []  # list[list[nodes]]
    seen = set()
    for v in nodes:
        if v in seen:
            continue
        q = deque([v])
        seen.add(v)
        comp = []
        while q:
            u = q.popleft()
            comp.append(u)
            for w in adj[u]:
                if w not in seen:
                    seen.add(w)
                    q.append(w)
        comps.append(comp)
    return comps, adj


def count_anchors_from_components(comps, adj):
    anchors = 0
    deg1_total = 0
    deg_ge3_components = 0
    for comp in comps:
        deg1 = sum(1 for n in comp if len(adj[n]) == 1)
        deg_ge3 = any(len(adj[n]) >= 3 for n in comp)
        if deg_ge3:
            deg_ge3_components += 1
        deg1_total += deg1
        # For a polyline: endpoints=2 -> one rod; endpoints=0 but edges exist -> closed loop -> treat as 1
        if deg1 >= 2:
            anchors += deg1 // 2
        elif len(comp) > 1:
            anchors += 1
        else:
            # single isolated node shouldn't happen (no edge), ignore
            pass
    return anchors, deg1_total, deg_ge3_components


def main():
    fpn_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_FPN
    if not fpn_path.exists():
        print(f"❌ FPN not found: {fpn_path}")
        sys.exit(1)
    edges, total_line_rows = parse_anchor_edges(fpn_path)
    if not edges:
        print("❌ No anchor LINE edges with attribute_id=15 found.")
        sys.exit(2)
    comps, adj = build_components(edges)
    anchors, deg1_total, deg_ge3_comps = count_anchors_from_components(comps, adj)

    print("===== Anchor Counting Report =====")
    print(f"FPN: {fpn_path}")
    print(f"LINE rows scanned: {total_line_rows}")
    print(f"Anchor edges (attr=15): {len(edges)}")
    print(f"Connected components: {len(comps)}")
    print(f"Estimated anchors: {anchors}")
    print(f"Endpoint nodes total: {deg1_total} (anchors≈endpoints/2)")
    print(f"Components with degree>=3 present: {deg_ge3_comps} (branching)")


if __name__ == '__main__':
    main()

