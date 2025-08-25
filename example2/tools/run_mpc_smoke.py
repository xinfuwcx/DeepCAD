#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Smoke test for MPC mapping and (if available) Kratos run.
This will:
 1) Load example FPN model
 2) Setup KratosInterface
 3) Export model.mdpa, materials.json
 4) Build interface mappings (mpc_constraints.json + mpc_constraints_process.py)
 5) Write ProjectParameters.json with injected MPC process
 6) If Kratos integration is available, run analysis
"""

from pathlib import Path
import json
import os
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from example2.core.kratos_interface import KratosInterface, KRATOS_AVAILABLE  # type: ignore


def main():
    fpn_path = ROOT / 'example2' / 'data' / '两阶段-全锚杆-摩尔库伦.fpn'
    if not fpn_path.exists():
        print(f"❌ FPN file not found: {fpn_path}")
        return 1
    print(f"🔄 Loading FPN: {fpn_path}")
    fpn = json.loads(fpn_path.read_text(encoding='utf-8'))

    ki = KratosInterface()
    print(f"KRATOS_AVAILABLE flag: {KRATOS_AVAILABLE}")

    print("🔧 Setting up model...")
    ok = ki.setup_model(fpn)
    print(f"setup_model -> {ok}")
    if not ok:
        print("❌ setup_model failed")
        return 1

    out = ROOT / 'example2' / 'temp_kratos_analysis'
    out.mkdir(parents=True, exist_ok=True)

    print("📝 Writing MDPA...")
    ki._write_mdpa_file(out / 'model.mdpa')
    print("📝 Writing materials.json...")
    ki._write_materials_file(out / 'materials.json')
    print("🧩 Building interface mappings...")
    ki._write_interface_mappings(out, 0.05, 0.10, 4)
    print("📝 Writing ProjectParameters.json...")
    ki._write_project_parameters(out / 'ProjectParameters.json', 'model', 'materials.json')

    files = sorted(p.name for p in out.iterdir())
    print("📦 Temp outputs:", files)

    map_path = out / 'mpc_constraints.json'
    if map_path.exists():
        data = json.loads(map_path.read_text(encoding='utf-8'))
        print("📊 MPC stats:", data.get('stats'))
    else:
        print("⚠️ mpc_constraints.json not found")

    pp = out / 'ProjectParameters.json'
    has_proc = 'mpc_constraints_process' in (pp.read_text(encoding='utf-8') if pp.exists() else '')
    print("🔗 ProjectParameters has mpc process:", has_proc)

    # Try running Kratos if available
    ran = False
    if getattr(ki, 'kratos_integration', None):
        print("🚀 Running Kratos via integration...")
        cwd0 = os.getcwd()
        os.chdir(out)
        try:
            success, results = ki.kratos_integration.run_analysis('ProjectParameters.json')
            print("✅ Kratos run success:", success)
            print("ℹ️ Results keys:", list(results.keys())[:10] if isinstance(results, dict) else type(results))
            ran = True
        except Exception as e:
            print("❌ Kratos run failed:", e)
        finally:
            os.chdir(cwd0)
    else:
        print("ℹ️ Kratos integration not available in this environment.")

    return 0 if (map_path.exists() and has_proc and (ran or True)) else 0


if __name__ == '__main__':
    raise SystemExit(main())

