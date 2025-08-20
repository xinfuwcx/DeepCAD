import os
import sys
import json
from pathlib import Path
from typing import Dict, Any, List, Tuple

# Ensure example2 is importable, to use the FPN parser (actual data only)
EX2 = Path('example2').resolve()
if str(EX2) not in sys.path:
    sys.path.insert(0, str(EX2))
from core.optimized_fpn_parser import OptimizedFPNParser

# Default FPN path (can be overridden by GEO_FPN env or CLI arg)
DEFAULT_FPN = EX2 / 'data' / '两阶段计算2.fpn'

SRC_CANDIDATES = [
    Path('example2')/ 'temp_kratos_analysis' / 'model.mdpa',
    Path('example2')/ 'out' / 'kratos_full' / 'excavation_model.mdpa',
    Path('example2')/ 'out' / 'kratos_small' / 'excavation_model.mdpa',
]
DEST_DIR = Path('example2') / 'geo_run'
DEST_DIR.mkdir(parents=True, exist_ok=True)
NEW_MDPA = DEST_DIR / 'porous.mdpa'
MATERIALS_JSON = DEST_DIR / 'materials.json'
PROJECT_PARAMS = DEST_DIR / 'ProjectParameters.json'


def resolve_fpn_path() -> Path:
    # Priority: CLI arg -> GEO_FPN env -> DEFAULT_FPN
    cli = None
    try:
        if len(sys.argv) > 1 and sys.argv[1]:
            cli = Path(sys.argv[1]).resolve()
    except Exception:
        cli = None
    if cli and cli.exists():
        return cli
    env = os.environ.get('GEO_FPN')
    if env and Path(env).exists():
        return Path(env).resolve()
    return DEFAULT_FPN


def parse_nodes(mdpa_lines):
    nodes = {}
    in_nodes = False
    for line in mdpa_lines:
        s = line.strip()
        if s.startswith('Begin Nodes'):
            in_nodes = True
            continue
        if in_nodes:
            if s.startswith('End Nodes'):
                break
            if not s:
                continue
            parts = s.split()
            if len(parts) >= 4:
                try:
                    nid = int(parts[0])
                    x, y, z = map(float, parts[1:4])
                    nodes[nid] = (x, y, z)
                except Exception:
                    pass
    return nodes


def extract_volume_elements(mdpa_lines):
    # Return dict: header_name -> list of element tuples (id, pid, node_ids)
    sections = {
        'SmallDisplacementElement3D4N': [],
        'SmallDisplacementElement3D6N': [],
        'SmallDisplacementElement3D8N': [],
    }
    current = None
    for line in mdpa_lines:
        s = line.strip()
        if s.startswith('Begin Elements'):
            if 'SmallDisplacementElement3D4N' in s:
                current = 'SmallDisplacementElement3D4N'
                continue
            if 'SmallDisplacementElement3D6N' in s:
                current = 'SmallDisplacementElement3D6N'
                continue
            if 'SmallDisplacementElement3D8N' in s:
                current = 'SmallDisplacementElement3D8N'
                continue
            current = None
        elif s.startswith('End Elements'):
            current = None
        else:
            if current is not None and s:
                parts = s.split()
                try:
                    eid = int(parts[0])
                    pid = int(parts[1])
                    node_ids = [int(x) for x in parts[2:]]
                    sections[current].append((eid, pid, node_ids))
                except Exception:
                    pass
    return sections


def write_geo_mdpa(src_mdpa: Path, boundary_nodes: dict[int, list[int]], singleton_nodes: list[int], load_group_nodes: dict[int, list[int]]) -> tuple[set,int]:
    lines = src_mdpa.read_text(encoding='utf-8', errors='ignore').splitlines()
    nodes = parse_nodes(lines)
    if not nodes:
        raise RuntimeError('No nodes parsed from mdpa')
    vols = extract_volume_elements(lines)
    total_elems = sum(len(v) for v in vols.values())
    if total_elems == 0:
        raise RuntimeError('No volume elements (3D) found to convert for GeoMechanics')

    # Force unify to a single property id (1) for all volume elements
    used_prop_ids = {1}
    # Also rewrite the element tuples to use pid=1
    for key, arr in vols.items():
        vols[key] = [(eid, 1, node_ids) for (eid, pid, node_ids) in arr]

    with NEW_MDPA.open('w', encoding='utf-8') as f:
        f.write('Begin ModelPartData\n')
        f.write('End ModelPartData\n\n')

        # Write properties
        for pid in sorted(used_prop_ids):
            f.write(f'Begin Properties {pid}\n')
            f.write('End Properties\n\n')

        # Write nodes
        f.write('Begin Nodes\n')
        for nid in sorted(nodes.keys()):
            x,y,z = nodes[nid]
            f.write(f'{nid} {x} {y} {z}\n')
        f.write('End Nodes\n\n')

        # Write UPw elements (convert)
        mapping = {
            'SmallDisplacementElement3D4N': 'UPwSmallStrainElement3D4N',
            'SmallDisplacementElement3D6N': 'UPwSmallStrainElement3D6N',
            'SmallDisplacementElement3D8N': 'UPwSmallStrainElement3D8N',
        }
        all_elem_ids = []
        for src_name, elems in vols.items():
            if not elems:
                continue
            dst_name = mapping[src_name]
            f.write(f'Begin Elements {dst_name}\n')
            for (eid, pid, node_ids) in elems:
                all_elem_ids.append(eid)
                f.write(str(eid)); f.write(' '); f.write(str(pid)); f.write(' ')
                f.write(' '.join(str(n) for n in node_ids)); f.write('\n')
            f.write('End Elements\n\n')

        # SubModelPart for computational domain (all nodes and elements)
        f.write('Begin SubModelPart porous_computational_model_part\n')
        f.write('  Begin SubModelPartNodes\n')
        for nid in sorted(nodes.keys()):
            f.write(f'  {nid}\n')
        f.write('  End SubModelPartNodes\n')
        f.write('  Begin SubModelPartElements\n')
        for eid in sorted(all_elem_ids):
            f.write(f'  {eid}\n')
        f.write('  End SubModelPartElements\n')
        f.write('End SubModelPart\n\n')

        # SubModelParts for FPN boundary groups (BSET_*)
        for gid, nids in sorted(boundary_nodes.items()):
            if not nids:
                continue
            f.write(f'Begin SubModelPart BSET_{gid}\n')
            f.write('  Begin SubModelPartNodes\n')
            for nid in sorted(set(nids)):
                if nid in nodes:
                    f.write(f'  {nid}\n')
            f.write('  End SubModelPartNodes\n')
            f.write('End SubModelPart\n\n')

        # SubModelParts for singleton nodes (for nodal loads/constraints)
        for nid in sorted(set(singleton_nodes or [])):
            if nid in nodes:
                f.write(f'Begin SubModelPart NODE_{nid}\n')
                f.write('  Begin SubModelPartNodes\n')
                f.write(f'  {nid}\n')
                f.write('  End SubModelPartNodes\n')
                f.write('End SubModelPart\n\n')

        # SubModelParts for Load Groups (LSET_*)
        for gid, nids in sorted(load_group_nodes.items()):
            if not nids:
                continue
            f.write(f'Begin SubModelPart LSET_{gid}\n')
            f.write('  Begin SubModelPartNodes\n')
            for nid in sorted(set(nids)):
                if nid in nodes:
                    f.write(f'  {nid}\n')
            f.write('  End SubModelPartNodes\n')
            f.write('End SubModelPart\n\n')

    # we don't compute or return bottom nodes anymore; return 0 for legacy
    return used_prop_ids, 0


def build_from_fpn(fpn_path: Path):
    parser = OptimizedFPNParser()
    res = parser.parse_file_streaming(str(fpn_path))

    # boundary_nodes: gid -> node_id list
    boundary_nodes: dict[int, list[int]] = {}
    singleton_nodes: set[int] = set()
    for gid, grp in (res.get('boundary_groups') or {}).items():
        nids = grp.get('nodes') or []
        if nids:
            boundary_nodes[int(gid)] = list({int(n) for n in nids})
        # nodes with explicit per-node constraints
        for c in grp.get('constraints', []) or []:
            try:
                nid = int(c.get('node')) if c.get('node') is not None else int(c.get('node_id'))
            except Exception:
                nid = None
            if nid is not None:
                singleton_nodes.add(nid)

    # load group nodes: for nodal loads (e.g., gravity uses group to indicate domain scope)
    load_group_nodes: dict[int, list[int]] = {}
    for gid, grp in (res.get('load_groups') or {}).items():
        nids = grp.get('nodes') or []
        if nids:
            load_group_nodes[int(gid)] = list({int(n) for n in nids})

    # build stage intervals and processes from FPN
    stages = (res.get('analysis_stages') or [])
    stage_count = max(1, len(stages))
    # Use 1-based stage times: [1,2), [2,3), ...
    stage_intervals: list[tuple[float, float]] = [(float(i+1), float(i+2)) for i in range(stage_count)]

    constraints_processes: list[dict] = []
    loads_processes: list[dict] = []

    def add_fix_process(nid: int, axis: int, interval: tuple[float, float]):
        var = ['DISPLACEMENT_X','DISPLACEMENT_Y','DISPLACEMENT_Z'][axis]
        constraints_processes.append({
            "python_module": "fix_scalar_value_process",
            "kratos_module": "KratosMultiphysics",
            "process_name": "FixScalarValueProcess",
            "Parameters": {
                "model_part_name": f"PorousDomain.NODE_{int(nid)}",
                "variable_name": var,
                "is_fixed": True,
                "value": 0.0,
                "interval": [float(interval[0]), float(interval[1])]
            }
        })

    def add_gravity_process(model_part_name: str, g: list[float], interval: tuple[float, float]):
        loads_processes.append({
            "python_module": "assign_vector_by_direction_process",
            "kratos_module": "KratosMultiphysics",
            "process_name": "AssignVectorByDirectionProcess",
            "Parameters": {
                "model_part_name": model_part_name,
                "variable_name": "VOLUME_ACCELERATION",
                "modulus": float((g[0]**2 + g[1]**2 + g[2]**2) ** 0.5),
                "direction": [float(g[0]), float(g[1]), float(g[2])],
                "interval": [float(interval[0]), float(interval[1])],
                "constrained": False
            }
        })

    # Build maps from FPN: gid -> node->dof for boundary constraints; and gid->gravity vector
    gid_node_dofs: dict[int, dict[int, list[bool]]] = {}
    for gid, grp in (res.get('boundary_groups') or {}).items():
        node_map: dict[int, list[bool]] = {}
        group_nodes = list({int(n) for n in (grp.get('nodes') or [])})
        for c in grp.get('constraints', []) or []:
            dof = list(c.get('dof_bools') or [])
            dof = [(bool(x)) for x in (dof + [False]*6)[:6]]
            nid_val = c.get('node') if c.get('node') is not None else c.get('node_id')
            if nid_val is None:
                # Group-level constraint: apply to all group nodes
                for nid in group_nodes:
                    if nid in node_map:
                        prev = node_map[nid]
                        node_map[nid] = [bool(prev[i] or dof[i]) for i in range(min(len(prev), len(dof)))]
                    else:
                        node_map[nid] = dof[:]  # copy
                continue
            try:
                nid = int(nid_val)
            except Exception:
                continue
            if nid in node_map:
                prev = node_map[nid]
                node_map[nid] = [bool(prev[i] or dof[i]) for i in range(min(len(prev), len(dof)))]
            else:
                node_map[nid] = dof
        if node_map:
            gid_node_dofs[int(gid)] = node_map
    # Debug: report which boundary groups have constraints collected
    try:
        print(f"[GEO] boundary groups with constraints: {sorted(gid_node_dofs.keys())[:10]}... total={len(gid_node_dofs)}")
        for gid, node_map in list(gid_node_dofs.items())[:3]:
            sample = next(iter(node_map.items()))
            print(f"[GEO]   gid={gid} nodes={len(node_map)} sample_nid={sample[0]} dof={sample[1][:6]}")
    except Exception:
        pass

    gid_gravity: dict[int, list[float]] = {}
    for gid, grp in (res.get('load_groups') or {}).items():
        g = grp.get('gravity')
        if g:
            # parser stored [gx, gy, gz]
            gid_gravity[int(gid)] = [float(g[0]), float(g[1]), float(g[2])]

    # Populate processes per stage using active lists
    if stages:
        print(f"[GEO] stages={len(stages)}")
        for sidx, st in enumerate(stages):
            interval = stage_intervals[sidx]
            cmds = st.get('group_commands') or []
            extra_bounds = []
            extra_loads = []
            for cmd in cmds:
                if cmd.get('command') == 'BADD':
                    extra_bounds.extend(cmd.get('group_ids') or [])
                if cmd.get('command') == 'LADD':
                    extra_loads.extend(cmd.get('group_ids') or [])
            active_bounds = set(st.get('active_boundaries') or []) | set(extra_bounds)
            active_loads = set(st.get('active_loads') or []) | set(extra_loads)
            try:
                print(f"[GEO] stage#{sidx+1} active_boundaries={len(active_bounds)} active_loads={len(active_loads)} ids_b={sorted(list(active_bounds))} ids_l={sorted(list(active_loads))}")
            except Exception:
                print(f"[GEO] stage#{sidx+1} active_boundaries={len(active_bounds)} active_loads={len(active_loads)}")
            # constraints from active boundaries
            for gid in sorted(active_bounds):
                has = int(gid) in gid_node_dofs
                if not has:
                    # print miss mapping
                    try:
                        print(f"[GEO]   skip gid={gid} (no constraint map)")
                    except Exception:
                        pass
                node_map = gid_node_dofs.get(int(gid))
                if not node_map:
                    continue
                cnt_before = len(constraints_processes)
                for nid, dof in node_map.items():
                    for ax in range(3):
                        if ax < len(dof) and dof[ax]:
                            add_fix_process(nid, ax, interval)
                print(f"[GEO]   gid={gid} added {len(constraints_processes)-cnt_before} fix processes")
            # loads from active loads
            for gid in sorted(active_loads):
                g = gid_gravity.get(int(gid))
                if g:
                    # if load group has explicit nodes, use that submodel part; otherwise whole domain
                    mp_name = f"PorousDomain.LSET_{int(gid)}" if load_group_nodes.get(int(gid)) else "PorousDomain"
                    add_gravity_process(mp_name, g, interval)
        print(f"[GEO] built constraints={len(constraints_processes)} loads={len(loads_processes)}")
    else:
        # No stages in FPN: apply any constraints or gravity to whole interval [0, "End"]
        interval = (0.0, 1.0)
        for gid, node_map in gid_node_dofs.items():
            for nid, dof in node_map.items():
                for ax in range(3):
                    if ax < len(dof) and dof[ax]:
                        add_fix_process(nid, ax, interval)
        for gid, g in gid_gravity.items():
            mp_name = f"PorousDomain.LSET_{int(gid)}" if load_group_nodes.get(int(gid)) else "PorousDomain"
            add_gravity_process(mp_name, g, interval)

    return {
        'boundary_nodes': boundary_nodes,
        'load_group_nodes': load_group_nodes,
        'singleton_nodes': sorted(singleton_nodes),
        'constraints_processes': constraints_processes,
        'loads_processes': loads_processes,
        'stage_intervals': stage_intervals
    }


def write_materials(used_prop_ids: set[int]):
    # Minimal Geo material set for UPw — single block with properties_id=1
    props = [
        {
            "model_part_name": "PorousDomain",
            "properties_id": 1,
            "Material": {
                "constitutive_law": {"name": "LinearElastic3DLaw"},
                "Variables": {
                    "DENSITY": 1800.0,
                    "DENSITY_SOLID": 2650.0,
                    "YOUNG_MODULUS": 1.0e7,
                    "POISSON_RATIO": 0.35,
                    "BULK_MODULUS_SOLID": 1.0e10,
                    "POROSITY": 0.4,
                    "PERMEABILITY_XX": 1.0e-9,
                    "PERMEABILITY_YY": 1.0e-9,
                    "PERMEABILITY_ZZ": 1.0e-9,
                    "PERMEABILITY_XY": 0.0,
                    "PERMEABILITY_YZ": 0.0,
                    "PERMEABILITY_ZX": 0.0,
                    "BULK_MODULUS_FLUID": 2.0e9,
                    "DENSITY_WATER": 1000.0,
                    "DYNAMIC_VISCOSITY": 1.0e-3,
                    "BIOT_COEFFICIENT": 1.0,
                    "IGNORE_UNDRAINED": False
                },
                "Tables": {}
            }
        }
    ]
    MATERIALS_JSON.write_text(json.dumps({"properties": props}, indent=2), encoding='utf-8')


def write_project_parameters(constraints_processes: list[dict], loads_processes: list[dict], stage_intervals: list[tuple[float, float]]):
    # Set end_time to cover all stages (if any)
    end_time = 1.0
    try:
        if stage_intervals:
            end_time = float(stage_intervals[-1][1])
    except Exception:
        end_time = 1.0
    params = {
        "problem_data": {
            "problem_name": "geo_run",
            "parallel_type": "OpenMP",
            "echo_level": 1,
            "start_time": 0.0,
            "end_time": end_time
        },
        "solver_settings": {
            "solver_type": "U_Pw",
            "model_part_name": "PorousDomain",
            "domain_size": 3,
            "echo_level": 1,
            "buffer_size": 2,
            "problem_domain_sub_model_part_list": [
                "porous_computational_model_part"
            ],
            "processes_sub_model_part_list": [
                "porous_computational_model_part"
            ],
            "body_domain_sub_model_part_list": [
                "porous_computational_model_part"
            ],
            "model_import_settings": {
                "input_type": "mdpa",
                "input_filename": str((NEW_MDPA.with_suffix('')).as_posix())
            },
            "material_import_settings": {
                "materials_filename": str(MATERIALS_JSON.as_posix())
            },
            "time_stepping": {"time_step": 1.0},
            "solution_type": "quasi_static",
            "max_iterations": 50,
            "linear_solver_settings": {
                "solver_type": "amgcl",
                "tolerance": 1e-8,
                "max_iteration": 500,
                "verbosity": 1,
                "krylov_type": "gmres",
                "smoother_type": "ilu0",
                "coarsening_type": "smoothed_aggregation"
            }
        },
        "processes": {
            "constraints_process_list": constraints_processes,
            "loads_process_list": loads_processes
        },
        "output_processes": {
            "vtk_output": [
                {
                    "python_module": "vtk_output_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "VtkOutputProcess",
                    "Parameters": {
                        "model_part_name": "PorousDomain",
                        "output_control_type": "step",
                        "output_interval": 1,
                        "file_format": "ascii",
                        "output_precision": 7,
                        "write_deformed_configuration": True,
                        "save_output_files_in_folder": True,
                        "output_path": str(DEST_DIR / 'VTK_Output'),
                        "nodal_solution_step_data_variables": [
                            "DISPLACEMENT", "WATER_PRESSURE", "REACTION"
                        ],
                        "gauss_point_variables_in_elements": [
                            "CAUCHY_STRESS_TENSOR", "GREEN_LAGRANGE_STRAIN_TENSOR"
                        ]
                    }
                }
            ]
        }
    }
    PROJECT_PARAMS.write_text(json.dumps(params, indent=2), encoding='utf-8')


def main():
    # Resolve actual FPN path from CLI/ENV/default; we do NOT fabricate data
    fpn_path = resolve_fpn_path()
    if not fpn_path.exists():
        raise FileNotFoundError(f"FPN not found: {fpn_path}")

    # Use mdpa converted from existing structural mdpa (geometry + connectivity), but boundaries from FPN
    src = None
    for p in SRC_CANDIDATES:
        if p.exists():
            src = p
            break
    if src is None:
        raise FileNotFoundError('No source MDPA found in expected locations')

    # Build FPN-driven constraints and boundary/load submodelparts
    fpn_result = build_from_fpn(fpn_path)

    used_prop_ids, _ = write_geo_mdpa(
        src,
        boundary_nodes=fpn_result['boundary_nodes'],
        singleton_nodes=fpn_result['singleton_nodes'],
        load_group_nodes=fpn_result['load_group_nodes'],
    )
    write_materials(used_prop_ids)
    write_project_parameters(
        fpn_result['constraints_processes'],
        fpn_result['loads_processes'],
        fpn_result['stage_intervals'],
    )

    print(f"Built Geo run in {DEST_DIR}")
    print(f"- FPN: {fpn_path}")
    print(f"- Source mdpa: {src}")
    print(f"- New mdpa: {NEW_MDPA}")
    print(f"- Materials: {MATERIALS_JSON}")
    print(f"- ProjectParameters: {PROJECT_PARAMS}")

if __name__ == '__main__':
    main()

