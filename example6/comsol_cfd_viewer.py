#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
COMSOL风格的桥墩冲刷CFD可视化系统
Professional Bridge Pier Scour CFD Visualization in COMSOL Style
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import tkinter as tk
from tkinter import ttk
import matplotlib.colors as mcolors
from matplotlib.patches import Circle
import json
import os

try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

class COMSOLCFDViewer:
    """COMSOL风格CFD结果查看器"""
    
    def __init__(self):
        self.setup_comsol_cfd_styles()
        self.load_fem_results()
        self.create_gui()
        
    def setup_comsol_cfd_styles(self):
        """设置COMSOL CFD专业配色"""
        
        # COMSOL速度场配色 (蓝->绿->黄->红)
        self.velocity_colors = ['#000080', '#0040FF', '#00FFFF', '#40FF40', 
                               '#FFFF00', '#FF8000', '#FF0000']
        self.velocity_cmap = mcolors.LinearSegmentedColormap.from_list(
            'comsol_velocity', self.velocity_colors, N=256
        )
        
        # COMSOL压力场配色 (深蓝->白->深红)
        self.pressure_colors = ['#000080', '#4080FF', '#80C0FF', '#FFFFFF', 
                               '#FF8080', '#FF4040', '#800000']
        self.pressure_cmap = mcolors.LinearSegmentedColormap.from_list(
            'comsol_pressure', self.pressure_colors, N=256
        )
        
        # COMSOL涡量场配色
        self.vorticity_colors = ['#000040', '#0000FF', '#8080FF', '#FFFFFF',
                                '#FF8080', '#FF0000', '#400000']
        self.vorticity_cmap = mcolors.LinearSegmentedColormap.from_list(
            'comsol_vorticity', self.vorticity_colors, N=256
        )
        
        # COMSOL剪切应力配色
        self.shear_colors = ['#000000', '#400040', '#800080', '#FF00FF',
                            '#FF8080', '#FFFF00', '#FFFFFF']
        self.shear_cmap = mcolors.LinearSegmentedColormap.from_list(
            'comsol_shear', self.shear_colors, N=256
        )
        
        # 界面配色
        self.bg_color = '#F0F0F0'
        self.panel_color = '#E8E8E8'
        self.accent_color = '#4A90E2'
    
    def load_fem_results(self):
        """加载FEM计算结果"""
        # 检查是否存在计算结果
        results_files = ['test_output/fem_results.json', 'fem_pure_output/fem_results.json']
        
        self.fem_data = None
        for file_path in results_files:
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        self.fem_data = json.load(f)
                    print(f"加载FEM结果: {file_path}")
                    break
                except:
                    continue
        
        if self.fem_data is None:
            print("未找到FEM结果，使用模拟数据")
            self.create_simulated_data()
        else:
            print("FEM结果加载成功")
            self.process_fem_data()
    
    def create_simulated_data(self):
        """创建模拟的CFD数据用于演示"""
        # 创建流域网格
        x = np.linspace(-5, 5, 80)
        y = np.linspace(-2, 2, 50)
        self.X, self.Y = np.meshgrid(x, y)
        
        # 桥墩参数
        self.pier_x, self.pier_y = 0, 0
        self.pier_radius = 0.5
        
        # 模拟流场 - 圆柱绕流
        self.create_cylinder_flow()
        
        # 计算派生量
        self.calculate_derived_quantities()
    
    def process_fem_data(self):
        """处理实际的FEM数据"""
        # 这里可以处理real FEM results
        # 暂时使用模拟数据
        self.create_simulated_data()
    
    def create_cylinder_flow(self):
        """创建圆柱绕流的解析解"""
        U_inf = 1.2  # 来流速度
        
        # 计算每个点到圆柱中心的距离
        R = np.sqrt((self.X - self.pier_x)**2 + (self.Y - self.pier_y)**2)
        theta = np.arctan2(self.Y - self.pier_y, self.X - self.pier_x)
        
        # 圆柱绕流的势流解
        a = self.pier_radius  # 圆柱半径
        
        # 初始化速度场
        self.u = np.zeros_like(self.X)
        self.v = np.zeros_like(self.Y)
        self.pressure = np.zeros_like(self.X)
        
        # 在圆柱外部计算流场
        mask = R > a
        
        # 速度场 (势流解 + 扰动)
        self.u[mask] = U_inf * (1 - a**2 / R[mask]**2 * np.cos(2*theta[mask]))
        self.v[mask] = -U_inf * a**2 / R[mask]**2 * np.sin(2*theta[mask])
        
        # 在圆柱内部设置为0
        self.u[~mask] = 0
        self.v[~mask] = 0
        
        # 添加一些湍流效应（简化）
        turbulence_x = 0.1 * U_inf * np.sin(3*theta) * np.exp(-0.5*(R-a))
        turbulence_y = 0.1 * U_inf * np.cos(3*theta) * np.exp(-0.5*(R-a))
        
        self.u += turbulence_x * mask
        self.v += turbulence_y * mask
        
        # 压力场 (Bernoulli方程)
        speed_squared = self.u**2 + self.v**2
        rho = 1000  # 水密度
        self.pressure = 0.5 * rho * (U_inf**2 - speed_squared)
    
    def calculate_derived_quantities(self):
        """计算派生的CFD量"""
        # 速度大小
        self.speed = np.sqrt(self.u**2 + self.v**2)
        
        # 计算涡量 (curl of velocity)
        dy, dx = np.gradient(self.v), np.gradient(self.u)
        self.vorticity = np.gradient(self.v, axis=1) - np.gradient(self.u, axis=0)
        
        # 计算剪切应力 (简化)
        du_dy = np.gradient(self.u, axis=0)
        dv_dx = np.gradient(self.v, axis=1)
        mu = 1e-3  # 动力粘度
        self.shear_stress = mu * (du_dy + dv_dx)
        
        # 计算Reynolds应力 (简化的湍流模型)
        self.reynolds_stress = 0.1 * self.speed**2 * (1 + 0.5*np.sin(3*np.arctan2(self.Y, self.X)))
    
    def create_gui(self):
        """创建GUI界面"""
        self.root = tk.Tk()
        self.root.title("COMSOL风格桥墩冲刷CFD分析系统")
        self.root.geometry("1600x1000")
        self.root.configure(bg=self.bg_color)
        
        # 创建主框架
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # 左侧控制面板
        self.create_control_panel(main_frame)
        
        # 右侧可视化区域
        self.create_visualization_area(main_frame)
        
        # 底部状态栏
        self.create_status_bar()
        
        # 初始化显示
        self.update_visualization()
    
    def create_control_panel(self, parent):
        """创建CFD控制面板"""
        control_frame = ttk.LabelFrame(parent, text="CFD可视化控制", padding=10)
        control_frame.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        
        # 显示变量选择
        ttk.Label(control_frame, text="显示变量:").pack(anchor=tk.W, pady=(0, 5))
        self.display_var = tk.StringVar(value="速度大小")
        display_combo = ttk.Combobox(control_frame, textvariable=self.display_var,
                                    values=["速度大小", "压力", "涡量", "剪切应力", "速度矢量"])
        display_combo.pack(fill=tk.X, pady=(0, 15))
        display_combo.bind('<<ComboboxSelected>>', lambda e: self.update_visualization())
        
        # 色彩映射选择
        ttk.Label(control_frame, text="色彩映射:").pack(anchor=tk.W, pady=(0, 5))
        self.colormap_var = tk.StringVar(value="COMSOL速度")
        colormap_combo = ttk.Combobox(control_frame, textvariable=self.colormap_var,
                                     values=["COMSOL速度", "COMSOL压力", "COMSOL涡量", "COMSOL剪切"])
        colormap_combo.pack(fill=tk.X, pady=(0, 15))
        colormap_combo.bind('<<ComboboxSelected>>', lambda e: self.update_visualization())
        
        # 等值线控制
        ttk.Label(control_frame, text="等值线数量:").pack(anchor=tk.W, pady=(0, 5))
        self.contour_levels_var = tk.IntVar(value=20)
        contour_scale = ttk.Scale(control_frame, from_=5, to=50, 
                                 variable=self.contour_levels_var, orient=tk.HORIZONTAL,
                                 command=lambda v: self.update_visualization())
        contour_scale.pack(fill=tk.X, pady=(0, 15))
        
        # 矢量密度控制
        ttk.Label(control_frame, text="矢量密度:").pack(anchor=tk.W, pady=(0, 5))
        self.vector_density_var = tk.IntVar(value=10)
        vector_scale = ttk.Scale(control_frame, from_=5, to=30, 
                               variable=self.vector_density_var, orient=tk.HORIZONTAL,
                               command=lambda v: self.update_visualization())
        vector_scale.pack(fill=tk.X, pady=(0, 15))
        
        # 显示选项
        ttk.Label(control_frame, text="显示选项:").pack(anchor=tk.W, pady=(10, 5))
        
        self.show_contours_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(control_frame, text="显示等值线", 
                       variable=self.show_contours_var,
                       command=self.update_visualization).pack(anchor=tk.W)
        
        self.show_colorbar_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(control_frame, text="显示色彩条", 
                       variable=self.show_colorbar_var,
                       command=self.update_visualization).pack(anchor=tk.W)
        
        self.show_pier_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(control_frame, text="显示桥墩", 
                       variable=self.show_pier_var,
                       command=self.update_visualization).pack(anchor=tk.W)
        
        self.show_streamlines_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(control_frame, text="显示流线", 
                       variable=self.show_streamlines_var,
                       command=self.update_visualization).pack(anchor=tk.W)
        
        # 视图模式
        ttk.Label(control_frame, text="视图模式:").pack(anchor=tk.W, pady=(20, 5))
        
        ttk.Button(control_frame, text="单一视图", 
                  command=lambda: self.set_view_mode('single')).pack(fill=tk.X, pady=2)
        ttk.Button(control_frame, text="对比视图", 
                  command=lambda: self.set_view_mode('compare')).pack(fill=tk.X, pady=2)
        ttk.Button(control_frame, text="多参数视图", 
                  command=lambda: self.set_view_mode('multi')).pack(fill=tk.X, pady=2)
        
        # 分析工具
        ttk.Label(control_frame, text="分析工具:").pack(anchor=tk.W, pady=(20, 5))
        
        ttk.Button(control_frame, text="截面分析", 
                  command=self.show_profile_analysis).pack(fill=tk.X, pady=2)
        ttk.Button(control_frame, text="点值查询", 
                  command=self.enable_point_query).pack(fill=tk.X, pady=2)
        ttk.Button(control_frame, text="积分计算", 
                  command=self.show_integration_tools).pack(fill=tk.X, pady=2)
        
        # 导出功能
        ttk.Label(control_frame, text="导出:").pack(anchor=tk.W, pady=(20, 5))
        
        ttk.Button(control_frame, text="保存图像", 
                  command=self.export_image).pack(fill=tk.X, pady=2)
        ttk.Button(control_frame, text="导出数据", 
                  command=self.export_data).pack(fill=tk.X, pady=2)
    
    def create_visualization_area(self, parent):
        """创建可视化区域"""
        viz_frame = ttk.LabelFrame(parent, text="CFD结果可视化", padding=10)
        viz_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        # 创建matplotlib图形
        self.fig = plt.Figure(figsize=(14, 10), facecolor=self.bg_color)
        self.canvas = FigureCanvasTkAgg(self.fig, viz_frame)
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)
        
        # 绑定鼠标事件用于交互
        self.canvas.mpl_connect('button_press_event', self.on_click)
        self.canvas.mpl_connect('motion_notify_event', self.on_mouse_move)
        
        self.current_view_mode = 'single'
        self.point_query_mode = False
    
    def create_status_bar(self):
        """创建状态栏"""
        status_frame = ttk.Frame(self.root)
        status_frame.pack(side=tk.BOTTOM, fill=tk.X, padx=10, pady=(0, 10))
        
        self.status_var = tk.StringVar()
        self.status_var.set("就绪 - COMSOL风格桥墩冲刷CFD分析")
        
        status_label = ttk.Label(status_frame, textvariable=self.status_var, relief=tk.SUNKEN)
        status_label.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # 添加结果信息
        if self.fem_data:
            results = self.fem_data.get('results', {})
            info_text = f"冲刷深度: {results.get('scour_depth', 0):.3f}m | " + \
                       f"最大速度: {results.get('max_velocity', 0):.3f}m/s | " + \
                       f"Shields: {results.get('shields_parameter', 0):.4f}"
            
            info_label = ttk.Label(status_frame, text=info_text, relief=tk.SUNKEN)
            info_label.pack(side=tk.RIGHT, padx=(10, 0))
    
    def get_current_colormap(self):
        """获取当前色彩映射"""
        colormap_name = self.colormap_var.get()
        if colormap_name == "COMSOL速度":
            return self.velocity_cmap
        elif colormap_name == "COMSOL压力":
            return self.pressure_cmap
        elif colormap_name == "COMSOL涡量":
            return self.vorticity_cmap
        elif colormap_name == "COMSOL剪切":
            return self.shear_cmap
        else:
            return self.velocity_cmap
    
    def get_current_data(self):
        """获取当前显示的数据"""
        display_name = self.display_var.get()
        if display_name == "速度大小":
            return self.speed, "速度 (m/s)"
        elif display_name == "压力":
            return self.pressure, "压力 (Pa)"
        elif display_name == "涡量":
            return self.vorticity, "涡量 (1/s)"
        elif display_name == "剪切应力":
            return self.shear_stress, "剪切应力 (Pa)"
        else:
            return self.speed, "速度 (m/s)"
    
    def update_visualization(self):
        """更新可视化显示"""
        self.fig.clear()
        
        if self.current_view_mode == 'single':
            self.create_single_view()
        elif self.current_view_mode == 'compare':
            self.create_compare_view()
        elif self.current_view_mode == 'multi':
            self.create_multi_view()
        
        self.fig.tight_layout()
        self.canvas.draw()
    
    def create_single_view(self):
        """创建单一视图"""
        ax = self.fig.add_subplot(111)
        self.plot_cfd_field(ax, enhanced=True)
        
        data, label = self.get_current_data()
        ax.set_title(f'桥墩冲刷CFD分析 - {label}', fontsize=14, fontweight='bold', pad=20)
    
    def create_compare_view(self):
        """创建对比视图"""
        ax1 = self.fig.add_subplot(1, 2, 1)
        ax2 = self.fig.add_subplot(1, 2, 2)
        
        # 左侧显示速度场
        self.plot_specific_field(ax1, self.speed, "速度 (m/s)", self.velocity_cmap)
        ax1.set_title('速度场', fontweight='bold')
        
        # 右侧显示压力场
        self.plot_specific_field(ax2, self.pressure, "压力 (Pa)", self.pressure_cmap)
        ax2.set_title('压力场', fontweight='bold')
    
    def create_multi_view(self):
        """创建多参数视图"""
        # 2x2 子图布局
        ax1 = self.fig.add_subplot(2, 2, 1)
        ax2 = self.fig.add_subplot(2, 2, 2) 
        ax3 = self.fig.add_subplot(2, 2, 3)
        ax4 = self.fig.add_subplot(2, 2, 4)
        
        # 速度场
        self.plot_specific_field(ax1, self.speed, "速度 (m/s)", self.velocity_cmap)
        ax1.set_title('速度场', fontweight='bold', fontsize=10)
        
        # 压力场
        self.plot_specific_field(ax2, self.pressure, "压力 (Pa)", self.pressure_cmap)
        ax2.set_title('压力场', fontweight='bold', fontsize=10)
        
        # 涡量场
        self.plot_specific_field(ax3, self.vorticity, "涡量 (1/s)", self.vorticity_cmap)
        ax3.set_title('涡量场', fontweight='bold', fontsize=10)
        
        # 剪切应力
        self.plot_specific_field(ax4, self.shear_stress, "剪切应力 (Pa)", self.shear_cmap)
        ax4.set_title('剪切应力场', fontweight='bold', fontsize=10)
    
    def plot_cfd_field(self, ax, enhanced=False):
        """绘制CFD场"""
        data, label = self.get_current_data()
        cmap = self.get_current_colormap()
        
        self.plot_specific_field(ax, data, label, cmap, enhanced)
    
    def plot_specific_field(self, ax, data, label, cmap, enhanced=False):
        """绘制特定的CFD场"""
        # 设置COMSOL风格背景
        ax.set_facecolor('#FAFAFA')
        
        # 主要等值面图
        levels = int(self.contour_levels_var.get())
        im = ax.contourf(self.X, self.Y, data, levels=levels, cmap=cmap, 
                        alpha=0.9, extend='both')
        
        # 添加等值线
        if self.show_contours_var.get():
            contours = ax.contour(self.X, self.Y, data, levels=levels//2, 
                                colors='white', linewidths=0.5, alpha=0.8)
            if enhanced:
                ax.clabel(contours, inline=True, fontsize=8, fmt='%.3f')
        
        # 添加速度矢量
        if self.display_var.get() == "速度矢量" or enhanced:
            step = int(self.vector_density_var.get())
            ax.quiver(self.X[::step, ::step], self.Y[::step, ::step], 
                     self.u[::step, ::step], self.v[::step, ::step],
                     self.speed[::step, ::step], cmap=cmap, alpha=0.7,
                     scale=5, width=0.003)
        
        # 添加流线
        if self.show_streamlines_var.get():
            ax.streamplot(self.X, self.Y, self.u, self.v, color='white', 
                         linewidth=1.2, density=1.5, alpha=0.8)
        
        # 显示桥墩
        if self.show_pier_var.get():
            pier = Circle((self.pier_x, self.pier_y), self.pier_radius, 
                         color='black', alpha=0.8, zorder=10)
            ax.add_patch(pier)
            
            # 添加桥墩标注
            ax.annotate('桥墩', xy=(self.pier_x, self.pier_y), 
                       xytext=(self.pier_x + 0.8, self.pier_y + 0.8),
                       fontsize=10, fontweight='bold', color='black',
                       arrowprops=dict(arrowstyle='->', color='black', lw=1))
        
        # 添加色彩条
        if self.show_colorbar_var.get():
            cbar = self.fig.colorbar(im, ax=ax, shrink=0.8, aspect=20)
            cbar.set_label(label, rotation=270, labelpad=20, fontweight='bold')
            cbar.ax.tick_params(labelsize=10)
        
        # COMSOL风格的轴设置
        ax.set_xlabel('X 坐标 (m)', fontweight='bold', fontsize=11)
        ax.set_ylabel('Y 坐标 (m)', fontweight='bold', fontsize=11)
        ax.grid(True, alpha=0.3, linestyle='--', linewidth=0.5)
        ax.set_aspect('equal')
        
        # 设置轴的样式
        ax.tick_params(labelsize=10)
        for spine in ax.spines.values():
            spine.set_linewidth(1.2)
            spine.set_color('#333333')
    
    def set_view_mode(self, mode):
        """设置视图模式"""
        self.current_view_mode = mode
        self.update_visualization()
        self.status_var.set(f"视图模式已切换到: {mode}")
    
    def on_click(self, event):
        """鼠标点击事件"""
        if self.point_query_mode and event.inaxes:
            x, y = event.xdata, event.ydata
            if x is not None and y is not None:
                self.show_point_values(x, y)
    
    def on_mouse_move(self, event):
        """鼠标移动事件"""
        if event.inaxes:
            x, y = event.xdata, event.ydata
            if x is not None and y is not None:
                self.status_var.set(f"坐标: X={x:.2f}, Y={y:.2f}")
    
    def show_point_values(self, x, y):
        """显示点的数值"""
        # 插值获取该点的值
        try:
            from scipy.interpolate import griddata
            
            points = np.column_stack([self.X.flatten(), self.Y.flatten()])
            
            speed_val = griddata(points, self.speed.flatten(), (x, y), method='linear')
            pressure_val = griddata(points, self.pressure.flatten(), (x, y), method='linear')
            
            info_text = f"点 ({x:.2f}, {y:.2f}):\n"
            info_text += f"速度: {speed_val:.3f} m/s\n"
            info_text += f"压力: {pressure_val:.1f} Pa"
            
            # 显示信息对话框
            import tkinter.messagebox as msgbox
            msgbox.showinfo("点值查询", info_text)
            
        except ImportError:
            self.status_var.set("需要scipy库进行插值计算")
    
    def enable_point_query(self):
        """启用点值查询模式"""
        self.point_query_mode = not self.point_query_mode
        mode_text = "开启" if self.point_query_mode else "关闭"
        self.status_var.set(f"点值查询模式已{mode_text}")
    
    def show_profile_analysis(self):
        """显示截面分析"""
        self.status_var.set("截面分析功能开发中...")
    
    def show_integration_tools(self):
        """显示积分计算工具"""
        self.status_var.set("积分计算功能开发中...")
    
    def export_image(self):
        """导出图像"""
        from tkinter import filedialog
        filename = filedialog.asksaveasfilename(
            defaultextension=".png",
            filetypes=[("PNG files", "*.png"), ("PDF files", "*.pdf"), ("All files", "*.*")]
        )
        if filename:
            self.fig.savefig(filename, dpi=300, bbox_inches='tight')
            self.status_var.set(f"图像已保存: {filename}")
    
    def export_data(self):
        """导出数据"""
        from tkinter import filedialog
        filename = filedialog.asksaveasfilename(
            defaultextension=".csv",
            filetypes=[("CSV files", "*.csv"), ("NPZ files", "*.npz"), ("All files", "*.*")]
        )
        if filename:
            if filename.endswith('.npz'):
                np.savez(filename, X=self.X, Y=self.Y, speed=self.speed, 
                        pressure=self.pressure, u=self.u, v=self.v)
            else:
                # CSV format
                data_array = np.column_stack([
                    self.X.flatten(), self.Y.flatten(), self.speed.flatten(),
                    self.pressure.flatten(), self.u.flatten(), self.v.flatten()
                ])
                np.savetxt(filename, data_array, delimiter=',', 
                          header='X,Y,Speed,Pressure,U,V')
            
            self.status_var.set(f"数据已导出: {filename}")
    
    def run(self):
        """运行应用程序"""
        self.root.mainloop()


if __name__ == '__main__':
    print("启动COMSOL风格桥墩冲刷CFD可视化系统...")
    app = COMSOLCFDViewer()
    app.run()