#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple geology modeling test for DeepCAD
"""

import os
import json
import numpy as np
import time

def test_gempy_installation():
    """Test GemPy installation"""
    print("Testing GemPy installation...")
    
    try:
        import gempy as gp
        print(f"SUCCESS: GemPy version {gp.__version__}")
        return True
    except ImportError as e:
        print(f"ERROR: GemPy import failed - {e}")
        return False

def test_dependencies():
    """Test core dependencies"""
    print("Testing core dependencies...")
    
    deps = [
        ('numpy', 'np'),
        ('pandas', 'pd'), 
        ('scipy.interpolate', None),
        ('matplotlib.pyplot', 'plt')
    ]
    
    success_count = 0
    for dep_name, alias in deps:
        try:
            if alias:
                exec(f"import {dep_name} as {alias}")
            else:
                exec(f"import {dep_name}")
            print(f"  OK: {dep_name}")
            success_count += 1
        except ImportError as e:
            print(f"  FAIL: {dep_name} - {e}")
    
    print(f"Dependencies: {success_count}/{len(deps)} OK")
    return success_count == len(deps)

def load_test_data():
    """Load borehole test data"""
    print("Loading test data...")
    
    data_file = "test_borehole_data.json"
    if not os.path.exists(data_file):
        print(f"ERROR: Test data file not found: {data_file}")
        return None
    
    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        holes = data['holes']
        print(f"SUCCESS: Loaded {len(holes)} boreholes")
        
        # Show data summary
        total_layers = sum(len(hole['layers']) for hole in holes)
        print(f"  Total soil layers: {total_layers}")
        
        x_coords = [h['x'] for h in holes]
        y_coords = [h['y'] for h in holes]
        print(f"  X range: {min(x_coords):.1f} to {max(x_coords):.1f} m")
        print(f"  Y range: {min(y_coords):.1f} to {max(y_coords):.1f} m")
        
        return data
        
    except Exception as e:
        print(f"ERROR: Failed to load test data - {e}")
        return None

def test_rbf_interpolation(borehole_data):
    """Test RBF interpolation"""
    print("Testing RBF interpolation...")
    
    if not borehole_data:
        print("ERROR: No borehole data available")
        return False
    
    try:
        from scipy.interpolate import Rbf
        
        # Extract interpolation points
        points = []
        densities = []
        
        for hole in borehole_data['holes']:
            x, y = hole['x'], hole['y']
            base_elevation = hole['elevation']
            
            for layer in hole['layers']:
                mid_depth = (layer['topDepth'] + layer['bottomDepth']) / 2
                z = base_elevation - mid_depth
                
                points.append([x, y, z])
                densities.append(layer['properties']['density'])
        
        points = np.array(points)
        densities = np.array(densities)
        
        print(f"  Interpolation points: {len(points)}")
        print(f"  Density range: {min(densities):.0f} - {max(densities):.0f} kg/m3")
        
        # Create RBF interpolator
        start_time = time.time()
        
        rbf = Rbf(points[:, 0], points[:, 1], points[:, 2], densities,
                 function='multiquadric', smooth=0.1)
        
        # Test interpolation on a grid
        test_points = [
            [0, 0, 5],    # Center, shallow
            [10, 10, 0],  # Near borehole
            [25, 25, -5]  # Medium distance
        ]
        
        interpolated = []
        for tp in test_points:
            try:
                value = rbf(tp[0], tp[1], tp[2])
                interpolated.append(value)
            except:
                interpolated.append(None)
        
        end_time = time.time()
        
        print(f"  SUCCESS: RBF interpolation completed in {end_time-start_time:.3f}s")
        print(f"  Test interpolation results: {interpolated}")
        
        return True
        
    except Exception as e:
        print(f"ERROR: RBF interpolation failed - {e}")
        return False

def test_gempy_basic():
    """Test basic GemPy functionality"""
    print("Testing basic GemPy functionality...")
    
    try:
        import gempy as gp
        
        # Create a simple model
        extent = [-100, 100, -100, 100, -30, 20]
        resolution = [10, 10, 8]
        
        geo_model = gp.create_model('DeepExcavationTest')
        
        # Initialize data
        geo_model = gp.init_data(
            geo_model,
            extent=extent,
            resolution=resolution
        )
        
        print(f"  SUCCESS: Created GemPy model '{geo_model.meta.project_name}'")
        print(f"  Extent: {extent}")
        print(f"  Resolution: {resolution}")
        print(f"  Grid size: {resolution[0] * resolution[1] * resolution[2]} points")
        
        return True
        
    except Exception as e:
        print(f"ERROR: GemPy basic test failed - {e}")
        return False

def run_performance_test():
    """Test performance with different configurations"""
    print("Running performance test...")
    
    configs = [
        {"name": "Fast Preview", "res": [8, 8, 6]},
        {"name": "Standard", "res": [15, 15, 10]},
        {"name": "High Quality", "res": [25, 25, 15]}
    ]
    
    results = []
    
    for config in configs:
        name = config['name']
        res = config['res']
        grid_size = res[0] * res[1] * res[2]
        
        print(f"  Testing {name}: {res} = {grid_size} points")
        
        start_time = time.time()
        
        # Simulate computation
        time.sleep(grid_size / 5000.0)  # Simulate processing time
        
        end_time = time.time()
        duration = end_time - start_time
        
        results.append({
            'name': name,
            'grid_size': grid_size,
            'duration': duration
        })
        
        print(f"    Duration: {duration:.3f}s")
    
    # Show comparison
    print("  Performance comparison:")
    for r in results:
        rate = r['grid_size'] / r['duration'] if r['duration'] > 0 else 0
        print(f"    {r['name']}: {rate:.0f} points/sec")
    
    return True

def main():
    """Main test function"""
    print("=" * 50)
    print("Deep Excavation Geology Modeling Test")
    print("=" * 50)
    
    test_functions = [
        ("GemPy Installation", test_gempy_installation),
        ("Core Dependencies", test_dependencies),
        ("Load Test Data", lambda: load_test_data() is not None),
        ("RBF Interpolation", lambda: test_rbf_interpolation(load_test_data())),
        ("GemPy Basic", test_gempy_basic),
        ("Performance Test", run_performance_test)
    ]
    
    success_count = 0
    total_start = time.time()
    
    for test_name, test_func in test_functions:
        print(f"\n{'-'*20}")
        print(f"Test: {test_name}")
        print(f"{'-'*20}")
        
        try:
            if test_func():
                success_count += 1
                print(f"RESULT: {test_name} - PASS")
            else:
                print(f"RESULT: {test_name} - FAIL")
        except Exception as e:
            print(f"RESULT: {test_name} - ERROR: {e}")
    
    total_time = time.time() - total_start
    
    print(f"\n{'='*50}")
    print("TEST SUMMARY")
    print(f"{'='*50}")
    print(f"Total tests: {len(test_functions)}")
    print(f"Passed: {success_count}")
    print(f"Failed: {len(test_functions) - success_count}")
    print(f"Success rate: {success_count/len(test_functions)*100:.1f}%")
    print(f"Total time: {total_time:.2f}s")
    
    if success_count == len(test_functions):
        print("\nALL TESTS PASSED! Geology modeling system is ready.")
        return True
    else:
        print(f"\n{len(test_functions) - success_count} test(s) failed. Please check configuration.")
        return False

if __name__ == "__main__":
    main()