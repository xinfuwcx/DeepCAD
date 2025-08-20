"""
Terra 网格工作空间
"""

from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel
from PyQt6.QtCore import Qt

class MeshWorkspace(QWidget):
    """网格工作空间"""
    
    def __init__(self, gmsh_engine=None):
        super().__init__()
        self.gmsh_engine = gmsh_engine
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        label = QLabel("🕸️ 网格工作空间")
        label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(label)
        
        info = QLabel("网格生成和质量分析功能开发中...")
        info.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(info)
    
    def get_property_widgets(self):
        return []