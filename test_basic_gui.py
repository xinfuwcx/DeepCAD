#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Basic GUI Test - 基础界面测试
最简单的测试，确保界面能正常显示
"""

import sys
from pathlib import Path
import pandas as pd

# 添加路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from beautiful_geological_interface import BeautifulGeologyCAE
from PyQt6.QtWidgets import QApplication

def main():
    """最基础的测试"""
    print(">> 基础界面测试")
    print("=" * 30)
    
    # 检查数据文件
    data_file = Path("example3/data/realistic_borehole_data.csv")
    if data_file.exists():
        try:
            df = pd.read_csv(data_file)
            print(f"[OK] 数据文件存在: {len(df)} 条记录")
            
            # 检查关键列
            required_cols = ['borehole_id', 'formation_name', 'in_fault_zone']
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                print(f"[ERROR] 缺少列: {missing_cols}")
            else:
                print("[OK] 数据格式正确")
                
                # 简单统计
                formations = df['formation_name'].unique()
                fault_count = len(df[df['in_fault_zone'] == True])
                print(f"[INFO] 地层: {len(formations)} 种")
                print(f"[INFO] 断层影响: {fault_count} 条记录")
                
        except Exception as e:
            print(f"[ERROR] 数据读取失败: {e}")
            return
    else:
        print(f"[ERROR] 数据文件不存在: {data_file}")
        return
    
    # 创建Qt应用
    try:
        app = QApplication(sys.argv)
        app.setApplicationName("基础测试")
        
        # 创建界面
        window = BeautifulGeologyCAE()
        
        # 更新基本信息
        window.data_manager.project_name_label.setText("基础测试")
        window.data_manager.boreholes_count.setText("100")
        window.data_manager.formations_count.setText(str(len(formations)))
        
        # 添加测试信息
        window.output_text.append("[测试] 界面创建成功")
        window.output_text.append(f"[测试] 发现 {len(formations)} 个地层")
        window.output_text.append(f"[测试] 断层影响 {fault_count} 条记录")
        window.output_text.append("")
        window.output_text.append("如果你能看到这个界面，说明基础功能正常")
        
        window.status_label.setText("[OK] 基础测试界面")
        
        print("[OK] 界面创建成功，准备显示...")
        window.show()
        
        # 启动应用
        sys.exit(app.exec())
        
    except Exception as e:
        print(f"[ERROR] 界面创建失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()