#!/usr/bin/env python3
"""
Direct test of geological modeling service
Tests the GemPy integration service without API
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'gateway', 'modules', 'geology'))

from gempy_integration_service import get_gempy_integration_service
import json

def test_gempy_service():
    """Test the GemPy integration service directly"""
    
    print("Direct GemPy Integration Service Test")
    print("=" * 50)
    
    try:
        # Get service instance
        service = get_gempy_integration_service()
        print("OK - Service instance created successfully")
        
        # Check dependencies
        deps = service.check_dependencies()
        print("\nDependency Status:")
        for name, available in deps.items():
            status = "OK" if available else "MISSING"
            print(f"  {name:12} - {status}")
        
        # Create test borehole data
        test_boreholes = [
            {"id": "BH001", "x": 0.0, "y": 0.0, "z": -3.0, "soil_type": "clay", "layer_id": 1},
            {"id": "BH002", "x": 50.0, "y": 0.0, "z": -4.0, "soil_type": "sand", "layer_id": 2},
            {"id": "BH003", "x": 25.0, "y": 50.0, "z": -3.5, "soil_type": "clay", "layer_id": 1},
            {"id": "BH004", "x": -25.0, "y": 25.0, "z": -4.5, "soil_type": "sand", "layer_id": 2}
        ]
        
        print(f"\nOK - Created test data with {len(test_boreholes)} boreholes")
        
        # Test preprocessing
        borehole_data = service.preprocess_borehole_data(test_boreholes)
        print(f"OK - Borehole preprocessing completed")
        print(f"  - {borehole_data['n_boreholes']} boreholes processed")
        print(f"  - {borehole_data['n_formations']} formations detected")
        
        # Create test request
        test_request = {
            "boreholes": test_boreholes,
            "domain": {
                "resolution": [20, 20, 10]  # Small resolution for testing
            },
            "use_gempy": False,  # Force RBF fallback
            "test_mode": True
        }
        
        print("\nOK - Test request prepared")
        
        # Execute modeling
        print("\nExecuting geological modeling...")
        result = service.process_geological_modeling_request(test_request)
        
        # Analyze results
        if result.get('success', False):
            print("OK - Geological modeling completed successfully")
            print(f"  - Method: {result.get('method', 'Unknown')}")
            print(f"  - Processing time: {result.get('processing_time', 0):.2f}s")
            print(f"  - Input boreholes: {result.get('input_data', {}).get('n_boreholes', 0)}")
            print(f"  - Formations: {result.get('input_data', {}).get('n_formations', 0)}")
            
            # Check for specific result components
            components = []
            if 'interpolated_grid' in result:
                components.append("Interpolated grid")
            if 'confidence_grid' in result:
                components.append("Confidence mapping")
            if 'surfaces' in result:
                components.append("Surface generation")
            if 'threejs_data' in result:
                components.append("Three.js export")
            
            print(f"  - Components: {', '.join(components) if components else 'None'}")
            
            # Test quality metrics
            quality = result.get('quality_metrics', {})
            if quality:
                print(f"  - Mean confidence: {quality.get('mean_confidence', 0):.3f}")
                print(f"  - Coverage ratio: {quality.get('coverage_ratio', 0):.3f}")
            
            return True
            
        else:
            print("FAILED - Geological modeling failed")
            print(f"  - Error: {result.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"FAILED - Service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_rbf_interpolation():
    """Test RBF interpolation specifically"""
    
    print("\nDirect RBF Interpolation Test")
    print("-" * 30)
    
    try:
        from gempy_integration_service import EnhancedRBFInterpolator
        import numpy as np
        
        # Create test data
        borehole_points = np.array([
            [0.0, 0.0, -3.0],
            [50.0, 0.0, -4.0],
            [25.0, 50.0, -3.5],
            [-25.0, 25.0, -4.5]
        ])
        formation_values = np.array([1, 2, 1, 2], dtype=float)
        
        query_points = np.array([
            [10.0, 10.0, -3.2],
            [30.0, 20.0, -3.8]
        ])
        
        print(f"OK - Test data prepared:")
        print(f"  - {len(borehole_points)} borehole points")
        print(f"  - {len(query_points)} query points")
        
        # Create interpolator
        rbf_interpolator = EnhancedRBFInterpolator(
            kernel='thin_plate_spline',
            adaptive_neighbors=True,
            geological_constraints=True
        )
        
        print("OK - Enhanced RBF interpolator created")
        
        # Perform interpolation
        result = rbf_interpolator.adaptive_interpolation(
            borehole_points,
            formation_values,
            query_points
        )
        
        print("OK - Adaptive interpolation completed")
        print(f"  - Interpolated values: {result['interpolated_values']}")
        print(f"  - Mean confidence: {result['quality_metrics']['mean_confidence']:.3f}")
        print(f"  - Kernel used: {result['interpolation_params']['kernel']}")
        print(f"  - Neighbors: {result['interpolation_params']['neighbors']}")
        
        return True
        
    except Exception as e:
        print(f"FAILED - RBF interpolation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    
    print("DeepCAD Geological Modeling System Test")
    print("=" * 60)
    
    # Test service
    service_ok = test_gempy_service()
    
    # Test RBF specifically
    rbf_ok = test_rbf_interpolation()
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary:")
    print(f"  Service test: {'PASS' if service_ok else 'FAIL'}")
    print(f"  RBF test: {'PASS' if rbf_ok else 'FAIL'}")
    
    if service_ok and rbf_ok:
        print("\nOK - All tests passed - System ready for use")
        print("  - Enhanced RBF interpolation fully functional")
        print("  - Geological modeling service operational")
        print("  - Fallback system working correctly")
    else:
        print("\nFAILED - Some tests failed - Check error messages above")
    
    return service_ok and rbf_ok

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)