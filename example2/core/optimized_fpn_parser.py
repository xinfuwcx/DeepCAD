#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优化的FPN文件解析器
专门处理大型MIDAS GTS NX FPN文件，支持流式处理和内存优化
"""

import os
import numpy as np
from pathlib import Path
from typing import Dict, Any, Iterator, Tuple, Optional
from dataclasses import dataclass
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ParseProgress:
    """解析进度信息"""
    total_lines: int = 0
    processed_lines: int = 0
    nodes_count: int = 0
    elements_count: int = 0
    current_section: str = ""
    
    @property
    def progress_percent(self) -> float:
        if self.total_lines == 0:
            return 0.0
        return (self.processed_lines / self.total_lines) * 100


class OptimizedFPNParser:
    """优化的FPN文件解析器"""
    
    def __init__(self, progress_callback=None):
        """
        初始化解析器
        
        Args:
            progress_callback: 进度回调函数，接收ParseProgress对象
        """
        self.progress_callback = progress_callback
        self.coordinate_offset = None
        self.encoding_used = None
        
        # 支持的编码列表
        self.encodings = ['utf-8', 'gbk', 'latin1', 'cp1252']
        
        # 数据缓存
        self.nodes_cache = {}
        self.elements_cache = {}
        
    def detect_file_encoding(self, file_path: str) -> str:
        """检测文件编码"""
        for encoding in self.encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    # 读取前1000行进行编码检测
                    for i, line in enumerate(f):
                        if i > 1000:
                            break
                        # 尝试解码，如果成功则认为编码正确
                        line.encode('utf-8')
                
                logger.info(f"检测到文件编码: {encoding}")
                return encoding
                
            except (UnicodeDecodeError, UnicodeEncodeError):
                continue
                
        # 如果都失败，使用latin1作为fallback
        logger.warning("无法检测文件编码，使用latin1作为fallback")
        return 'latin1'
    
    def count_file_lines(self, file_path: str, encoding: str) -> int:
        """快速统计文件行数"""
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                return sum(1 for _ in f)
        except Exception as e:
            logger.error(f"统计文件行数失败: {e}")
            return 0
    
    def calculate_coordinate_offset(self, file_path: str, encoding: str) -> Tuple[float, float, float]:
        """
        计算坐标偏移量，将大坐标值移到原点附近
        只扫描前1000个节点来计算偏移量
        """
        min_coords = [float('inf'), float('inf'), float('inf')]
        node_count = 0
        
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('$$'):
                        continue
                        
                    if line.startswith('NODE'):
                        try:
                            parts = [p.strip() for p in line.split(',')]
                            if len(parts) >= 5:
                                x = float(parts[2])
                                y = float(parts[3])
                                z = float(parts[4])
                                
                                min_coords[0] = min(min_coords[0], x)
                                min_coords[1] = min(min_coords[1], y)
                                min_coords[2] = min(min_coords[2], z)
                                
                                node_count += 1
                                if node_count >= 1000:  # 只扫描前1000个节点
                                    break
                                    
                        except (ValueError, IndexError):
                            continue
                            
        except Exception as e:
            logger.error(f"计算坐标偏移量失败: {e}")
            return (0.0, 0.0, 0.0)
        
        # 如果没有找到有效节点，返回零偏移
        if node_count == 0:
            return (0.0, 0.0, 0.0)
            
        offset = tuple(min_coords)
        logger.info(f"计算坐标偏移量: {offset}, 基于{node_count}个节点")
        return offset
    
    def parse_node_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析节点行"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) < 5:
                return None
                
            node_id = int(parts[1])
            x = float(parts[2]) - self.coordinate_offset[0]
            y = float(parts[3]) - self.coordinate_offset[1]
            z = float(parts[4]) - self.coordinate_offset[2]
            
            return {
                'id': node_id,
                'x': x,
                'y': y,
                'z': z
            }
            
        except (ValueError, IndexError) as e:
            logger.debug(f"解析节点行失败: {line[:50]}... - {e}")
            return None
    
    def parse_element_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析单元行"""
        try:
            parts = [p.strip() for p in line.split(',')]
            
            if parts[0] == 'TETRA' and len(parts) >= 7:
                # 四面体单元
                return {
                    'id': int(parts[1]),
                    'type': 'tetra',
                    'material_id': int(parts[2]),
                    'nodes': [int(parts[i]) for i in range(3, 7)]
                }
            elif parts[0] == 'HEXA' and len(parts) >= 10:
                # 六面体单元
                return {
                    'id': int(parts[1]),
                    'type': 'hexa',
                    'material_id': int(parts[2]),
                    'nodes': [int(parts[i]) for i in range(3, 11)]
                }
            elif parts[0] == 'PENTA' and len(parts) >= 9:
                # 五面体单元
                return {
                    'id': int(parts[1]),
                    'type': 'penta',
                    'material_id': int(parts[2]),
                    'nodes': [int(parts[i]) for i in range(3, 9)]
                }
                
        except (ValueError, IndexError) as e:
            logger.debug(f"解析单元行失败: {line[:50]}... - {e}")
            
        return None
    
    def parse_file_streaming(self, file_path: str) -> Dict[str, Any]:
        """
        流式解析FPN文件
        逐行处理，避免内存溢出
        """
        # 检测编码
        encoding = self.detect_file_encoding(file_path)
        self.encoding_used = encoding
        
        # 统计总行数
        total_lines = self.count_file_lines(file_path, encoding)
        
        # 计算坐标偏移
        self.coordinate_offset = self.calculate_coordinate_offset(file_path, encoding)
        
        # 初始化进度
        progress = ParseProgress(total_lines=total_lines)
        
        # 解析结果
        result = {
            'nodes': {},
            'elements': {},
            'material_groups': {},
            'metadata': {
                'encoding': encoding,
                'coordinate_offset': self.coordinate_offset,
                'total_lines': total_lines
            }
        }
        
        current_section = "unknown"
        
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    
                    # 更新进度
                    progress.processed_lines = line_num
                    progress.current_section = current_section
                    
                    # 跳过空行和注释
                    if not line or line.startswith('$$'):
                        continue
                    
                    # 识别数据段
                    if line.startswith('NODE'):
                        current_section = "nodes"
                        node_data = self.parse_node_line(line)
                        if node_data:
                            result['nodes'][node_data['id']] = node_data
                            progress.nodes_count += 1
                            
                    elif line.startswith(('TETRA', 'HEXA', 'PENTA')):
                        current_section = "elements"
                        element_data = self.parse_element_line(line)
                        if element_data:
                            result['elements'][element_data['id']] = element_data
                            progress.elements_count += 1
                    
                    # 定期调用进度回调
                    if self.progress_callback and line_num % 1000 == 0:
                        self.progress_callback(progress)
                        
        except Exception as e:
            logger.error(f"解析文件时出错: {e}")
            raise
        
        # 最终进度回调
        if self.progress_callback:
            progress.processed_lines = total_lines
            self.progress_callback(progress)
        
        # 转换为列表格式以兼容现有代码
        result['nodes'] = list(result['nodes'].values())
        result['elements'] = list(result['elements'].values())
        
        logger.info(f"解析完成: {len(result['nodes'])}个节点, {len(result['elements'])}个单元")
        
        return result


def create_progress_callback():
    """创建进度回调函数示例"""
    def progress_callback(progress: ParseProgress):
        print(f"\r解析进度: {progress.progress_percent:.1f}% "
              f"({progress.processed_lines}/{progress.total_lines}) "
              f"节点:{progress.nodes_count} 单元:{progress.elements_count} "
              f"当前段:{progress.current_section}", end='', flush=True)
    
    return progress_callback


# 测试函数
if __name__ == "__main__":
    # 测试优化解析器
    fpn_file = Path(__file__).parent.parent / "data" / "基坑fpn.fpn"
    
    if fpn_file.exists():
        print(f"测试解析文件: {fpn_file}")
        
        parser = OptimizedFPNParser(progress_callback=create_progress_callback())
        
        try:
            result = parser.parse_file_streaming(str(fpn_file))
            print(f"\n解析成功!")
            print(f"节点数量: {len(result['nodes'])}")
            print(f"单元数量: {len(result['elements'])}")
            print(f"使用编码: {result['metadata']['encoding']}")
            print(f"坐标偏移: {result['metadata']['coordinate_offset']}")
            
        except Exception as e:
            print(f"\n解析失败: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"测试文件不存在: {fpn_file}")
