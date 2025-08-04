"""
example1 桌面测试界面
MSH数据处理的完整工作流演示界面
包含文件加载、参数设置、Kratos计算、PyVista可视化
"""
import os
import sys
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import threading
import json
from datetime import datetime
from typing import Dict, List, Any

# 导入我们的MSH处理模块
from msh_geometry_generator import MSHGeometryGenerator
from msh_materials_manager import MSHMaterialsManager
from msh_kratos_solver import MSHKratosSolver

# 导入PyVista可视化模块
try:
    from pyvista_visualizer import PyVistaVisualizer, create_pyvista_tab
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    print("PyVista可视化模块未找到，将跳过可视化功能")

class Example1DesktopInterface:
    """example1桌面测试界面"""
    
    def __init__(self):
        """初始化界面"""
        self.root = tk.Tk()
        self.root.title("Example1 - MSH数据处理测试界面")
        self.root.geometry("1000x700")
        self.root.resizable(True, True)
        
        # 界面组件
        self.notebook = None
        self.log_text = None
        self.progress_var = None
        self.progress_bar = None
        
        # 数据存储
        self.work_dir = "H:/DeepCAD/data"
        self.output_dir = "H:/DeepCAD/output"
        self.msh_files = {}
        self.analysis_results = {}
        self.current_analysis_thread = None
        
        # 模块实例
        self.geometry_generator = MSHGeometryGenerator(self.work_dir)
        self.materials_manager = MSHMaterialsManager(self.work_dir)
        self.kratos_solver = MSHKratosSolver(self.work_dir, self.output_dir)
        
        self.setup_ui()
        self.log_message("=== Example1深基坑分析系统启动 ===")
        self.log_message("欢迎使用MSH数据处理完整工作流")
        self.log_message("提示：点击'一键准备分析'开始使用")
        self.log_message("详细说明请查看各选项卡内容")
        
    def setup_ui(self):
        """设置用户界面"""
        # 创建主框架
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # 配置权重
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        main_frame.rowconfigure(1, weight=1)
        
        # 标题
        title_label = ttk.Label(main_frame, text="Example1 - MSH数据处理与Kratos分析", 
                               font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, pady=(0, 10))
        
        # 创建选项卡
        self.notebook = ttk.Notebook(main_frame)
        self.notebook.grid(row=1, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # 各个选项卡
        self.create_file_management_tab()
        self.create_materials_tab()
        self.create_analysis_tab()
        self.create_results_tab()
        
        # 添加3D可视化标签页
        self.create_visualization_tab()
        
        self.create_log_tab()
        
        # 底部状态栏
        self.create_status_bar(main_frame)
        
    def create_file_management_tab(self):
        """创建文件管理选项卡"""
        tab_frame = ttk.Frame(self.notebook)
        self.notebook.add(tab_frame, text="文件管理")
        
        # 一键启动部分
        quick_frame = ttk.LabelFrame(tab_frame, text="一键启动", padding="10")
        quick_frame.pack(fill="x", padx=5, pady=5)
        
        ttk.Label(quick_frame, text="点击按钮自动完成所有准备工作：", font=('Arial', 10, 'bold')).pack(anchor="w")
        ttk.Label(quick_frame, text="生成MSH文件 -> 配置材料参数 -> 准备分析", font=('Arial', 9)).pack(anchor="w", padx=20)
        
        quick_button_frame = ttk.Frame(quick_frame)
        quick_button_frame.pack(fill="x", pady=10)
        
        self.quick_start_btn = ttk.Button(quick_button_frame, text="一键准备分析", 
                  command=self.quick_start_analysis, 
                  style="Accent.TButton")
        self.quick_start_btn.pack(side="left")
        
        ttk.Button(quick_button_frame, text="打开工作目录", 
                  command=self.open_work_directory).pack(side="left", padx=(10, 0))

        # MSH文件生成部分（高级选项）
        gen_frame = ttk.LabelFrame(tab_frame, text="高级选项 - 单独生成", padding="10")
        gen_frame.pack(fill="x", padx=5, pady=5)
        
        ttk.Label(gen_frame, text="手动生成individual文件（通常不需要）：").pack(anchor="w")
        ttk.Label(gen_frame, text="• 土体域: 100×100×50m, 7层土体", font=('Arial', 9)).pack(anchor="w", padx=20)
        ttk.Label(gen_frame, text="• 基坑: 25×25×12m, 垂直开挖", font=('Arial', 9)).pack(anchor="w", padx=20)
        ttk.Label(gen_frame, text="• 隧道: 50×5×3.5m, 横穿土体", font=('Arial', 9)).pack(anchor="w", padx=20)
        
        gen_button_frame = ttk.Frame(gen_frame)
        gen_button_frame.pack(fill="x", pady=10)
        
        ttk.Button(gen_button_frame, text="仅生成MSH文件", 
                  command=self.generate_msh_files).pack(side="left")
        ttk.Button(gen_button_frame, text="仅生成材料配置", 
                  command=self.generate_materials).pack(side="left", padx=(10, 0))
        
        # MSH文件加载部分
        load_frame = ttk.LabelFrame(tab_frame, text="MSH文件加载", padding="10")
        load_frame.pack(fill="both", expand=True, padx=5, pady=5)
        
        # 文件路径显示
        self.file_vars = {
            'soil_domain': tk.StringVar(value="未选择"),
            'excavation_pit': tk.StringVar(value="未选择"),
            'tunnel': tk.StringVar(value="未选择")
        }
        
        file_labels = {
            'soil_domain': "土体域文件:",
            'excavation_pit': "基坑文件:",
            'tunnel': "隧道文件:"
        }
        
        for i, (key, label) in enumerate(file_labels.items()):
            frame = ttk.Frame(load_frame)
            frame.pack(fill="x", pady=2)
            
            ttk.Label(frame, text=label, width=15).pack(side="left")
            ttk.Entry(frame, textvariable=self.file_vars[key], width=50).pack(side="left", padx=(5, 5))
            ttk.Button(frame, text="浏览", 
                      command=lambda k=key: self.browse_msh_file(k)).pack(side="left")
        
        ttk.Button(load_frame, text="加载所有MSH文件", 
                  command=self.load_msh_files).pack(pady=10)
        
    def create_materials_tab(self):
        """创建材料参数选项卡"""
        tab_frame = ttk.Frame(self.notebook)
        self.notebook.add(tab_frame, text="材料参数")
        
        # 材料参数生成
        mat_frame = ttk.LabelFrame(tab_frame, text="摩尔-库伦材料参数", padding="10")
        mat_frame.pack(fill="x", padx=5, pady=5)
        
        ttk.Label(mat_frame, text="自动生成高强度分层土体参数 (类似软岩):").pack(anchor="w")
        
        param_frame = ttk.Frame(mat_frame)
        param_frame.pack(fill="x", pady=10)
        
        # 参数范围显示
        ranges_text = """
        参数范围:
        • 密度: 2000-2500 kg/m³
        • 弹性模量: 50-2000 MPa  
        • 泊松比: 0.28-0.12
        • 粘聚力: 80-1000 kPa
        • 内摩擦角: 35-55°
        • 剪胀角: 5-25°
        """
        ttk.Label(param_frame, text=ranges_text, font=('Courier', 9)).pack(anchor="w")
        
        ttk.Button(mat_frame, text="生成材料配置文件", 
                  command=self.generate_materials).pack(pady=10)
        
        # 材料参数显示
        display_frame = ttk.LabelFrame(tab_frame, text="材料参数预览", padding="10")
        display_frame.pack(fill="both", expand=True, padx=5, pady=5)
        
        self.materials_text = scrolledtext.ScrolledText(display_frame, height=15, width=80)
        self.materials_text.pack(fill="both", expand=True)
        
    def create_analysis_tab(self):
        """创建分析控制选项卡"""
        tab_frame = ttk.Frame(self.notebook)
        self.notebook.add(tab_frame, text="分析控制")
        
        # 分析设置
        setting_frame = ttk.LabelFrame(tab_frame, text="分析设置", padding="10")
        setting_frame.pack(fill="x", padx=5, pady=5)
        
        ttk.Label(setting_frame, text="分析步骤:").pack(anchor="w")
        steps_text = """
        Step 1: 地应力平衡 - 建立初始应力状态
        Step 2: 隧道开挖 - 模拟隧道施工影响  
        Step 3: 基坑开挖阶段1 - 上半部开挖
        Step 4: 基坑开挖阶段2 - 最终开挖完成
        """
        ttk.Label(setting_frame, text=steps_text, font=('Courier', 9)).pack(anchor="w", padx=20)
        
        # 计算控制
        control_frame = ttk.Frame(setting_frame)
        control_frame.pack(fill="x", pady=10)
        
        self.analysis_btn = ttk.Button(control_frame, text="开始完整分析", 
                  command=self.start_analysis, 
                  style="Accent.TButton")
        self.analysis_btn.pack(side="left")
        
        ttk.Button(control_frame, text="停止分析", 
                  command=self.stop_analysis).pack(side="left", padx=(10, 0))
        
        ttk.Button(control_frame, text="查看结果", 
                  command=self.view_results).pack(side="left", padx=(10, 0))
        
        # 进度显示
        progress_frame = ttk.LabelFrame(tab_frame, text="计算进度", padding="10")
        progress_frame.pack(fill="x", padx=5, pady=5)
        
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(progress_frame, variable=self.progress_var, 
                                          maximum=100, length=400)
        self.progress_bar.pack(pady=5)
        
        self.status_var = tk.StringVar(value="就绪")
        ttk.Label(progress_frame, textvariable=self.status_var).pack()
        
        # 监测点设置
        monitor_frame = ttk.LabelFrame(tab_frame, text="关键监测点", padding="10")
        monitor_frame.pack(fill="both", expand=True, padx=5, pady=5)
        
        monitor_text = """
        监测点位置:
        • 隧道顶部 (0, 0, 31.75m)
        • 隧道腰部 (2.5, 0, 30m) 
        • 基坑角点 (12.5, 12.5, 38m)
        • 基坑底部中心 (0, 0, 38m)
        • 地表沉降点 (0, 0, 50m)
        """
        ttk.Label(monitor_frame, text=monitor_text, font=('Courier', 9)).pack(anchor="w")
        
    def create_results_tab(self):
        """创建结果显示选项卡"""
        tab_frame = ttk.Frame(self.notebook)
        self.notebook.add(tab_frame, text="结果显示")
        
        # 结果汇总
        summary_frame = ttk.LabelFrame(tab_frame, text="分析结果汇总", padding="10")
        summary_frame.pack(fill="x", padx=5, pady=5)
        
        self.results_summary_text = scrolledtext.ScrolledText(summary_frame, height=8, width=80)
        self.results_summary_text.pack(fill="x")
        
        # VTK文件和可视化
        vtk_frame = ttk.LabelFrame(tab_frame, text="VTK结果文件", padding="10")
        vtk_frame.pack(fill="both", expand=True, padx=5, pady=5)
        
        # VTK文件列表
        list_frame = ttk.Frame(vtk_frame)
        list_frame.pack(fill="both", expand=True)
        
        self.vtk_listbox = tk.Listbox(list_frame, height=6)
        self.vtk_listbox.pack(side="left", fill="both", expand=True)
        
        scrollbar = ttk.Scrollbar(list_frame, orient="vertical")
        scrollbar.pack(side="right", fill="y")
        self.vtk_listbox.config(yscrollcommand=scrollbar.set)
        scrollbar.config(command=self.vtk_listbox.yview)
        
        # 可视化按钮
        vis_button_frame = ttk.Frame(vtk_frame)
        vis_button_frame.pack(fill="x", pady=10)
        
        ttk.Button(vis_button_frame, text="打开结果目录", 
                  command=self.open_results_directory).pack(side="left")
        
        if PYVISTA_AVAILABLE:
            ttk.Button(vis_button_frame, text="PyVista可视化", 
                      command=self.visualize_with_pyvista).pack(side="left", padx=(10, 0))
        else:
            ttk.Label(vis_button_frame, text="(PyVista未安装)", 
                     foreground="gray").pack(side="left", padx=(10, 0))
        
    def create_visualization_tab(self):
        """创建3D可视化选项卡"""
        tab_frame = ttk.Frame(self.notebook)
        self.notebook.add(tab_frame, text="3D可视化")
        
        # 检查PyVista是否可用
        try:
            import pyvista as pv
            import vtk
            # PyVista可用，创建完整的可视化器
            from pyvista_visualizer import PyVistaVisualizer
            self.pyvista_visualizer = PyVistaVisualizer(tab_frame)
            self.log_message("PyVista 3D可视化功能已加载")
            
        except ImportError:
            # PyVista不可用，创建简化界面
            self.create_simple_vtk_viewer(tab_frame)
            self.log_message("PyVista未安装，使用简化VTK查看器")
            
        except Exception as e:
            # 其他错误
            self.create_error_display(tab_frame, str(e))
            self.log_message(f"3D可视化模块加载失败: {e}")
    
    def create_simple_vtk_viewer(self, parent_frame):
        """创建简化的VTK文件查看器"""
        
        # 主框架
        main_frame = ttk.Frame(parent_frame)
        main_frame.pack(fill='both', expand=True, padx=10, pady=10)
        
        # 安装提示
        install_frame = ttk.LabelFrame(main_frame, text="PyVista 3D可视化", padding="10")
        install_frame.pack(fill='x', pady=(0, 10))
        
        install_text = """
PyVista未安装，无法提供完整的3D可视化功能。

安装方法：
1. 打开命令行窗口 (cmd)
2. 运行: pip install pyvista
3. 重启Example1界面

PyVista可以提供：
• 交互式3D网格显示
• 位移场可视化
• 多种显示模式
• 截图保存功能
        """
        
        ttk.Label(install_frame, text=install_text, font=('Arial', 9), 
                 justify='left').pack(anchor="w")
        
        # 安装按钮
        button_frame = ttk.Frame(install_frame)
        button_frame.pack(fill='x', pady=10)
        
        ttk.Button(button_frame, text="打开命令行安装PyVista", 
                  command=self.open_cmd_for_pyvista).pack(side='left')
        ttk.Button(button_frame, text="重新检测PyVista", 
                  command=self.reload_visualization).pack(side='left', padx=(10, 0))
        
        # VTK文件信息
        vtk_frame = ttk.LabelFrame(main_frame, text="VTK结果文件信息", padding="10")
        vtk_frame.pack(fill='both', expand=True, pady=(0, 10))
        
        # 文件列表
        self.simple_vtk_listbox = tk.Listbox(vtk_frame, height=8)
        self.simple_vtk_listbox.pack(fill='both', expand=True, pady=(0, 10))
        
        # 刷新按钮
        ttk.Button(vtk_frame, text="刷新VTK文件列表", 
                  command=self.refresh_simple_vtk_list).pack()
        
        # 初始化文件列表
        self.refresh_simple_vtk_list()
        
        # 文件详情
        detail_frame = ttk.LabelFrame(main_frame, text="文件详情", padding="10")
        detail_frame.pack(fill='x')
        
        self.vtk_detail_text = tk.Text(detail_frame, height=6, width=60)
        self.vtk_detail_text.pack(fill='x')
        
        self.simple_vtk_listbox.bind('<<ListboxSelect>>', self.show_vtk_details)
    
    def create_error_display(self, parent_frame, error_msg):
        """创建错误显示界面"""
        
        error_frame = ttk.LabelFrame(parent_frame, text="3D可视化错误", padding="10")
        error_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        error_text = f"""
3D可视化模块加载失败：

错误信息: {error_msg}

可能的解决方案：
1. 安装PyVista: pip install pyvista
2. 安装VTK: pip install vtk  
3. 检查Python环境配置
4. 重启Example1界面

注意：3D可视化功能需要图形界面支持
        """
        
        ttk.Label(error_frame, text=error_text, font=('Courier', 9), 
                 justify='left').pack(anchor="w")
    
    def open_cmd_for_pyvista(self):
        """打开命令行用于安装PyVista"""
        import subprocess
        try:
            # 在新的cmd窗口中显示安装命令
            cmd = 'start cmd /k "echo 请运行以下命令安装PyVista: && echo pip install pyvista && echo. && echo 安装完成后按任意键关闭窗口... && pause"'
            subprocess.run(cmd, shell=True)
        except:
            messagebox.showinfo("安装提示", "请打开命令行运行: pip install pyvista")
    
    def reload_visualization(self):
        """重新加载可视化模块"""
        try:
            # 尝试重新导入
            import importlib
            import sys
            
            # 清除已导入的模块
            modules_to_reload = ['pyvista', 'vtk', 'pyvista_visualizer']
            for module in modules_to_reload:
                if module in sys.modules:
                    importlib.reload(sys.modules[module])
            
            messagebox.showinfo("成功", "请重启Example1界面以应用更改")
            
        except Exception as e:
            messagebox.showerror("错误", f"重新加载失败: {e}")
    
    def refresh_simple_vtk_list(self):
        """刷新简化VTK文件列表"""
        
        self.simple_vtk_listbox.delete(0, tk.END)
        
        vtk_dirs = [
            "H:/DeepCAD/output/vtk_output",
            "H:/DeepCAD/output/vtk_web_ready", 
            "H:/DeepCAD/output/vtk_output_fixed"
        ]
        
        vtk_files = []
        
        for vtk_dir in vtk_dirs:
            if os.path.exists(vtk_dir):
                for filename in os.listdir(vtk_dir):
                    if filename.endswith('.vtk'):
                        full_path = os.path.join(vtk_dir, filename)
                        dir_name = os.path.basename(vtk_dir)
                        display_name = f"{dir_name}/{filename}"
                        vtk_files.append((display_name, full_path))
                        self.simple_vtk_listbox.insert(tk.END, display_name)
        
        if not vtk_files:
            self.simple_vtk_listbox.insert(tk.END, "未找到VTK文件")
        
        self.simple_vtk_files = vtk_files
    
    def show_vtk_details(self, event):
        """显示VTK文件详情"""
        
        selection = self.simple_vtk_listbox.curselection()
        if not selection:
            return
        
        index = selection[0]
        if index >= len(getattr(self, 'simple_vtk_files', [])):
            return
        
        display_name, file_path = self.simple_vtk_files[index]
        
        try:
            # 读取文件基本信息
            file_size = os.path.getsize(file_path)
            file_time = os.path.getmtime(file_path)
            
            with open(file_path, 'r') as f:
                first_lines = [f.readline().strip() for _ in range(10)]
            
            details = f"""
文件: {display_name}
路径: {file_path}
大小: {file_size} 字节
修改时间: {datetime.fromtimestamp(file_time).strftime('%Y-%m-%d %H:%M:%S')}

文件头部内容:
{chr(10).join(first_lines)}

提示: 安装PyVista后可以进行3D可视化
            """
            
            self.vtk_detail_text.delete(1.0, tk.END)
            self.vtk_detail_text.insert(1.0, details)
            
        except Exception as e:
            self.vtk_detail_text.delete(1.0, tk.END)
            self.vtk_detail_text.insert(1.0, f"读取文件信息失败: {e}")

    def create_log_tab(self):
        """创建日志选项卡"""
        tab_frame = ttk.Frame(self.notebook)
        self.notebook.add(tab_frame, text="运行日志")
        
        log_frame = ttk.Frame(tab_frame)
        log_frame.pack(fill="both", expand=True, padx=5, pady=5)
        
        self.log_text = scrolledtext.ScrolledText(log_frame, height=25, width=100)
        self.log_text.pack(fill="both", expand=True)
        
        # 日志控制按钮
        log_button_frame = ttk.Frame(tab_frame)
        log_button_frame.pack(fill="x", padx=5, pady=5)
        
        ttk.Button(log_button_frame, text="清空日志", 
                  command=self.clear_log).pack(side="left")
        ttk.Button(log_button_frame, text="保存日志", 
                  command=self.save_log).pack(side="left", padx=(10, 0))
        
    def create_status_bar(self, parent):
        """创建状态栏"""
        status_frame = ttk.Frame(parent)
        status_frame.grid(row=2, column=0, sticky=(tk.W, tk.E), pady=(10, 0))
        
        self.status_label = ttk.Label(status_frame, text="就绪")
        self.status_label.pack(side="left")
        
        # 版本信息
        version_label = ttk.Label(status_frame, text="Example1 v1.0 - MSH数据处理测试界面")
        version_label.pack(side="right")
        
    def log_message(self, message: str):
        """添加日志消息"""
        if self.log_text:
            timestamp = datetime.now().strftime("%H:%M:%S")
            log_entry = f"[{timestamp}] {message}\\n"
            self.log_text.insert(tk.END, log_entry)
            self.log_text.see(tk.END)
        print(message)  # 同时打印到控制台
        
    def generate_msh_files(self):
        """生成MSH文件"""
        self.log_message("开始生成MSH文件...")
        self.status_var.set("正在生成MSH文件...")
        
        try:
            # 在后台线程中生成文件
            def generate_thread():
                files = self.geometry_generator.generate_all_meshes()
                
                # 更新文件路径显示
                self.root.after(0, lambda: self._update_msh_file_paths(files))
                
                self.msh_files = files
                self.log_message("MSH文件生成完成")
                self.root.after(0, lambda: self.status_var.set("MSH文件生成完成"))
                
                # 自动生成材料配置
                self.root.after(1000, self.auto_generate_materials)
            
            thread = threading.Thread(target=generate_thread)
            thread.daemon = True
            thread.start()
            
        except Exception as e:
            self.log_message(f"生成MSH文件时出错: {e}")
            messagebox.showerror("错误", f"生成MSH文件失败:\\n{e}")
    
    def _update_msh_file_paths(self, files):
        """更新MSH文件路径显示"""
        for name, path in files.items():
            if name in self.file_vars:
                self.file_vars[name].set(path)
    
    def auto_generate_materials(self):
        """自动生成材料配置"""
        self.log_message("自动生成材料配置...")
        self.status_var.set("正在生成材料配置...")
        
        try:
            files = self.materials_manager.generate_all_material_files()
            
            # 显示材料参数
            with open(files['materials_summary'], 'r', encoding='utf-8') as f:
                summary_content = f.read()
                
            self.materials_text.delete(1.0, tk.END)
            self.materials_text.insert(1.0, summary_content)
            
            self.log_message("材料配置自动生成完成")
            self.status_var.set("准备就绪 - 可以开始分析")
            
            # 切换到分析控制选项卡
            self.notebook.select(2)  # 分析控制是第3个选项卡
            
        except Exception as e:
            self.log_message(f"自动生成材料配置出错: {e}")
            self.status_var.set("材料配置生成失败")
    
    def quick_start_analysis(self):
        """一键准备分析"""
        self.log_message("开始一键准备分析...")
        self.status_var.set("正在一键准备...")
        
        # 禁用按钮防止重复点击
        self.quick_start_btn.config(state='disabled')
        
        try:
            def quick_start_thread():
                # 步骤1: 生成MSH文件
                self.root.after(0, lambda: self.log_message("步骤1: 生成MSH网格文件..."))
                files = self.geometry_generator.generate_all_meshes()
                
                # 更新界面
                self.root.after(0, lambda: self._update_msh_file_paths(files))
                self.msh_files = files
                self.root.after(0, lambda: self.log_message("MSH文件生成完成"))
                
                # 步骤2: 生成材料配置
                self.root.after(0, lambda: self.log_message("步骤2: 配置材料参数..."))
                material_files = self.materials_manager.generate_all_material_files()
                
                # 显示材料参数
                with open(material_files['materials_summary'], 'r', encoding='utf-8') as f:
                    summary_content = f.read()
                
                self.root.after(0, lambda: self._update_materials_display(summary_content))
                self.root.after(0, lambda: self.log_message("材料配置完成"))
                
                # 步骤3: 准备就绪
                self.root.after(0, lambda: self.log_message("准备完成！可以开始分析"))
                self.root.after(0, lambda: self.status_var.set("准备就绪 - 点击'开始完整分析'"))
                
                # 自动切换到分析控制选项卡
                self.root.after(500, lambda: self.notebook.select(2))
                
                # 重新启用按钮
                self.root.after(0, lambda: self.quick_start_btn.config(state='normal', text="已准备完成"))
                
                # 显示成功消息
                self.root.after(1000, lambda: messagebox.showinfo("成功", 
                    "一键准备完成！\\n\\n已生成：\\n• 3个MSH网格文件\\n• 材料配置文件\\n• 分析参数设置\\n\\n现在可以开始Kratos分析"))
            
            thread = threading.Thread(target=quick_start_thread)
            thread.daemon = True
            thread.start()
            
        except Exception as e:
            self.log_message(f"一键准备失败: {e}")
            self.status_var.set("一键准备失败")
            self.quick_start_btn.config(state='normal')
            messagebox.showerror("错误", f"一键准备失败:\\n{e}")
    
    def _update_materials_display(self, content):
        """更新材料参数显示"""
        self.materials_text.delete(1.0, tk.END)
        self.materials_text.insert(1.0, content)
            
    def browse_msh_file(self, file_type: str):
        """浏览MSH文件"""
        filename = filedialog.askopenfilename(
            title=f"选择{file_type}文件",
            filetypes=[("MSH文件", "*.msh"), ("所有文件", "*.*")],
            initialdir=self.work_dir
        )
        
        if filename:
            self.file_vars[file_type].set(filename)
            self.log_message(f"选择了{file_type}文件: {filename}")
            
    def load_msh_files(self):
        """加载MSH文件"""
        files = {}
        for key, var in self.file_vars.items():
            path = var.get()
            if path and path != "未选择" and os.path.exists(path):
                files[key] = path
            else:
                messagebox.showwarning("警告", f"{key}文件未选择或不存在")
                return
        
        self.msh_files = files
        self.log_message(f"加载了{len(files)}个MSH文件")
        messagebox.showinfo("成功", "MSH文件加载完成")
        
    def generate_materials(self):
        """生成材料配置"""
        self.log_message("开始生成材料配置...")
        
        try:
            files = self.materials_manager.generate_all_material_files()
            
            # 显示材料参数
            with open(files['materials_summary'], 'r', encoding='utf-8') as f:
                summary_content = f.read()
                
            self.materials_text.delete(1.0, tk.END)
            self.materials_text.insert(1.0, summary_content)
            
            self.log_message("材料配置生成完成")
            messagebox.showinfo("成功", "材料配置文件生成完成")
            
        except Exception as e:
            self.log_message(f"生成材料配置时出错: {e}")
            messagebox.showerror("错误", f"生成材料配置失败:\\n{e}")
            
    def start_analysis(self):
        """开始分析"""
        # 检查MSH文件是否存在（通过文件路径或已加载的文件）
        msh_files_to_use = {}
        
        # 优先使用已加载的文件
        if self.msh_files:
            msh_files_to_use = self.msh_files
        else:
            # 检查界面显示的文件路径
            for key, var in self.file_vars.items():
                path = var.get()
                if path and path != "未选择" and os.path.exists(path):
                    msh_files_to_use[key] = path
            
            if not msh_files_to_use:
                messagebox.showwarning("警告", "请先加载MSH文件或使用'一键准备分析'")
                return
            else:
                # 更新self.msh_files
                self.msh_files = msh_files_to_use
                self.log_message(f"使用界面显示的MSH文件: {list(msh_files_to_use.keys())}")
            
        # 检查配置文件
        materials_file = os.path.join(self.work_dir, "materials.json")
        config_file = os.path.join(self.work_dir, "analysis_config.json")
        
        if not os.path.exists(materials_file):
            messagebox.showwarning("警告", "请先生成材料配置")
            return
            
        self.log_message("开始Kratos分析...")
        self.status_var.set("正在运行分析...")
        self.progress_var.set(0)
        
        def analysis_thread():
            try:
                # 模拟进度更新
                for i in range(0, 101, 10):
                    self.progress_var.set(i)
                    self.root.update_idletasks()
                    
                # 运行分析
                results = self.kratos_solver.run_complete_analysis(
                    self.msh_files, materials_file, config_file
                )
                
                if 'error' in results:
                    self.log_message(f"分析失败: {results['error']}")
                    messagebox.showerror("错误", f"分析失败:\\n{results['error']}")
                else:
                    self.analysis_results = results
                    self.update_results_display(results)
                    self.log_message("分析完成")
                    messagebox.showinfo("成功", "分析完成！")
                    
                self.progress_var.set(100)
                self.status_var.set("分析完成")
                
            except Exception as e:
                self.log_message(f"分析过程出错: {e}")
                messagebox.showerror("错误", f"分析失败:\\n{e}")
                self.status_var.set("分析失败")
        
        self.current_analysis_thread = threading.Thread(target=analysis_thread)
        self.current_analysis_thread.daemon = True
        self.current_analysis_thread.start()
        
    def stop_analysis(self):
        """停止分析"""
        if self.current_analysis_thread and self.current_analysis_thread.is_alive():
            self.log_message("用户请求停止分析")
            # 注意：Python线程无法强制终止，这里只是记录
            self.status_var.set("停止请求已发送")
    
    def view_results(self):
        """查看结果"""
        if not self.analysis_results:
            messagebox.showinfo("提示", "请先运行分析生成结果")
            return
        
        # 切换到结果显示选项卡
        self.notebook.select(3)
        self.log_message("查看分析结果...")
        
    def update_results_display(self, results: Dict[str, Any]):
        """更新结果显示"""
        # 更新结果汇总
        summary = results.get('summary', {})
        summary_text = f"""
分析结果汇总:
================
分析阶段数: {summary.get('total_stages', 0)}
计算成功: {'是' if summary.get('computation_successful', False) else '否'}
最大位移: {summary.get('max_displacement', 0)*1000:.2f} mm
最大应力: {summary.get('max_stress', 0)/1000:.0f} kPa
VTK文件数: {len(results.get('pyvista_files', []))}
运行模式: {summary.get('mode', '未知')}

监测点位移 (mm):
================"""
        
        # 添加监测数据
        monitoring_data = results.get('monitoring_data', {})
        for point, displacements in monitoring_data.items():
            summary_text += f"\\n{point}: {[f'{d*1000:.2f}' for d in displacements]}"
        
        self.results_summary_text.delete(1.0, tk.END)
        self.results_summary_text.insert(1.0, summary_text)
        
        # 更新VTK文件列表
        self.vtk_listbox.delete(0, tk.END)
        for vtk_file in results.get('pyvista_files', []):
            filename = os.path.basename(vtk_file)
            self.vtk_listbox.insert(tk.END, filename)
            
    def visualize_with_pyvista(self):
        """使用PyVista进行可视化"""
        if not PYVISTA_AVAILABLE:
            messagebox.showerror("错误", "PyVista未安装")
            return
            
        if not self.analysis_results.get('pyvista_files'):
            messagebox.showwarning("警告", "没有可用的VTK文件")
            return
            
        try:
            # 选择第一个VTK文件进行可视化
            vtk_file = self.analysis_results['pyvista_files'][0]
            
            self.log_message(f"使用PyVista打开: {vtk_file}")
            
            # 读取和显示VTK文件
            mesh = pv.read(vtk_file)
            
            plotter = pv.Plotter()
            plotter.add_mesh(mesh, scalars='displacement', show_edges=True)
            plotter.add_axes()
            plotter.show_grid()
            plotter.show()
            
        except Exception as e:
            self.log_message(f"PyVista可视化出错: {e}")
            messagebox.showerror("错误", f"可视化失败:\\n{e}")
            
    def open_work_directory(self):
        """打开工作目录"""
        os.startfile(self.work_dir)
        
    def open_results_directory(self):
        """打开结果目录"""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        os.startfile(self.output_dir)
        
    def clear_log(self):
        """清空日志"""
        if self.log_text:
            self.log_text.delete(1.0, tk.END)
            
    def save_log(self):
        """保存日志"""
        if not self.log_text:
            return
            
        filename = filedialog.asksaveasfilename(
            title="保存日志",
            defaultextension=".txt",
            filetypes=[("文本文件", "*.txt"), ("所有文件", "*.*")]
        )
        
        if filename:
            try:
                content = self.log_text.get(1.0, tk.END)
                with open(filename, 'w', encoding='utf-8') as f:
                    f.write(content)
                self.log_message(f"日志已保存到: {filename}")
            except Exception as e:
                messagebox.showerror("错误", f"保存日志失败:\\n{e}")
                
    def run(self):
        """运行界面"""
        self.log_message("系统准备就绪，请开始操作...")
        self.log_message("推荐流程：一键准备分析 -> 开始完整分析 -> 查看结果")
        self.root.mainloop()

def main():
    """主函数"""
    print("启动Example1桌面测试界面...")
    
    # 创建并运行界面
    app = Example1DesktopInterface()
    app.run()

if __name__ == "__main__":
    main()