#!/usr/bin/env python3

import sys
from PyQt6.QtWidgets import QApplication, QMainWindow, QWidget, QVBoxLayout, QLabel, QPushButton
from PyQt6.QtCore import Qt

class BasicInterface(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("GemPy Ultimate ABAQUS Professional")
        self.setMinimumSize(800, 600)
        
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        layout = QVBoxLayout(central_widget)
        
        title = QLabel("GemPy Ultimate ABAQUS Professional")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)
        
        status = QLabel("Professional geological modeling interface is ready")
        status.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(status)
        
        btn = QPushButton("Test Button")
        btn.clicked.connect(self.test_function)
        layout.addWidget(btn)
        
    def test_function(self):
        print("Button clicked - interface working!")

def main():
    app = QApplication(sys.argv)
    window = BasicInterface()
    window.show()
    print("Basic interface launched")
    sys.exit(app.exec())

if __name__ == "__main__":
    main()