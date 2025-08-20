"""
Terra Fusion 360 风格启动画面
"""

from PyQt6.QtWidgets import QSplashScreen, QProgressBar, QLabel, QVBoxLayout, QWidget
from PyQt6.QtCore import Qt, QTimer, QPropertyAnimation, QEasingCurve, pyqtProperty
from PyQt6.QtGui import QPixmap, QPainter, QLinearGradient, QColor, QFont, QPen, QBrush
import math

class FusionSplashScreen(QSplashScreen):
    """Fusion 360 风格启动画面"""
    
    def __init__(self):
        # 创建启动画面背景
        pixmap = self.create_splash_background()
        super().__init__(pixmap)
        
        self.setWindowFlags(Qt.WindowType.SplashScreen | Qt.WindowType.FramelessWindowHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        
        self.progress_value = 0
        self.status_text = "正在启动 Terra..."
        
        # 设置动画
        self.setup_animations()
        
        # 更新定时器
        self.update_timer = QTimer()
        self.update_timer.timeout.connect(self.update)
        self.update_timer.start(50)  # 20 FPS
    
    def create_splash_background(self) -> QPixmap:
        """创建启动画面背景"""
        width, height = 500, 350
        pixmap = QPixmap(width, height)
        pixmap.fill(Qt.GlobalColor.transparent)
        
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 背景渐变
        gradient = QLinearGradient(0, 0, 0, height)
        gradient.setColorAt(0, QColor(28, 28, 28))      # #1C1C1C
        gradient.setColorAt(0.5, QColor(47, 47, 47))    # #2F2F2F  
        gradient.setColorAt(1, QColor(26, 26, 26))      # #1A1A1A
        
        painter.setBrush(QBrush(gradient))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawRoundedRect(0, 0, width, height, 16, 16)
        
        # 橙色装饰线
        orange_gradient = QLinearGradient(0, 0, width, 0)
        orange_gradient.setColorAt(0, QColor(255, 122, 0, 0))    # 透明
        orange_gradient.setColorAt(0.3, QColor(255, 122, 0))    # FF7A00
        orange_gradient.setColorAt(0.7, QColor(255, 138, 26))   # FF8A1A
        orange_gradient.setColorAt(1, QColor(255, 122, 0, 0))   # 透明
        
        painter.setBrush(QBrush(orange_gradient))
        painter.drawRect(0, 0, width, 6)
        
        # Terra 标志
        self.draw_terra_logo(painter, width, height)
        
        # 版本信息
        self.draw_version_info(painter, width, height)
        
        painter.end()
        return pixmap
    
    def draw_terra_logo(self, painter: QPainter, width: int, height: int):
        """绘制 Terra 标志"""
        # 主标题
        font = QFont("Inter", 36, QFont.Weight.Bold)
        painter.setFont(font)
        painter.setPen(QColor(255, 255, 255))
        
        title_rect = painter.boundingRect(0, 0, width, height//2, Qt.AlignmentFlag.AlignCenter, "Terra")
        painter.drawText(title_rect, Qt.AlignmentFlag.AlignCenter, "Terra")
        
        # 副标题
        font = QFont("Inter", 14, QFont.Weight.Medium)
        painter.setFont(font)
        painter.setPen(QColor(255, 122, 0))  # 橙色
        
        subtitle_y = title_rect.bottom() + 10
        subtitle_rect = painter.boundingRect(0, subtitle_y, width, 30, Qt.AlignmentFlag.AlignCenter, "SuperMesh Studio")
        painter.drawText(subtitle_rect, Qt.AlignmentFlag.AlignCenter, "SuperMesh Studio")
        
        # 描述文字
        font = QFont("Inter", 11, QFont.Weight.Normal)
        painter.setFont(font)
        painter.setPen(QColor(180, 180, 180))
        
        desc_y = subtitle_rect.bottom() + 20
        desc_rect = painter.boundingRect(0, desc_y, width, 40, Qt.AlignmentFlag.AlignCenter, "专业 CAE 桌面平台 · 基于 GMSH + Kratos")
        painter.drawText(desc_rect, Qt.AlignmentFlag.AlignCenter, "专业 CAE 桌面平台 · 基于 GMSH + Kratos")
    
    def draw_version_info(self, painter: QPainter, width: int, height: int):
        """绘制版本信息"""
        font = QFont("Inter", 9, QFont.Weight.Normal)
        painter.setFont(font)
        painter.setPen(QColor(120, 120, 120))
        
        version_text = "Version 0.1.0 Beta · Powered by PyQt6"
        version_rect = painter.boundingRect(0, height - 40, width, 20, Qt.AlignmentFlag.AlignCenter, version_text)
        painter.drawText(version_rect, Qt.AlignmentFlag.AlignCenter, version_text)
    
    def setup_animations(self):
        """设置动画"""
        self._opacity = 0.0
        
        # 淡入动画
        self.fade_animation = QPropertyAnimation(self, b"windowOpacity")
        self.fade_animation.setDuration(800)
        self.fade_animation.setEasingCurve(QEasingCurve.Type.OutCubic)
        self.fade_animation.setStartValue(0.0)
        self.fade_animation.setEndValue(1.0)
    
    def show_with_animation(self):
        """显示启动画面（带动画）"""
        self.show()
        self.fade_animation.start()
    
    def set_progress(self, value: int, message: str = ""):
        """设置进度"""
        self.progress_value = max(0, min(100, value))
        if message:
            self.status_text = message
        self.update()
    
    def drawContents(self, painter: QPainter):
        """绘制内容"""
        super().drawContents(painter)
        
        # 绘制进度条
        self.draw_progress_bar(painter)
        
        # 绘制状态文字
        self.draw_status_text(painter)
    
    def draw_progress_bar(self, painter: QPainter):
        """绘制进度条"""
        if self.progress_value <= 0:
            return
            
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 进度条位置和尺寸
        bar_width = 320
        bar_height = 6
        bar_x = (self.width() - bar_width) // 2
        bar_y = self.height() - 80
        
        # 背景
        painter.setBrush(QBrush(QColor(60, 60, 60)))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawRoundedRect(bar_x, bar_y, bar_width, bar_height, 3, 3)
        
        # 进度
        progress_width = int(bar_width * self.progress_value / 100)
        if progress_width > 0:
            # 进度渐变
            gradient = QLinearGradient(bar_x, bar_y, bar_x + progress_width, bar_y)
            gradient.setColorAt(0, QColor(255, 138, 26))  # FF8A1A
            gradient.setColorAt(0.5, QColor(255, 122, 0)) # FF7A00
            gradient.setColorAt(1, QColor(230, 106, 0))   # E66A00
            
            painter.setBrush(QBrush(gradient))
            painter.drawRoundedRect(bar_x, bar_y, progress_width, bar_height, 3, 3)
            
            # 光晕效果
            if self.progress_value > 10:
                glow_gradient = QLinearGradient(bar_x, bar_y - 2, bar_x, bar_y + bar_height + 2)
                glow_gradient.setColorAt(0, QColor(255, 122, 0, 50))
                glow_gradient.setColorAt(0.5, QColor(255, 122, 0, 80))
                glow_gradient.setColorAt(1, QColor(255, 122, 0, 50))
                
                painter.setBrush(QBrush(glow_gradient))
                painter.drawRoundedRect(bar_x - 1, bar_y - 1, progress_width + 2, bar_height + 2, 4, 4)
    
    def draw_status_text(self, painter: QPainter):
        """绘制状态文字"""
        font = QFont("Inter", 11, QFont.Weight.Medium)
        painter.setFont(font)
        painter.setPen(QColor(200, 200, 200))
        
        text_y = self.height() - 50
        text_rect = painter.boundingRect(0, text_y, self.width(), 20, Qt.AlignmentFlag.AlignCenter, self.status_text)
        painter.drawText(text_rect, Qt.AlignmentFlag.AlignCenter, self.status_text)
        
        # 进度百分比
        if self.progress_value > 0:
            percent_text = f"{self.progress_value}%"
            font = QFont("Inter", 10, QFont.Weight.Normal)
            painter.setFont(font)
            painter.setPen(QColor(255, 122, 0))
            
            percent_y = text_y + 20
            percent_rect = painter.boundingRect(0, percent_y, self.width(), 20, Qt.AlignmentFlag.AlignCenter, percent_text)
            painter.drawText(percent_rect, Qt.AlignmentFlag.AlignCenter, percent_text)
    
    def finish_with_animation(self, main_window):
        """完成启动画面（带动画）"""
        # 淡出动画
        fade_out = QPropertyAnimation(self, b"windowOpacity")
        fade_out.setDuration(500)
        fade_out.setEasingCurve(QEasingCurve.Type.InCubic)
        fade_out.setStartValue(1.0)
        fade_out.setEndValue(0.0)
        fade_out.finished.connect(lambda: self.finish(main_window))
        fade_out.start()


class LoadingSpinner(QWidget):
    """加载旋转器"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(40, 40)
        self.angle = 0
        
        # 动画
        self.animation = QPropertyAnimation(self, b"rotation")
        self.animation.setDuration(1000)
        self.animation.setLoopCount(-1)  # 无限循环
        self.animation.setStartValue(0)
        self.animation.setEndValue(360)
        self.animation.start()
        
        # 更新定时器
        self.timer = QTimer()
        self.timer.timeout.connect(self.update)
        self.timer.start(50)
    
    @pyqtProperty(int)
    def rotation(self):
        return self.angle
    
    @rotation.setter
    def rotation(self, value):
        self.angle = value
        self.update()
    
    def paintEvent(self, event):
        """绘制旋转器"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 移动到中心
        painter.translate(self.width() / 2, self.height() / 2)
        painter.rotate(self.angle)
        
        # 绘制圆弧
        pen = QPen()
        pen.setWidth(3)
        pen.setCapStyle(Qt.PenCapStyle.RoundCap)
        
        radius = 15
        for i in range(8):
            angle = i * 45
            opacity = max(0.2, 1.0 - i * 0.1)
            
            color = QColor(255, 122, 0)
            color.setAlphaF(opacity)
            pen.setColor(color)
            painter.setPen(pen)
            
            x1 = radius * math.cos(math.radians(angle))
            y1 = radius * math.sin(math.radians(angle))
            x2 = (radius - 6) * math.cos(math.radians(angle))
            y2 = (radius - 6) * math.sin(math.radians(angle))
            
            painter.drawLine(int(x1), int(y1), int(x2), int(y2))