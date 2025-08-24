"""
Simple GEM System Launcher
Direct launch without Unicode issues
"""

import sys
import os
from pathlib import Path

# Add project path  
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def check_dependencies():
    """Check system dependencies"""
    print("Checking system dependencies...")
    
    dependencies = {
        'PyQt6': 'GUI framework',
        'numpy': 'Scientific computing core', 
        'pandas': 'Data processing',
        'matplotlib': 'Plotting library',
        'pyvista': '3D visualization'
    }
    
    missing_deps = []
    available_deps = {}
    
    for dep, description in dependencies.items():
        try:
            if dep == 'PyQt6':
                import PyQt6
                from PyQt6.QtCore import qVersion
                version = qVersion()
            elif dep == 'numpy':
                import numpy as np
                version = np.__version__
            elif dep == 'pandas':
                import pandas as pd
                version = pd.__version__
            elif dep == 'matplotlib':
                import matplotlib
                version = matplotlib.__version__
            elif dep == 'pyvista':
                import pyvista as pv
                version = pv.__version__
            
            available_deps[dep] = version
            print(f"  OK {dep} {version} - {description}")
            
        except ImportError:
            missing_deps.append((dep, description))
            print(f"  MISSING {dep} - {description}")
    
    if missing_deps:
        print("\nMissing dependencies detected:")
        for dep, desc in missing_deps:
            print(f"     {dep} - {desc}")
        print("\nInstall command:")
        print("pip install " + " ".join([dep for dep, _ in missing_deps]))
        return False, available_deps
    
    print("All dependencies OK!")
    return True, available_deps

def main():
    """Main function"""
    print("=" * 60)
    print("GEM Comprehensive Modeling System v2.0")
    print("Professional Geological Modeling CAE Software")
    print("=" * 60)
    
    # Check dependencies
    deps_ok, available_deps = check_dependencies()
    if not deps_ok:
        print("\nDependency check failed, exiting")
        return 1
    
    print("\nSystem info:")
    print("Version: 2.0.0")
    print("Description: Professional geological implicit modeling CAE software")
    print("Team: DeepCAD")
    print()
    
    print("Loaded packages:")
    for dep, version in available_deps.items():
        print(f"  * {dep}: {version}")
    
    print("\nFeature modules:")
    print("  * Data import and management")
    print("  * Geological implicit modeling")
    print("  * Fault analysis and structural modeling")
    print("  * Geophysical modeling (gravity/magnetic/electrical/seismic)")
    print("  * Uncertainty analysis (Monte Carlo/sensitivity)")
    print("  * Advanced 3D visualization")
    print("  * Result analysis and export")
    print()
    
    try:
        # Create application
        from PyQt6.QtWidgets import QApplication
        
        app = QApplication(sys.argv)
        app.setApplicationName("GEM Comprehensive Modeling System")
        app.setApplicationVersion("2.0.0")
        app.setOrganizationName("DeepCAD")
        
        print("Initializing main interface...")
        
        # Import and create main window
        from comprehensive_gem_interface import ComprehensiveGEMInterface
        
        window = ComprehensiveGEMInterface()
        window.show()
        
        print("GEM Comprehensive Modeling System started successfully!")
        print("Interface loaded, ready to use...")
        
        # Run application
        return app.exec()
        
    except Exception as e:
        print(f"Launch failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())