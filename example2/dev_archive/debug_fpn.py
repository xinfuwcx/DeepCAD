#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
调试FPN文件格式 - 帮助理解MIDAS GTS 2022 FPN文件结构
"""

import sys
from pathlib import Path

def analyze_fpn_file(file_path):
    """分析FPN文件结构"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
    except:
        try:
            # 尝试其他编码
            with open(file_path, 'r', encoding='gbk', errors='ignore') as f:
                lines = f.readlines()
        except:
            with open(file_path, 'r', encoding='latin1', errors='ignore') as f:
                lines = f.readlines()
    
    print(f"=== FPN文件分析: {Path(file_path).name} ===")
    print(f"总行数: {len(lines)}")
    print(f"文件编码分析完成")
    print()
    
    # 分析前20行
    print("=== 前20行内容 ===")
    for i, line in enumerate(lines[:20]):
        line_clean = line.strip()
        print(f"{i+1:3d}: {repr(line_clean)}")
    
    print()
    
    # 查找关键字
    keywords = ['NODE', 'ELEMENT', 'MATERIAL', 'LOAD', 'CONSTRAINT', 'BOUNDARY', 'STAGE', '*', ';', 'SOLID', 'POINT', 'LINE']
    keyword_lines = {}
    
    for i, line in enumerate(lines):
        line_upper = line.upper().strip()
        for keyword in keywords:
            if keyword in line_upper:
                if keyword not in keyword_lines:
                    keyword_lines[keyword] = []
                keyword_lines[keyword].append((i+1, line.strip()))
    
    print("=== 关键字分析 ===")
    for keyword, occurrences in keyword_lines.items():
        print(f"{keyword}: {len(occurrences)} 次出现")
        # 显示前3个出现位置
        for line_num, content in occurrences[:3]:
            print(f"  行{line_num}: {content[:60]}...")
    
    print()
    
    # 分析数据格式
    print("=== 数据行格式分析 ===")
    numeric_lines = []
    for i, line in enumerate(lines[:100]):  # 只分析前100行
        line_clean = line.strip()
        if line_clean and not line_clean.startswith('*') and not line_clean.startswith(';'):
            parts = line_clean.split()
            if len(parts) >= 2:
                # 检查是否包含数字
                has_numbers = False
                for part in parts:
                    try:
                        float(part)
                        has_numbers = True
                        break
                    except:
                        pass
                
                if has_numbers:
                    numeric_lines.append((i+1, len(parts), line_clean))
    
    print("数字数据行（前10个）:")
    for line_num, part_count, content in numeric_lines[:10]:
        print(f"  行{line_num}({part_count}字段): {content}")
    
    print()
    
    # 统计字段数量分布
    field_counts = {}
    for _, part_count, _ in numeric_lines:
        field_counts[part_count] = field_counts.get(part_count, 0) + 1
    
    print("字段数量统计:")
    for count, frequency in sorted(field_counts.items()):
        print(f"  {count}字段: {frequency}行")
    
    return lines

def create_gts_fpn_parser():
    """创建GTS专用FPN解析器"""
    parser_code = '''
def parse_gts_fpn_file(self, file_path: str) -> Dict[str, Any]:
    """解析MIDAS GTS FPN文件格式"""
    fpn_data = {
        'nodes': [],
        'elements': [], 
        'materials': [],
        'constraints': [],
        'loads': [],
        'groups': []
    }
    
    try:
        # 尝试不同编码读取文件
        lines = []
        for encoding in ['utf-8', 'gbk', 'latin1']:
            try:
                with open(file_path, 'r', encoding=encoding, errors='ignore') as f:
                    lines = f.readlines()
                print(f"使用{encoding}编码成功读取文件")
                break
            except:
                continue
        
        if not lines:
            raise Exception("无法读取文件")
            
        current_section = None
        i = 0
        
        while i < len(lines):
            line = lines[i].strip()
            
            # 跳过空行
            if not line:
                i += 1
                continue
            
            # 检测不同的标记格式
            line_upper = line.upper()
            
            # MIDAS GTS可能的节点标记
            if any(marker in line_upper for marker in ['*NODE', 'NODE', 'NODES', '节点']):
                current_section = 'nodes'
                print(f"检测到节点段: {line}")
            # MIDAS GTS可能的单元标记  
            elif any(marker in line_upper for marker in ['*ELEMENT', 'ELEMENT', 'SOLID', '单元']):
                current_section = 'elements'
                print(f"检测到单元段: {line}")
            # MIDAS GTS可能的材料标记
            elif any(marker in line_upper for marker in ['*MATERIAL', 'MATERIAL', '材料']):
                current_section = 'materials'
                print(f"检测到材料段: {line}")
            # 其他段
            elif line.startswith('*') or line.startswith(';'):
                current_section = None
            else:
                # 解析数据行
                self.parse_gts_data_line(line, current_section, fpn_data)
            
            i += 1
            
    except Exception as e:
        print(f"GTS FPN文件解析错误: {e}")
        # 创建示例数据
        fpn_data = self.create_sample_fpn_data()
        
    return fpn_data

def parse_gts_data_line(self, line: str, section: str, fpn_data: Dict):
    """解析GTS数据行"""
    if not section:
        return
        
    parts = line.split()
    if len(parts) < 2:
        return
    
    try:
        if section == 'nodes' and len(parts) >= 4:
            # 尝试解析节点: ID X Y Z
            node = {
                'id': int(float(parts[0])),  # 可能是浮点格式的整数
                'x': float(parts[1]),
                'y': float(parts[2]),
                'z': float(parts[3])
            }
            fpn_data['nodes'].append(node)
            if len(fpn_data['nodes']) <= 5:  # 只显示前5个
                print(f"解析节点: {node}")
                
        elif section == 'elements' and len(parts) >= 3:
            # 尝试解析单元连接
            element = {
                'id': int(float(parts[0])),
                'type': 'SOLID',  # GTS主要是实体单元
                'nodes': []
            }
            
            # 解析节点连接（跳过可能的类型字段）
            start_idx = 1
            for i in range(start_idx, len(parts)):
                try:
                    node_id = int(float(parts[i]))
                    element['nodes'].append(node_id)
                except:
                    break
                    
            if element['nodes']:
                fpn_data['elements'].append(element)
                if len(fpn_data['elements']) <= 3:  # 只显示前3个
                    print(f"解析单元: {element}")
                    
    except Exception as e:
        if len(fpn_data.get('nodes', [])) < 5:  # 避免过多错误信息
            print(f"解析数据行失败: {line[:50]}... 错误: {e}")
'''
    
    print("=== 生成的GTS FPN解析器代码 ===")
    print(parser_code)
    return parser_code

if __name__ == "__main__":
    print("MIDAS GTS 2022 FPN文件格式调试工具")
    print("=" * 50)
    
    # 检查是否有测试文件
    test_fpn = Path("test_sample.fpn")
    if test_fpn.exists():
        lines = analyze_fpn_file(test_fpn)
        print()
        print("请用户提供真实的MIDAS GTS 2022导出的FPN文件")
        print("这样我可以分析实际的文件格式并修正解析器")
    else:
        print("未找到测试FPN文件")
    
    print()
    create_gts_fpn_parser()