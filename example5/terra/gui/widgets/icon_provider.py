"""
Terra 图标提供器
使用字体图标和 Unicode 符号替代图片图标
"""

from PyQt6.QtCore import Qt
from PyQt6.QtGui import QPixmap, QPainter, QFont, QColor, QIcon
from PyQt6.QtWidgets import QWidget

class IconProvider:
    """图标提供器 - 生成基于文字的图标"""
    
    # 图标映射表
    ICONS = {
        # 文件操作
        "new": "📄",
        "open": "📂", 
        "save": "💾",
        "export": "📤",
        "import": "📥",
        
        # 几何操作
        "box": "📦",
        "cylinder": "🥫",
        "sphere": "⚪",
        "cone": "🔺",
        "plane": "⬜",
        
        # 分析操作
        "run": "🚀",
        "stop": "⏹️",
        "pause": "⏸️",
        "settings": "⚙️",
        "calculate": "🔢",
        
        # 视图操作
        "zoom_in": "🔍+",
        "zoom_out": "🔍-",
        "fit": "📏",
        "rotate": "🔄",
        "pan": "✋",
        
        # 状态图标
        "success": "✅",
        "error": "❌", 
        "warning": "⚠️",
        "info": "ℹ️",
        "question": "❓",
        
        # 导航图标
        "up": "⬆️",
        "down": "⬇️",
        "left": "⬅️",
        "right": "➡️",
        "back": "🔙",
        "forward": "🔜",
        
        # 工具图标
        "mesh": "🕸️",
        "material": "🧱",
        "boundary": "🚧",
        "load": "⚡",
        "constraint": "🔗",
        
        # 结果图标
        "chart": "📊",
        "graph": "📈",
        "table": "📋",
        "3d_view": "🎯",
        "animation": "🎬",
        
        # 应用图标
        "help": "❓",
        "about": "ℹ️",
        "close": "❌",
        "minimize": "➖",
        "maximize": "⬜",
        
        # 编辑图标
        "cut": "✂️",
        "copy": "📋",
        "paste": "📌",
        "undo": "↶",
        "redo": "↷",
        "delete": "🗑️",
        
        # 特殊图标
        "terra": "🌍",
        "kratos": "⚡",
        "gmsh": "🔧",
        "cae": "🏗️"
    }
    
    @classmethod
    def get_icon(cls, name: str, size: int = 24, color: str = "#ffffff") -> QIcon:
        """获取指定名称的图标"""
        if name not in cls.ICONS:
            # 如果图标不存在，返回默认图标
            return cls.create_text_icon("?", size, color)
        
        emoji = cls.ICONS[name]
        return cls.create_text_icon(emoji, size, color)
    
    @classmethod
    def create_text_icon(cls, text: str, size: int = 24, color: str = "#ffffff") -> QIcon:
        """创建基于文本的图标"""
        # 创建像素图
        pixmap = QPixmap(size, size)
        pixmap.fill(Qt.GlobalColor.transparent)
        
        # 创建画家
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 设置字体
        font = QFont("Segoe UI Emoji", int(size * 0.7))
        painter.setFont(font)
        
        # 设置颜色
        painter.setPen(QColor(color))
        
        # 绘制文本
        painter.drawText(
            pixmap.rect(), 
            Qt.AlignmentFlag.AlignCenter, 
            text
        )
        
        painter.end()
        
        return QIcon(pixmap)
    
    @classmethod
    def create_colored_icon(cls, text: str, size: int = 24, 
                           bg_color: str = "#0078d4", 
                           text_color: str = "#ffffff") -> QIcon:
        """创建带背景色的图标"""
        # 创建像素图
        pixmap = QPixmap(size, size)
        pixmap.fill(Qt.GlobalColor.transparent)
        
        # 创建画家
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 绘制背景圆形
        painter.setBrush(QColor(bg_color))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawEllipse(2, 2, size-4, size-4)
        
        # 设置字体和颜色
        font = QFont("Segoe UI", int(size * 0.4), QFont.Weight.Bold)
        painter.setFont(font)
        painter.setPen(QColor(text_color))
        
        # 绘制文本
        painter.drawText(
            pixmap.rect(), 
            Qt.AlignmentFlag.AlignCenter, 
            text
        )
        
        painter.end()
        
        return QIcon(pixmap)
    
    @classmethod
    def get_workspace_icon(cls, workspace_type: str) -> QIcon:
        """获取工作空间图标"""
        workspace_icons = {
            "geometry": cls.get_icon("box", 24),
            "mesh": cls.get_icon("mesh", 24),
            "simulation": cls.get_icon("calculate", 24),
            "results": cls.get_icon("chart", 24)
        }
        
        return workspace_icons.get(workspace_type, cls.get_icon("help", 24))
    
    @classmethod
    def get_status_icon(cls, status: str) -> QIcon:
        """获取状态图标"""
        status_icons = {
            "ready": cls.get_icon("success", 16),
            "running": cls.get_icon("run", 16),
            "error": cls.get_icon("error", 16),
            "warning": cls.get_icon("warning", 16),
            "info": cls.get_icon("info", 16)
        }
        
        return status_icons.get(status, cls.get_icon("question", 16))
    
    @classmethod
    def get_tool_icon(cls, tool: str, size: int = 20) -> QIcon:
        """获取工具图标"""
        tool_icons = {
            "select": "👆",
            "move": "✋",
            "rotate": "🔄",
            "scale": "📏",
            "measure": "📐"
        }
        
        if tool in tool_icons:
            return cls.create_text_icon(tool_icons[tool], size)
        else:
            return cls.get_icon(tool, size)


class IconButton:
    """图标按钮辅助类"""
    
    @staticmethod
    def create_icon_button(icon_name: str, text: str = "", size: int = 24) -> str:
        """创建带图标的按钮文本"""
        if icon_name in IconProvider.ICONS:
            icon = IconProvider.ICONS[icon_name]
            if text:
                return f"{icon} {text}"
            else:
                return icon
        else:
            return text or "?"