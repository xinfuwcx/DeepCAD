#!/usr/bin/env python3
"""
调试分析功能 - 检查分析器是否正确工作
"""

import sys
import os
import time

# 添加当前目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QTimer

# 简化测试 - 直接测试分析器
def simple_analysis_test():
    """简化的分析器测试"""
    app = QApplication(sys.argv)

    try:
        # 导入分析器
        from modules.analyzer import Analyzer
        print("✅ 分析器导入成功")

        # 创建分析器实例
        analyzer = Analyzer()
        print("✅ 分析器创建成功")

        # 连接信号
        analyzer.log_message.connect(lambda msg: print(f"[LOG] {msg}"))
        analyzer.progress_updated.connect(lambda progress, msg: print(f"[PROGRESS] {progress}% - {msg}"))
        analyzer.step_completed.connect(lambda step_idx, results: print(f"[STEP_COMPLETED] 步骤{step_idx+1}完成"))
        analyzer.analysis_finished.connect(lambda success, msg: print(f"[FINISHED] 成功={success}, 消息={msg}"))

        # 创建默认分析步骤
        print("🔄 创建默认分析步骤...")
        analyzer.create_excavation_default_steps()

        print(f"📊 分析步数量: {len(analyzer.analysis_steps)}")
        for i, step in enumerate(analyzer.analysis_steps):
            print(f"   步骤{i+1}: {step.name} (类型: {step.step_type})")

        # 开始分析
        print(f"\n🚀 开始分析...")
        analyzer.start_analysis()

        # 运行30秒
        QTimer.singleShot(30000, app.quit)
        app.exec()

    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    simple_analysis_test()



if __name__ == "__main__":
    debug_analysis()
