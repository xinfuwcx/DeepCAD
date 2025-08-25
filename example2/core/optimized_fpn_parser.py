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
            if len(parts) >= 2:
                # 兼容格式: MSET , <id> , name ...（中间可能有空白字段）
                mset_id = None
                for tok in parts[1:]:
                    if tok and tok.isdigit():
                        mset_id = int(tok)
                        break
                if mset_id is not None:
                    name = None
                    # 尝试取紧随其后的非空字符串作为名称
                    seen_id = False
                    for tok in parts[1:]:
                        if tok and tok.isdigit() and int(tok) == mset_id and not seen_id:
                            seen_id = True
                            continue
                        if seen_id and tok:
                            name = tok
                            break
                    return {
                        'id': mset_id,
                        'name': name.strip() if name else f"MeshSet_{mset_id}",
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
                # 处理中文编码问题
                stage_name = parts[3].strip() if parts[3] else f"Stage_{parts[1]}"

                # 尝试修复编码问题 - 更全面的编码修复
                if stage_name and ('��' in stage_name or len(stage_name.encode('utf-8', errors='ignore')) != len(stage_name)):
                    stage_id = int(parts[1])
                    # 根据分析步ID推断常见名称
                    if stage_id == 1:
                        stage_name = "初始地应力"
                    elif stage_id == 2:
                        stage_name = "第一层开挖"
                    elif stage_id == 3:
                        stage_name = "第二层开挖"
                    elif stage_id == 4:
                        stage_name = "第三层开挖"
                    elif stage_id == 5:
                        stage_name = "第四层开挖"
                    elif stage_id == 6:
                        stage_name = "第五层开挖"
                    elif stage_id == 7:
                        stage_name = "第六层开挖"
                    elif stage_id == 8:
                        stage_name = "第七层开挖"
                    elif stage_id == 9:
                        stage_name = "第八层开挖"
                    elif stage_id == 10:
                        stage_name = "第九层开挖"
                    elif stage_id == 11:
                        stage_name = "第十层开挖"
                    else:
                        stage_name = f"施工阶段{stage_id}"

                return {
                    'id': int(parts[1]),
                    'type': int(parts[2]) if parts[2] else 0,
                    'name': stage_name,
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
        """解析MADD（网格集合添加）行：MADD, stage_id, count, gid1, gid2, ..."""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 3:
                stage_id = int(parts[1]) if parts[1] else None
                count = int(parts[2]) if parts[2] else 0

                group_ids = []
                for i in range(3, len(parts)):
                    if parts[i] and parts[i].isdigit():
                        group_ids.append(int(parts[i]))

                return {
                    'stage_id': stage_id,
                    'count': count,
                    'group_ids': group_ids,
                    'type': 'mesh_add'
                }
        except (ValueError, IndexError) as e:
            logger.debug(f"解析MADD行失败: {line[:50]}... - {e}")
        return None

    def parse_mdel_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析MDEL（网格集合删除）行：MDEL, stage_id, gid1, gid2, ..."""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 2:
                stage_id = int(parts[1]) if parts[1] else None

                group_ids = []
                for p in parts[2:]:
                    if p and p.isdigit():
                        group_ids.append(int(p))

                return {
                    'stage_id': stage_id,
                    'group_ids': group_ids,
                    'type': 'mesh_delete'
                }
        except (ValueError, IndexError) as e:
            logger.debug(f"解析MDEL行失败: {line[:50]}... - {e}")
        return None

    def parse_ladd_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析LADD（荷载添加）行：LADD, stage, count, gid1, gid2, ..."""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 4:
                stage_id = int(parts[1]) if parts[1] else None
                # 第3列为数量count，真正的组号从第4列开始
                group_ids = []
                for p in parts[3:]:
                    if p and p.isdigit():
                        group_ids.append(int(p))
                return {
                    'stage_id': stage_id,
                    'loads': group_ids,
                    'type': 'load_add'
                }
        except (ValueError, IndexError) as e:
            logger.debug(f"解析LADD行失败: {line[:50]}... - {e}")
        return None

    def parse_badd_line(self, line: str) -> Optional[Dict[str, Any]]:
        """解析BADD（边界添加）行：BADD, stage, count, gid1, gid2, ..."""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 4:
                stage_id = int(parts[1]) if parts[1] else None
                group_ids = []
                for p in parts[3:]:
                    if p and p.isdigit():
                        group_ids.append(int(p))
                return {
                    'stage_id': stage_id,
                    'boundaries': group_ids,
                    'type': 'boundary_add'
                }
        except (ValueError, IndexError) as e:
            logger.debug(f"解析BADD行失败: {line[:50]}... - {e}")
        return None

    def parse_continuation_line(self, line: str) -> List[int]:
        """解析跨行的ID列表（集合/荷载/边界等）"""
        try:
            parts = [p.strip() for p in line.split(',')]
            ids = []
            for part in parts:
                if part and part.isdigit():
                    ids.append(int(part))
            return ids
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

        # 预备：阶段命令的暂存（当 LADD/BADD 在 STAGE 之前出现时使用）
        self._pending_stage_cmds = {}
        self.current_badd_stage_id_pending = None
        self.current_ladd_stage_id_pending = None
        self.current_madd_stage_id_pending = None
        self.current_mdel_stage_id_pending = None

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
            'stage_elements': {},      # 每个阶段的单元状态
            'stage_loads': {},         # 每个阶段的载荷
            'stage_boundaries': {},    # 每个阶段的边界条件
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

                    # 处理 MSETE/MSETN、LSETE/LSETN、BSETE/BSETN 的续行（逗号开头）
                    if line.startswith(','):
                        # 先处理阶段命令(MADD/MDEL/LADD/BADD)的续行（因为这是行首逗号的通用续行形式）
                        if current_section in ["madd_operation", "mdel_operation", "ladd_operation", "badd_operation"]:
                            ids_more = self.parse_continuation_line(line)
                            if ids_more:
                                # 复用下面已实现的追加逻辑：直接人工调用一遍对应分支
                                if current_section == "madd_operation":
                                    if hasattr(self, 'current_madd_stage') and result['analysis_stages']:
                                        stage_idx = self.current_madd_stage
                                        try:
                                            stage_obj = result['analysis_stages'][stage_idx]
                                            sid = stage_obj.get('id')
                                            stage_obj.setdefault('group_commands', []).append({'stage_id': int(sid) if sid is not None else 0,'command': 'MADD','group_ids': list(ids_more)})
                                        except Exception:
                                            pass
                                    elif hasattr(self, 'current_madd_stage_id_pending') and self.current_madd_stage_id_pending is not None:
                                        try:
                                            sid = int(self.current_madd_stage_id_pending)
                                            pend_list = self._pending_stage_cmds.setdefault(sid, [])
                                            if not pend_list or pend_list[-1].get('command') != 'MADD':
                                                pend_list.append({'stage_id': sid, 'command': 'MADD', 'group_ids': list(ids_more)})
                                            else:
                                                pend_list[-1].setdefault('group_ids', []).extend(ids_more)
                                        except Exception:
                                            pass
                                elif current_section == "mdel_operation":
                                    if hasattr(self, 'current_mdel_stage') and result['analysis_stages']:
                                        stage_idx = self.current_mdel_stage
                                        try:
                                            stage_obj = result['analysis_stages'][stage_idx]
                                            sid = stage_obj.get('id')
                                            stage_obj.setdefault('group_commands', []).append({'stage_id': int(sid) if sid is not None else 0,'command': 'MDEL','group_ids': list(ids_more)})
                                        except Exception:
                                            pass
                                    elif hasattr(self, 'current_mdel_stage_id_pending') and self.current_mdel_stage_id_pending is not None:
                                        try:
                                            sid = int(self.current_mdel_stage_id_pending)
                                            pend_list = self._pending_stage_cmds.setdefault(sid, [])
                                            if not pend_list or pend_list[-1].get('command') != 'MDEL':
                                                pend_list.append({'stage_id': sid, 'command': 'MDEL', 'group_ids': list(ids_more)})
                                            else:
                                                pend_list[-1].setdefault('group_ids', []).extend(ids_more)
                                        except Exception:
                                            pass
                                elif current_section == "ladd_operation":
                                    if hasattr(self, 'current_ladd_stage') and result['analysis_stages']:
                                        stage_idx = self.current_ladd_stage
                                        result['analysis_stages'][stage_idx]['active_loads'].extend(ids_more)
                                        try:
                                            stage_obj = result['analysis_stages'][stage_idx]
                                            sid = stage_obj.get('id')
                                            stage_obj.setdefault('group_commands', []).append({'stage_id': int(sid) if sid is not None else 0,'command': 'LADD','group_ids': list(ids_more)})
                                        except Exception:
                                            pass
                                elif current_section == "badd_operation":
                                    if hasattr(self, 'current_badd_stage') and result['analysis_stages']:
                                        stage_idx = self.current_badd_stage
                                        result['analysis_stages'][stage_idx]['active_boundaries'].extend(ids_more)
                                        try:
                                            stage_obj = result['analysis_stages'][stage_idx]
                                            sid = stage_obj.get('id')
                                            stage_obj.setdefault('group_commands', []).append({'stage_id': int(sid) if sid is not None else 0,'command': 'BADD','group_ids': list(ids_more)})
                                        except Exception:
                                            pass
                        # MSET 续行
                        if getattr(self, 'current_mset_id', None) is not None:
                            try:
                                nums = []
                                for x in line.split(','):
                                    t = x.strip()
                                    if not t:
                                        continue
                                    try:
                                        nums.append(int(t))
                                    except Exception:
                                        pass
                                if nums:
                                    kind = getattr(self, 'current_mset_kind', None)
                                    if kind == 'elements':
                                        result['mesh_sets'][self.current_mset_id]['elements'].extend(nums)
                                        if self.current_mset_id in {46,47,48,49,50,51,52,53,57,58,61,62,83,89,91,602,611,1702,1703}:
                                            print(f"[DEBUG] Append to MSET {self.current_mset_id} elements += {len(nums)} (total={len(result['mesh_sets'][self.current_mset_id]['elements'])})")
                                    elif kind == 'nodes':
                                        result['mesh_sets'][self.current_mset_id]['nodes'].extend(nums)
                                        if self.current_mset_id in {46,47,48,49,50,51,52,53,57,58,61,62,83,89,91,602,611,1702,1703}:
                                            print(f"[DEBUG] Append to MSET {self.current_mset_id} nodes += {len(nums)} (total={len(result['mesh_sets'][self.current_mset_id]['nodes'])})")
                                    continue
                            except Exception as e:
                                print(f"[DEBUG] Error in MSET continuation: {e}")
                                pass
                        # LSET 续行
                        if getattr(self, 'current_lset_id', None) is not None:
                            try:
                                nums = [int(x) for x in line.split(',') if x.strip().isdigit()]
                                if nums:
                                    kind = getattr(self, 'current_lset_kind', None)
                                    lg = result['load_groups'].setdefault(self.current_lset_id, {'id': self.current_lset_id, 'name': f'LoadGroup_{self.current_lset_id}', 'type': 'load_group'})
                                    if kind == 'elements':
                                        lg.setdefault('elements', []).extend(nums)
                                    elif kind == 'nodes':
                                        lg.setdefault('nodes', []).extend(nums)
                                    continue
                            except Exception:
                                pass
                        # BSET 续行
                        if getattr(self, 'current_bset_id', None) is not None:
                            try:
                                nums = [int(x) for x in line.split(',') if x.strip().isdigit()]
                                if nums:
                                    kind = getattr(self, 'current_bset_kind', None)
                                    bg = result['boundary_groups'].setdefault(self.current_bset_id, {'id': self.current_bset_id, 'name': f'BoundaryGroup_{self.current_bset_id}', 'type': 'boundary_group'})
                                    if kind == 'elements':
                                        bg.setdefault('elements', []).extend(nums)
                                    elif kind == 'nodes':
                                        bg.setdefault('nodes', []).extend(nums)
                                    continue
                            except Exception:
                                pass

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
                        # 板属性：PSHELL, PropId, Name, MaterialId, ... 厚度通常在参数7或8位
                        current_section = "shell_properties"
                        try:
                            parts = [p.strip() for p in line.split(',')]
                            if len(parts) >= 4:
                                pid = int(parts[1])
                                name = parts[2]
                                material_id = int(parts[3]) if parts[3] else 1  # 第4个字段是材料ID
                                thickness = None
                                try:
                                    # 常见：..., 1, 0, -1, 1, 0.8, 1., 1., 1., ...
                                    # 先尝试第7个字段
                                    thickness = float(parts[7]) if len(parts) > 7 and parts[7] else None
                                except Exception:
                                    thickness = None
                                result['shell_properties'][pid] = {
                                    'id': pid, 'name': name, 'material_id': material_id, 'thickness': thickness
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
                                # 经验映射：MATGEN, mid, E(kPa), ?, ?, nu, gamma(kN/m3), ...
                                # 注意：本FPN中E字段为kPa（例如 30000000 = 30,000 MPa = 3e10 Pa）
                                mid = int(parts[1]) if parts[1] else None
                                if mid is not None:
                                    mat = result['materials'].setdefault(mid, {
                                        'id': mid,
                                        'name': f"Material_{mid}",
                                        'properties': {'type': 'soil'}
                                    })
                                    try:
                                        E_kPa = float(parts[2]) if parts[2] else None
                                        nu = float(parts[5]) if len(parts) > 5 and parts[5] else None
                                        gamma = float(parts[6]) if len(parts) > 6 and parts[6] else None
                                        if E_kPa is not None:
                                            mat['properties']['E'] = E_kPa * 1e3  # kPa->Pa
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

                    elif line.startswith('MSET ') or line.startswith('MSET\t'):
                        # 注意：必须与 MSETE/MSETN 区分，否则会误匹配
                        current_section = "mesh_sets"
                        mesh_set_data = self.parse_mesh_set_line(line)
                        if mesh_set_data:
                            # 初始化占位，后续 MSETE/MSETN 会填充 elements/nodes
                            ms = result['mesh_sets'].setdefault(mesh_set_data['id'], mesh_set_data)
                            ms.setdefault('elements', [])
                            ms.setdefault('nodes', [])
                        # 清除当前集合续行状态
                        self.current_mset_id = None
                        self.current_mset_kind = None

                    elif line.startswith('MSETE'):
                        # 网格集合的元素成员开始，后续逗号开头行继续
                        try:
                            parts = [p.strip() for p in line.split(',')]
                            mset_id = int(parts[1]) if parts[1] else None
                            if mset_id is not None:
                                result['mesh_sets'].setdefault(mset_id, {'id': mset_id, 'name': f"MeshSet_{mset_id}", 'type': 'mesh_set', 'elements': [], 'nodes': []})
                                self.current_mset_id = mset_id
                                self.current_mset_kind = 'elements'
                                # 调试：记录开始
                                if mset_id in {46,47,48,49,50,51,52,53,57,58,61,62,83,89,91,602,611,1702,1703}:
                                    print(f"[DEBUG] Start MSETE for set {mset_id}")
                        except Exception:
                            pass
                        current_section = "mesh_set_elements"
                        # 本行可能也带有首批元素（通常为计数，不当作元素ID），因此此处不追加，等待续行','追加
                        try:
                            pass
                        except Exception:
                            pass

                    elif line.startswith('MSETN'):
                        # 网格集合的节点成员开始
                        try:
                            parts = [p.strip() for p in line.split(',')]
                            mset_id = int(parts[1]) if parts[1] else None
                            if mset_id is not None:
                                result['mesh_sets'].setdefault(mset_id, {'id': mset_id, 'name': f"MeshSet_{mset_id}", 'type': 'mesh_set', 'elements': [], 'nodes': []})
                                self.current_mset_id = mset_id
                                self.current_mset_kind = 'nodes'
                        except Exception:
                            pass
                        current_section = "mesh_set_nodes"
                        # 同理：首行多为计数，不在此处追加，等待续行','
                        try:
                            pass
                        except Exception:
                            pass

                    elif line.startswith('STAGE'):
                        current_section = "analysis_stages"
                        # 切换到新段时，结束任何集合续行
                        self.current_mset_id = None
                        self.current_mset_kind = None
                        stage_data = self.parse_stage_line(line)
                        if stage_data:
                            result['analysis_stages'].append(stage_data)
                            # 将任何挂起的组命令附加到这个阶段（按 id 匹配）
                            try:
                                sid = stage_data.get('id')
                                if sid in self._pending_stage_cmds:
                                    stage_data.setdefault('group_commands', []).extend(self._pending_stage_cmds.pop(sid) or [])
                            except Exception:
                                pass

                    elif line.startswith('MADD'):
                        # 集合添加操作 - 可能跨多行
                        current_section = "madd_operation"
                        madd_data = self.parse_madd_line(line)
                        if madd_data:
                            # 过滤无效ID（例如0）
                            gids = [g for g in (madd_data.get('group_ids') or []) if g != 0]
                            try:
                                if result['analysis_stages']:
                                    stage_obj = result['analysis_stages'][-1]
                                    sid = madd_data.get('stage_id') or stage_obj.get('id')
                                    stage_obj.setdefault('group_commands', []).append({
                                        'stage_id': int(sid) if sid is not None else stage_obj.get('id', 0),
                                        'command': 'MADD',
                                        'group_ids': list(gids)
                                    })
                                    # 存储当前操作以处理后续行
                                    self.current_madd_stage = len(result['analysis_stages']) - 1
                                else:
                                    # STAGE 尚未出现：暂存到待附加列表
                                    sid = madd_data.get('stage_id')
                                    if sid is not None:
                                        self._pending_stage_cmds.setdefault(int(sid), []).append({
                                            'stage_id': int(sid),
                                            'command': 'MADD',
                                            'group_ids': list(gids)
                                        })
                                        self.current_madd_stage_id_pending = int(sid)
                            except Exception:
                                pass

                    elif line.startswith('MDEL'):
                        # 集合删除操作 - 可能跨多行
                        current_section = "mdel_operation"
                        mdel_data = self.parse_mdel_line(line)
                        if mdel_data:
                            gids = [g for g in (mdel_data.get('group_ids') or []) if g != 0]
                            try:
                                if result['analysis_stages']:
                                    stage_obj = result['analysis_stages'][-1]
                                    sid = mdel_data.get('stage_id') or stage_obj.get('id')
                                    stage_obj.setdefault('group_commands', []).append({
                                        'stage_id': int(sid) if sid is not None else stage_obj.get('id', 0),
                                        'command': 'MDEL',
                                        'group_ids': list(gids)
                                    })
                                    self.current_mdel_stage = len(result['analysis_stages']) - 1
                                else:
                                    sid = mdel_data.get('stage_id')
                                    if sid is not None:
                                        self._pending_stage_cmds.setdefault(int(sid), []).append({
                                            'stage_id': int(sid),
                                            'command': 'MDEL',
                                            'group_ids': list(gids)
                                        })
                                        self.current_mdel_stage_id_pending = int(sid)
                            except Exception:
                                pass

                    elif line.startswith('LADD'):
                        # 荷载添加操作（支持续行）
                        current_section = "ladd_operation"
                        ladd_data = self.parse_ladd_line(line)
                        if ladd_data and result['analysis_stages']:
                            # 根据行内的stage_id定向到对应阶段；若无则使用最后一个阶段
                            try:
                                target_idx = None
                                sid = ladd_data.get('stage_id')
                                if sid is not None:
                                    for i, st in enumerate(result['analysis_stages']):
                                        if st.get('id') == int(sid):
                                            target_idx = i
                                            break
                                if target_idx is None:
                                    target_idx = len(result['analysis_stages']) - 1
                                # 过滤无效ID（如0）
                                loads = [g for g in (ladd_data.get('loads') or []) if g != 0]
                                result['analysis_stages'][target_idx].setdefault('active_loads', []).extend(loads)
                                stage_obj = result['analysis_stages'][target_idx]
                                stage_obj.setdefault('group_commands', []).append({
                                    'stage_id': int(sid) if sid is not None else stage_obj.get('id', 0),
                                    'command': 'LADD',
                                    'group_ids': list(loads)
                                })
                                # 存储当前操作以处理后续逗号续行
                                self.current_ladd_stage = target_idx
                            except Exception:
                                pass
                        elif ladd_data:
                            # STAGE 尚未出现：暂存 LADD 到待附加列表，支持先 LADD 后 STAGE 的写法
                            try:
                                sid = ladd_data.get('stage_id')
                                if sid is not None:
                                    self._pending_stage_cmds.setdefault(int(sid), []).append({
                                        'stage_id': int(sid),
                                        'command': 'LADD',
                                        'group_ids': list(ladd_data.get('loads') or [])
                                    })
                                    self.current_ladd_stage_id_pending = int(sid)
                            except Exception:
                                pass

                    elif line.startswith('BADD'):
                        # 边界添加操作（支持续行）
                        current_section = "badd_operation"
                        badd_data = self.parse_badd_line(line)
                        if badd_data and result['analysis_stages']:
                            try:
                                target_idx = None
                                sid = badd_data.get('stage_id')
                                if sid is not None:
                                    for i, st in enumerate(result['analysis_stages']):
                                        if st.get('id') == int(sid):
                                            target_idx = i
                                            break
                                if target_idx is None:
                                    target_idx = len(result['analysis_stages']) - 1
                                bounds = [g for g in (badd_data.get('boundaries') or []) if g != 0]
                                result['analysis_stages'][target_idx].setdefault('active_boundaries', []).extend(bounds)
                                stage_obj = result['analysis_stages'][target_idx]
                                stage_obj.setdefault('group_commands', []).append({
                                    'stage_id': int(sid) if sid is not None else stage_obj.get('id', 0),
                                    'command': 'BADD',
                                    'group_ids': list(bounds)
                                })
                                self.current_badd_stage = target_idx
                            except Exception:
                                pass
                        elif badd_data:
                            # STAGE 尚未出现：暂存 BADD 到待附加列表
                            try:
                                sid = badd_data.get('stage_id')
                                if sid is not None:
                                    self._pending_stage_cmds.setdefault(int(sid), []).append({
                                        'stage_id': int(sid),
                                        'command': 'BADD',
                                        'group_ids': list(badd_data.get('boundaries') or [])
                                    })
                                    self.current_badd_stage_id_pending = int(sid)
                            except Exception:
                                pass

                    elif current_section in ["madd_operation", "mdel_operation", "ladd_operation", "badd_operation"] and line.strip().startswith(','):
                        # 处理跨行的ID列表（材料/荷载/边界）
                        ids_more = self.parse_continuation_line(line)
                        if ids_more:
                            if current_section == "madd_operation":
                                if hasattr(self, 'current_madd_stage') and result['analysis_stages']:
                                    stage_idx = self.current_madd_stage
                                    # 记录 MADD 追加（集合）到当前阶段
                                    try:
                                        stage_obj = result['analysis_stages'][stage_idx]
                                        sid = stage_obj.get('id')
                                        stage_obj.setdefault('group_commands', []).append({
                                            'stage_id': int(sid) if sid is not None else 0,
                                            'command': 'MADD',
                                            'group_ids': list(ids_more)
                                        })
                                    except Exception:
                                        pass
                                elif hasattr(self, 'current_madd_stage_id_pending') and self.current_madd_stage_id_pending is not None:
                                    # STAGE 尚未出现：把续行的ID追加到 pending 中最近一条 MADD
                                    try:
                                        sid = int(self.current_madd_stage_id_pending)
                                        pend_list = self._pending_stage_cmds.setdefault(sid, [])
                                        # 若最后一条不是 MADD，则新建；否则追加其 group_ids
                                        if not pend_list or pend_list[-1].get('command') != 'MADD':
                                            pend_list.append({'stage_id': sid, 'command': 'MADD', 'group_ids': list(ids_more)})
                                        else:
                                            pend_list[-1].setdefault('group_ids', []).extend(ids_more)
                                    except Exception:
                                        pass
                            elif current_section == "mdel_operation":
                                if hasattr(self, 'current_mdel_stage') and result['analysis_stages']:
                                    stage_idx = self.current_mdel_stage
                                    # 记录 MDEL 追加（集合）
                                    try:
                                        stage_obj = result['analysis_stages'][stage_idx]
                                        sid = stage_obj.get('id')
                                        stage_obj.setdefault('group_commands', []).append({
                                            'stage_id': int(sid) if sid is not None else 0,
                                            'command': 'MDEL',
                                            'group_ids': list(ids_more)
                                        })
                                    except Exception:
                                        pass
                                elif hasattr(self, 'current_mdel_stage_id_pending') and self.current_mdel_stage_id_pending is not None:
                                    try:
                                        sid = int(self.current_mdel_stage_id_pending)
                                        pend_list = self._pending_stage_cmds.setdefault(sid, [])
                                        if not pend_list or pend_list[-1].get('command') != 'MDEL':
                                            pend_list.append({'stage_id': sid, 'command': 'MDEL', 'group_ids': list(ids_more)})
                                        else:
                                            pend_list[-1].setdefault('group_ids', []).extend(ids_more)
                                    except Exception:
                                        pass
                            elif current_section == "ladd_operation" and hasattr(self, 'current_ladd_stage') and result['analysis_stages']:
                                stage_idx = self.current_ladd_stage
                                result['analysis_stages'][stage_idx]['active_loads'].extend(ids_more)
                                try:
                                    stage_obj = result['analysis_stages'][stage_idx]
                                    sid = stage_obj.get('id')
                                    stage_obj.setdefault('group_commands', []).append({
                                        'stage_id': int(sid) if sid is not None else 0,
                                        'command': 'LADD',
                                        'group_ids': list(ids_more)
                                    })
                                except Exception:
                                    pass
                            elif current_section == "ladd_operation" and hasattr(self, 'current_ladd_stage_id_pending') and self.current_ladd_stage_id_pending is not None:
                                # STAGE 尚未出现：把续行 ID 追加到 pending 中最近一条 LADD
                                try:
                                    sid = int(self.current_ladd_stage_id_pending)
                                    pend_list = self._pending_stage_cmds.setdefault(sid, [])
                                    if not pend_list or pend_list[-1].get('command') != 'LADD':
                                        pend_list.append({'stage_id': sid, 'command': 'LADD', 'group_ids': list(ids_more)})
                                    else:
                                        pend_list[-1].setdefault('group_ids', []).extend(ids_more)
                                except Exception:
                                    pass
                            elif current_section == "badd_operation" and hasattr(self, 'current_badd_stage'):
                                stage_idx = self.current_badd_stage
                                result['analysis_stages'][stage_idx]['active_boundaries'].extend(ids_more)
                                try:
                                    stage_obj = result['analysis_stages'][stage_idx]
                                    sid = stage_obj.get('id')
                                    stage_obj.setdefault('group_commands', []).append({
                                        'stage_id': int(sid) if sid is not None else 0,
                                        'command': 'BADD',
                                        'group_ids': list(ids_more)
                                    })
                                except Exception:
                                    pass
                            elif current_section == "badd_operation" and hasattr(self, 'current_badd_stage_id_pending') and self.current_badd_stage_id_pending is not None:
                                # STAGE 未出现：把续行 ID 追加到 pending 中最近一条 BADD
                                try:
                                    sid = int(self.current_badd_stage_id_pending)
                                    pend_list = self._pending_stage_cmds.setdefault(sid, [])
                                    if not pend_list or pend_list[-1].get('command') != 'BADD':
                                        pend_list.append({'stage_id': sid, 'command': 'BADD', 'group_ids': list(ids_more)})
                                    else:
                                        pend_list[-1].setdefault('group_ids', []).extend(ids_more)
                                except Exception:
                                    pass

                    elif line.startswith('LSET'):
                        current_section = "load_groups"
                        load_group_data = self.parse_load_group_line(line)
                        if load_group_data:
                            result['load_groups'][load_group_data['id']] = load_group_data
                        # 初始化 LSET 续行状态
                        try:
                            parts = [p.strip() for p in line.split(',')]
                            self.current_lset_id = int(parts[1]) if parts[1] else None
                            # 如果本行就带有成员，尝试解析（不严谨但高容错）
                            nums = [int(x) for x in parts[3:] if x and x.isdigit()]
                            if nums:
                                lg = result['load_groups'].setdefault(self.current_lset_id, {'id': self.current_lset_id, 'name': f'LoadGroup_{self.current_lset_id}', 'type': 'load_group'})
                                lg.setdefault('nodes', []).extend(nums)
                        except Exception:
                            self.current_lset_id = None
                            self.current_lset_kind = None
                    elif line.startswith('GRAV'):
                        # 重力加载：GRAV, group_id, 0/1, gx, gy, gz
                        try:
                            parts = [p.strip() for p in line.split(',')]
                            if len(parts) >= 6:
                                gid = int(parts[1]) if parts[1] else None
                                if gid is not None:
                                    gx = float(parts[3] or 0.0)
                                    gy = float(parts[4] or 0.0)
                                    gz = float(parts[5] or -9.80665)
                                    lg = result['load_groups'].setdefault(gid, {'id': gid, 'name': f'LoadGroup_{gid}', 'type': 'load_group'})
                                    lg['gravity'] = [gx, gy, gz]
                        except Exception:
                            pass

                    elif line.startswith('PETRUSS'):
                        # TRUSS截面/属性定义: PETRUSS, PropId, Name, ..., area?, ..., 1, diam?, ...
                        current_section = "truss_sections"
                        try:
                            parts = [p.strip() for p in line.split(',')]
                            if len(parts) >= 3:
                                pid = int(parts[1])
                                name = parts[2]
                                # 提取数值字段用于猜测 area 与 diameter
                                floats = []
                                for p in parts[3:]:
                                    try:
                                        if p:
                                            floats.append(float(p))
                                    except Exception:
                                        continue
                                area = None
                                diam = None
                                # 经验：常见 area 在(1e-6, 1.0) m^2 范围内；直径在(0.005, 2.0) m
                                for v in floats:
                                    if area is None and 1e-6 <= v <= 1.0:
                                        area = v
                                    if diam is None and 0.005 <= v <= 2.0:
                                        # 优先取出现的0.05~1.0范围值作为直径
                                        if 0.02 <= v <= 1.0:
                                            diam = v
                                sec = {'id': pid, 'name': name}
                                if area is not None:
                                    sec['area'] = area
                                if diam is not None:
                                    sec['diameter'] = diam
                                result.setdefault('truss_sections', {})[pid] = sec
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
                        # 初始化 BSET 续行状态
                        try:
                            parts = [p.strip() for p in line.split(',')]
                            self.current_bset_id = int(parts[1]) if parts[1] else None
                            # 本行附带的成员（可能有）
                            nums = [int(x) for x in parts[3:] if x and x.isdigit()]
                            if nums:
                                bg = result['boundary_groups'].setdefault(self.current_bset_id, {'id': self.current_bset_id, 'name': f'BoundaryGroup_{self.current_bset_id}', 'type': 'boundary_group'})
                                bg.setdefault('nodes', []).extend(nums)
                        except Exception:
                            self.current_bset_id = None
                            self.current_bset_kind = None

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
