#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
COMSOL风格可视化演示 - 简化版本
专注于改进地质建模的显示效果
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import tkinter as tk
from tkinter import ttk
import matplotlib.colors as mcolors

class COMSOLStyleDemo:
    def __init__(self):
        self.setup_comsol_styles()
        self.create_gui()
        
    def setup_comsol_styles(self):
        """设置COMSOL风格的配色和样式"""
        
        # COMSOL经典热力学配色
        self.thermal_colors = ['#000080', '#0000FF', '#00FFFF', '#00FF00', 
                              '#FFFF00', '#FF8000', '#FF0000', '#800000']
        self.thermal_cmap = mcolors.LinearSegmentedColormap.from_list(
            'comsol_thermal', self.thermal_colors, N=256
        )
        
        # COMSOL流体力学配色
        self.flow_colors = ['#000040', '#000080', '#0040FF', '#00FFFF', 
                           '#40FF40', '#FFFF00', '#FF4000', '#800000']
        self.flow_cmap = mcolors.LinearSegmentedColormap.from_list(
            'comsol_flow', self.flow_colors, N=256
        )
        
        # 地质专业配色（改进版）
        self.geo_colors = ['#8B4513', '#CD853F', '#D2B48C', '#F5DEB3',
                          '#E6E6FA', '#B0C4DE', '#708090', '#2F4F4F']
        self.geo_cmap = mcolors.LinearSegmentedColormap.from_list(
            'comsol_geo', self.geo_colors, N=256
        )
        
        # COMSOL界面配色
        self.bg_color = '#F0F0F0'
        self.panel_color = '#E8E8E8'
        self.accent_color = '#4A90E2'
    
    def create_gui(self):
        """创建GUI界面"""
        self.root = tk.Tk()
        self.root.title("COMSOL风格地质建模演示")
        self.root.geometry("1400x900")
        self.root.configure(bg=self.bg_color)
        
        # 创建主框架
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # 左侧控制面板
        self.create_control_panel(main_frame)
        
        # 右侧可视化区域
        self.create_visualization_area(main_frame)
        
        # 初始化显示
        self.update_visualization()
    
    def create_control_panel(self, parent):
        """创建控制面板"""
        control_frame = ttk.LabelFrame(parent, text="控制面板", padding=10)
        control_frame.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        
        # 色彩映射选择
        ttk.Label(control_frame, text="色彩映射:").pack(anchor=tk.W, pady=(0, 5))
        self.colormap_var = tk.StringVar(value="地质专业")
        colormap_combo = ttk.Combobox(control_frame, textvariable=self.colormap_var,
                                     values=["地质专业", "热力学", "流体力学", "经典"])
        colormap_combo.pack(fill=tk.X, pady=(0, 15))
        colormap_combo.bind('<<ComboboxSelected>>', lambda e: self.update_visualization())
        
        # 透明度控制
        ttk.Label(control_frame, text="透明度:").pack(anchor=tk.W, pady=(0, 5))
        self.alpha_var = tk.DoubleVar(value=0.8)
        alpha_scale = ttk.Scale(control_frame, from_=0.1, to=1.0, 
                               variable=self.alpha_var, orient=tk.HORIZONTAL,
                               command=lambda v: self.update_visualization())
        alpha_scale.pack(fill=tk.X, pady=(0, 15))
        
        # 等高线密度
        ttk.Label(control_frame, text="等高线密度:").pack(anchor=tk.W, pady=(0, 5))
        self.contour_levels_var = tk.IntVar(value=20)
        contour_scale = ttk.Scale(control_frame, from_=5, to=50, 
                                 variable=self.contour_levels_var, orient=tk.HORIZONTAL,
                                 command=lambda v: self.update_visualization())
        contour_scale.pack(fill=tk.X, pady=(0, 15))
        
        # 显示选项
        ttk.Label(control_frame, text="显示选项:").pack(anchor=tk.W, pady=(10, 5))
        
        self.show_contour_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(control_frame, text="显示等高线", 
                       variable=self.show_contour_var,
                       command=self.update_visualization).pack(anchor=tk.W)
        
        self.show_colorbar_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(control_frame, text="显示色彩条", 
                       variable=self.show_colorbar_var,
                       command=self.update_visualization).pack(anchor=tk.W)
        
        self.smooth_shading_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(control_frame, text="平滑着色", 
                       variable=self.smooth_shading_var,
                       command=self.update_visualization).pack(anchor=tk.W)
        
        # 视图控制
        ttk.Label(control_frame, text="视图控制:").pack(anchor=tk.W, pady=(20, 5))
        
        ttk.Button(control_frame, text="3D主视图", 
                  command=lambda: self.set_view_mode('3d')).pack(fill=tk.X, pady=2)
        ttk.Button(control_frame, text="XY剖面图", 
                  command=lambda: self.set_view_mode('xy')).pack(fill=tk.X, pady=2)
        ttk.Button(control_frame, text="XZ剖面图", 
                  command=lambda: self.set_view_mode('xz')).pack(fill=tk.X, pady=2)
        ttk.Button(control_frame, text="YZ剖面图", 
                  command=lambda: self.set_view_mode('yz')).pack(fill=tk.X, pady=2)
        ttk.Button(control_frame, text="多视图模式", 
                  command=lambda: self.set_view_mode('multi')).pack(fill=tk.X, pady=2)
    
    def create_visualization_area(self, parent):
        """创建可视化区域"""
        viz_frame = ttk.LabelFrame(parent, text="可视化区域", padding=10)
        viz_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        # 创建matplotlib图形
        self.fig = plt.Figure(figsize=(12, 8), facecolor=self.bg_color)
        self.canvas = FigureCanvasTkAgg(self.fig, viz_frame)
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)
        
        self.current_view_mode = 'multi'
    
    def get_current_colormap(self):
        """获取当前选择的色彩映射"""
        colormap_name = self.colormap_var.get()
        if colormap_name == "地质专业":
            return self.geo_cmap
        elif colormap_name == "热力学":
            return self.thermal_cmap
        elif colormap_name == "流体力学":
            return self.flow_cmap
        else:
            return plt.cm.viridis
    
    def create_geological_data(self):
        """创建示例地质数据"""
        # 创建坐标网格
        x = np.linspace(-10, 10, 50)
        y = np.linspace(-5, 5, 30)
        z = np.linspace(-6, 3, 25)
        
        X, Y = np.meshgrid(x, y)
        
        # 模拟多层地质结构
        layers = {}
        
        # 第四系 (表层)
        layers['quaternary'] = {
            'elevation': 2 + 0.8 * np.sin(0.3 * X) * np.cos(0.4 * Y) + 0.2 * np.random.rand(*X.shape),
            'thickness': 1.5 + 0.5 * np.sin(0.2 * X) * np.cos(0.3 * Y),
            'properties': np.sin(0.4 * X) * np.cos(0.3 * Y) + 0.3 * np.random.rand(*X.shape)
        }
        
        # 第三系 (中层)
        layers['tertiary'] = {
            'elevation': layers['quaternary']['elevation'] - layers['quaternary']['thickness'],
            'thickness': 2.0 + 0.8 * np.sin(0.15 * X) * np.cos(0.25 * Y),
            'properties': 0.5 + 0.7 * np.sin(0.2 * X) * np.cos(0.4 * Y) + 0.2 * np.random.rand(*X.shape)
        }
        
        # 白垩系 (底层)
        layers['cretaceous'] = {
            'elevation': layers['tertiary']['elevation'] - layers['tertiary']['thickness'],
            'thickness': 2.5 + np.sin(0.1 * X) * np.cos(0.2 * Y),
            'properties': 1.0 + np.sin(0.1 * X) * np.cos(0.15 * Y) + 0.15 * np.random.rand(*X.shape)
        }
        
        return x, y, X, Y, layers
    
    def update_visualization(self):
        """更新可视化显示"""
        self.fig.clear()
        
        x, y, X, Y, layers = self.create_geological_data()
        cmap = self.get_current_colormap()
        alpha = self.alpha_var.get()
        levels = int(self.contour_levels_var.get())
        
        if self.current_view_mode == 'multi':
            self.create_multi_view(x, y, X, Y, layers, cmap, alpha, levels)
        elif self.current_view_mode == '3d':
            self.create_3d_view(x, y, X, Y, layers, cmap, alpha)
        elif self.current_view_mode == 'xy':
            self.create_xy_view(X, Y, layers, cmap, alpha, levels)
        elif self.current_view_mode == 'xz':
            self.create_xz_view(x, layers, cmap, alpha, levels)
        elif self.current_view_mode == 'yz':
            self.create_yz_view(y, layers, cmap, alpha, levels)
        
        self.fig.tight_layout()
        self.canvas.draw()
    
    def create_multi_view(self, x, y, X, Y, layers, cmap, alpha, levels):
        """创建多视图显示"""
        # 主3D视图 (左上)
        ax1 = self.fig.add_subplot(2, 2, 1, projection='3d')
        self.plot_3d_geological_model(ax1, x, y, X, Y, layers, cmap, alpha)
        ax1.set_title('3D地质模型', fontsize=12, fontweight='bold')
        
        # XY剖面 (右上)
        ax2 = self.fig.add_subplot(2, 2, 2)
        self.plot_xy_section(ax2, X, Y, layers, cmap, alpha, levels)
        ax2.set_title('XY剖面 (Z=0m)', fontsize=12, fontweight='bold')
        
        # XZ剖面 (左下)
        ax3 = self.fig.add_subplot(2, 2, 3)
        self.plot_xz_section(ax3, x, layers, cmap, alpha, levels)
        ax3.set_title('XZ剖面 (Y=0m)', fontsize=12, fontweight='bold')
        
        # YZ剖面 (右下)  
        ax4 = self.fig.add_subplot(2, 2, 4)
        self.plot_yz_section(ax4, y, layers, cmap, alpha, levels)
        ax4.set_title('YZ剖面 (X=0m)', fontsize=12, fontweight='bold')
    
    def create_3d_view(self, x, y, X, Y, layers, cmap, alpha):
        """创建3D视图"""
        ax = self.fig.add_subplot(111, projection='3d')
        self.plot_3d_geological_model(ax, x, y, X, Y, layers, cmap, alpha)
        ax.set_title('3D地质模型 - COMSOL风格', fontsize=14, fontweight='bold')
    
    def create_xy_view(self, X, Y, layers, cmap, alpha, levels):
        """创建XY视图"""
        ax = self.fig.add_subplot(111)
        self.plot_xy_section(ax, X, Y, layers, cmap, alpha, levels)
        ax.set_title('XY剖面图 - COMSOL风格', fontsize=14, fontweight='bold')
    
    def create_xz_view(self, x, layers, cmap, alpha, levels):
        """创建XZ视图"""
        ax = self.fig.add_subplot(111)
        self.plot_xz_section(ax, x, layers, cmap, alpha, levels)
        ax.set_title('XZ剖面图 - COMSOL风格', fontsize=14, fontweight='bold')
    
    def create_yz_view(self, y, layers, cmap, alpha, levels):
        """创建YZ视图"""
        ax = self.fig.add_subplot(111)
        self.plot_yz_section(ax, y, layers, cmap, alpha, levels)
        ax.set_title('YZ剖面图 - COMSOL风格', fontsize=14, fontweight='bold')
    
    def plot_3d_geological_model(self, ax, x, y, X, Y, layers, cmap, alpha):
        """绘制3D地质模型"""
        ax.set_facecolor('#F8F8F8')
        
        # 绘制各地质层
        layer_names = ['quaternary', 'tertiary', 'cretaceous']
        colors = ['#D2B48C', '#F4A460', '#DDD']
        
        for i, (layer_name, color) in enumerate(zip(layer_names, colors)):
            layer = layers[layer_name]
            Z_top = layer['elevation']
            Z_bottom = Z_top - layer['thickness']
            
            # 使用COMSOL风格的表面渲染
            surf_top = ax.plot_surface(X, Y, Z_top, 
                                      cmap=cmap, alpha=alpha,
                                      linewidth=0.1, antialiased=True,
                                      shade=True, vmin=-2, vmax=2)
            
            if i == len(layer_names) - 1:  # 只为最底层绘制底面
                surf_bottom = ax.plot_surface(X, Y, Z_bottom, 
                                            cmap=cmap, alpha=alpha*0.7,
                                            linewidth=0.1, antialiased=True,
                                            shade=True, vmin=-2, vmax=2)
        
        # COMSOL风格的轴设置
        ax.set_xlabel('X (m)', fontsize=10)
        ax.set_ylabel('Y (m)', fontsize=10) 
        ax.set_zlabel('Z (m)', fontsize=10)
        ax.grid(True, alpha=0.3)
        ax.view_init(elev=20, azim=45)
        
        # 设置轴的颜色和样式
        ax.xaxis.pane.fill = False
        ax.yaxis.pane.fill = False
        ax.zaxis.pane.fill = False
        ax.xaxis.pane.set_edgecolor('gray')
        ax.yaxis.pane.set_edgecolor('gray')
        ax.zaxis.pane.set_edgecolor('gray')
        ax.xaxis.pane.set_alpha(0.1)
        ax.yaxis.pane.set_alpha(0.1)
        ax.zaxis.pane.set_alpha(0.1)
    
    def plot_xy_section(self, ax, X, Y, layers, cmap, alpha, levels):
        """绘制XY剖面"""
        ax.set_facecolor('#FFFFFF')
        
        # 选择第四系表面作为示例
        Z = layers['quaternary']['properties']
        
        # COMSOL风格的等值面图
        if self.smooth_shading_var.get():
            im = ax.contourf(X, Y, Z, levels=levels, cmap=cmap, alpha=alpha, extend='both')
        else:
            im = ax.pcolormesh(X, Y, Z, cmap=cmap, alpha=alpha, shading='flat')
        
        # 添加等高线
        if self.show_contour_var.get():
            contours = ax.contour(X, Y, Z, levels=levels//2, colors='white', 
                                linewidths=0.8, alpha=0.8)
            ax.clabel(contours, inline=True, fontsize=8, fmt='%.2f')
        
        # 添加色彩条
        if self.show_colorbar_var.get():
            cbar = self.fig.colorbar(im, ax=ax, shrink=0.8)
            cbar.set_label('地质属性', rotation=270, labelpad=15)
        
        ax.set_xlabel('X (m)', fontsize=10)
        ax.set_ylabel('Y (m)', fontsize=10)
        ax.grid(True, alpha=0.3, linestyle='--')
        ax.set_aspect('equal')
    
    def plot_xz_section(self, ax, x, layers, cmap, alpha, levels):
        """绘制XZ剖面"""
        ax.set_facecolor('#FFFFFF')
        
        # 创建XZ坐标网格
        z = np.linspace(-6, 3, 30)
        X_xz, Z_xz = np.meshgrid(x, z)
        
        # 模拟XZ剖面的地质属性分布
        Y_property = np.sin(0.2 * X_xz) * np.cos(0.3 * Z_xz) + 0.3 * np.sin(0.15 * X_xz * Z_xz)
        
        # COMSOL风格绘制
        if self.smooth_shading_var.get():
            im = ax.contourf(X_xz, Z_xz, Y_property, levels=levels, cmap=cmap, alpha=alpha, extend='both')
        else:
            im = ax.pcolormesh(X_xz, Z_xz, Y_property, cmap=cmap, alpha=alpha, shading='flat')
        
        if self.show_contour_var.get():
            contours = ax.contour(X_xz, Z_xz, Y_property, levels=levels//2, colors='white',
                                linewidths=0.8, alpha=0.8)
            ax.clabel(contours, inline=True, fontsize=8, fmt='%.2f')
        
        if self.show_colorbar_var.get():
            cbar = self.fig.colorbar(im, ax=ax, shrink=0.8)
            cbar.set_label('地质属性', rotation=270, labelpad=15)
        
        ax.set_xlabel('X (m)', fontsize=10)
        ax.set_ylabel('Z (m)', fontsize=10)
        ax.grid(True, alpha=0.3, linestyle='--')
        ax.set_aspect('equal')
    
    def plot_yz_section(self, ax, y, layers, cmap, alpha, levels):
        """绘制YZ剖面"""
        ax.set_facecolor('#FFFFFF')
        
        # 创建YZ坐标网格
        z = np.linspace(-6, 3, 30)
        Y_yz, Z_yz = np.meshgrid(y, z)
        
        # 模拟YZ剖面的地质属性分布  
        X_property = np.sin(0.4 * Y_yz) * np.cos(0.2 * Z_yz) + 0.4 * np.sin(0.1 * Y_yz * Z_yz)
        
        # COMSOL风格绘制
        if self.smooth_shading_var.get():
            im = ax.contourf(Y_yz, Z_yz, X_property, levels=levels, cmap=cmap, alpha=alpha, extend='both')
        else:
            im = ax.pcolormesh(Y_yz, Z_yz, X_property, cmap=cmap, alpha=alpha, shading='flat')
        
        if self.show_contour_var.get():
            contours = ax.contour(Y_yz, Z_yz, X_property, levels=levels//2, colors='white',
                                linewidths=0.8, alpha=0.8)
            ax.clabel(contours, inline=True, fontsize=8, fmt='%.2f')
        
        if self.show_colorbar_var.get():
            cbar = self.fig.colorbar(im, ax=ax, shrink=0.8)
            cbar.set_label('地质属性', rotation=270, labelpad=15)
        
        ax.set_xlabel('Y (m)', fontsize=10)
        ax.set_ylabel('Z (m)', fontsize=10)
        ax.grid(True, alpha=0.3, linestyle='--')
        ax.set_aspect('equal')
    
    def set_view_mode(self, mode):
        """设置视图模式"""
        self.current_view_mode = mode
        self.update_visualization()
    
    def run(self):
        """运行应用程序"""
        self.root.mainloop()


if __name__ == '__main__':
    demo = COMSOLStyleDemo()
    demo.run()