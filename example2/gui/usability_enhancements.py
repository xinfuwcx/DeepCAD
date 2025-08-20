#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
界面易用性增强模块
包括快捷键、工具提示、帮助系统、操作向导等
"""

import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from PyQt6.QtWidgets import *
from PyQt6.QtCore import Qt, pyqtSignal, QTimer, QPropertyAnimation, QEasingCurve
from PyQt6.QtGui import QFont, QKeySequence, QAction, QIcon, QPalette, QColor

class HelpSystem(QWidget):
    """帮助系统"""
    
    def __init__(self):
        super().__init__()
        self.help_data = self.load_help_data()
        self.setup_ui()
        
    def load_help_data(self) -> Dict[str, Any]:
        """加载帮助数据"""
        return {
            "前处理": {
                "模型导入": {
                    "description": "支持FPN格式的有限元模型导入",
                    "steps": [
                        "点击 '📂 导入FPN文件' 按钮",
                        "选择FPN文件并确认",
                        "等待解析完成，查看导入摘要",
                        "检查材料和分析步信息"
                    ],
                    "tips": [
                        "确保FPN文件格式正确",
                        "大文件导入可能需要较长时间",
                        "导入后会自动设置材料参数"
                    ]
                },
                "材料管理": {
                    "description": "管理和编辑材料参数",
                    "steps": [
                        "点击 '⚙️ 材料库管理' 按钮",
                        "选择或新增材料",
                        "编辑物理和强度参数",
                        "保存并应用到分析"
                    ],
                    "tips": [
                        "摩尔-库伦参数需要合理配置",
                        "可以保存材料库供后续使用",
                        "不同土层使用不同材料"
                    ]
                },
                "显示控制": {
                    "description": "控制模型和构件的显示",
                    "steps": [
                        "使用复选框控制显示项目",
                        "切换线框/实体/半透明模式",
                        "调整材料和分析步显示",
                        "生成演示网格进行测试"
                    ],
                    "tips": [
                        "半透明模式适合查看内部结构",
                        "可按材料类型过滤显示",
                        "支持分阶段显示分析结果"
                    ]
                }
            },
            "分析": {
                "分析设置": {
                    "description": "配置Kratos分析参数",
                    "steps": [
                        "确认分析类型（非线性静力分析）",
                        "设置求解参数（迭代次数、收敛精度）",
                        "检查施工步序",
                        "点击 '🚀 开始分析' 执行计算"
                    ],
                    "tips": [
                        "基坑工程建议使用非线性分析",
                        "收敛精度影响计算时间和精度",
                        "可以暂停和停止正在进行的计算"
                    ]
                },
                "监控分析": {
                    "description": "监控分析进度和质量",
                    "steps": [
                        "观察分析进度条和日志",
                        "查看收敛曲线和资源使用",
                        "监控质量指标",
                        "必要时暂停或停止分析"
                    ],
                    "tips": [
                        "收敛速率反映分析质量",
                        "内存使用过高时考虑简化模型",
                        "可导出监控报告备档"
                    ]
                }
            },
            "后处理": {
                "结果显示": {
                    "description": "查看和分析计算结果",
                    "steps": [
                        "选择结果类型（位移/应力）",
                        "选择显示分量",
                        "调整时间步和变形比例",
                        "使用动画查看演化过程"
                    ],
                    "tips": [
                        "von Mises应力常用于强度评估",
                        "变形比例可以夸大显示微小变形",
                        "时间步对应施工阶段"
                    ]
                },
                "专业分析": {
                    "description": "基坑工程专业分析工具",
                    "steps": [
                        "添加监测点查看特定位置数值",
                        "定义截面进行剖面分析",
                        "分析支护结构内力和变形",
                        "生成专业工程报告"
                    ],
                    "tips": [
                        "监测点应布置在关键位置",
                        "截面分析有助于理解变形模式",
                        "支护结构分析确保安全性"
                    ]
                }
            },
            "常见问题": {
                "导入失败": {
                    "description": "FPN文件导入失败的解决方法",
                    "solutions": [
                        "检查文件格式是否正确",
                        "确认文件编码（建议UTF-8或GB18030）",
                        "检查文件是否损坏",
                        "尝试重新生成FPN文件"
                    ]
                },
                "计算不收敛": {
                    "description": "分析计算不收敛的处理方法",
                    "solutions": [
                        "检查材料参数是否合理",
                        "减小荷载增量步长",
                        "增加最大迭代次数",
                        "简化模型复杂度",
                        "检查边界条件设置"
                    ]
                },
                "显示问题": {
                    "description": "3D显示异常的解决方法",
                    "solutions": [
                        "更新显卡驱动程序",
                        "切换到软件渲染模式",
                        "重启程序重新初始化",
                        "检查OpenGL兼容性"
                    ]
                }
            }
        }
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # 搜索框
        search_layout = QHBoxLayout()
        search_layout.addWidget(QLabel("🔍 搜索帮助:"))
        self.search_box = QLineEdit()
        self.search_box.setPlaceholderText("输入关键词搜索...")
        search_layout.addWidget(self.search_box)
        layout.addLayout(search_layout)
        
        # 分割器
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # 左侧目录树
        self.help_tree = QTreeWidget()
        self.help_tree.setHeaderLabel("帮助目录")
        self.help_tree.setMaximumWidth(250)
        self.populate_help_tree()
        splitter.addWidget(self.help_tree)
        
        # 右侧内容显示
        self.content_area = QTextEdit()
        self.content_area.setReadOnly(True)
        self.show_welcome_content()
        splitter.addWidget(self.content_area)
        
        layout.addWidget(splitter)
        
        # 连接信号
        self.help_tree.currentItemChanged.connect(self.on_item_selected)
        self.search_box.textChanged.connect(self.on_search_text_changed)
        
    def populate_help_tree(self):
        """填充帮助目录树"""
        self.help_tree.clear()
        
        for category, topics in self.help_data.items():
            category_item = QTreeWidgetItem([category])
            category_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "category", "name": category})
            
            for topic, content in topics.items():
                topic_item = QTreeWidgetItem([topic])
                topic_item.setData(0, Qt.ItemDataRole.UserRole, {
                    "type": "topic", 
                    "category": category, 
                    "name": topic,
                    "content": content
                })
                category_item.addChild(topic_item)
                
            self.help_tree.addTopLevelItem(category_item)
            
        self.help_tree.expandAll()
        
    def show_welcome_content(self):
        """显示欢迎内容"""
        welcome_html = """
        <html>
        <head>
            <style>
                body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 20px; }
                h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                h2 { color: #34495e; margin-top: 25px; }
                .feature { background: #ecf0f1; padding: 10px; margin: 10px 0; border-radius: 5px; }
                .shortcut { background: #d5dbdb; padding: 5px; border-radius: 3px; font-family: monospace; }
            </style>
        </head>
        <body>
            <h1>🏗️ DeepCAD 基坑工程分析系统帮助</h1>
            
            <h2>📘 系统概述</h2>
            <div class="feature">
                <p>DeepCAD是专为基坑工程设计的综合分析系统，集成了Kratos Multiphysics 10.3计算引擎，
                提供从前处理到后处理的完整工作流程。</p>
            </div>
            
            <h2>🚀 快速开始</h2>
            <div class="feature">
                <ol>
                    <li><strong>导入模型</strong>：在前处理模块导入FPN文件</li>
                    <li><strong>设置材料</strong>：配置土体和结构材料参数</li>
                    <li><strong>运行分析</strong>：在分析模块执行Kratos计算</li>
                    <li><strong>查看结果</strong>：在后处理模块显示计算结果</li>
                </ol>
            </div>
            
            <h2>⌨️ 常用快捷键</h2>
            <div class="feature">
                <p><span class="shortcut">Ctrl+O</span> - 打开文件</p>
                <p><span class="shortcut">Ctrl+S</span> - 保存项目</p>
                <p><span class="shortcut">F5</span> - 刷新显示</p>
                <p><span class="shortcut">F11</span> - 全屏模式</p>
                <p><span class="shortcut">Ctrl+H</span> - 显示/隐藏帮助</p>
            </div>
            
            <h2>💡 使用技巧</h2>
            <div class="feature">
                <ul>
                    <li>使用半透明显示模式查看模型内部结构</li>
                    <li>分阶段显示可以更好理解施工过程</li>
                    <li>监测点有助于跟踪关键位置的响应</li>
                    <li>定期保存项目以防数据丢失</li>
                </ul>
            </div>
            
            <p><em>选择左侧目录中的主题查看详细帮助信息。</em></p>
        </body>
        </html>
        """
        self.content_area.setHtml(welcome_html)
        
    def on_item_selected(self, current, previous):
        """帮助项目选择改变"""
        if current is None:
            return
            
        data = current.data(0, Qt.ItemDataRole.UserRole)
        if data and data["type"] == "topic":
            self.show_topic_content(data["content"], data["name"])
            
    def show_topic_content(self, content: Dict[str, Any], topic_name: str):
        """显示主题内容"""
        html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 20px; }}
                h1 {{ color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }}
                h2 {{ color: #34495e; margin-top: 25px; }}
                .description {{ background: #ecf0f1; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .steps {{ background: #e8f5e8; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .tips {{ background: #fff3cd; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .solutions {{ background: #f8d7da; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                ol, ul {{ margin: 10px 0; padding-left: 25px; }}
                li {{ margin: 5px 0; }}
            </style>
        </head>
        <body>
            <h1>📖 {topic_name}</h1>
        """
        
        if "description" in content:
            html += f"""
            <h2>📝 功能说明</h2>
            <div class="description">
                <p>{content["description"]}</p>
            </div>
            """
            
        if "steps" in content:
            html += """
            <h2>📋 操作步骤</h2>
            <div class="steps">
                <ol>
            """
            for step in content["steps"]:
                html += f"<li>{step}</li>"
            html += "</ol></div>"
            
        if "tips" in content:
            html += """
            <h2>💡 使用技巧</h2>
            <div class="tips">
                <ul>
            """
            for tip in content["tips"]:
                html += f"<li>{tip}</li>"
            html += "</ul></div>"
            
        if "solutions" in content:
            html += """
            <h2>🔧 解决方案</h2>
            <div class="solutions">
                <ul>
            """
            for solution in content["solutions"]:
                html += f"<li>{solution}</li>"
            html += "</ul></div>"
            
        html += "</body></html>"
        self.content_area.setHtml(html)
        
    def on_search_text_changed(self, text: str):
        """搜索文本改变"""
        if not text.strip():
            self.populate_help_tree()
            return
            
        # 简单搜索实现
        self.help_tree.clear()
        search_text = text.lower()
        
        for category, topics in self.help_data.items():
            category_item = None
            
            for topic, content in topics.items():
                # 检查是否匹配
                if (search_text in topic.lower() or 
                    search_text in content.get("description", "").lower()):
                    
                    if category_item is None:
                        category_item = QTreeWidgetItem([category])
                        category_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "category", "name": category})
                        
                    topic_item = QTreeWidgetItem([topic])
                    topic_item.setData(0, Qt.ItemDataRole.UserRole, {
                        "type": "topic", 
                        "category": category, 
                        "name": topic,
                        "content": content
                    })
                    category_item.addChild(topic_item)
                    
            if category_item is not None:
                self.help_tree.addTopLevelItem(category_item)
                
        self.help_tree.expandAll()

class OperationWizard(QWizard):
    """操作向导"""
    
    def __init__(self, wizard_type: str, parent=None):
        super().__init__(parent)
        self.wizard_type = wizard_type
        self.setWindowTitle(f"{wizard_type}向导")
        self.setWizardStyle(QWizard.WizardStyle.ModernStyle)
        self.resize(600, 500)
        
        if wizard_type == "模型导入":
            self.setup_import_wizard()
        elif wizard_type == "分析设置":
            self.setup_analysis_wizard()
        elif wizard_type == "结果查看":
            self.setup_result_wizard()
            
    def setup_import_wizard(self):
        """设置模型导入向导"""
        # 欢迎页
        welcome_page = QWizardPage()
        welcome_page.setTitle("欢迎使用模型导入向导")
        welcome_page.setSubTitle("本向导将帮助您导入FPN格式的有限元模型")
        
        layout = QVBoxLayout()
        welcome_text = QLabel("""
        <h3>导入向导将帮助您：</h3>
        <ul>
            <li>选择和验证FPN文件</li>
            <li>配置导入参数</li>
            <li>检查导入结果</li>
            <li>设置材料参数</li>
        </ul>
        <p><b>准备工作：</b>确保您的FPN文件格式正确且包含完整的模型信息。</p>
        """)
        layout.addWidget(welcome_text)
        welcome_page.setLayout(layout)
        self.addPage(welcome_page)
        
        # 文件选择页
        file_page = QWizardPage()
        file_page.setTitle("选择FPN文件")
        file_page.setSubTitle("请选择要导入的FPN文件")
        
        layout = QVBoxLayout()
        
        file_layout = QHBoxLayout()
        self.file_path_edit = QLineEdit()
        self.browse_btn = QPushButton("浏览...")
        self.browse_btn.clicked.connect(self.browse_file)
        file_layout.addWidget(QLabel("文件路径:"))
        file_layout.addWidget(self.file_path_edit)
        file_layout.addWidget(self.browse_btn)
        layout.addLayout(file_layout)
        
        # 文件信息显示
        self.file_info = QTextEdit()
        self.file_info.setMaximumHeight(200)
        layout.addWidget(QLabel("文件信息:"))
        layout.addWidget(self.file_info)
        
        file_page.setLayout(layout)
        self.addPage(file_page)
        
        # 完成页
        finish_page = QWizardPage()
        finish_page.setTitle("导入完成")
        finish_page.setSubTitle("模型导入成功，您可以继续进行分析设置")
        
        layout = QVBoxLayout()
        finish_text = QLabel("""
        <h3>导入成功！</h3>
        <p>您的模型已成功导入到系统中。</p>
        <p><b>下一步建议：</b></p>
        <ul>
            <li>检查材料参数设置</li>
            <li>验证边界条件</li>
            <li>设置分析参数</li>
        </ul>
        """)
        layout.addWidget(finish_text)
        finish_page.setLayout(layout)
        self.addPage(finish_page)
        
    def browse_file(self):
        """浏览文件"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "选择FPN文件", "", "FPN文件 (*.fpn);;所有文件 (*)"
        )
        if file_path:
            self.file_path_edit.setText(file_path)
            self.analyze_file(file_path)
            
    def analyze_file(self, file_path: str):
        """分析文件信息"""
        try:
            file_size = Path(file_path).stat().st_size
            size_mb = file_size / (1024 * 1024)
            
            info_text = f"""
文件路径: {file_path}
文件大小: {size_mb:.2f} MB
状态: 文件存在且可读取

注意事项:
- 确保文件编码正确（UTF-8或GB18030）
- 大文件可能需要较长导入时间
- 导入前请备份原始文件
            """
            self.file_info.setPlainText(info_text)
        except Exception as e:
            self.file_info.setPlainText(f"文件分析失败: {e}")
            
    def setup_analysis_wizard(self):
        """设置分析向导"""
        # 这里可以添加分析设置向导的页面
        pass
        
    def setup_result_wizard(self):
        """设置结果查看向导"""
        # 这里可以添加结果查看向导的页面
        pass

class TooltipManager:
    """工具提示管理器"""
    
    @staticmethod
    def setup_tooltips(main_window):
        """为主窗口设置工具提示"""
        tooltips = {
            # 前处理相关
            "import_fpn_btn": "导入FPN格式的有限元模型文件\n支持MIDAS生成的FPN文件",
            "material_manager_btn": "打开材料库管理界面\n可以编辑土体、混凝土、钢材等材料参数",
            "show_mesh_cb": "显示/隐藏网格边线\n有助于查看单元划分情况",
            "show_nodes_cb": "显示/隐藏节点标记\n用于查看节点分布",
            "show_supports_cb": "显示/隐藏边界条件\n显示约束和支承位置",
            "show_loads_cb": "显示/隐藏荷载标记\n显示施加的荷载",
            
            # 分析相关
            "run_analysis_btn": "开始Kratos有限元分析\n确保模型和参数设置正确",
            "pause_analysis_btn": "暂停当前正在进行的分析\n可以稍后恢复计算",
            "stop_analysis_btn": "停止分析计算\n将终止当前计算过程",
            "max_iterations": "设置非线性分析的最大迭代次数\n建议值：50-200",
            "convergence_combo": "选择收敛精度等级\n精确模式计算时间更长但结果更准确",
            
            # 后处理相关
            "result_type": "选择要显示的结果类型\n位移用于变形分析，应力用于强度评估",
            "component_type": "选择结果分量\n合成值显示总体大小，分量显示方向信息",
            "time_slider": "选择时间步\n对应不同的施工阶段",
            "play_btn": "播放动画\n显示整个施工过程的演化",
            "deform_scale": "设置变形放大倍数\n用于夸大显示微小变形",
            
            # 专业功能
            "show_diaphragm_wall_cb": "显示/隐藏地连墙\n基坑工程主要支护结构",
            "show_piles_cb": "显示/隐藏桩基\n深基础支撑结构",
            "show_anchors_cb": "显示/隐藏预应力锚杆\n主动支护构件",
            "show_strutting_cb": "显示/隐藏内撑\n水平支撑系统"
        }
        
        # 递归设置工具提示
        TooltipManager._set_tooltips_recursive(main_window, tooltips)
        
    @staticmethod
    def _set_tooltips_recursive(widget, tooltips: Dict[str, str]):
        """递归设置工具提示"""
        if hasattr(widget, 'objectName'):
            name = widget.objectName()
            if name in tooltips:
                widget.setToolTip(tooltips[name])
                
        # 递归处理子组件
        for child in widget.findChildren(QWidget):
            TooltipManager._set_tooltips_recursive(child, tooltips)

class StatusIndicator(QWidget):
    """状态指示器"""
    
    def __init__(self):
        super().__init__()
        self.current_status = "ready"
        self.setup_ui()
        
        # 动画定时器
        self.animation_timer = QTimer()
        self.animation_timer.timeout.connect(self.update_animation)
        self.animation_frame = 0
        
    def setup_ui(self):
        """设置界面"""
        layout = QHBoxLayout(self)
        layout.setContentsMargins(5, 2, 5, 2)
        
        self.status_label = QLabel("就绪")
        self.status_label.setMinimumWidth(60)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setMaximumHeight(16)
        
        layout.addWidget(self.status_label)
        layout.addWidget(self.progress_bar)
        
    def set_status(self, status: str, message: str = "", progress: int = -1):
        """设置状态"""
        self.current_status = status
        
        status_colors = {
            "ready": "#28a745",      # 绿色
            "working": "#ffc107",    # 黄色  
            "error": "#dc3545",      # 红色
            "warning": "#fd7e14"     # 橙色
        }
        
        status_icons = {
            "ready": "●",
            "working": "⟳",
            "error": "✗",
            "warning": "⚠"
        }
        
        color = status_colors.get(status, "#6c757d")
        icon = status_icons.get(status, "●")
        
        self.status_label.setText(f'<span style="color: {color};">{icon}</span> {message or status}')
        
        if status == "working" and progress >= 0:
            self.progress_bar.setVisible(True)
            self.progress_bar.setValue(progress)
            if not self.animation_timer.isActive():
                self.animation_timer.start(100)
        else:
            self.progress_bar.setVisible(False)
            self.animation_timer.stop()
            
    def update_animation(self):
        """更新动画"""
        if self.current_status == "working":
            self.animation_frame = (self.animation_frame + 1) % 8
            dots = "." * (self.animation_frame % 4 + 1)
            current_text = self.status_label.text()
            # 移除之前的点，添加新的点
            base_text = current_text.split('.')[0]
            self.status_label.setText(f"{base_text}{dots}")

class ShortcutManager:
    """快捷键管理器"""
    
    @staticmethod
    def setup_shortcuts(main_window):
        """设置快捷键"""
        shortcuts = [
            ("Ctrl+O", "打开文件", main_window.import_fpn_file),
            ("Ctrl+S", "保存项目", lambda: main_window.save_project()),
            ("F5", "刷新显示", lambda: main_window.preprocessor.display_mesh()),
            ("F11", "全屏模式", lambda: main_window.toggle_fullscreen()),
            ("Ctrl+H", "帮助", lambda: main_window.show_help()),
            ("Ctrl+M", "材料管理", lambda: main_window.open_material_manager()),
            ("Ctrl+R", "运行分析", main_window.run_analysis),
            ("Escape", "停止分析", main_window.stop_analysis),
            ("Ctrl+1", "前处理", lambda: main_window.workflow_tabs.setCurrentIndex(0)),
            ("Ctrl+2", "分析", lambda: main_window.workflow_tabs.setCurrentIndex(1)),
            ("Ctrl+3", "后处理", lambda: main_window.workflow_tabs.setCurrentIndex(2)),
        ]
        
        for key_sequence, description, callback in shortcuts:
            action = QAction(description, main_window)
            action.setShortcut(QKeySequence(key_sequence))
            action.triggered.connect(callback)
            main_window.addAction(action)
            
        # 显示快捷键提示
        shortcut_tip = "快捷键提示:\n"
        for key_sequence, description, _ in shortcuts:
            shortcut_tip += f"{key_sequence}: {description}\n"
            
        # 可以在状态栏或帮助中显示这些快捷键

if __name__ == "__main__":
    app = QApplication(sys.argv)
    
    # 测试帮助系统
    help_widget = HelpSystem()
    help_widget.setWindowTitle("DeepCAD 帮助系统")
    help_widget.resize(1000, 700)
    help_widget.show()
    
    # 测试操作向导
    wizard = OperationWizard("模型导入")
    wizard.show()
    
    # 测试状态指示器
    status_widget = QWidget()
    layout = QVBoxLayout(status_widget)
    
    status_indicator = StatusIndicator()
    layout.addWidget(status_indicator)
    
    # 测试按钮
    btn_layout = QHBoxLayout()
    ready_btn = QPushButton("就绪")
    working_btn = QPushButton("工作中")
    error_btn = QPushButton("错误")
    
    ready_btn.clicked.connect(lambda: status_indicator.set_status("ready", "系统就绪"))
    working_btn.clicked.connect(lambda: status_indicator.set_status("working", "正在计算", 50))
    error_btn.clicked.connect(lambda: status_indicator.set_status("error", "计算失败"))
    
    btn_layout.addWidget(ready_btn)
    btn_layout.addWidget(working_btn)
    btn_layout.addWidget(error_btn)
    
    layout.addLayout(btn_layout)
    
    status_widget.setWindowTitle("状态指示器测试")
    status_widget.show()
    
    sys.exit(app.exec())