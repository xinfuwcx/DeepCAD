"""
Launch ABAQUS Style GemPy Interface
"""

import sys
import os
from PyQt6.QtWidgets import QApplication
from PyQt6.QtGui import QFont
from PyQt6.QtCore import QTimer

try:
    from gempy_abaqus_ultimate import GemPyAbaqusUltimate
    
    def main():
        app = QApplication(sys.argv)
        app.setStyle('Fusion')
        
        # Set professional font
        font = QFont("Segoe UI", 9, QFont.Weight.Normal)
        app.setFont(font)
        
        print("GemPy ABAQUS Ultimate Professional Interface")
        print("ABAQUS CAE level visual design")
        print("Ultimate engineering software aesthetics")
        
        # Create ultimate interface
        window = GemPyAbaqusUltimate()
        window.show()
        
        print("ABAQUS Ultimate Interface launched!")
        
        sys.exit(app.exec())
    
    if __name__ == "__main__":
        main()

except Exception as e:
    print(f"Error launching ABAQUS style interface: {e}")
    print("Trying fallback interface...")
    
    try:
        # Fallback to refined interface
        from gempy_refined_interface import GemPyRefinedInterface
        
        def fallback_main():
            app = QApplication(sys.argv)
            window = GemPyRefinedInterface()
            window.show()
            sys.exit(app.exec())
        
        fallback_main()
        
    except Exception as e2:
        print(f"Fallback also failed: {e2}")
        print("Please check the installation")