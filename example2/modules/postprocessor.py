#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
后处理模块 - PostProcessor
负责云图显示、动画播放、详细结果展示
"""

from __future__ import annotations

import sys
import time
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional

from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QObject
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QFrame, QLabel

# 添加项目路径
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# 可选的PyVista依赖
try:
    import pyvista as pv
    from pyvistaqt import QtInteractor
    PYVISTA_AVAILABLE = True
except Exception:
    PYVISTA_AVAILABLE = False

# 可选的滚动图例面板
try:
    from example2.gui.widgets.material_legend import MaterialLegendPanel  # type: ignore
except Exception:
    MaterialLegendPanel = None  # type: ignore


class AnimationController(QObject):
    frame_changed = pyqtSignal(int)
    animation_finished = pyqtSignal()

    def __init__(self, total_frames: int = 100):
        super().__init__()
        self.total_frames = total_frames
        self.current_frame = 0
        self.is_playing = False
        self.is_looping = True
        self.frame_rate = 10  # FPS
        self.timer = QTimer()
        self.timer.timeout.connect(self.next_frame)

    def play(self):
        if not self.is_playing:
            self.is_playing = True
            self.timer.start(int(1000 / max(1, self.frame_rate)))

    def pause(self):
        self.is_playing = False
        self.timer.stop()

    def stop(self):
        self.is_playing = False
        self.timer.stop()
        self.current_frame = 0
        self.frame_changed.emit(self.current_frame)

    def next_frame(self):
        self.current_frame += 1
        if self.current_frame >= self.total_frames:
            if self.is_looping:
                self.current_frame = 0
            else:
                self.pause()
                self.animation_finished.emit()
                return
        self.frame_changed.emit(self.current_frame)

    def set_frame(self, frame: int):
        if 0 <= frame < self.total_frames:
            self.current_frame = frame
            self.frame_changed.emit(self.current_frame)

    def set_frame_rate(self, fps: int):
        self.frame_rate = max(1, min(int(fps), 60))
        if self.is_playing:
            self.timer.setInterval(int(1000 / self.frame_rate))


class PostProcessor:
    """后处理模块"""

    def __init__(self):
        # 数据
        self.mesh = None
        self.results_data: Dict[str, Any] = {}
        self.time_steps: List[float] = []
        self.current_time_step = 0

        # 视图
        self.plotter = None
        self.viewer_widget: Optional[QWidget] = None

        # 显示设置
        self.show_deformed = True
        self.deformation_scale = 10.0
        self.show_contour = True
        self.show_wireframe = False
        self.current_result_type = 'displacement'
        self.current_component = 'magnitude'
        self.use_stage_visible_filter = False

        # 图例/指标
        self.show_material_legend = True
        self._legend_actor_name = 'material_legend'
        self._metrics_actor_name = 'post_metrics_overlay'
        self._legend_panel = None
        self.last_render_ms = 0.0

        # 动画
        self.animation_controller = AnimationController()
        self.animation_controller.frame_changed.connect(self.update_animation_frame)

        self.create_viewer_widget()

    # ---------- UI构建 ----------
    def _attach_legend_panel(self) -> None:
        try:
            if MaterialLegendPanel is None:
                return
            host = self.viewer_widget
            if host is None:
                return
            self._legend_panel = MaterialLegendPanel(host)
            self._legend_panel.attach(host)
            self._legend_panel.show_panel(bool(self.show_material_legend))
        except Exception:
            self._legend_panel = None

    def create_viewer_widget(self) -> None:
        self.viewer_widget = QWidget()
        layout = QVBoxLayout(self.viewer_widget)
        layout.setContentsMargins(0, 0, 0, 0)

        if PYVISTA_AVAILABLE:
            try:
                self.plotter = QtInteractor(self.viewer_widget)
                self.plotter.setMinimumSize(600, 400)
                self.setup_default_scene()
                layout.addWidget(self.plotter.interactor)
                self._attach_legend_panel()
            except Exception:
                self.plotter = None
                placeholder = QFrame()
                placeholder.setFrameStyle(QFrame.StyledPanel)
                placeholder.setMinimumSize(600, 400)
                placeholder.setStyleSheet(
                    "QFrame { background-color: #f8f9fa; border: 2px dashed #9C27B0; border-radius: 8px; }"
                )
                label = QLabel("3D后处理视图不可用（OpenGL失败）\n已切换为占位视图")
                label.setAlignment(Qt.AlignCenter)
                label.setStyleSheet("color: #9C27B0; font-size: 16px; font-weight: bold;")
                pl = QVBoxLayout(placeholder)
                pl.addWidget(label)
                layout.addWidget(placeholder)
        else:
            placeholder = QFrame()
            placeholder.setFrameStyle(QFrame.StyledPanel)
            placeholder.setMinimumSize(600, 400)
            placeholder.setStyleSheet(
                "QFrame { background-color: #f8f9fa; border: 2px dashed #9C27B0; border-radius: 8px; }"
            )
            label = QLabel("PyVista不可用\n后处理可视化占位符")
            label.setAlignment(Qt.AlignCenter)
            label.setStyleSheet("color: #9C27B0; font-size: 16px; font-weight: bold;")
            pl = QVBoxLayout(placeholder)
            pl.addWidget(label)
            layout.addWidget(placeholder)

    def setup_default_scene(self) -> None:
        if not PYVISTA_AVAILABLE:
            return
        self.plotter.set_background('white', top='lightgray')
        self.plotter.show_axes()
        self.plotter.camera_position = 'iso'
        self.show_welcome_info()

    def show_welcome_info(self) -> None:
        if not PYVISTA_AVAILABLE:
            return
        self.plotter.add_text(
            "DeepCAD后处理模块\n等待加载结果...",
            position='upper_left', font_size=12, color='purple'
        )

    def get_viewer_widget(self) -> Optional[QWidget]:
        return self.viewer_widget

    # ---------- 颜色/图例 ----------
    def _get_soil_palette(self) -> Dict[int, Any]:
        try:
            from example2.gui.resources.styles.colors import SOIL_PALETTE
            return SOIL_PALETTE  # type: ignore
        except Exception:
            return {
                1: (141, 110, 99),
                2: (161, 136, 127),
                3: (188, 170, 164),
                4: (215, 204, 200),
                5: (62, 39, 35),
                6: (93, 64, 55),
                7: (121, 85, 72),
                8: (109, 87, 76),
                9: (109, 76, 65),
                10: (78, 52, 46),
            }

    def _material_color_rgb(self, material_id: int) -> tuple:
        palette = self._get_soil_palette()
        if isinstance(material_id, (np.integer,)):
            material_id = int(material_id)
        if material_id in palette:
            rgb = palette[material_id]
            if isinstance(rgb, str) and rgb.startswith('#') and len(rgb) == 7:
                r = int(rgb[1:3], 16); g = int(rgb[3:5], 16); b = int(rgb[5:7], 16)
                return (r, g, b)
            if isinstance(rgb, (list, tuple)) and len(rgb) >= 3:
                return (int(rgb[0]), int(rgb[1]), int(rgb[2]))
        mid = (abs(int(material_id)) % 12) / 12.0
        h = 30/360.0 + 0.1 * mid
        s = 0.35 + 0.25 * ((int(material_id) % 3) / 2.0)
        v = 0.65
        import colorsys
        r, g, b = colorsys.hsv_to_rgb(h, s, v)
        return (int(r*255), int(g*255), int(b*255))

    def _compute_cell_rgb_colors(self, mesh) -> Optional[np.ndarray]:
        try:
            if hasattr(mesh, 'cell_data') and 'MaterialID' in mesh.cell_data:
                mat_ids = np.array(mesh.cell_data['MaterialID']).astype(int)
                colors = np.zeros((len(mat_ids), 3), dtype=np.uint8)
                for i, mid in enumerate(mat_ids):
                    colors[i] = np.array(self._material_color_rgb(int(mid)), dtype=np.uint8)
                return colors
        except Exception as e:
            print(f"计算单元颜色失败: {e}")
        return None

    def _update_legend_panel_from_mesh(self, mesh) -> None:
        try:
            if self._legend_panel is None or not self.show_material_legend:
                return
            if not hasattr(mesh, 'cell_data') or 'MaterialID' not in mesh.cell_data:
                self._legend_panel.show_panel(False)
                return
            mat_ids = np.array(mesh.cell_data['MaterialID']).astype(int)
            uids, counts = np.unique(mat_ids, return_counts=True)
            items = []
            for mid, cnt in zip(uids.tolist(), counts.tolist()):
                items.append({
                    'id': int(mid),
                    'name': f'材料 {int(mid)}',
                    'count': int(cnt),
                    'color': self._material_color_rgb(int(mid)),
                })
            try:
                items.sort(key=lambda x: int(x.get('id', 0)))
            except Exception:
                pass
            self._legend_panel.set_items(items)
            self._legend_panel.show_panel(True)
        except Exception:
            pass

    def _draw_material_legend(self, mesh) -> None:
        if not (PYVISTA_AVAILABLE and self.plotter and self.show_material_legend):
            return
        try:
            try:
                self.plotter.remove_legend()
            except Exception:
                pass
            if not hasattr(mesh, 'cell_data') or 'MaterialID' not in mesh.cell_data:
                return
            mat_ids = np.array(mesh.cell_data['MaterialID']).astype(int)
            unique_ids, counts = np.unique(mat_ids, return_counts=True)
            if self._legend_panel is not None:
                return
            labels = []
            max_items = 12
            for idx, mid in enumerate(unique_ids):
                if idx >= max_items:
                    break
                rgb = self._material_color_rgb(int(mid))
                label = f"材料 {int(mid)} ({int(counts[idx])})"
                labels.append((label, rgb))
            remaining = len(unique_ids) - len(labels)
            if remaining > 0:
                labels.append((f"+{remaining} 更多", (180, 180, 180)))
            if labels:
                self.plotter.add_legend(labels=labels, bcolor=(255, 255, 255), border=True)
        except Exception as e:
            print(f"绘制材料图例失败: {e}")

    # ---------- 数据/加载 ----------
    def set_analysis_results(self, model_data: Dict[str, Any], results: Dict[str, Any]) -> None:
        try:
            nodes = model_data.get('nodes', [])
            elements = model_data.get('elements', [])
            if not nodes or not elements:
                return
            if PYVISTA_AVAILABLE:
                self.mesh = self.create_mesh_from_model(nodes, elements)
                if 'displacement_field' in results:
                    displacement = np.array(results['displacement_field'])
                    if displacement.shape[0] == self.mesh.n_points:
                        self.time_steps = [0]
                        self.current_time_step = 0
                        self.results_data = {
                            0: {
                                'displacement': displacement,
                                'stress': np.array(results.get('stress_field', [])) if 'stress_field' in results else None,
                            }
                        }
                        self.display_results()
        except Exception as e:
            print(f"设置分析结果失败: {e}")

    def create_mesh_from_model(self, nodes: List[Dict], elements: List[Dict]):
        points = []
        for node in nodes:
            if isinstance(node, dict):
                x = node.get('x', 0.0)
                y = node.get('y', 0.0)
                z = node.get('z', 0.0)
                points.append([x, y, z])
        points = np.array(points)
        cells = []
        cell_types = []
        for element in elements:
            if isinstance(element, dict):
                connectivity = element.get('nodes', [])
                element_type = element.get('type', 'tetra')
                if len(connectivity) >= 3:
                    conn = [max(0, int(n) - 1) for n in connectivity if isinstance(n, (int, str))]
                    if element_type == 'tetra' and len(conn) == 4:
                        cells.extend([4] + conn)  # VTK_TETRA = 10
                        cell_types.append(10)
                    elif element_type == 'hexa' and len(conn) == 8:
                        cells.extend([8] + conn)  # VTK_HEXAHEDRON = 12
                        cell_types.append(12)
                    elif len(conn) >= 3:
                        cells.extend([len(conn)] + conn)
                        cell_types.append(5 if len(conn) == 3 else 9)
        if cells:
            mesh = pv.UnstructuredGrid(cells, np.array(cell_types), points)
        else:
            mesh = pv.PolyData(points)
        return mesh

    def load_results(self, file_path: str) -> None:
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"文件不存在: {file_path}")
            if PYVISTA_AVAILABLE:
                if file_path.suffix.lower() in ['.vtk', '.vtu', '.vtp']:
                    self.mesh = pv.read(str(file_path))
                    self.extract_results_from_mesh()
                elif file_path.suffix.lower() == '.json':
                    self.load_json_results(str(file_path))
                else:
                    raise ValueError(f"不支持的文件格式: {file_path.suffix}")
                self.display_results()
            else:
                raise ValueError("真实计算结果不可用")
        except Exception as e:
            print(f"加载结果失败: {e}")
            raise ValueError(f"加载真实结果失败: {e}")

    def load_json_results(self, file_path: str) -> None:
        import json
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if 'results' in data:
            self.results_data = data['results']
        if 'time_steps' in data:
            self.time_steps = data['time_steps']
        else:
            self.time_steps = [0.0]
        if not self.mesh:
            raise ValueError("缺少网格数据，无法加载结果")

    def extract_results_from_mesh(self) -> None:
        if not self.mesh:
            return
        point_arrays = self.mesh.point_data
        for name, data in point_arrays.items():
            low = name.lower()
            if low in ['displacement', 'displacements']:
                self.results_data['displacement'] = data
            elif low in ['stress', 'stresses']:
                self.results_data['stress'] = data
            elif low in ['strain', 'strains']:
                self.results_data['strain'] = data
        if not self.time_steps:
            self.time_steps = [1.0]

    # ---------- 显示 ----------
    def display_results(self) -> None:
        if not PYVISTA_AVAILABLE or not self.mesh:
            return
        if self.plotter is None:
            return
        try:
            self.plotter.clear()
            self.setup_default_scene()
        except Exception as e:
            print(f"刷新渲染器失败: {e}")
            return

        current_data = self.get_current_time_step_data()
        mesh_to_plot = self.mesh.copy()

        if self.show_deformed and 'displacement' in current_data:
            displacement = current_data['displacement']
            if hasattr(displacement, 'shape') and displacement.shape[1] == 3:
                deformed_points = mesh_to_plot.points + displacement * self.deformation_scale
                mesh_to_plot.points = deformed_points

        scalar_field = None
        scalar_name = ""
        if self.show_contour:
            if self.current_result_type == 'displacement' and 'displacement' in current_data:
                displacement = current_data['displacement']
                if self.current_component == 'magnitude':
                    scalar_field = np.linalg.norm(displacement, axis=1)
                    scalar_name = "位移大小 (mm)"
                elif self.current_component == 'x':
                    scalar_field = displacement[:, 0]
                    scalar_name = "X位移 (mm)"
                elif self.current_component == 'y':
                    scalar_field = displacement[:, 1]
                    scalar_name = "Y位移 (mm)"
                elif self.current_component == 'z':
                    scalar_field = displacement[:, 2]
                    scalar_name = "Z位移 (mm)"
            elif self.current_result_type == 'stress' and 'stress' in current_data:
                scalar_field = current_data['stress']
                scalar_name = "应力 (kPa)"
            elif self.current_result_type == 'strain' and 'strain' in current_data:
                scalar_field = current_data['strain']
                scalar_name = "应变"

        if scalar_field is not None and scalar_name:
            mesh_to_plot[scalar_name] = scalar_field
        try:
            if self._legend_panel is not None and self.show_contour:
                self._legend_panel.show_panel(False)
        except Exception:
            pass

        if self.use_stage_visible_filter and 'StageVisible' in mesh_to_plot.cell_data:
            try:
                mask = np.array(mesh_to_plot.cell_data['StageVisible']).astype(bool)
                mesh_to_plot = mesh_to_plot.extract_cells(mask)
            except Exception as e:
                print(f"StageVisible过滤失败: {e}")

        try:
            type_map = getattr(self, 'material_type_map', None)
            if type_map and hasattr(mesh_to_plot, 'cell_data') and 'MaterialID' in mesh_to_plot.cell_data:
                show_types = set()
                parent = None
                if hasattr(self, 'parent') and callable(getattr(self, 'parent')):
                    parent = self.parent()
                if parent and hasattr(parent, 'show_soil_cb'):
                    if parent.show_soil_cb.isChecked():
                        show_types.add('soil')
                    if parent.show_concrete_cb.isChecked():
                        show_types.add('concrete')
                    if parent.show_steel_cb.isChecked():
                        show_types.add('steel')
                if show_types:
                    mat_ids = np.array(mesh_to_plot.cell_data['MaterialID']).astype(int)
                    mask = np.array([type_map.get(int(mid)) in show_types for mid in mat_ids])
                    mesh_to_plot = mesh_to_plot.extract_cells(mask)
        except Exception as e:
            print(f"后处理按part过滤失败: {e}")

        _t0 = time.time()
        if scalar_field is not None and self.show_contour:
            colormap = self.get_professional_colormap(self.current_result_type)
            scalar_bar_args = {
                'title': scalar_name,
                'title_font_size': 14,
                'label_font_size': 12,
                'n_labels': 8,
                'italic': False,
                'fmt': '%.3f',
                'font_family': 'arial',
                'shadow': True,
                'width': 0.08,
                'height': 0.75,
                'position_x': 0.9,
                'position_y': 0.125,
                'color': 'black',
                'background_color': 'white',
            }
            self.plotter.add_mesh(
                mesh_to_plot,
                scalars=scalar_name,
                cmap=colormap,
                show_edges=self.show_wireframe,
                edge_color='black' if self.show_wireframe else None,
                show_scalar_bar=True,
                scalar_bar_args=scalar_bar_args,
                opacity=0.9,
            )
            try:
                self.plotter.remove_legend()
            except Exception:
                pass
        else:
            representation = 'wireframe' if self.show_wireframe else 'surface'
            colors = self._compute_cell_rgb_colors(mesh_to_plot)
            if colors is not None:
                try:
                    self.plotter.add_mesh(
                        mesh_to_plot,
                        scalars=colors,
                        rgb=True,
                        preference='cell',
                        show_edges=True,
                        edge_color='black',
                        opacity=0.9,
                        representation=representation,
                    )
                    self._draw_material_legend(mesh_to_plot)
                    self._update_legend_panel_from_mesh(mesh_to_plot)
                except Exception:
                    self.plotter.add_mesh(
                        mesh_to_plot,
                        show_edges=True,
                        edge_color='black',
                        color='lightblue',
                        opacity=0.8,
                        representation=representation,
                    )
            else:
                self.plotter.add_mesh(
                    mesh_to_plot,
                    show_edges=True,
                    edge_color='black',
                    color='lightblue',
                    opacity=0.8,
                    representation=representation,
                )

        info_text = self.get_display_info()
        self.plotter.add_text(info_text, position='upper_right', font_size=10, color='blue')
        try:
            self.last_render_ms = (time.time() - _t0) * 1000.0
        except Exception:
            self.last_render_ms = 0.0
        self._draw_metrics_overlay()
        self.plotter.reset_camera()

    def _draw_metrics_overlay(self) -> None:
        try:
            ms = float(getattr(self, 'last_render_ms', 0.0) or 0.0)
            fps = 0.0 if ms <= 0 else 1000.0 / ms
            npts = self.mesh.n_points if self.mesh is not None else 0
            ncells = self.mesh.n_cells if self.mesh is not None else 0
            txt = f"FPS: {fps:.1f}\nMesh: {npts} / {ncells}"
            self.plotter.add_text(txt, position='lower_right', font_size=10, color='black')
        except Exception:
            pass

    def update_animation_frame(self, frame: int) -> None:
        """动画帧更新回调"""
        try:
            if not self.time_steps:
                return
            idx = int(frame) % max(1, len(self.time_steps))
            if idx != self.current_time_step:
                self.current_time_step = idx
                self.display_results()
        except Exception:
            pass

    def get_current_time_step_data(self) -> Dict[str, np.ndarray]:
        current_data: Dict[str, np.ndarray] = {}
        if 'displacement_time' in self.results_data:
            current_data['displacement'] = self.results_data['displacement_time'][self.current_time_step]
        elif 'displacement' in self.results_data:
            current_data['displacement'] = self.results_data['displacement']
        if 'stress_time' in self.results_data:
            current_data['stress'] = self.results_data['stress_time'][self.current_time_step]
        elif 'stress' in self.results_data:
            current_data['stress'] = self.results_data['stress']
        if 'strain_time' in self.results_data:
            current_data['strain'] = self.results_data['strain_time'][self.current_time_step]
        elif 'strain' in self.results_data:
            current_data['strain'] = self.results_data['strain']
        if not current_data and self.current_time_step in self.results_data:
            return self.results_data[self.current_time_step]
        return current_data

    def get_professional_colormap(self, result_type: str) -> str:
        colormap_mapping = {
            'displacement': 'rainbow',
            'stress': 'plasma',
            'strain': 'viridis',
            'pressure': 'coolwarm',
            'temperature': 'hot',
            'velocity': 'jet',
        }
        return colormap_mapping.get(result_type, 'rainbow')

    def get_display_info(self) -> str:
        if not self.mesh:
            return "无结果数据"
        info_lines = [
            f"节点数: {self.mesh.n_points}",
            f"单元数: {self.mesh.n_cells}",
        ]
        if self.time_steps:
            current_time = self.time_steps[self.current_time_step]
            info_lines.append(f"时间: {current_time:.3f}s")
            info_lines.append(f"步骤: {self.current_time_step + 1}/{len(self.time_steps)}")
        if self.show_deformed:
            info_lines.append(f"变形比例: {self.deformation_scale:.1f}x")
        return "\n".join(info_lines)

    # ---------- 交互 ----------
    def set_result_type(self, result_type: str) -> None:
        self.current_result_type = result_type
        self.display_results()

    def set_component(self, component: str) -> None:
        self.current_component = component
        self.display_results()

    def set_time_step(self, time_step: int) -> None:
        if 0 <= time_step < len(self.time_steps):
            self.current_time_step = time_step
            self.display_results()

    def set_deformation_scale(self, scale: float) -> None:
        self.deformation_scale = float(scale)
        if self.show_deformed:
            self.display_results()

    def set_show_deformed(self, show: bool) -> None:
        self.show_deformed = bool(show)
        self.display_results()

    def set_show_contour(self, show: bool) -> None:
        self.show_contour = bool(show)
        self.display_results()

    def set_show_wireframe(self, show: bool) -> None:
        self.show_wireframe = bool(show)
        self.display_results()

    def set_show_material_legend(self, enabled: bool):
        self.show_material_legend = bool(enabled)
        if PYVISTA_AVAILABLE and self.plotter:
            try:
                self.plotter.remove_legend()
            except Exception:
                pass
            try:
                if self._legend_panel is not None:
                    self._legend_panel.show_panel(self.show_material_legend)
            except Exception:
                pass
            self.display_results()

    # ---------- 导出 ----------
    def export_screenshot(self, file_path: str) -> None:
        if PYVISTA_AVAILABLE and self.plotter:
            self.plotter.screenshot(file_path)

    def export_animation(self, output_dir: str, format: str = 'gif') -> None:
        if not PYVISTA_AVAILABLE or len(self.time_steps) <= 1:
            return
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        frame_files = []
        for i, _ in enumerate(self.time_steps):
            self.current_time_step = i
            self.display_results()
            frame_file = output_dir / f"frame_{i:04d}.png"
            self.plotter.screenshot(str(frame_file))
            frame_files.append(frame_file)
        if format == 'gif':
            self.create_gif_from_frames(frame_files, output_dir / "animation.gif")

    def play_animation(self) -> None:
        """播放动画（基于时间步）"""
        try:
            n = len(self.time_steps)
            if n <= 1:
                return
            self.animation_controller.total_frames = n
            self.animation_controller.play()
        except Exception:
            pass

    def pause_animation(self) -> None:
        try:
            self.animation_controller.pause()
        except Exception:
            pass

    def stop_animation(self) -> None:
        """停止动画并重置到第0帧"""
        try:
            self.animation_controller.stop()
            self.current_time_step = 0
            self.display_results()
        except Exception:
            pass

    def create_gif_from_frames(self, frame_files: List[Path], output_file: Path) -> None:
        try:
            from PIL import Image
            images = [Image.open(f) for f in frame_files]
            images[0].save(output_file, save_all=True, append_images=images[1:], duration=100, loop=0)
            for f in frame_files:
                try:
                    f.unlink()
                except Exception:
                    pass
        except Exception as e:
            print(f"创建GIF失败: {e}")

    def export_data(self, file_path: str) -> None:
        import json
        export_data = {
            'mesh_info': {
                'n_points': self.mesh.n_points if self.mesh else 0,
                'n_cells': self.mesh.n_cells if self.mesh else 0,
                'bounds': list(self.mesh.bounds) if self.mesh else [],
            },
            'time_steps': self.time_steps,
            'results_types': list(self.results_data.keys()),
            'current_settings': {
                'result_type': self.current_result_type,
                'component': self.current_component,
                'deformation_scale': self.deformation_scale,
                'show_deformed': self.show_deformed,
                'show_contour': self.show_contour,
            },
        }
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)

    def reset_view(self) -> None:
        if PYVISTA_AVAILABLE and self.plotter:
            self.plotter.reset_camera()

    # ---------- Demo/测试 ----------
    def create_sample_results(self) -> None:
        """创建示例网格与结果，便于本地手动测试"""
        if not PYVISTA_AVAILABLE:
            return
        try:
            # 创建一个规则网格
            grid = pv.UniformGrid()
            grid.dimensions = (10, 10, 10)
            grid.spacing = (1.0, 1.0, 1.0)
            grid.origin = (0.0, 0.0, 0.0)

            # 转换为表面以减少渲染负担
            mesh = grid.extract_surface().triangulate()

            # 人为设置MaterialID（按cell）
            n_cells = mesh.n_cells
            mat_ids = np.random.randint(1, 6, size=n_cells).astype(np.int32)
            mesh.cell_data['MaterialID'] = mat_ids

            # 绑定
            self.mesh = mesh

            # 生成位移随时间变化（按点）
            n_pts = self.mesh.n_points
            n_steps = 20
            self.time_steps = [float(i) for i in range(n_steps)]
            base = self.mesh.points.copy()
            disp_time = []
            for t in range(n_steps):
                phase = 2 * np.pi * (t / n_steps)
                dx = 0.05 * np.sin(base[:, 0] * 0.3 + phase)
                dy = 0.05 * np.cos(base[:, 1] * 0.3 + phase)
                dz = 0.05 * np.sin(base[:, 2] * 0.3 + phase)
                disp = np.column_stack([dx, dy, dz]).astype(np.float32)
                disp_time.append(disp)
            # 存入results
            self.results_data = {
                'displacement_time': disp_time,
            }
            self.current_time_step = 0
            self.display_results()
        except Exception as e:
            print(f"创建示例结果失败: {e}")


# 测试函数
def test_postprocessor():
    """测试后处理模块"""
    from PyQt6.QtWidgets import QApplication
    from PyQt6.QtCore import QTimer
    
    app = QApplication(sys.argv)
    
    # 创建后处理器
    postprocessor = PostProcessor()
    
    # 获取视图组件
    viewer = postprocessor.get_viewer_widget()
    viewer.setWindowTitle("后处理模块测试")
    viewer.resize(800, 600)
    viewer.show()
    
    # 创建示例结果
    postprocessor.create_sample_results()
    
    # 设置不同的显示选项
    postprocessor.set_result_type('displacement')
    postprocessor.set_component('magnitude')
    postprocessor.set_deformation_scale(20.0)
    
    # 5秒后播放动画
    QTimer.singleShot(3000, postprocessor.play_animation)
    
    sys.exit(app.exec())


if __name__ == "__main__":
    test_postprocessor()