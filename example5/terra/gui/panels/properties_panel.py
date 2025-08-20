"""
Terra 属性面板
"""

from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel, QScrollArea

class PropertiesPanel(QWidget):
    """属性面板"""
    
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        # 标题
        title = QLabel("🔧 属性")
        layout.addWidget(title)
        
        # 滚动区域
        self.scroll_area = QScrollArea()
        self.scroll_area.setWidgetResizable(True)
        layout.addWidget(self.scroll_area)
        
        # 内容容器
        self.content_widget = QWidget()
        self.content_layout = QVBoxLayout(self.content_widget)
        self.scroll_area.setWidget(self.content_widget)
        
        # 默认内容
        default_label = QLabel("选择对象以查看属性")
        self.content_layout.addWidget(default_label)
        self.content_layout.addStretch()
    
    def set_widgets(self, widgets):
        """设置属性控件"""
        # 清空现有内容
        for i in reversed(range(self.content_layout.count())):
            child = self.content_layout.itemAt(i).widget()
            if child:
                child.setParent(None)
        
        # 添加新控件
        for widget in widgets:
            self.content_layout.addWidget(widget)
        
        self.content_layout.addStretch()