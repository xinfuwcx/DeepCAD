#!/usr/bin/env python3

import ast
import sys

def check_syntax_incrementally(file_path):
    """逐行检查语法错误"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        print(f"文件总行数: {len(lines)}")
        
        # 逐渐增加行数，找到第一个语法错误
        for i in range(1, len(lines) + 1):
            partial_content = ''.join(lines[:i])
            try:
                ast.parse(partial_content)
            except SyntaxError as e:
                print(f"\n语法错误首次出现在第 {i} 行:")
                print(f"错误: {e.msg}")
                print(f"行内容: {lines[i-1].rstrip()}")
                
                # 显示前后几行的上下文
                start = max(0, i-5)
                end = min(len(lines), i+3)
                print(f"\n上下文 (行 {start+1}-{end}):")
                for j in range(start, end):
                    marker = ">>> " if j == i-1 else "    "
                    print(f"{marker}{j+1:3}: {lines[j].rstrip()}")
                
                return False
                
        print("语法检查通过!")
        return True
        
    except Exception as e:
        print(f"检查失败: {e}")
        return False

if __name__ == "__main__":
    check_syntax_incrementally(r"E:\DeepCAD\example2\gui\main_window.py")