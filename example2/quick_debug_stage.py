#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速调试STAGE解析问题
"""

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def find_stage_lines():
    """直接查找FPN文件中的STAGE行"""
    fpn_file = "E:/DeepCAD/example2/data/基坑两阶段1fpn.fpn"
    
    print("直接查找STAGE行:")
    print("=" * 50)
    
    # 尝试多种编码
    for encoding in ['utf-8', 'gbk', 'gb2312']:
        print(f"\n尝试{encoding}编码:")
        try:
            with open(fpn_file, 'r', encoding=encoding, errors='ignore') as f:
                lines = f.readlines()
            
            stage_lines = []
            for i, line in enumerate(lines):
                if line.startswith('STAGE'):
                    stage_lines.append((i+1, line.strip()))
                    print(f"  行{i+1}: {repr(line.strip())}")
            
            print(f"  共找到{len(stage_lines)}个STAGE行")
            
            if stage_lines:
                print(f"\n使用{encoding}编码测试解析:")
                for line_num, line in stage_lines:
                    print(f"\n  测试行{line_num}: {line}")
                    test_parse_stage(line)
                break
                
        except Exception as e:
            print(f"  {encoding}编码失败: {e}")

def test_parse_stage(line):
    """测试STAGE行解析"""
    try:
        parts = [p.strip() for p in line.split(',')]
        print(f"    分割结果: {parts}")
        print(f"    长度: {len(parts)}")
        print(f"    第一部分: '{parts[0]}'")
        print(f"    第一部分=='STAGE': {parts[0] == 'STAGE'}")
        
        if len(parts) >= 4 and parts[0] == 'STAGE':
            stage_id = int(parts[1]) if parts[1] else 0
            stage_type = int(parts[2]) if parts[2] else 0
            stage_name = parts[3] if parts[3] else f'Stage {stage_id}'
            
            print(f"    解析成功: ID={stage_id}, 名称='{stage_name}', 类型={stage_type}")
        else:
            print(f"    解析失败: 条件不满足")
            
    except Exception as e:
        print(f"    解析异常: {e}")

if __name__ == "__main__":
    find_stage_lines()