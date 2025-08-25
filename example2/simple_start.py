#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import os
from pathlib import Path

# Set environment
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def main():
    """Simple launcher for Example2 GUI"""
    try:
        # Import PyQt6
        from PyQt6.QtWidgets import QApplication
        
        # Create QApplication
        app = QApplication(sys.argv)
        app.setApplicationName("Example2 MIDAS Model Processor")
        
        # Import and create main window
        from gui.main_window import MainWindow
        main_window = MainWindow()
        main_window.show()
        
        print("Example2 GUI started successfully!")
        print("Window should now be visible on your desktop.")
        
        # Run application
        return app.exec()
        
    except Exception as e:
        print(f"Error starting GUI: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)