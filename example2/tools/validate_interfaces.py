#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validate interface connectivity and MPC mapping.
- Reads example2/temp_kratos_analysis/model.mdpa to collect:
  * node coordinates
  * shell/solid/truss node-id sets
- Reports whether shell & solid are node-aligned (shared nodes count)
- Reads mpc_constraints.json (if present) and reports:
  * shell_anchor & anchor_solid entry counts
  * coverage ratios vs truss nodes
  * simple distance diagnostics (min/avg/max distance from slave to its masters)
- Checks ProjectParameters.json contains injected mpc_constraints_process
"""
from __future__ import annotations
from pathlib import Path
import json
import math
import sys
import re

# Repo root is two levels up from this file (example2/tools)
REPO = Path(__file__).resolve().parents[2]
ROOT = REPO / 'example2'
OUT_DIR = ROOT / 'temp_kratos_analysis'
MDPA = OUT_DIR / 'model.mdpa'
MAPF = OUT_DIR / 'mpc_constraints.json'
PP = OUT_DIR / 'ProjectParameters.json'


def parse_mdpa(mdpa_path: Path):
    nodes = {}
    shell_nodes = set()
    solid_nodes = set()
    truss_nodes = set()

    if not mdpa_path.exists():
        raise FileNotFoundError(f"MDPA not found: {mdpa_path}")

    mode = None
    with mdpa_path.open('r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            if line.startswith('Begin Nodes'):
                mode = 'nodes'; continue
            if line.startswith('End Nodes') and mode == 'nodes':
                mode = None; continue
            if line.startswith('Begin Elements SmallDisplacementElement3D4N'):
                mode = 'solid'; continue
            if line.startswith('Begin Elements ShellThinElementCorotational3D'):
                mode = 'shell'; continue
            if line.startswith('Begin Elements TrussElement3D2N'):
                mode = 'truss'; continue
            if line.startswith('End Elements') and mode in ('solid','shell','truss'):
                mode = None; continue

            if mode == 'nodes':
                # Format: id x y z
                parts = line.split()
                if len(parts) >= 4 and parts[0].isdigit():
                    nid = int(parts[0])
                    try:
                        x, y, z = map(float, parts[1:4])
                        nodes[nid] = (x, y, z)
                    except Exception:
                        pass
            elif mode in ('solid','shell','truss'):
                parts = line.split()
                if len(parts) < 3 or not parts[0].isdigit():
                    continue
                if mode == 'solid':
                    try:
                        nids = list(map(int, parts[2:6]))
                        solid_nodes.update(nids)
                    except Exception:
                        pass
                elif mode == 'shell':
                    try:
                        # support 3N/4N, grab next 3-4 ids
                        nids = [int(x) for x in parts[2:6] if re.match(r'^-?\d+$', x)]
                        shell_nodes.update(nids)
                    except Exception:
                        pass
                elif mode == 'truss':
                    try:
                        nids = list(map(int, parts[2:4]))
                        truss_nodes.update(nids)
                    except Exception:
                        pass

    return nodes, shell_nodes, solid_nodes, truss_nodes


def mapping_stats(nodes, mapping):
    def distance(a, b):
        ax, ay, az = nodes.get(a, (float('nan'),)*3)
        bx, by, bz = nodes.get(b, (float('nan'),)*3)
        if any(map(math.isnan, (ax, ay, az, bx, by, bz))):
            return float('nan')
        dx = ax - bx; dy = ay - by; dz = az - bz
        return math.sqrt(dx*dx + dy*dy + dz*dz)

    stats = {}
    for key in ('shell_anchor', 'anchor_solid'):
        entries = mapping.get(key) or []
        n = len(entries)
        min_d = float('inf'); max_d = 0.0; sum_d = 0.0; cnt = 0
        worst = None
        for e in entries:
            slave = int(e.get('slave', -1))
            masters = e.get('masters') or []
            # distance = min distance to masters
            dmin = float('inf')
            for m in masters:
                nid = int(m.get('node', -1))
                d = distance(slave, nid)
                if d < dmin:
                    dmin = d
            if math.isfinite(dmin):
                min_d = min(min_d, dmin)
                max_d = max(max_d, dmin)
                sum_d += dmin
                cnt += 1
                if worst is None or dmin > worst[0]:
                    worst = (dmin, slave, [int(m.get('node', -1)) for m in masters])
        stats[key] = {
            'count': n,
            'min_dist': (None if n == 0 or not math.isfinite(min_d) else min_d),
            'avg_dist': (None if cnt == 0 else (sum_d / cnt)),
            'max_dist': (None if n == 0 else max_d),
            'worst_example': worst
        }
    return stats


def main():
    print(f"🔎 Using folder: {OUT_DIR}")
    nodes, shell, solid, truss = parse_mdpa(MDPA)
    print(f"📌 Nodes: {len(nodes)}  Shell nodes: {len(shell)}  Solid nodes: {len(solid)}  Truss nodes: {len(truss)}")

    shared = shell & solid
    print(f"✅ Shell-Solid shared nodes: {len(shared)} (共节点)")

    has_map = MAPF.exists()
    print(f"🗺️  Mapping file present: {has_map}")
    if has_map:
        mapping = json.loads(MAPF.read_text(encoding='utf-8'))
        counts = mapping.get('stats', {}).get('counts', {})
        print(f"📊 Mapping counts: {counts}")
        mstats = mapping_stats(nodes, mapping)
        print(f"📐 Mapping geometry distances: {mstats}")

    has_proc = False
    if PP.exists():
        txt = PP.read_text(encoding='utf-8')
        has_proc = 'mpc_constraints_process' in txt
    print(f"🔗 ProjectParameters injects MPC process: {has_proc}")

    # Coverage ratios
    if has_map and truss:
        sa = (mapping.get('shell_anchor') or [])
        as_ = (mapping.get('anchor_solid') or [])
        print(f"📈 Coverage vs truss: shell_anchor={len(sa)}/{len(truss)}  anchor_solid={len(as_)}/{len(truss)}")

    return 0


if __name__ == '__main__':
    sys.exit(main())

