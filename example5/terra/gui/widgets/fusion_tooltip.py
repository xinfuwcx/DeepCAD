"""
Terra Fusion 360 风格工具提示
"""

from PyQt6.QtWidgets import QLabel, QGraphicsDropShadowEffect
from PyQt6.QtCore import Qt, QTimer, QPropertyAnimation, QEasingCurve, pyqtProperty
from PyQt6.QtGui import QFont, QPalette, QColor

class FusionToolTip(QLabel):
    """Fusion 360 风格工具提示"""
    
    def __init__(self, text: str, parent=None):
        super().__init__(text, parent)
        self.init_ui()
        self.setup_animation()
    
    def init_ui(self):
        """初始化界面"""
        # 设置基本属性
        self.setWindowFlags(Qt.WindowType.ToolTip | Qt.WindowType.FramelessWindowHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        # 设置字体
        font = QFont("Inter", 11)
        font.setWeight(QFont.Weight.Medium)
        self.setFont(font)
        
        # 设置样式
        self.setStyleSheet("""
            QLabel {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(74, 74, 74, 0.95), 
                    stop:1 rgba(64, 64, 64, 0.95));
                color: #FFFFFF;
                border: 1px solid rgba(255, 122, 0, 0.6);
                border-radius: 8px;
                padding: 8px 12px;
                font-weight: 500;
            }
        """)
        
        # 添加阴影效果
        shadow = QGraphicsDropShadowEffect()
        shadow.setBlurRadius(20)
        shadow.setXOffset(0)
        shadow.setYOffset(4)
        shadow.setColor(QColor(0, 0, 0, 80))
        self.setGraphicsEffect(shadow)
        
        # 设置大小
        self.adjustSize()
        
        # 透明度属性
        self._opacity = 0.0
    
    def setup_animation(self):
        """设置动画"""
        self.fade_animation = QPropertyAnimation(self, b"opacity")
        self.fade_animation.setDuration(200)
        self.fade_animation.setEasingCurve(QEasingCurve.Type.OutCubic)
        
        # 自动隐藏定时器
        self.hide_timer = QTimer()
        self.hide_timer.setSingleShot(True)
        self.hide_timer.timeout.connect(self.fade_out)
    
    @pyqtProperty(float)
    def opacity(self):
        return self._opacity
    
    @opacity.setter
    def opacity(self, value):
        self._opacity = value
        self.setWindowOpacity(value)
    
    def show_animated(self, duration: int = 3000):
        """显示工具提示（带动画）"""
        self.show()
        
        # 淡入动画
        self.fade_animation.setStartValue(0.0)
        self.fade_animation.setEndValue(1.0)
        self.fade_animation.start()
        
        # 设置自动隐藏
        if duration > 0:
            self.hide_timer.start(duration)
    
    def fade_out(self):
        """淡出动画"""
        self.fade_animation.setStartValue(1.0)
        self.fade_animation.setEndValue(0.0)
        self.fade_animation.finished.connect(self.hide)
        self.fade_animation.start()


class FusionNotification(QLabel):
    """Fusion 360 风格通知"""
    
    def __init__(self, text: str, notification_type: str = "info", parent=None):
        super().__init__(text, parent)
        self.notification_type = notification_type
        self.init_ui()
        self.setup_animation()
    
    def init_ui(self):
        """初始化界面"""
        # 设置基本属性
        self.setWindowFlags(Qt.WindowType.Tool | Qt.WindowType.FramelessWindowHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)
        
        # 设置字体
        font = QFont("Inter", 12)
        font.setWeight(QFont.Weight.Medium)
        self.setFont(font)
        
        # 根据类型设置样式
        self.set_notification_style()
        
        # 添加阴影
        shadow = QGraphicsDropShadowEffect()
        shadow.setBlurRadius(25)
        shadow.setXOffset(0)
        shadow.setYOffset(6)
        shadow.setColor(QColor(0, 0, 0, 100))
        self.setGraphicsEffect(shadow)
        
        # 设置大小
        self.setMinimumSize(300, 60)
        self.setMaximumSize(500, 120)
        self.adjustSize()
        
        # 透明度属性
        self._opacity = 0.0
    
    def set_notification_style(self):
        """设置通知样式"""
        styles = {
            "success": {
                "bg": "qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 rgba(80, 200, 120, 0.9), stop:1 rgba(70, 180, 100, 0.9))",
                "border": "rgba(100, 220, 140, 0.8)",
                "icon": "✅"
            },
            "warning": {
                "bg": "qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 rgba(255, 176, 32, 0.9), stop:1 rgba(235, 156, 12, 0.9))",
                "border": "rgba(255, 196, 52, 0.8)",
                "icon": "⚠️"
            },
            "error": {
                "bg": "qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 rgba(255, 71, 87, 0.9), stop:1 rgba(235, 51, 67, 0.9))",
                "border": "rgba(255, 91, 107, 0.8)",
                "icon": "❌"
            },
            "info": {
                "bg": "qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 rgba(74, 144, 226, 0.9), stop:1 rgba(54, 124, 206, 0.9))",
                "border": "rgba(94, 164, 246, 0.8)",
                "icon": "ℹ️"
            }
        }
        
        style_config = styles.get(self.notification_type, styles["info"])
        
        # 添加图标
        icon = style_config["icon"]
        current_text = self.text()
        self.setText(f"{icon}  {current_text}")
        
        # 设置样式
        self.setStyleSheet(f"""
            QLabel {{
                background: {style_config["bg"]};
                color: #FFFFFF;
                border: 2px solid {style_config["border"]};
                border-radius: 12px;
                padding: 12px 16px;
                font-weight: 500;
            }}
        """)
    
    def setup_animation(self):
        """设置动画"""
        self.fade_animation = QPropertyAnimation(self, b"opacity")
        self.fade_animation.setDuration(300)
        self.fade_animation.setEasingCurve(QEasingCurve.Type.OutCubic)
        
        # 自动隐藏定时器
        self.hide_timer = QTimer()
        self.hide_timer.setSingleShot(True)
        self.hide_timer.timeout.connect(self.fade_out)
    
    @pyqtProperty(float)
    def opacity(self):
        return self._opacity
    
    @opacity.setter
    def opacity(self, value):
        self._opacity = value
        self.setWindowOpacity(value)
    
    def show_notification(self, duration: int = 4000):
        """显示通知"""
        self.show()
        
        # 淡入动画
        self.fade_animation.setStartValue(0.0)
        self.fade_animation.setEndValue(0.95)
        self.fade_animation.start()
        
        # 设置自动隐藏
        if duration > 0:
            self.hide_timer.start(duration)
    
    def fade_out(self):
        """淡出动画"""
        self.fade_animation.setStartValue(0.95)
        self.fade_animation.setEndValue(0.0)
        self.fade_animation.finished.connect(self.hide)
        self.fade_animation.start()


class NotificationManager:
    """通知管理器"""
    
    def __init__(self, parent_widget):
        self.parent = parent_widget
        self.notifications = []
    
    def show_notification(self, text: str, notification_type: str = "info", duration: int = 4000):
        """显示通知"""
        notification = FusionNotification(text, notification_type, self.parent)
        
        # 计算位置
        parent_rect = self.parent.rect()
        x = parent_rect.right() - notification.width() - 20
        y = 20 + len(self.notifications) * (notification.height() + 10)
        
        notification.move(x, y)
        notification.show_notification(duration)
        
        # 添加到列表
        self.notifications.append(notification)
        
        # 设置自动清理
        QTimer.singleShot(duration + 500, lambda: self.remove_notification(notification))
    
    def remove_notification(self, notification):
        """移除通知"""
        if notification in self.notifications:
            self.notifications.remove(notification)
            notification.deleteLater()
            
            # 重新排列剩余通知
            self.rearrange_notifications()
    
    def rearrange_notifications(self):
        """重新排列通知位置"""
        for i, notification in enumerate(self.notifications):
            parent_rect = self.parent.rect()
            x = parent_rect.right() - notification.width() - 20
            y = 20 + i * (notification.height() + 10)
            notification.move(x, y)