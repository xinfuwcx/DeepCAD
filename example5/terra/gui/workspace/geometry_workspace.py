"""
Terra 几何建模工作空间
"""

import logging
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QPushButton, 
    QGroupBox, QFormLayout, QDoubleSpinBox, QLineEdit,
    QLabel, QFrame
)
from PyQt6.QtCore import Qt, pyqtSlot

logger = logging.getLogger(__name__)

class GeometryWorkspace(QWidget):
    """几何建模工作空间 - Fusion 360 风格"""
    
    def __init__(self, gmsh_engine=None):
        super().__init__()
        
        self.gmsh_engine = gmsh_engine
        self.init_ui()
        
        logger.info("几何工作空间初始化完成")
    
    def init_ui(self):
        """初始化用户界面"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 8, 8, 8)
        
        # 几何工具栏
        self.create_geometry_toolbar()
        layout.addWidget(self.geometry_toolbar)
        
        # 主要内容区域
        content_layout = QHBoxLayout()
        
        # 左侧工具面板
        self.create_tools_panel()
        content_layout.addWidget(self.tools_panel)
        
        # 中央3D视口（临时占位符）
        self.create_viewport()
        content_layout.addWidget(self.viewport, 1)  # 拉伸因子为1
        
        layout.addLayout(content_layout, 1)
        
        # 底部状态信息
        self.create_status_info()
        layout.addWidget(self.status_info)
    
    def create_geometry_toolbar(self):
        """创建几何工具栏"""
        self.geometry_toolbar = QGroupBox("几何工具")
        toolbar_layout = QHBoxLayout(self.geometry_toolbar)
        
        # 基础几何体按钮
        self.box_btn = QPushButton("📦 立方体")
        self.box_btn.setToolTip("创建立方体")
        self.box_btn.clicked.connect(self.create_box)
        toolbar_layout.addWidget(self.box_btn)
        
        self.cylinder_btn = QPushButton("🟢 圆柱体")
        self.cylinder_btn.setToolTip("创建圆柱体")
        self.cylinder_btn.clicked.connect(self.create_cylinder)
        toolbar_layout.addWidget(self.cylinder_btn)
        
        self.sphere_btn = QPushButton("🔵 球体")
        self.sphere_btn.setToolTip("创建球体")
        self.sphere_btn.clicked.connect(self.create_sphere)
        toolbar_layout.addWidget(self.sphere_btn)
        
        toolbar_layout.addStretch()  # 弹性空间
        
        # 布尔运算按钮
        self.union_btn = QPushButton("🔗 合并")
        self.union_btn.setToolTip("布尔合并")
        toolbar_layout.addWidget(self.union_btn)
        
        self.cut_btn = QPushButton("✂️ 切除")
        self.cut_btn.setToolTip("布尔切除")
        toolbar_layout.addWidget(self.cut_btn)
    
    def create_tools_panel(self):
        """创建工具面板"""
        self.tools_panel = QGroupBox("参数设置")
        self.tools_panel.setFixedWidth(200)
        
        tools_layout = QVBoxLayout(self.tools_panel)
        
        # 立方体参数
        box_group = QGroupBox("立方体参数")
        box_form = QFormLayout(box_group)
        
        self.box_length = QDoubleSpinBox()
        self.box_length.setValue(1.0)
        self.box_length.setRange(0.1, 100.0)
        self.box_length.setSingleStep(0.1)
        box_form.addRow("长度:", self.box_length)
        
        self.box_width = QDoubleSpinBox()
        self.box_width.setValue(1.0)
        self.box_width.setRange(0.1, 100.0)
        self.box_width.setSingleStep(0.1)
        box_form.addRow("宽度:", self.box_width)
        
        self.box_height = QDoubleSpinBox()
        self.box_height.setValue(1.0)
        self.box_height.setRange(0.1, 100.0)
        self.box_height.setSingleStep(0.1)
        box_form.addRow("高度:", self.box_height)
        
        tools_layout.addWidget(box_group)
        
        # 圆柱体参数
        cylinder_group = QGroupBox("圆柱体参数")
        cylinder_form = QFormLayout(cylinder_group)
        
        self.cylinder_radius = QDoubleSpinBox()
        self.cylinder_radius.setValue(0.5)
        self.cylinder_radius.setRange(0.1, 50.0)
        self.cylinder_radius.setSingleStep(0.1)
        cylinder_form.addRow("半径:", self.cylinder_radius)
        
        self.cylinder_height = QDoubleSpinBox()
        self.cylinder_height.setValue(1.0)
        self.cylinder_height.setRange(0.1, 100.0)
        self.cylinder_height.setSingleStep(0.1)
        cylinder_form.addRow("高度:", self.cylinder_height)
        
        tools_layout.addWidget(cylinder_group)
        
        # 球体参数
        sphere_group = QGroupBox("球体参数")
        sphere_form = QFormLayout(sphere_group)
        
        self.sphere_radius = QDoubleSpinBox()
        self.sphere_radius.setValue(0.5)
        self.sphere_radius.setRange(0.1, 50.0)
        self.sphere_radius.setSingleStep(0.1)
        sphere_form.addRow("半径:", self.sphere_radius)
        
        tools_layout.addWidget(sphere_group)
        
        tools_layout.addStretch()  # 弹性空间
    
    def create_viewport(self):
        """创建3D视口（临时占位符）"""
        self.viewport = QFrame()
        self.viewport.setFrameStyle(QFrame.Shape.StyledPanel)
        self.viewport.setMinimumHeight(400)
        
        # 临时内容
        viewport_layout = QVBoxLayout(self.viewport)
        
        placeholder_label = QLabel("🌍 Terra 3D 视口")
        placeholder_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        placeholder_label.setStyleSheet("""
            QLabel {
                font-size: 18px;
                color: #888888;
                border: 2px dashed #555555;
                padding: 50px;
                border-radius: 8px;
                background-color: #333333;
            }
        """)
        
        viewport_layout.addWidget(placeholder_label)
        
        # 说明文字
        info_label = QLabel("这里将显示 GMSH 生成的 3D 几何模型\n\n点击左侧按钮创建几何体")
        info_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        info_label.setStyleSheet("color: #aaaaaa; font-size: 12px;")
        viewport_layout.addWidget(info_label)
    
    def create_status_info(self):
        """创建状态信息栏"""
        self.status_info = QFrame()
        self.status_info.setFrameStyle(QFrame.Shape.StyledPanel)
        self.status_info.setFixedHeight(60)
        
        status_layout = QHBoxLayout(self.status_info)
        
        self.entities_label = QLabel("几何实体: 0")
        status_layout.addWidget(self.entities_label)
        
        status_layout.addStretch()
        
        self.coordinates_label = QLabel("坐标: (0, 0, 0)")
        status_layout.addWidget(self.coordinates_label)
    
    def get_property_widgets(self):
        """获取属性面板控件"""
        return [self.tools_panel]
    
    # === 几何创建槽函数 ===
    
    @pyqtSlot()
    def create_box(self):
        """创建立方体"""
        if not self.gmsh_engine:
            return
        
        try:
            # 获取参数
            dx = self.box_length.value()
            dy = self.box_width.value()
            dz = self.box_height.value()
            
            # 创建立方体
            self.gmsh_engine.create_box(
                x=0, y=0, z=0,
                dx=dx, dy=dy, dz=dz,
                name=f"立方体_{len(self.gmsh_engine.geometry_entities) + 1}"
            )
            
            # 更新状态
            self.update_entities_count()
            
            logger.info(f"创建立方体: {dx}x{dy}x{dz}")
            
        except Exception as e:
            logger.error(f"创建立方体失败: {e}")
    
    @pyqtSlot()
    def create_cylinder(self):
        """创建圆柱体"""
        if not self.gmsh_engine:
            return
        
        try:
            # 获取参数
            r = self.cylinder_radius.value()
            h = self.cylinder_height.value()
            
            # 创建圆柱体
            self.gmsh_engine.create_cylinder(
                x=0, y=0, z=0,
                dx=0, dy=0, dz=h,
                r=r,
                name=f"圆柱体_{len(self.gmsh_engine.geometry_entities) + 1}"
            )
            
            # 更新状态
            self.update_entities_count()
            
            logger.info(f"创建圆柱体: 半径={r}, 高度={h}")
            
        except Exception as e:
            logger.error(f"创建圆柱体失败: {e}")
    
    @pyqtSlot()
    def create_sphere(self):
        """创建球体"""
        if not self.gmsh_engine:
            return
        
        try:
            # 获取参数
            r = self.sphere_radius.value()
            
            # 创建球体
            self.gmsh_engine.create_sphere(
                x=0, y=0, z=0,
                r=r,
                name=f"球体_{len(self.gmsh_engine.geometry_entities) + 1}"
            )
            
            # 更新状态
            self.update_entities_count()
            
            logger.info(f"创建球体: 半径={r}")
            
        except Exception as e:
            logger.error(f"创建球体失败: {e}")
    
    def update_entities_count(self):
        """更新实体数量显示"""
        if self.gmsh_engine:
            count = len(self.gmsh_engine.geometry_entities)
            self.entities_label.setText(f"几何实体: {count}")