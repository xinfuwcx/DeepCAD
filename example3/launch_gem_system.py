"""
Launch GEM Comprehensive Modeling System
Simple launcher without Unicode characters
"""

import sys
import os
from pathlib import Path

# Add project path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def main():
    """Main launcher function"""
    print("=" * 60)
    print("GEM Comprehensive Modeling System v2.0")
    print("Professional Geological Modeling CAE Software")
    print("=" * 60)
    
    try:
        # Import and run main program
        from comprehensive_gem_launcher import main as launcher_main
        return launcher_main()
        
    except ImportError as e:
        print(f"Import Error: {e}")
        print("\nPlease check if these packages are installed:")
        print("  * PyQt6 (GUI framework)")
        print("  * numpy (numerical computing)")
        print("  * pandas (data processing)")
        print("  * matplotlib (plotting)")
        print("  * pyvista (3D visualization)")
        print("  * scipy (scientific computing, optional)")
        print("\nInstall command:")
        print("  pip install PyQt6 numpy pandas matplotlib pyvista")
        print("  pip install scipy scikit-learn  # optional advanced features")
        return 1
        
    except Exception as e:
        print(f"Launch failed: {e}")
        print("\nError details:")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())