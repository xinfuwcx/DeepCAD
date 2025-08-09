#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Test the material selection logic without PyVista
class MockPreProcessor:
    def __init__(self):
        self.materials = {}
        self.current_active_materials = set()
        self.current_stage_data = None
    
    def intelligent_material_selection(self, stage_name: str):
        """Simplified version of the material selection logic"""
        stage_name_lower = stage_name.lower()
        
        # First try to use active_materials from analysis step
        stage_info = getattr(self, 'current_stage_data', None)
        if stage_info and 'active_materials' in stage_info and stage_info['active_materials']:
            self.current_active_materials = set(stage_info['active_materials'])
            print(f"Using active materials from analysis step: {sorted(self.current_active_materials)}")
            return

        if 'initial' in stage_name_lower:
            # Initial stress analysis: show all soil materials
            print("Smart selection: Initial stress stage - all soil materials")
            self.current_active_materials = set()
            for mat_id, mat_info in self.materials.items():
                if mat_info['properties']['type'] == 'soil':
                    self.current_active_materials.add(mat_id)

        elif 'excavation' in stage_name_lower:
            # Excavation analysis: remove excavated soil materials
            print("Smart selection: Excavation stage - remove excavated soil")
            
            # Use analysis step information for active_materials
            stage_info = getattr(self, 'current_stage_data', None)
            if stage_info and 'active_materials' in stage_info:
                # Only show materials that are still active (not excavated)
                self.current_active_materials = set(stage_info['active_materials'])
                print(f"Based on analysis step info, active materials: {sorted(self.current_active_materials)}")
                
                # Identify excavated materials
                all_soil_materials = set()
                for mat_id, mat_info in self.materials.items():
                    if mat_info['properties']['type'] == 'soil':
                        all_soil_materials.add(mat_id)
                
                removed_materials = all_soil_materials - self.current_active_materials
                if removed_materials:
                    print(f"Excavated soil materials: {sorted(removed_materials)}")
                    print("Note: These materials will be filtered out during display")
            else:
                # Fallback: show all soil materials
                print("No analysis step info found, showing all soil materials")
                self.current_active_materials = set()
                for mat_id, mat_info in self.materials.items():
                    if mat_info['properties']['type'] == 'soil':
                        self.current_active_materials.add(mat_id)


# Test the logic
print("Testing excavation material logic...")

preprocessor = MockPreProcessor()

# Setup test materials
preprocessor.materials = {
    1: {'name': 'Soil Layer 1', 'properties': {'type': 'soil', 'color': 'brown'}},
    2: {'name': 'Soil Layer 2', 'properties': {'type': 'soil', 'color': 'yellow'}}, 
    3: {'name': 'Soil Layer 3', 'properties': {'type': 'soil', 'color': 'red'}},
    10: {'name': 'Retaining Wall', 'properties': {'type': 'concrete', 'color': 'gray'}}
}

# Simulate excavation stage
excavation_stage = {
    'id': 2,
    'name': 'First Excavation (-5m)',
    'type': 1,
    'active_materials': [1, 3, 10]  # Keep materials 1,3,10, remove material 2
}

print(f"Simulating stage: {excavation_stage['name']}")
print(f"Original materials: {list(preprocessor.materials.keys())}")
print(f"Active materials in stage: {excavation_stage['active_materials']}")

# Set stage data
preprocessor.current_stage_data = excavation_stage

# Test material selection
preprocessor.intelligent_material_selection(excavation_stage['name'])

# Check results
print(f"Result - active materials: {sorted(preprocessor.current_active_materials)}")

# Verify excavation
all_soil_materials = {mat_id for mat_id, mat_info in preprocessor.materials.items() 
                    if mat_info['properties']['type'] == 'soil'}
removed_materials = all_soil_materials - preprocessor.current_active_materials

print(f"All soil materials: {sorted(all_soil_materials)}")
print(f"Removed materials: {sorted(removed_materials)}")

if removed_materials == {2}:
    print("SUCCESS: Correct materials were removed!")
else:
    print("FAILED: Incorrect materials were removed")

print("Test completed")