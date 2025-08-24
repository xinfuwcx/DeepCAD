"""
Test script for GemPy Ultimate Interface with Professional Icon Integration
测试终极专业界面和图标集成
"""

import sys
import os
from PyQt6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget, QLabel, QPushButton
from PyQt6.QtCore import QTimer

# Test imports
def test_imports():
    """测试所有必要的导入"""
    results = {}
    
    try:
        from gempy_icons import GEMPY_ICONS
        results['icons'] = f"✅ 图标系统加载成功 ({len(GEMPY_ICONS)} 个图标)"
    except Exception as e:
        results['icons'] = f"❌ 图标系统加载失败: {e}"
    
    try:
        from gempy_dialogs import ModelSettingsDialog
        results['dialogs'] = "✅ 对话框系统加载成功"
    except Exception as e:
        results['dialogs'] = f"❌ 对话框系统加载失败: {e}"
    
    try:
        from gempy_refined_interface import GemPyRefinedInterface
        results['refined'] = "✅ 精致界面系统加载成功"
    except Exception as e:
        results['refined'] = f"❌ 精致界面系统加载失败: {e}"
    
    try:
        import gempy as gp
        results['gempy'] = f"✅ GemPy核心引擎 v{gp.__version__}"
    except Exception as e:
        results['gempy'] = f"⚠️ GemPy模拟模式: {e}"
    
    try:
        import pyvista as pv
        results['pyvista'] = f"✅ 3D可视化引擎 v{pv.__version__}"
    except Exception as e:
        results['pyvista'] = f"⚠️ 3D可视化不可用: {e}"
    
    return results

class TestIntegrationWindow(QMainWindow):
    """测试集成窗口"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("🧪 GemPy Ultimate Integration Test")
        self.setGeometry(100, 100, 600, 400)
        
        # 测试结果
        self.test_results = test_imports()
        self.setup_ui()
        
        # 显示图标测试
        self.test_icons()
    
    def setup_ui(self):
        """设置测试界面"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        
        # 标题
        title = QLabel("🌋 GemPy Ultimate Professional - 集成测试")
        title.setStyleSheet("""
            QLabel {
                font-size: 18pt;
                font-weight: bold;
                color: #2c3e50;
                padding: 20px;
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1, 
                    stop:0 #667eea, stop:1 #764ba2);
                color: white;
                border-radius: 8px;
            }
        """)
        layout.addWidget(title)
        
        # 测试结果显示
        for component, result in self.test_results.items():
            result_label = QLabel(f"{component.upper()}: {result}")
            result_label.setStyleSheet("""
                QLabel {
                    font-size: 11pt;
                    padding: 10px;
                    margin: 2px;
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                }
            """)
            layout.addWidget(result_label)
        
        # 图标测试按钮
        self.icon_test_btn = QPushButton("🎨 测试图标显示")
        self.icon_test_btn.clicked.connect(self.show_icon_gallery)
        self.icon_test_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1, 
                    stop:0 #4facfe, stop:1 #00f2fe);
                color: white;
                border: none;
                padding: 12px;
                font-size: 12pt;
                font-weight: 600;
                border-radius: 6px;
                margin: 10px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1, 
                    stop:0 #3b82f6, stop:1 #1d4ed8);
            }
        """)
        layout.addWidget(self.icon_test_btn)
        
        # 启动完整界面按钮
        self.launch_btn = QPushButton("🚀 启动完整专业界面")
        self.launch_btn.clicked.connect(self.launch_ultimate_interface)
        self.launch_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1, 
                    stop:0 #667eea, stop:1 #764ba2);
                color: white;
                border: none;
                padding: 12px;
                font-size: 12pt;
                font-weight: 600;
                border-radius: 6px;
                margin: 10px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1, 
                    stop:0 #5a67d8, stop:1 #667eea);
            }
        """)
        layout.addWidget(self.launch_btn)
        
        # 状态标签
        self.status_label = QLabel("✨ 集成测试就绪")
        self.status_label.setStyleSheet("""
            QLabel {
                color: #16C60C;
                font-weight: 600;
                padding: 10px;
                background: #d4edda;
                border: 1px solid #c3e6cb;
                border-radius: 4px;
                margin: 10px;
            }
        """)
        layout.addWidget(self.status_label)
    
    def test_icons(self):
        """测试图标系统"""
        try:
            from gempy_icons import GEMPY_ICONS
            if 'new' in GEMPY_ICONS:
                self.icon_test_btn.setIcon(GEMPY_ICONS['new'])
            if 'geological_model' in GEMPY_ICONS:
                self.launch_btn.setIcon(GEMPY_ICONS['geological_model'])
            self.status_label.setText("✅ 图标集成测试通过")
        except Exception as e:
            self.status_label.setText(f"⚠️ 图标测试警告: {e}")
    
    def show_icon_gallery(self):
        """显示图标库"""
        try:
            from gempy_icons import GEMPY_ICONS
            from PyQt6.QtWidgets import QDialog, QGridLayout, QScrollArea
            
            dialog = QDialog(self)
            dialog.setWindowTitle("📁 图标库预览")
            dialog.setMinimumSize(600, 500)
            
            scroll_area = QScrollArea()
            scroll_widget = QWidget()
            grid_layout = QGridLayout(scroll_widget)
            
            row, col = 0, 0
            for name, icon in GEMPY_ICONS.items():
                btn = QPushButton(name)
                btn.setIcon(icon)
                btn.setMinimumSize(120, 40)
                btn.setStyleSheet("""
                    QPushButton {
                        text-align: left;
                        padding: 8px;
                        margin: 2px;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                    }
                    QPushButton:hover {
                        background: #e9ecef;
                    }
                """)
                grid_layout.addWidget(btn, row, col)
                
                col += 1
                if col > 4:
                    col = 0
                    row += 1
            
            scroll_area.setWidget(scroll_widget)
            layout = QVBoxLayout(dialog)
            layout.addWidget(scroll_area)
            
            dialog.exec()
        except Exception as e:
            self.status_label.setText(f"❌ 图标库显示失败: {e}")
    
    def launch_ultimate_interface(self):
        """启动完整的专业界面"""
        try:
            self.status_label.setText("🚀 正在启动专业界面...")
            QTimer.singleShot(1000, self._launch_interface)
        except Exception as e:
            self.status_label.setText(f"❌ 启动失败: {e}")
    
    def _launch_interface(self):
        """延迟启动界面"""
        try:
            from gempy_ultimate_interface import GemPyUltimateInterface
            
            self.ultimate_window = GemPyUltimateInterface()
            self.ultimate_window.show()
            self.status_label.setText("✅ 专业界面已启动!")
            
            # 5秒后提示
            QTimer.singleShot(5000, lambda: self.status_label.setText("🌋 GemPy Ultimate Professional 运行中..."))
            
        except Exception as e:
            self.status_label.setText(f"❌ 专业界面启动失败: {e}")
            print(f"启动错误详情: {e}")

def main():
    """主函数"""
    app = QApplication(sys.argv)
    
    print("🧪 开始GemPy Ultimate Integration测试...")
    print("=" * 50)
    
    # 运行测试
    test_results = test_imports()
    for component, result in test_results.items():
        print(f"{component.upper()}: {result}")
    
    print("=" * 50)
    print("🌋 启动集成测试界面...")
    
    # 显示测试窗口
    window = TestIntegrationWindow()
    window.show()
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()