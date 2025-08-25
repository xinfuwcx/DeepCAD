#!/usr/bin/env python3
"""
最简化的界面测试启动器
"""

import sys
import os

try:
    print("Starting simple test...")
    
    from PyQt6.QtWidgets import QApplication, QMainWindow, QWidget, QVBoxLayout, QLabel, QPushButton
    from PyQt6.QtCore import Qt
    from PyQt6.QtGui import QFont
    
    print("PyQt6 imported successfully")

    class SimpleTestInterface(QMainWindow):
        def __init__(self):
            super().__init__()
            self.setWindowTitle("GemPy Ultimate ABAQUS Professional - Test")
            self.setMinimumSize(1000, 700)
            self.setup_ui()
            
        def setup_ui(self):
            central_widget = QWidget()
            self.setCentralWidget(central_widget)
            
            layout = QVBoxLayout(central_widget)
            layout.setContentsMargins(20, 20, 20, 20)
            layout.setSpacing(15)
            
            # 标题
            title = QLabel("🌋 GemPy Ultimate ABAQUS Professional")
            title.setAlignment(Qt.AlignmentFlag.AlignCenter)
            title.setStyleSheet("""
                QLabel {
                    font-size: 24px;
                    font-weight: bold;
                    color: #3b82f6;
                    padding: 20px;
                    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                        stop:0 #1e3a8a, stop:0.5 #3b82f6, stop:1 #1e3a8a);
                    border-radius: 10px;
                    color: white;
                }
            """)
            layout.addWidget(title)
            
            # 状态信息
            status = QLabel("""
✅ Interface Status: Active
🎯 ABAQUS-Level Design: Loaded
🔬 Professional Features: Ready
⚡ GemPy Engine: Available
🎨 3D Visualization: Standby

Click buttons below to test functionality:
            """)
            status.setStyleSheet("""
                QLabel {
                    font-size: 14px;
                    background-color: #2d3748;
                    color: #e2e8f0;
                    padding: 20px;
                    border-radius: 8px;
                    border: 2px solid #4a5568;
                }
            """)
            layout.addWidget(status)
            
            # 功能按钮
            buttons = [
                ("🔨 Build Geological Model", self.test_build_model),
                ("🌍 Gravity Analysis", self.test_gravity),
                ("📐 Volume Calculation", self.test_volume),
                ("🎨 3D Visualization", self.test_3d_view),
                ("💾 Export Results", self.test_export)
            ]
            
            for btn_text, callback in buttons:
                btn = QPushButton(btn_text)
                btn.setMinimumHeight(50)
                btn.clicked.connect(callback)
                btn.setStyleSheet("""
                    QPushButton {
                        font-size: 14px;
                        font-weight: bold;
                        background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                            stop:0 #4a5568, stop:1 #2d3748);
                        color: white;
                        border: 2px solid #4a5568;
                        border-radius: 8px;
                        padding: 10px;
                    }
                    QPushButton:hover {
                        background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                            stop:0 #3b82f6, stop:1 #1e40af);
                        border-color: #3b82f6;
                    }
                    QPushButton:pressed {
                        background: #1e40af;
                    }
                """)
                layout.addWidget(btn)
            
            layout.addStretch()
            
            # 设置主窗口样式
            self.setStyleSheet("""
                QMainWindow {
                    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                        stop:0 #0f172a, stop:0.5 #1e293b, stop:1 #0f172a);
                }
            """)
            
        def test_build_model(self):
            print("🔨 Testing geological model building...")
            self.show_test_result("Geological Model", "Professional 3D geological model built successfully!")
            
        def test_gravity(self):
            print("🌍 Testing gravity analysis...")
            self.show_test_result("Gravity Analysis", "Gravity field computation completed!\nAnomaly range: ±50 mGal")
            
        def test_volume(self):
            print("📐 Testing volume calculation...")
            self.show_test_result("Volume Analysis", "Formation volumes calculated:\n• Layer_1: 1.2e9 m³ (35.5%)\n• Layer_2: 8.5e8 m³ (25.1%)")
            
        def test_3d_view(self):
            print("🎨 Testing 3D visualization...")
            self.show_test_result("3D Visualization", "Professional 3D rendering activated!\nABAQUS-level visual quality")
            
        def test_export(self):
            print("💾 Testing export functionality...")
            self.show_test_result("Export Results", "Results exported successfully!\nFormats: VTK, CSV, PNG")
            
        def show_test_result(self, title, message):
            from PyQt6.QtWidgets import QMessageBox
            msg = QMessageBox(self)
            msg.setWindowTitle(f"GemPy Professional - {title}")
            msg.setText(message)
            msg.setIcon(QMessageBox.Icon.Information)
            msg.exec()

    print("Creating application...")
    app = QApplication(sys.argv)
    app.setStyle('Fusion')
    
    # 设置字体
    font = QFont("Segoe UI", 9)
    app.setFont(font)
    
    print("Creating main window...")
    window = SimpleTestInterface()
    window.show()
    
    print("=== GemPy Ultimate ABAQUS Test Interface Launched ===")
    print("Professional geological modeling interface is ready!")
    print("Click the buttons to test different functionalities.")
    print("=====================================================")
    
    sys.exit(app.exec())

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)