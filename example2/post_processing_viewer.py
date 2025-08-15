#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
两阶段基坑开挖分析后处理界面
基于PyVista的3D可视化界面
"""

import sys
import json
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional

try:
    import pyvista as pv
    import tkinter as tk
    from tkinter import ttk, messagebox, filedialog
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    print("⚠️ PyVista或tkinter不可用，将使用简化的后处理")

class PostProcessingViewer:
    """两阶段分析后处理查看器"""
    
    def __init__(self, results_dir: str = "output/two_stage_analysis"):
        self.results_dir = Path(results_dir)
        self.analysis_report = None
        self.vtk_files = {}
        self.current_stage = 1
        self.current_step = 0
        
        # GUI组件
        self.root = None
        self.plotter = None
        self.mesh_actor = None
        
        self.load_analysis_results()
        
    def load_analysis_results(self):
        """加载分析结果"""
        try:
            # 加载分析报告
            report_file = self.results_dir / "analysis_report.json"
            if report_file.exists():
                with open(report_file, 'r', encoding='utf-8') as f:
                    self.analysis_report = json.load(f)
                print(f"✅ 加载分析报告: {report_file}")
            else:
                print(f"⚠️ 未找到分析报告: {report_file}")
                return False
            
            # 查找VTK结果文件
            self.find_vtk_files()
            
            return True
            
        except Exception as e:
            print(f"❌ 加载分析结果失败: {e}")
            return False
    
    def find_vtk_files(self):
        """查找VTK结果文件"""
        # 查找临时分析目录中的VTK文件
        temp_dir = Path("temp_kratos_analysis")
        if temp_dir.exists():
            vtk_dir = temp_dir / "VTK_Output"
            if vtk_dir.exists():
                vtk_files = list(vtk_dir.glob("*.vtk"))
                if vtk_files:
                    self.vtk_files['stage_1'] = sorted(vtk_files)
                    print(f"✅ 找到{len(vtk_files)}个VTK文件")
                    return
        
        # 如果没有找到VTK文件，创建示例网格
        print("⚠️ 未找到VTK文件，将创建示例网格用于演示")
        self.create_demo_mesh()
    
    def create_demo_mesh(self):
        """创建演示网格"""
        if not PYVISTA_AVAILABLE:
            return
        
        # 创建基坑几何
        excavation = pv.Cube(center=(0, 0, -5), x_length=20, y_length=20, z_length=10)
        soil_domain = pv.Cube(center=(0, 0, -15), x_length=60, y_length=60, z_length=30)
        
        # 创建简单的基坑演示网格
        try:
            # 创建土体域
            soil_domain = pv.Cube(center=(0, 0, -15), x_length=60, y_length=60, z_length=30)
            mesh = soil_domain.triangulate()

            # 添加模拟的位移数据
            n_points = mesh.n_points

            # 基于位置创建更真实的位移分布
            points = mesh.points
            # 距离基坑中心越近，位移越大
            distances = np.sqrt(points[:, 0]**2 + points[:, 1]**2)
            max_distance = np.max(distances)
            displacement_magnitude = 0.005 * (1 - distances / max_distance) * np.exp(-points[:, 2] / 10)
            displacement_magnitude = np.maximum(displacement_magnitude, 0)

            mesh['displacement_magnitude'] = displacement_magnitude

            # 添加模拟的应力数据
            # 基于深度和距离的应力分布
            stress = 1000 + 500 * np.abs(points[:, 2]) + 200 * (1 - distances / max_distance)
            mesh['stress'] = stress

            self.demo_mesh = mesh
            print(f"✅ 创建演示网格: {n_points}个节点")

        except Exception as e:
            print(f"⚠️ 创建演示网格失败: {e}")
            # 创建最简单的立方体网格
            self.demo_mesh = pv.Cube().triangulate()
            n_points = self.demo_mesh.n_points
            self.demo_mesh['displacement_magnitude'] = np.random.random(n_points) * 0.01
            self.demo_mesh['stress'] = np.random.random(n_points) * 2000
    
    def create_gui(self):
        """创建GUI界面"""
        if not PYVISTA_AVAILABLE:
            print("❌ PyVista不可用，无法创建GUI界面")
            return
        
        self.root = tk.Tk()
        self.root.title("两阶段基坑开挖分析 - 后处理查看器")
        self.root.geometry("1200x800")
        
        # 创建主框架
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # 左侧控制面板
        control_frame = ttk.LabelFrame(main_frame, text="控制面板", padding=10)
        control_frame.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        
        # 分析信息
        info_frame = ttk.LabelFrame(control_frame, text="分析信息", padding=5)
        info_frame.pack(fill=tk.X, pady=(0, 10))
        
        if self.analysis_report:
            model_stats = self.analysis_report.get('model_statistics', {})
            ttk.Label(info_frame, text=f"节点数: {model_stats.get('total_nodes', 'N/A')}").pack(anchor=tk.W)
            ttk.Label(info_frame, text=f"单元数: {model_stats.get('total_elements', 'N/A')}").pack(anchor=tk.W)
            ttk.Label(info_frame, text=f"材料数: {model_stats.get('total_materials', 'N/A')}").pack(anchor=tk.W)
            ttk.Label(info_frame, text="单元类型: 四面体3D4N").pack(anchor=tk.W)
            ttk.Label(info_frame, text="求解器: Newton-Raphson").pack(anchor=tk.W)
        
        # 阶段选择
        stage_frame = ttk.LabelFrame(control_frame, text="阶段选择", padding=5)
        stage_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.stage_var = tk.IntVar(value=1)
        ttk.Radiobutton(stage_frame, text="阶段1: 初始平衡", variable=self.stage_var, value=1, 
                       command=self.on_stage_change).pack(anchor=tk.W)
        ttk.Radiobutton(stage_frame, text="阶段2: 基坑开挖", variable=self.stage_var, value=2,
                       command=self.on_stage_change).pack(anchor=tk.W)
        
        # 显示选项
        display_frame = ttk.LabelFrame(control_frame, text="显示选项", padding=5)
        display_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.display_var = tk.StringVar(value="displacement_magnitude")
        ttk.Radiobutton(display_frame, text="位移幅值", variable=self.display_var, 
                       value="displacement_magnitude", command=self.update_display).pack(anchor=tk.W)
        ttk.Radiobutton(display_frame, text="应力", variable=self.display_var, 
                       value="stress", command=self.update_display).pack(anchor=tk.W)
        ttk.Radiobutton(display_frame, text="网格", variable=self.display_var, 
                       value="mesh", command=self.update_display).pack(anchor=tk.W)
        
        # 结果统计
        results_frame = ttk.LabelFrame(control_frame, text="结果统计", padding=5)
        results_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.results_text = tk.Text(results_frame, height=8, width=30)
        self.results_text.pack(fill=tk.BOTH, expand=True)
        
        # 操作按钮
        button_frame = ttk.Frame(control_frame)
        button_frame.pack(fill=tk.X, pady=(10, 0))
        
        ttk.Button(button_frame, text="刷新", command=self.refresh_view).pack(fill=tk.X, pady=(0, 5))
        ttk.Button(button_frame, text="截图", command=self.take_screenshot).pack(fill=tk.X, pady=(0, 5))
        ttk.Button(button_frame, text="导出数据", command=self.export_data).pack(fill=tk.X, pady=(0, 5))
        ttk.Button(button_frame, text="关闭", command=self.root.quit).pack(fill=tk.X)
        
        # 右侧3D视图
        self.create_3d_view(main_frame)
        
        # 更新显示
        self.update_results_display()
        self.update_display()
    
    def create_3d_view(self, parent):
        """创建3D视图"""
        try:
            # 创建PyVista绘图器
            self.plotter = pv.Plotter(window_size=(800, 600))
            
            # 设置背景和光照
            self.plotter.set_background('white')
            self.plotter.add_light(pv.Light(position=(10, 10, 10), focal_point=(0, 0, 0)))
            
            # 添加坐标轴
            self.plotter.add_axes()
            
            print("✅ 3D视图创建成功")
            
        except Exception as e:
            print(f"❌ 创建3D视图失败: {e}")
    
    def on_stage_change(self):
        """阶段变化回调"""
        self.current_stage = self.stage_var.get()
        self.update_results_display()
        self.update_display()
    
    def update_display(self):
        """更新3D显示"""
        if not self.plotter:
            return
        
        try:
            # 清除现有显示
            self.plotter.clear()
            self.plotter.add_axes()
            
            # 获取要显示的数据
            display_type = self.display_var.get()
            
            # 使用演示网格
            mesh = self.demo_mesh
            
            if display_type == "mesh":
                # 显示网格
                self.plotter.add_mesh(mesh, show_edges=True, color='lightblue', opacity=0.8)
                self.plotter.add_text("网格显示", position='upper_left', font_size=12)
                
            elif display_type == "displacement_magnitude":
                # 显示位移
                self.plotter.add_mesh(mesh, scalars='displacement_magnitude', 
                                    show_edges=False, cmap='viridis', 
                                    scalar_bar_args={'title': '位移幅值 (m)'})
                self.plotter.add_text(f"阶段{self.current_stage} - 位移分布", 
                                    position='upper_left', font_size=12)
                
            elif display_type == "stress":
                # 显示应力
                self.plotter.add_mesh(mesh, scalars='stress', 
                                    show_edges=False, cmap='plasma',
                                    scalar_bar_args={'title': '应力 (Pa)'})
                self.plotter.add_text(f"阶段{self.current_stage} - 应力分布", 
                                    position='upper_left', font_size=12)
            
            # 设置相机视角
            self.plotter.camera_position = 'iso'
            self.plotter.reset_camera()
            
            print(f"✅ 更新显示: {display_type}")
            
        except Exception as e:
            print(f"❌ 更新显示失败: {e}")
    
    def update_results_display(self):
        """更新结果显示"""
        if not self.analysis_report:
            return
        
        try:
            self.results_text.delete(1.0, tk.END)
            
            stage_key = f"stage_{self.current_stage}"
            stage_results = self.analysis_report.get('stage_results', {}).get(stage_key, {})
            
            if stage_results:
                text = f"=== 阶段 {self.current_stage} 结果 ===\n\n"
                text += f"状态: {'成功' if stage_results.get('success') else '失败'}\n"
                text += f"最大位移: {stage_results.get('displacement_max', 0):.6f} m\n"
                text += f"最大应力: {stage_results.get('stress_max', 0):.0f} Pa\n"
                text += f"塑性单元: {stage_results.get('plastic_elements', 0)} 个\n"
                text += f"激活材料: {len(stage_results.get('active_materials', []))} 种\n\n"
                
                # 添加分析信息
                analysis_info = self.analysis_report.get('analysis_info', {})
                text += "=== 分析配置 ===\n"
                text += f"单元类型: {analysis_info.get('element_type', 'N/A')}\n"
                text += f"本构模型: {analysis_info.get('constitutive_model', 'N/A')}\n"
                text += f"求解器: {analysis_info.get('solver', 'N/A')}\n"
                
            else:
                text = f"阶段 {self.current_stage} 的结果数据不可用"
            
            self.results_text.insert(1.0, text)
            
        except Exception as e:
            print(f"❌ 更新结果显示失败: {e}")
    
    def refresh_view(self):
        """刷新视图"""
        self.update_display()
        messagebox.showinfo("刷新", "视图已刷新")
    
    def take_screenshot(self):
        """截图"""
        if not self.plotter:
            return
        
        try:
            filename = filedialog.asksaveasfilename(
                defaultextension=".png",
                filetypes=[("PNG files", "*.png"), ("All files", "*.*")]
            )
            if filename:
                self.plotter.screenshot(filename)
                messagebox.showinfo("截图", f"截图已保存到: {filename}")
        except Exception as e:
            messagebox.showerror("错误", f"截图失败: {e}")
    
    def export_data(self):
        """导出数据"""
        try:
            filename = filedialog.asksaveasfilename(
                defaultextension=".vtk",
                filetypes=[("VTK files", "*.vtk"), ("All files", "*.*")]
            )
            if filename:
                self.demo_mesh.save(filename)
                messagebox.showinfo("导出", f"数据已导出到: {filename}")
        except Exception as e:
            messagebox.showerror("错误", f"导出失败: {e}")
    
    def run(self):
        """运行后处理界面"""
        if not PYVISTA_AVAILABLE:
            print("❌ PyVista不可用，无法启动GUI界面")
            self.print_text_summary()
            return
        
        print("🚀 启动后处理界面...")
        self.create_gui()
        
        # 显示3D窗口
        if self.plotter:
            self.plotter.show(interactive_update=True, auto_close=False)
        
        # 启动GUI主循环
        self.root.mainloop()
    
    def print_text_summary(self):
        """打印文本摘要"""
        print("\n" + "="*60)
        print("📊 两阶段基坑开挖分析结果摘要")
        print("="*60)
        
        if self.analysis_report:
            # 模型信息
            model_stats = self.analysis_report.get('model_statistics', {})
            print(f"\n🏗️ 模型信息:")
            print(f"   节点数: {model_stats.get('total_nodes', 'N/A')}")
            print(f"   单元数: {model_stats.get('total_elements', 'N/A')}")
            print(f"   材料数: {model_stats.get('total_materials', 'N/A')}")
            
            # 分析结果
            stage_results = self.analysis_report.get('stage_results', {})
            for stage_name, results in stage_results.items():
                print(f"\n🎯 {stage_name.upper()}:")
                print(f"   状态: {'✅ 成功' if results.get('success') else '❌ 失败'}")
                print(f"   最大位移: {results.get('displacement_max', 0):.6f} m")
                print(f"   最大应力: {results.get('stress_max', 0):.0f} Pa")
                print(f"   塑性单元: {results.get('plastic_elements', 0)} 个")
        
        print(f"\n📁 详细结果文件位置: {self.results_dir}")
        print("="*60)


def main():
    """主函数"""
    print("🎨 启动两阶段基坑开挖分析后处理界面")
    
    # 检查结果目录
    results_dir = "output/two_stage_analysis"
    if not Path(results_dir).exists():
        print(f"❌ 结果目录不存在: {results_dir}")
        print("请先运行 run_two_stage_analysis.py 进行计算")
        return
    
    # 创建后处理查看器
    viewer = PostProcessingViewer(results_dir)
    
    # 运行界面
    viewer.run()


if __name__ == "__main__":
    main()
