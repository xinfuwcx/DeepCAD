#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
前处理模块 - PreProcessor
负责网格显示、约束条件、荷载显示等前处理功能
"""

import sys
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QFrame, QLabel
from PyQt6.QtCore import Qt, pyqtSignal

# 添加项目路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

try:
    import pyvista as pv
    from pyvistaqt import QtInteractor
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    print("警告: PyVista不可用，前处理可视化将受限")


class PreProcessor:
    """前处理模块"""
    
    def __init__(self):
        self.mesh = None
        self.constraints = []
        self.loads = []
        self.materials = {}
        self.plotter = None
        self.viewer_widget = None
        self.display_mode = 'transparent'  # 默认半透明模式
        self.current_stage_id = None  # 当前分析步ID
        
        self.create_viewer_widget()
        
    def create_viewer_widget(self):
        """创建3D视图组件"""
        self.viewer_widget = QWidget()
        layout = QVBoxLayout(self.viewer_widget)
        layout.setContentsMargins(0, 0, 0, 0)
        
        if PYVISTA_AVAILABLE:
            # 创建PyVista交互器
            self.plotter = QtInteractor(self.viewer_widget)
            self.plotter.setMinimumSize(600, 400)
            
            # 设置默认场景
            self.setup_default_scene()
            
            layout.addWidget(self.plotter.interactor)
            
        else:
            # 创建占位符
            placeholder = QFrame()
            placeholder.setFrameStyle(QFrame.StyledPanel)
            placeholder.setMinimumSize(600, 400)
            placeholder.setStyleSheet("""
                QFrame {
                    background-color: #f8f9fa;
                    border: 2px dashed #FF6B35;
                    border-radius: 8px;
                }
            """)
            
            label = QLabel("PyVista不可用\n前处理可视化占位符")
            label.setAlignment(Qt.AlignCenter)
            label.setStyleSheet("color: #FF6B35; font-size: 16px; font-weight: bold;")
            
            placeholder_layout = QVBoxLayout(placeholder)
            placeholder_layout.addWidget(label)
            
            layout.addWidget(placeholder)
            
    def setup_default_scene(self):
        """设置默认场景"""
        if not PYVISTA_AVAILABLE:
            return
            
        # 设置背景渐变
        self.plotter.set_background('white', top='lightblue')
        
        # 添加坐标轴
        self.plotter.show_axes()
        
        # 设置相机
        self.plotter.camera_position = 'iso'
        
        # 添加地面网格
        self.add_ground_grid()
        
        # 显示欢迎信息
        self.show_welcome_info()
        
    def add_ground_grid(self):
        """添加地面网格"""
        if not PYVISTA_AVAILABLE:
            return
            
        # 创建地面网格
        grid = pv.Plane(center=(0, 0, 0), direction=(0, 0, 1), 
                       i_size=50, j_size=50, i_resolution=10, j_resolution=10)
        
        self.plotter.add_mesh(grid, color='lightgray', opacity=0.2, 
                             show_edges=True, line_width=0.5, name='ground_grid')
                             
    def show_welcome_info(self):
        """显示欢迎信息"""
        if not PYVISTA_AVAILABLE:
            return
            
        # 添加文本
        self.plotter.add_text("DeepCAD前处理模块\n等待导入网格...", 
                             position='upper_left', font_size=12, color='orange')
                             
    def get_viewer_widget(self):
        """获取3D视图组件"""
        return self.viewer_widget
        
    def load_fpn_file(self, file_path: str):
        """加载MIDAS FPN文件（使用优化解析器）"""
        try:
            from ..core.optimized_fpn_parser import OptimizedFPNParser
            from ..utils.error_handler import handle_error

            file_path = Path(file_path)

            if not file_path.exists():
                raise FileNotFoundError(f"文件不存在: {file_path}")

            print(f"加载FPN文件: {file_path.name}")

            # 创建进度回调
            def progress_callback(progress):
                print(f"\r解析进度: {progress.progress_percent:.1f}% "
                      f"节点:{progress.nodes_count} 单元:{progress.elements_count}",
                      end='', flush=True)

            # 使用优化解析器
            parser = OptimizedFPNParser(progress_callback=progress_callback)
            fpn_data = parser.parse_file_streaming(str(file_path))

            print()  # 换行

            # 保存解析数据
            self.fpn_data = fpn_data

            # 从FPN数据创建网格
            self.create_mesh_from_fpn(fpn_data)

            # 显示网格
            self.display_mesh()

            print(f"FPN文件解析完成: 节点{len(fpn_data.get('nodes', []))}, 单元{len(fpn_data.get('elements', []))}")
            print(f"使用编码: {fpn_data.get('metadata', {}).get('encoding', '未知')}")
            print(f"坐标偏移: {fpn_data.get('metadata', {}).get('coordinate_offset', (0,0,0))}")

        except Exception as e:
            # 使用友好的错误处理
            try:
                from ..utils.error_handler import handle_error
                handle_error(e, f"加载FPN文件: {file_path.name}", show_dialog=False)
            except ImportError:
                print(f"加载FPN文件失败: {e}")
            raise e
    
    def parse_fpn_file(self, file_path: str) -> Dict[str, Any]:
        """解析真实的MIDAS GTS NX FPN文件格式"""
        fpn_data = {
            'nodes': [],
            'elements': [], 
            'materials': set(),  # 使用set收集材料ID
            'constraints': [],
            'loads': [],
            'construction_stages': [],
            'analysis_stages': [],  # 分析步信息
            'material_groups': {},  # 材料组信息
            'load_groups': {},      # 荷载组信息
            'boundary_groups': {},  # 边界组信息
            'file_info': {}
        }
        
        try:
            # 尝试不同编码读取文件
            lines = []
            file_encoding = None
            for encoding in ['utf-8', 'gbk', 'latin1']:
                try:
                    with open(file_path, 'r', encoding=encoding, errors='ignore') as f:
                        lines = f.readlines()
                    file_encoding = encoding
                    print(f"使用{encoding}编码成功读取FPN文件，共{len(lines)}行")
                    break
                except:
                    continue
            
            if not lines:
                raise Exception("无法读取文件")
            
            # 解析文件头信息
            self.parse_fpn_header(lines[:50], fpn_data)
            
            current_section = None
            i = 0
            nodes_count = 0
            elements_count = 0
            
            print("开始解析FPN文件数据...")
            
            while i < len(lines):
                line = lines[i].strip()
                
                # 跳过空行
                if not line:
                    i += 1
                    continue
                
                # 检测段落标识
                if line.startswith('$$'):
                    section_name = line.replace('$$', '').strip()
                    if 'Node' in section_name:
                        current_section = 'nodes'
                        print(f"找到节点数据段")
                    elif 'Element' in section_name:
                        current_section = 'elements'
                        print(f"找到单元数据段")
                    elif 'Stage Data' in section_name:
                        current_section = 'stages'
                        print(f"找到阶段数据段")
                    elif 'Analysis Data' in section_name:
                        current_section = 'analysis'
                        print(f"找到分析数据段")
                    else:
                        current_section = None
                
                # 解析具体数据行
                elif current_section == 'nodes' and line.startswith('NODE   ,'):
                    node = self.parse_gts_node_line(line)
                    if node:
                        fpn_data['nodes'].append(node)
                        nodes_count += 1
                        
                elif current_section == 'elements' and line.startswith('TETRA  ,'):
                    element = self.parse_gts_element_line(line)
                    if element:
                        fpn_data['elements'].append(element)
                        fpn_data['materials'].add(element['material_id'])
                        elements_count += 1
                
                # 解析分析数据段
                elif line.startswith('MADD   ,'):
                    # 材料组添加
                    material_group = self.parse_material_group_line(line)
                    if material_group:
                        fpn_data['material_groups'][material_group['id']] = material_group
                        
                elif line.startswith('LADD   ,'):
                    # 荷载组添加
                    load_group = self.parse_load_group_line(line)
                    if load_group:
                        fpn_data['load_groups'][load_group['id']] = load_group
                        
                elif line.startswith('BADD   ,'):
                    # 边界组添加
                    boundary_group = self.parse_boundary_group_line(line)
                    if boundary_group:
                        fpn_data['boundary_groups'][boundary_group['id']] = boundary_group
                        
                elif line.startswith('ANALLS ,'):
                    # 分析步定义
                    analysis_stage = self.parse_analysis_stage_line(line)
                    if analysis_stage:
                        fpn_data['analysis_stages'].append(analysis_stage)
                
                # 显示进度（每10000行显示一次）
                if i % 10000 == 0 and i > 0:
                    print(f"已处理{i}行，节点{nodes_count}个，单元{elements_count}个")
                
                i += 1
            
            print(f"FPN文件解析完成！")
            print(f"总计：节点{len(fpn_data['nodes'])}个，单元{len(fpn_data['elements'])}个")
            print(f"材料类型：{sorted(list(fpn_data['materials']))}")
            
            # 计算坐标偏移以便显示
            self.calculate_coordinate_offset(fpn_data)
                    
        except Exception as e:
            print(f"FPN文件解析错误: {e}")
            import traceback
            traceback.print_exc()
            # 创建示例数据
            fpn_data = self.create_sample_fpn_data()
        
        # 如果没有找到分析步，添加默认的分析步
        if not fpn_data.get('analysis_stages'):
            print("未找到分析步定义，添加默认分析步...")
            fpn_data['analysis_stages'] = self.create_default_analysis_stages()
            print(f"已添加 {len(fpn_data['analysis_stages'])} 个默认分析步")
            
        return fpn_data
    
    def parse_fpn_header(self, header_lines: List[str], fpn_data: Dict):
        """解析FPN文件头信息"""
        for line in header_lines:
            line = line.strip()
            if line.startswith('VER,'):
                version = line.split(',')[1].strip()
                fpn_data['file_info']['version'] = version
            elif line.startswith('UNIT,'):
                units = line.replace('UNIT,', '').strip()
                fpn_data['file_info']['units'] = units
                print(f"文件版本: {fpn_data['file_info'].get('version', 'N/A')}")
                print(f"单位系统: {units}")
    
    def parse_gts_node_line(self, line: str) -> Optional[Dict]:
        """解析GTS节点行: NODE   , ID, X, Y, Z, CoordSys, , ,"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 6 and parts[0] == 'NODE':
                node = {
                    'id': int(parts[1]),
                    'x': float(parts[2]),
                    'y': float(parts[3]),
                    'z': float(parts[4]),
                    'coord_sys': int(parts[5]) if parts[5] else 1
                }
                return node
        except (ValueError, IndexError) as e:
            if len(self.nodes if hasattr(self, 'nodes') else []) < 5:
                print(f"跳过无效节点行: {line[:50]}... 错误: {e}")
        return None
    
    def parse_gts_element_line(self, line: str) -> Optional[Dict]:
        """解析GTS单元行: TETRA  , ID, MaterialID, Node1, Node2, Node3, Node4, , ,"""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 7 and parts[0] == 'TETRA':
                element = {
                    'id': int(parts[1]),
                    'type': 'TETRA',
                    'material_id': int(parts[2]),
                    'nodes': [int(parts[i]) for i in range(3, 7) if parts[i]]
                }
                return element
        except (ValueError, IndexError) as e:
            if len(self.elements if hasattr(self, 'elements') else []) < 5:
                print(f"跳过无效单元行: {line[:50]}... 错误: {e}")
        return None
    
    def parse_material_group_line(self, line: str) -> Optional[Dict]:
        """解析材料组行: MADD   , ID, MaterialCount, ..."""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 3 and parts[0] == 'MADD':
                group = {
                    'id': int(parts[1]),
                    'material_count': int(parts[2]) if parts[2] else 0,
                    'materials': []
                }
                # 解析材料ID列表
                for i in range(4, len(parts)):
                    if parts[i] and parts[i].isdigit():
                        group['materials'].append(int(parts[i]))
                return group
        except (ValueError, IndexError) as e:
            print(f"跳过无效材料组行: {line[:50]}... 错误: {e}")
        return None
    
    def parse_load_group_line(self, line: str) -> Optional[Dict]:
        """解析荷载组行: LADD   , ID, LoadCount, ..."""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 3 and parts[0] == 'LADD':
                group = {
                    'id': int(parts[1]),
                    'load_count': int(parts[2]) if parts[2] else 0,
                    'loads': []
                }
                # 解析荷载ID列表
                for i in range(4, len(parts)):
                    if parts[i] and parts[i].isdigit():
                        group['loads'].append(int(parts[i]))
                return group
        except (ValueError, IndexError) as e:
            print(f"跳过无效荷载组行: {line[:50]}... 错误: {e}")
        return None
    
    def parse_boundary_group_line(self, line: str) -> Optional[Dict]:
        """解析边界组行: BADD   , ID, BoundaryCount, ..."""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 3 and parts[0] == 'BADD':
                group = {
                    'id': int(parts[1]),
                    'boundary_count': int(parts[2]) if parts[2] else 0,
                    'boundaries': []
                }
                # 解析边界ID列表
                for i in range(4, len(parts)):
                    if parts[i] and parts[i].isdigit():
                        group['boundaries'].append(int(parts[i]))
                return group
        except (ValueError, IndexError) as e:
            print(f"跳过无效边界组行: {line[:50]}... 错误: {e}")
        return None
    
    def parse_analysis_stage_line(self, line: str) -> Optional[Dict]:
        """解析分析步行: ANALLS , ID, Name, Type, Active, ..."""
        try:
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 5 and parts[0] == 'ANALLS':
                stage = {
                    'id': int(parts[1]),
                    'name': parts[2] if parts[2] else f'Analysis Stage {parts[1]}',
                    'type': int(parts[3]) if parts[3] else 0,
                    'active': int(parts[4]) if parts[4] else 0
                }
                return stage
        except (ValueError, IndexError) as e:
            print(f"跳过无效分析步行: {line[:50]}... 错误: {e}")
        return None
    
    def create_default_analysis_stages(self) -> List[Dict]:
        """创建默认的基坑工程分析步骤"""
        return [
            {
                'id': 1,
                'name': '初始状态',
                'type': 0,
                'active': 1,
                'description': '模型初始平衡状态'
            },
            {
                'id': 2, 
                'name': '第一次开挖(-5m)',
                'type': 1,
                'active': 1,
                'description': '开挖至地下5米深度'
            },
            {
                'id': 3,
                'name': '安装第一道支撑',
                'type': 2,
                'active': 1,
                'description': '在-5m处安装水平支撑'
            },
            {
                'id': 4,
                'name': '第二次开挖(-10m)',
                'type': 1,
                'active': 1,
                'description': '继续开挖至地下10米深度'
            },
            {
                'id': 5,
                'name': '安装第二道支撑',
                'type': 2,
                'active': 1,
                'description': '在-10m处安装水平支撑'
            },
            {
                'id': 6,
                'name': '第三次开挖(-15m)',
                'type': 1,
                'active': 1,
                'description': '继续开挖至地下15米深度'
            },
            {
                'id': 7,
                'name': '底板施工',
                'type': 3,
                'active': 1,
                'description': '浇筑基坑底板'
            },
            {
                'id': 8,
                'name': '最终状态',
                'type': 0,
                'active': 1,
                'description': '基坑开挖完成状态'
            }
        ]
    
    def calculate_coordinate_offset(self, fpn_data: Dict):
        """计算坐标偏移量，将大地坐标转换为工程坐标"""
        nodes = fpn_data.get('nodes', [])
        if not nodes:
            return
            
        # 计算坐标范围
        x_coords = [node['x'] for node in nodes]
        y_coords = [node['y'] for node in nodes]
        z_coords = [node['z'] for node in nodes]
        
        x_min, x_max = min(x_coords), max(x_coords)
        y_min, y_max = min(y_coords), max(y_coords)
        z_min, z_max = min(z_coords), max(z_coords)
        
        print(f"原始坐标范围:")
        print(f"  X: {x_min:.2f} ~ {x_max:.2f} (范围: {x_max-x_min:.2f})")
        print(f"  Y: {y_min:.2f} ~ {y_max:.2f} (范围: {y_max-y_min:.2f})")
        print(f"  Z: {z_min:.2f} ~ {z_max:.2f} (范围: {z_max-z_min:.2f})")
        
        # 计算偏移量（使用最小值作为原点）
        x_offset = x_min
        y_offset = y_min
        z_offset = z_min
        
        # 应用坐标偏移
        for node in nodes:
            node['x_original'] = node['x']
            node['y_original'] = node['y'] 
            node['z_original'] = node['z']
            
            node['x'] = node['x'] - x_offset
            node['y'] = node['y'] - y_offset
            node['z'] = node['z'] - z_offset
        
        # 存储偏移信息
        fpn_data['coordinate_offset'] = {
            'x_offset': x_offset,
            'y_offset': y_offset,
            'z_offset': z_offset
        }
        
        print(f"坐标已偏移至工程坐标系，偏移量:")
        print(f"  X偏移: {x_offset:.2f}")
        print(f"  Y偏移: {y_offset:.2f}")
        print(f"  Z偏移: {z_offset:.2f}")
    
    def parse_gts_data_line(self, line: str, section: str, fpn_data: Dict):
        """解析GTS数据行 - 通用方法"""
        if not section:
            return
            
        parts = line.split()
        if len(parts) < 2:
            return
        
        try:
            if section == 'nodes' and len(parts) >= 4:
                # 节点格式: ID X Y Z
                node = {
                    'id': int(float(parts[0])),  # 可能是浮点格式的整数
                    'x': float(parts[1]),
                    'y': float(parts[2]),
                    'z': float(parts[3])
                }
                fpn_data['nodes'].append(node)
                if len(fpn_data['nodes']) <= 5:  # 只显示前5个
                    print(f"解析节点: ID={node['id']}, 坐标=({node['x']:.2f}, {node['y']:.2f}, {node['z']:.2f})")
                    
            elif section == 'elements' and len(parts) >= 3:
                # 单元格式: ElemID [Type] NodeI NodeJ [NodeK NodeL ...]
                element = {
                    'id': int(float(parts[0])),
                    'type': 'SOLID',  # GTS主要是实体单元
                    'nodes': []
                }
                
                # 检查第二个字段是否是类型名
                start_idx = 1
                if len(parts) > 1 and not parts[1].replace('.', '').replace('-', '').isdigit():
                    element['type'] = parts[1]
                    start_idx = 2
                
                # 解析节点连接
                for i in range(start_idx, len(parts)):
                    try:
                        node_id = int(float(parts[i]))
                        element['nodes'].append(node_id)
                    except:
                        break
                        
                if element['nodes']:
                    fpn_data['elements'].append(element)
                    if len(fpn_data['elements']) <= 3:  # 只显示前3个
                        print(f"解析单元: ID={element['id']}, 类型={element['type']}, 节点={element['nodes']}")
                        
            elif section == 'materials' and len(parts) >= 2:
                # 材料格式: MatID [Name] E [nu] [其他属性]
                material = {
                    'id': int(float(parts[0])),
                    'name': 'Material',
                    'properties': {}
                }
                
                # 解析材料名和属性
                param_start = 1
                if len(parts) > 1 and not parts[1].replace('.', '').replace('-', '').replace('e', '').replace('E', '').replace('+', '').isdigit():
                    material['name'] = parts[1]
                    param_start = 2
                
                # 解析数值属性
                if len(parts) > param_start:
                    try:
                        material['properties']['E'] = float(parts[param_start])
                    except:
                        pass
                if len(parts) > param_start + 1:
                    try:
                        material['properties']['nu'] = float(parts[param_start + 1])
                    except:
                        pass
                        
                fpn_data['materials'].append(material)
                if len(fpn_data['materials']) <= 3:
                    print(f"解析材料: ID={material['id']}, 名称={material['name']}")
                    
            elif section == 'constraints' and len(parts) >= 2:
                # 约束格式: NodeID [DOF字段们]
                constraint = {
                    'node_id': int(float(parts[0])),
                    'dof': [],
                    'type': 'fixed'
                }
                
                # 解析自由度约束
                for i in range(1, min(7, len(parts))):  # 最多6个自由度
                    try:
                        dof_value = int(float(parts[i]))
                        constraint['dof'].append(dof_value)
                    except:
                        constraint['dof'].append(0)
                
                # 补齐到6个自由度
                while len(constraint['dof']) < 6:
                    constraint['dof'].append(0)
                    
                constraint['dof_string'] = ''.join(map(str, constraint['dof']))
                fpn_data['constraints'].append(constraint)
                if len(fpn_data['constraints']) <= 5:
                    print(f"解析约束: 节点={constraint['node_id']}, DOF={constraint['dof_string']}")
                    
            elif section == 'loads' and len(parts) >= 2:
                # 荷载格式: NodeID [LoadType] Fx [Fy Fz ...]
                load = {
                    'node_id': int(float(parts[0])),
                    'type': 'force',
                    'fx': 0.0,
                    'fy': 0.0,
                    'fz': 0.0
                }
                
                # 检查是否有荷载类型字段
                force_start = 1
                if len(parts) > 1 and not parts[1].replace('.', '').replace('-', '').replace('e', '').replace('E', '').replace('+', '').isdigit():
                    load['type'] = parts[1].lower()
                    force_start = 2
                
                # 解析力分量
                if len(parts) > force_start:
                    try:
                        load['fx'] = float(parts[force_start])
                    except:
                        pass
                if len(parts) > force_start + 1:
                    try:
                        load['fy'] = float(parts[force_start + 1])
                    except:
                        pass
                if len(parts) > force_start + 2:
                    try:
                        load['fz'] = float(parts[force_start + 2])
                    except:
                        pass
                
                fpn_data['loads'].append(load)
                if len(fpn_data['loads']) <= 5:
                    print(f"解析荷载: 节点={load['node_id']}, F=({load['fx']:.1f}, {load['fy']:.1f}, {load['fz']:.1f})")
                    
            elif section == 'construction_stages' and len(parts) >= 1:
                # 施工阶段格式: StageID [StageName]
                stage = {
                    'id': int(float(parts[0])),
                    'name': ' '.join(parts[1:]) if len(parts) > 1 else f'Stage_{parts[0]}',
                    'description': ' '.join(parts[1:]) if len(parts) > 1 else f'施工阶段{parts[0]}'
                }
                fpn_data['construction_stages'].append(stage)
                if len(fpn_data['construction_stages']) <= 5:
                    print(f"解析施工阶段: ID={stage['id']}, 名称={stage['name']}")
                    
        except Exception as e:
            if len(fpn_data.get('nodes', [])) + len(fpn_data.get('elements', [])) < 5:  # 避免过多错误信息
                print(f"解析数据行失败: {line[:50]}... 错误: {e}")
    
    def parse_mct_node_line(self, line: str, nodes: List[Dict]):
        """解析MCT格式节点行"""
        try:
            parts = line.split()
            if len(parts) >= 4:
                # MCT节点格式: NodeID X Y Z [其他参数]
                node = {
                    'id': int(parts[0]),
                    'x': float(parts[1]),
                    'y': float(parts[2]),
                    'z': float(parts[3])
                }
                nodes.append(node)
                print(f"解析节点: ID={node['id']}, 坐标=({node['x']:.2f}, {node['y']:.2f}, {node['z']:.2f})")
        except (ValueError, IndexError):
            print(f"跳过无效节点行: {line}")
    
    def parse_mct_element_line(self, line: str, elements: List[Dict]):
        """解析MCT格式单元行"""
        try:
            parts = line.split()
            if len(parts) >= 3:
                # MCT单元格式: ElemID Type NodeI NodeJ [NodeK NodeL ...]
                element = {
                    'id': int(parts[0]),
                    'type': parts[1] if len(parts) > 1 and not parts[1].isdigit() else 'BEAM',
                    'nodes': []
                }
                
                # 解析节点连接
                start_idx = 2 if not parts[1].isdigit() else 1
                for i in range(start_idx, len(parts)):
                    try:
                        node_id = int(parts[i])
                        element['nodes'].append(node_id)
                    except ValueError:
                        break  # 遇到非数字停止
                
                if element['nodes']:  # 至少有一个节点
                    elements.append(element)
                    print(f"解析单元: ID={element['id']}, 类型={element['type']}, 节点={element['nodes']}")
                    
        except (ValueError, IndexError):
            print(f"跳过无效单元行: {line}")
    
    def parse_mct_material_line(self, line: str, materials: List[Dict]):
        """解析MCT格式材料行"""
        try:
            parts = line.split()
            if len(parts) >= 2:
                # MCT材料格式: MatID Name E nu [其他属性]
                material = {
                    'id': int(parts[0]),
                    'name': parts[1] if len(parts) > 1 else f'Material_{parts[0]}',
                    'properties': {}
                }
                
                # 尝试解析数值属性
                if len(parts) > 2:
                    try:
                        material['properties']['E'] = float(parts[2])  # 弹性模量
                    except ValueError:
                        pass
                if len(parts) > 3:
                    try:
                        material['properties']['nu'] = float(parts[3])  # 泊松比
                    except ValueError:
                        pass
                        
                materials.append(material)
                print(f"解析材料: ID={material['id']}, 名称={material['name']}")
                
        except (ValueError, IndexError):
            print(f"跳过无效材料行: {line}")
    
    def parse_mct_constraint_line(self, line: str, constraints: List[Dict]):
        """解析MCT格式约束行"""
        try:
            parts = line.split()
            if len(parts) >= 2:
                # MCT约束格式: NodeID Dx Dy Dz Rx Ry Rz (1=固定, 0=自由)
                constraint = {
                    'node_id': int(parts[0]),
                    'dof': [],
                    'type': 'fixed'
                }
                
                # 解析6个自由度 (Dx Dy Dz Rx Ry Rz)
                for i in range(1, min(7, len(parts))):  # 最多6个自由度
                    try:
                        dof_value = int(parts[i])
                        constraint['dof'].append(dof_value)
                    except ValueError:
                        constraint['dof'].append(0)  # 默认自由
                
                # 补齐到6个自由度
                while len(constraint['dof']) < 6:
                    constraint['dof'].append(0)
                    
                # 转换为字符串格式便于显示
                constraint['dof_string'] = ''.join(map(str, constraint['dof']))
                
                constraints.append(constraint)
                print(f"解析约束: 节点={constraint['node_id']}, DOF={constraint['dof_string']}")
                
        except (ValueError, IndexError):
            print(f"跳过无效约束行: {line}")
    
    def parse_mct_load_line(self, line: str, loads: List[Dict]):
        """解析MCT格式荷载行"""
        try:
            parts = line.split()
            if len(parts) >= 2:
                # MCT荷载格式: NodeID LoadType Fx [Fy Fz Mx My Mz]
                load = {
                    'node_id': int(parts[0]),
                    'type': parts[1] if len(parts) > 1 and not parts[1].replace('.', '').replace('-', '').isdigit() else 'force',
                    'fx': 0.0,
                    'fy': 0.0,
                    'fz': 0.0
                }
                
                # 解析力的分量
                start_idx = 2 if not parts[1].replace('.', '').replace('-', '').isdigit() else 1
                if len(parts) > start_idx:
                    try:
                        load['fx'] = float(parts[start_idx])
                    except ValueError:
                        pass
                if len(parts) > start_idx + 1:
                    try:
                        load['fy'] = float(parts[start_idx + 1])
                    except ValueError:
                        pass
                if len(parts) > start_idx + 2:
                    try:
                        load['fz'] = float(parts[start_idx + 2])
                    except ValueError:
                        pass
                
                loads.append(load)
                print(f"解析荷载: 节点={load['node_id']}, F=({load['fx']:.1f}, {load['fy']:.1f}, {load['fz']:.1f})")
                
        except (ValueError, IndexError):
            print(f"跳过无效荷载行: {line}")
    
    def parse_mct_stage_line(self, line: str, stages: List[Dict]):
        """解析MCT格式施工阶段行"""
        try:
            parts = line.split()
            if len(parts) >= 1:
                # MCT阶段格式: StageID StageName [Description]
                stage = {
                    'id': int(parts[0]),
                    'name': parts[1] if len(parts) > 1 else f'Stage_{parts[0]}',
                    'description': ' '.join(parts[1:]) if len(parts) > 1 else f'施工阶段{parts[0]}'
                }
                stages.append(stage)
                print(f"解析施工阶段: ID={stage['id']}, 名称={stage['name']}")
                
        except (ValueError, IndexError):
            print(f"跳过无效阶段行: {line}")
    
    def create_sample_fpn_data(self) -> Dict[str, Any]:
        """创建示例FPN数据"""
        return {
            'nodes': [
                {'id': 1, 'x': 0.0, 'y': 0.0, 'z': 0.0},
                {'id': 2, 'x': 10.0, 'y': 0.0, 'z': 0.0},
                {'id': 3, 'x': 10.0, 'y': 10.0, 'z': 0.0},
                {'id': 4, 'x': 0.0, 'y': 10.0, 'z': 0.0},
                {'id': 5, 'x': 0.0, 'y': 0.0, 'z': 10.0},
                {'id': 6, 'x': 10.0, 'y': 0.0, 'z': 10.0},
                {'id': 7, 'x': 10.0, 'y': 10.0, 'z': 10.0},
                {'id': 8, 'x': 0.0, 'y': 10.0, 'z': 10.0}
            ],
            'elements': [
                {'id': 1, 'type': 'SOLID', 'nodes': [1, 2, 3, 4, 5, 6, 7, 8]}
            ],
            'materials': [
                {'id': 1, 'name': 'Concrete', 'properties': {'E': 30e9, 'nu': 0.2}}
            ],
            'constraints': [
                {'node_id': 1, 'dof': '111111', 'type': 'fixed'},
                {'node_id': 2, 'dof': '111111', 'type': 'fixed'}
            ],
            'loads': [
                {'node_id': 7, 'fx': 0.0, 'fy': 0.0, 'fz': -10000.0, 'type': 'force'}
            ],
            'construction_stages': [
                {'id': 1, 'name': 'Initial', 'description': '初始状态'},
                {'id': 2, 'name': 'Loading', 'description': '加载阶段'}
            ]
        }
    
    def create_mesh_from_fpn(self, fpn_data: Dict[str, Any]):
        """从FPN数据创建PyVista网格"""
        if not PYVISTA_AVAILABLE:
            print("PyVista不可用，无法创建网格")
            return
            
        nodes = fpn_data.get('nodes', [])
        elements = fpn_data.get('elements', [])
        
        if not nodes:
            print("FPN数据中没有节点信息，创建示例网格")
            self.create_sample_mesh()
            return
        
        print(f"开始创建PyVista网格: {len(nodes)}个节点, {len(elements)}个单元")
            
        # 创建点坐标数组
        points = []
        node_id_map = {}
        
        for i, node in enumerate(nodes):
            points.append([node['x'], node['y'], node['z']])
            node_id_map[node['id']] = i
            
        points = np.array(points)
        print(f"节点坐标数组创建完成: {points.shape}")
        
        # 创建单元连接数组
        cells = []
        cell_types = []
        material_ids = []
        
        valid_elements = 0
        invalid_elements = 0
        
        for element in elements:
            element_nodes = element.get('nodes', [])
            material_id = element.get('material_id', 1)
            
            if len(element_nodes) == 4:  # 四面体单元
                # 映射节点ID到索引
                try:
                    mapped_nodes = [node_id_map[node_id] for node_id in element_nodes if node_id in node_id_map]
                    if len(mapped_nodes) == 4:
                        # 四面体单元
                        cells.extend([4] + mapped_nodes)
                        cell_types.append(10)  # VTK_TETRA
                        material_ids.append(material_id)
                        valid_elements += 1
                    else:
                        invalid_elements += 1
                except KeyError as e:
                    invalid_elements += 1
                    if invalid_elements < 5:  # 只显示前几个错误
                        print(f"节点ID映射错误: {e}")
            else:
                invalid_elements += 1
        
        print(f"单元处理完成: 有效{valid_elements}个, 无效{invalid_elements}个")
        
        # 创建PyVista网格
        if cells and cell_types:
            self.mesh = pv.UnstructuredGrid(cells, cell_types, points)
            
            # 添加材料ID作为单元数据
            if material_ids:
                self.mesh.cell_data['MaterialID'] = np.array(material_ids)
                print(f"添加材料ID数据: {len(set(material_ids))}种材料")
                
        else:
            # 如果没有有效单元，创建点云
            print("没有有效单元，创建点云显示")
            self.mesh = pv.PolyData(points)
            
        # 存储FPN数据到预处理器
        self.fpn_data = fpn_data
        
        # 从材料ID集合创建材料字典
        materials_set = fpn_data.get('materials', set())
        self.materials = {}
        for mat_id in materials_set:
            self.materials[mat_id] = {
                'id': mat_id,
                'name': f'Material_{mat_id}',
                'properties': {'type': 'soil' if mat_id == 6 else 'concrete'}
            }
        
        # 清理现有约束和荷载
        self.clear_constraints()  
        self.clear_loads()
        
        # FPN文件通常不包含约束和荷载信息，这些在分析阶段定义
        # 这里可以根据需要添加一些示例约束和荷载用于演示
        if len(points) > 0:
            # 在Z坐标最小的几个点添加固定约束
            z_coords = points[:, 2]
            z_min = np.min(z_coords)
            bottom_nodes = np.where(np.abs(z_coords - z_min) < 100)[0]  # 100mm容差
            
            constraint_count = 0
            for node_idx in bottom_nodes[:20]:  # 限制约束数量
                point = points[node_idx]
                self.add_constraint('fixed', tuple(point))
                constraint_count += 1
            
            print(f"添加了{constraint_count}个底部固定约束")
            
            # 在顶部添加一些示例荷载
            z_max = np.max(z_coords)
            top_nodes = np.where(np.abs(z_coords - z_max) < 100)[0]
            
            load_count = 0
            for node_idx in top_nodes[:10]:  # 限制荷载数量
                point = points[node_idx]
                self.add_load('force', tuple(point), 10.0, (0, 0, -1))  # 10kN向下
                load_count += 1
            
            print(f"添加了{load_count}个顶部荷载")
        
        print(f"从FPN创建网格完成!")
        print(f"  节点: {len(points)}个")
        print(f"  单元: {len(cell_types)}个") 
        print(f"  材料: {len(self.materials)}种")
        print(f"  约束: {len(self.constraints)}个")
        print(f"  荷载: {len(self.loads)}个")
    
    def load_mesh(self, file_path: str):
        """加载网格文件"""
        try:
            file_path = Path(file_path)
            
            if not file_path.exists():
                raise FileNotFoundError(f"文件不存在: {file_path}")
                
            print(f"加载网格文件: {file_path.name}")
            
            if PYVISTA_AVAILABLE:
                # 根据文件扩展名选择读取方法
                if file_path.suffix.lower() in ['.vtk', '.vtu', '.vtp']:
                    self.mesh = pv.read(str(file_path))
                elif file_path.suffix.lower() == '.msh':
                    self.mesh = self.read_gmsh_file(str(file_path))
                else:
                    raise ValueError(f"不支持的文件格式: {file_path.suffix}")
                
                # 显示网格
                self.display_mesh()
                
            else:
                print("PyVista不可用，无法加载网格")
                
        except Exception as e:
            print(f"加载网格失败: {e}")
            # 创建示例网格
            self.create_sample_mesh()
            
    def read_gmsh_file(self, file_path: str):
        """读取GMSH文件"""
        try:
            # 尝试使用meshio读取
            import meshio
            mesh_data = meshio.read(file_path)
            
            # 转换为PyVista格式
            points = mesh_data.points
            
            # 处理单元
            cells = []
            cell_types = []
            
            for cell_block in mesh_data.cells:
                cell_type = cell_block.type
                cell_data = cell_block.data
                
                if cell_type == 'triangle':
                    for cell in cell_data:
                        cells.extend([3] + cell.tolist())
                        cell_types.append(5)  # VTK_TRIANGLE
                elif cell_type == 'tetra':
                    for cell in cell_data:
                        cells.extend([4] + cell.tolist())
                        cell_types.append(10)  # VTK_TETRA
                        
            if cells:
                mesh = pv.UnstructuredGrid(cells, cell_types, points)
            else:
                mesh = pv.PolyData(points)
                
            return mesh
            
        except ImportError:
            print("警告: meshio不可用，创建示例网格")
            return self.create_sample_mesh()
        except Exception as e:
            print(f"读取GMSH文件失败: {e}")
            return self.create_sample_mesh()
            
    def create_sample_mesh(self):
        """创建示例网格"""
        if PYVISTA_AVAILABLE:
            # 创建简单的立方体网格
            self.mesh = pv.Cube().triangulate()
            self.display_mesh()
            print("创建示例立方体网格")
        else:
            print("创建占位符网格")
            
    def generate_mesh(self):
        """生成网格"""
        if PYVISTA_AVAILABLE:
            # 创建复杂一些的示例网格
            # 基坑几何
            excavation = pv.Cube(center=(0, 0, -5), x_length=20, y_length=20, z_length=10)
            
            # 土体域
            soil_domain = pv.Cube(center=(0, 0, -15), x_length=60, y_length=60, z_length=30)
            
            # 进行布尔运算
            try:
                self.mesh = soil_domain.boolean_difference(excavation)
                self.mesh = self.mesh.triangulate()
            except:
                # 如果布尔运算失败，使用简单网格
                self.mesh = soil_domain.triangulate()
                
            self.display_mesh()
            print("生成复合网格：土体域+基坑")
        else:
            print("PyVista不可用，无法生成网格")
            
    def display_mesh(self):
        """显示网格"""
        if not PYVISTA_AVAILABLE or not self.mesh:
            return
            
        # 清除现有内容
        self.plotter.clear()
        
        # 根据显示模式显示网格
        if self.display_mode == 'transparent':
            self.display_transparent_layers()
        elif self.display_mode == 'wireframe':
            self.display_wireframe_mode()
        elif self.display_mode == 'solid':
            self.display_solid_mode()
        else:
            self.display_transparent_layers()  # 默认半透明
        
        # 显示坐标轴
        self.plotter.show_axes()
        
        # 自动调整视图
        self.plotter.reset_camera()
        
    def display_transparent_layers(self):
        """使用半透明效果显示分层土体"""
        if not PYVISTA_AVAILABLE or not self.mesh:
            return
            
        # 检查是否有材料ID信息
        if hasattr(self.mesh, 'cell_data') and 'MaterialID' in self.mesh.cell_data:
            # 根据材料ID分层显示
            material_ids = np.unique(self.mesh.cell_data['MaterialID'])
            print(f"发现材料ID: {sorted(list(material_ids))}")
            print(f"网格单元数: {self.mesh.n_cells}")
            print(f"材料ID数组长度: {len(self.mesh.cell_data['MaterialID'])}")
            
            # 定义材料颜色和透明度映射 - 高对比度土层颜色方案
            material_colors = {
                1: {'color': [0.8, 0.4, 0.1], 'opacity': 0.6, 'name': 'Fill'},           # 深橙色 - 填土
                2: {'color': [0.9, 0.7, 0.3], 'opacity': 0.7, 'name': 'Silty Clay'},     # 金黄色 - 粉质粘土  
                3: {'color': [0.4, 0.4, 0.4], 'opacity': 0.5, 'name': 'Muddy Soil'},     # 深灰色 - 淤泥质土
                4: {'color': [0.9, 0.3, 0.3], 'opacity': 0.7, 'name': 'Clay'},           # 亮红色 - 粘土
                5: {'color': [1.0, 0.9, 0.2], 'opacity': 0.6, 'name': 'Sand'},           # 鲜黄色 - 砂土
                6: {'color': [0.2, 0.4, 0.8], 'opacity': 0.8, 'name': 'Bedrock'},        # 蓝色 - 基岩
                7: {'color': [0.3, 0.8, 0.3], 'opacity': 0.6, 'name': 'Soil Layer 7'},   # 鲜绿色 - 土层7
                8: {'color': [0.8, 0.3, 0.8], 'opacity': 0.6, 'name': 'Soil Layer 8'},   # 品红色 - 土层8
                9: {'color': [0.1, 0.9, 0.9], 'opacity': 0.6, 'name': 'Soil Layer 9'},   # 亮青色 - 土层9
                10: {'color': [0.6, 0.6, 0.6], 'opacity': 0.9, 'name': 'Concrete Pile'}, # 中灰色 - 混凝土桩
                11: {'color': [0.95, 0.95, 0.95], 'opacity': 0.95, 'name': 'Steel Support'}, # 亮银色 - 钢支撑
                12: {'color': [0.75, 0.75, 0.75], 'opacity': 0.85, 'name': 'Concrete'}   # 浅灰 - 混凝土
            }
            
            layer_count = 0
            for mat_id in material_ids:
                # 提取特定材料的单元
                try:
                    # 使用正确的threshold方法提取特定材料的单元
                    mat_mesh = self.mesh.threshold([mat_id - 0.5, mat_id + 0.5], scalars='MaterialID')
                    
                    if mat_mesh.n_points > 0:
                        # 获取材料属性
                        mat_props = material_colors.get(mat_id, {
                            'color': 'lightblue', 
                            'opacity': 0.6, 
                            'name': f'Material {mat_id}'
                        })
                        
                        # 根据材料类型应用不同效果
                        if mat_id in [10, 11, 12]:  # 支护结构
                            # 金属/混凝土效果
                            self.plotter.add_mesh(
                                mat_mesh,
                                color=mat_props['color'],
                                metallic=0.8,
                                roughness=0.2,
                                pbr=True,
                                opacity=mat_props['opacity'],
                                show_edges=True,
                                edge_color='white',
                                line_width=0.5,
                                name=f'material_{mat_id}'
                            )
                        else:  # 土体材料
                            # 半透明效果
                            self.plotter.add_mesh(
                                mat_mesh,
                                color=mat_props['color'],
                                opacity=mat_props['opacity'],
                                show_edges=True,
                                edge_color='white',
                                line_width=0.5,
                                name=f'material_{mat_id}'
                            )
                        
                        layer_count += 1
                        print(f"显示材料层 {mat_id}: {mat_props['name']}, 单元数: {mat_mesh.n_cells}")
                        
                except Exception as e:
                    print(f"显示材料{mat_id}时出错: {e}")
                    continue
                    
            print(f"成功显示 {layer_count} 个材料层")
        else:
            # 没有材料信息，统一半透明显示
            self.plotter.add_mesh(
                self.mesh, 
                color='lightblue', 
                opacity=0.6,
                show_edges=True, 
                edge_color='white',
                line_width=0.5,
                name='main_mesh'
            )
        
        # 设置Abaqus风格的渐变背景
        self.set_abaqus_style_background()
        
        # 添加专业级地面网格
        self.add_professional_grid_effect()
        
        # 添加标题和网格信息
        if self.mesh:
            info_text = f"DeepCAD Transparent Layers\nNodes: {self.mesh.n_points}\nCells: {self.mesh.n_cells}"
            self.plotter.add_text(
                info_text, 
                position='upper_left', 
                font_size=12, 
                color='cyan'
            )
        
    def add_ground_grid_effect(self):
        """添加科幻风格的地面网格效果"""
        if not PYVISTA_AVAILABLE or not self.mesh:
            return
            
        try:
            # 获取网格边界
            bounds = self.mesh.bounds
            x_min, x_max = bounds[0], bounds[1]
            y_min, y_max = bounds[2], bounds[3]
            z_min = bounds[4] - abs(bounds[5] - bounds[4]) * 0.1  # 地面位置
            
            # 创建网格地面
            grid = pv.StructuredGrid()
            x_range = max(abs(x_max - x_min), 100)
            y_range = max(abs(y_max - y_min), 100)
            
            x = np.arange(x_min - x_range/4, x_max + x_range/4, x_range/15)
            y = np.arange(y_min - y_range/4, y_max + y_range/4, y_range/15)
            z = np.array([z_min])
            
            X, Y, Z = np.meshgrid(x, y, z)
            grid.points = np.column_stack([X.ravel(), Y.ravel(), Z.ravel()])
            grid.dimensions = [len(x), len(y), len(z)]
            
            self.plotter.add_mesh(
                grid, 
                style='wireframe', 
                color='darkgreen',
                opacity=0.3, 
                line_width=1,
                name='sci_fi_grid'
            )
        except Exception as e:
            print(f"添加地面网格效果时出错: {e}")
    
    def set_abaqus_style_background(self):
        """设置Abaqus风格的渐变背景"""
        if not PYVISTA_AVAILABLE:
            return
            
        try:
            # 使用正确的PyVista渐变语法
            # Abaqus经典渐变: 底部银灰色，顶部深蓝色
            self.plotter.set_background(
                color=[0.85, 0.85, 0.9],    # 底部银灰色
                top=[0.1, 0.2, 0.4]         # 顶部深蓝色
            )
            print("✅ Abaqus风格渐变背景设置成功")
        except Exception as e:
            # 如果渐变不支持，使用Abaqus风格的单色背景
            self.plotter.set_background([0.45, 0.5, 0.65])  # 类似Abaqus的中性蓝灰色
            print(f"渐变背景不支持，使用单色背景: {e}")
    
    def add_professional_grid_effect(self):
        """添加专业级地面网格效果（Abaqus风格）"""
        if not PYVISTA_AVAILABLE or not self.mesh:
            return
            
        try:
            # 获取网格边界
            bounds = self.mesh.bounds
            x_min, x_max = bounds[0], bounds[1]
            y_min, y_max = bounds[2], bounds[3]
            z_min = bounds[4] - abs(bounds[5] - bounds[4]) * 0.05  # 地面位置
            
            # 创建更精细的专业网格
            grid = pv.StructuredGrid()
            x_range = max(abs(x_max - x_min), 50)
            y_range = max(abs(y_max - y_min), 50)
            
            # 使用更密集的网格，模拟Abaqus的网格密度
            x = np.arange(x_min - x_range/3, x_max + x_range/3, x_range/25)
            y = np.arange(y_min - y_range/3, y_max + y_range/3, y_range/25)
            z = np.array([z_min])
            
            X, Y, Z = np.meshgrid(x, y, z)
            grid.points = np.column_stack([X.ravel(), Y.ravel(), Z.ravel()])
            grid.dimensions = [len(x), len(y), len(z)]
            
            # Abaqus风格的网格颜色和透明度
            self.plotter.add_mesh(
                grid, 
                style='wireframe', 
                color=[0.6, 0.6, 0.65],  # 中性灰色，与背景协调
                opacity=0.25,  # 更低的透明度，不抢夺主体注意力
                line_width=0.8,
                name='professional_grid'
            )
            
            # 添加主要轴线（更粗的线条标示坐标轴方向）
            if abs(x_min) < x_range and abs(x_max) < x_range:
                # Y轴线
                y_axis_line = pv.Line([0, y_min - y_range/4, z_min], 
                                    [0, y_max + y_range/4, z_min])
                self.plotter.add_mesh(y_axis_line, color=[0.4, 0.4, 0.5], 
                                    line_width=2, opacity=0.4, name='y_axis_grid')
            
            if abs(y_min) < y_range and abs(y_max) < y_range:
                # X轴线  
                x_axis_line = pv.Line([x_min - x_range/4, 0, z_min], 
                                    [x_max + x_range/4, 0, z_min])
                self.plotter.add_mesh(x_axis_line, color=[0.4, 0.4, 0.5], 
                                    line_width=2, opacity=0.4, name='x_axis_grid')
                                    
        except Exception as e:
            print(f"添加专业网格效果时出错: {e}")
    
    def display_wireframe_mode(self):
        """线框模式显示"""
        if not PYVISTA_AVAILABLE or not self.mesh:
            return
            
        # 检查是否有材料ID信息
        if hasattr(self.mesh, 'cell_data') and 'MaterialID' in self.mesh.cell_data:
            # 根据材料ID分层显示
            material_ids = np.unique(self.mesh.cell_data['MaterialID'])
            
            # 定义材料颜色映射 - 与半透明模式保持一致
            material_colors = {
                1: [0.6, 0.3, 0.1], 2: [1.0, 0.6, 0.2], 3: [0.5, 0.5, 0.5], 4: [0.8, 0.2, 0.2],
                5: [1.0, 1.0, 0.3], 6: [0.1, 0.3, 0.6], 7: [0.4, 0.8, 0.4], 8: [0.8, 0.4, 0.8],
                9: [0.2, 0.8, 0.8], 10: [0.7, 0.7, 0.7], 11: [0.9, 0.9, 0.9], 12: [0.8, 0.8, 0.8]
            }
            
            for mat_id in material_ids:
                try:
                    mat_mesh = self.mesh.threshold([mat_id - 0.5, mat_id + 0.5], scalars='MaterialID')
                    if mat_mesh.n_points > 0:
                        color = material_colors.get(mat_id, [0.7, 0.8, 1.0])
                        self.plotter.add_mesh(
                            mat_mesh,
                            style='wireframe',
                            color=color,
                            line_width=2,
                            opacity=1.0,
                            name=f'wireframe_material_{mat_id}'
                        )
                except Exception as e:
                    print(f"线框模式显示材料{mat_id}时出错: {e}")
        else:
            # 统一线框显示
            self.plotter.add_mesh(
                self.mesh,
                style='wireframe',
                color='blue',
                line_width=2,
                opacity=1.0,
                name='wireframe_mesh'
            )
        
        # 设置Abaqus风格背景
        self.set_abaqus_style_background()
        
        # 添加标题
        if self.mesh:
            info_text = f"DeepCAD Wireframe Mode\nNodes: {self.mesh.n_points}\nCells: {self.mesh.n_cells}"
            self.plotter.add_text(
                info_text,
                position='upper_left',
                font_size=12,
                color='black'
            )
    
    def display_solid_mode(self):
        """实体模式显示"""
        if not PYVISTA_AVAILABLE or not self.mesh:
            return
            
        # 检查是否有材料ID信息
        if hasattr(self.mesh, 'cell_data') and 'MaterialID' in self.mesh.cell_data:
            # 根据材料ID分层显示
            material_ids = np.unique(self.mesh.cell_data['MaterialID'])
            
            # 定义材料颜色映射 - 与半透明模式保持一致
            material_colors = {
                1: [0.6, 0.3, 0.1], 2: [1.0, 0.6, 0.2], 3: [0.5, 0.5, 0.5], 4: [0.8, 0.2, 0.2],
                5: [1.0, 1.0, 0.3], 6: [0.1, 0.3, 0.6], 7: [0.4, 0.8, 0.4], 8: [0.8, 0.4, 0.8],
                9: [0.2, 0.8, 0.8], 10: [0.7, 0.7, 0.7], 11: [0.9, 0.9, 0.9], 12: [0.8, 0.8, 0.8]
            }
            
            for mat_id in material_ids:
                try:
                    mat_mesh = self.mesh.threshold([mat_id - 0.5, mat_id + 0.5], scalars='MaterialID')
                    if mat_mesh.n_points > 0:
                        color = material_colors.get(mat_id, [0.7, 0.8, 1.0])
                        
                        if mat_id in [10, 11, 12]:  # 支护结构
                            # 金属/混凝土效果
                            self.plotter.add_mesh(
                                mat_mesh,
                                color=color,
                                metallic=0.8,
                                roughness=0.2,
                                pbr=True,
                                opacity=1.0,
                                show_edges=False,
                                name=f'solid_material_{mat_id}'
                            )
                        else:  # 土体材料
                            # 普通实体效果
                            self.plotter.add_mesh(
                                mat_mesh,
                                color=color,
                                opacity=1.0,
                                show_edges=True,
                                edge_color='black',
                                line_width=0.5,
                                name=f'solid_material_{mat_id}'
                            )
                except Exception as e:
                    print(f"实体模式显示材料{mat_id}时出错: {e}")
        else:
            # 统一实体显示
            self.plotter.add_mesh(
                self.mesh,
                color='lightblue',
                opacity=1.0,
                show_edges=True,
                edge_color='black',
                line_width=0.5,
                name='solid_mesh'
            )
        
        # 设置Abaqus风格背景
        self.set_abaqus_style_background()
        
        # 添加标题
        if self.mesh:
            info_text = f"DeepCAD Solid Mode\nNodes: {self.mesh.n_points}\nCells: {self.mesh.n_cells}"
            self.plotter.add_text(
                info_text,
                position='upper_left',
                font_size=12,
                color='black'
            )
    
    def set_display_mode(self, mode):
        """设置显示模式"""
        if mode in ['wireframe', 'solid', 'transparent']:
            self.display_mode = mode
            self.display_mesh()  # 重新显示
            print(f"显示模式已切换为: {mode}")
        else:
            print(f"未知的显示模式: {mode}")
        
        # 根据当前分析步智能显示相关物理组
        self.display_analysis_stage_groups()
        
        # 显示约束和荷载
        self.display_constraints()
        self.display_loads()
    
    def display_analysis_stage_groups(self):
        """根据当前分析步智能显示相关的物理组"""
        if not hasattr(self, 'fpn_data') or not self.fpn_data:
            return
            
        # 获取当前选择的分析步（从UI获取，这里先用默认值）
        current_stage = self.get_current_analysis_stage()
        
        if current_stage:
            print(f"智能显示分析步 '{current_stage.get('name', 'Unknown')}' 相关的物理组")
            
            # 根据分析步类型和ID判断需要的物理组
            active_groups = self.determine_active_groups_for_stage(current_stage)
            
            if active_groups:
                print(f"激活的物理组: {active_groups}")
                # 这里可以进一步过滤显示内容
                self.filter_display_by_groups(active_groups)
        else:
            print("使用默认物理组显示")
    
    def set_current_analysis_stage(self, stage_id):
        """设置当前分析步ID"""
        self.current_stage_id = stage_id
        print(f"设置当前分析步ID: {stage_id}")
    
    def get_current_analysis_stage(self):
        """获取当前选择的分析步"""
        if not hasattr(self, 'fpn_data') or not self.fpn_data:
            return None
            
        analysis_stages = self.fpn_data.get('analysis_stages', [])
        
        # 如果有指定的分析步ID，查找对应的分析步
        if self.current_stage_id is not None:
            for stage in analysis_stages:
                if stage.get('id') == self.current_stage_id:
                    return stage
        
        # 否则返回第一个分析步
        if analysis_stages:
            return analysis_stages[0]
        return None
    
    def determine_active_groups_for_stage(self, stage):
        """根据分析步确定需要激活的物理组"""
        active_groups = {
            'materials': [],
            'loads': [],
            'boundaries': []
        }
        
        if not hasattr(self, 'fpn_data') or not stage:
            return active_groups
            
        fpn_data = self.fpn_data
        stage_id = stage.get('id', 0)
        stage_type = stage.get('type', 0)
        stage_name = stage.get('name', '').lower()
        
        # 智能判断逻辑 - 基坑工程专用
        print(f"分析分析步: ID={stage_id}, 名称='{stage_name}', 类型={stage_type}")
        
        if '初始' in stage_name or 'initial' in stage_name or stage_id == 1:
            # 初始状态：显示所有土层材料和边界约束
            active_groups['materials'] = [1]  # 主要土体材料组
            active_groups['boundaries'] = [1]  # 主要边界组
            print("智能选择: 初始状态 - 土体材料 + 边界约束")
            
        elif '开挖' in stage_name or 'excavat' in stage_name or stage_type == 1:
            # 开挖阶段：重点显示土体材料和开挖相关荷载
            active_groups['materials'] = [1]  # 土体材料组
            active_groups['loads'] = [1]      # 开挖荷载组
            active_groups['boundaries'] = [1] # 边界约束
            print("智能选择: 开挖阶段 - 土体材料 + 开挖荷载")
            
        elif '支撑' in stage_name or 'support' in stage_name or stage_type == 2:
            # 支撑安装：显示结构材料和支撑相关荷载
            active_groups['materials'] = [1]  # 包含支撑的材料组
            active_groups['loads'] = [1]      # 支撑荷载
            active_groups['boundaries'] = [1] # 支撑边界
            print("智能选择: 支撑安装 - 结构材料 + 支撑荷载")
            
        elif '底板' in stage_name or 'slab' in stage_name or stage_type == 3:
            # 底板施工：显示混凝土材料和施工荷载
            active_groups['materials'] = [1]  # 混凝土材料组
            active_groups['loads'] = [1]      # 施工荷载
            active_groups['boundaries'] = [1] # 底板边界
            print("智能选择: 底板施工 - 混凝土材料 + 施工荷载")
            
        elif '最终' in stage_name or 'final' in stage_name:
            # 最终状态：显示所有组
            active_groups['materials'] = list(fpn_data.get('material_groups', {}).keys()) or [1]
            active_groups['loads'] = list(fpn_data.get('load_groups', {}).keys()) or [1]
            active_groups['boundaries'] = list(fpn_data.get('boundary_groups', {}).keys()) or [1]
            print("智能选择: 最终状态 - 显示所有组")
            
        else:
            # 默认情况：显示第一个组
            active_groups['materials'] = [1]
            active_groups['loads'] = [1] 
            active_groups['boundaries'] = [1]
            print("智能选择: 默认 - 显示主要组")
        
        return active_groups
    
    def filter_display_by_groups(self, active_groups):
        """根据激活的物理组过滤显示内容"""
        # 这个方法可以进一步根据激活的组来调整显示
        # 例如高亮显示激活的组，或者隐藏非激活的组
        print(f"应用物理组过滤: {active_groups}")
        # 具体实现可以根据需要调整网格显示的透明度、颜色等
        
    def add_constraint(self, constraint_type: str, location: tuple, **kwargs):
        """添加约束条件"""
        constraint = {
            'type': constraint_type,
            'location': location,
            'properties': kwargs
        }
        self.constraints.append(constraint)
        
        print(f"添加约束: {constraint_type} at {location}")
        
        # 更新显示
        self.display_constraints()
        
    def add_load(self, load_type: str, location: tuple, magnitude: float, direction: tuple = (0, 0, -1), **kwargs):
        """添加荷载"""
        load = {
            'type': load_type,
            'location': location,
            'magnitude': magnitude,
            'direction': direction,
            'properties': kwargs
        }
        self.loads.append(load)
        
        print(f"添加荷载: {load_type}, 大小: {magnitude}, 位置: {location}")
        
        # 更新显示
        self.display_loads()
        
    def display_constraints(self):
        """显示约束条件"""
        if not PYVISTA_AVAILABLE:
            return
            
        # 移除旧的约束显示
        try:
            self.plotter.remove_actor('constraints')
        except:
            pass
            
        if not self.constraints:
            return
            
        # 为每个约束创建可视化
        for i, constraint in enumerate(self.constraints):
            location = constraint['location']
            constraint_type = constraint['type']
            
            if constraint_type == 'fixed':
                # 固定约束用三角锥表示
                cone = pv.Cone(center=location, direction=(0, 0, 1), height=2, radius=1)
                self.plotter.add_mesh(cone, color='red', name=f'constraint_{i}')
                
            elif constraint_type == 'pinned':
                # 铰接约束用球体表示
                sphere = pv.Sphere(center=location, radius=0.5)
                self.plotter.add_mesh(sphere, color='blue', name=f'constraint_{i}')
                
            elif constraint_type == 'roller':
                # 滚动约束用圆柱体表示
                cylinder = pv.Cylinder(center=location, direction=(1, 0, 0), radius=0.3, height=1)
                self.plotter.add_mesh(cylinder, color='green', name=f'constraint_{i}')
                
    def display_loads(self):
        """显示荷载"""
        if not PYVISTA_AVAILABLE:
            return
            
        # 移除旧的荷载显示
        for i in range(len(self.loads)):
            try:
                self.plotter.remove_actor(f'load_{i}')
                self.plotter.remove_actor(f'load_arrow_{i}')
            except:
                pass
                
        if not self.loads:
            return
            
        # 为每个荷载创建可视化
        for i, load in enumerate(self.loads):
            location = np.array(load['location'])
            magnitude = load['magnitude']
            direction = np.array(load['direction'])
            
            # 归一化方向向量
            direction = direction / np.linalg.norm(direction)
            
            # 计算箭头长度（基于荷载大小）
            arrow_length = min(magnitude / 1000, 5)  # 限制最大长度
            
            # 箭头起点和终点
            start_point = location
            end_point = location + direction * arrow_length
            
            # 创建箭头
            arrow = pv.Arrow(start=start_point, direction=direction, scale=arrow_length)
            self.plotter.add_mesh(arrow, color='orange', name=f'load_arrow_{i}')
            
            # 添加荷载标签
            label_pos = end_point + direction * 0.5
            self.plotter.add_point_labels([label_pos], [f'{magnitude:.0f}N'], 
                                        point_size=0, font_size=12, name=f'load_label_{i}')
                                        
    def add_default_constraints_and_loads(self):
        """添加默认的约束和荷载用于演示"""
        if not self.mesh:
            return
            
        # 获取网格边界
        bounds = self.mesh.bounds
        
        # 在底部添加固定约束
        self.add_constraint('fixed', (bounds[0], bounds[2], bounds[4]))  # 左下角
        self.add_constraint('fixed', (bounds[1], bounds[2], bounds[4]))  # 右下角
        self.add_constraint('fixed', (bounds[0], bounds[3], bounds[4]))  # 左上角
        self.add_constraint('fixed', (bounds[1], bounds[3], bounds[4]))  # 右上角
        
        # 在顶部添加荷载
        center_x = (bounds[0] + bounds[1]) / 2
        center_y = (bounds[2] + bounds[3]) / 2
        top_z = bounds[5]
        
        self.add_load('force', (center_x, center_y, top_z), 10000, (0, 0, -1))
        self.add_load('force', (center_x - 5, center_y, top_z), 5000, (0, 0, -1))
        self.add_load('force', (center_x + 5, center_y, top_z), 5000, (0, 0, -1))
        
        print("添加了默认约束和荷载")
        
    def clear_constraints(self):
        """清除所有约束"""
        self.constraints.clear()
        self.display_constraints()
        print("清除所有约束")
        
    def clear_loads(self):
        """清除所有荷载"""
        self.loads.clear()
        self.display_loads()
        print("清除所有荷载")
        
    def get_mesh_info(self) -> Dict[str, Any]:
        """获取网格信息"""
        if not self.mesh:
            return {}
            
        return {
            'n_points': self.mesh.n_points,
            'n_cells': self.mesh.n_cells,
            'bounds': self.mesh.bounds,
            'center': self.mesh.center,
            'constraints_count': len(self.constraints),
            'loads_count': len(self.loads)
        }
        
    def export_mesh(self, file_path: str):
        """导出网格"""
        if not self.mesh:
            print("没有网格可导出")
            return
            
        try:
            self.mesh.save(file_path)
            print(f"网格已导出到: {file_path}")
        except Exception as e:
            print(f"导出网格失败: {e}")
            
    def reset_view(self):
        """重置视图"""
        if PYVISTA_AVAILABLE and self.plotter:
            self.plotter.reset_camera()
            
    def set_wireframe_mode(self):
        """设置线框模式"""
        if PYVISTA_AVAILABLE and self.plotter:
            try:
                actor = self.plotter.renderer.actors['main_mesh']
                actor.GetProperty().SetRepresentationToWireframe()
            except:
                pass
                
    def set_solid_mode(self):
        """设置实体模式"""
        if PYVISTA_AVAILABLE and self.plotter:
            try:
                actor = self.plotter.renderer.actors['main_mesh']
                actor.GetProperty().SetRepresentationToSurface()
            except:
                pass


# 测试函数
def test_preprocessor():
    """测试前处理模块"""
    from PyQt6.QtWidgets import QApplication
    
    app = QApplication(sys.argv)
    
    # 创建前处理器
    preprocessor = PreProcessor()
    
    # 获取视图组件
    viewer = preprocessor.get_viewer_widget()
    viewer.setWindowTitle("前处理模块测试")
    viewer.resize(800, 600)
    viewer.show()
    
    # 生成测试网格
    preprocessor.generate_mesh()
    
    # 添加约束和荷载
    preprocessor.add_default_constraints_and_loads()
    
    sys.exit(app.exec_())


if __name__ == "__main__":
    test_preprocessor()