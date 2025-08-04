#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PyVista可视化模块
为Example1提供3D可视化功能
"""

import os
import numpy as np
import tkinter as tk
from tkinter import ttk, messagebox
import threading

try:
    import pyvista as pv
    import vtk
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    print("PyVista not available. Please install: pip install pyvista")

class PyVistaVisualizer:
    """PyVista 3D可视化器"""
    
    def __init__(self, parent_frame):
        self.parent_frame = parent_frame
        self.plotter = None
        self.current_mesh = None
        self.vtk_files = []
        
        self.setup_ui()
        self.scan_vtk_files()
    
    def setup_ui(self):
        """设置UI界面"""
        
        # 主框架
        main_frame = ttk.Frame(self.parent_frame)
        main_frame.pack(fill='both', expand=True, padx=10, pady=10)
        
        # 控制面板
        control_frame = ttk.LabelFrame(main_frame, text="可视化控制")
        control_frame.pack(fill='x', pady=(0, 10))
        
        # 文件选择
        ttk.Label(control_frame, text="VTK文件:").grid(row=0, column=0, sticky='w', padx=5, pady=5)
        self.vtk_combo = ttk.Combobox(control_frame, width=30, state='readonly')
        self.vtk_combo.grid(row=0, column=1, padx=5, pady=5)
        self.vtk_combo.bind('<<ComboboxSelected>>', self.on_file_selected)
        
        # 刷新按钮
        ttk.Button(control_frame, text="刷新文件列表", 
                  command=self.scan_vtk_files).grid(row=0, column=2, padx=5, pady=5)
        
        # 显示选项
        ttk.Label(control_frame, text="显示模式:").grid(row=1, column=0, sticky='w', padx=5, pady=5)
        self.display_mode = tk.StringVar(value="surface")
        mode_frame = ttk.Frame(control_frame)
        mode_frame.grid(row=1, column=1, columnspan=2, sticky='w', padx=5, pady=5)
        
        ttk.Radiobutton(mode_frame, text="表面", variable=self.display_mode, 
                       value="surface").pack(side='left', padx=5)
        ttk.Radiobutton(mode_frame, text="线框", variable=self.display_mode, 
                       value="wireframe").pack(side='left', padx=5)
        ttk.Radiobutton(mode_frame, text="点云", variable=self.display_mode, 
                       value="points").pack(side='left', padx=5)
        
        # 位移缩放
        ttk.Label(control_frame, text="位移缩放:").grid(row=2, column=0, sticky='w', padx=5, pady=5)
        self.scale_var = tk.DoubleVar(value=1000.0)
        scale_frame = ttk.Frame(control_frame)
        scale_frame.grid(row=2, column=1, columnspan=2, sticky='w', padx=5, pady=5)
        
        ttk.Scale(scale_frame, from_=1.0, to=10000.0, orient='horizontal', 
                 variable=self.scale_var, length=200).pack(side='left')
        ttk.Label(scale_frame, textvariable=self.scale_var).pack(side='left', padx=5)
        
        # 操作按钮
        button_frame = ttk.Frame(control_frame)
        button_frame.grid(row=3, column=0, columnspan=3, pady=10)
        
        ttk.Button(button_frame, text="加载并显示", 
                  command=self.load_and_display).pack(side='left', padx=5)
        ttk.Button(button_frame, text="更新显示", 
                  command=self.update_display).pack(side='left', padx=5)
        ttk.Button(button_frame, text="重置视角", 
                  command=self.reset_camera).pack(side='left', padx=5)
        ttk.Button(button_frame, text="保存截图", 
                  command=self.save_screenshot).pack(side='left', padx=5)
        
        # 信息显示
        info_frame = ttk.LabelFrame(main_frame, text="网格信息")
        info_frame.pack(fill='x', pady=(0, 10))
        
        self.info_text = tk.Text(info_frame, height=6, wrap='word')
        info_scroll = ttk.Scrollbar(info_frame, orient='vertical', command=self.info_text.yview)
        self.info_text.configure(yscrollcommand=info_scroll.set)
        
        self.info_text.pack(side='left', fill='both', expand=True, padx=5, pady=5)
        info_scroll.pack(side='right', fill='y', pady=5)
        
        # PyVista状态检查
        if not PYVISTA_AVAILABLE:
            self.info_text.insert('end', "警告: PyVista未安装，请运行: pip install pyvista\\n")
            self.info_text.insert('end', "可视化功能将不可用。\\n")
    
    def scan_vtk_files(self):
        """扫描VTK文件"""
        
        vtk_dirs = [
            "H:/DeepCAD/output/vtk_web_ready",
            "H:/DeepCAD/output/vtk_output_fixed",
            "H:/DeepCAD/output/vtk_output"
        ]
        
        self.vtk_files = []
        
        for vtk_dir in vtk_dirs:
            if os.path.exists(vtk_dir):
                for filename in os.listdir(vtk_dir):
                    if filename.endswith('.vtk'):
                        full_path = os.path.join(vtk_dir, filename)
                        display_name = f"{os.path.basename(vtk_dir)}/{filename}"
                        self.vtk_files.append((display_name, full_path))
        
        # 更新下拉框
        file_names = [item[0] for item in self.vtk_files]
        self.vtk_combo['values'] = file_names
        
        if file_names:
            self.vtk_combo.set(file_names[0])
            self.info_text.delete('1.0', 'end')
            self.info_text.insert('end', f"找到 {len(file_names)} 个VTK文件\\n")
        else:
            self.info_text.delete('1.0', 'end')
            self.info_text.insert('end', "未找到VTK文件\\n")
    
    def on_file_selected(self, event=None):
        """文件选择事件"""
        selected = self.vtk_combo.get()
        if selected:
            self.info_text.delete('1.0', 'end')
            self.info_text.insert('end', f"选择文件: {selected}\\n")
    
    def load_and_display(self):
        """加载并显示VTK文件"""
        
        if not PYVISTA_AVAILABLE:
            messagebox.showerror("错误", "PyVista未安装，无法进行3D可视化")
            return
        
        selected = self.vtk_combo.get()
        if not selected:
            messagebox.showwarning("警告", "请先选择VTK文件")
            return
        
        # 找到对应的文件路径
        file_path = None
        for display_name, full_path in self.vtk_files:
            if display_name == selected:
                file_path = full_path
                break
        
        if not file_path or not os.path.exists(file_path):
            messagebox.showerror("错误", f"文件不存在: {file_path}")
            return
        
        try:
            # 在新线程中启动PyVista显示
            threading.Thread(target=self._display_vtk, args=(file_path,), daemon=True).start()
            
        except Exception as e:
            messagebox.showerror("错误", f"加载VTK文件失败: {str(e)}")
    
    def _display_vtk(self, file_path):
        """在独立线程中显示VTK文件"""
        
        try:
            # 读取VTK文件
            mesh = pv.read(file_path)
            self.current_mesh = mesh
            
            # 更新信息显示
            self.parent_frame.after(0, self._update_mesh_info, mesh)
            
            # 创建PyVista绘图器
            if self.plotter is None:
                pv.set_plot_theme("document")
                self.plotter = pv.Plotter(window_size=[1000, 800])
                self.plotter.set_background('white')
            else:
                self.plotter.clear()
            
            # 应用位移
            if 'displacement' in mesh.array_names:
                displacement = mesh['displacement']
                scale_factor = self.scale_var.get()
                
                # 创建变形后的网格
                deformed_points = mesh.points + displacement * scale_factor
                deformed_mesh = mesh.copy()
                deformed_mesh.points = deformed_points
                
                # 添加到绘图器
                self.plotter.add_mesh(deformed_mesh, 
                                    scalars='displacement',
                                    scalar_bar_args={'title': 'Displacement (m)'},
                                    show_edges=True,
                                    cmap='jet')
                
                # 添加原始网格轮廓
                self.plotter.add_mesh(mesh, style='wireframe', 
                                    color='gray', opacity=0.3, line_width=1)
                
            else:
                # 没有位移数据，直接显示网格
                self.plotter.add_mesh(mesh, show_edges=True, color='lightblue')
            
            # 设置视角和标签
            self.plotter.add_axes()
            self.plotter.show_grid()
            self.plotter.camera_position = 'isometric'
            
            # 添加标题
            filename = os.path.basename(file_path)
            self.plotter.add_title(f"MSH Example1 - {filename}", font_size=16)
            
            # 显示
            self.plotter.show()
            
        except Exception as e:
            self.parent_frame.after(0, lambda: messagebox.showerror("错误", f"显示VTK文件失败: {str(e)}"))
    
    def _update_mesh_info(self, mesh):
        """更新网格信息显示"""
        
        self.info_text.delete('1.0', 'end')
        
        info = []
        info.append(f"网格信息:")
        info.append(f"  点数量: {mesh.number_of_points}")
        info.append(f"  单元数量: {mesh.number_of_cells}")
        info.append(f"  数据数组: {list(mesh.array_names)}")
        
        if 'displacement' in mesh.array_names:
            disp = mesh['displacement']
            info.append(f"  位移范围: {np.min(disp):.6f} ~ {np.max(disp):.6f} m")
            info.append(f"  最大位移: {np.max(np.linalg.norm(disp, axis=1)):.6f} m")
        
        info.append(f"  边界框: {mesh.bounds}")
        
        self.info_text.insert('end', "\\n".join(info))
    
    def update_display(self):
        """更新显示"""
        if self.current_mesh is not None and self.plotter is not None:
            threading.Thread(target=self._update_display_thread, daemon=True).start()
    
    def _update_display_thread(self):
        """更新显示线程"""
        try:
            self.plotter.clear()
            
            mesh = self.current_mesh
            display_mode = self.display_mode.get()
            
            # 应用位移
            if 'displacement' in mesh.array_names:
                displacement = mesh['displacement']
                scale_factor = self.scale_var.get()
                
                deformed_points = mesh.points + displacement * scale_factor
                deformed_mesh = mesh.copy()
                deformed_mesh.points = deformed_points
                
                # 根据显示模式设置样式
                if display_mode == "wireframe":
                    style = 'wireframe'
                    show_edges = False
                elif display_mode == "points":
                    style = 'points'
                    show_edges = False
                else:
                    style = 'surface'
                    show_edges = True
                
                self.plotter.add_mesh(deformed_mesh, 
                                    scalars='displacement',
                                    scalar_bar_args={'title': 'Displacement (m)'},
                                    show_edges=show_edges,
                                    style=style,
                                    cmap='jet')
                
                if display_mode == "surface":
                    self.plotter.add_mesh(mesh, style='wireframe', 
                                        color='gray', opacity=0.3, line_width=1)
            
            self.plotter.render()
            
        except Exception as e:
            self.parent_frame.after(0, lambda: messagebox.showerror("错误", f"更新显示失败: {str(e)}"))
    
    def reset_camera(self):
        """重置相机视角"""
        if self.plotter is not None:
            try:
                self.plotter.camera_position = 'isometric'
                self.plotter.render()
            except:
                pass
    
    def save_screenshot(self):
        """保存截图"""
        if self.plotter is not None:
            try:
                output_dir = "H:/DeepCAD/output"
                os.makedirs(output_dir, exist_ok=True)
                
                screenshot_path = os.path.join(output_dir, "pyvista_screenshot.png")
                self.plotter.screenshot(screenshot_path)
                
                messagebox.showinfo("成功", f"截图已保存到: {screenshot_path}")
                
            except Exception as e:
                messagebox.showerror("错误", f"保存截图失败: {str(e)}")

def create_pyvista_tab(notebook):
    """为主界面创建PyVista标签页"""
    
    pyvista_frame = ttk.Frame(notebook)
    notebook.add(pyvista_frame, text="3D可视化")
    
    # 创建可视化器
    visualizer = PyVistaVisualizer(pyvista_frame)
    
    return pyvista_frame, visualizer