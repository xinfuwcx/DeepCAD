#!/usr/bin/env python3
"""检查FPN文件中的板单元"""

import sys
sys.path.append('.')

from example2.core.optimized_fpn_parser import OptimizedFPNParser

def main():
    print('=== 检查FPN文件中的板单元 ===')
    
    parser = OptimizedFPNParser()
    fpn_data = parser.parse_file_streaming('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    
    print('FPN解析结果:')
    print(f'  节点数量: {len(fpn_data.get("nodes", []))}')
    print(f'  体单元数量: {len(fpn_data.get("elements", []))}')
    print(f'  板单元数量: {len(fpn_data.get("plate_elements", {}))}')
    print(f'  线单元数量: {len(fpn_data.get("line_elements", {}))}')
    print(f'  PSHELL属性数量: {len(fpn_data.get("shell_properties", {}))}')
    
    # 检查PSHELL属性
    shell_props = fpn_data.get('shell_properties', {})
    if shell_props:
        print('\nPSHELL属性:')
        for prop_id, prop_data in shell_props.items():
            print(f'  属性{prop_id}: {prop_data.get("name", "未知")} - 厚度{prop_data.get("thickness", "未知")}')
    
    # 检查板单元
    plate_elements = fpn_data.get('plate_elements', {})
    if plate_elements:
        print('\n板单元示例:')
        for i, (eid, elem) in enumerate(list(plate_elements.items())[:5]):
            print(f'  单元{eid}: 属性{elem.get("prop_id")} - 节点{elem.get("nodes")}')
    else:
        print('\n❌ 未找到板单元！')
        print('这说明FPN文件中可能没有明确的TRIA/QUAD单元定义')

if __name__ == '__main__':
    main()
