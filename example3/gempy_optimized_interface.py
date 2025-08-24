"""
GemPy Optimized Professional Interface - 优化专业界面
Removes old placeholder sections and uses only the new professional section system
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from gempy_complete_interface import *

class GemPyOptimizedInterface(GemPyCompleteInterface):
    """优化专业界面 - 移除了旧的空白剖面示意图"""
    
    def __init__(self):
        # 调用GemPyProfessionalInterface的初始化，跳过GemPyCompleteInterface
        # 这样可以避免创建旧的剖面区域
        GemPyProfessionalInterface.__init__(self)
        self.setWindowTitle("🌋 GemPy Optimized Professional - 优化专业地质建模系统")
        
        # 直接集成新的专业剖面系统，不使用旧的空白区域
        self.integrate_optimized_sections()
        self.connect_section_signals()
    
    def integrate_optimized_sections(self):
        """集成优化的剖面系统 - 完全替代旧版"""
        # 创建新的专业剖面系统
        self.professional_sections = SectionSystemWidget(self)
        
        # 获取中央widget
        central_widget = self.centralWidget()
        
        # 创建新的优化布局
        main_splitter = QSplitter(Qt.Orientation.Vertical)
        main_splitter.setChildrenCollapsible(False)
        
        # 上半部分：现有的3D视图和控制面板
        top_widget = QWidget()
        top_layout = QHBoxLayout(top_widget)
        top_layout.setContentsMargins(0, 0, 0, 0)
        
        # 左侧控制面板
        left_panel = QWidget()
        left_layout = QVBoxLayout(left_panel)
        left_layout.setContentsMargins(5, 5, 5, 5)
        
        # 添加现有的面板
        if hasattr(self, 'data_panel'):
            left_layout.addWidget(self.data_panel)
        if hasattr(self, 'settings_panel'):
            left_layout.addWidget(self.settings_panel)
        
        # 右侧3D视图
        if hasattr(self, 'enhanced_3d_viewer'):
            top_layout.addWidget(left_panel, 1)  # 30%
            top_layout.addWidget(self.enhanced_3d_viewer, 2)  # 70%
        else:
            top_layout.addWidget(left_panel)
        
        # 下半部分：专业剖面系统
        main_splitter.addWidget(top_widget)
        main_splitter.addWidget(self.professional_sections)
        
        # 设置分割比例：3D区域60%，剖面区域40%
        main_splitter.setSizes([400, 200])
        main_splitter.setStretchFactor(0, 3)  # 3D区域可伸缩
        main_splitter.setStretchFactor(1, 2)  # 剖面区域可伸缩
        
        # 设置为中央widget
        self.setCentralWidget(main_splitter)
        
        # 添加分割器样式
        main_splitter.setStyleSheet("""
            QSplitter::handle {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1, 
                    stop:0 #e9ecef, stop:1 #dee2e6);
                border: 1px solid #ced4da;
                height: 8px;
                border-radius: 4px;
                margin: 2px;
            }
            QSplitter::handle:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1, 
                    stop:0 #4facfe, stop:1 #00f2fe);
            }
        """)
        
        print("✅ 优化界面布局完成 - 移除了旧的空白剖面")


def main():
    """主函数"""
    app = QApplication(sys.argv)
    
    print("Starting GemPy Optimized Professional Interface...")
    print("- Removed old placeholder sections")
    print("- Using new professional section system only")
    
    # 创建优化界面
    window = GemPyOptimizedInterface()
    window.show()
    
    # 添加演示数据
    try:
        interface_df, orientations_df = create_demo_geological_data()
        
        def load_demo_data():
            try:
                window.professional_sections.update_data(
                    interface_points=interface_df,
                    orientations=orientations_df,
                    extent=[0, 1000, 0, 1000, -500, 500]
                )
                print("✅ Demo data loaded to optimized section system")
                print(f"📊 Interface points: {len(interface_df)}, Orientations: {len(orientations_df)}")
            except Exception as e:
                print(f"⚠️ Demo data loading failed: {e}")
        
        QTimer.singleShot(2000, load_demo_data)
        
    except Exception as e:
        print(f"⚠️ Demo data creation failed: {e}")
    
    print("🎯 Optimized interface launched successfully!")
    print("🔥 Only professional sections - no more placeholder areas!")
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()