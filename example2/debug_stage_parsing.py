#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
调试STAGE行解析
"""

# 直接测试STAGE行解析
test_lines = [
    "STAGE  , 1, 0, 初始应力, 0, 1, 0, 0,",
    "STAGE  , 2, 0, 围护墙+基坑, 0, 0, 0, 0,"
]

def parse_stage_line(line):
    """解析STAGE行"""
    try:
        parts = [p.strip() for p in line.split(',')]
        print(f"原始行: {repr(line)}")
        print(f"分割后: {parts}")
        print(f"第一部分: {repr(parts[0])}")
        print(f"第一部分.strip(): {repr(parts[0].strip())}")
        
        if len(parts) >= 4 and parts[0].strip() == 'STAGE':
            stage_id = int(parts[1])
            stage_type = int(parts[2]) if parts[2] else 0
            stage_name = parts[3] if parts[3] else f'Stage {stage_id}'
            
            active = 1
            if len(parts) > 4 and parts[4]:
                active = int(parts[4])
            
            stage = {
                'id': stage_id,
                'name': stage_name,
                'type': stage_type,
                'active': active,
                'description': f'施工阶段{stage_id}: {stage_name}',
                'fpn_format': 'STAGE'
            }
            
            print(f"解析成功: {stage}")
            return stage
        else:
            print(f"匹配失败: len={len(parts)}, first_part={repr(parts[0].strip())}")
            
    except Exception as e:
        print(f"解析错误: {e}")
    
    return None

print("测试STAGE行解析:")
print("=" * 50)

for line in test_lines:
    print(f"\n测试行: {line}")
    result = parse_stage_line(line)
    print("-" * 30)

# 现在测试实际文件
print("\n\n测试实际FPN文件:")
print("=" * 50)

try:
    with open('data/基坑两阶段1fpn.fpn', 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    stage_count = 0
    for i, line in enumerate(lines):
        if line.startswith('STAGE'):
            stage_count += 1
            print(f"第{stage_count}个STAGE行 (行号{i+1}): {repr(line.strip())}")
            result = parse_stage_line(line.strip())
            print("-" * 30)
            
except Exception as e:
    print(f"读取文件失败: {e}")