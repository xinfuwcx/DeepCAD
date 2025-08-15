#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import os
from pathlib import Path

# 添加路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))
sys.path.insert(0, str(current_dir.parent))

# 修复相对导入问题
os.chdir(current_dir)

# 简单测试GUI
if __name__ == "__main__":
    try:
        from PyQt6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget, QPushButton, QLabel, QFileDialog
        from modules.preprocessor import PreProcessor
        
        app = QApplication(sys.argv)
        
        class SimpleTestWindow(QMainWindow):
            def __init__(self):
                super().__init__()
                self.preprocessor = PreProcessor()
                self.init_ui()
            
            def init_ui(self):
                self.setWindowTitle("简单FPN测试")
                self.setGeometry(100, 100, 600, 400)
                
                central_widget = QWidget()
                self.setCentralWidget(central_widget)
                layout = QVBoxLayout(central_widget)
                
                # 状态标签
                self.status_label = QLabel("准备就绪")
                layout.addWidget(self.status_label)
                
                # 加载按钮
                load_btn = QPushButton("加载两阶段计算2.fpn")
                load_btn.clicked.connect(self.load_fpn)
                layout.addWidget(load_btn)
                
                # 分析步按钮
                self.stage_btns = []
                
            def load_fpn(self):
                fpn_file = Path("data/两阶段计算2.fpn")
                if fpn_file.exists():
                    try:
                        self.preprocessor.load_fpn_file(str(fpn_file))
                        if hasattr(self.preprocessor, 'fpn_data') and self.preprocessor.fpn_data:
                            stages = self.preprocessor.fpn_data.get('analysis_stages', [])
                            self.status_label.setText(f"加载成功! 发现{len(stages)}个分析步")
                            
                            # 创建分析步按钮
                            for i, stage in enumerate(stages):
                                btn = QPushButton(f"分析步{i}: {stage.get('name', '')}")
                                btn.clicked.connect(lambda checked, idx=i: self.switch_stage(idx))
                                self.centralWidget().layout().addWidget(btn)
                                self.stage_btns.append(btn)
                        else:
                            self.status_label.setText("FPN数据加载失败")
                    except Exception as e:
                        self.status_label.setText(f"加载错误: {str(e)}")
                else:
                    self.status_label.setText("FPN文件不存在")
            
            def switch_stage(self, stage_index):
                try:
                    self.preprocessor.set_current_analysis_stage(stage_index)
                    if hasattr(self.preprocessor, 'current_active_materials'):
                        active = sorted(list(self.preprocessor.current_active_materials))
                        self.status_label.setText(f"切换到分析步{stage_index}, 激活材料: {active}")
                    else:
                        self.status_label.setText(f"切换到分析步{stage_index}")
                except Exception as e:
                    self.status_label.setText(f"切换错误: {str(e)}")
        
        window = SimpleTestWindow()
        window.show()
        
        sys.exit(app.exec())
        
    except Exception as e:
        print(f"启动失败: {e}")
        import traceback
        traceback.print_exc()