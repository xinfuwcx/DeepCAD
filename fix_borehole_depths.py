#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复钻孔数据中的负深度值
将所有深度相关的负值改为正值
"""
import pandas as pd
import numpy as np

def fix_borehole_depths():
    print("修复钻孔数据中的负深度值...")
    
    # 读取原始数据
    input_file = 'data/boreholes_with_undulation.csv'
    output_file = 'data/boreholes_with_undulation_fixed.csv'
    
    try:
        df = pd.read_csv(input_file)
        print(f"读取了 {len(df)} 条数据记录")
        
        # 修复钻孔深度（改为正值）
        df['钻孔深度'] = df['钻孔深度'].abs()
        print("修复钻孔深度为正值")
        
        # 修复层顶深度（改为正值）
        df['层顶深度'] = df['层顶深度'].abs()
        print("修复层顶深度为正值")
        
        # 修复层底深度（改为正值）
        df['层底深度'] = df['层底深度'].abs()
        print("修复层底深度为正值")
        
        # 保存修复后的数据
        df.to_csv(output_file, index=False, encoding='utf-8-sig')
        print(f"修复后的数据已保存到: {output_file}")
        
        # 显示修复后的几条样本数据
        print("\n修复后的样本数据:")
        print(df.head(10)[['钻孔编号', 'X坐标', 'Y坐标', '地面标高', '钻孔深度', '土层名称', '层顶深度', '层底深度']].to_string())
        
        return True
        
    except Exception as e:
        print(f"修复失败: {e}")
        return False

if __name__ == "__main__":
    success = fix_borehole_depths()
    if success:
        print("\n钻孔数据修复成功!")
    else:
        print("\n钻孔数据修复失败!")