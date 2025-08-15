import os
import sys
import json
from pathlib import Path
from typing import List, Dict

# Limit threads for predictable timing
os.environ.setdefault("OMP_NUM_THREADS", "8")

# Ensure project root is importable first (top-level 'core')
THIS_FILE = Path(__file__).resolve()
EXAMPLE2_DIR = THIS_FILE.parents[1]
PROJECT_ROOT = THIS_FILE.parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(EXAMPLE2_DIR) not in sys.path:
    sys.path.insert(0, str(EXAMPLE2_DIR))

from example2.core.optimized_fpn_parser import OptimizedFPNParser
import core  # top-level project's KratosIntegration

ROOT = EXAMPLE2_DIR  # .../example2
OUT_DIR = ROOT / "output" / "kratos_run"
MDPA = OUT_DIR / "model.mdpa"
PP = OUT_DIR / "ProjectParameters.json"
MATERIALS = OUT_DIR / "materials.json"
VTK_DIR = OUT_DIR / "vtk_output"
FPN_PATH = ROOT / "data" / "两阶段计算2.fpn"


def parse_fpn(path: Path) -> Dict:
    p = OptimizedFPNParser()
    data = p.parse_file_streaming(str(path))
    return data


def build_id_map(nodes: List[Dict]) -> Dict[int, int]:
    return {int(n.get("id")): i + 1 for i, n in enumerate(nodes)}


def select_bottom_nodes(nodes: List[Dict]) -> List[int]:
    if not nodes:
        return []
    z_min = min(float(n.get("z", 0.0)) for n in nodes)
    tol = abs(z_min) * 0.01 if z_min != 0 else 100.0
    return [int(n.get("id")) for n in nodes if abs(float(n.get("z", 0.0)) - z_min) <= tol]


def write_mdpa(nodes: List[Dict], elements: List[Dict]):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    id_map = build_id_map(nodes)

    # Collect body tetras only (speed + robustness)
    body = []
    for el in elements:
        conn = el.get("nodes") or []
        if len(conn) == 4:
            try:
                mapped = [id_map[int(x)] for x in conn]
            except Exception:
                continue
            body.append((int(el.get("id", 0)), mapped))

    bottom_orig = select_bottom_nodes(nodes)
    bottom = [id_map[i] for i in bottom_orig if i in id_map][:1000]

    with MDPA.open("w", encoding="utf-8") as f:
        f.write("Begin ModelPartData\nEnd ModelPartData\n\n")
        # Properties for solids
        f.write("Begin Properties 1\n")
        f.write("  DENSITY 2.0e+03\n  YOUNG_MODULUS 3.0e+07\n  POISSON_RATIO 0.28\n  CONSTITUTIVE_LAW_NAME LinearElastic3DLaw\n")
        f.write("End Properties\n\n")

        f.write("Begin Nodes\n")
        for old_id, new_id in id_map.items():
            n = next((x for x in nodes if int(x.get("id", 0)) == old_id), None)
            if n is None:
                continue
            f.write(f"{new_id} {float(n.get('x',0.0))} {float(n.get('y',0.0))} {float(n.get('z',0.0))}\n")
        f.write("End Nodes\n\n")

        f.write("Begin Elements SmallDisplacementElement3D4N\n")
        for eid, conn in body:
            f.write(f"{eid} 1 {conn[0]} {conn[1]} {conn[2]} {conn[3]}\n")
        f.write("End Elements\n\n")

        if bottom:
            f.write("Begin SubModelPart DISPLACEMENT_boundary\n")
            f.write("  Begin SubModelPartNodes\n")
            for i in range(0, len(bottom), 20):
                f.write("   " + " ".join(str(x) for x in bottom[i:i+20]) + "\n")
            f.write("  End SubModelPartNodes\n")
            f.write("End SubModelPart\n")


def write_materials():
    mats = {
        "properties": [
            {
                "model_part_name": "Structure",
                "properties_id": 1,
                "Material": {
                    "name": "SoilLinearElastic",
                    "constitutive_law": {"name": "LinearElastic3DLaw"},
                    "Variables": {
                        "DENSITY": 2000.0,
                        "YOUNG_MODULUS": 3.0e7,
                        "POISSON_RATIO": 0.28,
                    },
                    "Tables": {},
                },
            }
        ]
    }
    MATERIALS.write_text(json.dumps(mats, ensure_ascii=False, indent=2), encoding="utf-8")


def write_project_parameters():
    params = {
        "problem_data": {
            "problem_name": "static_run",
            "parallel_type": "OpenMP",
            "echo_level": 0,
            "start_time": 0.0,
            "end_time": 1.0,
        },
        "solver_settings": {
            "solver_type": "Static",
            "model_part_name": "Structure",
            "domain_size": 3,
            "echo_level": 0,
            "analysis_type": "linear",
            "model_import_settings": {
                "input_type": "mdpa",
                "input_filename": MDPA.with_suffix("").resolve().as_posix(),
            },
            "material_import_settings": {
                "materials_filename": MATERIALS.resolve().as_posix(),
            },
            "time_stepping": {"time_step": 1.0},
            "convergence_criterion": "residual_criterion",
            "displacement_relative_tolerance": 1e-4,
            "displacement_absolute_tolerance": 1e-9,
            "residual_relative_tolerance": 1e-4,
            "residual_absolute_tolerance": 1e-9,
            "max_iteration": 80,
            "linear_solver_settings": {
                "solver_type": "amgcl",
                "tolerance": 1e-6,
                "max_iteration": 200,
                "scaling": True,
                "coarsening_type": "smoothed_aggregation",
                "smoother_type": "spai0",
                "verbosity": 0,
            },
        },
        "processes": {
            "constraints_process_list": [
                {
                    "python_module": "assign_vector_variable_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "AssignVectorVariableProcess",
                    "Parameters": {
                        "model_part_name": "Structure.DISPLACEMENT_boundary",
                        "variable_name": "DISPLACEMENT",
                        "constrained": [True, True, True],
                        "value": [0.0, 0.0, 0.0],
                        "interval": [0.0, "End"],
                    },
                }
            ],
            "loads_process_list": [
                {
                    "python_module": "assign_vector_by_direction_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "AssignVectorByDirectionProcess",
                    "Parameters": {
                        "model_part_name": "Structure",
                        "variable_name": "VOLUME_ACCELERATION",
                        "modulus": 9.81,
                        "direction": [0.0, 0.0, -1.0],
                        "interval": [0.0, "End"],
                        "constrained": False
                    },
                }
            ],
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
                        "output_sub_model_parts": True,
                        "save_output_files_in_folder": True,
                        "output_path": VTK_DIR.resolve().as_posix(),
                        "output_control_type": "step",
                        "output_interval": 1.0,
                        "write_deformed_configuration": True,
                        "write_ids": False,
                        "output_precision": 7,
                        "nodal_solution_step_data_variables": [
                            "DISPLACEMENT"
                        ],
                        "element_data_value_variables": []
                    }
                }
            ]
        },
    }
    PP.write_text(json.dumps(params, ensure_ascii=False, indent=2), encoding="utf-8")


def run():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    data = parse_fpn(FPN_PATH)
    nodes = data.get("nodes") or []
    elements = data.get("elements") or []

    write_mdpa(nodes, elements)
    write_materials()
    write_project_parameters()

    # Import KratosIntegration freshly after ensuring project root precedence
    import importlib
    if 'core' in sys.modules:
        del sys.modules['core']
    # Ensure top-level core takes precedence
    sys.path.insert(0, str(PROJECT_ROOT))
    if str(EXAMPLE2_DIR) in sys.path:
        sys.path.remove(str(EXAMPLE2_DIR))
        sys.path.append(str(EXAMPLE2_DIR))
    core_top = importlib.import_module('core')
    KratosIntegration = core_top.KratosIntegration
    ki = KratosIntegration()
    ok, msg = ki.run_analysis(str(PP))
    print("[Run] ok=", ok)
    print("[Run] msg=", msg)
    print("[Run] VTK path:", VTK_DIR)
    if VTK_DIR.exists():
        vtu = sorted(VTK_DIR.glob("*.vtu"))
        print("[Run] vtu count=", len(vtu))


if __name__ == "__main__":
    run()

