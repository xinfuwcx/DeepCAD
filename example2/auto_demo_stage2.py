#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动演示：
- 启动桌面版主界面
- 自动加载 example2/data/两阶段计算2.fpn
- 自动切换至第2个分析步（若存在）
运行: python example2/auto_demo_stage2.py
"""
import sys
from pathlib import Path
from PyQt6.QtWidgets import QApplication

# 确保工程根在路径上
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from example2.gui.main_window import MainWindow

def main():
    app = QApplication(sys.argv)
    win = MainWindow()
    win.show()

    fpn = Path(__file__).parent / 'data' / '两阶段计算2.fpn'
    print('FPN exists:', fpn.exists(), 'path=', fpn)

    try:
        # 直接通过预处理器加载，绕过文件对话框
        win.preprocessor.load_fpn_file(str(fpn))
        win.update_model_info()
        win.update_physics_combos()

        # 自动切换到第二个分析步（索引1）
        combo = getattr(win, 'analysis_stage_combo', None)
        if combo and combo.count() >= 2:
            combo.setCurrentIndex(1)
            # 触发变更逻辑
            win.on_analysis_stage_changed(combo.currentText())
            print('Switched to stage index 1')
        else:
            print('No second stage available in combo')
    except Exception as e:
        print('Auto demo failed:', e)

    sys.exit(app.exec())

if __name__ == '__main__':
    main()

