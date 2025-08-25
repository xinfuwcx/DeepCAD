#!/usr/bin/env python3
# Simple constraint status check without encoding issues

import json
from pathlib import Path

print("=== MPC Constraint Status Check ===")

# 1. Check if constraint files exist
constraint_dirs = [
    Path("temp_kratos_analysis"),
    Path("temp_kratos_final")
]

mpc_files_found = []
for dir_path in constraint_dirs:
    mpc_file = dir_path / "mpc_constraints.json"
    if mpc_file.exists():
        mpc_files_found.append(mpc_file)
        print(f"Found MPC file: {mpc_file}")
        
        with open(mpc_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        shell_anchor = data.get('shell_anchor', [])
        anchor_solid = data.get('anchor_solid', [])
        
        print(f"  Shell-Anchor constraints: {len(shell_anchor)}")
        print(f"  Anchor-Solid constraints: {len(anchor_solid)}")

# 2. Check project parameters
params_files = [
    Path("temp_kratos_analysis") / "ProjectParameters.json",
    Path("temp_kratos_final") / "ProjectParameters.json"
]

for params_file in params_files:
    if params_file.exists():
        print(f"\nChecking: {params_file}")
        
        with open(params_file, 'r', encoding='utf-8') as f:
            params = json.load(f)
        
        constraints_list = params.get('processes', {}).get('constraints_process_list', [])
        print(f"  Total constraint processes: {len(constraints_list)}")
        
        # Look for MPC processes
        mpc_processes = []
        for proc in constraints_list:
            python_module = proc.get('python_module', '')
            if 'mpc' in python_module.lower():
                mpc_processes.append(proc)
        
        print(f"  MPC constraint processes: {len(mpc_processes)}")
        
        if mpc_processes:
            for i, proc in enumerate(mpc_processes):
                print(f"    MPC Process {i+1}: {proc.get('python_module')}")
                proc_params = proc.get('Parameters', {})
                shell_constraints = proc_params.get('shell_anchor_constraints', [])
                solid_constraints = proc_params.get('anchor_solid_constraints', [])
                print(f"      Shell-anchor: {len(shell_constraints)} constraints")
                print(f"      Anchor-solid: {len(solid_constraints)} constraints")

if not mpc_files_found:
    print("No MPC constraint files found")

print("\n=== Summary ===")
print("Key Issues to Check:")
print("1. Are MPC constraint data files generated?")
print("2. Are MPC processes added to Kratos ProjectParameters?") 
print("3. Do the constraint counts match between files and processes?")