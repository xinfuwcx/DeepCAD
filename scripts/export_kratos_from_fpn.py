import json
from pathlib import Path
import sys
import os
from typing import Dict, Any, List, Tuple

# Use example2 parser
sys.path.insert(0, str(Path('example2')))
from core.optimized_fpn_parser import OptimizedFPNParser

OUT_DIR = Path('example2/out/kratos_full')
MODEL_NAME = 'excavation_model'

# Config
# 0 or negative means no sampling (full elements)
SAMPLE_MAX_ELEMS = int(os.environ.get('FPN_SAMPLE_MAX_ELEMS', '0'))
BOTTOM_Z_EPS = 1e-6


def unify_nodes_elements(res: Dict[str, Any]) -> Tuple[List[Dict], List[Dict]]:
    nodes_raw = res.get('nodes', [])
    elements_raw = res.get('elements', [])
    if isinstance(nodes_raw, dict):
        nodes = [nodes_raw[nid] for nid in sorted(nodes_raw.keys())]
    else:
        nodes = list(nodes_raw)
    if isinstance(elements_raw, dict):
        elements = [elements_raw[eid] for eid in sorted(elements_raw.keys())]
    else:
        elements = list(elements_raw)
    return nodes, elements


def build_material_element_map(elements: List[Dict]) -> Dict[int, List[int]]:
    """返回 material_id -> mdpa_element_id 列表的映射（mdpa元素序号从1递增）"""
    mat_map: Dict[int, List[int]] = {}
    mdpa_id = 1
    for e in elements:
        mid = int(e.get('material_id', 0) or 0)
        if mid:
            mat_map.setdefault(mid, []).append(mdpa_id)
        mdpa_id += 1
    return mat_map


def write_mdpa(nodes: List[Dict], elements: List[Dict], out_path: Path, subparts_nodes: Dict[str, List[int]], material_parts: Dict[int, List[int]]):
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('Begin ModelPartData\n')
        f.write('End ModelPartData\n\n')
        # Single properties for now
        f.write('Begin Properties 1\n')
        f.write('End Properties\n\n')
        # Nodes
        f.write('Begin Nodes\n')
        for n in nodes:
            f.write(f"{n['id']} {n['x']} {n['y']} {n['z']}\n")
        f.write('End Nodes\n\n')
        # Elements (SmallDisplacementElement3D4N)
        f.write('Begin Elements SmallDisplacementElement3D4N\n')
        for i, e in enumerate(elements, start=1):
            conn = e.get('nodes', [])
            if len(conn) == 4:
                f.write(f"{i} 1 {conn[0]} {conn[1]} {conn[2]} {conn[3]}\n")
        f.write('End Elements\n\n')
        # SubModelParts for boundary groups and anchor nodes
        for name, node_ids in subparts_nodes.items():
            if not node_ids:
                continue
            f.write(f'Begin SubModelPart {name}\n')
            f.write('  Begin SubModelPartNodes\n')
            for nid in node_ids:
                f.write(f"  {nid}\n")
            f.write('  End SubModelPartNodes\n')
            f.write('End SubModelPart\n\n')
        # SubModelParts for material activation (elements)
        for mid, elem_ids in material_parts.items():
            if not elem_ids:
                continue
            name = f"MAT_{mid}"
            f.write(f'Begin SubModelPart {name}\n')
            f.write('  Begin SubModelPartElements\n')
            for eid in elem_ids:
                f.write(f"  {eid}\n")
            f.write('  End SubModelPartElements\n')
            f.write('End SubModelPart\n\n')


# patch function removed; we now write submodelparts directly in write_mdpa


def write_materials(out_path: Path, density: float = 2000.0, young: float = 3.0e10, nu: float = 0.2, gvec=(0.0, 0.0, -9.81)):
    materials = {
        "properties": [
            {
                "model_part_name": "Structure",
                "properties_id": 1,
                "Material": {
                    "constitutive_law": {"name": "LinearElastic3DLaw"},
                    "Variables": {
                        "DENSITY": density,
                        "YOUNG_MODULUS": young,
                        "POISSON_RATIO": nu,
                        "VOLUME_ACCELERATION": list(gvec)
                    },
                    "Tables": {}
                }
            }
        ]
    }
    out_path.write_text(json.dumps(materials, indent=2), encoding='utf-8')


def write_project_parameters(out_path: Path, constraints_processes: List[Dict], stage_intervals: List[Tuple[float, float]], active_groups_per_stage: List[Dict[str, List[int]]], stage_nodal_forces: List[Dict[int, Tuple[float, float, float]]]):
    # map stages to intervals and generate activation processes for materials/boundaries and prestress nodal loads
    loads_processes: List[Dict] = []
    constraints_processes = list(constraints_processes)  # base copy

    # Stage-wise: material activation (ACTIVE flag) and boundaries
    for sidx, interval in enumerate(stage_intervals):
        groups = active_groups_per_stage[sidx]
        # Materials ACTIVE
        for mid in groups.get('materials', []):
            loads_processes.append({
                "python_module": "assign_flag_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignFlagProcess",
                "Parameters": {
                    "model_part_name": f"Structure.MAT_{mid}",
                    "flag_name": "ACTIVE",
                    "value": True,
                    "interval": list(interval)
                }
            })
        # Boundary constraints
        for bid in groups.get('boundaries', []):
            constraints_processes.append({
                "python_module": "assign_vector_variable_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorVariableProcess",
                "Parameters": {
                    "model_part_name": f"Structure.BSET_{bid}",
                    "variable_name": "DISPLACEMENT",
                    "constrained": [True, True, True],
                    "value": [0.0, 0.0, 0.0],
                    "interval": list(interval)
                }
            })
        # Prestress nodal forces as POINT_LOAD via per-node process on single-node SubModelPart
        nodal_map = stage_nodal_forces[sidx] if sidx < len(stage_nodal_forces) else {}
        for nid, vec in nodal_map.items():
            loads_processes.append({
                "python_module": "assign_vector_variable_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorVariableProcess",
                "Parameters": {
                    "model_part_name": f"Structure.NODE_{int(nid)}",
                    "variable_name": "POINT_LOAD",
                    "value": [float(vec[0]), float(vec[1]), float(vec[2])],
                    "interval": list(interval)
                }
            })

    end_time = stage_intervals[-1][1] if stage_intervals else 1.0

    params = {
        "problem_data": {
            "problem_name": "excavation_analysis",
            "echo_level": 1,
            "parallel_type": "OpenMP",
            "start_time": 0.0,
            "end_time": end_time
        },
        "solver_settings": {
            "solver_type": "Static",
            "model_part_name": "Structure",
            "domain_size": 3,
            "echo_level": 1,
            "analysis_type": "non_linear",
            "model_import_settings": {
                "input_type": "mdpa",
                "input_filename": MODEL_NAME
            },
            "material_import_settings": {
                "materials_filename": "materials.json"
            },
            "time_stepping": {
                "time_step": 1.0
            },
            "max_iteration": 50,
            "reform_dofs_at_each_step": False,
            "compute_reactions": True,
            "line_search": False,
            "convergence_criterion": "residual_criterion",
            "residual_relative_tolerance": 1e-5,
            "residual_absolute_tolerance": 1e-9,
            "linear_solver_settings": {
                "solver_type": "bicgstab",
                "max_iteration": 500,
                "tolerance": 1e-8,
                "preconditioner_type": "ilu0"
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
                        "model_part_name": "Structure",
                        "file_format": "binary",
                        "output_interval": 1,
                        "output_control_type": "step",
                        "write_ids": True,
                        "nodal_solution_step_data_variables": ["DISPLACEMENT"],
                        "gauss_point_variables_in_elements": []
                    }
                }
            ]
        }
    }
    out_path.write_text(json.dumps(params, indent=2), encoding='utf-8')


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fpn_path = Path('example2/data/两阶段计算2.fpn')
    print('Reading FPN:', fpn_path)
    parser = OptimizedFPNParser()
    res = parser.parse_file_streaming(str(fpn_path))
    nodes, elements_all = unify_nodes_elements(res)

    # no synthetic bottom selection; boundaries come from FPN

    # full or sampled elements depending on config
    if SAMPLE_MAX_ELEMS > 0 and len(elements_all) > SAMPLE_MAX_ELEMS:
        elements = elements_all[:SAMPLE_MAX_ELEMS]
        print(f"Sampling elements: {len(elements_all)} -> {len(elements)}")
    else:
        elements = elements_all
        print(f"Using full elements: {len(elements)}")

    # assemble submodelparts from FPN boundary groups and anchor nodes for nodal loads
    subparts_nodes = {}
    for gid, grp in (res.get('boundary_groups', {}) or {}).items():
        node_ids = grp.get('nodes', []) or []
        if node_ids:
            subparts_nodes[f"BSET_{gid}"] = node_ids

    # prepare single-node submodelparts for all nodes to support nodal loads
    for n in nodes:
        nid = int(n['id'])
        subparts_nodes[f"NODE_{nid}"] = [nid]

    # write mdpa with submodelparts
    mdpa_path = OUT_DIR / f"{MODEL_NAME}.mdpa"
    # material parts by material_id for staged activation
    mat_parts = build_material_element_map(elements)

    write_mdpa(nodes, elements, mdpa_path, subparts_nodes, mat_parts)

    # build constraints processes from boundary groups (default: fully fixed)
    constraints = []
    for gid in sorted((res.get('boundary_groups') or {}).keys()):
        name = f"Structure.BSET_{gid}"
        constraints.append({
            "python_module": "assign_vector_variable_process",
            "kratos_module": "KratosMultiphysics",
            "process_name": "AssignVectorVariableProcess",
            "Parameters": {
                "model_part_name": name,
                "variable_name": "DISPLACEMENT",
                "constrained": [True, True, True],
                "value": [0.0, 0.0, 0.0],
                "interval": [0.0, "End"]
            }
        })

    # map analysis stages to time intervals [i, i+1)
    stages = res.get('analysis_stages', []) or []
    stage_intervals = [(i+1.0, i+2.0) for i in range(len(stages))]
    active_groups_per_stage = []
    for st in stages:
        active_groups_per_stage.append({
            'materials': sorted(set(st.get('active_materials', []) or [])),
            'boundaries': sorted(set(st.get('active_boundaries', []) or [])),
            'loads': sorted(set(st.get('active_loads', []) or [])),
        })
    # Fallback: if no stages found, create a single stage to host prestress
    if not stage_intervals:
        stage_intervals = [(1.0, 2.0)]
        active_groups_per_stage = [{'materials': [], 'boundaries': [], 'loads': []}]

    # Hard-stop if any defined stage has no active materials (per user policy)
    if stages:
        empty_material_stages = [i for i, g in enumerate(active_groups_per_stage) if not g.get('materials')]
        if empty_material_stages:
            details = []
            for i in empty_material_stages:
                name = stages[i].get('name', f'Stage_{i+1}')
                details.append(f"#{i+1}('{name}')")
            raise RuntimeError(
                "检测到分析步激活材料为空，已中止导出: " + ", ".join(details) +
                "。请在该阶段指定至少一个激活材料组，或调整施工阶段定义。")

    # write materials & params
    write_materials(OUT_DIR / 'materials.json')
    # Build stage-wise nodal forces from prestress
    # Aggregate PSTRST items by stage index derived from load_set if stages exist
    prestress_items = res.get('prestress_loads', []) or []
    line_elems = {le['id']: le for le in (res.get('line_elements') or {}).values()} if isinstance(res.get('line_elements'), dict) else {}
    # node coords
    nid2xyz = {int(n['id']): (n['x'], n['y'], n['z']) for n in nodes}

    def unit_vec(a, b):
        import math
        dx, dy, dz = b[0]-a[0], b[1]-a[1], b[2]-a[2]
        L = math.sqrt(dx*dx+dy*dy+dz*dz) or 1.0
        return (dx/L, dy/L, dz/L)

    # build map stage_index -> {node_id: vec3}
    stage_nodal_forces: List[Dict[int, Tuple[float, float, float]]] = [dict() for _ in stage_intervals]

    # heuristic: map load_set to nearest stage index (1-based load_set -> 0-based stage idx)
    for it in prestress_items:
        load_set = int(it.get('group') or it.get('load_set') or 1)
        elem_id = int(it.get('element_id'))
        force = float(it.get('force') or it.get('value'))
        # stage index
        sidx = min(max(load_set-1, 0), len(stage_intervals)-1) if stage_intervals else 0
        le = line_elems.get(elem_id)
        if not le:
            continue
        n1, n2 = le['n1'], le['n2']
        a, b = nid2xyz.get(n1), nid2xyz.get(n2)
        if not a or not b:
            continue
        ex, ey, ez = unit_vec(a, b)
        # accumulate
        for nid, sign in ((n1, 1.0), (n2, -1.0)):
            fx, fy, fz = force*sign*ex, force*sign*ey, force*sign*ez
            acc = stage_nodal_forces[sidx].get(nid, (0.0, 0.0, 0.0))
            stage_nodal_forces[sidx][nid] = (acc[0]+fx, acc[1]+fy, acc[2]+fz)

    write_project_parameters(OUT_DIR / 'ProjectParameters.json', constraints, stage_intervals, active_groups_per_stage, stage_nodal_forces)

    print('Exported to:', OUT_DIR)
    print('MDPA:', mdpa_path)


if __name__ == '__main__':
    main()

