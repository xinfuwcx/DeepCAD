"""
Terra 结果工作空间
"""

from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel
from PyQt6.QtCore import Qt

class ResultsWorkspace(QWidget):
    """结果工作空间"""
    
    def __init__(self, gmsh_engine=None):
        super().__init__()
        self.gmsh_engine = gmsh_engine
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        label = QLabel("📊 结果工作空间")
        label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(label)
        
        info = QLabel("结果可视化和后处理功能开发中...")
        info.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(info)
    
    def get_property_widgets(self):
        return []