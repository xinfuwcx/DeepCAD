#!/usr/bin/env python3
"""
Run the second test case from cae_cases.json
"""
import json
import sys
from pathlib import Path

# Add the parent directory to sys.path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from example6.example6_cae import CAEOrchestrator

def run_case2():
    """Run the second test case"""
    # Load the cases file
    cases_file = Path(__file__).parent / "cae_cases.json"
    with open(cases_file, 'r', encoding='utf-8') as f:
        cases = json.load(f)
    
    if len(cases) < 2:
        print("Not enough test cases in file")
        return
    
    # Use the second case
    case2 = cases[1]
    print(f"Running case 2: {case2['pier_diameter']}m pier at {case2['flow_velocity']} m/s")
    
    orch = CAEOrchestrator()
    result = orch.simulate(case2)
    
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    run_case2()
