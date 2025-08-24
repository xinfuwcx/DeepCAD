"""
Launch Professional GEM Interface
Simple launcher for the new professional CAE-style interface
"""

import sys
import os
from pathlib import Path

# Add project path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def main():
    """Launch the professional GEM interface"""
    print("=" * 70)
    print("GEM Professional Modeling System v3.0")
    print("Advanced CAE-Style Geological Modeling Interface")
    print("=" * 70)
    
    try:
        from professional_gem_interface import main as professional_main
        return professional_main()
        
    except ImportError as e:
        print(f"Import Error: {e}")
        print("\nRequired packages:")
        print("  pip install PyQt6 numpy pandas matplotlib pyvista")
        return 1
        
    except Exception as e:
        print(f"Launch failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())