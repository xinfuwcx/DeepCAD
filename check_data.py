#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Check Data - 检查数据情况
"""

import pandas as pd
from pathlib import Path

def main():
    print(">> 检查真实地质数据")
    print("=" * 30)
    
    data_file = Path("example3/data/realistic_borehole_data.csv")
    
    if not data_file.exists():
        print("[ERROR] 数据文件不存在")
        return
    
    try:
        df = pd.read_csv(data_file)
        print(f"[OK] 数据文件存在，共 {len(df)} 条记录")
        
        # 检查断层分布
        total_records = len(df)
        fault_records = len(df[df['in_fault_zone'] == True])
        normal_records = len(df[df['in_fault_zone'] == False])
        
        print(f"正常记录: {normal_records}")
        print(f"断层记录: {fault_records}")
        print(f"断层比例: {fault_records/total_records*100:.1f}%")
        
        print("\n各地层在断层区分布:")
        formations = df['formation_name'].unique()
        
        for formation in formations:
            total = len(df[df['formation_name'] == formation])
            fault = len(df[
                (df['formation_name'] == formation) & 
                (df['in_fault_zone'] == True)
            ])
            percentage = fault/total*100 if total > 0 else 0
            
            print(f"  {formation}: {fault}/{total} ({percentage:.0f}%)")
        
        # 检查是否有明显的地层缺失
        print("\n断层影响明显的地层:")
        for formation in formations:
            total = len(df[df['formation_name'] == formation])
            fault = len(df[
                (df['formation_name'] == formation) & 
                (df['in_fault_zone'] == True)
            ])
            percentage = fault/total*100 if total > 0 else 0
            
            if percentage < 50:  # 断层区少于50%
                print(f"  {formation}: 断层区明显减少 ({percentage:.0f}%)")
        
        print(f"\n[OK] 数据检查完成")
        
    except Exception as e:
        print(f"[ERROR] 数据读取失败: {e}")

if __name__ == "__main__":
    main()