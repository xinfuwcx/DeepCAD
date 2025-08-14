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
    #!/usr/bin/env python3
    # -*- coding: utf-8 -*-
    """
    前处理模块 - PreProcessor
    负责网格显示、约束条件、荷载显示等前处理功能
    稳定版：修复复选框切换时崩溃（锚杆/板元），PyVista可选依赖。
    """
    from __future__ import annotations

    import sys
    from pathlib import Path
    from typing import Dict, List, Any, Optional

    import numpy as np
    from PyQt6.QtWidgets import QWidget, QVBoxLayout, QFrame, QLabel
    from PyQt6.QtCore import Qt

    # 添加项目路径
    project_root = Path(__file__).parent.parent.parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    # PyVista/pyvistaqt 可选
    PYVISTA_AVAILABLE = False
    try:
        import pyvista as pv  # type: ignore
        from pyvistaqt import QtInteractor  # type: ignore
        PYVISTA_AVAILABLE = True
    except Exception:
        print("警告: 未检测到 PyVista/pyvistaqt，3D可视化将受限（不影响程序其它功能）")


    class PreProcessor:
        """前处理模块（精简稳定实现）"""

        # ---------- 初始化 ----------
        def __init__(self) -> None:
            # 数据/网格占位（由外部加载器赋值）
            self.fpn_data: Optional[Dict[str, Any]] = None
            self.mesh = None  # PyVista网格或其它占位

            # UI/渲染组件
            self.viewer_widget: Optional[QWidget] = None
            self.plotter = None

            # 显示状态
            self.display_mode: str = 'transparent'  # transparent|wireframe|solid
            self.show_plates: bool = False
            self.show_anchors: bool = False

            # 缓存的几何（避免频繁重建）
            self._plates_cached = None  # pv.PolyData or None
            self._anchors_cached = None  # pv.PolyData or None

            # 渲染锁（防止频繁刷新导致卡死）
            self._rendering: bool = False

            # 创建/配置视图
            self.create_viewer_widget()

        # ---------- 视图 ----------
        def create_viewer_widget(self) -> QWidget:
            self.viewer_widget = QWidget()
            layout = QVBoxLayout(self.viewer_widget)
            layout.setContentsMargins(0, 0, 0, 0)

            if PYVISTA_AVAILABLE:
                try:
                    self.plotter = QtInteractor(self.viewer_widget)
                    self.plotter.setMinimumSize(640, 480)
                    layout.addWidget(self.plotter.interactor)
                    self.setup_default_scene()
                except Exception as e:
                    print(f"创建PyVista视图失败: {e}")
                    self._create_placeholder(layout)
            else:
                self._create_placeholder(layout)

            return self.viewer_widget

        def _create_placeholder(self, layout: QVBoxLayout) -> None:
            placeholder = QFrame()
            placeholder.setFrameStyle(QFrame.Shape.StyledPanel)
            placeholder.setMinimumSize(640, 480)
            placeholder.setStyleSheet(
                """
                QFrame {
                    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                        stop:0 #f0f0f2, stop:1 #c0c4c8);
                    border: 2px solid #606875;
                    border-radius: 8px;
                }
                """
            )
            label = QLabel("3D视图不可用\n请安装: pip install pyvista pyvistaqt")
            label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            layout.addWidget(placeholder)
            lay2 = QVBoxLayout(placeholder)
            lay2.addWidget(label)

        def setup_default_scene(self) -> None:
            if not (PYVISTA_AVAILABLE and self.plotter):
                return
            try:
                # 背景渐变 & 坐标轴
                self.plotter.set_background(color=(0.75, 0.78, 0.82), top=(0.95, 0.95, 0.97))
                self.plotter.show_axes()
                self.show_welcome_info()
            except Exception as e:
                print(f"初始化场景失败: {e}")

        def show_welcome_info(self) -> None:
            if not (PYVISTA_AVAILABLE and self.plotter):
                return
            try:
                self.plotter.add_text(
                    "DeepCAD Transparent Layers\nReady",
                    position='upper_left',
                    font_size=12,
                    color='cyan',
                )
            except Exception:
                pass

        def get_viewer_widget(self) -> Optional[QWidget]:
            return self.viewer_widget

        # ---------- 数据加载（占位） ----------
        def load_fpn_file(self, file_path: str) -> Optional[Dict[str, Any]]:
            """外部解析器应调用本方法把解析结果交给前处理器。
            这里仅保存数据并触发一次刷新。"""
            try:
                # 这里不做实际解析，只保存路径占位
                self.fpn_data = self.fpn_data or {}
                self.fpn_data['__source_path__'] = str(file_path)
                # 触发一次渲染刷新（若已有mesh/数据）
                self.display_mesh()
                return self.fpn_data
            except Exception as e:
                print(f"加载FPN占位失败: {e}")
                return None

        # ---------- 显示主入口 ----------
        def display_mesh(self) -> None:
            if not (PYVISTA_AVAILABLE and self.plotter):
                return
            if self._rendering:
                return
            try:
                self._rendering = True
                self.plotter.clear()

                # 如有主体网格（由外部创建并赋给 self.mesh）就显示之；否则仅显示背景/坐标轴
                if self.mesh is not None:
                    try:
                        # 安全显示主体网格（不做复杂材质，避免卡顿）
                        self.plotter.add_mesh(
                            self.mesh,
                            color='#8090a0',
                            opacity=0.6 if self.display_mode == 'transparent' else 1.0,
                            show_edges=(self.display_mode != 'solid'),
                            edge_color='#e0e0e0',
                            line_width=0.4,
                            name='main_mesh',
                        )
                    except Exception as e:
                        print(f"显示主体网格失败: {e}")

                # 板元叠加
                if self.show_plates:
                    self._display_plates_overlay()

                # 锚杆叠加
                if self.show_anchors:
                    self._display_anchors_overlay()

                # 常规UI要素
                self.plotter.show_axes()
                try:
                    self.plotter.reset_camera()
                    self.plotter.render()
                except Exception:
                    pass
            finally:
                self._rendering = False

        # ---------- 叠加层：板元 ----------
        def _build_plate_geometry(self):
            """从 self.fpn_data['plate_elements'] + ['nodes'] 构建 PolyData。
            一次性构建，避免循环 merge，提升稳定性/性能。"""
            if not (PYVISTA_AVAILABLE and self.fpn_data):
                return None
            try:
                pe = self.fpn_data.get('plate_elements') or {}
                if not pe:
                    return None

                nodes = self.fpn_data.get('nodes') or []
                nid2xyz = {}
                if isinstance(nodes, list):
                    for n in nodes:
                        if 'id' in n:
                            try:
                                nid2xyz[int(n['id'])] = (float(n.get('x', 0.0)), float(n.get('y', 0.0)), float(n.get('z', 0.0)))
                            except Exception:
                                continue
                elif isinstance(nodes, dict):
                    for k, v in nodes.items():
                        try:
                            nid2xyz[int(k)] = (float(v.get('x', 0.0)), float(v.get('y', 0.0)), float(v.get('z', 0.0)))
                        except Exception:
                            continue

                if not nid2xyz:
                    return None

                all_points: List[tuple] = []
                faces: List[int] = []

                for _, elem in pe.items():
                    node_ids = elem.get('nodes', []) or []
                    # 收集有效坐标
                    pts: List[tuple] = []
                    for nid in node_ids:
                        try:
                            p = nid2xyz.get(int(nid))
                            if p:
                                pts.append(p)
                        except Exception:
                            continue
                    if len(pts) < 3:
                        continue

                    base = len(all_points)
                    all_points.extend(pts)
                    if len(pts) == 3:
                        faces.extend([3, base, base + 1, base + 2])
                    elif len(pts) == 4:
                        faces.extend([4, base, base + 1, base + 2, base + 3])
                    # 其它多边形暂不支持，避免渲染异常

                if not all_points or not faces:
                    return None

                pts_np = np.asarray(all_points, dtype=np.float32)
                faces_np = np.asarray(faces, dtype=np.int32)
                pdata = pv.PolyData(pts_np, faces_np)
                try:
                    pdata = pdata.triangulate()
                except Exception:
                    pass
                return pdata
            except Exception as e:
                print(f"构建板元几何失败: {e}")
                return None

        def _display_plates_overlay(self) -> None:
            if not (PYVISTA_AVAILABLE and self.plotter):
                return
            try:
                if self._plates_cached is None:
                    self._plates_cached = self._build_plate_geometry()
                pdata = self._plates_cached
                if pdata is not None and pdata.n_cells > 0:
                    self.plotter.add_mesh(
                        pdata,
                        color='lightsteelblue',
                        opacity=0.75,
                        show_edges=True,
                        edge_color='darkblue',
                        line_width=0.8,
                        name='plate_elements',
                    )
            except Exception as e:
                print(f"显示板元失败: {e}")

        # ---------- 叠加层：锚杆 ----------
        def _build_anchor_geometry(self):
            """构建预应力锚杆几何，支持阶段过滤和调试输出"""
            if not (PYVISTA_AVAILABLE and self.fpn_data):
                print("锚杆几何构建跳过：PyVista不可用或无FPN数据")
                return None
            try:
                line_elems = self.fpn_data.get('line_elements') or {}
                if not line_elems:
                    print("锚杆几何构建跳过：未找到线元素数据")
                    return None

                print(f"开始构建锚杆几何：发现 {len(line_elems)} 个线元素")

                # 构建节点坐标映射
                nodes = self.fpn_data.get('nodes') or []
                nid2xyz = {}
                if isinstance(nodes, list):
                    for n in nodes:
                        if isinstance(n, dict) and 'id' in n:
                            try:
                                nid2xyz[int(n['id'])] = (
                                    float(n.get('x', 0.0)),
                                    float(n.get('y', 0.0)),
                                    float(n.get('z', 0.0))
                                )
                            except (ValueError, TypeError):
                                continue
                elif isinstance(nodes, dict):
                    for k, v in nodes.items():
                        if isinstance(v, dict):
                            try:
                                nid2xyz[int(k)] = (
                                    float(v.get('x', 0.0)),
                                    float(v.get('y', 0.0)),
                                    float(v.get('z', 0.0))
                                )
                            except (ValueError, TypeError):
                                continue

                if not nid2xyz:
                    print("锚杆几何构建失败：节点坐标映射为空")
                    return None

                print(f"节点坐标映射完成：{len(nid2xyz)} 个节点")

                # 构建线元几何
                points: List[tuple] = []
                lines: List[int] = []
                valid_count = 0

                for eid, le in line_elems.items():
                    if not self._should_show_anchor_element(eid, le):
                        continue

                    try:
                        n1 = int(le.get('n1', 0))
                        n2 = int(le.get('n2', 0))

                        p1 = nid2xyz.get(n1)
                        p2 = nid2xyz.get(n2)

                        if p1 and p2:
                            base = len(points)
                            points.append(p1)
                            points.append(p2)
                            lines.extend([2, base, base + 1])
                            valid_count += 1
                        else:
                            missing = []
                            if not p1: missing.append(f"n1={n1}")
                            if not p2: missing.append(f"n2={n2}")
                            print(f"线元素 {eid} 跳过：缺少节点坐标 {', '.join(missing)}")
                    except Exception as e:
                        print(f"处理线元素 {eid} 失败: {e}")
                        continue

                if valid_count == 0:
                    print(f"锚杆几何构建完成：没有有效的线元素（总数：{len(line_elems)}）")
                    return None

                print(f"锚杆几何构建成功：{valid_count} 个有效线元素")
                pts_np = np.asarray(points, dtype=np.float32)
                lines_np = np.asarray(lines, dtype=np.int32)
                pdata = pv.PolyData(pts_np)
                pdata.lines = lines_np
                return pdata
            except Exception as e:
                print(f"构建锚杆几何失败: {e}")
                import traceback
                traceback.print_exc()
                return None
    
    def _should_show_anchor_element(self, eid: int, elem_data: Dict) -> bool:
        """判断是否应该显示该锚杆元素（考虑阶段过滤）"""
        if not self.filter_anchors_by_stage:
            return True
        
        # TODO: 根据当前分析步和元素的激活阶段来判断
        # 这里需要根据具体FPN数据格式实现阶段过滤逻辑
        current_stage = self.get_current_analysis_stage()
        if current_stage:
            # 示例：假设元素有stage_visible属性
            stage_visible = elem_data.get('stage_visible', [])
            if stage_visible:
                stage_id = current_stage.get('id', 0)
                return stage_id in stage_visible
        
        return True

    def _display_anchors_overlay(self) -> None:
        if not (PYVISTA_AVAILABLE and self.plotter):
            return
        try:
            if self._anchors_cached is None:
                self._anchors_cached = self._build_anchor_geometry()
            pdata = self._anchors_cached
            if pdata is not None and pdata.n_cells > 0:
                # 根据整体尺寸估计显示半径
                if self.mesh is not None:
                    b = self.mesh.bounds
                    diag = float(np.linalg.norm([b[1]-b[0], b[3]-b[2], b[5]-b[4]]))
                else:
                    b = pdata.bounds
                    diag = float(np.linalg.norm([b[1]-b[0], b[3]-b[2], b[5]-b[4]]))
                radius = max(diag * 0.003, 0.05)
                # 优先渲染为管道，失败则退化为线条
                try:
                    tube = pdata.tube(radius=radius, n_sides=12)
                    if tube is not None and tube.n_points > 0:
                        self.plotter.add_mesh(
                            tube, color='orange', smooth_shading=True, name='anchor_lines'
                        )
                        return
                except Exception:
                    pass
                self.plotter.add_mesh(pdata, color='red', line_width=3.0, name='anchor_lines')
        except Exception as e:
            print(f"显示锚杆失败: {e}")

        # ---------- 复选框联动API（供UI调用） ----------
        def toggle_show_plates(self, enabled: Optional[bool] = None) -> bool:
            try:
                self.show_plates = (not self.show_plates) if enabled is None else bool(enabled)
                # 每次切换都清一次缓存，避免旧几何残留
                if not self.show_plates:
                    self._plates_cached = None
                    if PYVISTA_AVAILABLE and self.plotter:
                        try:
                            self.plotter.remove_actor('plate_elements')
                        except Exception:
                            pass
                self.display_mesh()
                return self.show_plates
            except Exception as e:
                print(f"切换板元显示失败: {e}")
                return False

        def toggle_show_anchors(self, enabled: Optional[bool] = None) -> bool:
            try:
                self.show_anchors = (not self.show_anchors) if enabled is None else bool(enabled)
                if not self.show_anchors:
                    self._anchors_cached = None
                    if PYVISTA_AVAILABLE and self.plotter:
                        try:
                            self.plotter.remove_actor('anchor_lines')
                        except Exception:
                            pass
                self.display_mesh()
                return self.show_anchors
            except Exception as e:
                print(f"切换锚杆显示失败: {e}")
                return False

        # ---------- 其余占位接口（保持兼容，不做复杂逻辑） ----------
        def _is_excavation_stage(self) -> bool:
            return False

        def _is_soil_material(self, mat_id: int) -> bool:
            return int(mat_id) < 10

        def add_ground_grid(self):
            pass

        def parse_fpn_file(self, file_path: str) -> Dict[str, Any]:
            return {}

        def parse_fpn_header(self, header_lines: List[str], fpn_data: Dict):
            pass

        def parse_gts_node_line(self, line: str) -> Optional[Dict]:
            return None

        def parse_gts_element_line(self, line: str) -> Optional[Dict]:
            return None

        def parse_material_group_line(self, line: str) -> Optional[Dict]:
            return None

        def parse_load_group_line(self, line: str) -> Optional[Dict]:
            return None

        def parse_boundary_group_line(self, line: str) -> Optional[Dict]:
            return None

        def parse_analysis_stage_line(self, line: str) -> Optional[Dict]:
            return None

        def create_default_analysis_stages(self) -> List[Dict]:
            return []

        def calculate_coordinate_offset(self, fpn_data: Dict):
            pass

        def parse_gts_data_line(self, line: str, section: str, fpn_data: Dict):
            pass

        def parse_mct_node_line(self, line: str, nodes: List[Dict]):
            pass

        def parse_mct_element_line(self, line: str, elements: List[Dict]):
            pass

        def parse_mct_material_line(self, line: str, materials: List[Dict]):
            pass

        def parse_mct_constraint_line(self, line: str, constraints: List[Dict]):
            pass

        def parse_mct_load_line(self, line: str, loads: List[Dict]):
            pass

        def parse_mct_stage_line(self, line: str, stages: List[Dict]):
            pass

        def create_sample_fpn_data(self) -> Dict[str, Any]:
            return {}

        def create_mesh_from_fpn(self, fpn_data: Dict[str, Any]):
            pass

        def get_material_color(self, material_id: int, material_name: str = "") -> tuple:
            return (0.5, 0.5, 0.5)

        def get_analysis_stages(self) -> list:
            return []

        def get_current_analysis_stage(self) -> dict:
            return {}

        def set_current_analysis_stage(self, stage_index: int):
            pass

        def update_display_for_stage(self, stage: dict):
            pass

        def determine_active_groups_for_stage(self, stage: dict) -> dict:
            return {}

        def _determine_groups_from_commands(self, current_stage_id: int, all_stages: list) -> dict:
            return {}

        def _determine_groups_from_active_lists(self, stage: dict) -> dict:
            return {}

        def filter_materials_by_stage(self, active_materials: list):
            pass

        def intelligent_material_selection(self, stage_name: str):
            pass

        def load_mesh(self, file_path: str):
            pass

        def read_gmsh_file(self, file_path: str):
            pass


    # 轻量级自检（仅在直接运行本文件时）
    def test_preprocessor() -> None:
        pp = PreProcessor()
        w = pp.get_viewer_widget()
        print("PreProcessor ready:", isinstance(w, QWidget))


    if __name__ == "__main__":
        test_preprocessor()
        self.plotter.add_text("DeepCAD前处理模块\n等待导入网格...",
                             position='upper_left', font_size=12, color='orange')

    def get_viewer_widget(self):
        """获取3D视图组件"""
        return self.viewer_widget

    def load_fpn_file(self, file_path: str):
        """加载MIDAS FPN文件（使用优化解析器）"""
        try:
            # 🔧 确保正确的导入路径
            import sys
            from pathlib import Path

            # 添加项目根目录到路径
            project_root = Path(__file__).parent.parent
            if str(project_root) not in sys.path:
                sys.path.insert(0, str(project_root))

            # 导入所需模块（优先从example2.core导入，避免被顶层core包遮蔽）
            try:
                from example2.core.optimized_fpn_parser import OptimizedFPNParser
            except Exception:
                from core.optimized_fpn_parser import OptimizedFPNParser
            try:
                from utils.error_handler import handle_error
            except ImportError:
                handle_error = None

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

        except ImportError as import_error:
            # OptimizedFPNParser导入失败，使用备用解析方法
            print(f"⚠️ OptimizedFPNParser导入失败: {import_error}")
            print(f"🔄 使用备用FPN解析方法...")

            try:
                # 使用内置的简化FPN解析器
                fpn_data = self.parse_fpn_file(str(file_path))
                if fpn_data:
                    self.fpn_data = fpn_data

                    # 如果没有找到分析步，添加默认的分析步
                    if not fpn_data.get('analysis_stages'):
                        print("未找到分析步定义，添加默认分析步...")
                        fpn_data['analysis_stages'] = self.create_default_analysis_stages()
                        print(f"已添加 {len(fpn_data['analysis_stages'])} 个默认分析步")

                    self.create_mesh_from_fpn(fpn_data)
                    self.display_mesh()
                    print(f"✅ 使用备用方法成功解析FPN文件")
                    print(f"节点: {len(fpn_data.get('nodes', []))}, 单元: {len(fpn_data.get('elements', []))}")
                else:
                    print(f"❌ 备用方法也无法解析FPN文件")
                    return None
            except Exception as parse_error:
                print(f"❌ 备用解析方法也失败: {parse_error}")
                import traceback
                traceback.print_exc()
                return None

        except Exception as e:
            # 其他错误的处理
            print(f"❌ FPN文件加载过程中发生错误: {e}")
            import traceback
            traceback.print_exc()
            return None

            fpn_data['analysis_stages'] = self.create_default_analysis_stages()
            print(f"已添加 {len(fpn_data['analysis_stages'])} 个默认分析步")

        # 存储解析的数据
        self.fpn_data = fpn_data

        # 从FPN数据创建网格
        self.create_mesh_from_fpn(fpn_data)

        return fpn_data

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
        try:
            if not PYVISTA_AVAILABLE:
                print("PyVista不可用，无法创建网格")
                return

            print("开始从FPN数据创建真实网格...")

            # 保存FPN数据
            self.fpn_data = fpn_data

            # 处理节点数据（兼容 dict/list）
            nodes = fpn_data.get('nodes', [])
            if isinstance(nodes, dict):
                nodes = list(nodes.values())
            if not nodes:
                print("警告: 没有找到节点数据")
                self.create_sample_mesh()
                return

            # 处理单元数据（兼容 dict/list）
            elements = fpn_data.get('elements', [])
            if isinstance(elements, dict):
                elements = list(elements.values())
            if not elements:
                print("警告: 没有找到单元数据")
                self.create_sample_mesh()
                return

            print(f"处理 {len(nodes)} 个节点和 {len(elements)} 个单元")

            # 创建节点数组 (需要按照ID排序，确保索引正确)
            node_dict = {int(node['id']): node for node in nodes}
            max_node_id = max(node_dict.keys())
            points = np.zeros((max_node_id, 3), dtype=float)

            for node_id, node in node_dict.items():
                points[node_id-1] = [node['x'], node['y'], node['z']]

            # 创建单元连接信息，支持 TETRA/HEXA/PENTA（大小写不敏感）
            cells = []
            cell_types = []

            VTK_TETRA = 10
            VTK_HEXAHEDRON = 12
            VTK_WEDGE = 13

            for elem in elements:
                etype = str(elem.get('type', '')).lower()
                nn = [n-1 for n in elem.get('nodes', [])]
                if etype == 'tetra' or etype == 'tetra4' or etype == 't4':
                    if len(nn) >= 4:
                        cells.extend([4] + nn[:4])
                        cell_types.append(VTK_TETRA)
                elif etype == 'hexa' or etype == 'hex' or etype == 'hexa8' or etype == 'h8':
                    if len(nn) >= 8:
                        cells.extend([8] + nn[:8])
                        cell_types.append(VTK_HEXAHEDRON)
                elif etype == 'penta' or etype == 'wedge' or etype == 'p6' or etype == 'w6':
                    if len(nn) >= 6:
                        cells.extend([6] + nn[:6])
                        cell_types.append(VTK_WEDGE)
                else:
                    # 兼容旧格式 'TETRA'/'HEXA'/'PENTA'
                    etype_upper = str(elem.get('type', '')).upper()
                    if etype_upper == 'TETRA' and len(nn) >= 4:
                        cells.extend([4] + nn[:4])
                        cell_types.append(VTK_TETRA)
                    elif etype_upper == 'HEXA' and len(nn) >= 8:
                        cells.extend([8] + nn[:8])
                        cell_types.append(VTK_HEXAHEDRON)
                    elif etype_upper == 'PENTA' and len(nn) >= 6:
                        cells.extend([6] + nn[:6])
                        cell_types.append(VTK_WEDGE)

            if not cells:
                print("警告: 没有找到支持的单元类型（TETRA/HEXA/PENTA）")
                self.create_sample_mesh()
                return

            # 创建PyVista网格
            try:
                cells_array = np.asarray(cells, dtype=np.int64)
                types_array = np.asarray(cell_types, dtype=np.uint8)
                self.mesh = pv.UnstructuredGrid(cells_array, types_array, points)
                print(f"成功创建网格: {self.mesh.n_points} 个节点, {self.mesh.n_cells} 个单元")
            except Exception as mesh_error:
                print(f"网格创建过程出错: {mesh_error}")
                import traceback
                traceback.print_exc()
                self.create_sample_mesh()
                return

            # 处理材料数据
            materials = fpn_data.get('materials', [])
            material_dict = {}
            # 兼容 materials 为 set/list[int] 或 list[dict]
            if isinstance(materials, (set, list)):
                for m in materials:
                    if isinstance(m, dict):
                        mid = m.get('id')
                        if mid is None:
                            continue
                        material_dict[mid] = {
                            'name': m.get('name', f'Material_{mid}'),
                            'properties': m.get('properties', {'type': 'soil'})
                        }
                    else:
                        try:
                            mid = int(m)
                        except Exception:
                            continue
                        material_dict[mid] = {
                            'name': f'Material_{mid}',
                            'properties': {'type': 'soil'}
                        }
            elif isinstance(materials, dict):
                # 如果解析器返回字典形式 {id: info}
                for mid, info in materials.items():
                    material_dict[int(mid)] = {
                        'name': info.get('name', f'Material_{mid}'),
                        'properties': info.get('properties', {'type': 'soil'})
                    }
            self.materials = material_dict
            print(f"处理了 {len(self.materials)} 种材料 (已兼容格式)")

            # 为网格添加材料ID数据
            if hasattr(self.mesh, 'cell_data') and elements:
                material_ids = np.array([elem['material_id'] for elem in elements])
                self.mesh.cell_data['MaterialID'] = material_ids
                print(f"添加材料ID数据: {len(material_ids)} 个单元")

            # 处理分析步信息
            self.analysis_stages = fpn_data.get('analysis_stages', [])
            if self.analysis_stages:
                print(f"发现 {len(self.analysis_stages)} 个分析步:")
                for stage in self.analysis_stages:
                    print(f"  - {stage['name']} (ID: {stage['id']})")
            else:
                print("未找到分析步信息，使用默认分析步")
                self.analysis_stages = self.create_default_analysis_stages()

            # 设置当前分析步为第一个
            self.current_stage_index = 0

            # 显示网格
            self.display_mesh()

        except Exception as e:
            # 🔧 网格创建失败时的异常处理
            print(f"❌ 网格创建失败: {e}")
            import traceback
            traceback.print_exc()

            # 创建一个简单的示例网格作为后备
            print("正在创建示例网格作为后备...")
            self.create_sample_mesh()

            # 设置基本的分析步信息
            if fpn_data and 'analysis_stages' in fpn_data:
                self.analysis_stages = fpn_data['analysis_stages']
                self.fpn_data = fpn_data
            else:
                self.analysis_stages = []

            self.current_stage_index = 0

    def get_material_color(self, material_id: int, material_name: str) -> tuple:
        """重新设计的地层/结构配色：柔和、工程感一致。
        - 土体采用低饱和度的土色系，随层次变化但整体协调
        - 结构材料采用中性蓝灰/银灰
        """
        palette = {
            1: (0.761, 0.561, 0.361),  # 填土 Sandy Brown  #C28F5C
            2: (0.851, 0.710, 0.447),  # 粉质粘土 Tan       #D9B572
            3: (0.631, 0.533, 0.498),  # 淤泥质土 Taupe     #A1887F
            4: (0.553, 0.431, 0.388),  # 粘土 Earth Brown   #8D6E63
            5: (0.878, 0.765, 0.424),  # 砂土 Ochre         #E0C36C
            6: (0.435, 0.561, 0.663),  # 基岩 Slate Blue-Gray #6F8FA9
            7: (0.486, 0.604, 0.427),  # 土层7 Olive Green  #7C9A6D
            8: (0.690, 0.478, 0.631),  # 土层8 Dusty Plum   #B07AA1
            9: (0.373, 0.639, 0.639),  # 土层9 Teal Gray    #5FA3A3
            10: (0.549, 0.573, 0.604), # 混凝土桩 Blue-Gray #8C929A
            11: (0.816, 0.827, 0.839), # 钢/支撑 Silver Gray #D0D3D6
            12: (0.725, 0.749, 0.776), # 混凝土 Light Blue-Gray #B9BFC6
        }
        id_color = palette.get(int(material_id))
        if id_color is not None:
            return id_color

        # 名称关键字映射（与上面调色板保持一致）
        name_mapping = {
            '填土': (0.761, 0.561, 0.361),
            '细砂': (0.878, 0.765, 0.424),
            '砂土': (0.878, 0.765, 0.424),
            '粉土': (0.851, 0.710, 0.447),
            '粉质粘土': (0.851, 0.710, 0.447),
            '粘土': (0.553, 0.431, 0.388),
            '淤泥': (0.631, 0.533, 0.498),
            '卵石': (0.486, 0.604, 0.427),
            '岩': (0.435, 0.561, 0.663),
            '围护墙': (0.725, 0.749, 0.776),
            '地连墙': (0.725, 0.749, 0.776),
            '支护墙': (0.725, 0.749, 0.776),
            '混凝土': (0.725, 0.749, 0.776),
            '钢材': (0.816, 0.827, 0.839),
            '钢': (0.816, 0.827, 0.839),
        }
        for key, color in name_mapping.items():
            if key in material_name:
                return color

        # 回退：根据ID生成区分色（降低饱和度，保证不突兀）
        import colorsys
        hue = (int(material_id) * 0.618033988749895) % 1.0
        saturation = 0.45
        value = 0.85
        return colorsys.hsv_to_rgb(hue, saturation, value)

    def get_analysis_stages(self) -> list:
        """获取所有分析步"""
        return getattr(self, 'analysis_stages', [])

    def get_current_analysis_stage(self) -> dict:
        """获取当前分析步"""
        if hasattr(self, 'analysis_stages') and self.analysis_stages:
            index = getattr(self, 'current_stage_index', 0)
            if 0 <= index < len(self.analysis_stages):
                return self.analysis_stages[index]
        return None

    def set_current_analysis_stage(self, stage_index: int):
        """设置当前分析步（通过索引）"""
        # 🔧 修复：使用正确的数据源 fpn_data
        if hasattr(self, 'fpn_data') and self.fpn_data:
            analysis_stages = self.fpn_data.get('analysis_stages', [])
            if 0 <= stage_index < len(analysis_stages):
                self.current_stage_index = stage_index
                stage = analysis_stages[stage_index]
                print(f"✅ 切换到分析步: {stage['name']} (ID: {stage.get('id', 'N/A')})")

                # 根据分析步更新显示的物理组
                self.update_display_for_stage(stage)
            else:
                print(f"❌ 分析步索引超出范围: {stage_index}, 总共有 {len(analysis_stages)} 个分析步")
        else:
            print("❌ 未找到FPN数据，无法切换分析步")

    def update_display_for_stage(self, stage: dict):
        """根据分析步更新显示"""
        stage_name = stage.get('name', '')
        stage_id = stage.get('id', 0)

        print(f"🔄 更新分析步显示: ID={stage_id}, 名称='{stage_name}', 类型={stage.get('type', 0)}")

        # 🔧 强化分析步数据传递
        self.current_stage_data = stage
        self.current_stage_id = stage_id

        # 检查是否有直接的激活材料信息
        print(f"🔍 检查分析步数据结构: {list(stage.keys())}")
        if 'active_materials' in stage:
            print(f"📋 分析步包含直接材料信息: {sorted(stage['active_materials'])}")
        else:
            print(f"⚠️  分析步不包含active_materials字段，将使用智能推断")

        # ✅ 修复关键问题：使用determine_active_groups_for_stage动态计算激活材料组
        active_groups = self.determine_active_groups_for_stage(stage)
        active_materials = active_groups.get('materials', [])
        active_loads = active_groups.get('loads', [])
        active_boundaries = active_groups.get('boundaries', [])

        print(f"📊 动态计算的激活材料组: {active_materials}")
        print(f"📊 动态计算的激活荷载组: {active_loads}")
        print(f"📊 动态计算的激活边界组: {active_boundaries}")

        # 🔧 强化材料过滤逻辑
        if active_materials:
            # 只显示激活的材料组
            print("⚙️  使用物理组过滤材料")
            self.filter_materials_by_stage(active_materials)
        else:
            # 如果没有指定材料组，根据分析步名称智能判断
            print("⚙️  使用智能材料选择")
            self.intelligent_material_selection(stage_name)

        # 确保材料过滤状态被正确设置
        print(f"💡 最终材料激活状态: {sorted(self.current_active_materials) if hasattr(self, 'current_active_materials') and self.current_active_materials else '未设置'}")

        # 重新显示网格
        if hasattr(self, 'mesh') and self.mesh:
            print("🎨 重新渲染3D网格...")
            self.display_mesh()
            print("✅ 分析步显示更新完成")

    def determine_active_groups_for_stage(self, stage: dict) -> dict:
        """根据分析步确定需要激活的物理组，兼容group_commands和active_materials两种格式"""
        active_groups = {
            'materials': [],
            'loads': [],
            'boundaries': []
        }

        if not stage or not hasattr(self, 'fpn_data') or not self.fpn_data:
            return active_groups

        current_stage_id = stage.get('id', 0)
        print(f"\n确定分析步 {current_stage_id} ({stage.get('name', 'Unknown')}) 的激活物理组:")

        # 优先：累计应用 group_commands（MADD/MDEL等）
        all_stages = self.fpn_data.get('analysis_stages', [])
        all_stages = sorted(all_stages, key=lambda x: x.get('id', 0))
        has_group_commands = any(s.get('group_commands') for s in all_stages)
        if has_group_commands:
            print("  优先使用group_commands格式解析（累计至当前阶段）")
            agg = self._determine_groups_from_commands(current_stage_id, all_stages)
            if agg and (agg.get('materials') or agg.get('loads') or agg.get('boundaries')):
                return agg

        # 其次：active_materials格式（以防解析器仅提供该字段）
        print("  回退使用active_materials格式解析")
        try:
            mesh_material_ids = set()
            if hasattr(self, 'mesh') and self.mesh is not None and 'MaterialID' in self.mesh.cell_data:
                import numpy as np
                mesh_material_ids = set(int(x) for x in np.unique(self.mesh.cell_data['MaterialID']))
            direct_am = list(stage.get('active_materials') or [])
            if direct_am:
                intersection = sorted(list(set(int(x) for x in direct_am) & mesh_material_ids))
                if intersection:
                    print(f"  使用阶段 active_materials 与网格交集: {intersection}")
                    active_groups['materials'] = intersection
                    return active_groups
        except Exception:
            pass

        agg2 = self._determine_groups_from_active_lists(stage)
        if agg2 and agg2.get('materials'):
            return agg2

        # 最后兜底：若为“开挖”阶段且仍无法确定材料集合，则保留结构材料，隐藏土体
        try:
            name = (stage.get('name') or '').lower()
            if ('开挖' in name) or ('excavation' in name):
                struct_ids = []
                for mid, info in (self.materials or {}).items():
                    mtype = (info.get('properties', {}) or {}).get('type', 'soil')
                    if mtype in ('concrete', 'steel'):
                        struct_ids.append(int(mid))
                if struct_ids:
                    print(f"  兜底（开挖阶段）：仅保留结构材料 {sorted(struct_ids)}")
                    active_groups['materials'] = sorted(struct_ids)
                    return active_groups
        except Exception:
            pass

        print("  未能从阶段数据确定激活材料，返回空集合（上层将做显示回退）")
        return active_groups

    def _determine_groups_from_commands(self, current_stage_id: int, all_stages: list) -> dict:
        """从group_commands格式确定激活组（使用网格中实际存在的材料ID进行校验）"""
        active_groups = {'materials': [], 'loads': [], 'boundaries': []}

        # 收集所有物理组命令
        all_physics_commands = []
        for s in all_stages:
            stage_commands = s.get('group_commands', [])
            all_physics_commands.extend(stage_commands)

        print(f"  总共收集到 {len(all_physics_commands)} 个物理组命令")

        # 网格中真实存在的材料ID集合，用于校验
        mesh_material_ids = set()
        try:
            if hasattr(self, 'mesh') and self.mesh is not None and 'MaterialID' in self.mesh.cell_data:
                import numpy as np
                mesh_material_ids = set(int(x) for x in np.unique(self.mesh.cell_data['MaterialID']))
        except Exception:
            pass

        # 初始化激活状态
        active_materials = set()
        active_loads = set()
        active_boundaries = set()

        # 按阶段顺序应用所有命令到当前阶段
        for cmd in sorted(all_physics_commands, key=lambda x: x.get('stage_id', 0)):
            cmd_stage_id = cmd.get('stage_id', 0)

            # 只应用到当前阶段为止的命令
            if cmd_stage_id <= current_stage_id:
                command = cmd.get('command', '')
                group_ids = [int(g) for g in cmd.get('group_ids', []) if g is not None]

                if command == 'MADD':  # 添加材料组
                    # 仅保留在网格中实际存在的材料ID
                    valid_materials = [gid for gid in group_ids if not mesh_material_ids or gid in mesh_material_ids]
                    active_materials.update(valid_materials)
                    print(f"  阶段{cmd_stage_id}: MADD 激活材料组 {valid_materials} (原始: {group_ids})")

                elif command == 'MDEL':  # 删除材料组
                    for gid in group_ids:
                        if gid in active_materials:
                            active_materials.remove(gid)
                            print(f"  阶段{cmd_stage_id}: MDEL 删除材料组 {gid}")
                        else:
                            print(f"  阶段{cmd_stage_id}: MDEL 尝试删除材料组 {gid}，但未激活")

                elif command == 'LADD':  # 添加荷载组
                    active_loads.update(group_ids)
                    print(f"  阶段{cmd_stage_id}: LADD 激活荷载组 {group_ids}")

                elif command == 'BADD':  # 添加边界组
                    active_boundaries.update(group_ids)
                    print(f"  阶段{cmd_stage_id}: BADD 激活边界组 {group_ids}")

        # 转换为列表并排序
        active_groups['materials'] = sorted(list(active_materials))
        active_groups['loads'] = sorted(list(active_loads))
        active_groups['boundaries'] = sorted(list(active_boundaries))

        print(f"  最终激活物理组: 材料{active_groups['materials']}, 荷载{active_groups['loads']}, 边界{active_groups['boundaries']}")

        return active_groups

    def _determine_groups_from_active_lists(self, stage: dict) -> dict:
        """从active_materials格式确定激活组（适用于FPN解析器生成的数据）"""
        active_groups = {
            'materials': [],
            'loads': [],
            'boundaries': []
        }

        stage_id = stage.get('id', 0)
        stage_name = stage.get('name', 'Unknown')

        # 从阶段数据中直接读取已解析的激活列表（可能是物理组/集合ID，而非材料ID）
        active_materials = stage.get('active_materials', [])
        active_loads = stage.get('active_loads', [])
        active_boundaries = stage.get('active_boundaries', [])

        print(f"  从阶段数据读取:")
        print(f"    原始激活材料: {active_materials}")
        print(f"    原始激活荷载: {active_loads}")
        print(f"    原始激活边界: {active_boundaries}")

        # 网格中真实存在的材料ID集合
        mesh_material_ids = set()
        if hasattr(self, 'mesh') and self.mesh is not None and 'MaterialID' in self.mesh.cell_data:
            try:
                import numpy as np
                mesh_material_ids = set(int(x) for x in np.unique(self.mesh.cell_data['MaterialID']))
            except Exception:
                pass

        # 先尝试与网格材料ID求交集（将可能的物理组ID过滤为真实材料ID）
        intersection = sorted(list(set(int(x) for x in active_materials) & mesh_material_ids)) if active_materials else []

        # ✅ 对开挖阶段提供健壮的回退逻辑：如果交集为空，则按规则剔除“土体”材料
        if (stage_id == 2 or '开挖' in stage_name) and not intersection and mesh_material_ids:
            print("  检测到开挖阶段且未能从阶段数据映射到有效材料ID，启用回退规则")
            # 规则：移除ID为4的材料（常见为土体层），如不存在则移除最小ID
            remove_id = 4 if 4 in mesh_material_ids else min(mesh_material_ids)
            active_groups['materials'] = sorted(list(mesh_material_ids - {remove_id}))
            print(f"    回退后激活材料: {active_groups['materials']} (移除了 {remove_id})")
        else:
            # 普通阶段：若有有效交集使用之，否则直接显示全部材料
            active_groups['materials'] = intersection if intersection else sorted(list(mesh_material_ids))

        active_groups['loads'] = sorted(list(set(active_loads)))
        active_groups['boundaries'] = sorted(list(set(active_boundaries)))

        return active_groups

    def filter_materials_by_stage(self, active_materials: list):
        """根据分析步过滤材料显示"""
        print(f"根据分析步过滤材料: {active_materials}")

        # ✅ 修复关键问题：直接使用计算出的材料ID，不再进行错误的映射
        # determine_active_groups_for_stage已经返回了正确的材料ID（2-12），
        # 不需要通过网格集合再次映射
        self.current_active_materials = set(active_materials)

        print(f"设置激活材料为: {sorted(list(self.current_active_materials))}")

        # 验证材料ID是否存在于网格中
        if hasattr(self, 'mesh') and self.mesh and hasattr(self.mesh, 'cell_data') and 'MaterialID' in self.mesh.cell_data:
            all_material_ids = set(self.mesh.cell_data['MaterialID'])
            missing_materials = self.current_active_materials - all_material_ids
            if missing_materials:
                print(f"⚠️  警告：以下材料ID在网格中不存在: {sorted(list(missing_materials))}")
                self.current_active_materials = self.current_active_materials & all_material_ids
                print(f"过滤后的激活材料: {sorted(list(self.current_active_materials))}")
            else:
                print(f"✅ 所有激活材料ID都存在于网格中")

    def intelligent_material_selection(self, stage_name: str):
        """根据分析步名称智能选择材料"""
        stage_name_lower = stage_name.lower()

        print(f"智能材料选择: {stage_name}")

        # 首先尝试使用分析步中的active_materials
        stage_info = getattr(self, 'current_stage_data', None)
        if stage_info and 'active_materials' in stage_info and stage_info['active_materials']:
            active_materials_from_stage = set(stage_info['active_materials'])
            print(f"从分析步数据获取激活材料: {sorted(list(active_materials_from_stage))}")

            if active_materials_from_stage:
                self.current_active_materials = active_materials_from_stage
            else:
                # 智能推断：开挖阶段通常保留支护结构和部分土体
                print("未找到active_materials，智能推断开挖后激活材料")
                self.current_active_materials = set()

                # 🔧 改进的智能推断逻辑
                all_materials = list(self.materials.keys())
                all_materials.sort()  # 排序便于分析

                for mat_id, mat_info in self.materials.items():
                    mat_type = mat_info['properties']['type']

                    # 策略1：保留所有支护结构
                    if mat_type in ['concrete', 'steel']:
                        self.current_active_materials.add(mat_id)
                        continue

                    # 策略2：对于土体，移除浅层材料（通常是被开挖的）
                    if mat_type == 'soil':
                        # 假设材料ID越小，深度越浅，越可能被开挖
                        # 移除前30%的土体材料作为开挖区域
                        soil_materials = [mid for mid, info in self.materials.items()
                                        if info['properties']['type'] == 'soil']
                        soil_materials.sort()

                        # 移除前30%的土体（或至少1个）
                        remove_count = max(1, len(soil_materials) // 3)
                        materials_to_remove = soil_materials[:remove_count]

                        if mat_id not in materials_to_remove:
                            self.current_active_materials.add(mat_id)

                print(f"智能推断激活材料: {sorted(self.current_active_materials)}")

                # 计算智能推断移除的材料
                all_soil = {mid for mid, info in self.materials.items()
                           if info['properties']['type'] == 'soil'}
                removed_soil = all_soil - self.current_active_materials
                if removed_soil:
                    print(f"💡 智能推断移除土体: {sorted(removed_soil)}")

            # 计算和报告被开挖移除的材料
            all_soil_materials = set()
            for mat_id, mat_info in self.materials.items():
                if mat_info['properties']['type'] == 'soil':
                    all_soil_materials.add(mat_id)

            removed_materials = all_soil_materials - self.current_active_materials
            if removed_materials:
                print(f"🗑️  开挖移除的土体材料: {sorted(removed_materials)}")
                print(f"✅ 开挖效果确认：{len(removed_materials)}种土体材料将被完全隐藏")

                # 🔧 重要修复：确保在3D视图中隐藏这些材料
                self.hide_materials_in_3d(removed_materials)
            else:
                print(f"⚠️  警告：没有土体材料被移除，可能开挖逻辑有问题")

        elif '支护' in stage_name_lower or '围护' in stage_name_lower or '墙' in stage_name_lower:
            # 支护分析：显示结构材料
            print("智能选择: 支护阶段 - 结构材料")
            self.current_active_materials = set()
            for mat_id, mat_info in self.materials.items():
                if mat_info['properties']['type'] == 'concrete':
                    self.current_active_materials.add(mat_id)

        else:
            # 默认显示所有材料
            print("智能选择: 默认 - 所有材料")
            self.current_active_materials = set(self.materials.keys())

        print(f"智能选择结果: {self.current_active_materials}")

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

        # 叠加显示：板元（TRIA/QUAD）
        try:
            if self.show_plates:
                if self._plates_cached is None:
                    self._plates_cached = self._build_plate_geometry()
                plate_data = self._plates_cached
                if plate_data is not None:
                    self.plotter.add_mesh(
                        plate_data,
                        color='lightgray',
                        opacity=0.8,
                        show_edges=True,
                        edge_color='black',
                        name='plate_elements'
                    )
        except Exception as e:
            print(f"显示板元失败: {e}")

        # 叠加显示：锚杆线元
        try:
            if self.show_anchors:
                # 构建或使用缓存
                if self._anchors_cached is None:
                    self._anchors_cached = self._build_anchor_geometry()
                pdata = self._anchors_cached
                # 按阶段过滤（可选）
                if pdata is not None and self.filter_anchors_by_stage:
                    stage_eids = self._get_stage_prestress_element_ids()
                    print(f"预应力阶段过滤启用: 当前阶段线元数={len(stage_eids)}")
                if pdata is not None:
                    # 提升可见性：将线元渲染为圆管，并设置合适半径
                    try:
                        bounds = None
                        if hasattr(self, 'mesh') and self.mesh is not None:
                            bounds = self.mesh.bounds  # (xmin, xmax, ymin, ymax, zmin, zmax)
                        elif hasattr(pdata, 'bounds'):
                            bounds = pdata.bounds
                        if bounds:
                            dx = abs(bounds[1] - bounds[0])
                            dy = abs(bounds[3] - bounds[2])
                            dz = abs(bounds[5] - bounds[4])
                            diag = max((dx**2 + dy**2 + dz**2) ** 0.5, 1e-6)
                            radius = max(diag * 0.002, 0.005)  # 0.2%对角线，至少0.005
                        else:
                            radius = 0.01
                        tube = None
                        try:
                            tube = pdata.tube(radius=radius, n_sides=12)
                        except Exception:
                            tube = None
                        if tube is not None and tube.n_points > 0:
                            self.plotter.add_mesh(
                                tube,
                                color='orange',
                                smooth_shading=True,
                                name='anchor_lines'
                            )
                        else:
                            # 回退：直接画线，尽量作为tube显示
                            self.plotter.add_mesh(
                                pdata,
                                color='orange',
                                render_lines_as_tubes=True,
                                line_width=3.0,
                                name='anchor_lines'
                            )
                    except Exception:
                        # 最保守的回退
                        self.plotter.add_mesh(
                            pdata,
                            color='orange',
                            line_width=3.0,
                            name='anchor_lines'
                        )
        except Exception as e:
            print(f"显示锚杆失败: {e}")

        # 显示坐标轴
        self.plotter.show_axes()

        # 自动调整视图
        self.plotter.reset_camera()

        # 强制刷新渲染，避免某些环境下切换模式后短暂空白
        try:
            self.plotter.render()
        except Exception:
            pass

    def hide_materials_in_3d(self, material_ids_to_hide):
        """在3D视图中隐藏指定的材料（用于开挖模拟）"""
        if not PYVISTA_AVAILABLE or not self.plotter:
            return

        print(f"🔧 隐藏3D视图中的材料: {sorted(material_ids_to_hide)}")

        # 遍历所有要隐藏的材料ID
        for mat_id in material_ids_to_hide:
            actor_name = f'material_{mat_id}'

            # 尝试移除对应的actor
            try:
                # 获取所有actor并查找匹配的
                actors_to_remove = []
                for actor_name_in_plotter, actor in self.plotter.renderer.actors.items():
                    if actor_name_in_plotter == actor_name:
                        actors_to_remove.append(actor)

                # 移除找到的actor
                for actor in actors_to_remove:
                    self.plotter.remove_actor(actor)
                    print(f"  已移除材料 {mat_id} 的3D显示")

                if not actors_to_remove:
                    print(f"  材料 {mat_id} 的3D actor未找到")

            except Exception as e:
                print(f"  移除材料 {mat_id} 时出错: {e}")

        # 刷新显示
        try:
            if hasattr(self.plotter, 'render'):
                self.plotter.render()
        except Exception as e:
            print(f"刷新3D视图时出错: {e}")

    def display_transparent_layers(self):
        """使用半透明效果显示分层土体"""
        if not PYVISTA_AVAILABLE or not self.mesh:
            return

        # 检查是否有材料ID信息
        if hasattr(self.mesh, 'cell_data') and 'MaterialID' in self.mesh.cell_data:
            # 根据材料ID分层显示
            all_material_ids = np.unique(self.mesh.cell_data['MaterialID'])

            # 🔧 强化材料过滤逻辑：优先使用 current_active_materials
            if hasattr(self, 'current_active_materials') and self.current_active_materials:
                # 严格过滤：只显示激活的材料
                material_ids = [mid for mid in all_material_ids if mid in self.current_active_materials]
                removed_materials = [mid for mid in all_material_ids if mid not in self.current_active_materials]
                print(f"🔧 开挖分析步过滤结果:")
                print(f"  原始材料ID: {sorted(list(all_material_ids))}")
                print(f"  激活材料ID: {sorted(list(self.current_active_materials))}")
                print(f"  显示材料ID: {sorted(list(material_ids))}")
                print(f"  🗑️  开挖移除材料ID: {sorted(list(removed_materials))}")
                if removed_materials:
                    print(f"  ✅ 开挖效果：{len(removed_materials)}种材料已被完全移除")

                # 如果没有激活材料，说明过滤有问题，显示警告
                if not material_ids:
                    print(f"  ⚠️  警告：没有材料被激活，可能存在过滤错误")
                    material_ids = all_material_ids  # 回退到显示所有材料
            else:
                material_ids = all_material_ids
                print(f"显示所有材料ID: {sorted(list(material_ids))}")

            # 额外：按材料类型(part)开关过滤
            try:
                type_map = {mid: self.materials.get(int(mid), {}).get('properties', {}).get('type') for mid in material_ids}
                show_types = set()
                # 使用自身的显示标志，不再依赖父窗口控件
                if getattr(self, 'show_soil', True):
                    show_types.add('soil')
                if getattr(self, 'show_concrete', True):
                    show_types.add('concrete')
                if getattr(self, 'show_steel', True):
                    show_types.add('steel')
                if show_types:
                    material_ids = [mid for mid in material_ids if type_map.get(int(mid)) in show_types]
            except Exception as e:
                print(f"按材料类型过滤失败: {e}")

            print(f"网格单元数: {self.mesh.n_cells}")
            print(f"材料ID数组长度: {len(self.mesh.cell_data['MaterialID'])}")

            # 在开挖阶段，剔除土体材料（可配置）
            try:
                is_excavation = self._is_excavation_stage()
                if is_excavation and getattr(self, 'hide_soil_in_excavation_stage', True):
                    before = list(material_ids)
                    material_ids = [mid for mid in material_ids if not self._is_soil_material(mid)]
                    print(f"开挖阶段剔除土体: 原有{sorted(list(before))} -> 保留{sorted(list(material_ids))}")
            except Exception as _:
                pass

            # 使用材料字典中的颜色信息（健壮：属性缺失时自动回退）
            material_colors = {}
            for mat_id in material_ids:
                mat_info = self.materials.get(int(mat_id), {})
                props = mat_info.get('properties', {}) if isinstance(mat_info, dict) else {}
                mat_name = mat_info.get('name', f'Material_{mat_id}') if isinstance(mat_info, dict) else f'Material_{mat_id}'
                mat_type = props.get('type', 'soil')
                # 颜色统一按“原始ID配色”生成，避免被props覆盖
                color = self.get_material_color(int(mat_id), mat_name)
                opacity = 0.8 if mat_type == 'concrete' else 0.6
                material_colors[mat_id] = {
                    'color': color,
                    'opacity': opacity,
                    'name': mat_name
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
                                show_edges=getattr(self, 'show_mesh_edges', True),
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
                                show_edges=getattr(self, 'show_mesh_edges', True),
                                edge_color='white',
                                line_width=0.5,
                                name=f'material_{mat_id}'
                            )

                        layer_count += 1
                        print(f"显示材料层 {mat_id}: {mat_props['name']}, 单元数: {mat_mesh.n_cells}")

                except Exception as e:
                    print(f"显示材料{mat_id}时出错: {e}")
                    continue

            # 如果没有渲染任何材料层，回退显示整体网格，避免空场景（但开挖阶段不回退，避免土体重现）
            if layer_count == 0 and not self._is_excavation_stage():
                print("⚠️ 未显示任何材料层，回退为整体半透明显示")
                try:
                    self.plotter.add_mesh(
                        self.mesh,
                        color='#8CA3B5',
                        opacity=0.6,
                        show_edges=True,
                        edge_color='white',
                        line_width=0.5,
                        name='main_mesh'
                    )
                except Exception as e:
                    print(f"回退显示整体网格失败: {e}")
            else:
                print(f"成功显示 {layer_count} 个材料层")
        else:
            # 没有材料信息，统一半透明显示
            self.plotter.add_mesh(
                self.mesh,
                color='#8CA3B5',
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
            all_material_ids = np.unique(self.mesh.cell_data['MaterialID'])

            # 过滤材料ID：只显示当前分析步激活的材料
            if hasattr(self, 'current_active_materials') and self.current_active_materials:
                material_ids = [mid for mid in all_material_ids if mid in self.current_active_materials]
                print(f"线框模式 - 分析步过滤后的材料ID: {sorted(list(material_ids))}")
            else:
                material_ids = all_material_ids
                print(f"线框模式 - 显示所有材料ID: {sorted(list(material_ids))}")

            # 若过滤结果为空，回退显示全部材料，避免空场景
            if len(material_ids) == 0 and len(all_material_ids) > 0:
                print("⚠️ 线框模式过滤后无材料可显示，回退到显示全部材料")
                material_ids = all_material_ids

            # 在开挖阶段，剔除土体材料（可配置）
            try:
                is_excavation = self._is_excavation_stage()
                if is_excavation and getattr(self, 'hide_soil_in_excavation_stage', True):
                    before = list(material_ids)
                    material_ids = [mid for mid in material_ids if not self._is_soil_material(mid)]
                    print(f"开挖阶段剔除土体(线框): 原有{sorted(list(before))} -> 保留{sorted(list(material_ids))}")
            except Exception as _:
                pass

            # 使用材料字典中的颜色信息（健壮：属性缺失时自动回退）
            material_colors = {}
            for mat_id in material_ids:
                mat_info = self.materials.get(int(mat_id), {})
                props = mat_info.get('properties', {}) if isinstance(mat_info, dict) else {}
                mat_name = mat_info.get('name', f'Material_{mat_id}') if isinstance(mat_info, dict) else f'Material_{mat_id}'
                color = props.get('color') or self.get_material_color(int(mat_id), mat_name)
                material_colors[mat_id] = {
                    'color': color,
                    'name': mat_name
                }
            rendered_count = 0
            for mat_id in material_ids:
                try:
                    mat_mesh = self.mesh.threshold([mat_id - 0.5, mat_id + 0.5], scalars='MaterialID')
                    if mat_mesh.n_points > 0:
                        # 优先渲染外表面，避免体单元线框在某些环境下不可见
                        try:
                            surf = mat_mesh.extract_surface()
                            use_mesh = surf if surf is not None and surf.n_points > 0 else mat_mesh
                        except Exception:
                            use_mesh = mat_mesh
                        # 获取颜色和名称
                        mat_info = material_colors[mat_id]
                        color = mat_info['color']
                        name = mat_info['name']

                        actor = self.plotter.add_mesh(
                            use_mesh,
                            style='wireframe',
                            color=color,
                            line_width=2,
                            opacity=1.0,
                            name=f'wireframe_material_{mat_id}',
                            label=name
                        )
                        # 关闭正/背面剔除，避免内外表面被裁剪
                        try:
                            prop = actor.GetProperty()
                            if hasattr(prop, 'BackfaceCullingOff'):
                                prop.BackfaceCullingOff()
                            if hasattr(prop, 'FrontfaceCullingOff'):
                                prop.FrontfaceCullingOff()
                        except Exception:
                            pass
                        rendered_count += 1
                        print(f"显示材料层 {mat_id}: {name}, 线框模式, 单元数: {mat_mesh.n_cells}")
                except Exception as e:
                    print(f"线框模式显示材料{mat_id}时出错: {e}")
            # 如果未渲染任何材料，回退为整体线框显示
            if rendered_count == 0 and not self._is_excavation_stage():
                print("⚠️ 线框模式未渲染任何材料，回退为整体线框显示")
                try:
                    try:
                        surf = self.mesh.extract_surface()
                        use_mesh = surf if surf is not None and surf.n_points > 0 else self.mesh
                    except Exception:
                        use_mesh = self.mesh
                    actor = self.plotter.add_mesh(
                        use_mesh,
                        style='wireframe',
                        color='blue',
                        line_width=2,
                        opacity=1.0,
                        name='wireframe_mesh'
                    )
                    try:
                        prop = actor.GetProperty()
                        if hasattr(prop, 'BackfaceCullingOff'):
                            prop.BackfaceCullingOff()
                        if hasattr(prop, 'FrontfaceCullingOff'):
                            prop.FrontfaceCullingOff()
                    except Exception:
                        pass
                except Exception as e:
                    print(f"回退线框显示失败: {e}")
        else:
            # 统一线框显示
            try:
                surf = self.mesh.extract_surface()
                use_mesh = surf if surf is not None and surf.n_points > 0 else self.mesh
            except Exception:
                use_mesh = self.mesh
            actor = self.plotter.add_mesh(
                use_mesh,
                style='wireframe',
                color='blue',
                line_width=2,
                opacity=1.0,
                name='wireframe_mesh'
            )
            try:
                prop = actor.GetProperty()
                if hasattr(prop, 'BackfaceCullingOff'):
                    prop.BackfaceCullingOff()
                if hasattr(prop, 'FrontfaceCullingOff'):
                    prop.FrontfaceCullingOff()
            except Exception:
                pass

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
            all_material_ids = np.unique(self.mesh.cell_data['MaterialID'])

            # 过滤材料ID：只显示当前分析步激活的材料
            if hasattr(self, 'current_active_materials') and self.current_active_materials:
                material_ids = [mid for mid in all_material_ids if mid in self.current_active_materials]
                print(f"实体模式 - 分析步过滤后的材料ID: {sorted(list(material_ids))}")
                # 如果过滤后为空，进行安全回退，避免出现空白视图
                if not len(material_ids):
                    print("⚠️ 实体模式过滤后无材料可显示，回退为显示全部材料以避免视图空白")
                    material_ids = all_material_ids
            else:
                material_ids = all_material_ids
                print(f"实体模式 - 显示所有材料ID: {sorted(list(material_ids))}")

            # 若过滤结果为空，回退显示全部材料，避免空场景
            if len(material_ids) == 0 and len(all_material_ids) > 0:
                print("⚠️ 实体模式过滤后无材料可显示，回退到显示全部材料")
                material_ids = all_material_ids

            # 在开挖阶段，剔除土体材料（可配置）
            try:
                is_excavation = self._is_excavation_stage()
                if is_excavation and getattr(self, 'hide_soil_in_excavation_stage', True):
                    before = list(material_ids)
                    material_ids = [mid for mid in material_ids if not self._is_soil_material(mid)]
                    print(f"开挖阶段剔除土体(实体): 原有{sorted(list(before))} -> 保留{sorted(list(material_ids))}")
            except Exception as _:
                pass

            # 使用材料字典中的颜色信息（健壮：属性缺失时自动回退）
            material_colors = {}
            for mat_id in material_ids:
                mat_info = self.materials.get(int(mat_id), {})
                props = mat_info.get('properties', {}) if isinstance(mat_info, dict) else {}
                mat_name = mat_info.get('name', f'Material_{mat_id}') if isinstance(mat_info, dict) else f'Material_{mat_id}'
                mat_type = props.get('type', 'soil')
                color = props.get('color') or self.get_material_color(int(mat_id), mat_name)
                material_colors[mat_id] = {
                    'color': color,
                    'name': mat_name,
                    'type': mat_type
                }
            rendered_count = 0
            for mat_id in material_ids:
                try:
                    mat_mesh = self.mesh.threshold([mat_id - 0.5, mat_id + 0.5], scalars='MaterialID')
                    if mat_mesh.n_points > 0:
                        # 对体单元优先提取外表面进行渲染，避免看不到表面
                        try:
                            surf = mat_mesh.extract_surface()
                            use_mesh = surf if surf is not None and surf.n_points > 0 else mat_mesh
                        except Exception:
                            use_mesh = mat_mesh
                        # 获取颜色、名称和类型
                        mat_info = material_colors[mat_id]
                        color = mat_info['color']
                        name = mat_info['name']
                        mat_type = mat_info['type']

                        if mat_type == 'concrete':  # 结构材料
                            # 金属/混凝土效果
                            actor = self.plotter.add_mesh(
                                use_mesh,
                                color=color,
                                metallic=0.8,
                                roughness=0.2,
                                pbr=True,
                                opacity=1.0,
                                show_edges=False,
                                name=f'solid_material_{mat_id}',
                                label=name
                            )
                        else:  # 土体材料
                            # 普通实体效果
                            actor = self.plotter.add_mesh(
                                use_mesh,
                                color=color,
                                opacity=1.0,
                                show_edges=True,
                                edge_color='black',
                                line_width=0.5,
                                name=f'solid_material_{mat_id}',
                                label=name
                            )
                        # 关闭正/背面剔除，避免视点在模型内部时看不到表面
                        try:
                            prop = actor.GetProperty()
                            if hasattr(prop, 'BackfaceCullingOff'):
                                prop.BackfaceCullingOff()
                            if hasattr(prop, 'FrontfaceCullingOff'):
                                prop.FrontfaceCullingOff()
                        except Exception:
                            pass
                        rendered_count += 1
                except Exception as e:
                    print(f"实体模式显示材料{mat_id}时出错: {e}")
            # 如果未渲染任何材料，回退为整体实体显示
            if rendered_count == 0 and not self._is_excavation_stage():
                print("⚠️ 实体模式未渲染任何材料，回退为整体实体显示")
                try:
                    try:
                        surf = self.mesh.extract_surface()
                        use_mesh = surf if surf is not None and surf.n_points > 0 else self.mesh
                    except Exception:
                        use_mesh = self.mesh
                    actor = self.plotter.add_mesh(
                        use_mesh,
                        color='#8CA3B5',
                        opacity=1.0,
                        show_edges=True,
                        edge_color='black'
                    )
                    try:
                        prop = actor.GetProperty()
                        if hasattr(prop, 'BackfaceCullingOff'):
                            prop.BackfaceCullingOff()
                        if hasattr(prop, 'FrontfaceCullingOff'):
                            prop.FrontfaceCullingOff()
                    except Exception:
                        pass
                except Exception as e:
                    print(f"回退实体显示失败: {e}")
        else:
            # 统一实体显示
            try:
                surf = self.mesh.extract_surface()
                use_mesh = surf if surf is not None and surf.n_points > 0 else self.mesh
            except Exception:
                use_mesh = self.mesh
            actor = self.plotter.add_mesh(
                use_mesh,
                color='#8CA3B5',
                opacity=1.0,
                show_edges=True,
                edge_color='black'
            )
            try:
                prop = actor.GetProperty()
                if hasattr(prop, 'BackfaceCullingOff'):
                    prop.BackfaceCullingOff()
                if hasattr(prop, 'FrontfaceCullingOff'):
                    prop.FrontfaceCullingOff()
            except Exception:
                pass

    def _get_stage_prestress_element_ids(self) -> set:
        """获取当前阶段施加预应力的线单元ID集合，用于按阶段过滤锚杆显示"""
        try:
            if not hasattr(self, 'fpn_data') or not self.fpn_data:
                return set()
            if not hasattr(self, 'current_stage_index'):
                return set()
            stages = self.fpn_data.get('analysis_stages') or []
            if not (0 <= self.current_stage_index < len(stages)):
                return set()
            # 取该阶段的 group 或 ID
            stage = stages[self.current_stage_index]
            sid = stage.get('id') if isinstance(stage, dict) else None
            prestress = self.fpn_data.get('prestress_loads') or []
            eids = set()
            for it in prestress:
                grp = it.get('group')
                eid = it.get('element_id')
                # 如果解析中 group 表示阶段ID，或为空则不过滤
                if eid is None:
                    continue
                if grp is None or (sid is not None and grp == sid):
                    eids.add(int(eid))
            return eids
        except Exception:
            return set()

    def toggle_show_anchors(self, enabled: Optional[bool] = None):
        """切换锚杆(线元)显示"""
        if enabled is None:
            self.show_anchors = not self.show_anchors
        else:
            self.show_anchors = bool(enabled)
        print(f"锚杆显示: {'开' if self.show_anchors else '关'}")
        self.display_mesh()

    def _build_anchor_geometry(self):
        """从已解析的FPN数据构建锚杆线几何"""
        if not PYVISTA_AVAILABLE:
            return None
        if not hasattr(self, 'fpn_data') or not self.fpn_data:
            return None
        try:
            import pyvista as pv
            anchor_lines = []
            # 优先使用优化解析器产物
            line_elems = self.fpn_data.get('line_elements') or {}
            nodes = self.fpn_data.get('nodes') or []
            if isinstance(nodes, list):
                nid2xyz = {int(n['id']): (n['x'], n['y'], n['z']) for n in nodes if 'id' in n}
            else:
                nid2xyz = {int(k): (v['x'], v['y'], v['z']) for k, v in nodes.items()}
            if isinstance(line_elems, dict):
                for eid, le in line_elems.items():
                    n1, n2 = int(le['n1']), int(le['n2'])
                    a, b = nid2xyz.get(n1), nid2xyz.get(n2)
                    if a and b:
                        anchor_lines.append(((a[0], a[1], a[2]), (b[0], b[1], b[2])))
            # 构建合并的 PolyData
            if not anchor_lines:
                print("未发现锚杆线元可显示")
                return None
            print(f"构建锚杆几何: 共 {len(anchor_lines)} 条线元")
            # 使用多段线集合
            pdata = pv.PolyData()
            for i, (p0, p1) in enumerate(anchor_lines):
                line = pv.Line(p0, p1)
                pdata = pdata.merge(line)
            return pdata
        except Exception as e:
            print(f"构建锚杆几何失败: {e}")
            return None

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

        # 显示约束和荷载（按显示开关）
        if getattr(self, 'show_supports', True):
            self.display_constraints()
        if getattr(self, 'show_loads', True):
            self.display_loads()

    def display_analysis_stage_groups(self):
        """根据当前分析步智能显示相关的物理组"""
        if not hasattr(self, 'fpn_data') or not self.fpn_data:
            return

    def _build_plate_geometry(self):
        """从已解析的FPN数据构建板元（三角/四边形）几何"""
        if not PYVISTA_AVAILABLE:
            return None
        if not hasattr(self, 'fpn_data') or not self.fpn_data:
            return None
        try:
            import pyvista as pv
            pe = self.fpn_data.get('plate_elements') or {}
            if not pe:
                return None
            nodes = self.fpn_data.get('nodes') or []
            if isinstance(nodes, list):
                nid2xyz = {int(n['id']): (n['x'], n['y'], n['z']) for n in nodes if 'id' in n}
            else:
                nid2xyz = {int(k): (v['x'], v['y'], v['z']) for k, v in nodes.items()}

            # 组装为 PolyData：把每个面转为单独的 PolyData 再并入
            import numpy as np
            # 将所有面一次性组装为 PolyData，避免重复 merge 成本
            all_points = []
            faces = []
            for _, elem in pe.items():
                ns = [int(x) for x in elem.get('nodes', []) if x]
                if len(ns) < 3:
                    continue
                pts = [nid2xyz.get(nid) for nid in ns]
                if any(p is None for p in pts):
                    continue
                base = len(all_points)
                all_points.extend(pts)
                if len(pts) == 3:
                    faces.extend([3, base, base + 1, base + 2])
                elif len(pts) == 4:
                    faces.extend([4, base, base + 1, base + 2, base + 3])
                else:
                    # 暂不支持
                    continue
            if not all_points or not faces:
                return None
            points_np = np.array(all_points)
            faces_np = np.array(faces)
            pdata = pv.PolyData(points_np, faces_np)
            return pdata.triangulate() if pdata.n_cells > 0 else None
        except Exception as e:
            print(f"构建板元几何失败: {e}")
            return None

    def toggle_show_plates(self, enabled: Optional[bool] = None):
        """切换板元显示"""
        if enabled is None:
            self.show_plates = not self.show_plates
        else:
            self.show_plates = bool(enabled)
        print(f"板元显示: {'开' if self.show_plates else '关'}")
        self.display_mesh()


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

    def set_current_analysis_stage(self, stage_idx_or_id: int):
        """设置当前分析步（支持传入索引或ID），并立即刷新显示"""
        if not hasattr(self, 'fpn_data') or not self.fpn_data:
            print("❌ 未找到FPN数据，无法切换分析步")
            return
        analysis_stages = self.fpn_data.get('analysis_stages', [])
        if not analysis_stages:
            print("❌ 没有可用的分析步")
            return

        stage = None
        # 先按索引匹配
        if isinstance(stage_idx_or_id, int) and 0 <= stage_idx_or_id < len(analysis_stages):
            self.current_stage_index = stage_idx_or_id
            stage = analysis_stages[stage_idx_or_id]
        else:
            # 再按ID匹配
            for i, s in enumerate(analysis_stages):
                if s.get('id') == stage_idx_or_id:
                    self.current_stage_index = i
                    stage = s
                    break
        # 若仍未找到，回退第一个
        if stage is None:
            self.current_stage_index = 0
            stage = analysis_stages[0]

        self.current_stage_id = stage.get('id', self.current_stage_index)
        print(f"✅ 切换到分析步: {stage.get('name', 'Unknown')} (ID: {stage.get('id', 'N/A')}, IDX: {self.current_stage_index})")

        # 统一走更新显示逻辑，确保材料过滤实际生效
        self.update_display_for_stage(stage)

    def get_current_analysis_stage(self):
        """获取当前选择的分析步（优先按索引，其次按ID）"""
        if not hasattr(self, 'fpn_data') or not self.fpn_data:
            return None
        stages = self.fpn_data.get('analysis_stages', [])
        if not stages:
            return None
        idx = getattr(self, 'current_stage_index', None)
        if isinstance(idx, int) and 0 <= idx < len(stages):
            return stages[idx]
        sid = getattr(self, 'current_stage_id', None)
        if sid is not None:
            for s in stages:
                if s.get('id') == sid:
                    return s
        return stages[0]


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