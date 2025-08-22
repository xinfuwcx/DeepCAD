"""
调试FPN数据结构
"""

from pathlib import Path
from example2.core.optimized_fpn_parser import OptimizedFPNParser

def debug_fpn_data():
    """调试FPN数据结构"""
    print("🔍 调试FPN数据结构...")
    
    # 解析FPN文件
    project_root = Path(__file__).parent
    fpn_file = project_root / "example2" / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
    
    parser = OptimizedFPNParser()
    fpn_data = parser.parse_file_streaming(str(fpn_file))
    
    print(f"✅ FPN文件解析成功")
    print(f"   节点数量: {len(fpn_data.get('nodes', []))}")
    print(f"   单元数量: {len(fpn_data.get('elements', []))}")
    
    # 检查前几个节点的数据结构
    nodes = fpn_data.get('nodes', [])
    if nodes:
        print(f"\n📋 前3个节点的数据结构:")
        for i, node in enumerate(nodes[:3]):
            print(f"   节点{i+1}: {node}")
    
    # 检查前几个单元的数据结构
    elements = fpn_data.get('elements', [])
    if elements:
        print(f"\n📋 前5个单元的数据结构:")
        for i, element in enumerate(elements[:5]):
            print(f"   单元{i+1}: {element}")
    
    # 统计单元类型
    element_types = {}
    for element in elements:
        elem_type = element.get('type', 'unknown')
        element_types[elem_type] = element_types.get(elem_type, 0) + 1
    
    print(f"\n📊 单元类型统计:")
    for elem_type, count in element_types.items():
        print(f"   {elem_type}: {count}个")
    
    # 检查材料数据结构
    materials = fpn_data.get('materials', {})
    print(f"\n📋 材料数据结构:")
    for mat_id, mat_data in list(materials.items())[:3]:
        print(f"   材料{mat_id}: {mat_data}")

if __name__ == "__main__":
    debug_fpn_data()
