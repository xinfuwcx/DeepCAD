#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

try:
    from modules.preprocessor import PreProcessor
    
    print("Testing material selection logic...")
    
    # Create preprocessor instance
    preprocessor = PreProcessor()
    
    # Setup test materials
    preprocessor.materials = {
        1: {'name': 'Soil Layer 1', 'properties': {'type': 'soil', 'color': 'brown'}},
        2: {'name': 'Soil Layer 2', 'properties': {'type': 'soil', 'color': 'yellow'}}, 
        3: {'name': 'Soil Layer 3', 'properties': {'type': 'soil', 'color': 'red'}},
        10: {'name': 'Retaining Wall', 'properties': {'type': 'concrete', 'color': 'gray'}}
    }
    
    # Simulate excavation stage data
    excavation_stage = {
        'id': 2,
        'name': 'First Excavation (-5m)',
        'type': 1,
        'active_materials': [1, 3, 10]  # Keep materials 1,3,10, remove material 2
    }
    
    print(f"Simulating excavation stage: {excavation_stage['name']}")
    print(f"Original materials: {list(preprocessor.materials.keys())}")
    print(f"Active materials after excavation: {excavation_stage['active_materials']}")
    
    # Set current stage data
    preprocessor.current_stage_data = excavation_stage
    
    # Call intelligent material selection
    preprocessor.intelligent_material_selection(excavation_stage['name'])
    
    # Check results
    if hasattr(preprocessor, 'current_active_materials'):
        print(f"Current active materials: {sorted(preprocessor.current_active_materials)}")
        
        # Calculate removed materials
        all_soil_materials = {mat_id for mat_id, mat_info in preprocessor.materials.items() 
                            if mat_info['properties']['type'] == 'soil'}
        active_soil_materials = preprocessor.current_active_materials & all_soil_materials
        removed_soil_materials = all_soil_materials - active_soil_materials
        
        print(f"All soil materials: {sorted(all_soil_materials)}")
        print(f"Active soil materials: {sorted(active_soil_materials)}")
        print(f"Removed soil materials: {sorted(removed_soil_materials)}")
        
        if removed_soil_materials:
            print("SUCCESS: Excavation logic correctly removed soil materials")
            expected_removed = {2}
            if removed_soil_materials == expected_removed:
                print("PERFECT: Removed materials match expectations")
            else:
                print(f"PARTIAL: Expected to remove {expected_removed}, actually removed {removed_soil_materials}")
        else:
            print("FAILED: No soil materials were removed")
    else:
        print("FAILED: current_active_materials attribute not found")
    
    print("Test completed")

except Exception as e:
    print(f"Test error: {e}")
    import traceback
    traceback.print_exc()