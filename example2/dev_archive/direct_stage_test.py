#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接测试STAGE行查找
"""

def find_all_stage_lines():
    """直接查找所有STAGE行"""
    fpn_file = "data/基坑两阶段1fpn.fpn"
    
    print("搜索所有STAGE相关行:")
    print("=" * 60)
    
    try:
        with open(fpn_file, 'r', encoding='gbk', errors='ignore') as f:
            lines = f.readlines()
        
        stage_count = 0
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            if 'STAGE' in line_stripped:
                stage_count += 1
                print(f"第{stage_count}行 (行号{i+1}): {repr(line_stripped)}")
                
                # 如果是STAGE开头的行，尝试解析
                if line_stripped.startswith('STAGE'):
                    parts = [p.strip() for p in line_stripped.split(',')]
                    print(f"  分割结果: {parts}")
                    if len(parts) >= 4:
                        try:
                            stage_id = int(parts[1]) if parts[1] else 0
                            stage_name = parts[3] if parts[3] else f'Stage {stage_id}'
                            print(f"  应该解析为: ID={stage_id}, 名称='{stage_name}'")
                        except Exception as e:
                            print(f"  解析失败: {e}")
                print("-" * 40)
                
        print(f"\n总共找到{stage_count}个包含STAGE的行")
        
    except Exception as e:
        print(f"读取文件失败: {e}")

if __name__ == "__main__":
    find_all_stage_lines()