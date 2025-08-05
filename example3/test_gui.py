"""
简化版GUI测试程序，用于验证PyQt6是否正常工作
"""
import sys
from PyQt6.QtWidgets import QApplication, QMainWindow, QWidget, QVBoxLayout, QLabel, QPushButton, QMessageBox
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont

class SimpleTestGUI(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Example3 GUI 测试")
        self.setGeometry(100, 100, 600, 400)
        
        # 中央部件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 布局
        layout = QVBoxLayout(central_widget)
        layout.setSpacing(20)
        
        # 标题
        title = QLabel("Example3 - 三维土体重建系统")
        title.setFont(QFont("Arial", 16, QFont.Weight.Bold))
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title.setStyleSheet("color: #2196F3; padding: 20px;")
        layout.addWidget(title)
        
        # 状态信息
        status = QLabel("GUI界面测试成功！\nPyQt6运行正常")
        status.setFont(QFont("Arial", 12))
        status.setAlignment(Qt.AlignmentFlag.AlignCenter)
        status.setStyleSheet("background-color: #E8F5E8; padding: 15px; border-radius: 5px;")
        layout.addWidget(status)
        
        # 测试按钮
        test_btn = QPushButton("测试按钮交互")
        test_btn.setFont(QFont("Arial", 12))
        test_btn.setStyleSheet("""
            QPushButton {
                background-color: #2196F3;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 20px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #1976D2;
            }
        """)
        test_btn.clicked.connect(self.show_message)
        layout.addWidget(test_btn)
        
        # 信息文本
        info = QLabel("""
系统要求验证：
✓ Python 3.13.4
✓ PyQt6 已安装
✓ 基础GUI功能正常

下一步：修复GemPy编码问题
        """)
        info.setFont(QFont("Consolas", 10))
        info.setStyleSheet("background-color: #F5F5F5; padding: 15px; border-radius: 5px;")
        layout.addWidget(info)
        
    def show_message(self):
        QMessageBox.information(self, "测试", "按钮交互测试成功！\nPyQt6界面运行正常。")

def main():
    app = QApplication(sys.argv)
    app.setApplicationName("Example3 GUI Test")
    
    window = SimpleTestGUI()
    window.show()
    
    return app.exec()

if __name__ == "__main__":
    main()