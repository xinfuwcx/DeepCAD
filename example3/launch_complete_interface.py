"""
Launch GemPy Complete Professional Interface
"""

import sys
import os
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QTimer

# Import the complete interface
from gempy_complete_interface import GemPyCompleteInterface, create_demo_geological_data

def main():
    """Main function without emojis"""
    app = QApplication(sys.argv)
    
    print("Starting GemPy Complete Professional Interface...")
    
    # Create and show the complete professional interface
    window = GemPyCompleteInterface()
    window.show()
    
    # Add demo data
    try:
        interface_df, orientations_df = create_demo_geological_data()
        
        # Load data after interface is fully loaded
        def load_demo_data():
            try:
                window.professional_sections.update_data(
                    interface_points=interface_df,
                    orientations=orientations_df,
                    extent=[0, 1000, 0, 1000, -500, 500]
                )
                print("Demo data loaded to section system")
                print(f"Interface points: {len(interface_df)}, Orientations: {len(orientations_df)}")
            except Exception as e:
                print(f"Demo data loading failed: {e}")
        
        QTimer.singleShot(2000, load_demo_data)
        
    except Exception as e:
        print(f"Demo data creation failed: {e}")
    
    print("Complete professional interface launched!")
    print("Includes complete XY, XZ, YZ section system")
    print("Sections fully integrated with 3D view")
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()