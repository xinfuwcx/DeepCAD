#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Parse FPN to extract truss/cable data and generate:
- anchored_with_anchors.mdpa: original mdpa + CableElement3D2N anchors
- AnchoredMaterials.json: soils (ModifiedMohrCoulomb3D) + steel cable properties
- ProjectParameters.json: two-stage analysis with 4-level prestress ramp per force group

Updates:
- Include ALL LINE prop=15 elements as anchors (≈3000 rods split into segments)
- Build anchor "chains" by connectivity (shared nodes); propagate PSTRST to the whole chain
- Remap element IDs to avoid clashes with base mdpa (start from 2000000)

Assumptions:
- FPN encoding gb18030
- LINE elements with property id 15 are truss lines; PETRUSS 15 supplies area & material id
- MATGEN 13 is steel; units: E in kPa, gamma in kN/m3; convert to SI
- PSTRST load set 2 gives element-id -> force (N) (apply to its chain)
- Base mdpa: complete_fpn_model_with_boundaries.mdpa
"""

from pathlib import Path
import json
import math
import re
from collections import defaultdict, deque

FPN_PATH = Path('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
BASE_MDPA = Path('complete_fpn_model_with_boundaries.mdpa')
OUT_DIR = Path('two_stage_analysis')
OUT_MDPA = OUT_DIR / 'two_stage.mdpa'
OUT_MATERIALS = OUT_DIR / 'Materials.json'
OUT_PARAMS = OUT_DIR / 'ProjectParameters.json'


def parse_fpn():
    line_elems = {}  # elem_id -> (prop_id, n1, n2)
    prestress = {}   # elem_id -> force_N
    petruss = None   # (prop_id, mat_id, area_m2)
    steel = None     # dict with E_Pa, nu, density_kgm3
    soils = {}       # mat_id -> dict of E_Pa, nu, density, friction, cohesion, dilatancy

    with open(FPN_PATH, 'r', encoding='gb18030', errors='ignore') as f:
        lines = f.readlines()

    # regex helpers
    line_re = re.compile(r'^\s*LINE\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)')
    pstr_re = re.compile(r'^\s*PSTRST\s*,\s*2\s*,\s*(\d+)\s*,\s*([0-9eE+\-.]+)')
    petr_re = re.compile(r'^\s*PETRUSS\s*,\s*(\d+)\s*,[^,]*,\s*\d+\s*,\s*(\d+)\s*,\s*([0-9eE+\-.]+)')
    matgen_re = re.compile(r'^\s*MATGEN\s*,\s*(\d+)\s*,\s*([0-9eE+\-.]+)\s*,\s*([0-9eE+\-.]*)\s*,\s*([0-9eE+\-.]*)\s*,\s*([0-9eE+\-.]+)\s*,\s*([0-9eE+\-.]+)')
    mnlmc_re = re.compile(r'^\s*MNLMC\s*,\s*(\d+)\s*,\s*([0-9eE+\-.]+)\s*,\s*([0-9eE+\-.]*)\s*,\s*([0-9eE+\-.]*)\s*,\s*([0-9eE+\-.]+)')

    # pass 1: collect line elements (property filter later), PSTRST, PETRUSS, materials
    for line in lines:
        m = line_re.match(line)
        if m:
            elem_id = int(m.group(1))
            prop_id = int(m.group(2))
            n1 = int(m.group(3)); n2 = int(m.group(4))
            line_elems[elem_id] = (prop_id, n1, n2)
            continue
        m = pstr_re.match(line)
        if m:
            eid = int(m.group(1)); force = float(m.group(2))
            prestress[eid] = force
            continue
        m = petr_re.match(line)
        if m:
            prop_id = int(m.group(1))
            mat_id = int(m.group(2))
            area = float(m.group(3))
            if prop_id == 15:
                petruss = (prop_id, mat_id, area)
            continue
        m = matgen_re.match(line)
        if m:
            mid = int(m.group(1))
            E_kPa = float(m.group(2)) if m.group(2) else 0.0
            # skip the next two (thermal etc.)
            nu = float(m.group(5)) if m.group(5) else 0.3
            gamma_kNm3 = float(m.group(6)) if m.group(6) else 20.0
            E_Pa = E_kPa * 1000.0
            density = gamma_kNm3 * 1000.0 / 9.80665
            soils.setdefault(mid, {})
            soils[mid].update(dict(E=E_Pa, nu=nu, density=density))
            continue
        m = mnlmc_re.match(line)
        if m:
            mid = int(m.group(1))
            phi = float(m.group(2))
            cohesion_kPa = float(m.group(5))
            soils.setdefault(mid, {})
            # 只记录ϕ与c；剪胀角ψ若FPN未提供，将在写材料时按经验规则推定
            soils[mid].update(dict(phi=phi, cohesion=cohesion_kPa*1000.0))
            continue

    # identify steel by E magnitude (>= 2e11 Pa) or by id 13 if present
    if 13 in soils and soils[13].get('E', 0) > 1e11:
        steel = dict(E=soils[13]['E'], nu=soils[13]['nu'], density=soils[13]['density'], mat_id=13)
    else:
        sid = max(soils.keys(), key=lambda k: soils[k].get('E', 0)) if soils else None
        if sid is not None:
            steel = dict(E=soils[sid]['E'], nu=soils[sid]['nu'], density=soils[sid]['density'], mat_id=sid)

    if petruss is None:
        raise RuntimeError('PETRUSS 15 not found; cannot determine cable area/material')

    # Build anchors: ALL LINE with prop 15
    anchors_all = {}  # eid -> (n1,n2)
    node_to_elems = defaultdict(list)
    for eid, (prop, n1, n2) in line_elems.items():
        if prop == 15:
            anchors_all[eid] = (n1, n2)
            node_to_elems[n1].append(eid)
            node_to_elems[n2].append(eid)

    # Build connected components (each is one anchor chain)
    comp_id_of_elem = {}
    components = []  # list of list[eid]
    visited = set()
    for eid in anchors_all:
        if eid in visited: continue
        stack = [eid]; visited.add(eid); comp = [eid]
        while stack:
            cur = stack.pop()
            n1, n2 = anchors_all[cur]
            for n in (n1, n2):
                for nb in node_to_elems[n]:
                    if nb not in visited:
                        visited.add(nb); stack.append(nb); comp.append(nb)
        cid = len(components)
        for e in comp:
            comp_id_of_elem[e] = cid
        components.append(comp)

    # Map prestress to component
    comp_force = {}  # comp_id -> force N
    for eid, F in prestress.items():
        if eid in comp_id_of_elem:
            cid = comp_id_of_elem[eid]
            comp_force[cid] = F

    return {
        'anchors_all': anchors_all,  # all anchor elements (segments)
        'components': components,    # list of chains
        'comp_force': comp_force,    # only chains with PSTRST
        'prestress': prestress,      # raw map
        'area_m2': petruss[2],
        'steel': steel,
        'soils': soils
    }


def write_mdpa_with_anchors(parsed):
    OUT_DIR.mkdir(exist_ok=True)
    base = BASE_MDPA.read_text(encoding='utf-8')

    anchors_all = parsed['anchors_all']

    # properties for cables
    steel = parsed['steel']
    A = parsed['area_m2']
    prop_id = 9001
    prop_block = []
    prop_block.append('Begin Properties {}\n'.format(prop_id))
    prop_block.append('    YOUNG_MODULUS {}\n'.format(steel['E']))
    prop_block.append('    POISSON_RATIO {}\n'.format(steel['nu']))
    prop_block.append('    DENSITY {}\n'.format(steel['density']))
    prop_block.append('    CROSS_AREA {}\n'.format(A))
    prop_block.append('End Properties\n')

    # assign new unique ids for anchor elements to avoid clashes
    id_offset = 2000000
    new_id = {}
    for eid in anchors_all.keys():
        new_id[eid] = id_offset
        id_offset += 1

    # elements block (all anchors)
    elem_block = []
    elem_block.append('Begin Elements CableElement3D2N\n')
    for old_eid, (n1, n2) in parsed['anchors_all'].items():
        elem_block.append('    {} {} {} {}\n'.format(new_id[old_eid], prop_id, n1, n2))
    elem_block.append('End Elements\n')

    # submodel parts for anchors and groups by force value (propagated to entire chain)
    groups = defaultdict(list)  # force -> list of new element ids

    # Master group with all anchors
    all_new_eids = sorted(new_id.values())

    # Build groups by component force and reverse mapping
    reverse_new_id = {}  # new_eid -> old_eid
    for cid, comp in enumerate(parsed['components']):
        if cid in parsed['comp_force']:
            F = int(round(parsed['comp_force'][cid]))
            for old_eid in comp:
                new_eid = new_id[old_eid]
                groups[F].append(new_eid)
                reverse_new_id[new_eid] = old_eid

    smp_blocks = []

    # 收集所有锚杆节点
    all_anchor_nodes = set()
    for n1, n2 in anchors_all.values():
        all_anchor_nodes.add(n1)
        all_anchor_nodes.add(n2)
    all_anchor_nodes_sorted = sorted(all_anchor_nodes)

    # master group
    smp_blocks.append('Begin SubModelPart ANCHORS\n')
    smp_blocks.append('  Begin SubModelPartNodes\n')
    for i in range(0, len(all_anchor_nodes_sorted), 16):
        smp_blocks.append('    {}\n'.format(' '.join(str(x) for x in all_anchor_nodes_sorted[i:i+16])))
    smp_blocks.append('  End SubModelPartNodes\n')
    smp_blocks.append('  Begin SubModelPartElements\n')
    for i in range(0, len(all_new_eids), 16):
        smp_blocks.append('    {}\n'.format(' '.join(str(x) for x in all_new_eids[i:i+16])))
    smp_blocks.append('  End SubModelPartElements\n')
    smp_blocks.append('End SubModelPart\n')

    for F, eids in groups.items():
        name = f'ANCHORS_{F}N'
        # 收集该组的节点
        group_nodes = set()
        for eid in eids:
            old_eid = reverse_new_id[eid]  # 找到原始单元ID
            n1, n2 = anchors_all[old_eid]
            group_nodes.add(n1)
            group_nodes.add(n2)
        group_nodes_sorted = sorted(group_nodes)

        smp_blocks.append(f'Begin SubModelPart {name}\n')
        smp_blocks.append('  Begin SubModelPartNodes\n')
        for i in range(0, len(group_nodes_sorted), 16):
            smp_blocks.append('    {}\n'.format(' '.join(str(x) for x in group_nodes_sorted[i:i+16])))
        smp_blocks.append('  End SubModelPartNodes\n')
        smp_blocks.append('  Begin SubModelPartElements\n')
        eids_sorted = sorted(eids)
        for i in range(0, len(eids_sorted), 16):
            smp_blocks.append('    {}\n'.format(' '.join(str(x) for x in eids_sorted[i:i+16])))
        smp_blocks.append('  End SubModelPartElements\n')
        smp_blocks.append('End SubModelPart\n')

    # collect far-end nodes (one per anchor chain) for fixed constraints
    # strategy:
    #  - compute degree of each node within anchors graph
    #  - endpoints have deg==1; choose the endpoint NOT used by solid elements as far-end
    deg = {}
    for (n1, n2) in anchors_all.values():
        deg[n1] = deg.get(n1, 0) + 1
        deg[n2] = deg.get(n2, 0) + 1

    # collect solid-element node ids from base mdpa
    solid_nodes = set()
    lines = base.splitlines()
    mode = None
    for ln in lines:
        if ln.startswith('Begin Elements SmallDisplacementElement3D4N'):
            mode = 'solids'; continue
        if ln.startswith('End Elements') and mode == 'solids':
            mode = None; continue
        if mode == 'solids':
            parts = ln.split()
            if len(parts) >= 6 and parts[0].isdigit():
                try:
                    ids = list(map(int, parts))
                    solid_nodes.update(ids[2:])
                except Exception:
                    pass

    # use components to pick 1 far-end per chain
    components = parsed['components']
    anchor_end_nodes = set()
    for comp in components:
        comp_nodes = set()
        for eid in comp:
            n1, n2 = anchors_all[eid]
            comp_nodes.add(n1); comp_nodes.add(n2)
        endpoints = [n for n in comp_nodes if deg.get(n, 0) == 1]
        far = None
        if endpoints:
            # prefer endpoint not in solids (far-end)
            not_in_solids = [n for n in endpoints if n not in solid_nodes]
            if not_in_solids:
                far = not_in_solids[0]
            else:
                far = endpoints[0]
        if far is not None:
            anchor_end_nodes.add(far)

    # add ANCHOR_ENDS submodelpart for fixed constraints (≈ number of chains)
    if anchor_end_nodes:
        anchor_ends_sorted = sorted(anchor_end_nodes)
        smp_blocks.append('Begin SubModelPart ANCHOR_ENDS\n')
        smp_blocks.append('  Begin SubModelPartNodes\n')
        for i in range(0, len(anchor_ends_sorted), 16):
            smp_blocks.append('    {}\n'.format(' '.join(str(x) for x in anchor_ends_sorted[i:i+16])))
        smp_blocks.append('  End SubModelPartNodes\n')
        smp_blocks.append('  Begin SubModelPartElements\n')
        smp_blocks.append('  End SubModelPartElements\n')
        smp_blocks.append('End SubModelPart\n')

    # add ISOLATED_NODES submodelpart for nodes not referenced by any element
    node_ids = set(); used_ids = set()
    lines = base.splitlines()
    mode = None
    for ln in lines:
        if ln.startswith('Begin Nodes'):
            mode = 'nodes'; continue
        if ln.startswith('End Nodes') and mode == 'nodes':
            mode = None; continue
        if ln.startswith('Begin Elements SmallDisplacementElement3D4N'):
            mode = 'solids'; continue
        if ln.startswith('End Elements') and mode == 'solids':
            mode = None; continue
        if mode == 'nodes':
            parts = ln.split()
            if parts and parts[0].isdigit():
                node_ids.add(int(parts[0]))
        elif mode == 'solids':
            parts = ln.split()
            if len(parts) >= 6 and parts[0].isdigit():
                # id prop n1 n2 n3 n4
                try:
                    ids = list(map(int, parts))
                    used_ids.update(ids[2:])
                except Exception:
                    pass
    # also mark cable endpoints as used
    for (n1, n2) in anchors_all.values():
        used_ids.add(n1); used_ids.add(n2)
    iso = sorted(node_ids - used_ids)
    if iso:
        smp_blocks.append('Begin SubModelPart ISOLATED_NODES\n')
        smp_blocks.append('  Begin SubModelPartNodes\n')
        for i in range(0, len(iso), 16):
            smp_blocks.append('    {}\n'.format(' '.join(str(x) for x in iso[i:i+16])))
        smp_blocks.append('  End SubModelPartNodes\n')
        smp_blocks.append('  Begin SubModelPartElements\n')
        smp_blocks.append('  End SubModelPartElements\n')
        smp_blocks.append('End SubModelPart\n')

    new_mdpa = []
    new_mdpa.append(base)
    new_mdpa.append('\n'.join(prop_block))
    new_mdpa.append('\n'.join(elem_block))
    new_mdpa.append('\n'.join(smp_blocks))

    OUT_MDPA.write_text(''.join(new_mdpa), encoding='utf-8')
    return groups, A, steel


def write_materials(parsed, steel_info):
    soils = parsed['soils']
    mats = []
    # Only write materials for MAT_* submodel parts that actually exist in mdpa
    mdpa_text = OUT_MDPA.read_text(encoding='utf-8')
    mdpa_mat_ids = set(int(m) for m in re.findall(r"Begin SubModelPart\s+MAT_(\d+)", mdpa_text))

    for mid, d in soils.items():
        if mid not in mdpa_mat_ids:
            continue
        # 使用修正摩尔-库仑（小应变各向同性塑性）作为弹塑性土模型；否则线弹性
        use_plastic = ('phi' in d and 'cohesion' in d)
        law = 'SmallStrainIsotropicPlasticity3DModifiedMohrCoulombModifiedMohrCoulomb' if use_plastic else 'LinearElastic3D'
        entry = {
            'model_part_name': f'Structure.MAT_{mid}',
            'properties_id': mid,
            'Material': {
                'constitutive_law': { 'name': law },
                'Variables': {
                    'YOUNG_MODULUS': d.get('E', 1e7),
                    'POISSON_RATIO': d.get('nu', 0.3),
                    'DENSITY': d.get('density', 2000.0)
                }
            }
        }
        # Always put FRACTURE_ENERGY to satisfy CLA checks even for linear elastic (harmless extra var)
        entry['Material']['Variables']['FRACTURE_ENERGY'] = 1.0e12

        if use_plastic:
            # From Mohr-Coulomb: convert cohesion/phi to uniaxial yield strengths
            phi_deg = d.get('phi', 25.0)
            coh = d.get('cohesion', 0.0)
            # CLA 某些实现对 φ<=0 视为"未定义"，会回退为32°；因此给个极小值避免警告
            phi_eff = max(phi_deg, 0.1)
            phi_rad = math.radians(phi_eff)
            s = math.sin(phi_rad)
            c = math.cos(phi_rad)
            eps = 1e-12
            sigma_t = 2.0 * coh * c / (1.0 + s + eps)  # tensile yield stress
            sigma_c = 2.0 * coh * c / max(1.0 - s, eps)  # compressive yield stress
            # 经验：若未提供ψ，则ψ = max(0, φ - 10°)，并限制 ψ ≤ φ_eff
            psi_deg = d.get('dilatancy', None)
            if psi_deg is None:
                psi_deg = max(0.0, phi_eff - 10.0)
            psi_deg = max(0.0, min(psi_deg, phi_eff))
            entry['Material']['Variables'].update({
                # 写两套键，兼容 CLA 不同实现的参数名
                'FRICTION_ANGLE': phi_eff,
                'INTERNAL_FRICTION_ANGLE': phi_eff,
                'DILATANCY_ANGLE': psi_deg,
                'COHESION': coh,
                # 必需：0=理想塑性；该积分器要求该字段
                'HARDENING_CURVE': 0,
                # CLA 对 ModifiedMohrCoulomb 积分器的检查需要以下变量
                'YIELD_STRESS_TENSION': sigma_t,
                'YIELD_STRESS_COMPRESSION': sigma_c
            })
        mats.append(entry)

    # Add material entry for anchors property 9001 (TrussConstitutiveLaw for cable/truss family)
    # Attach to ANCHORS submodelpart to avoid parent/child override conflicts
    mats.append({
        'model_part_name': 'Structure.ANCHORS',
        'properties_id': 9001,
        'Material': {
            'constitutive_law': { 'name': 'TrussConstitutiveLaw' },
            'Variables': {
                'YOUNG_MODULUS': steel_info['E'],
                'POISSON_RATIO': steel_info['nu'],
                'DENSITY': steel_info['density']
            }
        }
    })

    OUT_MATERIALS.write_text(json.dumps({ 'properties': mats }, indent=2), encoding='utf-8')


def write_params(groups, A, steel):
    # build 4-stage processes for each force group (value in N)
    def group_name(F):
        return f'ANCHORS_{F}N'

    loads_process = []
    # gravity
    loads_process.append({
        'python_module': 'assign_vector_by_direction_process',
        'kratos_module': 'KratosMultiphysics',
        'process_name': 'AssignVectorByDirectionProcess',
        'Parameters': {
            'model_part_name': 'Structure',
            'variable_name': 'VOLUME_ACCELERATION',
            'modulus': 9.80665,
            'direction': [0.0, -1.0, 0.0],
            'constrained': False,
            'interval': [0.0, 1.0]
        }
    })
    # baseline tiny pretension for all cables to avoid slack-induced singularity
    sigma_min = 1.0e4  # Pa
    loads_process.append({
        'python_module': 'assign_scalar_variable_to_elements_process',
        'kratos_module': 'KratosMultiphysics',
        'process_name': 'AssignScalarVariableToElementsProcess',
        'Parameters': {
            'model_part_name': f'Structure.{group_name(0)}'.replace('ANCHORS_0N','ANCHORS'),
            'variable_name': 'TRUSS_PRESTRESS_PK2',
            'value': sigma_min,
            'interval': [0.0, 'End']
        }
    })
    # 4-level ramp for each prestress group (start at t=0)
    ramps = [ (0.00,0.25,0.25), (0.25,0.50,0.50), (0.50,0.75,0.75), (0.75,1.00,1.00) ]
    for F, eids in groups.items():
        sigma = F / A  # Pa
        for t0,t1,alpha in ramps:
            loads_process.append({
                'python_module': 'assign_scalar_variable_to_elements_process',
                'kratos_module': 'KratosMultiphysics',
                'process_name': 'AssignScalarVariableToElementsProcess',
                'Parameters': {
                    'model_part_name': f'Structure.{group_name(F)}',
                    'variable_name': 'TRUSS_PRESTRESS_PK2',
                    'value': alpha * sigma,
                    'interval': [t0, t1]
                }
            })

    params = {
        'problem_data': {
            'problem_name': 'anchored_two_stage_cable_prestress',
            'parallel_type': 'OpenMP',
            'echo_level': 2,
            'start_time': 0.0,
            'end_time': 2.0
        },
        'solver_settings': {
            'solver_type': 'Static',
            'model_part_name': 'Structure',
            'domain_size': 3,
            'echo_level': 2,
            'analysis_type': 'non_linear',
            'model_import_settings': {
                'input_type': 'mdpa',
                # Use stem only; run script chdirs into analysis dir
                'input_filename': OUT_MDPA.stem
            },
            'material_import_settings': {
                'materials_filename': OUT_MATERIALS.name
            },
            'time_stepping': { 'time_step': 0.25 },
            'solving_strategy_settings': {
                'type': 'line_search',
                'max_iteration': 50,
                'convergence_criterion': 'and_criterion',
                'displacement_relative_tolerance': 1e-3,
                'residual_relative_tolerance': 1e-3
            }
        },
        'processes': {
            'constraints_process_list': [
                {
                    'python_module': 'assign_vector_variable_process',
                    'kratos_module': 'KratosMultiphysics',
                    'process_name': 'AssignVectorVariableProcess',
                    'Parameters': {
                        'model_part_name': 'Structure.BOTTOM_SUPPORT',
                        'variable_name': 'DISPLACEMENT',
                        'constrained': [True, True, True],
                        'value': [0.0, 0.0, 0.0],
                        'interval': [0.0, 'End']
                    }
                },
                {
                    'python_module': 'assign_vector_variable_process',
                    'kratos_module': 'KratosMultiphysics',
                    'process_name': 'AssignVectorVariableProcess',
                    'Parameters': {
                        'model_part_name': 'Structure.BOUNDARY_8_111000',
                        'variable_name': 'DISPLACEMENT',
                        'constrained': [True, True, True],
                        'value': [0.0, 0.0, 0.0],
                        'interval': [0.0, 'End']
                    }
                },
                {
                    'python_module': 'assign_vector_variable_process',
                    'kratos_module': 'KratosMultiphysics',
                    'process_name': 'AssignVectorVariableProcess',
                    'Parameters': {
                        'model_part_name': 'Structure.BOUNDARY_8_100000',
                        'variable_name': 'DISPLACEMENT',
                        'constrained': [True, False, False],
                        'value': [0.0, 0.0, 0.0],
                        'interval': [0.0, 'End']
                    }
                },
                {
                    'python_module': 'assign_vector_variable_process',
                    'kratos_module': 'KratosMultiphysics',
                    'process_name': 'AssignVectorVariableProcess',
                    'Parameters': {
                        'model_part_name': 'Structure.BOUNDARY_8_010000',
                        'variable_name': 'DISPLACEMENT',
                        'constrained': [False, True, False],
                        'value': [0.0, 0.0, 0.0],
                        'interval': [0.0, 'End']
                    }
                },
                {
                    'python_module': 'assign_vector_variable_process',
                    'kratos_module': 'KratosMultiphysics',
                    'process_name': 'AssignVectorVariableProcess',
                    'Parameters': {
                        'model_part_name': 'Structure.ANCHOR_ENDS',
                        'variable_name': 'DISPLACEMENT',
                        'constrained': [True, True, True],
                        'value': [0.0, 0.0, 0.0],
                        'interval': [0.0, 'End']
                    }
                },
                # 为锚杆中间节点添加Y方向约束，防止奇异矩阵
                {
                    'python_module': 'assign_vector_variable_process',
                    'kratos_module': 'KratosMultiphysics',
                    'process_name': 'AssignVectorVariableProcess',
                    'Parameters': {
                        'model_part_name': 'Structure.ANCHORS',
                        'variable_name': 'DISPLACEMENT',
                        'constrained': [False, True, False],  # 只约束Y方向
                        'value': [0.0, 0.0, 0.0],
                        'interval': [0.0, 'End']
                    }
                }
            ],
            'loads_process_list': loads_process
        },
        'output_processes': {
            'vtk_output': [{
                'python_module': 'vtk_output_process',
                'kratos_module': 'KratosMultiphysics',
                'process_name': 'VtkOutputProcess',
                'Parameters': {
                    'model_part_name': 'Structure',
                    'output_control_type': 'step',
                    'output_interval': 1,
                    'file_format': 'ascii',
                    'output_precision': 7,
                    'output_sub_model_parts': True,
                    'output_path': 'VTK_Output',
                    'save_output_files_in_folder': True,
                    'nodal_solution_step_data_variables': [ 'DISPLACEMENT', 'REACTION' ],
                    'element_data_value_variables': [ 'VON_MISES_STRESS' ]
                }
            }]
        }
    }

    OUT_PARAMS.write_text(json.dumps(params, indent=2), encoding='utf-8')


def main():
    parsed = parse_fpn()
    groups, A, steel = write_mdpa_with_anchors(parsed)
    write_materials(parsed, steel)
    write_params(groups, A, steel)
    print('✅ Generated:')
    print(' -', OUT_MDPA)
    print(' -', OUT_MATERIALS)
    print(' -', OUT_PARAMS)
    print('Anchors (segments):', len(parsed['anchors_all']))
    print('Anchor chains (≈rods):', len(parsed['components']))
    print('Prestressed chains:', len(parsed['comp_force']))
    print('Groups:', ', '.join(f'{k}N({len(v)})' for k,v in sorted(groups.items())))

if __name__ == '__main__':
    main()

