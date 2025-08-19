"""
Terra 高级图标提供器
精致的 Fusion 360 风格图标系统
"""

from PyQt6.QtCore import Qt, QRect, QPointF
from PyQt6.QtGui import (QPixmap, QPainter, QFont, QColor, QIcon, 
                        QPen, QBrush, QLinearGradient, QRadialGradient,
                        QPainterPath, QPolygonF)
from PyQt6.QtWidgets import QWidget
import math

class PremiumIconProvider:
    """高级图标提供器 - Fusion 360 风格"""
    
    # Fusion 360 配色方案
    COLORS = {
        "primary": "#FF7A00",      # Fusion 橙色主色
        "primary_light": "#FF8A1A", # 浅橙色
        "primary_dark": "#E66A00",  # 深橙色
        "secondary": "#4A90E2",     # 蓝色辅助色
        "success": "#50C878",       # 成功绿色
        "warning": "#FFB020",       # 警告黄色
        "danger": "#FF4757",        # 危险红色
        "text_primary": "#FFFFFF",  # 主文字
        "text_secondary": "#CCCCCC", # 次文字
        "surface": "#2F2F2F",       # 表面色
        "surface_light": "#3A3A3A", # 浅表面色
    }
    
    @classmethod
    def create_workspace_icon(cls, workspace_type: str, size: int = 32) -> QIcon:
        """创建工作空间图标"""
        workspace_configs = {
            "geometry": {
                "background": cls.COLORS["primary"],
                "symbol": "📐",
                "shape": "cube"
            },
            "mesh": {
                "background": cls.COLORS["secondary"], 
                "symbol": "🕸️",
                "shape": "mesh"
            },
            "simulation": {
                "background": cls.COLORS["warning"],
                "symbol": "⚡",
                "shape": "lightning"
            },
            "results": {
                "background": cls.COLORS["success"],
                "symbol": "📊", 
                "shape": "chart"
            }
        }
        
        config = workspace_configs.get(workspace_type, workspace_configs["geometry"])
        
        if config["shape"] == "cube":
            return cls._create_cube_icon(size, config["background"])
        elif config["shape"] == "mesh":
            return cls._create_mesh_icon(size, config["background"])
        elif config["shape"] == "lightning":
            return cls._create_lightning_icon(size, config["background"])
        elif config["shape"] == "chart":
            return cls._create_chart_icon(size, config["background"])
        else:
            return cls._create_text_icon(config["symbol"], size, config["background"])
    
    @classmethod
    def _create_cube_icon(cls, size: int, color: str) -> QIcon:
        """创建立方体图标"""
        pixmap = QPixmap(size, size)
        pixmap.fill(Qt.GlobalColor.transparent)
        
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 创建3D立方体效果
        margin = size * 0.15
        cube_size = size - 2 * margin
        
        # 背景圆形
        cls._draw_icon_background(painter, size, color)
        
        # 绘制立方体
        pen = QPen(QColor("#FFFFFF"), 2)
        painter.setPen(pen)
        
        # 前面
        front_rect = QRect(
            int(margin + cube_size * 0.1), 
            int(margin + cube_size * 0.1),
            int(cube_size * 0.6), 
            int(cube_size * 0.6)
        )
        painter.drawRect(front_rect)
        
        # 侧面
        side_points = [
            QPointF(front_rect.right(), front_rect.top()),
            QPointF(front_rect.right() + cube_size * 0.2, front_rect.top() - cube_size * 0.2),
            QPointF(front_rect.right() + cube_size * 0.2, front_rect.bottom() - cube_size * 0.2),
            QPointF(front_rect.right(), front_rect.bottom())
        ]
        painter.drawPolygon(QPolygonF(side_points))
        
        # 顶面
        top_points = [
            QPointF(front_rect.left(), front_rect.top()),
            QPointF(front_rect.left() + cube_size * 0.2, front_rect.top() - cube_size * 0.2),
            QPointF(front_rect.right() + cube_size * 0.2, front_rect.top() - cube_size * 0.2),
            QPointF(front_rect.right(), front_rect.top())
        ]
        painter.drawPolygon(QPolygonF(top_points))
        
        painter.end()
        return QIcon(pixmap)
    
    @classmethod
    def _create_mesh_icon(cls, size: int, color: str) -> QIcon:
        """创建网格图标"""
        pixmap = QPixmap(size, size)
        pixmap.fill(Qt.GlobalColor.transparent)
        
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 背景
        cls._draw_icon_background(painter, size, color)
        
        # 绘制网格
        pen = QPen(QColor("#FFFFFF"), 1.5)
        painter.setPen(pen)
        
        margin = size * 0.2
        grid_size = size - 2 * margin
        grid_spacing = grid_size / 4
        
        # 垂直线
        for i in range(5):
            x = margin + i * grid_spacing
            painter.drawLine(int(x), int(margin), int(x), int(margin + grid_size))
        
        # 水平线
        for i in range(5):
            y = margin + i * grid_spacing
            painter.drawLine(int(margin), int(y), int(margin + grid_size), int(y))
        
        # 绘制节点
        brush = QBrush(QColor("#FFFFFF"))
        painter.setBrush(brush)
        painter.setPen(Qt.PenStyle.NoPen)
        
        for i in range(5):
            for j in range(5):
                x = margin + i * grid_spacing
                y = margin + j * grid_spacing
                painter.drawEllipse(QPointF(x, y), 2, 2)
        
        painter.end()
        return QIcon(pixmap)
    
    @classmethod
    def _create_lightning_icon(cls, size: int, color: str) -> QIcon:
        """创建闪电图标"""
        pixmap = QPixmap(size, size)
        pixmap.fill(Qt.GlobalColor.transparent)
        
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 背景
        cls._draw_icon_background(painter, size, color)
        
        # 绘制闪电
        margin = size * 0.2
        lightning_width = size - 2 * margin
        lightning_height = size - 2 * margin
        
        # 创建闪电路径
        path = QPainterPath()
        
        # 闪电形状的点
        points = [
            QPointF(margin + lightning_width * 0.4, margin),
            QPointF(margin + lightning_width * 0.7, margin + lightning_height * 0.35),
            QPointF(margin + lightning_width * 0.55, margin + lightning_height * 0.35),
            QPointF(margin + lightning_width * 0.8, margin + lightning_height),
            QPointF(margin + lightning_width * 0.4, margin + lightning_height * 0.65),
            QPointF(margin + lightning_width * 0.55, margin + lightning_height * 0.65),
            QPointF(margin + lightning_width * 0.2, margin + lightning_height * 0.3),
        ]
        
        path.moveTo(points[0])
        for point in points[1:]:
            path.lineTo(point)
        path.closeSubpath()
        
        # 填充闪电
        gradient = QLinearGradient(0, margin, 0, margin + lightning_height)
        gradient.setColorAt(0, QColor("#FFFFFF"))
        gradient.setColorAt(1, QColor("#CCCCCC"))
        
        painter.setBrush(QBrush(gradient))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawPath(path)
        
        painter.end()
        return QIcon(pixmap)
    
    @classmethod
    def _create_chart_icon(cls, size: int, color: str) -> QIcon:
        """创建图表图标"""
        pixmap = QPixmap(size, size)
        pixmap.fill(Qt.GlobalColor.transparent)
        
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 背景
        cls._draw_icon_background(painter, size, color)
        
        # 绘制图表
        margin = size * 0.25
        chart_width = size - 2 * margin
        chart_height = size - 2 * margin
        
        # 坐标轴
        pen = QPen(QColor("#FFFFFF"), 2)
        painter.setPen(pen)
        
        # Y轴
        painter.drawLine(
            int(margin), int(margin),
            int(margin), int(margin + chart_height)
        )
        
        # X轴
        painter.drawLine(
            int(margin), int(margin + chart_height),
            int(margin + chart_width), int(margin + chart_height)
        )
        
        # 绘制柱状图
        bar_width = chart_width / 5
        bar_heights = [0.3, 0.7, 0.5, 0.9, 0.6]  # 相对高度
        
        for i, height in enumerate(bar_heights):
            x = margin + (i + 0.5) * bar_width
            bar_height = chart_height * height * 0.8
            y = margin + chart_height - bar_height
            
            # 创建渐变
            gradient = QLinearGradient(0, y, 0, y + bar_height)
            gradient.setColorAt(0, QColor("#FFFFFF"))
            gradient.setColorAt(1, QColor("#CCCCCC"))
            
            painter.setBrush(QBrush(gradient))
            painter.setPen(Qt.PenStyle.NoPen)
            
            bar_rect = QRect(
                int(x - bar_width * 0.3), int(y),
                int(bar_width * 0.6), int(bar_height)
            )
            painter.drawRect(bar_rect)
        
        painter.end()
        return QIcon(pixmap)
    
    @classmethod
    def _draw_icon_background(cls, painter: QPainter, size: int, color: str):
        """绘制图标背景"""
        # 创建径向渐变背景
        gradient = QRadialGradient(size/2, size/2, size/2)
        
        base_color = QColor(color)
        light_color = QColor(color)
        dark_color = QColor(color)
        
        # 调整颜色亮度
        light_color.setHsl(light_color.hue(), light_color.saturation(), min(255, light_color.lightness() + 30))
        dark_color.setHsl(dark_color.hue(), dark_color.saturation(), max(0, dark_color.lightness() - 30))
        
        gradient.setColorAt(0, light_color)
        gradient.setColorAt(0.7, base_color)
        gradient.setColorAt(1, dark_color)
        
        painter.setBrush(QBrush(gradient))
        painter.setPen(Qt.PenStyle.NoPen)
        
        # 绘制圆形背景
        margin = size * 0.05
        painter.drawEllipse(int(margin), int(margin), int(size - 2*margin), int(size - 2*margin))
    
    @classmethod
    def _create_text_icon(cls, text: str, size: int, bg_color: str) -> QIcon:
        """创建文本图标（回退方案）"""
        pixmap = QPixmap(size, size)
        pixmap.fill(Qt.GlobalColor.transparent)
        
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 背景
        cls._draw_icon_background(painter, size, bg_color)
        
        # 文本
        font = QFont("Segoe UI Emoji", int(size * 0.5))
        painter.setFont(font)
        painter.setPen(QColor("#FFFFFF"))
        
        painter.drawText(
            pixmap.rect(),
            Qt.AlignmentFlag.AlignCenter,
            text
        )
        
        painter.end()
        return QIcon(pixmap)
    
    @classmethod
    def create_tool_icon(cls, tool_type: str, size: int = 24) -> QIcon:
        """创建工具图标"""
        tool_configs = {
            "new": {"symbol": "📄", "color": cls.COLORS["primary"]},
            "open": {"symbol": "📂", "color": cls.COLORS["secondary"]},
            "save": {"symbol": "💾", "color": cls.COLORS["success"]},
            "run": {"symbol": "▶️", "color": cls.COLORS["success"]},
            "stop": {"symbol": "⏹️", "color": cls.COLORS["danger"]},
            "settings": {"symbol": "⚙️", "color": cls.COLORS["text_secondary"]},
        }
        
        config = tool_configs.get(tool_type, {"symbol": "?", "color": cls.COLORS["text_secondary"]})
        return cls._create_text_icon(config["symbol"], size, config["color"])
    
    @classmethod
    def create_status_icon(cls, status: str, size: int = 16) -> QIcon:
        """创建状态图标"""
        status_configs = {
            "success": {"symbol": "✅", "color": cls.COLORS["success"]},
            "error": {"symbol": "❌", "color": cls.COLORS["danger"]},
            "warning": {"symbol": "⚠️", "color": cls.COLORS["warning"]},
            "info": {"symbol": "ℹ️", "color": cls.COLORS["secondary"]},
            "running": {"symbol": "🔄", "color": cls.COLORS["primary"]},
        }
        
        config = status_configs.get(status, {"symbol": "?", "color": cls.COLORS["text_secondary"]})
        return cls._create_text_icon(config["symbol"], size, config["color"])
    
    @classmethod
    def create_fusion_button(cls, text: str, icon_type: str = None, size: int = 32) -> str:
        """创建 Fusion 风格按钮文本"""
        if icon_type:
            icons = {
                "new": "🆕",
                "open": "📂", 
                "save": "💾",
                "run": "🚀",
                "stop": "⏹️",
                "pause": "⏸️",
                "settings": "⚙️",
                "help": "❓",
                "about": "ℹ️"
            }
            icon = icons.get(icon_type, "")
            return f"{icon} {text}" if icon else text
        return text


class AnimatedIconProvider:
    """动画图标提供器"""
    
    @classmethod
    def create_loading_icon(cls, size: int = 24, angle: float = 0) -> QIcon:
        """创建加载中图标"""
        pixmap = QPixmap(size, size)
        pixmap.fill(Qt.GlobalColor.transparent)
        
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 旋转画布
        painter.translate(size/2, size/2)
        painter.rotate(angle)
        painter.translate(-size/2, -size/2)
        
        # 绘制加载圆环
        pen = QPen()
        pen.setWidth(3)
        pen.setCapStyle(Qt.PenCapStyle.RoundCap)
        
        margin = size * 0.15
        rect = QRect(int(margin), int(margin), int(size - 2*margin), int(size - 2*margin))
        
        # 渐变色环
        for i in range(8):
            angle_start = i * 45
            opacity = max(0.2, 1.0 - i * 0.1)
            
            color = QColor(PremiumIconProvider.COLORS["primary"])
            color.setAlphaF(opacity)
            pen.setColor(color)
            painter.setPen(pen)
            
            painter.drawArc(rect, angle_start * 16, 30 * 16)
        
        painter.end()
        return QIcon(pixmap)


class FusionColorScheme:
    """Fusion 360 配色方案管理"""
    
    # 主要配色
    PRIMARY = "#FF7A00"
    PRIMARY_LIGHT = "#FF8A1A"
    PRIMARY_DARK = "#E66A00"
    
    # 辅助配色
    SECONDARY = "#4A90E2"
    SUCCESS = "#50C878"
    WARNING = "#FFB020"
    DANGER = "#FF4757"
    
    # 表面配色
    SURFACE_DARK = "#1C1C1C"
    SURFACE = "#2F2F2F"
    SURFACE_LIGHT = "#3A3A3A"
    SURFACE_LIGHTER = "#4A4A4A"
    
    # 文字配色
    TEXT_PRIMARY = "#FFFFFF"
    TEXT_SECONDARY = "#CCCCCC"
    TEXT_TERTIARY = "#888888"
    TEXT_DISABLED = "#555555"
    
    @classmethod
    def get_gradient(cls, color_name: str, direction: str = "vertical") -> str:
        """获取渐变CSS"""
        gradients = {
            "primary": f"qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 {cls.PRIMARY_LIGHT}, stop:1 {cls.PRIMARY_DARK})",
            "surface": f"qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 {cls.SURFACE_LIGHT}, stop:1 {cls.SURFACE})",
            "secondary": f"qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #5A9AE2, stop:1 {cls.SECONDARY})"
        }
        return gradients.get(color_name, cls.SURFACE)