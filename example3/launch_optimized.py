"""
Launch GemPy Optimized Interface - No old placeholder sections
"""

import sys
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QTimer

try:
    from gempy_optimized_interface import GemPyOptimizedInterface, create_demo_geological_data
    
    def main():
        app = QApplication(sys.argv)
        
        print("=== GemPy Optimized Professional Interface ===")
        print("✓ Removed old placeholder sections")
        print("✓ Using professional section system only")
        print("✓ Optimized layout structure")
        
        # Create optimized interface
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
                print("✓ Professional section system loaded with demo data")
            
            QTimer.singleShot(2000, load_data)
        except Exception as e:
            print(f"Warning: {e}")
        
        print("=== Interface Ready ===")
        sys.exit(app.exec())
        
    if __name__ == "__main__":
        main()

except ImportError as e:
    print(f"Import error: {e}")
    print("Falling back to basic interface...")
    
    # Fallback to basic interface if optimized version fails
    try:
        from launch_complete_interface import main
        main()
    except:
        print("Could not launch any interface")