#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
帮助系统 - HelpSystem
为Example2提供用户指导和帮助文档
"""

from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QTabWidget, 
    QTextEdit, QLabel, QPushButton, QListWidget, 
    QListWidgetItem, QSplitter, QFrame
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont, QPixmap


class HelpDialog(QDialog):
    """帮助对话框"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Example2 用户指南")
        self.setGeometry(200, 200, 900, 700)
        self.setup_ui()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # 标题
        title_label = QLabel("📚 Example2 MIDAS模型计算程序用户指南")
        title_font = QFont()
        title_font.setPointSize(16)
        title_font.setBold(True)
        title_label.setFont(title_font)
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title_label.setStyleSheet("""
            QLabel {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 #2196F3, stop:1 #1976D2);
                color: white;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 10px;
            }
        """)
        layout.addWidget(title_label)
        
        # 创建分割器
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # 左侧导航
        nav_widget = self.create_navigation()
        nav_widget.setMaximumWidth(250)
        splitter.addWidget(nav_widget)
        
        # 右侧内容
        content_widget = self.create_content()
        splitter.addWidget(content_widget)
        
        splitter.setSizes([250, 650])
        layout.addWidget(splitter)
        
        # 底部按钮
        button_layout = QHBoxLayout()
        button_layout.addStretch()
        
        close_btn = QPushButton("关闭")
        close_btn.clicked.connect(self.close)
        button_layout.addWidget(close_btn)
        
        layout.addLayout(button_layout)
    
    def create_navigation(self):
        """创建导航面板"""
        nav_widget = QFrame()
        nav_widget.setFrameStyle(QFrame.Shape.StyledPanel)
        
        layout = QVBoxLayout(nav_widget)
        
        nav_label = QLabel("📖 帮助主题")
        nav_label.setFont(QFont("Microsoft YaHei", 10, QFont.Weight.Bold))
        layout.addWidget(nav_label)
        
        self.nav_list = QListWidget()
        
        # 添加帮助主题
        topics = [
            ("🚀 快速开始", "quick_start"),
            ("📁 FPN文件导入", "fpn_import"),
            ("🔧 前处理操作", "preprocessing"),
            ("🧮 分析计算", "analysis"),
            ("📊 后处理结果", "postprocessing"),
            ("⚙️ 设置配置", "settings"),
            ("🔧 故障排除", "troubleshooting"),
            ("❓ 常见问题", "faq"),
        ]
        
        for topic_name, topic_id in topics:
            item = QListWidgetItem(topic_name)
            item.setData(Qt.ItemDataRole.UserRole, topic_id)
            self.nav_list.addItem(item)
        
        self.nav_list.currentItemChanged.connect(self.on_topic_changed)
        
        layout.addWidget(self.nav_list)
        
        # 选中第一项
        self.nav_list.setCurrentRow(0)
        
        return nav_widget
    
    def create_content(self):
        """创建内容面板"""
        self.content_area = QTextEdit()
        self.content_area.setReadOnly(True)
        self.content_area.setFont(QFont("Microsoft YaHei", 10))
        
        return self.content_area
    
    def on_topic_changed(self, current, previous):
        """主题切换事件"""
        if current:
            topic_id = current.data(Qt.ItemDataRole.UserRole)
            content = self.get_topic_content(topic_id)
            self.content_area.setHtml(content)
    
    def get_topic_content(self, topic_id):
        """获取主题内容"""
        contents = {
            "quick_start": self.get_quick_start_content(),
            "fpn_import": self.get_fpn_import_content(),
            "preprocessing": self.get_preprocessing_content(),
            "analysis": self.get_analysis_content(),
            "postprocessing": self.get_postprocessing_content(),
            "settings": self.get_settings_content(),
            "troubleshooting": self.get_troubleshooting_content(),
            "faq": self.get_faq_content(),
        }
        
        return contents.get(topic_id, "<h3>内容开发中...</h3>")
    
    def get_quick_start_content(self):
        """快速开始内容"""
        return """
        <h2>🚀 快速开始</h2>
        <p>欢迎使用Example2 MIDAS模型计算程序！这是一个专业的基坑分析软件。</p>
        
        <h3>📋 基本工作流程</h3>
        <ol>
            <li><b>前处理</b> - 导入FPN文件，查看模型</li>
            <li><b>分析计算</b> - 设置参数，运行Kratos分析</li>
            <li><b>后处理</b> - 查看结果，生成报告</li>
        </ol>
        
        <h3>🎯 第一次使用步骤</h3>
        <ol>
            <li>点击 <b>前处理</b> 标签页</li>
            <li>点击 <b>📁 导入FPN</b> 按钮</li>
            <li>选择您的MIDAS FPN文件</li>
            <li>等待文件加载完成</li>
            <li>在3D视图中查看模型</li>
            <li>切换到 <b>分析</b> 标签页开始计算</li>
        </ol>
        
        <h3>💡 重要提示</h3>
        <ul>
            <li>确保已安装Kratos Multiphysics</li>
            <li>推荐使用4GB以上内存</li>
            <li>支持的文件格式：.fpn (MIDAS)</li>
            <li>分析结果保存在temp_kratos_analysis目录</li>
        </ul>
        """
    
    def get_fpn_import_content(self):
        """FPN导入内容"""
        return """
        <h2>📁 FPN文件导入</h2>
        <p>Example2支持导入MIDAS FPN格式的有限元模型文件。</p>
        
        <h3>🔄 导入步骤</h3>
        <ol>
            <li>点击 <b>📁 导入FPN</b> 按钮</li>
            <li>在文件对话框中选择.fpn文件</li>
            <li>等待解析完成（进度条显示）</li>
            <li>查看导入结果信息</li>
        </ol>
        
        <h3>📊 支持的数据类型</h3>
        <ul>
            <li><b>节点</b> - 坐标、约束条件</li>
            <li><b>单元</b> - 四面体、六面体网格</li>
            <li><b>材料</b> - 土体、结构材料属性</li>
            <li><b>边界条件</b> - 位移约束、荷载</li>
            <li><b>分析步</b> - 多阶段施工序列</li>
        </ul>
        
        <h3>🎯 专业构件识别</h3>
        <p>系统自动识别以下地下工程构件：</p>
        <ul>
            <li><b>土体</b> - 根据材料类型自动分类</li>
            <li><b>地连墙</b> - 围护结构识别</li>
            <li><b>桩基</b> - 基础结构识别</li>
            <li><b>锚杆</b> - 预应力支护识别</li>
            <li><b>内撑</b> - 支撑体系识别</li>
        </ul>
        
        <h3>⚠️ 注意事项</h3>
        <ul>
            <li>大模型（>50万单元）加载较慢，请耐心等待</li>
            <li>确保FPN文件编码为UTF-8或GBK</li>
            <li>检查文件完整性，避免损坏文件</li>
        </ul>
        """
    
    def get_preprocessing_content(self):
        """前处理内容"""
        return """
        <h2>🔧 前处理操作</h2>
        <p>前处理模块提供强大的模型查看和编辑功能。</p>
        
        <h3>👁️ 显示控制</h3>
        <h4>显示模式</h4>
        <ul>
            <li><b>线框模式</b> - 显示网格轮廓</li>
            <li><b>实体模式</b> - 显示实体填充</li>
            <li><b>半透明模式</b> - 透明显示（推荐）</li>
        </ul>
        
        <h4>显示选项</h4>
        <ul>
            <li><b>网格边</b> - 显示/隐藏网格线</li>
            <li><b>节点</b> - 显示/隐藏节点点</li>
            <li><b>支承</b> - 显示/隐藏边界条件</li>
            <li><b>荷载</b> - 显示/隐藏荷载向量</li>
        </ul>
        
        <h3>🏗️ 工程构件显示</h3>
        <ul>
            <li><b>土体</b> - 按分层显示土体</li>
            <li><b>地连墙</b> - 围护墙体显示</li>
            <li><b>锚杆</b> - 预应力锚杆</li>
            <li><b>桩基</b> - 基础桩体</li>
            <li><b>内撑</b> - 支撑体系</li>
        </ul>
        
        <h3>📋 物理组选择</h3>
        <ul>
            <li><b>材料组</b> - 按材料类型过滤</li>
            <li><b>荷载组</b> - 按荷载类型过滤</li>
            <li><b>边界组</b> - 按边界条件过滤</li>
        </ul>
        
        <h3>🎮 3D视图操作</h3>
        <ul>
            <li><b>旋转</b> - 鼠标左键拖拽</li>
            <li><b>平移</b> - 鼠标中键拖拽</li>
            <li><b>缩放</b> - 鼠标滚轮</li>
            <li><b>重置视图</b> - 点击重置按钮</li>
        </ul>
        
        <h3>⚡ 性能优化</h3>
        <ul>
            <li>大模型自动关闭高负载显示选项</li>
            <li>异步渲染避免界面卡顿</li>
            <li>智能缓存提升响应速度</li>
        </ul>
        """
    
    def get_analysis_content(self):
        """分析内容"""
        return """
        <h2>🧮 分析计算</h2>
        <p>Example2集成Kratos Multiphysics进行专业有限元分析。</p>
        
        <h3>📋 分析类型</h3>
        <ul>
            <li><b>非线性静力分析</b> - 基坑开挖主要分析类型</li>
            <li><b>摩尔-库伦本构</b> - 土体材料模型</li>
            <li><b>多阶段施工</b> - 考虑施工过程</li>
        </ul>
        
        <h3>🏗️ 施工步序</h3>
        <p>系统自动从FPN文件识别施工步序：</p>
        <ul>
            <li><b>初始平衡</b> - 重力场平衡</li>
            <li><b>开挖阶段</b> - 分层开挖</li>
            <li><b>支护安装</b> - 支撑体系激活</li>
        </ul>
        
        <h3>⚙️ 求解参数</h3>
        <ul>
            <li><b>最大迭代次数</b> - 控制收敛计算</li>
            <li><b>收敛精度</b> - 精度控制</li>
            <li><b>求解器类型</b> - Newton-Raphson推荐</li>
        </ul>
        
        <h3>🚀 开始分析</h3>
        <ol>
            <li>确保已导入FPN模型</li>
            <li>检查施工步序设置</li>
            <li>调整求解参数（可选）</li>
            <li>点击 <b>🚀 开始分析</b></li>
            <li>监控计算进度</li>
            <li>等待分析完成</li>
        </ol>
        
        <h3>📊 监控信息</h3>
        <ul>
            <li><b>总体进度</b> - 分析整体进度</li>
            <li><b>当前步骤</b> - 当前施工步</li>
            <li><b>迭代进度</b> - 收敛迭代</li>
            <li><b>计算日志</b> - 详细输出信息</li>
        </ul>
        
        <h3>🔧 Kratos状态</h3>
        <ul>
            <li><b>🟢 Kratos</b> - 引擎正常可用</li>
            <li><b>🔴 Kratos</b> - 引擎不可用</li>
            <li><b>⚠️ Kratos</b> - 状态未知</li>
        </ul>
        """
    
    def get_postprocessing_content(self):
        """后处理内容"""
        return """
        <h2>📊 后处理结果</h2>
        <p>后处理模块提供丰富的结果可视化功能。</p>
        
        <h3>📂 结果加载</h3>
        <ul>
            <li><b>自动加载</b> - 分析完成后自动加载</li>
            <li><b>手动加载</b> - 加载VTK结果文件</li>
            <li><b>分析步选择</b> - 选择特定施工阶段</li>
        </ul>
        
        <h3>📈 结果类型</h3>
        <ul>
            <li><b>位移</b> - 节点位移矢量</li>
            <li><b>反力</b> - 约束反力</li>
            <li><b>应力</b> - 单元应力分布</li>
            <li><b>应变</b> - 单元应变分布</li>
        </ul>
        
        <h3>🎨 显示设置</h3>
        <ul>
            <li><b>显示变形</b> - 变形后形状</li>
            <li><b>变形比例</b> - 放大变形程度</li>
            <li><b>显示云图</b> - 等值线云图</li>
            <li><b>显示线框</b> - 网格线框</li>
        </ul>
        
        <h3>⏰ 时间步控制</h3>
        <ul>
            <li><b>时间滑块</b> - 选择时间步</li>
            <li><b>动画播放</b> - 播放时间历程</li>
            <li><b>播放控制</b> - 播放/暂停/停止</li>
        </ul>
        
        <h3>💾 结果导出</h3>
        <ul>
            <li><b>🖼️ 导出图片</b> - PNG/JPG格式</li>
            <li><b>🎬 导出动画</b> - GIF/MP4格式</li>
            <li><b>📊 导出数据</b> - CSV/Excel格式</li>
            <li><b>📋 生成报告</b> - PDF报告</li>
        </ul>
        
        <h3>🎯 专业分析</h3>
        <ul>
            <li><b>最大位移</b> - 关键位移监测</li>
            <li><b>地表沉降</b> - 周边影响分析</li>
            <li><b>围护结构</b> - 支护效果评估</li>
            <li><b>安全评价</b> - 稳定性分析</li>
        </ul>
        """
    
    def get_settings_content(self):
        """设置内容"""
        return """
        <h2>⚙️ 设置配置</h2>
        <p>Example2提供丰富的配置选项来优化使用体验。</p>
        
        <h3>🎨 界面设置</h3>
        <ul>
            <li><b>主题</b> - 现代化界面主题</li>
            <li><b>语言</b> - 中文界面</li>
            <li><b>记住窗口状态</b> - 保存窗口位置</li>
        </ul>
        
        <h3>⚡ 性能设置</h3>
        <ul>
            <li><b>网格边显示阈值</b> - 大模型性能保护</li>
            <li><b>异步显示更新</b> - 防止界面卡顿</li>
            <li><b>3D几何缓存</b> - 提升渲染性能</li>
            <li><b>内存警告阈值</b> - 内存使用监控</li>
        </ul>
        
        <h3>🧮 分析设置</h3>
        <ul>
            <li><b>默认求解器</b> - Newton-Raphson</li>
            <li><b>最大迭代次数</b> - 收敛控制</li>
            <li><b>收敛精度</b> - 精度控制</li>
            <li><b>并行计算</b> - 多核优化</li>
        </ul>
        
        <h3>👁️ 可视化设置</h3>
        <ul>
            <li><b>背景颜色</b> - 渐变蓝色主题</li>
            <li><b>材料图例</b> - 显示/隐藏图例</li>
            <li><b>坐标轴</b> - 显示坐标轴</li>
            <li><b>透明度</b> - 半透明效果</li>
        </ul>
        
        <h3>📁 文件路径</h3>
        <ul>
            <li><b>项目目录</b> - 默认项目保存位置</li>
            <li><b>临时分析目录</b> - Kratos计算临时文件</li>
            <li><b>导出目录</b> - 结果导出位置</li>
            <li><b>日志目录</b> - 运行日志位置</li>
        </ul>
        
        <h3>🔧 Kratos设置</h3>
        <ul>
            <li><b>自动检测</b> - 自动检测Kratos安装</li>
            <li><b>安装路径</b> - 手动指定Kratos路径</li>
            <li><b>应用程序</b> - 加载的Kratos应用</li>
        </ul>
        """
    
    def get_troubleshooting_content(self):
        """故障排除内容"""
        return """
        <h2>🔧 故障排除</h2>
        <p>遇到问题？这里有常见问题的解决方案。</p>
        
        <h3>❌ Kratos相关问题</h3>
        <h4>状态显示🔴 Kratos</h4>
        <ul>
            <li><b>原因</b>：Kratos Multiphysics未安装或路径错误</li>
            <li><b>解决</b>：检查Kratos安装，确保Python能导入KratosMultiphysics</li>
            <li><b>验证</b>：在Python中运行 <code>import KratosMultiphysics</code></li>
        </ul>
        
        <h3>🐌 性能问题</h3>
        <h4>界面卡顿或崩溃</h4>
        <ul>
            <li><b>原因</b>：模型过大，超出显卡处理能力</li>
            <li><b>解决</b>：关闭"网格边"、"节点"等高负载显示选项</li>
            <li><b>优化</b>：使用"半透明模式"替代"实体模式"</li>
        </ul>
        
        <h4>内存不足</h4>
        <ul>
            <li><b>症状</b>：程序崩溃，状态栏显示内存过高</li>
            <li><b>解决</b>：关闭不必要的显示选项，重启程序</li>
            <li><b>建议</b>：使用8GB以上内存处理大模型</li>
        </ul>
        
        <h3>📁 文件导入问题</h3>
        <h4>FPN文件加载失败</h4>
        <ul>
            <li><b>编码问题</b>：确保文件编码为UTF-8或GBK</li>
            <li><b>格式问题</b>：检查文件完整性，重新从MIDAS导出</li>
            <li><b>权限问题</b>：确保文件可读，路径中无特殊字符</li>
        </ul>
        
        <h3>🧮 分析计算问题</h3>
        <h4>分析无法启动</h4>
        <ul>
            <li><b>检查1</b>：确保已导入FPN模型</li>
            <li><b>检查2</b>：确认Kratos状态为🟢</li>
            <li><b>检查3</b>：查看计算日志错误信息</li>
        </ul>
        
        <h4>分析不收敛</h4>
        <ul>
            <li><b>增加迭代次数</b>：提高最大迭代次数</li>
            <li><b>调整精度</b>：适当放宽收敛精度</li>
            <li><b>检查模型</b>：确认边界条件和材料参数合理</li>
        </ul>
        
        <h3>🖥️ 3D显示问题</h3>
        <h4>黑屏或显示异常</h4>
        <ul>
            <li><b>原因</b>：OpenGL驱动问题</li>
            <li><b>解决</b>：更新显卡驱动</li>
            <li><b>备选</b>：点击"刷新视图"重建3D视口</li>
        </ul>
        
        <h3>💾 保存和导出问题</h3>
        <h4>结果导出失败</h4>
        <ul>
            <li><b>权限问题</b>：检查导出目录写入权限</li>
            <li><b>路径问题</b>：避免中文路径和特殊字符</li>
            <li><b>格式问题</b>：确认选择正确的导出格式</li>
        </ul>
        
        <h3>🆘 获取帮助</h3>
        <ul>
            <li><b>查看日志</b>：检查logs目录下的错误日志</li>
            <li><b>重启程序</b>：关闭重启往往能解决临时问题</li>
            <li><b>联系支持</b>：提供错误信息和操作步骤</li>
        </ul>
        """
    
    def get_faq_content(self):
        """常见问题内容"""
        return """
        <h2>❓ 常见问题</h2>
        <p>用户最关心的问题和解答。</p>
        
        <h3>🎯 基本使用</h3>
        
        <h4>Q: Example2支持哪些文件格式？</h4>
        <p><b>A:</b> 目前主要支持MIDAS FPN格式。后续版本将支持更多格式如ANSYS、ABAQUS等。</p>
        
        <h4>Q: 分析结果保存在哪里？</h4>
        <p><b>A:</b> 结果保存在项目目录的temp_kratos_analysis文件夹中，包含VTK格式的结果文件。</p>
        
        <h4>Q: 可以处理多大的模型？</h4>
        <p><b>A:</b> 理论上无限制，但建议：</p>
        <ul>
            <li>小模型（<10万单元）：流畅运行</li>
            <li>中等模型（10-50万单元）：正常运行</li>
            <li>大模型（>50万单元）：需要优化显示选项</li>
        </ul>
        
        <h3>🔧 技术问题</h3>
        
        <h4>Q: 为什么需要Kratos Multiphysics？</h4>
        <p><b>A:</b> Kratos是开源的多物理场有限元框架，提供：</p>
        <ul>
            <li>高性能并行计算</li>
            <li>丰富的本构模型</li>
            <li>专业的岩土工程应用</li>
        </ul>
        
        <h4>Q: 如何安装Kratos？</h4>
        <p><b>A:</b> 推荐使用conda安装：</p>
        <pre>conda install -c conda-forge kratos-multiphysics</pre>
        
        <h4>Q: 分析计算很慢怎么办？</h4>
        <p><b>A:</b> 可以尝试：</p>
        <ul>
            <li>减少迭代次数</li>
            <li>简化模型复杂度</li>
            <li>使用多核并行计算</li>
            <li>优化网格质量</li>
        </ul>
        
        <h3>📊 结果分析</h3>
        
        <h4>Q: 如何查看变形动画？</h4>
        <p><b>A:</b> 在后处理模块：</p>
        <ol>
            <li>加载分析结果</li>
            <li>选择"显示变形"</li>
            <li>调整变形比例</li>
            <li>点击"播放"按钮</li>
        </ol>
        
        <h4>Q: 云图颜色含义？</h4>
        <p><b>A:</b> 云图使用彩虹色标：</p>
        <ul>
            <li><span style="color: blue;"><b>蓝色</b></span> - 最小值</li>
            <li><span style="color: green;"><b>绿色</b></span> - 中等值</li>
            <li><span style="color: red;"><b>红色</b></span> - 最大值</li>
        </ul>
        
        <h3>⚙️ 设置优化</h3>
        
        <h4>Q: 如何提高3D显示性能？</h4>
        <p><b>A:</b> 性能优化建议：</p>
        <ul>
            <li>关闭"网格边"显示</li>
            <li>使用"半透明模式"</li>
            <li>启用"异步显示更新"</li>
            <li>更新显卡驱动</li>
        </ul>
        
        <h4>Q: 界面可以自定义吗？</h4>
        <p><b>A:</b> 支持以下自定义：</p>
        <ul>
            <li>窗口布局和大小</li>
            <li>显示选项和颜色</li>
            <li>快捷键设置</li>
            <li>工作目录配置</li>
        </ul>
        
        <h3>🆘 问题反馈</h3>
        
        <h4>Q: 发现BUG如何反馈？</h4>
        <p><b>A:</b> 请提供以下信息：</p>
        <ul>
            <li>操作系统版本</li>
            <li>Python和依赖包版本</li>
            <li>详细的操作步骤</li>
            <li>错误信息截图</li>
            <li>模型文件（如可分享）</li>
        </ul>
        
        <h4>Q: 功能建议如何提交？</h4>
        <p><b>A:</b> 欢迎提交功能建议，包括：</p>
        <ul>
            <li>新的文件格式支持</li>
            <li>额外的分析类型</li>
            <li>界面改进建议</li>
            <li>工作流程优化</li>
        </ul>
        """


def show_help(parent=None):
    """显示帮助对话框"""
    dialog = HelpDialog(parent)
    dialog.exec()


if __name__ == "__main__":
    from PyQt6.QtWidgets import QApplication
    import sys
    
    app = QApplication(sys.argv)
    show_help()
    sys.exit(app.exec())
