#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动加载 FPN -> 执行分析 -> 切换到后处理显示结果
用法: python example2/auto_run_fpn_compute.py
"""

import sys
from pathlib import Path
from PyQt6.QtWidgets import QApplication

# 确保工程根在路径上
ROOT = Path(__file__).parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from example2.gui.main_window import MainWindow


def load_fpn(window: MainWindow, fpn_path: Path) -> bool:
    try:
        if not fpn_path.exists():
            print(f"❌ FPN文件不存在: {fpn_path}")
            return False
        print(f"📄 加载FPN: {fpn_path}")
        window.preprocessor.load_fpn_file(str(fpn_path))
        # 刷新界面信息
        try:
            window.update_model_info()
            if hasattr(window, 'update_physics_combos'):
                window.update_physics_combos()
        except Exception as e:
            print(f"更新UI信息失败(可忽略): {e}")
        return True
    except Exception as e:
        print(f"加载FPN失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def start_simple_demo(window: MainWindow):
    """简化演示：直接加载示例结果并切换到后处理"""
    try:
        print("🚀 启动简化演示...")

        # 直接创建示例结果
        window.postprocessor.create_sample_results()

        # 切换到后处理标签
        try:
            window.workflow_tabs.setCurrentIndex(2)
            print("✅ 已切换到后处理标签，可以查看示例结果")
        except Exception as e:
            print(f"切换标签失败: {e}")

    except Exception as e:
        print(f"简化演示失败: {e}")
        import traceback
        traceback.print_exc()


def main():
    app = QApplication(sys.argv)
    win = MainWindow()
    win.show()

    fpn = Path(__file__).parent / 'data' / '两阶段计算2.fpn'

    # 先加载FPN以便前处理有数据显示
    if load_fpn(win, fpn):
        print("✅ FPN加载成功，现在启动简化演示")
        # 使用简化演示，避免复杂的分析流程
        start_simple_demo(win)
    else:
        print("⚠️ 无法加载FPN，直接展示后处理示例结果")
        start_simple_demo(win)

    sys.exit(app.exec())


if __name__ == '__main__':
    main()

