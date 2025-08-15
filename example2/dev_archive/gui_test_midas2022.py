#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MIDAS GTS 2022 FPN文件测试工具
专门测试两阶段计算2.fpn的开挖功能
"""

import sys
import os
from pathlib import Path

# 设置工作目录和路径
current_dir = Path(__file__).parent
os.chdir(current_dir)
sys.path.insert(0, str(current_dir))

def create_simple_test_gui():
    """创建简单的测试GUI"""
    try:
        from PyQt6.QtWidgets import (QApplication, QMainWindow, QVBoxLayout, 
                                     QWidget, QPushButton, QLabel, QTextEdit)
        from PyQt6.QtCore import Qt
        
        # 导入预处理器（避免相对导入）
        from modules.preprocessor import PreProcessor
        
        class MidasTestWindow(QMainWindow):
            def __init__(self):
                super().__init__()
                self.preprocessor = PreProcessor()
                self.init_ui()
                self.auto_load_fpn()  # 自动加载FPN文件
            
            def init_ui(self):
                self.setWindowTitle("MIDAS GTS 2022 - 两阶段计算测试")
                self.setGeometry(200, 200, 800, 600)
                
                central_widget = QWidget()
                self.setCentralWidget(central_widget)
                layout = QVBoxLayout(central_widget)
                
                # 状态标签
                self.status_label = QLabel("正在初始化...")
                self.status_label.setStyleSheet("font-weight: bold; color: blue;")
                layout.addWidget(self.status_label)
                
                # 分析步按钮容器
                self.stage_buttons_widget = QWidget()
                self.stage_layout = QVBoxLayout(self.stage_buttons_widget)
                layout.addWidget(self.stage_buttons_widget)
                
                # 结果显示区域
                self.result_text = QTextEdit()
                self.result_text.setMaximumHeight(200)
                layout.addWidget(self.result_text)
                
                # 重新加载按钮
                reload_btn = QPushButton("重新加载FPN文件")
                reload_btn.clicked.connect(self.auto_load_fpn)
                layout.addWidget(reload_btn)
                
            def auto_load_fpn(self):
                """自动加载两阶段计算2.fpn文件"""
                fpn_file = current_dir / "data" / "两阶段计算2.fpn"
                
                if fpn_file.exists():
                    try:
                        self.status_label.setText("正在加载FPN文件...")
                        self.result_text.clear()
                        
                        # 加载FPN文件
                        self.preprocessor.load_fpn_file(str(fpn_file))
                        
                        if hasattr(self.preprocessor, 'fpn_data') and self.preprocessor.fpn_data:
                            stages = self.preprocessor.fpn_data.get('analysis_stages', [])
                            self.status_label.setText(f"✅ 成功加载! 发现 {len(stages)} 个分析步")
                            
                            # 清除旧的按钮
                            for i in reversed(range(self.stage_layout.count())): 
                                self.stage_layout.itemAt(i).widget().setParent(None)
                            
                            # 创建分析步按钮
                            for i, stage in enumerate(stages):
                                stage_name = stage.get('name', f'分析步{i}')
                                btn = QPushButton(f"分析步 {i+1}: {stage_name}")
                                btn.clicked.connect(lambda checked, idx=i: self.test_stage(idx))
                                
                                # 标记开挖相关按钮
                                if any(keyword in stage_name for keyword in ['开挖', '挖', '基坑', '支护']):
                                    btn.setStyleSheet("background-color: #ffeb3b; font-weight: bold;")
                                
                                self.stage_layout.addWidget(btn)
                                
                            # 显示分析步信息
                            info_text = "分析步信息:\n"
                            for i, stage in enumerate(stages):
                                stage_name = stage.get('name', f'分析步{i}')
                                stage_id = stage.get('id', i)
                                excavation_marker = " [🏗️开挖相关]" if any(keyword in stage_name for keyword in ['开挖', '挖', '基坑', '支护']) else ""
                                info_text += f"{i+1}. ID:{stage_id} - {stage_name}{excavation_marker}\\n"
                                
                            self.result_text.setText(info_text)
                            
                        else:
                            self.status_label.setText("❌ FPN数据解析失败")
                            self.result_text.setText("无法解析FPN数据，请检查文件格式")
                            
                    except Exception as e:
                        self.status_label.setText(f"❌ 加载失败: {str(e)}")
                        self.result_text.setText(f"错误详情:\\n{str(e)}")
                else:
                    self.status_label.setText("❌ FPN文件不存在")
                    self.result_text.setText(f"文件路径: {fpn_file}\\n文件不存在，请检查路径")
            
            def test_stage(self, stage_index):
                """测试指定的分析步"""
                try:
                    self.status_label.setText(f"正在切换到分析步 {stage_index+1}...")
                    
                    # 获取分析步信息
                    if hasattr(self.preprocessor, 'fpn_data') and self.preprocessor.fpn_data:
                        stages = self.preprocessor.fpn_data.get('analysis_stages', [])
                        if 0 <= stage_index < len(stages):
                            stage = stages[stage_index]
                            stage_name = stage.get('name', f'分析步{stage_index}')
                            
                            # 切换分析步
                            self.preprocessor.set_current_analysis_stage(stage_index)
                            
                            # 收集结果信息
                            result_text = f"=== 分析步 {stage_index+1}: {stage_name} ===\\n"
                            result_text += f"阶段ID: {stage.get('id', 'N/A')}\\n"
                            
                            # 检查材料激活状态
                            if hasattr(self.preprocessor, 'current_active_materials') and self.preprocessor.current_active_materials:
                                active_materials = sorted(list(self.preprocessor.current_active_materials))
                                result_text += f"激活的材料ID: {active_materials}\\n"
                                
                                # 如果有网格数据，分析材料过滤效果
                                if hasattr(self.preprocessor, 'mesh') and self.preprocessor.mesh:
                                    if hasattr(self.preprocessor.mesh, 'cell_data') and 'MaterialID' in self.preprocessor.mesh.cell_data:
                                        all_materials = sorted(list(set(self.preprocessor.mesh.cell_data['MaterialID'])))
                                        hidden_materials = [mid for mid in all_materials if mid not in self.preprocessor.current_active_materials]
                                        
                                        result_text += f"网格中所有材料ID: {all_materials}\\n"
                                        result_text += f"被隐藏的材料ID: {sorted(hidden_materials)}\\n"
                                        
                                        if hidden_materials:
                                            result_text += f"✅ 开挖效果: {len(hidden_materials)}种材料被隐藏 (代表被挖掉的土体)\\n"
                                        else:
                                            result_text += f"⚠️ 所有材料仍在显示，未检测到开挖效果\\n"
                                
                                # 检查是否为开挖相关分析步
                                is_excavation = any(keyword in stage_name for keyword in ['开挖', '挖', '基坑', '支护'])
                                if is_excavation:
                                    result_text += f"\\n🏗️ 这是开挖相关分析步!\\n"
                                    if hasattr(self.preprocessor, 'current_active_materials'):
                                        result_text += f"开挖材料过滤修复: 已应用\\n"
                                    else:
                                        result_text += f"开挖材料过滤修复: 未应用\\n"
                                        
                            else:
                                result_text += f"❌ 未找到激活材料信息\\n"
                            
                            self.result_text.setText(result_text)
                            self.status_label.setText(f"✅ 已切换到分析步 {stage_index+1}")
                            
                        else:
                            self.status_label.setText("❌ 分析步索引无效")
                    else:
                        self.status_label.setText("❌ 没有FPN数据")
                        
                except Exception as e:
                    self.status_label.setText(f"❌ 切换失败: {str(e)}")
                    self.result_text.setText(f"错误详情:\\n{str(e)}")
        
        # 启动应用
        app = QApplication(sys.argv)
        app.setApplicationName("MIDAS GTS 2022 测试工具")
        
        window = MidasTestWindow()
        window.show()
        
        return app.exec()
        
    except Exception as e:
        print(f"GUI启动失败: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = create_simple_test_gui()
    sys.exit(exit_code)