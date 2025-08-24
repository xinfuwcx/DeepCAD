"""
Enhanced ABAQUS Effects System - 增强ABAQUS特效系统
Advanced dynamic effects and professional feedback systems
"""

from PyQt6.QtCore import QPropertyAnimation, QEasingCurve, QRect, QTimer, QParallelAnimationGroup, QSequentialAnimationGroup, pyqtSignal
from PyQt6.QtGui import QColor, QPainter, QPen, QBrush, QLinearGradient, QRadialGradient, QFont
from PyQt6.QtWidgets import QGraphicsDropShadowEffect, QGraphicsOpacityEffect, QWidget, QLabel, QPushButton, QFrame


class ProfessionalLoadingIndicator(QWidget):
    """专业加载指示器"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(200, 50)
        self.progress = 0
        self.setup_loading_ui()
        
    def setup_loading_ui(self):
        """设置加载界面"""
        self.setStyleSheet("""
            QWidget {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 rgba(30, 58, 138, 0.9),
                    stop:0.5 rgba(59, 130, 246, 0.9),
                    stop:1 rgba(30, 58, 138, 0.9));
                border: 2px solid #3b82f6;
                border-radius: 25px;
            }
        """)
        
        # 创建发光效果
        glow_effect = QGraphicsDropShadowEffect()
        glow_effect.setBlurRadius(20)
        glow_effect.setColor(QColor(59, 130, 246, 150))
        glow_effect.setOffset(0, 0)
        self.setGraphicsEffect(glow_effect)
    
    def paintEvent(self, event):
        """绘制加载进度"""
        super().paintEvent(event)
        
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 绘制进度条
        progress_width = int((self.width() - 10) * self.progress / 100)
        progress_rect = QRect(5, 5, progress_width, self.height() - 10)
        
        # 进度条渐变
        gradient = QLinearGradient(0, 0, progress_width, 0)
        gradient.setColorAt(0, QColor(249, 115, 22))
        gradient.setColorAt(0.5, QColor(251, 191, 36))
        gradient.setColorAt(1, QColor(249, 115, 22))
        
        painter.setBrush(QBrush(gradient))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawRoundedRect(progress_rect, 20, 20)
        
        # 绘制文字
        painter.setPen(QColor(255, 255, 255))
        painter.setFont(QFont("Arial", 10, QFont.Weight.Bold))
        painter.drawText(self.rect(), Qt.AlignmentFlag.AlignCenter, f"Loading... {self.progress}%")
    
    def set_progress(self, value):
        """设置进度"""
        self.progress = value
        self.update()


class DynamicStatusIndicator(QWidget):
    """动态状态指示器"""
    
    status_changed = pyqtSignal(str, str)  # status_type, message
    
    def __init__(self, status_type="ready", parent=None):
        super().__init__(parent)
        self.setFixedSize(120, 30)
        self.status_type = status_type
        self.pulse_timer = QTimer()
        self.pulse_timer.timeout.connect(self.update_pulse)
        self.pulse_value = 0
        self.setup_indicator()
        
    def setup_indicator(self):
        """设置指示器"""
        self.pulse_timer.start(50)  # 20fps pulse animation
        
    def paintEvent(self, event):
        """绘制状态指示器"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 状态颜色映射
        colors = {
            'ready': (16, 185, 129),      # 绿色 - 就绪
            'processing': (59, 130, 246), # 蓝色 - 处理中
            'warning': (249, 115, 22),    # 橙色 - 警告
            'error': (239, 68, 68),       # 红色 - 错误
            'success': (34, 197, 94)      # 明绿 - 成功
        }
        
        base_color = colors.get(self.status_type, (107, 114, 128))
        
        # 创建脉冲效果
        pulse_alpha = int(100 + 100 * abs(self.pulse_value - 50) / 50)
        
        # 外层光环
        outer_gradient = QRadialGradient(60, 15, 50)
        outer_gradient.setColorAt(0, QColor(*base_color, pulse_alpha))
        outer_gradient.setColorAt(1, QColor(*base_color, 0))
        
        painter.setBrush(QBrush(outer_gradient))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawEllipse(10, 5, 100, 20)
        
        # 内层指示灯
        inner_gradient = QRadialGradient(60, 15, 15)
        inner_gradient.setColorAt(0, QColor(*base_color, 255))
        inner_gradient.setColorAt(1, QColor(*base_color, 150))
        
        painter.setBrush(QBrush(inner_gradient))
        painter.drawEllipse(45, 10, 30, 10)
        
        # 状态文字
        status_text = {
            'ready': 'READY',
            'processing': 'PROC',
            'warning': 'WARN',
            'error': 'ERROR',
            'success': 'OK'
        }
        
        painter.setPen(QColor(255, 255, 255))
        painter.setFont(QFont("Arial", 8, QFont.Weight.Bold))
        painter.drawText(self.rect(), Qt.AlignmentFlag.AlignCenter, 
                        status_text.get(self.status_type, 'N/A'))
    
    def update_pulse(self):
        """更新脉冲动画"""
        self.pulse_value = (self.pulse_value + 2) % 100
        self.update()
    
    def set_status(self, status_type):
        """设置状态类型"""
        self.status_type = status_type
        self.status_changed.emit(status_type, status_type.upper())
        self.update()


class ProfessionalProgressBar(QWidget):
    """专业进度条"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedHeight(25)
        self.progress = 0
        self.text = "Processing..."
        self.setup_progress_bar()
        
    def setup_progress_bar(self):
        """设置进度条"""
        self.setStyleSheet("""
            QWidget {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #1e293b,
                    stop:1 #0f172a);
                border: 2px solid #374151;
                border-radius: 12px;
            }
        """)
        
        # 添加发光效果
        glow_effect = QGraphicsDropShadowEffect()
        glow_effect.setBlurRadius(15)
        glow_effect.setColor(QColor(59, 130, 246, 100))
        glow_effect.setOffset(0, 0)
        self.setGraphicsEffect(glow_effect)
    
    def paintEvent(self, event):
        """绘制进度条"""
        super().paintEvent(event)
        
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 计算进度条宽度
        progress_width = int((self.width() - 8) * self.progress / 100)
        
        if progress_width > 0:
            # 进度条渐变
            progress_gradient = QLinearGradient(0, 0, progress_width, 0)
            progress_gradient.setColorAt(0, QColor(59, 130, 246))
            progress_gradient.setColorAt(0.5, QColor(147, 197, 253))
            progress_gradient.setColorAt(1, QColor(59, 130, 246))
            
            painter.setBrush(QBrush(progress_gradient))
            painter.setPen(Qt.PenStyle.NoPen)
            painter.drawRoundedRect(4, 4, progress_width, self.height() - 8, 8, 8)
            
            # 高光效果
            highlight_gradient = QLinearGradient(0, 4, 0, self.height() // 2)
            highlight_gradient.setColorAt(0, QColor(255, 255, 255, 60))
            highlight_gradient.setColorAt(1, QColor(255, 255, 255, 0))
            
            painter.setBrush(QBrush(highlight_gradient))
            painter.drawRoundedRect(4, 4, progress_width, 
                                  (self.height() - 8) // 2, 8, 8)
        
        # 绘制文字
        painter.setPen(QColor(255, 255, 255))
        painter.setFont(QFont("Arial", 9, QFont.Weight.Bold))
        painter.drawText(self.rect(), Qt.AlignmentFlag.AlignCenter, 
                        f"{self.text} {self.progress}%")
    
    def set_progress(self, value, text=None):
        """设置进度"""
        self.progress = max(0, min(100, value))
        if text:
            self.text = text
        self.update()


class AnimatedButton(QPushButton):
    """动画按钮"""
    
    def __init__(self, text="Button", parent=None):
        super().__init__(text, parent)
        self.setup_animations()
        self.setup_styling()
        
    def setup_styling(self):
        """设置样式"""
        self.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(51, 65, 85, 0.9),
                    stop:0.5 rgba(30, 41, 59, 0.9),
                    stop:1 rgba(15, 23, 42, 0.9));
                border: 2px solid #6b7280;
                border-radius: 8px;
                color: #f8fafc;
                font-weight: 700;
                font-size: 10pt;
                padding: 10px 20px;
                min-width: 100px;
                min-height: 36px;
            }
            
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(59, 130, 246, 0.4),
                    stop:0.5 rgba(30, 64, 175, 0.5),
                    stop:1 rgba(30, 58, 138, 0.6));
                border: 2px solid #f97316;
                box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
            }
            
            QPushButton:pressed {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #1e40af,
                    stop:1 #1e3a8a);
                border: 3px solid #10b981;
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
            }
        """)
    
    def setup_animations(self):
        """设置动画"""
        self.hover_animation = QPropertyAnimation(self, b"geometry")
        self.hover_animation.setDuration(150)
        self.hover_animation.setEasingCurve(QEasingCurve.Type.OutQuart)
        
        self.click_animation = QPropertyAnimation(self, b"geometry") 
        self.click_animation.setDuration(100)
        self.click_animation.setEasingCurve(QEasingCurve.Type.InOutQuart)
    
    def enterEvent(self, event):
        """鼠标进入事件"""
        super().enterEvent(event)
        self.animate_hover(True)
    
    def leaveEvent(self, event):
        """鼠标离开事件"""
        super().leaveEvent(event)
        self.animate_hover(False)
    
    def mousePressEvent(self, event):
        """鼠标按下事件"""
        super().mousePressEvent(event)
        self.animate_click()
    
    def animate_hover(self, entering):
        """悬停动画"""
        current_geo = self.geometry()
        
        if entering:
            # 放大效果
            new_geo = QRect(
                current_geo.x() - 2,
                current_geo.y() - 2, 
                current_geo.width() + 4,
                current_geo.height() + 4
            )
        else:
            # 恢复原始大小
            new_geo = QRect(
                current_geo.x() + 2,
                current_geo.y() + 2,
                current_geo.width() - 4, 
                current_geo.height() - 4
            )
        
        self.hover_animation.setStartValue(current_geo)
        self.hover_animation.setEndValue(new_geo)
        self.hover_animation.start()
    
    def animate_click(self):
        """点击动画"""
        current_geo = self.geometry()
        pressed_geo = QRect(
            current_geo.x() + 1,
            current_geo.y() + 1,
            current_geo.width() - 2,
            current_geo.height() - 2
        )
        
        self.click_animation.setStartValue(current_geo)
        self.click_animation.setEndValue(pressed_geo)
        self.click_animation.start()
        
        # 100ms后恢复
        QTimer.singleShot(100, lambda: self.restore_size(current_geo))
    
    def restore_size(self, original_geo):
        """恢复原始大小"""
        self.setGeometry(original_geo)


class ProfessionalTooltip(QLabel):
    """专业工具提示"""
    
    def __init__(self, text="Tooltip", parent=None):
        super().__init__(text, parent)
        self.setup_tooltip()
        
    def setup_tooltip(self):
        """设置工具提示样式"""
        self.setStyleSheet("""
            QLabel {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(0, 0, 0, 0.9),
                    stop:1 rgba(30, 41, 59, 0.9));
                border: 2px solid #f97316;
                border-radius: 8px;
                color: #f8fafc;
                font-weight: 600;
                font-size: 10pt;
                padding: 8px 12px;
            }
        """)
        
        # 添加阴影效果
        shadow_effect = QGraphicsDropShadowEffect()
        shadow_effect.setBlurRadius(20)
        shadow_effect.setColor(QColor(0, 0, 0, 180))
        shadow_effect.setOffset(2, 2)
        self.setGraphicsEffect(shadow_effect)
        
        # 设置窗口标志
        self.setWindowFlags(Qt.WindowType.ToolTip | Qt.WindowType.FramelessWindowHint)


class EnhancedEffectsManager:
    """增强特效管理器"""
    
    @staticmethod
    def create_fade_transition(widget_from, widget_to, duration=400):
        """创建淡入淡出转换"""
        fade_out = QGraphicsOpacityEffect()
        fade_in = QGraphicsOpacityEffect()
        
        widget_from.setGraphicsEffect(fade_out)
        widget_to.setGraphicsEffect(fade_in)
        
        # 淡出动画
        fade_out_anim = QPropertyAnimation(fade_out, b"opacity")
        fade_out_anim.setDuration(duration // 2)
        fade_out_anim.setStartValue(1.0)
        fade_out_anim.setEndValue(0.0)
        
        # 淡入动画
        fade_in_anim = QPropertyAnimation(fade_in, b"opacity")
        fade_in_anim.setDuration(duration // 2)
        fade_in_anim.setStartValue(0.0)
        fade_in_anim.setEndValue(1.0)
        
        # 顺序动画组
        sequence = QSequentialAnimationGroup()
        sequence.addAnimation(fade_out_anim)
        sequence.addAnimation(fade_in_anim)
        
        return sequence
    
    @staticmethod
    def create_slide_stack_transition(widgets_stack, direction="left", duration=300):
        """创建堆栈滑动转换"""
        animations = QParallelAnimationGroup()
        
        for i, widget in enumerate(widgets_stack):
            animation = QPropertyAnimation(widget, b"geometry")
            animation.setDuration(duration)
            animation.setEasingCurve(QEasingCurve.Type.OutCubic)
            
            current_geo = widget.geometry()
            
            if direction == "left":
                start_x = current_geo.x() + (i * current_geo.width())
                end_x = current_geo.x() - current_geo.width()
            else:  # right
                start_x = current_geo.x() - (i * current_geo.width()) 
                end_x = current_geo.x() + current_geo.width()
            
            start_geo = QRect(start_x, current_geo.y(), 
                            current_geo.width(), current_geo.height())
            end_geo = QRect(end_x, current_geo.y(),
                          current_geo.width(), current_geo.height())
            
            animation.setStartValue(start_geo)
            animation.setEndValue(end_geo)
            animations.addAnimation(animation)
        
        return animations
    
    @staticmethod
    def create_pulse_effect(widget, color=QColor(59, 130, 246), duration=1000):
        """创建脉冲发光效果"""
        glow_effect = QGraphicsDropShadowEffect()
        glow_effect.setBlurRadius(20)
        glow_effect.setColor(color)
        glow_effect.setOffset(0, 0)
        widget.setGraphicsEffect(glow_effect)
        
        # 脉冲动画
        pulse_animation = QPropertyAnimation(glow_effect, b"color")
        pulse_animation.setDuration(duration)
        pulse_animation.setStartValue(QColor(color.red(), color.green(), color.blue(), 50))
        pulse_animation.setEndValue(QColor(color.red(), color.green(), color.blue(), 200))
        pulse_animation.setLoopCount(-1)  # 无限循环
        
        return pulse_animation


def create_professional_notification(message, notification_type="info", parent=None):
    """创建专业通知"""
    notification = QFrame(parent)
    notification.setFixedSize(300, 80)
    
    # 通知类型颜色
    type_colors = {
        'info': '#3b82f6',
        'success': '#10b981', 
        'warning': '#f59e0b',
        'error': '#ef4444'
    }
    
    color = type_colors.get(notification_type, '#3b82f6')
    
    notification.setStyleSheet(f"""
        QFrame {{
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 rgba(51, 65, 85, 0.95),
                stop:1 rgba(15, 23, 42, 0.95));
            border-left: 4px solid {color};
            border-radius: 8px;
            margin: 5px;
        }}
    """)
    
    # 添加阴影和发光
    shadow_effect = QGraphicsDropShadowEffect()
    shadow_effect.setBlurRadius(25)
    shadow_effect.setColor(QColor(0, 0, 0, 150))
    shadow_effect.setOffset(2, 2)
    notification.setGraphicsEffect(shadow_effect)
    
    # 添加消息文本
    from PyQt6.QtWidgets import QVBoxLayout
    layout = QVBoxLayout(notification)
    
    message_label = QLabel(message)
    message_label.setStyleSheet(f"""
        QLabel {{
            color: #f8fafc;
            font-weight: 600;
            font-size: 11pt;
            padding: 10px;
            background: transparent;
        }}
    """)
    message_label.setWordWrap(True)
    layout.addWidget(message_label)
    
    return notification