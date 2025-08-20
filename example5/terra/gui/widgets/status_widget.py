"""
Terra 状态控件
"""

from PyQt6.QtWidgets import QWidget, QHBoxLayout, QLabel
from PyQt6.QtCore import QTimer

class StatusWidget(QWidget):
    """状态控件"""
    
    def __init__(self, gmsh_engine=None):
        super().__init__()
        self.gmsh_engine = gmsh_engine
        self.init_ui()
        
        # 定时更新
        self.timer = QTimer()
        self.timer.timeout.connect(self.update_status)
        self.timer.start(1000)  # 每秒更新
    
    def init_ui(self):
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        self.memory_label = QLabel("内存: 0 MB")
        layout.addWidget(self.memory_label)
        
        self.entities_label = QLabel("实体: 0")
        layout.addWidget(self.entities_label)
    
    def update_status(self):
        """更新状态信息"""
        # 更新实体数量
        if self.gmsh_engine:
            count = len(self.gmsh_engine.get_geometry_entities())
            self.entities_label.setText(f"实体: {count}")
        
        # 这里可以添加内存使用情况
        # self.memory_label.setText(f"内存: {memory_usage} MB")