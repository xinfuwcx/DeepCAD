#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Professional Icon Generator for GEM System
专业图标生成器 - 创建Abaqus风格的工具栏图标

生成SVG格式的专业图标，适用于CAE软件界面
"""

import os
from pathlib import Path
from typing import Dict, Tuple


class ProfessionalIconGenerator:
    """专业图标生成器"""
    
    def __init__(self, icon_dir: str = "icons"):
        self.icon_dir = Path(icon_dir)
        self.icon_dir.mkdir(exist_ok=True)
        
        # Abaqus风格配色
        self.colors = {
            'primary': '#0078d4',      # 主蓝色
            'secondary': '#106ebe',    # 深蓝色
            'accent': '#40e0d0',       # 青色
            'warning': '#ff8c00',      # 橙色
            'danger': '#d13438',       # 红色
            'success': '#107c10',      # 绿色
            'dark': '#2b2b2b',         # 深灰
            'light': '#ffffff',        # 白色
            'medium': '#666666'        # 中灰
        }
    
    def create_svg_icon(self, name: str, size: int = 32) -> str:
        """创建SVG图标"""
        svg_content = self.get_icon_svg(name, size)
        
        if svg_content:
            icon_path = self.icon_dir / f"{name}.svg"
            with open(icon_path, 'w', encoding='utf-8') as f:
                f.write(svg_content)
            
            # 同时创建PNG版本 (如果需要)
            self.create_png_from_svg(icon_path, size)
            
            return str(icon_path)
        
        return ""
    
    def get_icon_svg(self, name: str, size: int) -> str:
        """获取图标SVG内容"""
        icons = {
            'new': self.new_project_icon(size),
            'open': self.open_project_icon(size),
            'save': self.save_project_icon(size),
            'import': self.import_data_icon(size),
            'export': self.export_data_icon(size),
            'model': self.geological_model_icon(size),
            'section': self.section_tool_icon(size),
            'borehole': self.borehole_icon(size),
            'fault': self.fault_icon(size),
            'reset_view': self.reset_view_icon(size),
            'isometric': self.isometric_view_icon(size),
            'top_view': self.top_view_icon(size),
            'front_view': self.front_view_icon(size),
            'side_view': self.side_view_icon(size),
            'wireframe': self.wireframe_icon(size),
            'solid': self.solid_icon(size),
            'material': self.material_icon(size),
            'lighting': self.lighting_icon(size),
            'grid': self.grid_icon(size),
            'axes': self.axes_icon(size),
            'zoom_fit': self.zoom_fit_icon(size),
            'pan': self.pan_icon(size),
            'rotate': self.rotate_icon(size),
            'measure': self.measure_icon(size),
            'settings': self.settings_icon(size),
            'help': self.help_icon(size)
        }
        
        return icons.get(name, "")
    
    def new_project_icon(self, size: int) -> str:
        """新建项目图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="4" width="20" height="24" rx="2" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <rect x="10" y="8" width="12" height="2" fill="{self.colors['primary']}"/>
    <rect x="10" y="12" width="8" height="2" fill="{self.colors['medium']}"/>
    <rect x="10" y="16" width="10" height="2" fill="{self.colors['medium']}"/>
    <circle cx="22" cy="10" r="6" fill="{self.colors['success']}"/>
    <text x="22" y="14" text-anchor="middle" fill="white" font-family="Arial" font-size="8" font-weight="bold">+</text>
</svg>'''
    
    def open_project_icon(self, size: int) -> str:
        """打开项目图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6 L12 6 L14 8 L28 8 L28 26 L4 26 Z" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <rect x="6" y="10" width="20" height="14" fill="{self.colors['primary']}" opacity="0.2"/>
    <path d="M20 14 L24 18 L20 22" fill="none" stroke="{self.colors['primary']}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="8" y1="18" x2="24" y2="18" stroke="{self.colors['primary']}" stroke-width="2" stroke-linecap="round"/>
</svg>'''
    
    def save_project_icon(self, size: int) -> str:
        """保存项目图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="24" height="24" rx="2" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <rect x="8" y="4" width="4" height="6" fill="{self.colors['primary']}"/>
    <rect x="8" y="12" width="16" height="12" fill="{self.colors['primary']}" opacity="0.2"/>
    <circle cx="16" cy="18" r="3" fill="{self.colors['primary']}"/>
</svg>'''
    
    def import_data_icon(self, size: int) -> str:
        """导入数据图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="4" width="20" height="24" rx="2" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <path d="M12 16 L16 12 L20 16" fill="none" stroke="{self.colors['success']}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="16" y1="12" x2="16" y2="22" stroke="{self.colors['success']}" stroke-width="2" stroke-linecap="round"/>
    <text x="16" y="8" text-anchor="middle" fill="{self.colors['primary']}" font-family="Arial" font-size="6">CSV</text>
</svg>'''
    
    def export_data_icon(self, size: int) -> str:
        """导出数据图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="4" width="20" height="24" rx="2" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <path d="M12 16 L16 20 L20 16" fill="none" stroke="{self.colors['warning']}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="16" y1="10" x2="16" y2="20" stroke="{self.colors['warning']}" stroke-width="2" stroke-linecap="round"/>
    <text x="16" y="25" text-anchor="middle" fill="{self.colors['primary']}" font-family="Arial" font-size="6">VTK</text>
</svg>'''
    
    def geological_model_icon(self, size: int) -> str:
        """地质模型图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 20 Q8 16 12 20 T20 20 T28 20 L28 28 L4 28 Z" fill="{self.colors['primary']}" opacity="0.8"/>
    <path d="M4 16 Q8 12 12 16 T20 16 T28 16 L28 20 L4 20 Z" fill="{self.colors['accent']}" opacity="0.7"/>
    <path d="M4 12 Q8 8 12 12 T20 12 T28 12 L28 16 L4 16 Z" fill="{self.colors['success']}" opacity="0.6"/>
    <path d="M4 8 Q8 4 12 8 T20 8 T28 8 L28 12 L4 12 Z" fill="{self.colors['warning']}" opacity="0.5"/>
    <circle cx="8" cy="24" r="1" fill="{self.colors['danger']}"/>
    <circle cx="16" cy="24" r="1" fill="{self.colors['danger']}"/>
    <circle cx="24" cy="24" r="1" fill="{self.colors['danger']}"/>
</svg>'''
    
    def section_tool_icon(self, size: int) -> str:
        """剖面工具图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 20 Q8 16 12 20 T20 20 T28 20 L28 28 L4 28 Z" fill="{self.colors['medium']}" opacity="0.3"/>
    <path d="M4 16 Q8 12 12 16 T20 16 T28 16 L28 20 L4 20 Z" fill="{self.colors['medium']}" opacity="0.3"/>
    <path d="M4 12 Q8 8 12 12 T20 12 T28 12 L28 16 L4 16 Z" fill="{self.colors['medium']}" opacity="0.3"/>
    <line x1="16" y1="4" x2="16" y2="28" stroke="{self.colors['warning']}" stroke-width="3" opacity="0.8"/>
    <path d="M12 8 L16 4 L20 8" fill="none" stroke="{self.colors['warning']}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 24 L16 28 L20 24" fill="none" stroke="{self.colors['warning']}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>'''
    
    def borehole_icon(self, size: int) -> str:
        """钻孔图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="8" r="4" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <rect x="14" y="8" width="4" height="20" fill="{self.colors['primary']}" opacity="0.7"/>
    <rect x="12" y="12" width="8" height="3" fill="{self.colors['warning']}"/>
    <rect x="12" y="16" width="8" height="3" fill="{self.colors['success']}"/>
    <rect x="12" y="20" width="8" height="3" fill="{self.colors['danger']}"/>
    <rect x="12" y="24" width="8" height="3" fill="{self.colors['medium']}"/>
    <circle cx="16" cy="28" r="2" fill="{self.colors['primary']}"/>
</svg>'''
    
    def fault_icon(self, size: int) -> str:
        """断层图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 4 L28 4 L24 12 L28 20 L4 28 Z" fill="none" stroke="{self.colors['danger']}" stroke-width="2"/>
    <path d="M4 8 L12 8 L8 16 L12 24 L4 24" fill="{self.colors['danger']}" opacity="0.3"/>
    <path d="M16 4 L28 4 L24 12 L28 20 L16 28" fill="{self.colors['danger']}" opacity="0.2"/>
    <line x1="8" y1="8" x2="8" y2="24" stroke="{self.colors['danger']}" stroke-width="2" stroke-dasharray="2,2"/>
    <text x="20" y="18" text-anchor="middle" fill="{self.colors['danger']}" font-family="Arial" font-size="8" font-weight="bold">F</text>
</svg>'''
    
    def reset_view_icon(self, size: int) -> str:
        """重置视图图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4 A12 12 0 0 1 28 16" fill="none" stroke="{self.colors['primary']}" stroke-width="2" stroke-linecap="round"/>
    <path d="M12 8 L16 4 L16 8" fill="{self.colors['primary']}"/>
    <rect x="8" y="12" width="16" height="16" rx="2" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <circle cx="16" cy="20" r="2" fill="{self.colors['primary']}"/>
</svg>'''
    
    def isometric_view_icon(self, size: int) -> str:
        """等轴测视图图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 20 L16 16 L24 20 L16 24 Z" fill="{self.colors['primary']}" opacity="0.7"/>
    <path d="M8 16 L16 12 L24 16 L16 20 Z" fill="{self.colors['primary']}" opacity="0.5"/>
    <path d="M8 12 L16 8 L24 12 L16 16 Z" fill="{self.colors['primary']}" opacity="0.3"/>
    <line x1="8" y1="12" x2="8" y2="20" stroke="{self.colors['primary']}" stroke-width="2"/>
    <line x1="24" y1="12" x2="24" y2="20" stroke="{self.colors['primary']}" stroke-width="2"/>
    <line x1="16" y1="8" x2="16" y2="24" stroke="{self.colors['primary']}" stroke-width="2"/>
</svg>'''
    
    def top_view_icon(self, size: int) -> str:
        """顶视图图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="20" height="20" rx="2" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <rect x="10" y="10" width="12" height="12" fill="{self.colors['primary']}" opacity="0.3"/>
    <circle cx="16" cy="16" r="3" fill="{self.colors['primary']}"/>
    <text x="16" y="5" text-anchor="middle" fill="{self.colors['primary']}" font-family="Arial" font-size="6">Z</text>
    <path d="M14 2 L16 4 L18 2" fill="{self.colors['primary']}"/>
</svg>'''
    
    def front_view_icon(self, size: int) -> str:
        """正视图图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="8" width="20" height="16" rx="2" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <rect x="10" y="12" width="12" height="8" fill="{self.colors['primary']}" opacity="0.3"/>
    <line x1="6" y1="28" x2="26" y2="28" stroke="{self.colors['medium']}" stroke-width="1"/>
    <text x="2" y="18" text-anchor="middle" fill="{self.colors['primary']}" font-family="Arial" font-size="6">Y</text>
    <text x="16" y="30" text-anchor="middle" fill="{self.colors['primary']}" font-family="Arial" font-size="6">X</text>
</svg>'''
    
    def side_view_icon(self, size: int) -> str:
        """侧视图图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="6" width="16" height="20" rx="2" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <rect x="12" y="10" width="8" height="12" fill="{self.colors['primary']}" opacity="0.3"/>
    <line x1="4" y1="6" x2="4" y2="26" stroke="{self.colors['medium']}" stroke-width="1"/>
    <text x="2" y="18" text-anchor="middle" fill="{self.colors['primary']}" font-family="Arial" font-size="6">Z</text>
    <text x="16" y="30" text-anchor="middle" fill="{self.colors['primary']}" font-family="Arial" font-size="6">Y</text>
</svg>'''
    
    def wireframe_icon(self, size: int) -> str:
        """线框模式图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 20 L16 16 L24 20 L16 24 Z" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <path d="M8 16 L16 12 L24 16" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <line x1="8" y1="16" x2="8" y2="20" stroke="{self.colors['primary']}" stroke-width="2"/>
    <line x1="24" y1="16" x2="24" y2="20" stroke="{self.colors['primary']}" stroke-width="2"/>
    <line x1="16" y1="12" x2="16" y2="16" stroke="{self.colors['primary']}" stroke-width="2"/>
    <line x1="16" y1="16" x2="16" y2="24" stroke="{self.colors['primary']}" stroke-width="2"/>
</svg>'''
    
    def solid_icon(self, size: int) -> str:
        """实体模式图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 20 L16 16 L24 20 L16 24 Z" fill="{self.colors['primary']}" opacity="0.8"/>
    <path d="M8 16 L16 12 L24 16 L24 20 L16 16 Z" fill="{self.colors['primary']}" opacity="0.6"/>
    <path d="M16 12 L24 16 L16 20 L8 16 Z" fill="{self.colors['primary']}" opacity="0.4"/>
</svg>'''
    
    def settings_icon(self, size: int) -> str:
        """设置图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="4" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <circle cx="16" cy="16" r="8" fill="none" stroke="{self.colors['primary']}" stroke-width="2" stroke-dasharray="2,6"/>
    <circle cx="16" cy="16" r="12" fill="none" stroke="{self.colors['primary']}" stroke-width="1" stroke-dasharray="1,3"/>
    <circle cx="16" cy="6" r="1" fill="{self.colors['primary']}"/>
    <circle cx="16" cy="26" r="1" fill="{self.colors['primary']}"/>
    <circle cx="6" cy="16" r="1" fill="{self.colors['primary']}"/>
    <circle cx="26" cy="16" r="1" fill="{self.colors['primary']}"/>
</svg>'''
    
    def material_icon(self, size: int) -> str:
        """材质图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="10" fill="{self.colors['primary']}" opacity="0.3"/>
    <circle cx="16" cy="16" r="6" fill="{self.colors['primary']}" opacity="0.6"/>
    <circle cx="16" cy="16" r="3" fill="{self.colors['primary']}"/>
    <circle cx="10" cy="10" r="2" fill="{self.colors['warning']}"/>
    <circle cx="22" cy="10" r="2" fill="{self.colors['success']}"/>
    <circle cx="10" cy="22" r="2" fill="{self.colors['danger']}"/>
    <circle cx="22" cy="22" r="2" fill="{self.colors['accent']}"/>
</svg>'''
    
    def lighting_icon(self, size: int) -> str:
        """光照图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="4" fill="{self.colors['warning']}"/>
    <line x1="16" y1="4" x2="16" y2="8" stroke="{self.colors['warning']}" stroke-width="2"/>
    <line x1="16" y1="24" x2="16" y2="28" stroke="{self.colors['warning']}" stroke-width="2"/>
    <line x1="4" y1="16" x2="8" y2="16" stroke="{self.colors['warning']}" stroke-width="2"/>
    <line x1="24" y1="16" x2="28" y2="16" stroke="{self.colors['warning']}" stroke-width="2"/>
    <line x1="7.7" y1="7.7" x2="10.8" y2="10.8" stroke="{self.colors['warning']}" stroke-width="2"/>
    <line x1="21.2" y1="21.2" x2="24.3" y2="24.3" stroke="{self.colors['warning']}" stroke-width="2"/>
    <line x1="7.7" y1="24.3" x2="10.8" y2="21.2" stroke="{self.colors['warning']}" stroke-width="2"/>
    <line x1="21.2" y1="10.8" x2="24.3" y2="7.7" stroke="{self.colors['warning']}" stroke-width="2"/>
</svg>'''
    
    def grid_icon(self, size: int) -> str:
        """网格图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <line x1="8" y1="4" x2="8" y2="28" stroke="{self.colors['medium']}" stroke-width="1"/>
    <line x1="16" y1="4" x2="16" y2="28" stroke="{self.colors['medium']}" stroke-width="1"/>
    <line x1="24" y1="4" x2="24" y2="28" stroke="{self.colors['medium']}" stroke-width="1"/>
    <line x1="4" y1="8" x2="28" y2="8" stroke="{self.colors['medium']}" stroke-width="1"/>
    <line x1="4" y1="16" x2="28" y2="16" stroke="{self.colors['primary']}" stroke-width="2"/>
    <line x1="4" y1="24" x2="28" y2="24" stroke="{self.colors['medium']}" stroke-width="1"/>
</svg>'''
    
    def axes_icon(self, size: int) -> str:
        """坐标轴图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <line x1="4" y1="28" x2="28" y2="28" stroke="{self.colors['danger']}" stroke-width="3"/>
    <line x1="4" y1="28" x2="4" y2="4" stroke="{self.colors['success']}" stroke-width="3"/>
    <path d="M24 24 L28 28 L24 32" fill="{self.colors['danger']}"/>
    <path d="M0 8 L4 4 L8 8" fill="{self.colors['success']}"/>
    <text x="30" y="30" fill="{self.colors['danger']}" font-family="Arial" font-size="8">X</text>
    <text x="2" y="2" fill="{self.colors['success']}" font-family="Arial" font-size="8">Y</text>
</svg>'''
    
    def zoom_fit_icon(self, size: int) -> str:
        """缩放适应图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="8" width="16" height="16" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <path d="M4 4 L8 4 L8 8" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <path d="M28 4 L24 4 L24 8" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <path d="M4 28 L8 28 L8 24" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <path d="M28 28 L24 28 L24 24" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
</svg>'''
    
    def pan_icon(self, size: int) -> str:
        """平移图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 16 L20 16" stroke="{self.colors['primary']}" stroke-width="2"/>
    <path d="M16 12 L16 20" stroke="{self.colors['primary']}" stroke-width="2"/>
    <path d="M8 12 L12 16 L8 20" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <path d="M24 12 L20 16 L24 20" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <path d="M12 8 L16 12 L20 8" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <path d="M12 24 L16 20 L20 24" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
</svg>'''
    
    def rotate_icon(self, size: int) -> str:
        """旋转图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4 A12 12 0 0 1 28 16 A12 12 0 0 1 16 28" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <path d="M12 8 L16 4 L16 8" fill="{self.colors['primary']}"/>
    <path d="M20 24 L16 28 L16 24" fill="{self.colors['primary']}"/>
</svg>'''
    
    def measure_icon(self, size: int) -> str:
        """测量图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <line x1="6" y1="26" x2="26" y2="6" stroke="{self.colors['primary']}" stroke-width="2"/>
    <line x1="4" y1="24" x2="8" y2="28" stroke="{self.colors['primary']}" stroke-width="2"/>
    <line x1="24" y1="4" x2="28" y2="8" stroke="{self.colors['primary']}" stroke-width="2"/>
    <text x="16" y="18" text-anchor="middle" fill="{self.colors['primary']}" font-family="Arial" font-size="8">123m</text>
    <circle cx="6" cy="26" r="2" fill="{self.colors['primary']}"/>
    <circle cx="26" cy="6" r="2" fill="{self.colors['primary']}"/>
</svg>'''
    
    def help_icon(self, size: int) -> str:
        """帮助图标"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="12" fill="none" stroke="{self.colors['primary']}" stroke-width="2"/>
    <path d="M12 12 Q12 8 16 8 Q20 8 20 12 Q20 14 16 16" fill="none" stroke="{self.colors['primary']}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="16" cy="22" r="1" fill="{self.colors['primary']}"/>
</svg>'''
    
    def create_png_from_svg(self, svg_path: Path, size: int):
        """从SVG创建PNG (需要额外的库)"""
        try:
            # 这里可以使用 cairosvg 或 wand 来转换
            # 目前只是占位符
            pass
        except Exception as e:
            print(f"PNG转换失败: {e}")
    
    def generate_all_icons(self, size: int = 32):
        """生成所有图标"""
        icons = [
            'new', 'open', 'save', 'import', 'export',
            'model', 'section', 'borehole', 'fault',
            'reset_view', 'isometric', 'top_view', 'front_view', 'side_view',
            'wireframe', 'solid', 'settings', 'help'
        ]
        
        created_icons = []
        for icon_name in icons:
            icon_path = self.create_svg_icon(icon_name, size)
            if icon_path:
                created_icons.append(icon_path)
                print(f"[OK] 创建图标: {icon_name}")
        
        print(f"\n总共创建了 {len(created_icons)} 个图标")
        return created_icons


def main():
    """主函数 - 生成所有图标"""
    print(">> 生成专业CAE图标...")
    print("=" * 40)
    
    generator = ProfessionalIconGenerator("E:/DeepCAD/icons")
    generator.generate_all_icons(32)
    
    print("\n>> 图标生成完成!")
    print("图标位置: E:/DeepCAD/icons/")


if __name__ == "__main__":
    main()