"""
Launch Clean GemPy Interface
"""

import sys
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QTimer

from gempy_optimized_interface import GemPyOptimizedInterface, create_demo_geological_data

def main():
    app = QApplication(sys.argv)
    
    print("GemPy Optimized Professional Interface")
    print("- Removed old placeholder sections")
    print("- Professional section system only")
    print("- Optimized layout")
    
    # Create interface
    window = GemPyOptimizedInterface()
    window.show()
    
    # Load demo data
    try:
        interface_df, orientations_df = create_demo_geological_data()
        
        def load_data():
            window.professional_sections.update_data(
                interface_points=interface_df,
                orientations=orientations_df,
                extent=[0, 1000, 0, 1000, -500, 500]
            )
            print("Professional sections loaded with demo data")
        
        QTimer.singleShot(2000, load_data)
    except Exception as e:
        print(f"Warning: {e}")
    
    print("Interface ready")
    sys.exit(app.exec())

if __name__ == "__main__":
    main()