#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import traceback
from PyQt6.QtWidgets import QApplication

try:
    from beautiful_main import BeautifulMainWindow, ScourResult
    print("Import success")
    
    app = QApplication(sys.argv)
    print("QApplication created")
    
    window = BeautifulMainWindow()
    print("Window created")
    
    window.show()
    print("Window shown - Interface is ready!")
    
    app.exec()
    
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()