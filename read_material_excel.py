#!/usr/bin/env python3
"""
读取材料参数Excel文件内容
"""
import pandas as pd
import json

def read_material_excel():
    """读取材料参数Excel文件"""
    try:
        # 读取Excel文件
        excel_file = "材料参数1-系统输入.xls"
        
        # 尝试读取所有sheet
        xls = pd.ExcelFile(excel_file)
        print(f"Excel文件包含的sheet: {xls.sheet_names}")
        
        all_data = {}
        
        for sheet_name in xls.sheet_names:
            print(f"\n正在读取sheet: {sheet_name}")
            df = pd.read_excel(excel_file, sheet_name=sheet_name)
            print(f"Sheet '{sheet_name}' 数据形状: {df.shape}")
            print(f"列名: {list(df.columns)}")
            
            # 显示前几行数据
            print(f"\n前5行数据:")
            print(df.head())
            
            # 保存为字典
            all_data[sheet_name] = df.to_dict('records')
        
        # 保存为JSON文件供查看
        with open('material_data_extracted.json', 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2, default=str)
            
        print(f"\n数据已保存到 material_data_extracted.json")
        return all_data
        
    except Exception as e:
        print(f"读取Excel文件时出错: {e}")
        return None

if __name__ == "__main__":
    data = read_material_excel()