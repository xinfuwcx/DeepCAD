#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import pandas as pd

def analyze_excel_structure(file_path):
    """分析Excel文件结构，包括列名和表头信息"""
    try:
        # 读取Excel文件，不跳过任何行
        df = pd.read_excel(file_path, engine='xlrd', header=None)
        
        print("Excel文件完整结构分析:")
        print(f"总行数: {df.shape[0]}")
        print(f"总列数: {df.shape[1]}")
        
        print("\n前5行数据详细分析:")
        for i in range(min(5, df.shape[0])):
            print(f"\n第{i}行: {df.iloc[i].tolist()}")
        
        # 尝试找到表头行
        print("\n寻找表头行...")
        for i in range(min(3, df.shape[0])):
            row_data = df.iloc[i].tolist()
            # 检查是否包含明显的表头关键词
            keywords = ['弹性模量', '泊松比', '密度', '容重', '粘聚力', '摩擦角', '本构模型', '材料名称']
            keyword_count = sum(1 for cell in row_data if any(keyword in str(cell) for keyword in keywords))
            print(f"第{i}行包含{keyword_count}个关键词: {row_data}")
        
        # 尝试以第0行作为表头读取
        print("\n以第0行作为表头重新读取:")
        df_with_header = pd.read_excel(file_path, engine='xlrd', header=0)
        print(f"列名: {df_with_header.columns.tolist()}")
        print(f"数据预览:")
        print(df_with_header.head(3))
        
        return df, df_with_header
        
    except Exception as e:
        print(f"分析Excel文件时出错: {e}")
        return None, None

if __name__ == "__main__":
    analyze_excel_structure("材料参数1-系统输入.xls")