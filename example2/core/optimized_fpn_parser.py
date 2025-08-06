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
        
        # 支持的编码列表 - 中文FPN文件通常使用GBK编码
        self.encodings = ['gbk', 'gb2312', 'utf-8', 'latin1', 'cp1252']
        
        # 数据缓存
        self.nodes_cache = {}
        self.elements_cache = {}
        
    def detect_file_encoding(self, file_path: str) -> str:
        """检测文件编码，特别处理中文字符"""
        # 先尝试读取文件的BOM标记
        with open(file_path, 'rb') as f:
            raw_data = f.read(3)
            if raw_data.startswith(b'\xef\xbb\xbf'):
                logger.info("检测到UTF-8 BOM，使用UTF-8编码")
                return 'utf-8'
        
        # 测试各种编码
        for encoding in self.encodings:
            try:
                with open(file_path, 'r', encoding=encoding, errors='strict') as f:
                    # 读取前1000行进行编码检测
                    chinese_chars_found = 0
                    for i, line in enumerate(f):
                        if i > 1000:
                            break
                        # 检查是否包含中文字符
                        for char in line:
                            if '\u4e00' <= char <= '\u9fff':  # 中文字符范围
                                chinese_chars_found += 1
                                
                    # 如果找到中文字符且使用GBK/GB2312成功读取，优先使用
                    if chinese_chars_found > 0 and encoding in ['gbk', 'gb2312']:
                        logger.info(f"检测到中文字符，使用编码: {encoding}")
                        return encoding
                    elif chinese_chars_found == 0:  # 没有中文字符，第一个成功的编码即可
                        logger.info(f"检测到文件编码: {encoding}")
                        return encoding
                
            except (UnicodeDecodeError, UnicodeEncodeError) as e:
                logger.debug(f"编码 {encoding} 测试失败: {e}")
                continue
                
        # 如果都失败，使用gbk作为fallback（对中文FPN文件最可能）
        logger.warning("无法检测文件编码，使用gbk作为fallback")
        return 'gbk'
    
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
        """🔧 修复2：解析单元行并验证数据结构"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) < 3:
                logger.warning(f"单元行数据不足: {line[:50]}...")
                return None
                
            # 验证基本字段
            try:
                element_id = int(parts[1])
                if element_id <= 0:
                    logger.warning(f"无效的单元ID: {element_id}")
                    return None
            except (ValueError, IndexError):
                logger.warning(f"无法解析单元ID: {parts}")
                return None
            
            # 🔧 确保返回字典格式，并验证所有字段
            if parts[0] == 'TETRA' and len(parts) >= 7:
                try:
                    material_id = int(parts[2])
                    nodes = [int(parts[i]) for i in range(3, 7)]
                    
                    # 验证节点ID
                    if any(node_id <= 0 for node_id in nodes):
                        logger.warning(f"TETRA单元{element_id}包含无效节点ID: {nodes}")
                        return None
                    
                    element_data = {
                        'id': element_id,
                        'type': 'tetra',
                        'material_id': material_id,
                        'nodes': nodes
                    }
                    
                    # 最终验证：确保返回的是字典且包含必要字段
                    if not isinstance(element_data, dict):
                        logger.error(f"element_data不是字典类型: {type(element_data)}")
                        return None
                    
                    required_fields = ['id', 'type', 'material_id', 'nodes']
                    for field in required_fields:
                        if field not in element_data:
                            logger.error(f"缺少必要字段{field}: {element_data}")
                            return None
                    
                    return element_data
                    
                except ValueError as e:
                    logger.warning(f"TETRA单元数据解析错误: {e}")
                    return None
                    
            elif parts[0] == 'HEXA' and len(parts) >= 10:
                try:
                    material_id = int(parts[2])
                    nodes = [int(parts[i]) for i in range(3, 11)]
                    
                    if any(node_id <= 0 for node_id in nodes):
                        logger.warning(f"HEXA单元{element_id}包含无效节点ID: {nodes}")
                        return None
                    
                    element_data = {
                        'id': element_id,
                        'type': 'hexa',
                        'material_id': material_id,
                        'nodes': nodes
                    }
                    
                    # 验证返回数据
                    if not isinstance(element_data, dict) or not all(field in element_data for field in ['id', 'type', 'material_id', 'nodes']):
                        logger.error(f"HEXA单元数据结构错误: {element_data}")
                        return None
                    
                    return element_data
                    
                except ValueError as e:
                    logger.warning(f"HEXA单元数据解析错误: {e}")
                    return None
                    
            elif parts[0] == 'PENTA' and len(parts) >= 9:
                try:
                    material_id = int(parts[2])
                    nodes = [int(parts[i]) for i in range(3, 9)]
                    
                    if any(node_id <= 0 for node_id in nodes):
                        logger.warning(f"PENTA单元{element_id}包含无效节点ID: {nodes}")
                        return None
                    
                    element_data = {
                        'id': element_id,
                        'type': 'penta', 
                        'material_id': material_id,
                        'nodes': nodes
                    }
                    
                    # 验证返回数据
                    if not isinstance(element_data, dict) or not all(field in element_data for field in ['id', 'type', 'material_id', 'nodes']):
                        logger.error(f"PENTA单元数据结构错误: {element_data}")
                        return None
                    
                    return element_data
                    
                except ValueError as e:
                    logger.warning(f"PENTA单元数据解析错误: {e}")
                    return None
            else:
                logger.debug(f"不支持的单元类型或数据不足: {parts[0]} (长度: {len(parts)})")
                
        except Exception as e:
            logger.error(f"解析单元行时发生异常: {line[:50]}... - {e}")
            
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
            'loads': {},
            'stages': {},
            'stage_data': {},
            'analysis_stages': {},
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
                    
                    # 解析分析步相关数据
                    elif line.startswith('STGSET'):
                        current_section = "stage_sets"
                        stage_set_data = self.parse_stage_set_line(line)
                        if stage_set_data:
                            result['stage_data'][stage_set_data['id']] = stage_set_data
                            
                    elif line.startswith('STAGE'):
                        current_section = "stages"
                        stage_data = self.parse_stage_line(line) 
                        if stage_data:
                            result['stages'][stage_data['id']] = stage_data
                            
                    elif line.startswith('ANALSTAG'):
                        current_section = "analysis_stages"
                        anal_stage_data = self.parse_analysis_stage_line(line)
                        if anal_stage_data:
                            result['analysis_stages'][anal_stage_data['id']] = anal_stage_data
                            
                    elif line.startswith(('MADD', 'LADD', 'BADD', 'MDEL', 'LDEL', 'BDEL')):
                        # 解析阶段操作命令
                        stage_op_data = self.parse_stage_operation_line(line)
                        if stage_op_data:
                            # 将操作添加到对应的阶段
                            stage_id = stage_op_data['stage_id']
                            if stage_id not in result['stage_data']:
                                result['stage_data'][stage_id] = {'operations': []}
                            elif 'operations' not in result['stage_data'][stage_id]:
                                result['stage_data'][stage_id]['operations'] = []
                            result['stage_data'][stage_id]['operations'].append(stage_op_data)
                    
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
        
        # 🔧 修复分析步：转换为列表格式
        result['analysis_stages'] = list(result['analysis_stages'].values())
        result['stages'] = list(result['stages'].values())
        
        logger.info(f"解析完成: {len(result['nodes'])}个节点, {len(result['elements'])}个单元, "
                   f"{len(result['analysis_stages'])}个分析阶段")
        
        return result
    
    def parse_stage_set_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析STGSET行 - 阶段集合定义"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) < 4:
                return None
                
            return {
                'id': int(parts[1]),
                'type': int(parts[2]),
                'name': parts[3].strip('"\''),
                'raw_line': line
            }
        except (ValueError, IndexError) as e:
            logger.warning(f"解析STGSET行失败: {line} - {e}")
            return None
    
    def parse_stage_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析STAGE行 - 单个分析阶段定义"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) < 4:
                return None
                
            return {
                'id': int(parts[1]),
                'type': int(parts[2]),
                'name': parts[3].strip('"\''),
                'active': int(parts[4]) if len(parts) > 4 and parts[4].strip() else 1,
                'raw_line': line
            }
        except (ValueError, IndexError) as e:
            logger.warning(f"解析STAGE行失败: {line} - {e}")
            return None
    
    def parse_analysis_stage_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析ANALSTAG行 - 分析阶段设置"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) < 4:
                return None
                
            return {
                'id': int(parts[1]),
                'name': parts[2].strip('"\''),
                'start_stage': int(parts[3]) if parts[3].strip() else 1,
                'end_stage': int(parts[4]) if len(parts) > 4 and parts[4].strip() else 1,
                'raw_line': line
            }
        except (ValueError, IndexError) as e:
            logger.warning(f"解析ANALSTAG行失败: {line} - {e}")
            return None
    
    def parse_stage_operation_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析阶段操作行 - MADD, LADD, BADD, MDEL等"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) < 3:
                return None
                
            operation = parts[0].strip()
            stage_id = int(parts[1])
            count = int(parts[2]) if parts[2].strip() else 0
            
            # 提取ID列表
            ids = []
            for part in parts[3:]:
                if part.strip() and part.strip() != '':
                    try:
                        ids.append(int(part))
                    except ValueError:
                        continue
            
            return {
                'operation': operation,
                'stage_id': stage_id,
                'count': count,
                'ids': ids,
                'raw_line': line
            }
        except (ValueError, IndexError) as e:
            logger.warning(f"解析阶段操作行失败: {line} - {e}")
            return None


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
    fpn_file = Path(__file__).parent.parent / "data" / "基坑两阶段1fpn.fpn"
    
    if fpn_file.exists():
        print(f"测试解析文件: {fpn_file}")
        
        parser = OptimizedFPNParser(progress_callback=create_progress_callback())
        
        try:
            result = parser.parse_file_streaming(str(fpn_file))
            print(f"\n解析成功!")
            print(f"节点数量: {len(result['nodes'])}")
            print(f"单元数量: {len(result['elements'])}")
            print(f"分析阶段数量: {len(result['stages'])}")
            print(f"使用编码: {result['metadata']['encoding']}")
            print(f"坐标偏移: {result['metadata']['coordinate_offset']}")
            
        except Exception as e:
            print(f"\n解析失败: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"测试文件不存在: {fpn_file}")
