import csv
import os
import random


def generate_full_domain_data():
    """Generates 50 borehole data points across the entire 300x300 domain."""
    data = [['id', 'x', 'y', 'z', 'soil_type', 'description']]
    point_id = 1
    for _ in range(50):
        x = round(random.uniform(0, 300), 2)
        y = round(random.uniform(0, 300), 2)
        
        # Define layer depths with slight random variations
        layers = [
            (0, 1, '黏土'),
            (round(random.uniform(-8, -12), 2), 2, '砂质土'),
            (round(random.uniform(-18, -22), 2), 3, '粉质土'),
            (round(random.uniform(-33, -37), 2), 4, '砂砾石'),
            (-50, 5, '基岩')
        ]
        
        for z, soil_type, desc in layers:
            data.append([point_id, x, y, z, soil_type, desc])
            point_id += 1
    return data


def generate_excavation_area_data():
    """Generates 50 borehole data points concentrated in the 150x150 excavation area."""
    data = [['id', 'x', 'y', 'z', 'soil_type', 'description']]
    point_id = 1
    for _ in range(50):
        x = round(random.uniform(75, 225), 2)
        y = round(random.uniform(75, 225), 2)
        
        # Define layer depths with slight random variations
        layers = [
            (0, 1, '黏土'),
            (round(random.uniform(-9, -11), 2), 2, '砂质土'),
            (round(random.uniform(-19, -21), 2), 3, '粉质土'),
            (round(random.uniform(-34, -36), 2), 4, '砂砾石'),
            (-50, 5, '基岩')
        ]
        
        for z, soil_type, desc in layers:
            data.append([point_id, x, y, z, soil_type, desc])
            point_id += 1
    return data


def write_csv(filepath, data):
    """Writes data to a CSV file."""
    try:
        with open(filepath, 'w', newline='', encoding='utf-8-sig') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerows(data)
        print(f"Successfully generated {os.path.basename(filepath)}")
    except IOError as e:
        print(f"Error writing to file {filepath}: {e}")


def create_info_file(filepath):
    """Creates a text file with metadata about the domain and data."""
    info_content = """计算域和基坑信息：

计算域尺寸：
- 长度（X方向）：300米
- 宽度（Y方向）：300米
- 深度（Z方向）：50米
- 原点坐标：(0, 0, 0)，位于地表

基坑信息：
- 基坑位置：计算域中部
- 基坑尺寸：约150米 x 150米
- 基坑深度：20米
- 基坑中心点坐标：约(150, 150, 0)

土层信息：
- 共5层土
- 第1层：黏土 (soil_type=1)
- 第2层：砂质土 (soil_type=2)
- 第3层：粉质土 (soil_type=3)
- 第4层：砂砾石 (soil_type=4)
- 第5层：基岩 (soil_type=5)

钻孔数据集：
1. borehole_data_full_domain.csv - 50组钻孔点，分布在整个计算域范围内
2. borehole_data_excavation_area.csv - 50组钻孔点，主要集中分布在基坑区域下方
"""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(info_content)
        print(f"Successfully generated {os.path.basename(filepath)}")
    except IOError as e:
        print(f"Error writing to file {filepath}: {e}")


if __name__ == "__main__":
    # Ensure the script runs in the correct directory
    # The script is in 'data/', so we want to write to 'data/'
    data_dir = os.path.dirname(__file__)
    if not data_dir:
        data_dir = '.'  # Fallback for running from the same directory

    # Define file paths
    full_domain_filepath = os.path.join(data_dir, 'borehole_data_full_domain.csv')
    excavation_area_filepath = os.path.join(data_dir, 'borehole_data_excavation_area.csv')
    info_filepath = os.path.join(data_dir, 'computation_domain_info.txt')

    # Generate and write data
    write_csv(full_domain_filepath, generate_full_domain_data())
    write_csv(excavation_area_filepath, generate_excavation_area_data())
    create_info_file(info_filepath)

    print("\nAll test data files have been generated in the 'data' directory.") 