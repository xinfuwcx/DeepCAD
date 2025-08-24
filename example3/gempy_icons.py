"""
GemPy Professional Icons - 专业图标系统
Modern SVG-based icon system for geological modeling interface
"""

from PyQt6.QtGui import QIcon, QPixmap, QPainter, QColor, QPen, QBrush, QFont
from PyQt6.QtCore import QSize, Qt
from PyQt6.QtSvg import QSvgRenderer
import io

class GemPyIconFactory:
    """GemPy专业图标工厂"""
    
    # 图标颜色方案
    ICON_COLORS = {
        'primary': '#2c3e50',      # 主色
        'secondary': '#3498db',    # 次要色  
        'accent': '#e74c3c',       # 强调色
        'success': '#27ae60',      # 成功色
        'warning': '#f39c12',      # 警告色
        'info': '#8e44ad',         # 信息色
        'light': '#ecf0f1',        # 浅色
        'dark': '#2c3e50'          # 深色
    }
    
    @staticmethod
    def create_svg_icon(svg_content, size=24, color=None):
        """创建SVG图标"""
        if color:
            svg_content = svg_content.replace('currentColor', color)
        
        # 创建SVG渲染器
        renderer = QSvgRenderer()
        svg_bytes = svg_content.encode('utf-8')
        renderer.load(svg_bytes)
        
        # 创建像素图
        pixmap = QPixmap(size, size)
        pixmap.fill(Qt.GlobalColor.transparent)
        
        painter = QPainter(pixmap)
        renderer.render(painter)
        painter.end()
        
        return QIcon(pixmap)
    
    @staticmethod
    def get_file_icons():
        """文件操作图标"""
        icons = {}
        
        # 新建图标
        icons['new'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
            <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2"/>
            <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['success'])
        
        # 打开图标
        icons['open'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" 
                  stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['info'])
        
        # 保存图标
        icons['save'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z" 
                  stroke="currentColor" stroke-width="2" fill="none"/>
            <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" stroke-width="2"/>
            <polyline points="7,3 7,8 15,8" stroke="currentColor" stroke-width="2"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['primary'])
        
        # 导入图标
        icons['import'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" 
                  stroke="currentColor" stroke-width="2"/>
            <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2"/>
            <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['secondary'])
        
        # 导出图标
        icons['export'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" 
                  stroke="currentColor" stroke-width="2"/>
            <polyline points="17,8 12,3 7,8" stroke="currentColor" stroke-width="2"/>
            <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['warning'])
        
        return icons
    
    @staticmethod
    def get_gempy_icons():
        """GemPy专用图标"""
        icons = {}
        
        # 地层图标
        icons['layers'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M2 6L12 2L22 6L12 10L2 6Z" stroke="currentColor" stroke-width="2" fill="rgba(52, 152, 219, 0.2)"/>
            <path d="M2 12L12 8L22 12L12 16L2 12Z" stroke="currentColor" stroke-width="2" fill="rgba(46, 204, 113, 0.2)"/>
            <path d="M2 18L12 14L22 18L12 22L2 18Z" stroke="currentColor" stroke-width="2" fill="rgba(155, 89, 182, 0.2)"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['accent'])
        
        # 3D模型图标
        icons['model_3d'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" fill="rgba(52, 152, 219, 0.3)"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="7" r="1" fill="currentColor"/>
            <circle cx="7" cy="9" r="1" fill="currentColor"/>
            <circle cx="17" cy="9" r="1" fill="currentColor"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['info'])
        
        # 地质建模图标
        icons['geological_model'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 20C3 20 6 16 12 16S21 20 21 20" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M3 16C3 16 6 12 12 12S21 16 21 16" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M3 12C3 12 6 8 12 8S21 12 21 12" stroke="currentColor" stroke-width="2" fill="none"/>
            <circle cx="6" cy="10" r="1" fill="currentColor"/>
            <circle cx="12" cy="6" r="1" fill="currentColor"/>
            <circle cx="18" cy="10" r="1" fill="currentColor"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['success'])
        
        # 重力场图标
        icons['gravity'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="3" stroke="currentColor" stroke-width="2" fill="rgba(231, 76, 60, 0.2)"/>
            <path d="M12 11V21" stroke="currentColor" stroke-width="3"/>
            <path d="M8 17L12 21L16 17" stroke="currentColor" stroke-width="2"/>
            <path d="M6 14C6 14 8 13 12 13S18 14 18 14" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2"/>
            <path d="M4 17C4 17 7 16 12 16S20 17 20 17" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['accent'])
        
        # 磁场图标
        icons['magnetic'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M6 6C6 6 10 2 12 2S18 6 18 6V12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12V6Z" 
                  stroke="currentColor" stroke-width="2" fill="rgba(142, 68, 173, 0.2)"/>
            <path d="M6 6H18" stroke="currentColor" stroke-width="2"/>
            <circle cx="9" cy="10" r="1" fill="currentColor"/>
            <circle cx="15" cy="10" r="1" fill="currentColor"/>
            <path d="M12 18V22" stroke="currentColor" stroke-width="2"/>
            <path d="M10 22H14" stroke="currentColor" stroke-width="2"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['info'])
        
        return icons
    
    @staticmethod 
    def get_data_icons():
        """数据管理图标"""
        icons = {}
        
        # 界面点图标
        icons['interface_points'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <circle cx="6" cy="6" r="2" fill="currentColor"/>
            <circle cx="18" cy="6" r="2" fill="currentColor"/>
            <circle cx="6" cy="18" r="2" fill="currentColor"/>
            <circle cx="18" cy="18" r="2" fill="currentColor"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
            <path d="M6 6L12 12M12 12L18 6M12 12L6 18M12 12L18 18" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['accent'])
        
        # 产状数据图标
        icons['orientations'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M12 4L12 20" stroke="currentColor" stroke-width="1"/>
            <path d="M4 12L20 12" stroke="currentColor" stroke-width="1"/>
            <path d="M12 12L18 8" stroke="currentColor" stroke-width="2"/>
            <circle cx="18" cy="8" r="1" fill="currentColor"/>
            <text x="19" y="7" font-size="4" fill="currentColor">N</text>
            <path d="M8 16L16 8" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['secondary'])
        
        # 数据统计图标
        icons['statistics'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <rect x="3" y="16" width="4" height="5" stroke="currentColor" stroke-width="2" fill="rgba(52, 152, 219, 0.3)"/>
            <rect x="10" y="12" width="4" height="9" stroke="currentColor" stroke-width="2" fill="rgba(46, 204, 113, 0.3)"/>
            <rect x="17" y="8" width="4" height="13" stroke="currentColor" stroke-width="2" fill="rgba(155, 89, 182, 0.3)"/>
            <path d="M5 16L12 9L16 13L21 8" stroke="currentColor" stroke-width="2"/>
            <circle cx="5" cy="16" r="1" fill="currentColor"/>
            <circle cx="12" cy="9" r="1" fill="currentColor"/>
            <circle cx="16" cy="13" r="1" fill="currentColor"/>
            <circle cx="21" cy="8" r="1" fill="currentColor"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['warning'])
        
        # 数据验证图标
        icons['validation'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="rgba(46, 204, 113, 0.1)"/>
            <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2"/>
            <circle cx="7" cy="7" r="1" fill="currentColor"/>
            <circle cx="17" cy="7" r="1" fill="currentColor"/>
            <circle cx="7" cy="17" r="1" fill="currentColor"/>
            <circle cx="17" cy="17" r="1" fill="currentColor"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['success'])
        
        return icons
    
    @staticmethod
    def get_analysis_icons():
        """分析功能图标"""
        icons = {}
        
        # 剖面分析图标
        icons['section_analysis'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4" width="20" height="16" stroke="currentColor" stroke-width="2" fill="rgba(52, 152, 219, 0.1)"/>
            <path d="M2 12L8 8L14 14L22 10" stroke="currentColor" stroke-width="2"/>
            <path d="M2 16L6 14L12 18L18 15L22 17" stroke="currentColor" stroke-width="2" fill="none"/>
            <circle cx="8" cy="8" r="1" fill="currentColor"/>
            <circle cx="14" cy="14" r="1" fill="currentColor"/>
            <path d="M12 2V4M12 20V22" stroke="currentColor" stroke-width="2"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['secondary'])
        
        # 体积计算图标
        icons['volume_calculation'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" stroke-width="2" fill="rgba(155, 89, 182, 0.2)"/>
            <path d="M2 7L12 12L22 7" stroke="currentColor" stroke-width="2"/>
            <path d="M12 12V22" stroke="currentColor" stroke-width="2"/>
            <text x="12" y="13" text-anchor="middle" font-size="4" fill="currentColor">V</text>
            <circle cx="6" cy="9" r="0.5" fill="currentColor"/>
            <circle cx="18" cy="9" r="0.5" fill="currentColor"/>
            <circle cx="12" cy="5" r="0.5" fill="currentColor"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['info'])
        
        # 不确定性分析图标
        icons['uncertainty_analysis'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" stroke-dasharray="4,2" fill="rgba(231, 76, 60, 0.1)"/>
            <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1" stroke-dasharray="2,1" fill="rgba(231, 76, 60, 0.2)"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
            <path d="M8 8L16 16" stroke="currentColor" stroke-width="1" opacity="0.5"/>
            <path d="M16 8L8 16" stroke="currentColor" stroke-width="1" opacity="0.5"/>
            <circle cx="8" cy="8" r="1" fill="currentColor" opacity="0.7"/>
            <circle cx="16" cy="8" r="1" fill="currentColor" opacity="0.7"/>
            <circle cx="8" cy="16" r="1" fill="currentColor" opacity="0.7"/>
            <circle cx="16" cy="16" r="1" fill="currentColor" opacity="0.7"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['accent'])
        
        # 敏感性分析图标
        icons['sensitivity_analysis'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 12H21" stroke="currentColor" stroke-width="2"/>
            <path d="M3 8L6 5L10 9L14 6L18 10L21 8" stroke="currentColor" stroke-width="2"/>
            <path d="M3 16L6 19L10 15L14 18L18 14L21 16" stroke="currentColor" stroke-width="2"/>
            <circle cx="6" cy="5" r="1" fill="currentColor"/>
            <circle cx="10" cy="9" r="1" fill="currentColor"/>
            <circle cx="14" cy="6" r="1" fill="currentColor"/>
            <circle cx="18" cy="10" r="1" fill="currentColor"/>
            <path d="M12 3V21" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2" opacity="0.3"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['warning'])
        
        return icons
    
    @staticmethod
    def get_visualization_icons():
        """可视化功能图标"""
        icons = {}
        
        # 3D视图设置图标
        icons['view_3d'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 2L22 8.5V15.5L12 22L2 15.5V8.5L12 2Z" stroke="currentColor" stroke-width="2" fill="rgba(52, 152, 219, 0.2)"/>
            <path d="M2 8.5L12 15L22 8.5" stroke="currentColor" stroke-width="2"/>
            <path d="M12 15V22" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="8" r="1" fill="currentColor"/>
            <circle cx="7" cy="10" r="1" fill="currentColor"/>
            <circle cx="17" cy="10" r="1" fill="currentColor"/>
            <path d="M12 15L16 12" stroke="currentColor" stroke-width="1" stroke-dasharray="1,1"/>
            <path d="M12 15L8 12" stroke="currentColor" stroke-width="1" stroke-dasharray="1,1"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['secondary'])
        
        # 剖面视图图标
        icons['section_view'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4" width="20" height="16" stroke="currentColor" stroke-width="2" fill="rgba(46, 204, 113, 0.1)"/>
            <path d="M6 4V20" stroke="currentColor" stroke-width="2"/>
            <path d="M6 8L18 8" stroke="currentColor" stroke-width="2"/>
            <path d="M6 12L18 12" stroke="currentColor" stroke-width="2"/>
            <path d="M6 16L18 16" stroke="currentColor" stroke-width="2"/>
            <circle cx="10" cy="8" r="1" fill="currentColor"/>
            <circle cx="14" cy="12" r="1" fill="currentColor"/>
            <circle cx="16" cy="16" r="1" fill="currentColor"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['success'])
        
        # 等值面图标
        icons['iso_surface'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 8C3 8 6 4 12 4S21 8 21 8S18 12 12 12S3 8 3 8Z" stroke="currentColor" stroke-width="2" fill="rgba(155, 89, 182, 0.2)"/>
            <path d="M3 16C3 16 6 12 12 12S21 16 21 16S18 20 12 20S3 16 3 16Z" stroke="currentColor" stroke-width="2" fill="rgba(52, 152, 219, 0.2)"/>
            <circle cx="12" cy="8" r="1" fill="currentColor"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
            <path d="M12 8V16" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['info'])
        
        # 动画制作图标
        icons['animation'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="rgba(231, 76, 60, 0.1)"/>
            <path d="M10 8L16 12L10 16V8Z" fill="currentColor"/>
            <circle cx="5" cy="5" r="1" fill="currentColor" opacity="0.5"/>
            <circle cx="19" cy="5" r="1" fill="currentColor" opacity="0.7"/>
            <circle cx="5" cy="19" r="1" fill="currentColor" opacity="0.7"/>
            <circle cx="19" cy="19" r="1" fill="currentColor" opacity="0.5"/>
            <path d="M5 5L19 19" stroke="currentColor" stroke-width="1" stroke-dasharray="1,2" opacity="0.3"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['accent'])
        
        return icons
    
    @staticmethod
    def get_toolbar_icons():
        """工具栏图标"""
        icons = {}
        
        # 缩放图标
        icons['zoom'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2"/>
            <line x1="8" y1="11" x2="14" y2="11" stroke="currentColor" stroke-width="2"/>
            <line x1="11" y1="8" x2="11" y2="14" stroke="currentColor" stroke-width="2"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['primary'])
        
        # 旋转图标
        icons['rotate'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M23 4V10H17" stroke="currentColor" stroke-width="2"/>
            <path d="M20.49 15A9 9 0 1 1 5.64 5.64L23 10" stroke="currentColor" stroke-width="2" fill="none"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['secondary'])
        
        # 截图图标
        icons['screenshot'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M23 19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V8C1 6.89543 1.89543 6 3 6H7L9 4H15L17 6H21C22.1046 6 23 6.89543 23 8V19Z" 
                  stroke="currentColor" stroke-width="2" fill="rgba(52, 152, 219, 0.1)"/>
            <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
            <circle cx="12" cy="13" r="1" fill="currentColor"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['warning'])
        
        # 更新图标
        icons['refresh'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 12A9 9 0 0 0 21 12A9 9 0 0 0 3 12" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M21 12L18 9M21 12L18 15" stroke="currentColor" stroke-width="2"/>
            <path d="M3 12L6 15M3 12L6 9" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['success'])
        
        return icons
    
    @staticmethod
    def get_status_icons():
        """状态图标"""
        icons = {}
        
        # 成功图标
        icons['success'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="rgba(46, 204, 113, 0.2)" stroke="currentColor" stroke-width="2"/>
            <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['success'])
        
        # 警告图标  
        icons['warning'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 2L22 20H2L12 2Z" fill="rgba(243, 156, 18, 0.2)" stroke="currentColor" stroke-width="2"/>
            <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="17" r="1" fill="currentColor"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['warning'])
        
        # 错误图标
        icons['error'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="rgba(231, 76, 60, 0.2)" stroke="currentColor" stroke-width="2"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['accent'])
        
        # 信息图标
        icons['info'] = GemPyIconFactory.create_svg_icon("""
        <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="rgba(52, 152, 219, 0.2)" stroke="currentColor" stroke-width="2"/>
            <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
            <circle cx="12" cy="8" r="1" fill="currentColor"/>
        </svg>
        """, color=GemPyIconFactory.ICON_COLORS['secondary'])
        
        return icons
    
    @staticmethod
    def get_all_icons():
        """获取所有图标"""
        all_icons = {}
        all_icons.update(GemPyIconFactory.get_file_icons())
        all_icons.update(GemPyIconFactory.get_gempy_icons())
        all_icons.update(GemPyIconFactory.get_data_icons())
        all_icons.update(GemPyIconFactory.get_analysis_icons())
        all_icons.update(GemPyIconFactory.get_visualization_icons())
        all_icons.update(GemPyIconFactory.get_toolbar_icons())
        all_icons.update(GemPyIconFactory.get_status_icons())
        return all_icons

# 全局图标实例
GEMPY_ICONS = GemPyIconFactory.get_all_icons()