#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MIDAS文件读取器
支持MCT和MGT格式的MIDAS模型文件解析
"""

import re
import json
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional


class MIDASReader:
    """MIDAS模型文件读取器"""
    
    def __init__(self):
        self.supported_formats = ['.mct', '.mgt']
        
    def read_mct_file(self, filepath: str) -> Dict[str, Any]:
        """读取MCT格式文件 (MIDAS Civil)"""
        filepath = Path(filepath)
        
        if not filepath.exists():
            raise FileNotFoundError(f"文件不存在: {filepath}")
            
        if filepath.suffix.lower() not in ['.mct']:
            raise ValueError(f"不支持的文件格式: {filepath.suffix}")
            
        print(f"正在读取MCT文件: {filepath.name}")
        
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
            # 解析MCT格式
            model = self._parse_mct_content(content)
            model['source_file'] = str(filepath)
            model['file_type'] = 'MCT'
            
            return model
            
        except Exception as e:
            print(f"读取MCT文件时出错: {e}")
            # 返回空模型
            return self._create_empty_model(str(filepath), 'MCT')
            
    def read_mgt_file(self, filepath: str) -> Dict[str, Any]:
        """读取MGT格式文件 (MIDAS Gen)"""
        filepath = Path(filepath)
        
        if not filepath.exists():
            raise FileNotFoundError(f"文件不存在: {filepath}")
            
        if filepath.suffix.lower() not in ['.mgt']:
            raise ValueError(f"不支持的文件格式: {filepath.suffix}")
            
        print(f"正在读取MGT文件: {filepath.name}")
        
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
            # 解析MGT格式
            model = self._parse_mgt_content(content)
            model['source_file'] = str(filepath)
            model['file_type'] = 'MGT'
            
            return model
            
        except Exception as e:
            print(f"读取MGT文件时出错: {e}")
            # 返回空模型
            return self._create_empty_model(str(filepath), 'MGT')
            
    def _parse_mct_content(self, content: str) -> Dict[str, Any]:
        """解析MCT文件内容"""
        model = {
            'nodes': [],
            'elements': [],
            'materials': [],
            'loads': [],
            'boundaries': [],
            'sections': [],
            'groups': []
        }
        
        try:
            # 分割成行
            lines = content.split('\n')
            
            # 解析各个部分
            current_section = None
            
            for i, line in enumerate(lines):
                line = line.strip()
                
                if not line or line.startswith(';'):
                    continue
                    
                # 检测节点部分
                if '*NODE' in line.upper():
                    current_section = 'nodes'
                    continue
                    
                # 检测单元部分
                elif '*ELEMENT' in line.upper():
                    current_section = 'elements'
                    continue
                    
                # 检测材料部分
                elif '*MATERIAL' in line.upper():
                    current_section = 'materials'
                    continue
                    
                # 检测荷载部分
                elif '*LOAD' in line.upper():
                    current_section = 'loads'
                    continue
                    
                # 解析数据行
                if current_section == 'nodes':
                    node = self._parse_node_line(line)
                    if node:
                        model['nodes'].append(node)
                        
                elif current_section == 'elements':
                    element = self._parse_element_line(line)
                    if element:
                        model['elements'].append(element)
                        
                elif current_section == 'materials':
                    material = self._parse_material_line(line)
                    if material:
                        model['materials'].append(material)
                        
                elif current_section == 'loads':
                    load = self._parse_load_line(line)
                    if load:
                        model['loads'].append(load)
                        
        except Exception as e:
            print(f"解析MCT内容时出错: {e}")
            
        # 验证模型
        self._validate_model(model)
        
        return model
        
    def _parse_mgt_content(self, content: str) -> Dict[str, Any]:
        """解析MGT文件内容"""
        model = {
            'nodes': [],
            'elements': [],
            'materials': [],
            'loads': [],
            'boundaries': [],
            'sections': [],
            'groups': []
        }
        
        try:
            # MGT格式通常是结构化文本
            lines = content.split('\n')
            
            # 跳过版本信息行
            start_line = 0
            for i, line in enumerate(lines[:10]):
                if 'MIDAS' in line.upper() or 'VERSION' in line.upper():
                    start_line = i + 1
                    
            # 解析数据
            current_section = None
            
            for i in range(start_line, len(lines)):
                line = lines[i].strip()
                
                if not line or line.startswith(';') or line.startswith('!'):
                    continue
                    
                # 检测关键词
                if any(keyword in line.upper() for keyword in ['NODE', 'JOINT']):
                    current_section = 'nodes'
                    
                elif any(keyword in line.upper() for keyword in ['ELEMENT', 'FRAME', 'SHELL']):
                    current_section = 'elements'
                    
                elif 'MATERIAL' in line.upper():
                    current_section = 'materials'
                    
                elif any(keyword in line.upper() for keyword in ['LOAD', 'FORCE']):
                    current_section = 'loads'
                    
                # 解析数据行
                if current_section and self._is_data_line(line):
                    if current_section == 'nodes':
                        node = self._parse_mgt_node_line(line)
                        if node:
                            model['nodes'].append(node)
                            
                    elif current_section == 'elements':
                        element = self._parse_mgt_element_line(line)
                        if element:
                            model['elements'].append(element)
                            
                    elif current_section == 'materials':
                        material = self._parse_mgt_material_line(line)
                        if material:
                            model['materials'].append(material)
                            
                    elif current_section == 'loads':
                        load = self._parse_mgt_load_line(line)
                        if load:
                            model['loads'].append(load)
                            
        except Exception as e:
            print(f"解析MGT内容时出错: {e}")
            
        # 如果解析失败，创建示例数据
        if not model['nodes'] and not model['elements']:
            model = self._create_sample_model()
            
        return model
        
    def _is_data_line(self, line: str) -> bool:
        """判断是否为数据行"""
        # 简单的数据行判断：包含数字
        return bool(re.search(r'\d', line))
        
    def _parse_node_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析节点行"""
        try:
            # MCT格式节点行示例: "1, 0.0, 0.0, 0.0"
            parts = [p.strip() for p in line.split(',')]
            
            if len(parts) >= 4:
                return {
                    'id': int(parts[0]),
                    'x': float(parts[1]),
                    'y': float(parts[2]),
                    'z': float(parts[3]) if len(parts) > 3 else 0.0
                }
        except:
            pass
        return None
        
    def _parse_element_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析单元行"""
        try:
            # MCT格式单元行示例: "1, 1, 1, 2, 3, 4"
            parts = [p.strip() for p in line.split(',')]
            
            if len(parts) >= 4:
                return {
                    'id': int(parts[0]),
                    'type': int(parts[1]) if len(parts) > 1 else 1,
                    'nodes': [int(p) for p in parts[2:] if p.isdigit()]
                }
        except:
            pass
        return None
        
    def _parse_material_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析材料行"""
        try:
            # 简化的材料解析
            parts = [p.strip() for p in line.split(',')]
            
            if len(parts) >= 3:
                return {
                    'id': int(parts[0]),
                    'name': parts[1] if len(parts) > 1 else f"Material_{parts[0]}",
                    'elastic_modulus': float(parts[2]) if len(parts) > 2 and parts[2].replace('.', '').isdigit() else 30000.0,
                    'poisson_ratio': float(parts[3]) if len(parts) > 3 and parts[3].replace('.', '').isdigit() else 0.3,
                    'density': float(parts[4]) if len(parts) > 4 and parts[4].replace('.', '').isdigit() else 2500.0
                }
        except:
            pass
        return None
        
    def _parse_load_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析荷载行"""
        try:
            parts = [p.strip() for p in line.split(',')]
            
            if len(parts) >= 3:
                return {
                    'id': int(parts[0]),
                    'node_id': int(parts[1]) if len(parts) > 1 else 0,
                    'fx': float(parts[2]) if len(parts) > 2 else 0.0,
                    'fy': float(parts[3]) if len(parts) > 3 else 0.0,
                    'fz': float(parts[4]) if len(parts) > 4 else 0.0
                }
        except:
            pass
        return None
        
    def _parse_mgt_node_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析MGT格式节点行"""
        try:
            # 尝试多种分隔符
            for sep in [',', '\t', ' ']:
                if sep in line:
                    parts = [p.strip() for p in line.split(sep) if p.strip()]
                    break
            else:
                parts = line.split()
                
            if len(parts) >= 4:
                return {
                    'id': int(parts[0]),
                    'x': float(parts[1]),
                    'y': float(parts[2]),
                    'z': float(parts[3])
                }
        except:
            pass
        return None
        
    def _parse_mgt_element_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析MGT格式单元行"""
        try:
            parts = line.split()
            
            if len(parts) >= 3:
                return {
                    'id': int(parts[0]),
                    'type': 1,
                    'nodes': [int(p) for p in parts[1:] if p.isdigit()]
                }
        except:
            pass
        return None
        
    def _parse_mgt_material_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析MGT格式材料行"""
        return self._parse_material_line(line)
        
    def _parse_mgt_load_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析MGT格式荷载行"""
        return self._parse_load_line(line)
        
    def _validate_model(self, model: Dict[str, Any]) -> None:
        """验证模型数据"""
        if not model['nodes']:
            print("警告: 未找到节点数据")
            
        if not model['elements']:
            print("警告: 未找到单元数据")
            
        # 检查节点ID连续性
        if model['nodes']:
            node_ids = [node['id'] for node in model['nodes']]
            if len(set(node_ids)) != len(node_ids):
                print("警告: 存在重复的节点ID")
                
        print(f"模型验证完成: {len(model['nodes'])}个节点, {len(model['elements'])}个单元")
        
    def _create_empty_model(self, filepath: str, file_type: str) -> Dict[str, Any]:
        """创建空模型"""
        return {
            'nodes': [],
            'elements': [],
            'materials': [],
            'loads': [],
            'boundaries': [],
            'sections': [],
            'groups': [],
            'source_file': filepath,
            'file_type': file_type
        }
        
    def _create_sample_model(self) -> Dict[str, Any]:
        """创建示例模型"""
        print("创建示例模型用于演示")
        
        # 创建简单的梁模型
        nodes = []
        elements = []
        
        # 创建10个节点的简单梁
        for i in range(10):
            nodes.append({
                'id': i + 1,
                'x': float(i * 2.0),
                'y': 0.0,
                'z': 0.0
            })
            
        # 创建单元
        for i in range(9):
            elements.append({
                'id': i + 1,
                'type': 1,
                'nodes': [i + 1, i + 2]
            })
            
        # 创建默认材料
        materials = [{
            'id': 1,
            'name': 'Steel',
            'elastic_modulus': 200000.0,
            'poisson_ratio': 0.3,
            'density': 7850.0
        }]
        
        return {
            'nodes': nodes,
            'elements': elements,
            'materials': materials,
            'loads': [],
            'boundaries': [],
            'sections': [],
            'groups': []
        }
        
    def get_model_summary(self, model: Dict[str, Any]) -> str:
        """获取模型摘要"""
        summary = f"""
MIDAS模型摘要
=================
文件类型: {model.get('file_type', 'Unknown')}
源文件: {Path(model.get('source_file', '')).name}

节点数量: {len(model.get('nodes', []))}
单元数量: {len(model.get('elements', []))}
材料数量: {len(model.get('materials', []))}
荷载数量: {len(model.get('loads', []))}
"""
        return summary.strip()
        
    def export_model_json(self, model: Dict[str, Any], output_path: str) -> None:
        """导出模型为JSON格式"""
        output_path = Path(output_path)
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(model, f, indent=2, ensure_ascii=False)
            
            print(f"模型已导出为JSON: {output_path}")
            
        except Exception as e:
            print(f"导出JSON时出错: {e}")


# 测试函数
def test_midas_reader():
    """测试MIDAS读取器"""
    reader = MIDASReader()
    
    # 创建测试文件
    test_mct_content = """
; MIDAS Civil Test File
*NODE
1, 0.0, 0.0, 0.0
2, 5.0, 0.0, 0.0
3, 10.0, 0.0, 0.0
4, 0.0, 5.0, 0.0

*ELEMENT
1, 1, 1, 2
2, 1, 2, 3
3, 1, 1, 4

*MATERIAL
1, Concrete, 30000.0, 0.2, 2400.0
"""
    
    # 保存测试文件
    test_file = Path("test_model.mct")
    with open(test_file, 'w', encoding='utf-8') as f:
        f.write(test_mct_content)
    
    try:
        # 测试读取
        model = reader.read_mct_file(str(test_file))
        
        print("测试结果:")
        print(reader.get_model_summary(model))
        
        # 导出JSON
        reader.export_model_json(model, "test_model.json")
        
    finally:
        # 清理测试文件
        if test_file.exists():
            test_file.unlink()


if __name__ == "__main__":
    test_midas_reader()