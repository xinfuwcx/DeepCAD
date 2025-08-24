"""
GemPy Ultimate Professional Interface - 终极专业界面
Complete integration of professional icons, refined design, and premium user experience
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from gempy_refined_interface import *

class GemPyUltimateInterface(GemPyRefinedInterface):
    """终极专业GemPy界面 - 集成所有专业功能"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("🌋 GemPy Ultimate Professional - 终极专业地质建模系统")
        self.enhance_ultimate_interface()
    
    def enhance_ultimate_interface(self):
        """增强终极界面体验"""
        # 添加专业启动动画
        self.create_startup_animation()
        
        # 增强工具提示
        self.enhance_tooltips()
        
        # 添加键盘快捷键
        self.setup_keyboard_shortcuts()
        
        # 优化性能指示器
        self.setup_performance_indicators()
    
    def create_startup_animation(self):
        """创建专业启动动画"""
        if ICONS_AVAILABLE:
            self.status_label.setText("专业系统加载中...")
            # 创建渐进式状态更新
            QTimer.singleShot(500, lambda: self.status_label.setText("图标系统已加载"))
            QTimer.singleShot(1000, lambda: self.status_label.setText("界面优化完成"))
            QTimer.singleShot(1500, lambda: self.status_label.setText("系统就绪"))
    
    def enhance_tooltips(self):
        """增强工具提示"""
        if hasattr(self, 'premium_viewport'):
            # 为工具栏按钮添加详细提示
            tooltips = {
                'update': "刷新3D视图并重新渲染所有数据",
                'screenshot': "捕获当前3D视图的高质量截图",
                'zoom': "缩放到适合窗口大小",
                'rotate': "旋转视图到预设角度"
            }
            
            # 应用工具提示到相应的控件
            for name, tip in tooltips.items():
                if hasattr(self.premium_viewport, f'{name}_btn'):
                    btn = getattr(self.premium_viewport, f'{name}_btn')
                    btn.setToolTip(f"🔧 {tip}")
    
    def setup_keyboard_shortcuts(self):
        """设置键盘快捷键"""
        from PyQt6.QtGui import QKeySequence, QShortcut
        
        shortcuts = [
            (QKeySequence("Ctrl+N"), self.new_model, "新建模型"),
            (QKeySequence("Ctrl+O"), self.open_model, "打开模型"),
            (QKeySequence("Ctrl+S"), self.save_model, "保存模型"),
            (QKeySequence("Ctrl+I"), self.import_data, "导入数据"),
            (QKeySequence("Ctrl+E"), self.export_results, "导出结果"),
            (QKeySequence("F5"), self.build_model, "构建模型"),
            (QKeySequence("F11"), self.toggle_fullscreen, "全屏切换"),
        ]
        
        for key_seq, func, desc in shortcuts:
            shortcut = QShortcut(key_seq, self)
            shortcut.activated.connect(func)
            if hasattr(func, '__self__'):  # 如果有对应的菜单项，添加快捷键显示
                pass  # 可以在这里添加快捷键显示到菜单项
    
    def setup_performance_indicators(self):
        """设置性能指示器"""
        # 添加内存使用监控
        self.memory_indicator = QLabel("内存: 0 MB")
        self.memory_indicator.setStyleSheet("color: #666; font-size: 8pt;")
        self.statusBar().addPermanentWidget(self.memory_indicator)
        
        # 添加FPS监控（用于3D视图）
        self.fps_indicator = QLabel("FPS: --")
        self.fps_indicator.setStyleSheet("color: #666; font-size: 8pt;")
        self.statusBar().addPermanentWidget(self.fps_indicator)
        
        # 定期更新性能指示器
        self.performance_timer = QTimer()
        self.performance_timer.timeout.connect(self.update_performance_indicators)
        self.performance_timer.start(1000)  # 每秒更新一次
    
    def update_performance_indicators(self):
        """更新性能指示器"""
        try:
            import psutil
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024
            self.memory_indicator.setText(f"内存: {memory_mb:.1f} MB")
        except ImportError:
            self.memory_indicator.setText("内存: N/A")
    
    def toggle_fullscreen(self):
        """切换全屏模式"""
        if self.isFullScreen():
            self.showNormal()
            self.status_label.setText("退出全屏模式")
        else:
            self.showFullScreen()
            self.status_label.setText("已进入全屏模式")
    
    def create_enhanced_about_dialog(self):
        """创建增强的关于对话框"""
        dialog = QDialog(self)
        dialog.setWindowTitle("关于 GemPy Ultimate Professional")
        dialog.setMinimumSize(500, 400)
        
        layout = QVBoxLayout(dialog)
        
        # 标题
        title = QLabel("🌋 GemPy Ultimate Professional")
        title.setStyleSheet("""
            QLabel {
                font-size: 24pt;
                font-weight: bold;
                color: #2c3e50;
                margin: 20px;
            }
        """)
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)
        
        # 版本信息
        if GEMPY_AVAILABLE:
            version_info = f"基于 GemPy {gp.__version__}"
        else:
            version_info = "GemPy 模拟模式"
        
        version_label = QLabel(version_info)
        version_label.setStyleSheet("color: #666; font-size: 12pt;")
        version_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(version_label)
        
        # 功能特色
        features_text = """
        <h3>🚀 核心特色</h3>
        <ul>
        <li>✨ 专业SVG图标系统</li>
        <li>🎨 现代化渐变界面设计</li>
        <li>📊 完整的地质数据管理</li>
        <li>🏗️ 三维隐式地质建模</li>
        <li>📈 高级分析和可视化功能</li>
        <li>⚡ 高性能3D渲染引擎</li>
        </ul>
        
        <h3>🔧 技术架构</h3>
        <ul>
        <li>🐍 Python + PyQt6 现代化界面</li>
        <li>🌋 GemPy 地质建模核心</li>
        <li>📐 PyVista 3D可视化引擎</li>
        <li>🎯 专业工作流设计</li>
        </ul>
        """
        
        features_label = QLabel(features_text)
        features_label.setStyleSheet("color: #2c3e50; font-size: 10pt;")
        features_label.setWordWrap(True)
        layout.addWidget(features_label)
        
        # 关闭按钮
        close_btn = QPushButton("确定")
        close_btn.clicked.connect(dialog.accept)
        close_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1, 
                    stop:0 #667eea, stop:1 #764ba2);
                color: white;
                border: none;
                padding: 10px 30px;
                font-weight: 600;
                border-radius: 6px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1, 
                    stop:0 #5a67d8, stop:1 #667eea);
            }
        """)
        
        button_layout = QHBoxLayout()
        button_layout.addStretch()
        button_layout.addWidget(close_btn)
        layout.addLayout(button_layout)
        
        return dialog
    
    def show_about(self):
        """显示关于对话框"""
        dialog = self.create_enhanced_about_dialog()
        dialog.exec()


class UltimateDemoDataGenerator:
    """终极演示数据生成器"""
    
    @staticmethod
    def generate_complex_geological_model():
        """生成复杂地质模型演示数据"""
        # 创建更复杂的地质界面点
        interface_points = []
        orientations = []
        
        # 地层1: 表层
        for i in range(10):
            x = np.random.uniform(0, 1000)
            y = np.random.uniform(0, 1000) 
            z = 900 + np.random.uniform(-50, 50)
            interface_points.append([x, y, z, "表层"])
        
        # 地层2: 砂岩层
        for i in range(15):
            x = np.random.uniform(0, 1000)
            y = np.random.uniform(0, 1000)
            z = 700 + np.random.uniform(-100, 100)
            interface_points.append([x, y, z, "砂岩层"])
        
        # 地层3: 页岩层  
        for i in range(12):
            x = np.random.uniform(0, 1000)
            y = np.random.uniform(0, 1000)
            z = 500 + np.random.uniform(-80, 80)
            interface_points.append([x, y, z, "页岩层"])
        
        # 地层4: 石灰岩层
        for i in range(10):
            x = np.random.uniform(0, 1000)
            y = np.random.uniform(0, 1000)
            z = 300 + np.random.uniform(-60, 60)
            interface_points.append([x, y, z, "石灰岩层"])
        
        # 地层5: 基岩
        for i in range(8):
            x = np.random.uniform(0, 1000)
            y = np.random.uniform(0, 1000)
            z = 100 + np.random.uniform(-50, 50)
            interface_points.append([x, y, z, "基岩"])
        
        # 产状数据
        for i in range(20):
            x = np.random.uniform(100, 900)
            y = np.random.uniform(100, 900)
            z = np.random.uniform(200, 800)
            azimuth = np.random.uniform(0, 360)
            dip = np.random.uniform(10, 80)
            polarity = 1
            orientations.append([x, y, z, azimuth, dip, polarity, "测量产状"])
        
        return pd.DataFrame(interface_points, columns=['X', 'Y', 'Z', 'formation']), \
               pd.DataFrame(orientations, columns=['X', 'Y', 'Z', 'azimuth', 'dip', 'polarity', 'formation'])


def main():
    """主函数 - 启动终极专业界面"""
    app = QApplication(sys.argv)
    
    # 设置应用程序图标（如果图标可用）
    if ICONS_AVAILABLE and 'geological_model' in GEMPY_ICONS:
        app.setWindowIcon(GEMPY_ICONS['geological_model'])
    
    # 创建并显示主界面
    window = GemPyUltimateInterface()
    window.show()
    
    # 添加演示数据（可选）
    try:
        interface_df, orientations_df = UltimateDemoDataGenerator.generate_complex_geological_model()
        print("✅ 演示数据已生成")
        print(f"📊 界面点数量: {len(interface_df)}")
        print(f"🧭 产状数据数量: {len(orientations_df)}")
    except Exception as e:
        print(f"⚠️ 演示数据生成失败: {e}")
    
    print("\n🌋 GemPy Ultimate Professional 已启动!")
    print("🚀 专业地质建模界面现已就绪")
    
    if ICONS_AVAILABLE:
        print("✨ 专业图标系统已加载")
    if DIALOGS_AVAILABLE:
        print("📋 专业对话框系统已加载")
    if GEMPY_AVAILABLE:
        print(f"🗻 GemPy核心引擎 {gp.__version__} 已就绪")
    if PYVISTA_AVAILABLE:
        print("🎨 3D可视化引擎已就绪")
    
    print("\n使用快捷键:")
    print("  Ctrl+N: 新建模型")
    print("  Ctrl+O: 打开模型") 
    print("  Ctrl+S: 保存模型")
    print("  F5: 构建模型")
    print("  F11: 全屏切换")
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()