#!/usr/bin/env python3
"""
Simplified GemPy dependency test
"""

import sys
import importlib

def test_critical_imports():
    """Test critical dependencies"""
    results = {}
    
    # Test basic scientific libraries
    basic_libs = ['numpy', 'scipy', 'pandas', 'matplotlib']
    for lib in basic_libs:
        try:
            importlib.import_module(lib)
            results[lib] = "OK - Available"
        except ImportError:
            results[lib] = "MISSING - Not installed"
    
    # Test existing geometry libraries
    geo_libs = ['gmsh', 'pyvista', 'vtk']
    for lib in geo_libs:
        try:
            importlib.import_module(lib)
            results[lib] = "OK - Available"
        except ImportError:
            results[lib] = "MISSING - Not installed"
    
    # Test sklearn
    try:
        importlib.import_module('sklearn')
        results['sklearn'] = "OK - Available"
    except ImportError:
        results['sklearn'] = "MISSING - Not installed"
    
    # Test GemPy (special handling)
    try:
        import gempy
        results['gempy'] = "OK - Available"
        gempy_version = getattr(gempy, '__version__', 'unknown')
        results['gempy'] += f" (v{gempy_version})"
    except Exception as e:
        results['gempy'] = f"FAILED - Import error: {str(e)[:50]}..."
    
    # Test other RBF-related libraries
    rbf_libs = ['rbf', 'pykrige', 'gstools', 'rasterio']
    for lib in rbf_libs:
        try:
            importlib.import_module(lib)
            results[lib] = "OK - Available"
        except ImportError:
            results[lib] = "MISSING - Not installed"
    
    return results

def main():
    print("GemPy Geological Modeling Dependencies Check")
    print("=" * 50)
    
    results = test_critical_imports()
    
    for name, status in results.items():
        print(f"{name:12} - {status}")
    
    print("\n" + "=" * 50)
    
    # Statistics
    available = sum(1 for status in results.values() if status.startswith("OK"))
    total = len(results)
    print(f"Available dependencies: {available}/{total}")
    
    # Critical check
    critical_available = all(results[lib].startswith("OK") for lib in ['numpy', 'scipy', 'sklearn'])
    geometry_available = any(results[lib].startswith("OK") for lib in ['gmsh', 'pyvista'])
    
    print(f"Critical dependencies: {'OK' if critical_available else 'MISSING'}")
    print(f"Geometry libraries: {'OK' if geometry_available else 'MISSING'}")
    
    # Recommendations
    print("\nRecommendations:")
    if results['gempy'].startswith("OK"):
        print("- Use GemPy complete implicit modeling features")
    else:
        print("- Use enhanced RBF interpolation as primary solution")
        print("- Consider fixing GemPy import issues for full functionality")
    
    if results['pyvista'].startswith("OK"):
        print("- PyVista mesh processing available")
    else:
        print("- Install PyVista for advanced mesh processing")
    
    # Test basic functionality
    print("\nBasic functionality test:")
    try:
        import numpy as np
        import scipy.interpolate
        
        # Simple RBF test
        x = np.array([0, 1, 2])
        y = np.array([0, 1, 4])
        rbf = scipy.interpolate.RBFInterpolator(x[:, None], y)
        test_result = rbf(np.array([[1.5]]))
        
        print("OK - Basic RBF interpolation working")
        
    except Exception as e:
        print(f"FAILED - RBF interpolation test failed: {e}")

if __name__ == "__main__":
    main()