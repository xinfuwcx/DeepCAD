#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优化的FPN文件解析器
专门处理大型MIDAS GTS NX FPN文件，支持流式处理和内存优化
"""

import os
import numpy as np
from pathlib import Path
from typing import Dict, Any, Iterator, Tuple, Optional, List
from dataclasses import dataclass
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# 可选的编码探测库
try:
    import chardet  # type: ignore
    HAS_CHARDET = True
except Exception:
    HAS_CHARDET = False

import codecs


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

        # 支持的编码列表（含BOM与常见中文编码）
        self.encodings = [
            'utf-8-sig', 'utf-8', 'gb18030', 'gbk', 'cp936', 'big5',
            'utf-16', 'utf-16-le', 'utf-16-be', 'latin1', 'cp1252'
        ]

        # 数据缓存
        self.nodes_cache = {}
        self.elements_cache = {}

    def detect_file_encoding(self, file_path: str) -> str:
        """检测文件编码（优先BOM/候选列表；可选chardet作为最后尝试）"""
        # 1) BOM 检测
        try:
            with open(file_path, 'rb') as fb:
                raw = fb.read(4)
            for enc, bom in [("utf-8-sig", codecs.BOM_UTF8), ("utf-16-le", codecs.BOM_UTF16_LE), ("utf-16-be", codecs.BOM_UTF16_BE)]:
                if raw.startswith(bom):
                    logger.info(f"检测到文件BOM，编码使用: {enc}")
                    return enc
        except Exception:
            pass

        # 2) 逐个候选尝试（容错读取，errors='strict'，快速失败）
        for encoding in self.encodings:
            try:
                with open(file_path, 'r', encoding=encoding, errors='strict') as f:
                    for i, line in enumerate(f):
                        if i > 1000:
                            break
                        _ = line  # 触发解码
                logger.info(f"检测到文件编码: {encoding}")
                return encoding
            except Exception:
                continue

        # 3) 可选 chardet 猜测（较慢，少用）
        if HAS_CHARDET:
            try:
                with open(file_path, 'rb') as fb:
                    sample = fb.read(200000)
                guess = chardet.detect(sample)
                enc = (guess.get('encoding') or '').lower()
                if enc:
                    logger.info(f"chardet 猜测编码: {enc}")
                    return enc
            except Exception:
                pass

        # 4) 仍失败：使用最兼容的 latin1
        logger.warning("无法检测文件编码，使用 latin1 作为 fallback")
        return 'latin1'

    def count_file_lines(self, file_path: str, encoding: str) -> int:
        """快速统计文件行数（容错读取）"""
        try:
            with open(file_path, 'r', encoding=encoding, errors='replace') as f:
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
            with open(file_path, 'r', encoding=encoding, errors='replace') as f:
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

    def parse_mesh_set_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析网格集合行"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 3:
                return {
                    'id': int(parts[1]),
                    'name': parts[2].strip() if parts[2] else f"MeshSet_{parts[1]}",
                    'type': 'mesh_set'
                }
        except (ValueError, IndexError) as e:
            logger.debug(f"解析网格集合行失败: {line[:50]}... - {e}")
        return None

    def parse_stage_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析分析步行"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 4:
                return {
                    'id': int(parts[1]),
                    'type': int(parts[2]) if parts[2] else 0,
                    'name': parts[3].strip() if parts[3] else f"Stage_{parts[1]}",
                    'active_materials': [],
                    'active_loads': [],
                    'active_boundaries': [],
                    # 新增：按阶段记录物理组命令，便于累计应用（MADD/MDEL/LADD/BADD）
                    'group_commands': []
                }
        except (ValueError, IndexError) as e:
            logger.debug(f"解析分析步行失败: {line[:50]}... - {e}")
        return None

    def parse_load_group_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析荷载组行 (LSET)"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 3:
                return {
                    'id': int(parts[1]),
                    'name': parts[2].strip() if parts[2] else f"LoadGroup_{parts[1]}",
                    'type': 'load_group'
                }
        except (ValueError, IndexError) as e:
            logger.debug(f"解析荷载组行失败: {line[:50]}... - {e}")
        return None

    def parse_boundary_set_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析边界组行 (BSET)"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 3:
                return {
                    'id': int(parts[1]),
                    'name': parts[2].strip() if parts[2] else f"BoundaryGroup_{parts[1]}",
                    'type': 'boundary_group'
                }
        except (ValueError, IndexError) as e:
            logger.debug(f"解析边界组行失败: {line[:50]}... - {e}")
        return None

    def parse_const_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析约束行 (CONST , group_id, node_id, dof_code)"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 4:
                group_id = int(parts[1]) if parts[1] else None
                node_id = int(parts[2]) if parts[2] else None
                code_str = parts[3] if parts[3] else ''
                # 规范化为6位字符串
                code_str = ''.join(ch for ch in code_str if ch.isdigit())
                if len(code_str) < 6:
                    code_str = (code_str + '000000')[:6]
                dof_bools = [c == '1' for c in code_str[:6]]
                return {
                    'group_id': group_id,
                    'node_id': node_id,
                    'dof_code': code_str,
                    'dof_bools': dof_bools
                }
        except (ValueError, IndexError) as e:
            logger.debug(f"解析CONST行失败: {line[:50]}... - {e}")
        return None

    def parse_madd_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析MADD（材料添加）行"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 3:
                stage_id = int(parts[1]) if parts[1] else None
                material_count = int(parts[2]) if parts[2] else 0

                # 解析材料ID列表（从第4个参数开始）
                materials = []
                for i in range(3, len(parts)):
                    if parts[i] and parts[i].isdigit():
                        materials.append(int(parts[i]))

                return {
                    'stage_id': stage_id,
                    'material_count': material_count,
                    'materials': materials,
                    'type': 'material_add'
                }
        except (ValueError, IndexError) as e:
            logger.debug(f"解析MADD行失败: {line[:50]}... - {e}")
        return None

    def parse_mdel_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析MDEL（材料删除）行"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 3:
                stage_id = int(parts[1]) if parts[1] else None

                # 解析要删除的材料ID列表
                materials = []
                for i in range(3, len(parts)):
                    if parts[i] and parts[i].isdigit():
                        materials.append(int(parts[i]))

                return {
                    'stage_id': stage_id,
                    'materials': materials,
                    'type': 'material_delete'
                }
        except (ValueError, IndexError) as e:
            logger.debug(f"解析MDEL行失败: {line[:50]}... - {e}")
        return None

    def parse_ladd_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析LADD（荷载添加）行"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 4:
                stage_id = int(parts[1]) if parts[1] else None
                load_group = int(parts[2]) if parts[2] else None

                return {
                    'stage_id': stage_id,
                    'loads': [load_group] if load_group else [],
                    'type': 'load_add'
                }
        except (ValueError, IndexError) as e:
            logger.debug(f"解析LADD行失败: {line[:50]}... - {e}")
        return None

    def parse_badd_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析BADD（边界添加）行"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 4:
                stage_id = int(parts[1]) if parts[1] else None
                boundary_group = int(parts[2]) if parts[2] else None

                return {
                    'stage_id': stage_id,
                    'boundaries': [boundary_group] if boundary_group else [],
                    'type': 'boundary_add'
                }
        except (ValueError, IndexError) as e:
            logger.debug(f"解析BADD行失败: {line[:50]}... - {e}")
        return None

    def parse_continuation_line(self, line: str) -> List[int]:
        """解析跨行的材料ID列表"""
        try:
            parts = [p.strip() for p in line.split(',')]
            materials = []
            for part in parts:
                if part and part.isdigit():
                    materials.append(int(part))
            return materials
        except (ValueError, IndexError) as e:
            logger.debug(f"解析跨行数据失败: {line[:50]}... - {e}")
        return []

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
            'prestress_loads': [],  # 预应力（假力）条目

            'elements': {},                    # 体单元（TETRA/HEXA/PENTA）
            'line_elements': {},               # 线单元（锚杆/拉索）
            'plate_elements': {},              # 板单元（TRIA/QUAD 等）
            'materials': {},                   # 材料: id -> { id, name, properties }
            'shell_properties': {},            # PSHELL: prop_id -> { id, name, thickness, ... }
            'truss_sections': {},              # PETRUSS: prop_id -> { id, name, ... }

            'material_groups': {},
            'load_groups': {},
            'boundary_groups': {},
            'analysis_stages': [],
            'mesh_sets': {},
            'metadata': {
                'encoding': encoding,
                'coordinate_offset': self.coordinate_offset,
                'total_lines': total_lines
            }
        }

        current_section = "unknown"

        try:
            # 容错读取，避免解码失败导致中断
            with open(file_path, 'r', encoding=encoding, errors='replace') as f:
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

                    elif line.startswith('LINE'):
                        # 线单元（用于锚杆/拉索）: LINE, EID, PropId, N1, N2, ...
                        current_section = "line_elements"
                        try:
                            parts = [p.strip() for p in line.split(',')]
                            if len(parts) >= 5:
                                eid = int(parts[1])
                                prop = int(parts[2]) if parts[2] else None
                                n1 = int(parts[3])
                                n2 = int(parts[4])
                                result['line_elements'][eid] = {
                                    'id': eid, 'prop_id': prop, 'n1': n1, 'n2': n2
                                }
                        except Exception:
                            pass

                    elif line.startswith(('TRIA', 'CTRIA', 'CQUAD', 'QUAD')):
                        # 板单元：TRIA/QUAD，格式示例：TRIA, EID, PropId, N1, N2, N3[, N4]
                        current_section = "plate_elements"
                        try:
                            parts = [p.strip() for p in line.split(',')]
                            if len(parts) >= 6:
                                eid = int(parts[1])
                                prop = int(parts[2]) if parts[2] else None
                                nodes = [int(n) for n in parts[3:] if n]
                                result['plate_elements'][eid] = {
                                    'id': eid, 'prop_id': prop, 'nodes': nodes
                                }
                        except Exception:
                            pass

                    elif line.startswith(('PSHELL')):
                        # 板属性：PSHELL, PropId, Name, ... 厚度通常在参数7或8位
                        current_section = "shell_properties"
                        try:
                            parts = [p.strip() for p in line.split(',')]
                            if len(parts) >= 3:
                                pid = int(parts[1])
                                name = parts[2]
                                thickness = None
                                try:
                                    # 常见：..., 1, 0, -1, 1, 0.8, 1., 1., 1., ...
                                    # 先尝试第7个字段
                                    thickness = float(parts[7]) if len(parts) > 7 and parts[7] else None
                                except Exception:
                                    thickness = None
                                result['shell_properties'][pid] = {
                                    'id': pid, 'name': name, 'thickness': thickness
                                }
                        except Exception:
                            pass

                    elif line.startswith(('MISO', 'MATGEN', 'MATPORO', 'MNLMC')):
                        # 材料定义区：提取材料ID/名称和关键参数（弹性模量、泊松比、密度、φ、c 等）
                        try:
                            parts = [p.strip() for p in line.split(',')]
                            if line.startswith('MISO') and len(parts) >= 3:
                                mid = int(parts[1]) if parts[1] else None
                                mname = parts[2] if len(parts) > 2 else f"Material_{mid}"
                                if mid is not None:
                                    result['materials'].setdefault(mid, {
                                        'id': mid,
                                        'name': mname,
                                        'properties': {'type': 'soil'}
                                    })
                            elif line.startswith('MATGEN') and len(parts) >= 6:
                                # 经验映射：MATGEN, mid, E(MPa), ?, ?, nu, gamma(kN/m3), ...
                                mid = int(parts[1]) if parts[1] else None
                                if mid is not None:
                                    mat = result['materials'].setdefault(mid, {
                                        'id': mid,
                                        'name': f"Material_{mid}",
                                        'properties': {'type': 'soil'}
                                    })
                                    try:
                                        E_MPa = float(parts[2]) if parts[2] else None
                                        nu = float(parts[5]) if len(parts) > 5 and parts[5] else None
                                        gamma = float(parts[6]) if len(parts) > 6 and parts[6] else None
                                        if E_MPa is not None:
                                            mat['properties']['E'] = E_MPa * 1e6  # MPa->Pa
                                        if nu is not None:
                                            mat['properties']['NU'] = nu
                                        if gamma is not None:
                                            mat['properties']['DENSITY'] = gamma * 1000.0 / 9.80665  # kN/m3 -> kg/m3
                                    except Exception:
                                        pass
                            elif line.startswith('MATPORO') and len(parts) >= 3:
                                mid = int(parts[1]) if parts[1] else None
                                if mid is not None:
                                    mat = result['materials'].setdefault(mid, {
                                        'id': mid,
                                        'name': f"Material_{mid}",
                                        'properties': {'type': 'soil'}
                                    })
                                    try:
                                        # MATPORO, mid, t(K), n, ... -> 这里我们只拿孔隙率n
                                        n = float(parts[3]) if len(parts) > 3 and parts[3] else None
                                        if n is not None:
                                            mat['properties']['POROSITY'] = n
                                    except Exception:
                                        pass
                            elif line.startswith('MNLMC') and len(parts) >= 6:
                                # Mohr-Coulomb 参数：MNLMC, mid, phi, ?, ?, c(kPa), ...
                                mid = int(parts[1]) if parts[1] else None
                                if mid is not None:
                                    mat = result['materials'].setdefault(mid, {
                                        'id': mid,
                                        'name': f"Material_{mid}",
                                        'properties': {'type': 'soil'}
                                    })
                                    try:
                                        phi = float(parts[2]) if parts[2] else None
                                        c_kPa = float(parts[5]) if len(parts) > 5 and parts[5] else None
                                        if phi is not None:
                                            mat['properties']['FRICTION_ANGLE'] = phi
                                        if c_kPa is not None:
                                            mat['properties']['COHESION'] = c_kPa * 1e3  # kPa->Pa
                                    except Exception:
                                        pass
                        except Exception:
                            pass

                    elif line.startswith('MSET'):
                        current_section = "mesh_sets"
                        mesh_set_data = self.parse_mesh_set_line(line)
                        if mesh_set_data:
                            result['mesh_sets'][mesh_set_data['id']] = mesh_set_data

                    elif line.startswith('STAGE'):
                        current_section = "analysis_stages"
                        stage_data = self.parse_stage_line(line)
                        if stage_data:
                            result['analysis_stages'].append(stage_data)

                    elif line.startswith('MADD'):
                        # 材料添加操作 - 可能跨多行
                        current_section = "madd_operation"
                        madd_data = self.parse_madd_line(line)
                        if madd_data and result['analysis_stages']:
                            # 添加到最近的分析步
                            result['analysis_stages'][-1]['active_materials'].extend(madd_data['materials'])
                            # 存储当前操作以处理后续行
                            self.current_madd_stage = len(result['analysis_stages']) - 1
                            # 记录到group_commands，使用行内stage_id（若缺省则使用最近STAGE的id）
                            try:
                                stage_obj = result['analysis_stages'][-1]
                                sid = madd_data.get('stage_id') or stage_obj.get('id')
                                stage_obj.setdefault('group_commands', []).append({
                                    'stage_id': int(sid) if sid is not None else stage_obj.get('id', 0),
                                    'command': 'MADD',
                                    'group_ids': list(madd_data.get('materials') or [])
                                })
                            except Exception:
                                pass

                    elif line.startswith('MDEL'):
                        # 材料删除操作 - 可能跨多行
                        current_section = "mdel_operation"
                        mdel_data = self.parse_mdel_line(line)
                        if mdel_data and result['analysis_stages']:
                            # 从最近的分析步删除
                            stage = result['analysis_stages'][-1]
                            for mat_id in mdel_data['materials']:
                                if mat_id in stage['active_materials']:
                                    stage['active_materials'].remove(mat_id)
                            # 存储当前操作以处理后续行
                            self.current_mdel_stage = len(result['analysis_stages']) - 1
                            # 记录到group_commands
                            try:
                                stage_obj = result['analysis_stages'][-1]
                                sid = mdel_data.get('stage_id') or stage_obj.get('id')
                                stage_obj.setdefault('group_commands', []).append({
                                    'stage_id': int(sid) if sid is not None else stage_obj.get('id', 0),
                                    'command': 'MDEL',
                                    'group_ids': list(mdel_data.get('materials') or [])
                                })
                            except Exception:
                                pass

                    elif line.startswith('LADD'):
                        # 荷载添加操作
                        ladd_data = self.parse_ladd_line(line)
                        if ladd_data and result['analysis_stages']:
                            result['analysis_stages'][-1]['active_loads'].extend(ladd_data['loads'])
                            # 记录到group_commands
                            try:
                                stage_obj = result['analysis_stages'][-1]
                                sid = ladd_data.get('stage_id') or stage_obj.get('id')
                                stage_obj.setdefault('group_commands', []).append({
                                    'stage_id': int(sid) if sid is not None else stage_obj.get('id', 0),
                                    'command': 'LADD',
                                    'group_ids': list(ladd_data.get('loads') or [])
                                })
                            except Exception:
                                pass

                    elif line.startswith('BADD'):
                        # 边界添加操作
                        current_section = "badd_operation"
                        badd_data = self.parse_badd_line(line)
                        if badd_data and result['analysis_stages']:
                            result['analysis_stages'][-1]['active_boundaries'].extend(badd_data['boundaries'])
                            # 记录到group_commands
                            try:
                                stage_obj = result['analysis_stages'][-1]
                                sid = badd_data.get('stage_id') or stage_obj.get('id')
                                stage_obj.setdefault('group_commands', []).append({
                                    'stage_id': int(sid) if sid is not None else stage_obj.get('id', 0),
                                    'command': 'BADD',
                                    'group_ids': list(badd_data.get('boundaries') or [])
                                })
                            except Exception:
                                pass

                    elif current_section in ["madd_operation", "mdel_operation"] and line.strip().startswith(','):
                        # 处理跨行的材料ID列表
                        additional_materials = self.parse_continuation_line(line)
                        if additional_materials and result['analysis_stages']:
                            if current_section == "madd_operation" and hasattr(self, 'current_madd_stage'):
                                stage_idx = self.current_madd_stage
                                result['analysis_stages'][stage_idx]['active_materials'].extend(additional_materials)
                                # 同时追加一条等效的group_commands记录，确保累计逻辑正确
                                try:
                                    stage_obj = result['analysis_stages'][stage_idx]
                                    sid = stage_obj.get('id')
                                    stage_obj.setdefault('group_commands', []).append({
                                        'stage_id': int(sid) if sid is not None else 0,
                                        'command': 'MADD',
                                        'group_ids': list(additional_materials)
                                    })
                                except Exception:
                                    pass
                            elif current_section == "mdel_operation" and hasattr(self, 'current_mdel_stage'):
                                stage_idx = self.current_mdel_stage
                                stage = result['analysis_stages'][stage_idx]
                                for mat_id in additional_materials:
                                    if mat_id in stage['active_materials']:
                                        stage['active_materials'].remove(mat_id)
                                # 同步记录MDEL命令
                                try:
                                    stage_obj = result['analysis_stages'][stage_idx]
                                    sid = stage_obj.get('id')
                                    stage_obj.setdefault('group_commands', []).append({
                                        'stage_id': int(sid) if sid is not None else 0,
                                        'command': 'MDEL',
                                        'group_ids': list(additional_materials)
                                    })
                                except Exception:
                                    pass

                    elif line.startswith('LSET'):
                        current_section = "load_groups"
                        load_group_data = self.parse_load_group_line(line)
                        if load_group_data:
                            result['load_groups'][load_group_data['id']] = load_group_data

                    elif line.startswith('PETRUSS'):
                        # TRUSS截面/属性定义: PETRUSS, PropId, Name, ...
                        current_section = "truss_sections"
                        try:
                            parts = [p.strip() for p in line.split(',')]
                            if len(parts) >= 3:
                                pid = int(parts[1])
                                name = parts[2]
                                result.setdefault('truss_sections', {})[pid] = {'id': pid, 'name': name}
                        except Exception:
                            pass

                    elif line.startswith('PSTRST'):
                        # 预应力定义: PSTRST, group_or_stage, element_id, force(N), ...
                        try:
                            parts = [p.strip() for p in line.split(',')]
                            if len(parts) >= 4:
                                grp = int(parts[1]) if parts[1] else None
                                eid = int(parts[2])
                                force = float(parts[3])
                                result.setdefault('prestress_loads', []).append({
                                    'group': grp, 'element_id': eid, 'force': force
                                })
                        except Exception:
                            pass

                    elif line.startswith('BSET'):
                        current_section = "boundary_groups"
                        bset = self.parse_boundary_set_line(line)
                        if bset:
                            result['boundary_groups'][bset['id']] = bset

                    elif line.startswith('CONST'):
                        current_section = "constraints"
                        cst = self.parse_const_line(line)
                        if cst:
                            gid = cst['group_id']
                            if gid is not None:
                                grp = result['boundary_groups'].setdefault(gid, {'id': gid, 'name': f'BoundaryGroup_{gid}', 'type': 'boundary_group'})
                                nodes = grp.setdefault('nodes', [])
                                dofs = grp.setdefault('constraints', [])
                                nodes.append(cst['node_id'])
                                dofs.append({'node': cst['node_id'], 'dof_code': cst['dof_code'], 'dof_bools': cst['dof_bools']})

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

        # 转换为列表格式以兼容现有代码（仅体单元转列表）
        result['nodes'] = list(result['nodes'].values())
        result['elements'] = list(result['elements'].values())
        # 线元/板元/属性字典保持字典结构，便于通过id/prop_id查询

        logger.info(f"解析完成: {len(result['nodes'])}个节点, {len(result['elements'])}个体单元, "
                    f"{len(result.get('plate_elements') or {})}个板单元, {len(result.get('line_elements') or {})}个线元")

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
