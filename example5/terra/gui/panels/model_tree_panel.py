"""
Terra 模型树面板
"""

from PyQt6.QtWidgets import QWidget, QVBoxLayout, QTreeWidget, QTreeWidgetItem, QLabel
from PyQt6.QtCore import Qt

class ModelTreePanel(QWidget):
    """模型树面板"""
    
    def __init__(self, gmsh_engine=None):
        super().__init__()
        self.gmsh_engine = gmsh_engine
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        # 标题
        title = QLabel("📁 模型树")
        layout.addWidget(title)
        
        # 树控件
        self.tree = QTreeWidget()
        self.tree.setHeaderLabel("几何实体")
        layout.addWidget(self.tree)
        
        # 初始化树结构
        self.setup_tree()
    
    def setup_tree(self):
        """设置树结构"""
        # 根节点
        root = QTreeWidgetItem(self.tree)
        root.setText(0, "🌍 Terra 项目")
        root.setExpanded(True)
        
        # 几何节点
        geometry_node = QTreeWidgetItem(root)
        geometry_node.setText(0, "📐 几何")
        geometry_node.setExpanded(True)
        
        # 网格节点
        mesh_node = QTreeWidgetItem(root)
        mesh_node.setText(0, "🕸️ 网格")
        
        # 仿真节点
        simulation_node = QTreeWidgetItem(root)
        simulation_node.setText(0, "⚡ 仿真")
    
    def refresh(self):
        """刷新模型树"""
        if not self.gmsh_engine:
            return
        
        # 清空并重建树
        self.tree.clear()
        self.setup_tree()
        
        # 添加几何实体
        root = self.tree.topLevelItem(0)
        geometry_node = root.child(0)
        
        for entity in self.gmsh_engine.get_geometry_entities():
            entity_item = QTreeWidgetItem(geometry_node)
            entity_item.setText(0, f"{entity['name']} ({entity['type']})")
            
        geometry_node.setExpanded(True)