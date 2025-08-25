#!/usr/bin/env python3
"""
逐步调试 - 找出卡住的地方
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

print("Step 1: Import modules")
try:
    from core.empirical_solver import EmpiricalScourSolver, create_test_parameters, ScourParameters, PierShape
    print("OK - Imports successful")
except Exception as e:
    print(f"FAIL - Import error: {e}")
    exit(1)

print("Step 2: Create simple parameters manually")
try:
    # 手动创建最简单的参数，避免可能的create_test_parameters问题
    simple_params = ScourParameters(
        pier_diameter=2.0,
        pier_shape=PierShape.CIRCULAR, 
        flow_velocity=2.0,
        water_depth=8.0,
        d50=0.8,
    )
    print(f"OK - Simple params created: D={simple_params.pier_diameter}m")
except Exception as e:
    print(f"FAIL - Parameter creation error: {e}")
    exit(1)

print("Step 3: Create solver")
try:
    solver = EmpiricalScourSolver()
    print(f"OK - Solver created: {solver.name}")
except Exception as e:
    print(f"FAIL - Solver creation error: {e}")
    exit(1)

print("Step 4: Test dimensional parameters calculation")
try:
    dim_params = solver.calculate_dimensional_parameters(simple_params)
    print(f"OK - Dimensional params: Re={dim_params['reynolds']:.0f}, Fr={dim_params['froude']:.3f}")
except Exception as e:
    print(f"FAIL - Dimensional params error: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("Step 5: Test single HEC-18 calculation")
try:
    hec18_result = solver.hec18_formula(simple_params)
    print(f"OK - HEC-18 result: {hec18_result.scour_depth:.2f}m")
except Exception as e:
    print(f"FAIL - HEC-18 calculation error: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("Step 6: Test full solve method")
try:
    all_results = solver.solve(simple_params)
    print(f"OK - Full solve completed with {len(all_results)} methods")
    for method, result in all_results.items():
        print(f"  {method}: {result.scour_depth:.2f}m")
except Exception as e:
    print(f"FAIL - Full solve error: {e}")
    import traceback  
    traceback.print_exc()
    exit(1)

print("=== ALL TESTS PASSED ===")
print("The empirical solver works correctly!")
print("The GUI problem must be elsewhere.")