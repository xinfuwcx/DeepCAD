"""
ABAQUS CAE Style Theme System - ABAQUS级别精致主题系统
Ultimate professional engineering software visual design
"""

from PyQt6.QtCore import Qt, QPropertyAnimation, QEasingCurve, QRect, QTimer
from PyQt6.QtGui import QColor, QLinearGradient, QPalette, QFont
from PyQt6.QtWidgets import QGraphicsDropShadowEffect


class AbaqusStyleTheme:
    """ABAQUS CAE风格主题系统 - 极致精致感"""
    
    # === ABAQUS经典色彩系统 ===
    # 主色调 - 深邃专业蓝
    PRIMARY_BLUE = "#1e3a8a"           # ABAQUS深蓝
    PRIMARY_BLUE_LIGHT = "#3b82f6"     # 明亮蓝
    PRIMARY_BLUE_DARK = "#1e40af"      # 深蓝
    
    # 金属质感灰色系
    METAL_DARK = "#1f2937"             # 深金属灰
    METAL_MEDIUM = "#374151"           # 中金属灰  
    METAL_LIGHT = "#6b7280"            # 浅金属灰
    METAL_HIGHLIGHT = "#9ca3af"        # 高亮金属
    
    # 高级表面色彩
    SURFACE_DARKEST = "#0f172a"        # 最深表面
    SURFACE_DARK = "#1e293b"           # 深表面
    SURFACE_MEDIUM = "#334155"         # 中表面
    SURFACE_LIGHT = "#475569"          # 浅表面
    SURFACE_LIGHTEST = "#64748b"       # 最浅表面
    
    # 精致强调色
    ACCENT_ORANGE = "#f97316"          # 工程橙
    ACCENT_GREEN = "#10b981"           # 成功绿
    ACCENT_RED = "#ef4444"             # 警告红
    ACCENT_YELLOW = "#f59e0b"          # 注意黄
    ACCENT_PURPLE = "#8b5cf6"          # 高级紫
    
    # 高对比度文字色彩
    TEXT_PRIMARY = "#f8fafc"           # 主文字 - 几乎白色
    TEXT_SECONDARY = "#e2e8f0"         # 次要文字
    TEXT_MUTED = "#94a3b8"             # 静默文字
    TEXT_ACCENT = "#60a5fa"            # 强调文字
    
    # 极致渐变效果
    GRADIENT_PRIMARY = "qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #1e40af, stop:0.3 #3b82f6, stop:0.7 #1e40af, stop:1 #1e3a8a)"
    GRADIENT_SURFACE = "qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #334155, stop:0.5 #1e293b, stop:1 #0f172a)"
    GRADIENT_METAL = "qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #6b7280, stop:0.3 #4b5563, stop:0.7 #374151, stop:1 #1f2937)"
    GRADIENT_HIGHLIGHT = "qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #60a5fa, stop:1 #3b82f6)"
    
    # 科技感光效
    GLOW_BLUE = "0 0 20px rgba(59, 130, 246, 0.4)"
    GLOW_ORANGE = "0 0 15px rgba(249, 115, 22, 0.3)"
    GLOW_GREEN = "0 0 15px rgba(16, 185, 129, 0.3)"
    
    @staticmethod
    def get_abaqus_stylesheet():
        """获取ABAQUS CAE风格样式表 - 极致精致"""
        return f"""
        /* ==================== 全局应用样式 ==================== */
        QApplication {{
            background: {AbaqusStyleTheme.SURFACE_DARKEST};
            font-family: "Segoe UI", "Microsoft YaHei UI", "Helvetica Neue", sans-serif;
            font-size: 9pt;
            font-weight: 500;
        }}
        
        /* ==================== 主窗口 - ABAQUS级别 ==================== */
        QMainWindow {{
            background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                stop:0 {AbaqusStyleTheme.SURFACE_DARKEST}, 
                stop:0.3 {AbaqusStyleTheme.SURFACE_DARK}, 
                stop:0.7 {AbaqusStyleTheme.SURFACE_MEDIUM}, 
                stop:1 {AbaqusStyleTheme.SURFACE_DARK});
            color: {AbaqusStyleTheme.TEXT_PRIMARY};
            border: 2px solid {AbaqusStyleTheme.METAL_MEDIUM};
            border-radius: 0px;
        }}
        
        /* ==================== 菜单栏 - 工程级精致 ==================== */
        QMenuBar {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 {AbaqusStyleTheme.METAL_DARK}, 
                stop:0.3 {AbaqusStyleTheme.SURFACE_DARK}, 
                stop:0.7 {AbaqusStyleTheme.METAL_DARK}, 
                stop:1 {AbaqusStyleTheme.SURFACE_DARKEST});
            color: {AbaqusStyleTheme.TEXT_PRIMARY};
            border: none;
            border-bottom: 3px solid {AbaqusStyleTheme.ACCENT_ORANGE};
            padding: 6px 0px;
            font-weight: 600;
            font-size: 10pt;
        }}
        
        QMenuBar::item {{
            background: transparent;
            padding: 10px 20px;
            margin: 0px 2px;
            border: 1px solid transparent;
            border-radius: 0px;
            transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        }}
        
        QMenuBar::item:selected {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 rgba(59, 130, 246, 0.2), 
                stop:1 rgba(30, 64, 175, 0.3));
            border: 1px solid {AbaqusStyleTheme.PRIMARY_BLUE_LIGHT};
            border-radius: 4px;
            color: {AbaqusStyleTheme.TEXT_PRIMARY};
            box-shadow: {AbaqusStyleTheme.GLOW_BLUE};
        }}
        
        QMenu {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 {AbaqusStyleTheme.SURFACE_DARK}, 
                stop:1 {AbaqusStyleTheme.SURFACE_DARKEST});
            color: {AbaqusStyleTheme.TEXT_PRIMARY};
            border: 2px solid {AbaqusStyleTheme.METAL_MEDIUM};
            border-radius: 8px;
            padding: 8px 0px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }}
        
        QMenu::item {{
            background: transparent;
            padding: 10px 24px;
            margin: 2px 8px;
            border-radius: 4px;
            font-weight: 500;
        }}
        
        QMenu::item:selected {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 {AbaqusStyleTheme.PRIMARY_BLUE_LIGHT}, 
                stop:1 {AbaqusStyleTheme.PRIMARY_BLUE_DARK});
            color: white;
            border: 1px solid {AbaqusStyleTheme.ACCENT_ORANGE};
            box-shadow: {AbaqusStyleTheme.GLOW_BLUE};
        }}
        
        /* ==================== 工具栏 - 专业CAE风格 ==================== */
        QToolBar {{
            background: {AbaqusStyleTheme.GRADIENT_METAL};
            border: 1px solid {AbaqusStyleTheme.METAL_MEDIUM};
            border-radius: 6px;
            padding: 4px;
            spacing: 8px;
        }}
        
        QToolButton {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 rgba(107, 114, 128, 0.1), 
                stop:1 rgba(55, 65, 81, 0.2));
            border: 1px solid {AbaqusStyleTheme.METAL_LIGHT};
            border-radius: 6px;
            padding: 8px 12px;
            color: {AbaqusStyleTheme.TEXT_PRIMARY};
            font-weight: 600;
            min-width: 80px;
            min-height: 32px;
        }}
        
        QToolButton:hover {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 rgba(59, 130, 246, 0.3), 
                stop:1 rgba(30, 64, 175, 0.4));
            border: 1px solid {AbaqusStyleTheme.ACCENT_ORANGE};
            box-shadow: {AbaqusStyleTheme.GLOW_BLUE};
            transform: translateY(-1px);
        }}
        
        QToolButton:pressed {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 {AbaqusStyleTheme.PRIMARY_BLUE_DARK}, 
                stop:1 {AbaqusStyleTheme.PRIMARY_BLUE});
            border: 2px solid {AbaqusStyleTheme.ACCENT_ORANGE};
            transform: translateY(1px);
        }}
        
        /* ==================== 按钮 - 工程级按钮 ==================== */
        QPushButton {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 {AbaqusStyleTheme.SURFACE_MEDIUM}, 
                stop:0.5 {AbaqusStyleTheme.SURFACE_DARK}, 
                stop:1 {AbaqusStyleTheme.SURFACE_DARKEST});
            border: 2px solid {AbaqusStyleTheme.METAL_MEDIUM};
            border-radius: 8px;
            color: {AbaqusStyleTheme.TEXT_PRIMARY};
            font-weight: 600;
            font-size: 10pt;
            padding: 12px 24px;
            min-width: 100px;
            min-height: 36px;
        }}
        
        QPushButton:hover {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 rgba(59, 130, 246, 0.4), 
                stop:0.5 rgba(30, 64, 175, 0.5), 
                stop:1 rgba(30, 58, 138, 0.6));
            border: 2px solid {AbaqusStyleTheme.ACCENT_ORANGE};
            box-shadow: {AbaqusStyleTheme.GLOW_BLUE};
            transform: translateY(-2px);
        }}
        
        QPushButton:pressed {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 {AbaqusStyleTheme.PRIMARY_BLUE}, 
                stop:1 {AbaqusStyleTheme.PRIMARY_BLUE_DARK});
            border: 3px solid {AbaqusStyleTheme.ACCENT_GREEN};
            transform: translateY(1px);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
        }}
        
        /* ==================== 面板和组框 - ABAQUS面板风格 ==================== */
        QGroupBox {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 rgba(51, 65, 85, 0.9), 
                stop:1 rgba(15, 23, 42, 0.9));
            border: 2px solid {AbaqusStyleTheme.METAL_MEDIUM};
            border-radius: 12px;
            color: {AbaqusStyleTheme.TEXT_PRIMARY};
            font-weight: 700;
            font-size: 11pt;
            padding-top: 20px;
            margin-top: 10px;
        }}
        
        QGroupBox::title {{
            subcontrol-origin: margin;
            subcontrol-position: top left;
            left: 15px;
            top: -8px;
            background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                stop:0 {AbaqusStyleTheme.ACCENT_ORANGE}, 
                stop:1 {AbaqusStyleTheme.ACCENT_YELLOW});
            color: white;
            padding: 6px 16px;
            border-radius: 6px;
            font-weight: 700;
            border: 1px solid {AbaqusStyleTheme.METAL_HIGHLIGHT};
        }}
        
        QFrame {{
            background: rgba(51, 65, 85, 0.3);
            border: 1px solid {AbaqusStyleTheme.METAL_LIGHT};
            border-radius: 8px;
            padding: 8px;
        }}
        
        /* ==================== 输入控件 - 高精度工程输入 ==================== */
        QLineEdit, QDoubleSpinBox, QSpinBox {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 {AbaqusStyleTheme.SURFACE_DARKEST}, 
                stop:1 {AbaqusStyleTheme.SURFACE_DARK});
            border: 2px solid {AbaqusStyleTheme.METAL_MEDIUM};
            border-radius: 6px;
            color: {AbaqusStyleTheme.TEXT_PRIMARY};
            font-weight: 500;
            font-size: 10pt;
            padding: 8px 12px;
            min-height: 24px;
            selection-background-color: {AbaqusStyleTheme.PRIMARY_BLUE_LIGHT};
        }}
        
        QLineEdit:focus, QDoubleSpinBox:focus, QSpinBox:focus {{
            border: 2px solid {AbaqusStyleTheme.ACCENT_ORANGE};
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 {AbaqusStyleTheme.SURFACE_DARK}, 
                stop:1 {AbaqusStyleTheme.SURFACE_MEDIUM});
            box-shadow: {AbaqusStyleTheme.GLOW_ORANGE};
        }}
        
        QComboBox {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 {AbaqusStyleTheme.SURFACE_MEDIUM}, 
                stop:1 {AbaqusStyleTheme.SURFACE_DARK});
            border: 2px solid {AbaqusStyleTheme.METAL_MEDIUM};
            border-radius: 6px;
            color: {AbaqusStyleTheme.TEXT_PRIMARY};
            font-weight: 500;
            padding: 8px 12px;
            min-width: 120px;
            min-height: 24px;
        }}
        
        QComboBox::drop-down {{
            subcontrol-origin: padding;
            subcontrol-position: top right;
            width: 30px;
            border-left: 2px solid {AbaqusStyleTheme.METAL_LIGHT};
            border-top-right-radius: 6px;
            border-bottom-right-radius: 6px;
            background: {AbaqusStyleTheme.GRADIENT_METAL};
        }}
        
        QComboBox::down-arrow {{
            image: none;
            border: 6px solid transparent;
            border-top: 8px solid {AbaqusStyleTheme.TEXT_SECONDARY};
            margin: 4px;
        }}
        
        QComboBox QAbstractItemView {{
            background: {AbaqusStyleTheme.SURFACE_DARK};
            border: 2px solid {AbaqusStyleTheme.METAL_MEDIUM};
            border-radius: 6px;
            color: {AbaqusStyleTheme.TEXT_PRIMARY};
            selection-background-color: {AbaqusStyleTheme.PRIMARY_BLUE_LIGHT};
            outline: none;
        }}
        
        /* ==================== 表格 - 数据表格CAE风格 ==================== */
        QTableWidget {{
            background: {AbaqusStyleTheme.SURFACE_DARKEST};
            alternate-background-color: {AbaqusStyleTheme.SURFACE_DARK};
            color: {AbaqusStyleTheme.TEXT_PRIMARY};
            border: 2px solid {AbaqusStyleTheme.METAL_MEDIUM};
            border-radius: 8px;
            gridline-color: {AbaqusStyleTheme.METAL_LIGHT};
            font-weight: 500;
        }}
        
        QTableWidget::item {{
            padding: 8px;
            border: 1px solid {AbaqusStyleTheme.METAL_LIGHT};
        }}
        
        QTableWidget::item:selected {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 {AbaqusStyleTheme.PRIMARY_BLUE_LIGHT}, 
                stop:1 {AbaqusStyleTheme.PRIMARY_BLUE_DARK});
            color: white;
        }}
        
        QHeaderView::section {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 {AbaqusStyleTheme.METAL_MEDIUM}, 
                stop:1 {AbaqusStyleTheme.METAL_DARK});
            color: {AbaqusStyleTheme.TEXT_PRIMARY};
            border: 1px solid {AbaqusStyleTheme.METAL_LIGHT};
            padding: 10px 8px;
            font-weight: 700;
            font-size: 10pt;
        }}
        
        /* ==================== 滚动条 - 精致滚动条 ==================== */
        QScrollBar:vertical {{
            background: {AbaqusStyleTheme.SURFACE_DARK};
            width: 16px;
            border: 1px solid {AbaqusStyleTheme.METAL_MEDIUM};
            border-radius: 8px;
            margin: 0px;
        }}
        
        QScrollBar::handle:vertical {{
            background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                stop:0 {AbaqusStyleTheme.METAL_LIGHT}, 
                stop:0.5 {AbaqusStyleTheme.METAL_MEDIUM}, 
                stop:1 {AbaqusStyleTheme.METAL_LIGHT});
            border: 1px solid {AbaqusStyleTheme.METAL_HIGHLIGHT};
            border-radius: 7px;
            min-height: 30px;
        }}
        
        QScrollBar::handle:vertical:hover {{
            background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                stop:0 {AbaqusStyleTheme.PRIMARY_BLUE_LIGHT}, 
                stop:1 {AbaqusStyleTheme.PRIMARY_BLUE});
            box-shadow: {AbaqusStyleTheme.GLOW_BLUE};
        }}
        
        /* ==================== 状态栏 - 专业状态显示 ==================== */
        QStatusBar {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 {AbaqusStyleTheme.SURFACE_DARK}, 
                stop:1 {AbaqusStyleTheme.SURFACE_DARKEST});
            border-top: 3px solid {AbaqusStyleTheme.ACCENT_GREEN};
            color: {AbaqusStyleTheme.TEXT_PRIMARY};
            font-weight: 600;
            padding: 8px;
        }}
        
        QStatusBar QLabel {{
            background: transparent;
            border: 1px solid {AbaqusStyleTheme.METAL_MEDIUM};
            border-radius: 4px;
            padding: 6px 12px;
            margin: 2px;
            font-weight: 600;
        }}
        
        /* ==================== 分割器 - 专业分割线 ==================== */
        QSplitter::handle {{
            background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                stop:0 {AbaqusStyleTheme.METAL_MEDIUM}, 
                stop:0.5 {AbaqusStyleTheme.ACCENT_ORANGE}, 
                stop:1 {AbaqusStyleTheme.METAL_MEDIUM});
            border: 1px solid {AbaqusStyleTheme.METAL_HIGHLIGHT};
            border-radius: 4px;
            margin: 2px;
        }}
        
        QSplitter::handle:hover {{
            background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                stop:0 {AbaqusStyleTheme.ACCENT_ORANGE}, 
                stop:1 {AbaqusStyleTheme.ACCENT_YELLOW});
            box-shadow: {AbaqusStyleTheme.GLOW_ORANGE};
        }}
        
        QSplitter::handle:vertical {{
            height: 12px;
        }}
        
        QSplitter::handle:horizontal {{
            width: 12px;
        }}
        
        /* ==================== 标签页 - CAE标签系统 ==================== */
        QTabWidget::pane {{
            background: {AbaqusStyleTheme.SURFACE_DARK};
            border: 2px solid {AbaqusStyleTheme.METAL_MEDIUM};
            border-radius: 8px;
            top: -2px;
        }}
        
        QTabBar::tab {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 {AbaqusStyleTheme.METAL_MEDIUM}, 
                stop:1 {AbaqusStyleTheme.METAL_DARK});
            border: 2px solid {AbaqusStyleTheme.METAL_LIGHT};
            border-bottom: none;
            border-radius: 8px 8px 0px 0px;
            color: {AbaqusStyleTheme.TEXT_PRIMARY};
            font-weight: 600;
            padding: 10px 20px;
            margin: 0px 2px;
        }}
        
        QTabBar::tab:selected {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 {AbaqusStyleTheme.PRIMARY_BLUE_LIGHT}, 
                stop:1 {AbaqusStyleTheme.PRIMARY_BLUE_DARK});
            border: 2px solid {AbaqusStyleTheme.ACCENT_ORANGE};
            border-bottom: none;
            color: white;
            box-shadow: {AbaqusStyleTheme.GLOW_BLUE};
        }}
        
        QTabBar::tab:hover:!selected {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 rgba(59, 130, 246, 0.3), 
                stop:1 rgba(30, 64, 175, 0.4));
            border: 2px solid {AbaqusStyleTheme.METAL_HIGHLIGHT};
        }}
        """


class AbaqusAnimationSystem:
    """ABAQUS级别动画系统"""
    
    @staticmethod
    def create_fade_in_animation(widget, duration=300):
        """创建淡入动画"""
        animation = QPropertyAnimation(widget, b"windowOpacity")
        animation.setDuration(duration)
        animation.setStartValue(0.0)
        animation.setEndValue(1.0)
        animation.setEasingCurve(QEasingCurve.Type.OutQuart)
        return animation
    
    @staticmethod
    def create_slide_in_animation(widget, direction="left", duration=400):
        """创建滑入动画"""
        geometry = widget.geometry()
        
        if direction == "left":
            start_pos = QRect(-geometry.width(), geometry.y(), geometry.width(), geometry.height())
        elif direction == "right":
            start_pos = QRect(geometry.x() + geometry.width(), geometry.y(), geometry.width(), geometry.height())
        elif direction == "top":
            start_pos = QRect(geometry.x(), -geometry.height(), geometry.width(), geometry.height())
        else:  # bottom
            start_pos = QRect(geometry.x(), geometry.y() + geometry.height(), geometry.width(), geometry.height())
        
        animation = QPropertyAnimation(widget, b"geometry")
        animation.setDuration(duration)
        animation.setStartValue(start_pos)
        animation.setEndValue(geometry)
        animation.setEasingCurve(QEasingCurve.Type.OutCubic)
        return animation
    
    @staticmethod
    def create_glow_effect(widget, color=QColor(59, 130, 246, 100)):
        """创建发光效果"""
        glow_effect = QGraphicsDropShadowEffect()
        glow_effect.setBlurRadius(20)
        glow_effect.setColor(color)
        glow_effect.setOffset(0, 0)
        widget.setGraphicsEffect(glow_effect)
        return glow_effect
    
    @staticmethod
    def create_hover_animation(widget, scale_factor=1.05, duration=150):
        """创建悬停缩放动画"""
        animation = QPropertyAnimation(widget, b"geometry")
        animation.setDuration(duration)
        animation.setEasingCurve(QEasingCurve.Type.OutQuart)
        
        original_geometry = widget.geometry()
        scaled_geometry = QRect(
            original_geometry.x() - int(original_geometry.width() * (scale_factor - 1) / 2),
            original_geometry.y() - int(original_geometry.height() * (scale_factor - 1) / 2),
            int(original_geometry.width() * scale_factor),
            int(original_geometry.height() * scale_factor)
        )
        
        return animation, original_geometry, scaled_geometry


class AbaqusEffectsSystem:
    """ABAQUS特效系统"""
    
    @staticmethod
    def apply_metal_finish(widget):
        """应用金属质感"""
        effect = QGraphicsDropShadowEffect()
        effect.setBlurRadius(15)
        effect.setColor(QColor(107, 114, 128, 80))
        effect.setOffset(2, 2)
        widget.setGraphicsEffect(effect)
    
    @staticmethod
    def apply_glass_effect(widget):
        """应用玻璃质感"""
        widget.setStyleSheet(widget.styleSheet() + """
            background: rgba(51, 65, 85, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(156, 163, 175, 0.3);
        """)
    
    @staticmethod
    def apply_engineering_shadow(widget):
        """应用工程级阴影"""
        shadow = QGraphicsDropShadowEffect()
        shadow.setBlurRadius(25)
        shadow.setColor(QColor(0, 0, 0, 120))
        shadow.setOffset(3, 3)
        widget.setGraphicsEffect(shadow)
    
    @staticmethod
    def create_status_indicator(color_active="#10b981", color_inactive="#6b7280"):
        """创建状态指示器样式"""
        return f"""
            QLabel {{
                background: qradialgradient(cx:0.5, cy:0.5, radius:0.5,
                    stop:0 {color_active}, 
                    stop:0.7 {color_active}, 
                    stop:1 rgba(16, 185, 129, 0));
                border: 2px solid white;
                border-radius: 8px;
                min-width: 16px;
                min-height: 16px;
                max-width: 16px;
                max-height: 16px;
            }}
        """