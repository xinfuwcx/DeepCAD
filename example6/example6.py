#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Example6 主入口

支持 GUI 和 CLI 两种模式
"""

import sys
from pathlib import Path

# Ensure local imports resolve
_here = Path(__file__).parent
sys.path.insert(0, str(_here))

from .example6_config import default_config
from .example6_utils import select_ui_main


def main() -> int:
    """主入口：检测命令行参数决定启动 GUI 还是 CLI"""
    
    # 检查是否有 CLI 参数
    if len(sys.argv) > 1 and sys.argv[1] in ["solve", "batch", "info", "cae", "--help", "-h"]:
        # 启动 CLI 模式
        from .example6_cli import main as cli_main
        return cli_main()
    
    # 默认启动 GUI 模式
    cfg = default_config()
    ui_main = select_ui_main(cfg.ui.ui)
    return ui_main()  # underlying main will exit app loop


if __name__ == "__main__":
    sys.exit(main() or 0)
