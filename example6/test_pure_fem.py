#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple test for Pure FEM solver
"""

import sys
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend

# Test basic imports
try:
    from pure_fem_solver import PureFEMSolver, run_pure_fem_analysis
    print("SUCCESS: Pure FEM solver imported")
except Exception as e:
    print(f"FAILED: Import error - {e}")
    sys.exit(1)

# Test parameters (simple case)
test_parameters = {
    "pier_diameter": 2.0,
    "flow_velocity": 1.2, 
    "mesh_resolution": 0.5,  # Coarse mesh for fast test
    "d50": 0.6e-3,
    "viscosity": 1e-3,
    "density": 1000.0
}

print("Starting Pure Python FEM Analysis...")

try:
    # Create solver
    solver = PureFEMSolver()
    
    # Test mesh creation
    nodes, elements = solver.create_mesh(nx=11, ny=9)  # Small mesh
    print(f"Mesh created: {len(nodes)} nodes, {len(elements)} elements")
    
    # Test flow solving
    velocity, pressure = solver.solve_stokes_flow(inlet_velocity=1.2)
    print(f"Flow solved: max velocity = {np.max(np.sqrt(velocity[:,0]**2 + velocity[:,1]**2)):.3f} m/s")
    
    # Test shear stress
    shear_stress = solver.calculate_shear_stress()
    print(f"Shear stress calculated: max = {np.max(shear_stress):.2f} Pa")
    
    # Test scour depth
    scour_depth = solver.calculate_scour_depth()
    print(f"Scour depth calculated: {scour_depth:.3f} m")
    
    # Save results
    solver.save_results("test_output")
    print("Results saved successfully")
    
    print("\nSUCCESS: All FEM calculations completed!")
    print(f"Final results: Scour depth = {solver.results['scour_depth']:.3f} m")
    print(f"Max velocity = {solver.results['max_velocity']:.3f} m/s") 
    print(f"Shields parameter = {solver.results['shields_parameter']:.4f}")
    
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\nFEM SYSTEM IS WORKING!")