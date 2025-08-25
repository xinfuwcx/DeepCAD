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

# 共享的岩土配色资源（可选）
try:
    from example2.gui.resources.styles.colors import SOIL_PALETTE  # type: ignore
except Exception:
    SOIL_PALETTE = None  # 回退到内置映射

# 可滚动材料图例面板（可选）
try:
    from example2.gui.widgets.material_legend import MaterialLegendPanel  # type: ignore
except Exception:
    MaterialLegendPanel = None  # 运行时可能不可用

# PyVista/pyvistaqt 可选（不影响其它功能）
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
    def __init__(self, auto_load_demo: bool = False) -> None:
        # 数据/网格占位（由外部加载器赋值）
        self.fpn_data: Optional[Dict[str, Any]] = None
        self.mesh = None  # PyVista网格或其它占位

        # 结构数据容器（兼容调用方旧接口）
        self.constraints: list = []
        self.loads: list = []
        self.materials: Dict[int, Any] = {}
        self.boundaries: list = []

        # 禁用自动加载标志
        self.auto_load_demo = auto_load_demo

        # UI/渲染组件
        self.viewer_widget: Optional[QWidget] = None
        self.plotter = None

        # 显示状态
        self.display_mode: str = 'transparent'  # transparent|wireframe|solid - 默认半透明显示
        self.show_plates: bool = False
        self.show_anchors: bool = False
        self.filter_anchors_by_stage: bool = False  # 预应力锚杆阶段过滤开关（默认关）
        
        # 🔧 修复：添加缺失的工程构件显示标志
        self.show_soil: bool = True
        self.show_diaphragm_wall: bool = True
        self.show_piles: bool = True
        self.show_strutting: bool = True
        self.show_mesh_edges: bool = False
        self.show_nodes: bool = False
        self.show_supports: bool = False
        self.show_loads: bool = False

        # 缓存的几何（避免频繁重建）
        self._plates_cached = None  # pv.PolyData or None
        self._anchors_cached = None  # pv.PolyData or None

        # 渲染锁（防止频繁刷新导致卡死）
        self._rendering: bool = False

        # 视口叠加：材料图例与性能指标
        self.show_material_legend: bool = False
        self.last_render_ms: float = 0.0
        self._metrics_actor_names = {'legend': 'material_legend', 'metrics': 'metrics_overlay'}
        self._legend_panel = None

        # 创建/配置视图（轻量级模式）
        self.create_viewer_widget()
        
    # ---------- 识别/分类辅助 ----------
    def _get_material_ids_by_keywords(self, keywords: List[str]) -> List[int]:
        """根据材料名称中的关键字查找材料ID（兼容中文/英文）。
        - keywords: 关键字列表，例如 ['地连墙','围护墙','diaphragm']
        返回匹配的材料ID列表（去重，升序）。
        """
        mids: List[int] = []
        try:
            if not self.fpn_data:
                return mids
            mats = self.fpn_data.get('materials') or {}
            if isinstance(mats, dict):
                for k, v in mats.items():
                    try:
                        name = str(v.get('name', '')).lower()
                        if not name:
                            continue
                        # 支持中文匹配：同时用原字符串做一次包含判断
                        raw_name = str(v.get('name', ''))
                        for kw in keywords:
                            if kw.lower() in name or kw in raw_name:
                                try:
                                    mids.append(int(k))
                                    break
                                except Exception:
                                    pass
                    except Exception:
                        continue
        except Exception:
            pass
        # 去重排序
        try:
            mids = sorted(list({int(x) for x in mids}))
        except Exception:
            pass
        return mids

    # ---------- 视图 ----------
    def create_viewer_widget(self) -> QWidget:
        """创建3D视图组件（增强OpenGL错误恢复）"""
        self.viewer_widget = QWidget()
        layout = QVBoxLayout(self.viewer_widget)
        layout.setContentsMargins(0, 0, 0, 0)

        if PYVISTA_AVAILABLE:
            try:
                # 增强OpenGL兼容性设置
                import pyvista as pv
                
                # 多级PyVista初始化尝试
                success = False
                
                # 尝试1：轻量级模式（降低内存占用）
                try:
                    from pyvistaqt import QtInteractor
                    
                    # 强制设置环境变量确保软件渲染（降低GPU占用）
                    import os
                    os.environ['PYVISTA_OFF_SCREEN'] = 'false'
                    os.environ['MESA_GL_VERSION_OVERRIDE'] = '3.3'
                    os.environ['PYVISTA_USE_PANEL'] = 'false'  # 禁用面板，降低内存
                    
                    # 轻量级初始化（禁用深度缓冲和多重采样）
                    self.plotter = QtInteractor(
                        self.viewer_widget, 
                        auto_update=False,  # 禁用自动更新
                        lighting='none'     # 禁用光照计算
                    )
                    self.plotter.setMinimumSize(480, 360)  # 更小的最小尺寸
                    layout.addWidget(self.plotter.interactor)

                    # 立即设置轻量级背景
                    self.setup_lightweight_scene()
                    # 挂载图例面板（如可用）
                    self._attach_legend_panel(layout)
                    success = True
                    print("✅ PyVista 3D视图初始化成功（轻量级模式）")
                    
                except Exception as e1:
                    print(f"标准模式失败: {e1}")
                    
                    # 尝试2：强制软件渲染
                    try:
                        import os
                        os.environ['PYVISTA_USE_PANEL'] = 'false'
                        os.environ['QT_QUICK_BACKEND'] = 'software'
                        
                        self.plotter = QtInteractor(self.viewer_widget, auto_update=False)
                        self.plotter.setMinimumSize(640, 480)
                        layout.addWidget(self.plotter.interactor)
                        
                        # 设置Abaqus背景
                        self.setup_safe_scene()
                        self._attach_legend_panel(layout)
                        success = True
                        print("✅ PyVista 3D视图初始化成功（软件渲染模式）")
                        
                    except Exception as e2:
                        print(f"软件渲染模式失败: {e2}")
                        
                        # 尝试3：最小化配置
                        try:
                            # 最后尝试最小配置
                            self.plotter = QtInteractor(self.viewer_widget, lighting='none')
                            layout.addWidget(self.plotter.interactor)
                            
                            # 只设置背景色
                            self.plotter.set_background([0.45, 0.5, 0.65])  # Abaqus中性蓝灰色
                            self._attach_legend_panel(layout)
                            success = True
                            print("✅ PyVista 3D视图初始化成功（最小模式）")
                            
                        except Exception as e3:
                            print(f"最小模式也失败: {e3}")
                            success = False
                            
                if not success:
                    print("所有PyVista初始化尝试都失败，创建Abaqus风格占位视图")
                    self._create_abaqus_style_placeholder(layout)

            except ImportError as e:
                print(f"PyVista导入失败: {e}")
                self._create_enhanced_placeholder(layout, "PyVista不可用")
        else:
            self._create_enhanced_placeholder(layout, "PyVista未安装")

        return self.viewer_widget

    def _attach_legend_panel(self, layout: QVBoxLayout) -> None:
        """在3D视口上方附加可滚动图例面板（如果组件可用）"""
        try:
            if MaterialLegendPanel is None:
                return
            host = self.viewer_widget if hasattr(self, 'viewer_widget') else None
            if host is None:
                return
            self._legend_panel = MaterialLegendPanel(host)
            self._legend_panel.attach(host)
            self._legend_panel.show_panel(bool(self.show_material_legend))
        except Exception:
            self._legend_panel = None

    def _create_enhanced_placeholder(self, layout: QVBoxLayout, error_msg: str = "3D视图不可用") -> None:
        """创建增强的占位符（显示错误信息和解决方案）"""
        placeholder = QFrame()
        placeholder.setFrameStyle(QFrame.Shape.StyledPanel)
        placeholder.setMinimumSize(640, 480)
        placeholder.setStyleSheet("""
            QFrame {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 #f8f9fa, stop:1 #e9ecef);
                border: 1px solid #dee2e6;
                border-radius: 8px;
            }
        """)
        
        placeholder_layout = QVBoxLayout(placeholder)
        placeholder_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        # 错误信息标题
        title_label = QLabel("🔧 3D视图诊断")
        title_label.setStyleSheet("color: #6c757d; font-size: 16px; font-weight: bold; margin-bottom: 10px;")
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        placeholder_layout.addWidget(title_label)
        
        # 详细错误信息
        error_label = QLabel(error_msg)
        error_label.setStyleSheet("color: #6c757d; font-size: 14px; margin-bottom: 15px;")
        error_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        error_label.setWordWrap(True)
        placeholder_layout.addWidget(error_label)
        
        # 解决方案建议
        solution_text = """
        💡 可能的解决方案：
        • 重启应用程序
        • 更新显卡驱动
        • 检查PyVista安装：pip install pyvista
        • 使用软件渲染模式（已自动启用）
        """
        solution_label = QLabel(solution_text)
        solution_label.setStyleSheet("color: #495057; font-size: 12px; background-color: rgba(255, 255, 255, 0.7); padding: 10px; border-radius: 6px;")
        solution_label.setAlignment(Qt.AlignmentFlag.AlignLeft)
        placeholder_layout.addWidget(solution_label)
        
        # 功能说明
        info_label = QLabel("✨ 网格导入、材料设置、分析计算等功能不受影响")
        info_label.setStyleSheet("color: #28a745; font-size: 12px; font-weight: bold; margin-top: 10px;")
        info_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        placeholder_layout.addWidget(info_label)
        
        layout.addWidget(placeholder)

    def _create_abaqus_style_placeholder(self, layout: QVBoxLayout) -> None:
        """创建Abaqus风格的占位视图（美观的渐变背景）"""
        placeholder = QFrame()
        placeholder.setFrameStyle(QFrame.Shape.NoFrame)
        placeholder.setMinimumSize(640, 480)
        
        # Abaqus经典渐变：从底部银灰色到顶部深蓝色
        placeholder.setStyleSheet("""
            QFrame {
                background: qlineargradient(x1:0, y1:1, x2:0, y2:0,
                    stop:0 rgb(217, 217, 230),
                    stop:0.3 rgb(180, 185, 200),
                    stop:0.7 rgb(120, 130, 150),
                    stop:1 rgb(25, 51, 102));
                border: 1px solid #808080;
            }
        """)
        
        placeholder_layout = QVBoxLayout(placeholder)
        placeholder_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        # Abaqus风格的状态信息
        title_label = QLabel("DeepCAD Analysis Viewport")
        title_label.setStyleSheet("""
            color: white; 
            font-size: 18px; 
            font-weight: bold; 
            font-family: 'Arial', sans-serif;
            background: rgba(0, 0, 0, 0.3);
            padding: 8px 16px;
            border-radius: 6px;
        """)
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        placeholder_layout.addWidget(title_label)
        
        # 添加一些间距
        placeholder_layout.addSpacing(30)
        
        # 功能状态显示
        status_label = QLabel("Ready for Analysis")
        status_label.setStyleSheet("""
            color: rgb(200, 220, 255); 
            font-size: 14px; 
            font-family: 'Arial', sans-serif;
            background: rgba(0, 0, 0, 0.2);
            padding: 6px 12px;
            border-radius: 4px;
        """)
        status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        placeholder_layout.addWidget(status_label)
        
        # 坐标轴指示
        axis_info = QLabel("X  Y  Z")
        axis_info.setStyleSheet("""
            color: rgba(255, 255, 255, 0.8); 
            font-size: 12px; 
            font-family: 'Courier New', monospace;
            margin-top: 20px;
        """)
        axis_info.setAlignment(Qt.AlignmentFlag.AlignCenter)
        placeholder_layout.addWidget(axis_info)
        
        # 添加一个半透明的网格图案覆盖层
        overlay = QFrame()
        overlay.setStyleSheet("""
            QFrame {
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)"/></svg>');
            }
        """)
        overlay.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)
        overlay.setParent(placeholder)
        overlay.resize(placeholder.size())
        
        layout.addWidget(placeholder)
        print("Abaqus风格占位视图已创建")
        
    def setup_safe_scene(self):
        """设置安全的3D场景（简化版本，避免OpenGL错误）"""
        if not hasattr(self, 'plotter') or self.plotter is None:
            return
            
        try:
            # 设置Abaqus风格背景（安全模式）
            try:
                self.set_abaqus_style_background()
                print("✅ Abaqus渐变背景设置成功（安全模式）")
            except:
                # 如果渐变失败，使用单色Abaqus风格背景
                self.plotter.set_background([0.45, 0.5, 0.65])
                print("✅ Abaqus单色背景设置成功")
            
            # 显示坐标轴
            try:
                self.plotter.show_axes()
            except:
                pass
            
            # 添加简单的文本提示
            try:
                self.plotter.add_text("DeepCAD Analysis Viewport\n[Safe Mode]", 
                                     position='upper_left', 
                                     font_size=12, 
                                     color='white')
            except:
                pass  # 如果文本渲染失败也继续
                
            # 设置专业地质工程视角
            try:
                # 地质工程专用斜视图：从东南上方观察，利于观察地层和支护结构
                self.plotter.camera_position = [(1, -1, 0.8), (0, 0, 0), (0, 0, 1)]
                self.plotter.camera.zoom(0.8)  # 适当缩放以显示全貌
            except:
                pass
                
            print("✅ 安全场景设置完成")
            
        except Exception as e:
            print(f"安全场景设置失败: {e}")

    def _create_placeholder(self, layout: QVBoxLayout) -> None:
        """创建占位符（重定向到增强版本）"""
        self._create_enhanced_placeholder(layout)

    def setup_lightweight_scene(self) -> None:
        """设置轻量级3D场景（保持渐变背景）"""
        if not (PYVISTA_AVAILABLE and self.plotter):
            return
        try:
            # 恢复Abaqus风格渐变背景
            self.set_abaqus_style_background()
            
            # 显示坐标轴
            self.plotter.show_axes()
            
            # 设置专业地质工程视角
            self.plotter.camera_position = [(1, -1, 0.8), (0, 0, 0), (0, 0, 1)]
            self.plotter.camera.zoom(0.8)
            
            # 欢迎信息
            self.plotter.add_text(
                "系统就绪",
                position='upper_left',
                font_size=12,
                color='cyan'
            )
            print("✅ 轻量级3D场景初始化成功")
        except Exception as e:
            print(f"轻量级场景初始化失败: {e}")

    def setup_default_scene(self) -> None:
        if not (PYVISTA_AVAILABLE and self.plotter):
            return
        try:
            # 使用正确的Abaqus风格渐变背景
            self.set_abaqus_style_background()
            
            # 设置坐标轴
            self.plotter.show_axes()
            
            # 设置专业地质工程视角
            self.plotter.camera_position = [(1, -1, 0.8), (0, 0, 0), (0, 0, 1)]
            self.plotter.camera.zoom(0.8)
            
            # 显示欢迎信息
            self.show_welcome_info()
            print("✅ Abaqus风格3D场景初始化成功")
        except Exception as e:
            print(f"初始化场景失败: {e}")

    def show_welcome_info(self) -> None:
        if not (PYVISTA_AVAILABLE and self.plotter):
            return
        try:
            self.plotter.add_text(
                "系统就绪",
                position='upper_left',
                font_size=12,
                color='cyan',
            )
        except Exception:
            pass

    def get_viewer_widget(self) -> Optional[QWidget]:
        return self.viewer_widget

    # (移除: 早期占位版 load_fpn_file 嵌套定义已删除，避免与正式实现签名冲突)

        # ---------- 显示主入口 ----------
        def display_mesh(self) -> None:
            """统一的网格显示方法，支持所有复选框控制"""
            if not (PYVISTA_AVAILABLE and self.plotter):
                print("PyVista不可用，无法显示网格")
                return
            if self._rendering:
                return
            try:
                self._rendering = True
                self.plotter.clear()
                
                # 设置Abaqus风格背景
                self.set_abaqus_style_background()

                # 显示主体网格（如果存在）
                if self.mesh is not None:
                    self._display_main_mesh()
                else:
                    # 没有网格时创建示例网格用于测试
                    self._create_demo_mesh()

                # 显示节点（如果复选框启用）
                if getattr(self, 'show_nodes', False):
                    self._display_nodes()

                # 板元叠加
                if getattr(self, 'show_plates', False):
                    self._display_plates_overlay()

                # 锚杆叠加
                if getattr(self, 'show_anchors', False):
                    self._display_anchors_overlay()
                    
                # 显示约束（如果复选框启用）
                if getattr(self, 'show_supports', True):
                    self._display_supports()
                    
                # 显示荷载（如果复选框启用）
                if getattr(self, 'show_loads', True):
                    self._display_loads()

                # 新增工程构件显示
                if getattr(self, 'show_diaphragm_wall', False):
                    self._display_diaphragm_wall()
                    
                if getattr(self, 'show_piles', False):
                    self._display_piles()
                    
                if getattr(self, 'show_strutting', False):
                    self._display_strutting()
                    
                if getattr(self, 'show_steel', False):
                    self._display_steel_structures()

                # UI要素
                self.plotter.show_axes()
                
                # 添加状态信息显示
                self._update_status_display()
                
                try:
                    self.plotter.reset_camera()
                    self.plotter.render()
                    print(f"✅ 网格显示更新完成 - 模式: {self.display_mode}")
                except Exception as e:
                    print(f"渲染失败: {e}")
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
                        # 🎨 专业锚杆管状显示
                        self.plotter.add_mesh(
                            tube,
                            color=[255, 140, 0],  # 专业橙色
                            opacity=0.95,
                            smooth_shading=True,
                            lighting=True,
                            name='anchor_lines'
                        )
                        return
                except Exception:
                    pass
                # 🎨 降级为专业线条显示
                self.plotter.add_mesh(
                    pdata,
                    color=[255, 140, 0],  # 专业橙色
                    line_width=4.0,
                    opacity=0.9,
                    name='anchor_lines'
                )
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
        """根据当前分析步名称粗略判断是否为开挖阶段。
        规则：若当前阶段名称包含“开挖”或“excavation”，则视为开挖阶段。
        """
        try:
            # 优先使用缓存的当前阶段数据
            stage = getattr(self, 'current_stage_data', None) or self.get_current_analysis_stage()
            if not stage:
                return False
            name = str(stage.get('name', '')).lower()
            return ('开挖' in name) or ('excavation' in name)
        except Exception:
            return False

    def _validate_connectivity(self, connectivity, n_points):
        """验证连接关系有效性"""
        try:
            for node_idx in connectivity:
                if node_idx < 0 or node_idx >= n_points:
                    return False
            return True
        except:
            return False
            
    def _create_safe_fallback_mesh(self, fpn_data):
        """安全的降级网格创建"""
        try:
            # 简化策略：只创建基本点云
            nodes = fpn_data.get('nodes', [])
            if isinstance(nodes, dict):
                nodes = list(nodes.values())
            
            if not nodes:
                return False
                
            points = []
            for node in nodes[:min(1000, len(nodes))]:  # 限制点数
                if isinstance(node, dict) and 'id' in node:
                    points.append([node.get('x', 0), node.get('y', 0), node.get('z', 0)])
            
            if points:
                import pyvista as pv
                self.mesh = pv.PolyData(points)
                print("✅ 使用安全降级网格（点云模式）")
                return True
        except Exception as e:
            print(f"❌ 安全降级也失败: {e}")
        return False

    def _is_soil_material(self, mat_id: int) -> bool:
        return int(mat_id) < 10

    def _create_multi_lod_meshes(self, original_mesh):
        """创建多级LOD网格缓存"""
        try:
            import pyvista as pv
            
            if not hasattr(self, '_lod_cache'):
                self._lod_cache = {}
            
            print("🔄 创建多级LOD缓存...")
            
            # 原始高质量网格 (LOD 0)
            self._lod_cache['high'] = original_mesh
            
            # 中等质量网格 (LOD 1)
            try:
                medium_mesh = original_mesh.decimate_pro(target_reduction=0.5, preserve_topology=True)
                self._lod_cache['medium'] = medium_mesh if medium_mesh.n_cells > 0 else original_mesh
                print(f"  ✅ 中等LOD: {medium_mesh.n_cells:,} 面")
            except Exception as e:
                self._lod_cache['medium'] = original_mesh
                print(f"  ⚠️ 中等LOD创建失败: {e}")
            
            # 低质量网格 (LOD 2)
            try:
                low_mesh = original_mesh.decimate_pro(target_reduction=0.75, preserve_topology=False)
                self._lod_cache['low'] = low_mesh if low_mesh.n_cells > 0 else original_mesh
                print(f"  ✅ 低质量LOD: {low_mesh.n_cells:,} 面")
            except Exception as e:
                self._lod_cache['low'] = original_mesh
                print(f"  ⚠️ 低质量LOD创建失败: {e}")
            
            # 超低质量网格 (LOD 3) - 极限优化
            try:
                ultra_low_mesh = original_mesh.decimate_pro(target_reduction=0.9, preserve_topology=False)
                if ultra_low_mesh.n_cells == 0:
                    # 如果过度简化，尝试较温和的简化
                    ultra_low_mesh = original_mesh.decimate(0.85)
                self._lod_cache['ultra_low'] = ultra_low_mesh if ultra_low_mesh.n_cells > 0 else low_mesh
                print(f"  ✅ 超低质量LOD: {ultra_low_mesh.n_cells:,} 面")
            except Exception as e:
                self._lod_cache['ultra_low'] = self._lod_cache.get('low', original_mesh)
                print(f"  ⚠️ 超低质量LOD创建失败: {e}")
                
            print(f"✅ LOD缓存创建完成，共{len(self._lod_cache)}个级别")
            
        except Exception as e:
            print(f"❌ LOD缓存创建失败: {e}")
            self._lod_cache = {'high': original_mesh}

    def _adaptive_mesh_simplify(self, mesh, target_reduction):
        """自适应网格简化，保持材料信息"""
        try:
            import pyvista as pv
            
            # 尝试多种简化策略
            simplified_mesh = None
            
            # 策略1: 优先使用DecimatePro（保持拓扑）
            try:
                simplified_mesh = mesh.decimate_pro(
                    target_reduction=target_reduction,
                    preserve_topology=True,
                    feature_angle=45,
                    splitting=False,
                    boundary_vertex_deletion=True
                )
                if simplified_mesh.n_cells > 0:
                    print(f"  ✅ DecimatePro成功，面数: {simplified_mesh.n_cells:,}")
                else:
                    simplified_mesh = None
            except Exception as e:
                print(f"  ⚠️ DecimatePro失败: {e}")
            
            # 策略2: 回退到基础Decimate
            if simplified_mesh is None or simplified_mesh.n_cells == 0:
                try:
                    simplified_mesh = mesh.decimate(target_reduction)
                    if simplified_mesh.n_cells > 0:
                        print(f"  ✅ Decimate成功，面数: {simplified_mesh.n_cells:,}")
                    else:
                        simplified_mesh = None
                except Exception as e:
                    print(f"  ⚠️ Decimate失败: {e}")
            
            # 策略3: 最后的防护
            if simplified_mesh is None or simplified_mesh.n_cells == 0:
                try:
                    # 尝试更温和的简化
                    moderate_target = min(target_reduction, 0.7)
                    simplified_mesh = mesh.decimate(moderate_target)
                    print(f"  ✅ 温和简化成功，面数: {simplified_mesh.n_cells:,}")
                except Exception as e:
                    print(f"  ❌ 所有简化策略都失败: {e}")
                    simplified_mesh = mesh
            
            # 🎨 保持材料信息 - 增强版
            if simplified_mesh and simplified_mesh != mesh:
                try:
                    if hasattr(mesh, 'cell_data') and 'MaterialID' in mesh.cell_data:
                        original_materials = mesh.cell_data['MaterialID']
                        unique_materials = np.unique(original_materials)
                        
                        if len(unique_materials) > 1:
                            # 多材料情况：尝试保持多样性
                            self._preserve_material_diversity(simplified_mesh, mesh, original_materials)
                        else:
                            # 单一材料情况：直接赋值
                            simplified_mesh.cell_data['MaterialID'] = np.full(
                                simplified_mesh.n_cells, unique_materials[0], dtype=np.int32
                            )
                        
                        print(f"  🎨 材料保持: {len(unique_materials)}种材料映射完成")
                except Exception as e:
                    print(f"  ❌ 材料ID保持失败: {e}")
            
            return simplified_mesh
            
        except Exception as e:
            print(f"❌ 自适应简化失败: {e}")
            return mesh

    def _emergency_material_recovery(self, surface_mesh, volume_mesh):
        """紧急材料恢复机制"""
        try:
            if not (hasattr(volume_mesh, 'cell_data') and 'MaterialID' in volume_mesh.cell_data):
                return
            
            original_materials = np.asarray(volume_mesh.cell_data['MaterialID'])
            unique_materials = np.unique(original_materials)
            
            if len(unique_materials) <= 1:
                # 如果只有一种材料，直接填充
                if surface_mesh.n_cells > 0:
                    surface_mesh.cell_data['MaterialID'] = np.full(
                        surface_mesh.n_cells, unique_materials[0] if len(unique_materials) > 0 else 1, 
                        dtype=np.int32
                    )
                print(f"🔧 紧急恢复: 单一材料 {unique_materials[0] if len(unique_materials) > 0 else 1}")
                return
            
            # 多材料情况：基于几何位置的智能分配
            print(f"🔧 紧急恢复: {len(unique_materials)}种材料的几何分配")
            
            # 获取表面网格的中心位置
            surface_centers = surface_mesh.cell_centers().points
            volume_centers = volume_mesh.cell_centers().points
            
            # 为每个表面单元找到最近的体单元，继承其材料ID
            from scipy.spatial import KDTree
            kdtree = KDTree(volume_centers)
            distances, indices = kdtree.query(surface_centers)
            
            # 映射材料ID
            recovered_materials = original_materials[indices]
            surface_mesh.cell_data['MaterialID'] = recovered_materials.astype(np.int32)
            
            # 验证恢复效果
            recovered_unique = np.unique(recovered_materials)
            print(f"✅ 紧急恢复成功: 恢复了{len(recovered_unique)}种材料")
            
        except Exception as e:
            print(f"❌ 紧急恢复也失败: {e}")
            # 最后的保护：随机分配材料以保持视觉多样性
            if surface_mesh.n_cells > 0 and len(unique_materials) > 0:
                np.random.seed(42)  # 固定种子确保一致性
                random_materials = np.random.choice(unique_materials, surface_mesh.n_cells)
                surface_mesh.cell_data['MaterialID'] = random_materials.astype(np.int32)
                print("🎲 使用随机分配保持视觉多样性")

    def _preserve_material_diversity(self, simplified_mesh, original_mesh, original_materials):
        """保持材料多样性的智能算法"""
        try:
            unique_materials = np.unique(original_materials)
            n_simplified = simplified_mesh.n_cells
            
            if n_simplified == 0:
                return
            
            # 策略1: 基于原始材料比例分配
            material_ratios = {}
            for mat_id in unique_materials:
                count = np.sum(original_materials == mat_id)
                material_ratios[mat_id] = count / len(original_materials)
            
            # 为简化网格分配材料ID，保持原有比例
            assigned_materials = []
            remaining_cells = n_simplified
            
            for i, (mat_id, ratio) in enumerate(material_ratios.items()):
                if i == len(material_ratios) - 1:  # 最后一个材料
                    count = remaining_cells
                else:
                    count = max(1, int(ratio * n_simplified))  # 至少分配1个
                    remaining_cells -= count
                
                assigned_materials.extend([mat_id] * count)
            
            # 随机打散分配（固定种子保证一致性）
            np.random.seed(42)
            np.random.shuffle(assigned_materials)
            
            # 截断或填充到正确长度
            if len(assigned_materials) > n_simplified:
                assigned_materials = assigned_materials[:n_simplified]
            elif len(assigned_materials) < n_simplified:
                # 用最常见的材料填充
                most_common = max(material_ratios.keys(), key=lambda x: material_ratios[x])
                assigned_materials.extend([most_common] * (n_simplified - len(assigned_materials)))
            
            simplified_mesh.cell_data['MaterialID'] = np.asarray(assigned_materials, dtype=np.int32)
            
            # 验证分配结果
            final_unique = np.unique(assigned_materials)
            print(f"  🎨 材料分配: {len(unique_materials)}种 → {len(final_unique)}种")
            
        except Exception as e:
            print(f"  ❌ 材料多样性保持失败: {e}")
            # 回退到第一个材料
            if len(unique_materials) > 0:
                simplified_mesh.cell_data['MaterialID'] = np.full(
                    n_simplified, unique_materials[0], dtype=np.int32
                )

    def _create_emergency_box_mesh(self, original_mesh):
        """创建紧急包围盒网格：当所有简化方法都失败时的最后安全措施
        
        确保始终有一个可渲染的极简网格，防止OpenGL崩溃
        """
        try:
            import pyvista as pv
            
            # 获取原始网格的包围盒
            bounds = original_mesh.bounds  # [xmin, xmax, ymin, ymax, zmin, zmax]
            print(f"🚨 创建紧急包围盒网格，原始边界: {bounds}")
            
            # 创建简单的立方体网格（12个三角面）
            center = [
                (bounds[0] + bounds[1]) / 2,
                (bounds[2] + bounds[3]) / 2, 
                (bounds[4] + bounds[5]) / 2
            ]
            lengths = [
                bounds[1] - bounds[0],
                bounds[3] - bounds[2],
                bounds[5] - bounds[4]
            ]
            
            # 创建立方体
            box_mesh = pv.Cube(center=center, x_length=lengths[0], 
                              y_length=lengths[1], z_length=lengths[2])
            
            # 保持材料信息（尝试从原始网格继承主要材料）
            try:
                if hasattr(original_mesh, 'cell_data') and 'MaterialID' in original_mesh.cell_data:
                    # 使用最常见的材料ID
                    original_materials = original_mesh.cell_data['MaterialID']
                    unique_ids, counts = np.unique(original_materials, return_counts=True)
                    most_common_material = unique_ids[np.argmax(counts)]
                else:
                    most_common_material = 1  # 默认材料
                
                # 为立方体的所有面分配相同材料
                box_mesh.cell_data['MaterialID'] = np.full(
                    box_mesh.n_cells, most_common_material, dtype=np.int32
                )
                
            except Exception as mat_e:
                print(f"⚠️ 紧急网格材料分配失败: {mat_e}")
                box_mesh.cell_data['MaterialID'] = np.full(box_mesh.n_cells, 1, dtype=np.int32)
            
            print(f"✅ 紧急包围盒创建完成: {box_mesh.n_cells} 面 (极简安全网格)")
            return box_mesh
            
        except Exception as e:
            print(f"❌ 紧急包围盒创建失败: {e}")
            # 最后的最后：创建一个最简单的三角形
            try:
                import pyvista as pv
                points = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0]])
                faces = np.array([3, 0, 1, 2])
                emergency_mesh = pv.PolyData(points, faces)
                emergency_mesh.cell_data['MaterialID'] = np.array([1], dtype=np.int32)
                print("🆘 使用最简三角形网格")
                return emergency_mesh
            except Exception as final_e:
                print(f"💀 连最简网格都创建失败: {final_e}")
                return original_mesh  # 没办法了，返回原始网格

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


    # 注意：颜色映射在文件后部统一实现，避免重复定义
    # def get_material_color(self, material_id: int, material_name: str = "") -> tuple:
    #     pass

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


    # 轻量级自检（已在文件末尾提供独立实现）

    def get_viewer_widget(self):
        """获取3D视图组件"""
        return self.viewer_widget

    def load_fpn_file(self, file_path: str, force_load: bool = False):
        """加载MIDAS FPN文件（使用优化解析器）"""
        try:
            # 🔧 确保正确的导入路径
            import sys
            from pathlib import Path

            # 添加项目根目录到路径
            project_root = Path(__file__).parent.parent
            if str(project_root) not in sys.path:
                sys.path.insert(0, str(project_root))

            file_path = Path(file_path)

            if not file_path.exists():
                raise FileNotFoundError(f"文件不存在: {file_path}")

            # ✅ 文件大小检查 - 防止启动时死机
            file_size_mb = file_path.stat().st_size / (1024 * 1024)
            if file_size_mb > 50:  # 超过50MB的文件警告
                print(f"⚠️ 警告: 文件较大 ({file_size_mb:.1f}MB)，可能影响性能")
            
            # ✅ 启动保护 - 只允许显式的手动导入
            if not force_load:
                print(f"🛡️ 启动保护模式：跳过自动加载 {file_path.name}")
                print("💡 要导入此文件，请使用GUI的导入按钮")
                return None

            # 导入所需模块（优先从example2.core导入，避免被顶层core包遮蔽）
            try:
                from example2.core.optimized_fpn_parser import OptimizedFPNParser
            except Exception:
                from core.optimized_fpn_parser import OptimizedFPNParser
            try:
                from utils.error_handler import handle_error
            except ImportError:
                handle_error = None

            print(f"🔄 开始加载FPN文件: {file_path.name}")

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

    # 示例FPN数据创建函数已移除 - 现在只接受真实的FPN文件

    def create_mesh_from_fpn(self, fpn_data: Dict[str, Any]):
        """从FPN数据创建PyVista网格（增强版 - 防崩溃）
        - 稀疏ID压缩为连续索引，避免巨大内存占用
        - 大模型自动外表面提取 + 默认关闭边框显示
        - 写入MaterialID到cell_data便于分层显示
        """
        print(f"🔧 开始从FPN数据创建网格...")
        print(f"FPN数据类型: {type(fpn_data)}")
        if fpn_data:
            print(f"FPN数据键: {list(fpn_data.keys())}")
            print(f"节点数: {len(fpn_data.get('nodes', []))}")
            print(f"单元数: {len(fpn_data.get('elements', []))}")

        try:
            if not PYVISTA_AVAILABLE:
                print("❌ PyVista不可用，无法创建网格")
                return

            print("🔄 开始从FPN数据创建优化网格...")

            # 处理节点数据（兼容 dict/list）
            nodes = fpn_data.get('nodes', [])
            if isinstance(nodes, dict):
                nodes = list(nodes.values())
            if not nodes:
                raise ValueError("FPN中未找到节点数据")

            # 处理单元数据（兼容 dict/list，合并体单元和板单元）
            elements = fpn_data.get('elements', [])
            if isinstance(elements, dict):
                elements = list(elements.values())

            # 🔧 修复：合并板单元（地连墙/隧道衬砌）
            plate_elements = fpn_data.get('plate_elements', [])
            if isinstance(plate_elements, dict):
                plate_elements = list(plate_elements.values())

            # 转换板单元格式以兼容现有处理逻辑
            shell_props = fpn_data.get('shell_properties', {})
            for plate in plate_elements:
                if isinstance(plate, dict):
                    plate_nodes = plate.get('nodes', [])  # 修复：使用不同的变量名
                    if len(plate_nodes) == 3:
                        plate['type'] = 'Triangle2D3N'
                    elif len(plate_nodes) == 4:
                        plate['type'] = 'Quadrilateral2D4N'

                    # 🔧 修复：通过PSHELL属性ID查找真实材料ID
                    prop_id = plate.get('prop_id', 1)
                    shell_prop = shell_props.get(prop_id, {})
                    # 从PSHELL属性中获取材料ID
                    material_id = shell_prop.get('material_id', 1)
                    plate['material_id'] = material_id
                    elements.append(plate)

            if not elements:
                raise ValueError("FPN中未找到单元数据（体单元+板单元）")

            print(f"📊 原始数据: {len(nodes)} 个节点, {len(elements)} 个单元")

            # 🔧 STEP 1: 稀疏ID压缩 - 避免巨大内存占用
            node_ids = []
            for node in nodes:
                if isinstance(node, dict) and 'id' in node:
                    node_ids.append(int(node['id']))
                else:
                    continue
            
            if not node_ids:
                raise ValueError("节点数据格式错误，未找到有效ID")

            node_ids.sort()  # 排序节点ID
            max_id = max(node_ids)
            actual_count = len(node_ids)
            
            # 检测稀疏程度
            sparsity_ratio = max_id / actual_count if actual_count > 0 else 1
            print(f"🧮 节点ID范围: 1~{max_id}, 实际节点: {actual_count}, 稀疏度: {sparsity_ratio:.1f}x")
            
            if sparsity_ratio > 2.0:
                print(f"⚠️ 检测到稀疏ID (稀疏度 {sparsity_ratio:.1f}x)，启用ID压缩")
                # 建立ID到连续索引的映射
                id_to_index = {node_id: i for i, node_id in enumerate(node_ids)}
                use_sparse_compression = True
            else:
                id_to_index = None
                use_sparse_compression = False

            # STEP 2: 构建点坐标数组
            if use_sparse_compression:
                points = np.zeros((actual_count, 3), dtype=np.float32)
                node_dict = {int(n['id']): n for n in nodes if isinstance(n, dict) and 'id' in n}
                
                for i, node_id in enumerate(node_ids):
                    node = node_dict.get(node_id)
                    if node:
                        points[i] = [float(node.get('x', 0)), float(node.get('y', 0)), float(node.get('z', 0))]
            else:
                # 原始方法（非稀疏情况）
                points = np.zeros((max_id + 1, 3), dtype=np.float32)
                for node in nodes:
                    if isinstance(node, dict) and 'id' in node:
                        nid = int(node['id'])
                        points[nid] = [float(node.get('x', 0)), float(node.get('y', 0)), float(node.get('z', 0))]
                points = points[1:max_id+1]  # 移除索引0

            print(f"✅ 点阵构建完成: {points.shape[0]} 个坐标点")

            # STEP 3: 构建单元连接关系
            cells = []
            cell_material_ids = []
            cell_types = []  # 正确的VTK单元类型数组
            
            for elem in elements:
                if not isinstance(elem, dict):
                    continue
                    
                # 获取节点连接
                elem_nodes = []
                if 'nodes' in elem:
                    elem_nodes = elem['nodes']
                elif 'connectivity' in elem:
                    elem_nodes = elem['connectivity']
                else:
                    # 尝试从单元数据中提取节点（适配不同格式）
                    for key in ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8']:
                        if key in elem:
                            elem_nodes.append(elem[key])

                if len(elem_nodes) < 3:
                    continue  # 跳过无效单元

                # 🔧 修复：ID映射转换和验证
                mapped_nodes = []
                if use_sparse_compression:
                    for node_id in elem_nodes:
                        idx = id_to_index.get(int(node_id))
                        if idx is not None:
                            mapped_nodes.append(idx)
                else:
                    for node_id in elem_nodes:
                        node_idx = int(node_id) - 1  # 转为0-based索引
                        # 🔧 关键修复：验证节点索引范围
                        if 0 <= node_idx < points.shape[0]:
                            mapped_nodes.append(node_idx)

                # 🔧 修复：严格验证连接关系
                if len(mapped_nodes) >= 3 and self._validate_connectivity(mapped_nodes, points.shape[0]):
                    # 判定单元类型并写入VTK类型编码
                    etype_raw = str(elem.get('type', '')).lower()
                    vtk_type = None

                    # 🔧 修复：优先基于类型字段判断，避免壳单元被误判为体单元
                    if 'triangle2d3n' in etype_raw or etype_raw == 'triangle':
                        vtk_type = 5   # VTK_TRIANGLE
                    elif 'quadrilateral2d4n' in etype_raw or 'quad' in etype_raw:
                        vtk_type = 9   # VTK_QUAD
                    elif 'tetrahedra3d4n' in etype_raw or 'tetra' in etype_raw:
                        vtk_type = 10  # VTK_TETRA
                    elif 'hexahedra3d8n' in etype_raw or 'hexa' in etype_raw or 'hex' in etype_raw:
                        vtk_type = 12  # VTK_HEXAHEDRON
                    elif 'wedge' in etype_raw or 'penta' in etype_raw:
                        vtk_type = 13  # VTK_WEDGE
                    elif 'truss' in etype_raw or 'line' in etype_raw:
                        vtk_type = 3   # VTK_LINE
                    # 兜底：基于节点数量推断（但优先考虑壳单元）
                    elif len(mapped_nodes) == 3:
                        vtk_type = 5   # VTK_TRIANGLE
                    elif len(mapped_nodes) == 4:
                        # 默认优先判断为四边形壳单元，除非明确是体单元
                        if 'smalldisplacement' in etype_raw or 'solid' in etype_raw:
                            vtk_type = 10  # VTK_TETRA
                        else:
                            vtk_type = 9   # VTK_QUAD（壳单元）
                    elif len(mapped_nodes) == 8:
                        vtk_type = 12  # VTK_HEXAHEDRON
                    elif len(mapped_nodes) == 6:
                        vtk_type = 13  # VTK_WEDGE

                    # 若未能推断，尝试基于类型字段
                    if vtk_type is None:
                        if 'tetra' in etype_raw or etype_raw == 't4':
                            vtk_type = 10
                        elif 'hexa' in etype_raw or 'hex' in etype_raw or etype_raw == 'h8':
                            vtk_type = 12
                        elif 'wedge' in etype_raw or 'penta' in etype_raw or etype_raw == 'w6':
                            vtk_type = 13

                    # 无法识别的单元类型则跳过，避免构造非法网格
                    if vtk_type is None:
                        continue

                    # 🔧 修复：添加单元（正确的VTK格式：[节点数, 节点1, 节点2, ...]）
                    cells.extend([len(mapped_nodes)] + mapped_nodes)
                    cell_types.append(vtk_type)
                    # 记录材料ID
                    material_id = elem.get('material_id', elem.get('material', 1))
                    cell_material_ids.append(int(material_id))

            if not cells:
                raise ValueError("未找到有效的单元连接数据")

            # 🔧 修复：STEP 4: 创建PyVista网格（正确的VTK格式）
            cells_array = np.asarray(cells, dtype=np.int32)  # 修复：使用int32而非int64
            types_array = np.asarray(cell_types, dtype=np.uint8)
            
            # 🔧 修复：安全的网格创建
            try:
                mesh = pv.UnstructuredGrid(cells_array, types_array, points)
                # 验证网格完整性
                if mesh.n_cells == 0 or mesh.n_points == 0:
                    raise ValueError("创建的网格为空")
            except Exception as e:
                print(f"❌ 网格创建失败: {e}")
                # 🔧 安全降级：创建简化网格
                return self._create_safe_fallback_mesh(fpn_data)

            # 添加材料ID数据
            if cell_material_ids and mesh.n_cells == len(cell_material_ids):
                mesh.cell_data['MaterialID'] = np.asarray(cell_material_ids, dtype=np.int32)

            # 🚀 STEP 5: 大模型优化策略
            n_cells = mesh.n_cells
            print(f"📈 网格统计: {mesh.n_points} 点, {n_cells} 单元")
            
            # 超大模型外表面提取
            if n_cells > 500000:
                print(f"🔥 超大模型 ({n_cells} 单元) - 提取外表面以防崩溃")
                try:
                    # 保留原始体网格以便必要时引用
                    self._volume_mesh = mesh
                    # 提取外表面，带上原始单元ID，便于映射MaterialID
                    surface_mesh = mesh.extract_surface(pass_cellid=True)
                    # 🎨 增强材料ID映射 - 保证多层土体颜色
                    try:
                        orig_ids = surface_mesh.cell_data.get('vtkOriginalCellIds')
                        if orig_ids is not None and 'MaterialID' in mesh.cell_data:
                            original_material_ids = np.asarray(mesh.cell_data['MaterialID'])
                            mapped_materials = original_material_ids[np.asarray(orig_ids, dtype=int)]
                            surface_mesh.cell_data['MaterialID'] = mapped_materials.astype(np.int32)
                            
                            # 材料映射统计报告
                            unique_original = np.unique(original_material_ids)
                            unique_surface = np.unique(mapped_materials)
                            print(f"🎨 材料ID映射: 原始{len(unique_original)}种 → 表面{len(unique_surface)}种")
                            print(f"   原始材料: {sorted(unique_original.tolist())}")
                            print(f"   表面材料: {sorted(unique_surface.tolist())}")
                        else:
                            print("⚠️ 无MaterialID数据，将使用统一颜色")
                    except Exception as _e:
                        print(f"❌ 表面MaterialID映射失败: {_e}")
                        # 紧急修复：如果映射失败，尝试恢复原始材料信息
                        self._emergency_material_recovery(surface_mesh, mesh)
                    # 🎯 激进网格简化：多级LOD策略
                    try:
                        surf_faces = int(getattr(surface_mesh, 'n_cells', 0))
                        print(f"📊 原始外表面: {surf_faces:,} 个面")
                        
                        # 创建多级LOD
                        self._create_multi_lod_meshes(surface_mesh)
                        
                        # 🚨 阶段1严格LOD阈值：防止OpenGL wglMakeCurrent失败
                        # 根据错误日志分析，需要极度激进的面数控制
                        if surf_faces > 200_000:
                            # 🔥 超大模型：极度激进简化至3千面以下 (99.5%+减少)
                            target = max(0.985, 1.0 - 3_000 / float(surf_faces))
                            lod_level = "ultra_low"
                        elif surf_faces > 50_000:
                            # ⚡ 大模型：激进简化至5千面以下 (90%+减少)  
                            target = max(0.90, 1.0 - 5_000 / float(surf_faces))
                            lod_level = "low"
                        elif surf_faces > 10_000:
                            # 🎯 中等模型：适度简化保持8千面以下
                            target = max(0.70, 1.0 - 8_000 / float(surf_faces))
                            lod_level = "medium"
                        else:
                            # 小模型：轻度简化
                            target = 0.5
                            lod_level = "medium"
                        
                        print(f"🔧 应用{lod_level}级LOD，目标降比={target:.3f}")
                        
                        # 使用自适应网格简化
                        simplified = self._adaptive_mesh_simplify(surface_mesh, target)
                        if simplified is not None and simplified.n_cells > 0:
                            surface_mesh = simplified
                        
                        # 🚨 紧急面数验证：绝对防止OpenGL崩溃的最后防线
                        final_faces = surface_mesh.n_cells
                        EMERGENCY_FACE_LIMIT = 5000  # 绝对安全的OpenGL面数上限
                        
                        if final_faces > EMERGENCY_FACE_LIMIT:
                            print(f"🚨 紧急面数过载: {final_faces:,} > {EMERGENCY_FACE_LIMIT:,}, 执行紧急简化")
                            emergency_target = 0.99  # 99%激进简化
                            try:
                                emergency_mesh = self._adaptive_mesh_simplify(surface_mesh, emergency_target)
                                if emergency_mesh and emergency_mesh.n_cells > 0:
                                    surface_mesh = emergency_mesh
                                    print(f"✅ 紧急简化完成: {surface_mesh.n_cells:,} 面")
                                else:
                                    raise Exception("紧急简化失败")
                            except Exception as emerg_e:
                                print(f"⚠️ 紧急简化失败: {emerg_e}, 强制采用极简网格")
                                # 最后的安全措施：创建极简包围盒网格
                                surface_mesh = self._create_emergency_box_mesh(surface_mesh)
                        
                        # 存储当前LOD信息  
                        self._current_lod_level = lod_level
                        self._surface_face_count = surface_mesh.n_cells
                        
                        # 最终安全验证
                        if surface_mesh.n_cells > EMERGENCY_FACE_LIMIT:
                            print(f"🚨 最终面数仍超限: {surface_mesh.n_cells:,}, 系统可能不稳定")
                        else:
                            print(f"✅ 面数安全验证通过: {surface_mesh.n_cells:,} ≤ {EMERGENCY_FACE_LIMIT:,}")
                        
                    except Exception as _de:
                        print(f"⚠️ 智能简化失败，使用基础降面: {_de}")
                        try:
                            surface_mesh = surface_mesh.decimate(0.3)
                        except Exception:
                            pass
                    
                    print(f"✅ 优化表面网格: {surface_mesh.n_cells:,} 个面 (减少 {(1-surface_mesh.n_cells/surf_faces)*100:.1f}%)")
                    self.mesh = surface_mesh
                    self.show_edges_default = False  # 大模型默认不显示边
                    self._is_big_model = True
                    print("🛡️ 大模型默认关闭边框显示")
                except Exception as e:
                    print(f"⚠️ 外表面提取失败: {e}, 使用原始网格")
                    self.mesh = mesh
                    self.show_edges_default = False
                    self._is_big_model = True
            elif n_cells > 800000:  # 放宽阈值：>800k 才认为大模型
                print(f"⚠️ 大模型 ({n_cells} 单元) - 关闭边框显示以提升性能")
                self.mesh = mesh
                self.show_edges_default = False
                self._is_big_model = True
            else:
                print(f"✅ 中小模型 ({n_cells} 单元) - 保持完整显示")
                self.mesh = mesh
                self.show_edges_default = True
                self._is_big_model = False

            print(f"🎯 成功创建网格: {self.mesh.n_points} 点, {self.mesh.n_cells} 单元/面")

            # 强制显示网格（确保用户能看到结果）
            print("🎨 强制显示网格...")
            self.display_mesh()

            # 在显示前应用LOD策略，避免大模型直接重负载渲染
            try:
                self._apply_lod()
            except Exception as _:
                pass
            
        except Exception as e:
            print(f"❌ 创建网格失败: {e}")
            import traceback
            traceback.print_exc()
            self.mesh = None

            # 构建连续索引的点集
            nodes_sorted = sorted(nodes, key=lambda n: int(n['id']))
            id_to_idx = {}
            points = np.empty((len(nodes_sorted), 3), dtype=float)
            for i, n in enumerate(nodes_sorted):
                nid = int(n['id'])
                id_to_idx[nid] = i
                points[i] = [float(n['x']), float(n['y']), float(n['z'])]

            # 创建单元连接信息并记录材料
            cells = []
            cell_types = []
            cell_mats = []
            VTK_TETRA = 10
            VTK_HEXAHEDRON = 12
            VTK_WEDGE = 13

            def map_nodes(raw_nodes, need):
                idxs = []
                for nid in raw_nodes[:need]:
                    midx = id_to_idx.get(int(nid))
                    if midx is None:
                        return None
                    idxs.append(midx)
                return idxs

            for elem in elements:
                etype = str(elem.get('type', '')).lower()
                raw = elem.get('nodes', [])
                mat_id = int(elem.get('material_id', 0))
                if etype in ('tetra', 'tetra4', 't4'):
                    idxs = map_nodes(raw, 4)
                    if idxs and len(idxs) == 4:
                        cells.extend([4] + idxs)
                        cell_types.append(VTK_TETRA)
                        cell_mats.append(mat_id)
                elif etype in ('hexa', 'hex', 'hexa8', 'h8'):
                    idxs = map_nodes(raw, 8)
                    if idxs and len(idxs) == 8:
                        cells.extend([8] + idxs)
                        cell_types.append(VTK_HEXAHEDRON)
                        cell_mats.append(mat_id)
                elif etype in ('penta', 'wedge', 'p6', 'w6'):
                    idxs = map_nodes(raw, 6)
                    if idxs and len(idxs) == 6:
                        cells.extend([6] + idxs)
                        cell_types.append(VTK_WEDGE)
                        cell_mats.append(mat_id)
                else:
                    etu = str(elem.get('type', '')).upper()
                    if etu == 'TETRA':
                        idxs = map_nodes(raw, 4)
                        if idxs and len(idxs) == 4:
                            cells.extend([4] + idxs)
                            cell_types.append(VTK_TETRA)
                            cell_mats.append(mat_id)
                    elif etu == 'HEXA':
                        idxs = map_nodes(raw, 8)
                        if idxs and len(idxs) == 8:
                            cells.extend([8] + idxs)
                            cell_types.append(VTK_HEXAHEDRON)
                            cell_mats.append(mat_id)
                    elif etu == 'PENTA':
                        idxs = map_nodes(raw, 6)
                        if idxs and len(idxs) == 6:
                            cells.extend([6] + idxs)
                            cell_types.append(VTK_WEDGE)
                            cell_mats.append(mat_id)

            if not cells:
                raise ValueError("没有找到支持的单元类型（TETRA/HEXA/PENTA）")

            # 创建PyVista网格
            cells_array = np.asarray(cells, dtype=np.int64)
            types_array = np.asarray(cell_types, dtype=np.uint8)
            grid = pv.UnstructuredGrid(cells_array, types_array, points)
            if len(cell_mats) == grid.n_cells:
                grid.cell_data['MaterialID'] = np.asarray(cell_mats, dtype=np.int32)

            # 大模型显示优化
            try:
                if grid.n_cells > 500_000:
                    # 仅显示外表面，显著降低渲染负荷
                    surf = grid.extract_surface(pass_pointid=False)
                    self.mesh = surf
                    print(f"大模型仅显示外表面: {self.mesh.n_cells} 个面")
                else:
                    self.mesh = grid
            except Exception as e:
                print(f"外表面提取失败，退回体网格: {e}")
                self.mesh = grid

            print(f"成功创建网格: {self.mesh.n_points} 个节点, {self.mesh.n_cells} 个单元")

            # 显示参数：大模型默认不显示边
            self.display_mode = getattr(self, 'display_mode', 'transparent')
            # 放宽边框关闭阈值：仅当 >800k 单元时默认关边
            self.show_mesh_edges = False if self.mesh.n_cells > 800_000 else getattr(self, 'show_mesh_edges', True)

            # 显示网格
            self.display_mesh()

            # 处理材料数据（可选）
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

            print(f"✅ 网格创建完成，准备显示...")
            # 确保网格被显示
            if self.mesh:
                print("🎨 最终显示网格...")
                self.display_mesh()
            else:
                print("❌ 网格对象为空，无法显示")

        except Exception as e:
            # 🔧 网格创建失败时的异常处理
            print(f"❌ 网格创建失败: {e}")
            import traceback
            traceback.print_exc()

            # 创建一个简单的示例网格作为后备
            print("正在创建示例网格作为后备...")
            raise ValueError("需要真实的FPN数据")

            # 设置基本的分析步信息
            if fpn_data and 'analysis_stages' in fpn_data:
                self.analysis_stages = fpn_data['analysis_stages']
                self.fpn_data = fpn_data
            else:
                self.analysis_stages = []

            self.current_stage_index = 0

    def get_material_color(self, material_id: int, material_name: str = "") -> tuple:
        """统一的材料配色
        优先使用集中式 SOIL_PALETTE；其次按名称关键字；最后按ID生成可区分色。
        """
        mid = int(material_id)

        # 1) 集中式调色板（若可用）
        try:
            if isinstance(SOIL_PALETTE, dict) and mid in SOIL_PALETTE:
                return SOIL_PALETTE[mid]
        except Exception:
            pass

        # 2) 🎨 专业岩土工程名称关键字映射 (基于地质勘察标准色系)
        name_mapping = {
            # === 土体材料 (自然地质色系) ===
            '填土': (0.545, 0.451, 0.333),      # 深土褐色
            '细砂': (0.710, 0.580, 0.455),      # 浅土褐色
            '中砂': (0.804, 0.667, 0.490),      # 沙土色
            '粗砂': (0.855, 0.725, 0.549),      # 浅沙色
            '砂土': (0.804, 0.667, 0.490),      # 沙土色
            '粉土': (0.545, 0.490, 0.420),      # 灰褐色
            '粉质粘土': (0.627, 0.510, 0.384),  # 中土褐色
            '粘土': (0.471, 0.412, 0.345),      # 深灰褐色
            '淤泥': (0.384, 0.333, 0.275),      # 深褐色
            '淤泥质土': (0.384, 0.333, 0.275),  # 深褐色
            '强风化': (0.294, 0.235, 0.188),    # 深岩色
            '岩': (0.294, 0.235, 0.188),        # 深岩色
            '卵石': (0.612, 0.800, 0.396),      # 保持绿色

            # === 工程材料 (专业工程色系) ===
            '围护墙': (0.545, 0.353, 0.169),    # 混凝土褐色
            '地连墙': (0.545, 0.353, 0.169),    # 混凝土褐色
            '支护墙': (0.545, 0.353, 0.169),    # 混凝土褐色
            '混凝土': (0.275, 0.510, 0.706),    # 钢蓝色
            '桩': (0.275, 0.510, 0.706),        # 钢蓝色

            # === 金属材料 (金属色系) ===
            '钢材': (0.663, 0.663, 0.663),      # 银灰色
            '钢': (0.663, 0.663, 0.663),        # 银灰色
            '钢支撑': (0.663, 0.663, 0.663),    # 银灰色

            # === 支护材料 (醒目安全色系) ===
            '锚杆': (1.000, 0.549, 0.000),      # 橙色
            '预应力': (1.000, 0.549, 0.000),    # 橙色
            '土钉': (1.000, 0.271, 0.000),      # 橙红色
            '注浆': (1.000, 0.388, 0.278),      # 番茄色
            '加固': (1.000, 0.498, 0.314),      # 珊瑚色
        }
        try:
            if material_name:
                for key, color in name_mapping.items():
                    if key in material_name:
                        return color
            # 若 materials 字典中有名称，也尝试匹配
            if hasattr(self, 'materials') and isinstance(self.materials, dict) and mid in self.materials:
                info = self.materials.get(mid) or {}
                name = info.get('name') if isinstance(info, dict) else None
                if name:
                    for key, color in name_mapping.items():
                        if key in name:
                            return color
        except Exception:
            pass

        # 3) 最终回退：按ID生成区分色（降低饱和度，保证不突兀）
        try:
            import colorsys
            hue = (mid * 0.618033988749895) % 1.0
            saturation = 0.45
            value = 0.85
            return colorsys.hsv_to_rgb(hue, saturation, value)
        except Exception:
            return (0.7, 0.7, 0.7)

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
            raise ValueError("需要真实的FPN数据")

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
            raise ValueError("需要真实的网格数据文件")
        except Exception as e:
            print(f"读取GMSH文件失败: {e}")
            raise ValueError("需要真实的网格数据文件")

    # 示例网格创建函数已移除 - 现在只从真实的FPN数据创建网格

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
        """强制显示工程构件 - 紧急修复版"""
        if not PYVISTA_AVAILABLE:
            print("❌ PyVista不可用，无法显示网格")
            return
        if not self.mesh:
            print("❌ 网格对象为空，无法显示")
            return

        print(f"🎨 开始显示网格: {self.mesh.n_points} 节点, {self.mesh.n_cells} 单元")

        # 清除现有内容
        self.plotter.clear()
        self.set_abaqus_style_background()

        # 渲染计时开始
        import time
        _t0 = time.time()

        # 🔧 根据显示模式显示网格（统一入口，避免重复clear）
        if self.display_mode == 'transparent':
            self.display_transparent_layers()
        elif self.display_mode == 'wireframe':
            self.display_wireframe_mode()
        elif self.display_mode == 'solid':
            self.display_solid_mode()
        else:
            self.display_transparent_layers()  # 默认半透明

        # 🔧 STEP 2: 强制显示关键工程构件（叠加在主网格之上）
        self._force_display_engineering_components()

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

        # 🔧 修复：安全的叠加层显示
        self._display_overlays_safe()

        # 🔧 设置安全相机视角
        try:
            self.plotter.reset_camera()
            self.plotter.show_axes()
        except Exception as e:
            print(f"相机设置失败: {e}")
        
        _elapsed = time.time() - _t0
        print(f"⏱️ 网格渲染耗时: {_elapsed:.2f}秒")

    def _display_overlays_safe(self):
        """安全的叠加层显示"""
        try:
            # 叠加显示：板元（TRIA/QUAD）
            if getattr(self, 'show_plates', False):
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
                    
            # 叠加显示：锚杆线元（修复版）
            if getattr(self, 'show_anchors', False):
                # 构建或使用缓存
                if self._anchors_cached is None:
                    self._anchors_cached = self._build_anchor_geometry()
                pdata = self._anchors_cached
                
                if pdata is not None:
                    # 🔧 修复：使用安全的锚杆渲染参数
                    safe_anchor_params = {
                        'color': 'red',
                        'line_width': 4.0,
                        'opacity': 0.9,
                        'name': 'anchor_lines',
                        'render_lines_as_tubes': True
                    }
                    
                    # 计算合适的管道半径
                    try:
                        bounds = getattr(self.mesh, 'bounds', None) or pdata.bounds
                        if bounds:
                            max_dim = max(abs(bounds[1] - bounds[0]), 
                                        abs(bounds[3] - bounds[2]), 
                                        abs(bounds[5] - bounds[4]))
                            tube_radius = max_dim * 0.001  # 模型尺寸的0.1%
                            if hasattr(pdata, 'tube'):
                                tube = pdata.tube(radius=tube_radius)
                                safe_anchor_params.update({
                                    'render_lines_as_tubes': False
                                })
                                self.plotter.add_mesh(tube, **safe_anchor_params)
                            else:
                                self.plotter.add_mesh(pdata, **safe_anchor_params)
                        else:
                            self.plotter.add_mesh(pdata, **safe_anchor_params)
                    except Exception:
                        # 降级为简单线条
                        self.plotter.add_mesh(pdata, color='red', line_width=3.0, name='anchor_lines')
                        
        except Exception as e:
            print(f"⚠️ 叠加层显示失败: {e}")
            
    def _emergency_display_fallback(self):
        """紧急显示降级"""
        try:
            if hasattr(self, 'mesh') and self.mesh:
                # 🔧 修复：安全的降级渲染参数
                fallback_params = {
                    'color': 'gray',
                    'opacity': 0.5,
                    'show_edges': False,  # 关闭边框避免问题
                    'lighting': False,    # 关闭光照避免问题
                    'name': 'emergency_fallback'
                }
                self.plotter.add_mesh(self.mesh, **fallback_params)
                print("✅ 紧急降级显示完成")
        except Exception as e:
            print(f"❌ 紧急降级也失败: {e}")
            # 最后的手段：显示边界框
            try:
                if hasattr(self, 'mesh') and self.mesh:
                    outline = self.mesh.outline()
                    self.plotter.add_mesh(outline, color='black', line_width=2, name='outline_fallback')
                    print("✅ 边界框降级显示完成")
            except:
                pass

        # 显示坐标轴
        self.plotter.show_axes()

        # 自动调整为专业地质工程视图
        # 🎯 专业地质工程相机角度：标准俯视角度，便于观察地层
        self.plotter.reset_camera()
        try:
            # 获取网格边界
            bounds = self.mesh.bounds if hasattr(self, 'mesh') and self.mesh else [-100, 100, -100, 100, -50, 50]
            center_x = (bounds[0] + bounds[1]) / 2
            center_y = (bounds[2] + bounds[3]) / 2  
            center_z = (bounds[4] + bounds[5]) / 2
            
            # 计算模型尺寸
            size_x = bounds[1] - bounds[0]
            size_y = bounds[3] - bounds[2]
            size_z = bounds[5] - bounds[4]
            max_size = max(size_x, size_y, size_z)
            
            # 🚨 专业地质俯视角度：从正上方稍微倾斜观察
            # 相机位置：模型上方，稍微向后（Y负方向）和向右（X正方向）偏移
            cam_distance = max_size * 2.0  # 足够远的距离
            
            cam_x = center_x + max_size * 0.3   # 稍微向东偏移
            cam_y = center_y - max_size * 0.5   # 向南偏移（后退）
            cam_z = center_z + max_size * 1.5   # 大幅向上，俯视角度
            
            # 设置相机位置：从上方俯视，略带倾斜
            self.plotter.camera_position = [
                (cam_x, cam_y, cam_z),           # 相机位置（上方略偏移）
                (center_x, center_y, center_z),  # 看向模型中心
                (0, 1, 0)                        # Y轴向上（修正上方向量）
            ]
            
            # 进一步调整视角
            self.plotter.camera.elevation = -60  # 俯视60度
            self.plotter.camera.azimuth = 30     # 水平旋转30度
            
            print(f"🎯 地质俯视相机: 距离={cam_distance:.1f}, 中心=({center_x:.1f}, {center_y:.1f}, {center_z:.1f})")
            print(f"   模型尺寸: {size_x:.1f}×{size_y:.1f}×{size_z:.1f}")
            
        except Exception as e:
            print(f"⚠️ 相机设置失败，使用默认: {e}")
            # 简单的俯视角度作为备选
            self.plotter.camera_position = [(1, -1, 2), (0, 0, 0), (0, 0, 1)]

        # 强制刷新渲染，避免某些环境下切换模式后短暂空白
        try:
            self.plotter.render()
        except Exception:
            pass

        # 结束计时并记录（容错）
        try:
            import time as _time
            _t0 = getattr(self, '_last_render_t0', None)
            if _t0 is not None:
                self.last_render_ms = (_time.time() - _t0) * 1000.0
            else:
                self.last_render_ms = 0.0
        except Exception:
            self.last_render_ms = 0.0

        # 在角落绘制“材料图例（带色块）”与“性能指标”
        try:
            self._draw_material_legend_if_needed()
        except Exception:
            pass
        try:
            self._draw_metrics_overlay()
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
        """使用半透明效果显示分层土体（修复版）"""
        if not PYVISTA_AVAILABLE or not self.mesh:
            return
            
        try:
            # 🔧 修复：不再重复清空（display_mesh已经清空过了）
            # self.plotter.clear()  # 注释掉，避免双重清除
            # self.set_abaqus_style_background()  # 背景已在display_mesh中设置
            
            # 🔧 关键修复：配置PyVista透明度渲染
            try:
                import pyvista as pv
                # 启用深度剥离以正确渲染多层透明物体
                if hasattr(self.plotter.renderer, 'use_depth_peeling'):
                    self.plotter.renderer.use_depth_peeling = True
                    self.plotter.renderer.maximum_number_of_peels = 4
                    self.plotter.renderer.occlusion_ratio = 0.1
            except Exception as e:
                print(f"深度剥离设置失败: {e}")
            
            print("🔄 开始半透明分层显示...")
            
            # 🔧 修复：根据复选框状态决定显示内容
            if hasattr(self.mesh, 'cell_data') and 'MaterialID' in self.mesh.cell_data:
                print(f"🔍 检测到MaterialID数据，材料种类: {len(np.unique(self.mesh.cell_data['MaterialID']))}")
                # 🔧 关键修复：检查土体显示开关
                show_soil_flag = getattr(self, 'show_soil', True)
                print(f"🔍 土体显示开关: {show_soil_flag}")
                if show_soil_flag:
                    print("✅ 开始显示材料分层...")
                    self._display_material_layers_transparent()
                else:
                    print("🚫 土体显示已关闭，跳过土体渲染")
            else:
                # 回退：整体半透明显示
                print("🔍 未检测到MaterialID，使用整体半透明显示")
                show_soil_flag = getattr(self, 'show_soil', True)
                print(f"🔍 土体显示开关: {show_soil_flag}")
                if show_soil_flag:
                    print("✅ 添加整体半透明网格...")
                    self.plotter.add_mesh(
                        self.mesh,
                        opacity=0.6,
                        color='lightblue',
                        show_edges=False,
                        lighting=True,
                        name='transparent_mesh'
                    )
                    print("✅ 整体半透明网格添加完成")

                    # 确保相机视角合适
                    try:
                        self.plotter.reset_camera()
                        print("✅ 相机视角已重置")
                    except Exception as e:
                        print(f"⚠️ 相机重置失败: {e}")

            # 🔧 修复：工程构件分别控制
            if getattr(self, 'show_diaphragm_wall', True):
                self._render_diaphragm_wall_only()
            if getattr(self, 'show_anchors', True):
                self._render_anchors_only()
            if getattr(self, 'show_piles', True):
                self._render_piles_only()
            if getattr(self, 'show_strutting', True):
                self._render_steel_support_only()

        except Exception as e:
            print(f"半透明分层显示失败: {e}")

    def _render_steel_support_only(self):
        """渲染钢支撑"""
        try:
            print("✅ 钢支撑独立显示: 功能待实现")
        except Exception as e:
            print(f"钢支撑显示失败: {e}")

    def _render_diaphragm_wall_only(self):
        """独立渲染地连墙"""
        try:
            if hasattr(self, 'mesh') and 'MaterialID' in self.mesh.cell_data:
                mat_ids = self.mesh.cell_data['MaterialID']
                # 🔧 修复：地连墙使用材料ID=1，通过单元类型区分
                # 查找三角形单元（VTK_TRIANGLE=5）且材料ID=1的单元
                if hasattr(self.mesh, 'celltypes'):
                    cell_types = self.mesh.celltypes
                    # 地连墙：材料ID=1 + 三角形单元类型
                    wall_mask = (mat_ids == 1) & (cell_types == 5)  # VTK_TRIANGLE
                else:
                    # 兜底：基于材料名称识别
                    name_based_ids = self._get_material_ids_by_keywords(['地连墙', '围护墙', '地下连续墙', 'diaphragm'])
                    candidate_ids = set(name_based_ids) | {1}  # 1 是实际的地连墙材料ID
                    wall_mask = np.isin(mat_ids, list(candidate_ids))
                if np.any(wall_mask):
                    wall_mesh = self.mesh.extract_cells(wall_mask)
                    # 🎨 专业地连墙外观
                    self.plotter.add_mesh(
                        wall_mesh,
                        color=[139, 90, 43],  # 混凝土褐色 (RGB 0-255)
                        opacity=0.85,
                        show_edges=True,
                        edge_color='saddlebrown',
                        line_width=0.6,
                        metallic=0.1,
                        roughness=0.6,
                        lighting=True,
                        smooth_shading=True,
                        name='diaphragm_wall_only'
                    )
                    print(f"✅ 地连墙独立显示: {wall_mesh.n_cells}单元 (材料ID=1, 三角形)")
                else:
                    print("⚠️ 未找到地连墙单元 (材料ID=1 + 三角形)")
        except Exception as e:
            print(f"地连墙独立渲染失败: {e}")
            
    def _render_anchors_only(self):
        """独立渲染锚杆"""
        try:
            if self._anchors_cached is None:
                self._anchors_cached = self._build_anchor_geometry()
            if self._anchors_cached:
                # 🎨 专业锚杆外观
                self.plotter.add_mesh(
                    self._anchors_cached,
                    color=[255, 140, 0],  # 预应力锚杆橙色
                    line_width=4,
                    opacity=0.95,
                    render_lines_as_tubes=True,
                    name='anchors_only'
                )
                print(f"✅ 锚杆独立显示: {self._anchors_cached.n_cells}条线")
        except Exception as e:
            print(f"锚杆独立渲染失败: {e}")
            
    def _render_piles_only(self):
        """独立渲染桩基"""
        try:
            if hasattr(self, 'mesh') and 'MaterialID' in self.mesh.cell_data:
                mat_ids = self.mesh.cell_data['MaterialID']
                # 通过名称识别“桩”，并保留ID=10作为后备
                name_based_ids = self._get_material_ids_by_keywords(['桩', '灌注桩', 'pile'])
                candidate_ids = set(name_based_ids) | {10}
                pile_mask = np.isin(mat_ids, list(candidate_ids))
                if np.any(pile_mask):
                    pile_mesh = self.mesh.extract_cells(pile_mask)
                    # 🎨 专业桩基外观
                    self.plotter.add_mesh(
                        pile_mesh,
                        color=[70, 130, 180],  # 钢蓝色
                        opacity=0.90,
                        show_edges=True,
                        edge_color='navy',
                        line_width=0.5,
                        metallic=0.1,
                        roughness=0.7,
                        lighting=True,
                        smooth_shading=True,
                        name='piles_only'
                    )
                    print(f"✅ 桩基独立显示: {pile_mesh.n_cells}单元")
        except Exception as e:
            print(f"桩基独立渲染失败: {e}")
            
            # 设置相机
            try:
                self.plotter.reset_camera()
                self.plotter.show_axes()
            except:
                pass
                
            print("✅ 半透明分层显示完成")
            
        except Exception as e:
            print(f"❌ 半透明显示失败: {e}")
            # 紧急回退
            try:
                self.plotter.clear()
                self.plotter.add_mesh(self.mesh, color='gray', opacity=0.5, name='fallback')
            except:
                pass
                
    def _display_material_layers_transparent(self):
        """安全的材料分层半透明显示（土体/工程构件分离控制）"""
        try:
            mat_ids = self.mesh.cell_data['MaterialID']
            unique_materials = np.unique(mat_ids)
            
            print(f"🎨 显示 {len(unique_materials)} 种材料的半透明效果")
            
            # 🔧 修复：分离土体和工程构件控制
            soil_materials = [2, 3, 4, 5, 6, 7, 8, 9]      # 土体材料ID
            engineering_materials = [10, 11, 12, 13, 14, 15]  # 工程构件材料ID
            
            # 为每种材料创建半透明显示
            for i, mat_id in enumerate(unique_materials):
                try:
                    # 🔧 关键修复：根据复选框状态过滤显示
                    is_soil = int(mat_id) in soil_materials
                    is_engineering = int(mat_id) in engineering_materials
                    
                    # 土体显示控制
                    if is_soil and not getattr(self, 'show_soil', True):
                        print(f"🚫 跳过土体材料 {mat_id}")
                        continue
                    
                    # 工程构件显示控制
                    if is_engineering:
                        if int(mat_id) == 10 and not getattr(self, 'show_piles', True):
                            print(f"🚫 跳过桩材料 {mat_id}")
                            continue
                        if int(mat_id) == 11 and not getattr(self, 'show_strutting', True):
                            print(f"🚫 跳过钢支撑材料 {mat_id}")
                            continue
                        if int(mat_id) == 12 and not getattr(self, 'show_diaphragm_wall', True):
                            print(f"🚫 跳过混凝土材料 {mat_id}")
                            continue
                    
                    # 提取该材料的单元
                    mask = mat_ids == mat_id
                    if not np.any(mask):
                        continue
                        
                    mat_mesh = self.mesh.extract_cells(mask)
                    if mat_mesh.n_cells == 0:
                        continue
                    
                    # 🎨 获取专业材料外观
                    color, opacity, material_props = self._get_professional_material_appearance(int(mat_id))
                    
                    # 🎨 专业材料渲染（使用增强的材料属性）
                    render_params = {
                        'color': color,
                        'opacity': opacity,
                        'show_edges': material_props.get('show_edges', False),
                        'edge_color': material_props.get('edge_color', 'white'),
                        'line_width': material_props.get('line_width', 0.3),
                        'lighting': True,
                        'smooth_shading': True,
                        'name': f'transparent_material_{mat_id}',
                        'metallic': material_props.get('metallic', 0.0),
                        'roughness': material_props.get('roughness', 0.8),
                        'culling': 'back'
                    }

                    self.plotter.add_mesh(mat_mesh, **render_params)
                    
                    print(f"  材料{mat_id}: {mat_mesh.n_cells}单元, 透明度={opacity:.1f}")
                    
                except Exception as e:
                    print(f"  材料{mat_id}显示失败: {e}")
                    continue
                    
        except Exception as e:
            print(f"❌ 材料分层显示失败: {e}")

        # 确保相机视角合适
        try:
            self.plotter.reset_camera()
            print("✅ 材料分层显示完成，相机视角已重置")
        except Exception as e:
            print(f"⚠️ 相机重置失败: {e}")
            
    def _get_safe_material_color(self, mat_id):
        """获取安全的材料颜色"""
        colors = {
            2: [0.8, 0.6, 0.4],   # 土1 - 棕色
            3: [0.9, 0.7, 0.5],   # 土2 - 浅棕
            4: [0.7, 0.8, 0.6],   # 土3 - 绿棕
            5: [0.6, 0.7, 0.8],   # 土4 - 蓝灰
            6: [0.8, 0.8, 0.6],   # 土5 - 黄灰
            7: [0.7, 0.6, 0.8],   # 土6 - 紫灰
            8: [0.8, 0.7, 0.6],   # 土7 - 灰棕
            9: [0.6, 0.8, 0.7],   # 土8 - 青绿
            10: [0.9, 0.5, 0.5],  # 地连墙 - 红色
            11: [0.5, 0.9, 0.5],  # 结构2 - 绿色
            12: [0.5, 0.5, 0.9],  # 结构3 - 蓝色
        }
        return colors.get(mat_id, [0.7, 0.7, 0.7])  # 默认灰色

        # 检查是否有材料ID信息
        if hasattr(self.mesh, 'cell_data') and 'MaterialID' in self.mesh.cell_data:
            # 根据材料ID分层显示
            all_material_ids = np.unique(self.mesh.cell_data['MaterialID'])

            # 🔧 强化材料过滤逻辑：优先使用 current_active_materials
            if hasattr(self, 'current_active_materials') and self.current_active_materials:
                # 严格过滤：只显示激活的材料（修复类型不匹配问题）
                active_material_set = set(int(mid) for mid in self.current_active_materials)
                material_ids = [mid for mid in all_material_ids if int(mid) in active_material_set]
                removed_materials = [mid for mid in all_material_ids if int(mid) not in active_material_set]
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

            # 🔧 开挖阶段土体显示策略调整 - 强制显示所有材料用于调试
            try:
                is_excavation = self._is_excavation_stage()
                if is_excavation and getattr(self, 'hide_soil_in_excavation_stage', False):  # 默认关闭土体隐藏
                    before = list(material_ids)
                    material_ids = [mid for mid in material_ids if not self._is_soil_material(mid)]
                    print(f"开挖阶段剔除土体: 原有{sorted(list(before))} -> 保留{sorted(list(material_ids))}")
                else:
                    print(f"💡 保持所有材料显示（开挖={is_excavation}，隐藏土体={getattr(self, 'hide_soil_in_excavation_stage', False)}）")
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

            # 🚨 紧急回退：使用稳定的RGBA per-cell着色系统
            # MaterialID分类着色在当前PyVista版本有兼容问题，回退到确保可用的方案
            try:
                n = self.mesh.n_cells
                mid = np.asarray(self.mesh.cell_data['MaterialID'])
                
                # 确保material_ids非空
                if not material_ids:
                    print("⚠️ material_ids为空，使用全部材料")
                    material_ids = list(np.unique(mid))
                
                print(f"🎨 专业地质RGBA着色: {len(material_ids)} 种材料: {sorted([int(x) for x in material_ids])}")
                
                # 🎯 构建专业地质工程RGBA颜色数组
                rgba = np.empty((n, 4), dtype=np.float32)
                rgba[:, :] = [0.7, 0.7, 0.7, 1.0]  # 默认灰色，完全不透明
                
                # 为每种材料分配正确的地质工程颜色
                print(f"🔍 地质材料着色:")
                colored_materials = []
                for mat_id in material_ids:
                    mask = (mid == int(mat_id))
                    cell_count = np.sum(mask)
                    if cell_count > 0:
                        mat_props = material_colors.get(mat_id, {'color': (0.6, 0.7, 0.8), 'opacity': 1.0})
                        color = mat_props['color']
                        alpha = 1.0  # 强制完全不透明
                        rgba[mask, 0:3] = color
                        rgba[mask, 3] = alpha
                        colored_materials.append(f"材料{mat_id}({cell_count}面)")
                        print(f"  材料{mat_id}: RGB{color} -> {mat_props.get('name', '未知')}")
                
                print(f"✅ 地质着色完成: {', '.join(colored_materials)}")
                
                # 将颜色数据写入网格
                self.mesh.cell_data['soil_colors'] = rgba
                
                # 🚨 强制实体显示模式
                self.display_mode = 'solid'
                
                # 添加到场景，使用RGBA per-cell颜色
                self.plotter.add_mesh(
                    self.mesh,
                    scalars='soil_colors',   # 使用专门的土体颜色
                    rgba=True,               # RGBA模式
                    show_scalar_bar=False,   # 隐藏颜色条
                    show_edges=False,        # 🚨 强制关闭边框
                    smooth_shading=True,     # 平滑着色
                    name='soil_layers'       # 土层名称
                )
                
                layer_count = len(material_ids)
                print(f"🚀 地质RGBA着色完成: {layer_count}土层, {n}面")
            except Exception as e:
                print(f"⚠️ MaterialID分类着色失败，降级到优化RGBA: {e}")
                # 🔧 降级策略：优化的uint8 RGBA（比float32节省75%内存）
                try:
                    n = self.mesh.n_cells
                    rgba_uint8 = np.full((n, 4), [204, 204, 204, 180], dtype=np.uint8)  # 默认灰色
                    mid = np.asarray(self.mesh.cell_data['MaterialID'])
                    
                    layer_count = 0
                    for mat_id in material_ids:
                        mask = (mid == int(mat_id))
                        cell_count = np.sum(mask)
                        if cell_count > 0:
                            mat_props = material_colors.get(mat_id, {'color': (0.6, 0.7, 0.8), 'opacity': 0.8})
                            color_255 = [int(c * 255) for c in mat_props['color']]
                            alpha_255 = int(mat_props['opacity'] * 255)
                            rgba_uint8[mask] = color_255 + [alpha_255]
                            layer_count += 1
                    
                    # 转换为float32用于PyVista（仍比原始方案节省内存）
                    rgba_norm = rgba_uint8.astype(np.float32) / 255.0
                    self.mesh.cell_data['plot_colors'] = rgba_norm
                    
                    self.plotter.add_mesh(
                        self.mesh,
                        scalars='plot_colors',
                        rgba=True,
                        show_edges=getattr(self, 'show_mesh_edges', False),
                        edge_color='gray',
                        line_width=0.3,
                        smooth_shading=True,
                        name='materials_rgba_optimized'
                    )
                    print(f"🔧 优化RGBA降级完成: {layer_count}材料层")
                    
                except Exception as e2:
                    print(f"⚠️ 优化RGBA也失败，最终降级到分离网格: {e2}")
                    # 最后的降级策略：分离材料网格（最稳定但性能较低）
                    layer_count = 0
                    for mat_id in material_ids:
                        try:
                            mat_mesh = self.mesh.threshold([mat_id - 0.5, mat_id + 0.5], scalars='MaterialID')
                            if mat_mesh.n_points > 0:
                                mat_props = material_colors.get(mat_id, {'color': 'lightblue','opacity': 0.6})
                                self.plotter.add_mesh(
                                    mat_mesh,
                                    color=mat_props['color'],
                                    opacity=mat_props['opacity'],
                                    show_edges=getattr(self, 'show_mesh_edges', False),  # 默认关闭边框
                                    edge_color='white',
                                    line_width=0.5,
                                    name=f'material_{mat_id}'
                                )
                                layer_count += 1
                        except Exception as e3:
                            print(f"显示材料{mat_id}最终降级时出错: {e3}")

            # ✅ 阶段1核心稳定性优化完成：MaterialID分类着色系统
            # 大幅减少内存占用，提升OpenGL兼容性，防止wglMakeCurrent失败
            if layer_count == 0 and not self._is_excavation_stage():
                #print("⚠️ 未显示任何材料层，回退为整体半透明显示")  # 降噪
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

    # 材料图例与指标在本方法末尾由 display_mesh 统一处理

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
            # 🎨 专业岩土工程背景渐变
            self.plotter.set_background(
                color=[0.92, 0.92, 0.95],   # 底部浅灰蓝色 (更柔和)
                top=[0.15, 0.25, 0.45]      # 顶部深蓝色 (更深邃)
            )

            # 🔆 增强光照效果
            try:
                # 设置环境光
                self.plotter.add_light(pv.Light(
                    position=(0, 0, 1000),
                    focal_point=(0, 0, 0),
                    color='white',
                    intensity=0.8,
                    light_type='scenelight'
                ))

                # 添加方向光增强立体感
                self.plotter.add_light(pv.Light(
                    position=(500, 500, 800),
                    focal_point=(0, 0, 0),
                    color='white',
                    intensity=0.6,
                    light_type='scenelight'
                ))

                print("✅ 专业光照系统设置完成")
            except Exception as e:
                print(f"光照设置失败: {e}")
            print("✅ Abaqus风格渐变背景设置成功")
        except Exception as e:
            # 如果渐变不支持，使用Abaqus风格的单色背景
            self.plotter.set_background([0.45, 0.5, 0.65])  # 类似Abaqus的中性蓝灰色
            print(f"渐变背景不支持，使用单色背景: {e}")

    # ---------- 叠加：材料图例与性能指标 ----------
    def _draw_material_legend_if_needed(self):
        if not (PYVISTA_AVAILABLE and self.plotter and getattr(self, 'show_material_legend', True)):
            return
        try:
            if not hasattr(self.mesh, 'cell_data') or 'MaterialID' not in self.mesh.cell_data:
                return
            import numpy as np
            mid_arr = np.asarray(self.mesh.cell_data['MaterialID']).astype(int)
            unique_mids = np.unique(mid_arr)
            if unique_mids.size == 0 or unique_mids.size > 12:
                # 避免过长图例
                return

            # 移除旧图例
            try:
                self.plotter.remove_legend()
            except Exception:
                pass
            try:
                self.plotter.remove_actor(self._metrics_actor_names['legend'])
            except Exception:
                pass

            # 使用可滚动图例面板替代内置Legend
            if self._legend_panel is not None:
                items = []
                for mid in unique_mids.tolist():
                    mat = self.materials.get(int(mid), {}) if hasattr(self, 'materials') else {}
                    name = mat.get('name', f'Material_{int(mid)}') if isinstance(mat, dict) else f'Material_{int(mid)}'
                    try:
                        count = int((mid_arr == int(mid)).sum())
                    except Exception:
                        count = 0
                    color = self.get_material_color(int(mid), name)
                    items.append({'id': int(mid), 'name': name, 'count': count, 'color': color})
                # 排序：按id
                try:
                    items.sort(key=lambda x: int(x.get('id', 0)))
                except Exception:
                    pass
                self._legend_panel.set_items(items)
                self._legend_panel.show_panel(True)
            else:
                # 回退：使用内置Legend，避免完全无图例
                entries = []
                for mid in unique_mids.tolist():
                    mat = self.materials.get(int(mid), {}) if hasattr(self, 'materials') else {}
                    name = mat.get('name', f'Material_{int(mid)}') if isinstance(mat, dict) else f'Material_{int(mid)}'
                    color = self.get_material_color(int(mid), name)
                    try:
                        count = int((mid_arr == int(mid)).sum())
                    except Exception:
                        count = 0
                    label = f"{int(mid)}: {name} ({count})" if count > 0 else f"{int(mid)}: {name}"
                    entries.append([label, color])
                self.plotter.add_legend(entries, border=True)
        except Exception as e:
            print(f"材料图例绘制失败: {e}")

    def apply_geotechnical_colors(self) -> int:
        """应用岩土工程配色到当前网格（基于 MaterialID → RGBA per-cell）
        返回已着色的材料层数。
        """
        if not (PYVISTA_AVAILABLE and self.mesh and hasattr(self.mesh, 'cell_data') and 'MaterialID' in self.mesh.cell_data):
            return 0
        try:
            import numpy as np
            mid = np.asarray(self.mesh.cell_data['MaterialID']).astype(int)
            unique_mids = np.unique(mid)
            if unique_mids.size == 0:
                return 0
            n = int(self.mesh.n_cells)
            rgba = np.full((n, 4), [0.7, 0.7, 0.7, 1.0], dtype=np.float32)
            layers = 0
            for m in unique_mids.tolist():
                mat = self.materials.get(int(m), {}) if hasattr(self, 'materials') else {}
                name = mat.get('name', f'Material_{int(m)}') if isinstance(mat, dict) else f'Material_{int(m)}'
                color = self.get_material_color(int(m), name)
                mask = (mid == int(m))
                if mask.any():
                    rgba[mask, 0:3] = color
                    rgba[mask, 3] = 1.0
                    layers += 1
            self.mesh.cell_data['soil_colors'] = rgba
            return layers
        except Exception as e:
            print(f"应用岩土配色失败: {e}")
            return 0

    def _draw_metrics_overlay(self):
        if not (PYVISTA_AVAILABLE and self.plotter):
            return
        try:
            # 统计信息
            n_cells = 0
            try:
                n_cells = int(getattr(self.mesh, 'n_cells', 0))
            except Exception:
                n_cells = 0
            lod = getattr(self, '_current_lod_level', getattr(self, '_original_lod_level', 'auto'))
            ms = float(getattr(self, 'last_render_ms', 0.0) or 0.0)
            fps = 0.0 if ms <= 0 else 1000.0 / ms

            text = f"面数: {n_cells:,} | LOD: {lod} | 渲染: {ms:.1f} ms | FPS: {fps:.1f}"

            # 先移除旧的
            try:
                self.plotter.remove_actor(self._metrics_actor_names['metrics'])
            except Exception:
                pass
            # 添加右下角文本
            self.plotter.add_text(
                text,
                position='lower_right',
                font_size=10,
                color='white',
                name=self._metrics_actor_names['metrics']
            )
        except Exception as e:
            print(f"指标覆盖绘制失败: {e}")

    def set_show_material_legend(self, enabled: bool):
        self.show_material_legend = bool(enabled)
        try:
            # 面板显隐
            if self._legend_panel is not None:
                self._legend_panel.show_panel(self.show_material_legend)
            self.display_mesh()
        except Exception:
            pass

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
        """线框模式显示（专业CAE版）"""
        if not PYVISTA_AVAILABLE or not self.mesh:
            return
            
        try:
            # 🔧 修复：清空现有显示
            self.plotter.clear()
            self.set_abaqus_style_background()
            
            print("🔄 开始专业线框模式显示...")
            
            # 🔧 修复：只显示外边界轮廓，不显示内部网格
            try:
                # 提取整体外表面
                surface = self.mesh.extract_surface()
                
                # 🔧 关键修复：只显示关键边缘，不是所有边
                edges = surface.extract_feature_edges(
                    boundary_edges=True,      # 边界边
                    non_manifold_edges=True,  # 非流形边  
                    feature_edges=False,      # 不要特征边
                    manifold_edges=False      # 不要流形边
                )
                
                if edges.n_cells > 0:
                    self.plotter.add_mesh(
                        edges,
                        color='black',
                        line_width=2,
                        opacity=1.0,
                        name='boundary_edges'
                    )
                    print(f"✅ 边界线框: {edges.n_cells}条边")
                else:
                    # 回退：显示外表面线框
                    self.plotter.add_mesh(
                        surface,
                        style='wireframe',
                        color='black',
                        line_width=1,
                        opacity=1.0,
                        name='surface_wireframe'
                    )
                    print(f"✅ 表面线框: {surface.n_cells}个面")
                    
            except Exception as e:
                print(f"线框提取失败: {e}")
                # 最后回退：简单外表面
                surface = self.mesh.extract_surface()
                self.plotter.add_mesh(
                    surface,
                    style='wireframe',
                    color='gray',
                    line_width=1,
                    name='fallback_wireframe'
                )
                
            # 🔧 修复：显示工程构件轮廓
            if getattr(self, 'show_diaphragm_wall', True):
                self._render_diaphragm_wall_wireframe()
            if getattr(self, 'show_anchors', True):
                self._render_anchors_wireframe()
                
            # 设置相机
            try:
                self.plotter.reset_camera()
                self.plotter.show_axes()
            except:
                pass
                
            print("✅ 专业线框模式显示完成")
            
        except Exception as e:
            print(f"❌ 线框模式失败: {e}")
            # 紧急回退
            try:
                surface = self.mesh.extract_surface()
                self.plotter.add_mesh(surface, style='wireframe', color='black', name='emergency_wireframe')
            except:
                pass
                
    def _render_diaphragm_wall_wireframe(self):
        """渲染地连墙线框"""
        try:
            if hasattr(self, 'mesh') and 'MaterialID' in self.mesh.cell_data:
                mat_ids = self.mesh.cell_data['MaterialID']
                wall_mask = np.isin(mat_ids, [10, 11, 12, 13, 14, 15])
                if np.any(wall_mask):
                    wall_mesh = self.mesh.extract_cells(wall_mask)
                    wall_edges = wall_mesh.extract_surface().extract_feature_edges()
                    if wall_edges.n_cells > 0:
                        self.plotter.add_mesh(
                            wall_edges,
                            color='red',
                            line_width=3,
                            name='diaphragm_wall_wireframe'
                        )
                        print(f"✅ 地连墙线框: {wall_edges.n_cells}条边")
        except Exception as e:
            print(f"地连墙线框失败: {e}")
            
    def _render_anchors_wireframe(self):
        """渲染锚杆线框"""
        try:
            if self._anchors_cached is None:
                self._anchors_cached = self._build_anchor_geometry()
            if self._anchors_cached:
                self.plotter.add_mesh(
                    self._anchors_cached,
                    color='yellow',
                    line_width=2,
                    name='anchors_wireframe'
                )
                print(f"✅ 锚杆线框: {self._anchors_cached.n_cells}条线")
        except Exception as e:
            print(f"锚杆线框失败: {e}")

        # 检查是否有材料ID信息
        if False:  # 禁用原有复杂逻辑
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

                        # 🎨 使用专业材料外观配置
                        color_rgb, opacity, material_props = self._get_professional_material_appearance(int(mat_id))

                        # 实体模式：完全不透明，增强材质效果
                        render_params = {
                            'color': color_rgb,
                            'opacity': 1.0,  # 实体模式强制不透明
                            'show_edges': material_props.get('show_edges', True),
                            'edge_color': material_props.get('edge_color', 'black'),
                            'line_width': material_props.get('line_width', 0.3),
                            'lighting': True,
                            'smooth_shading': True,
                            'name': f'solid_material_{mat_id}',
                            'label': name,
                            'metallic': material_props.get('metallic', 0.0),
                            'roughness': material_props.get('roughness', 0.8)
                        }

                        # 金属材料使用PBR渲染
                        if material_props.get('metallic', 0.0) > 0.3:
                            render_params['pbr'] = True

                        actor = self.plotter.add_mesh(use_mesh, **render_params)
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
                    # 🎨 专业默认外观
                    actor = self.plotter.add_mesh(
                        use_mesh,
                        color=[140, 163, 181],  # 专业蓝灰色
                        opacity=1.0,
                        show_edges=True,
                        edge_color='darkslategray',
                        line_width=0.3,
                        lighting=True,
                        smooth_shading=True
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
            # 🎨 专业默认外观
            actor = self.plotter.add_mesh(
                use_mesh,
                color=[140, 163, 181],  # 专业蓝灰色
                opacity=1.0,
                show_edges=True,
                edge_color='darkslategray',
                line_width=0.3,
                lighting=True,
                smooth_shading=True
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
        """切换锚杆(线元)显示（修复版）"""
        if enabled is None:
            self.show_anchors = not self.show_anchors
        else:
            self.show_anchors = bool(enabled)
        
        print(f"🔧 锚杆显示: {'开' if self.show_anchors else '关'}")
        
        # 🔧 修复：立即处理锚杆显示/隐藏
        try:
            if self.show_anchors:
                # 显示锚杆
                if self._anchors_cached is None:
                    print("🔄 重新构建锚杆几何...")
                    self._anchors_cached = self._build_anchor_geometry()
                
                if self._anchors_cached is not None:
                    # 先移除旧的
                    try:
                        self.plotter.remove_actor('anchor_lines')
                    except:
                        pass
                    
                    # 🔧 修复：使用更醒目的锚杆显示效果
                    # 🎨 专业锚杆管状显示
                    self.plotter.add_mesh(
                        self._anchors_cached,
                        color=[255, 140, 0],  # 专业橙色 (RGB 0-255)
                        line_width=5.0,
                        opacity=0.95,
                        render_lines_as_tubes=True,
                        name='anchor_lines'
                    )
                    print(f"✅ 锚杆显示成功: {self._anchors_cached.n_cells}条线")
                else:
                    print("❌ 锚杆几何构建失败，无法显示")
            else:
                # 隐藏锚杆
                try:
                    self.plotter.remove_actor('anchor_lines')
                    print("✅ 锚杆已隐藏")
                except:
                    pass
                    
        except Exception as e:
            print(f"❌ 锚杆显示切换失败: {e}")
            
        # 刷新显示
        try:
            self.plotter.render()
        except:
            pass

    def shutdown_viewer(self) -> None:
        """安全关闭并清理 PyVista/Qt 资源，避免 Windows 上 wglMakeCurrent 退出报错。"""
        try:
            # 先尝试移除叠加和主体
            if getattr(self, 'plotter', None):
                try:
                    self.plotter.clear()
                except Exception:
                    pass
                try:
                    # QtInteractor 支持 close() 做干净释放
                    self.plotter.close()
                except Exception:
                    pass
        finally:
            # 释放引用，交给 Qt 垃圾回收
            try:
                self.plotter = None
            except Exception:
                pass
            try:
                if getattr(self, 'viewer_widget', None):
                    self.viewer_widget.deleteLater()
            except Exception:
                pass

    # ====== 性能与LOD策略 ======
    # 可调整默认阈值（若引入配置文件，可在初始化时覆盖）
    MAX_FULL_CELLS = 400_000          # 小于该值：完整显示（放宽，200k视为小/中）
    MAX_SURFACE_CELLS = 1_200_000     # 介于两值：仅外表面（放宽阈值）
    DECIMATE_REDCTION = 0.5           # 超大模型：外表面后再抽稀（去掉约50%三角面）
    AUTO_SIMPLIFY = True

    performance_mode = 'auto'  # 'auto' | 'fast' | 'quality'

    def set_performance_mode(self, mode: str):
        mode = (mode or 'auto').lower()
        if mode in ('auto', 'fast', 'quality'):
            self.performance_mode = mode
            print(f"设置性能模式: {self.performance_mode}")
            try:
                self.display_mesh()
            except Exception:
                pass

    def _memory_guard(self, estimated_cells: int) -> bool:
        """内存防护：返回是否需要启用简化。
        简单估算显存/内存占用，若超过可用内存一定比例则建议简化。
        """
        try:
            import psutil  # 可选依赖
            avail = psutil.virtual_memory().available
        except Exception:
            # 无psutil时，用一个保守阈值（比如4GB）
            avail = 4 * (1024 ** 3)

        # 粗估：每单元占 ~ 400-800 bytes（坐标、连接、标量、索引等），取600B平均
        estimated_bytes = int(estimated_cells * 600)
        need_simplify = estimated_bytes > int(avail * 0.5)
        print(f"内存评估: 估算 {estimated_bytes/1e6:.1f} MB, 可用 {avail/1e6:.1f} MB, 需要简化={need_simplify}")
        return need_simplify

    def _smart_decimate(self, surf_mesh: 'pv.PolyData', reduction: float = None) -> 'pv.PolyData':
        """对表面网格做智能抽稀，尽量保持边界特征，保留MaterialID着色。
        reduction: 0.85 表示去除85%的面（更轻）。
        """
        if not PYVISTA_AVAILABLE or surf_mesh is None or surf_mesh.n_cells == 0:
            return surf_mesh
        try:
            r = self.DECIMATE_REDCTION if reduction is None else float(reduction)
            r = min(max(r, 0.0), 0.98)  # 限制范围
            before = surf_mesh.n_cells
            dec = surf_mesh.decimate_proportion(r, preserve_topology=False) if hasattr(surf_mesh, 'decimate_proportion') else surf_mesh.decimate(r)
            after = dec.n_cells
            print(f"✅ 抽稀: {before} -> {after} 三角面 (reduction={r})")
            # MaterialID通常随cell_data传递；若丢失，回退复制
            try:
                if 'MaterialID' not in dec.cell_data and 'MaterialID' in surf_mesh.cell_data:
                    # 简单回退：统一赋默认色（会在后续按单元颜色覆盖）
                    pass
            except Exception:
                pass
            return dec
        except Exception as e:
            print(f"⚠️ 抽稀失败，使用原表面: {e}")
            return surf_mesh

    def _apply_lod(self):
        """根据阈值、模式与内存状况，切换为外表面/抽稀等简化显示。"""
        if not PYVISTA_AVAILABLE or self.mesh is None:
            return
        try:
            n_cells = self.mesh.n_cells
            mode = self.performance_mode
            need_simplify = False
            if mode == 'fast':
                need_simplify = True
            elif mode == 'quality':
                need_simplify = False
            else:  # auto
                if self.AUTO_SIMPLIFY and (n_cells > self.MAX_SURFACE_CELLS or self._memory_guard(n_cells)):
                    need_simplify = True

            if not need_simplify and n_cells <= self.MAX_FULL_CELLS:
                self.lod_info = f"完整显示: {n_cells} 单元"
                return

            # 仅外表面
            if n_cells <= self.MAX_SURFACE_CELLS and mode != 'quality':
                print("⚙️ 启用LOD: 仅外表面")
                # 如尚未是表面，多做一次提取且映射MaterialID
                try:
                    if not isinstance(self.mesh, pv.PolyData):
                        vol = getattr(self, '_volume_mesh', None) or self.mesh
                        surface_mesh = vol.extract_surface(pass_cellid=True)
                        if 'vtkOriginalCellIds' in surface_mesh.cell_data and 'MaterialID' in vol.cell_data:
                            orig_ids = np.asarray(surface_mesh.cell_data['vtkOriginalCellIds'], dtype=int)
                            mids = np.asarray(vol.cell_data['MaterialID'])
                            surface_mesh.cell_data['MaterialID'] = mids[orig_ids].astype(np.int32)
                        self.mesh = surface_mesh
                    self.lod_info = f"外表面显示: {self.mesh.n_cells} 面"
                except Exception as e:
                    print(f"外表面转换失败: {e}")
                return

            # 超大模型：外表面 + 抽稀
            print("⚙️ 启用LOD: 外表面 + 抽稀")
            try:
                vol = getattr(self, '_volume_mesh', None) or self.mesh
                if not isinstance(self.mesh, pv.PolyData):
                    surface_mesh = vol.extract_surface(pass_cellid=True)
                    if 'vtkOriginalCellIds' in surface_mesh.cell_data and 'MaterialID' in vol.cell_data:
                        orig_ids = np.asarray(surface_mesh.cell_data['vtkOriginalCellIds'], dtype=int)
                        mids = np.asarray(vol.cell_data['MaterialID'])
                        surface_mesh.cell_data['MaterialID'] = mids[orig_ids].astype(np.int32)
                else:
                    surface_mesh = self.mesh
                dec = self._smart_decimate(surface_mesh, self.DECIMATE_REDCTION)
                self.mesh = dec
                self.lod_info = f"外表面+抽稀: {self.mesh.n_cells} 面"
            except Exception as e:
                print(f"LOD抽稀失败，保留当前网格: {e}")
                self.lod_info = f"LOD失败，当前: {self.mesh.n_cells} 单元/面"
        except Exception as e:
            print(f"应用LOD时异常: {e}")

    def _build_anchor_geometry(self):
        """从已解析的FPN数据构建锚杆线几何（修复版）"""
        if not PYVISTA_AVAILABLE:
            return None
        if not hasattr(self, 'fpn_data') or not self.fpn_data:
            print("⚠️ 锚杆构建失败：无FPN数据")
            return None
        try:
            import pyvista as pv
            anchor_lines = []
            
            # 🔧 修复：多源数据解析锚杆线元
            line_elems = self.fpn_data.get('line_elements') or {}
            nodes = self.fpn_data.get('nodes') or []
            
            # 构建节点坐标映射
            nid2xyz = {}
            if isinstance(nodes, list):
                for n in nodes:
                    if isinstance(n, dict) and 'id' in n:
                        nid2xyz[int(n['id'])] = (n['x'], n['y'], n['z'])
            elif isinstance(nodes, dict):
                for k, v in nodes.items():
                    if isinstance(v, dict):
                        nid2xyz[int(k)] = (v['x'], v['y'], v['z'])
            
            print(f"🔍 锚杆几何构建: 找到 {len(nid2xyz)} 个节点")
            
            # 🔧 修复：扩展线元素搜索范围
            if isinstance(line_elems, dict) and line_elems:
                for eid, le in line_elems.items():
                    try:
                        if isinstance(le, dict):
                            n1, n2 = int(le.get('n1', 0)), int(le.get('n2', 0))
                            if n1 in nid2xyz and n2 in nid2xyz:
                                a, b = nid2xyz[n1], nid2xyz[n2]
                                anchor_lines.append(((a[0], a[1], a[2]), (b[0], b[1], b[2])))
                    except (ValueError, KeyError, TypeError) as e:
                        print(f"⚠️ 跳过无效线元素 {eid}: {e}")
                        continue
            
            # 🔧 修复：添加备用搜索策略 - 从materials中查找锚杆类型元素
            if not anchor_lines and hasattr(self, 'materials'):
                print("🔄 备用策略：从材料信息中搜索锚杆元素")
                for mat_id, mat_info in self.materials.items():
                    if isinstance(mat_info, dict):
                        mat_name = mat_info.get('name', '').lower()
                        if '锚杆' in mat_name or 'anchor' in mat_name:
                            # 查找该材料对应的元素
                            if hasattr(self, 'mesh') and self.mesh:
                                mat_mask = self.mesh.cell_data.get('MaterialID', []) == int(mat_id)
                                if np.any(mat_mask):
                                    # 提取该材料的边界线作为锚杆
                                    mat_mesh = self.mesh.extract_cells(mat_mask)
                                    edges = mat_mesh.extract_all_edges()
                                    if edges.n_cells > 0:
                                        print(f"✅ 从材料{mat_id}({mat_name})中提取{edges.n_cells}条锚杆边")
                                        return edges
            
            # 构建合并的 PolyData
            if not anchor_lines:
                print("❌ 未发现锚杆线元可显示")
                return None
                
            print(f"✅ 构建锚杆几何: 共 {len(anchor_lines)} 条线元")
            
            # 🔧 修复：使用更高效的多线构建方法
            all_points = []
            all_lines = []
            point_id = 0
            
            for p0, p1 in anchor_lines:
                all_points.extend([p0, p1])
                all_lines.append([2, point_id, point_id + 1])
                point_id += 2
            
            pdata = pv.PolyData(all_points, lines=all_lines)
            return pdata
            
        except Exception as e:
            print(f"❌ 构建锚杆几何失败: {e}")
            import traceback
            traceback.print_exc()
            return None
            
    def _display_main_mesh_safe(self):
        """安全的主网格显示"""
        try:
            if not self.mesh:
                return

            # 🔧 安全渲染参数
            safe_params = {
                'show_edges': False,           # 强制关闭边框避免异常
                'opacity': 0.8,
                'smooth_shading': True,
                'lighting': True,
                'ambient': 0.3,
                'diffuse': 0.7,
                'specular': 0.1,
                'culling': 'back'              # 🔧 解决背面伪影
            }

            # 🔧 材料着色（如果有MaterialID）
            if hasattr(self.mesh, 'cell_data') and 'MaterialID' in self.mesh.cell_data:
                colors = self._compute_safe_material_colors()
                if colors is not None:
                    safe_params.update({
                        'scalars': colors,
                        'rgb': True,
                        'preference': 'cell'
                    })
                else:
                    safe_params['color'] = 'lightsteelblue'
            else:
                safe_params['color'] = 'lightsteelblue'

            self.plotter.add_mesh(self.mesh, **safe_params, name='main_mesh')
            print("✅ 主体网格安全显示完成")

        except Exception as e:
            print(f"⚠️ 主体网格显示失败: {e}")
            # 降级到最基本显示
            try:
                self.plotter.add_mesh(self.mesh, color='gray', opacity=0.5, name='fallback_mesh')
            except:
                pass
                
    def _compute_safe_material_colors(self):
        """专业岩土工程材料配色计算"""
        try:
            mat_ids = self.mesh.cell_data['MaterialID']
            colors = np.zeros((len(mat_ids), 3), dtype=np.uint8)

            # 🎨 专业岩土工程配色方案 (基于地质勘察标准)
            PROFESSIONAL_GEOTECHNICAL_COLORS = {
                # === 土体材料 (自然地质色系) ===
                1: [139, 115, 85],    # 填土 - 深土褐色
                2: [160, 130, 98],    # 粉质粘土 - 中土褐色
                3: [181, 148, 116],   # 细砂 - 浅土褐色
                4: [205, 170, 125],   # 中砂 - 沙土色
                5: [218, 185, 140],   # 粗砂 - 浅沙色
                6: [139, 125, 107],   # 粉土 - 灰褐色
                7: [120, 105, 88],    # 粘土 - 深灰褐色
                8: [98, 85, 70],      # 淤泥质土 - 深褐色
                9: [75, 60, 48],      # 强风化岩 - 深岩色

                # === 工程材料 (专业工程色系) ===
                10: [70, 130, 180],   # 混凝土桩 - 钢蓝色
                11: [169, 169, 169],  # 钢支撑 - 银灰色
                12: [139, 90, 43],    # 地连墙 - 混凝土褐色

                # === 支护材料 (安全标识色系) ===
                46: [255, 140, 0],    # 预应力锚杆 - 橙色
                47: [255, 165, 0],    # 锚杆 - 橙黄色
                48: [255, 69, 0],     # 土钉 - 橙红色
                49: [255, 99, 71],    # 注浆体 - 番茄色
                50: [255, 127, 80],   # 加固体 - 珊瑚色

                # === 特殊材料 ===
                80: [128, 128, 128],  # 临时材料 - 中灰色
                81: [105, 105, 105],  # 失效材料 - 深灰色
                82: [192, 192, 192],  # 备用材料 - 浅灰色
                83: [211, 211, 211],  # 辅助材料 - 亮灰色

                # === 高ID材料 (渐变色系) ===
                602: [72, 61, 139],   # 深紫色
                611: [123, 104, 238], # 中紫色
                649: [147, 112, 219], # 浅紫色
                695: [186, 85, 211],  # 兰花紫
                706: [138, 43, 226],  # 蓝紫色
                735: [148, 0, 211],   # 深紫罗兰
                803: [75, 0, 130],    # 靛青色
                818: [102, 51, 153],  # 深紫色
                833: [127, 0, 255],   # 紫色
                847: [153, 50, 204],  # 深兰花紫
                857: [186, 85, 211],  # 兰花紫
                890: [221, 160, 221], # 梅红色
                906: [238, 130, 238], # 紫罗兰
                979: [255, 192, 203], # 粉红色
                989: [255, 182, 193], # 浅粉红
                1011: [255, 105, 180],# 热粉红
                1025: [255, 20, 147], # 深粉红
                1052: [199, 21, 133], # 中紫红
                1065: [219, 112, 147],# 古紫红
                1081: [255, 240, 245],# 薰衣草红
                1092: [250, 240, 230],# 亚麻色
                1394: [245, 245, 220],# 米色
                1710: [255, 228, 196],# 饼干色
                1711: [255, 218, 185],# 桃仁色
                1712: [255, 222, 173],# 纳瓦霍白
            }

            for i, mat_id in enumerate(mat_ids):
                color = PROFESSIONAL_GEOTECHNICAL_COLORS.get(int(mat_id), [150, 150, 150])
                colors[i] = color

            return colors

        except Exception as e:
            print(f"材料颜色计算失败: {e}")
            return None

    def _get_professional_material_appearance(self, material_id: int):
        """获取专业材料外观配置 (颜色+透明度+渲染属性)"""
        try:
            # 🎨 专业岩土工程材料外观配置
            PROFESSIONAL_MATERIAL_APPEARANCE = {
                # === 土体材料 (自然地质外观) ===
                1: {  # 填土
                    'color': [139, 115, 85],
                    'opacity': 0.75,
                    'metallic': 0.0,
                    'roughness': 0.9,
                    'show_edges': False,
                    'edge_color': 'darkbrown',
                    'line_width': 0.2
                },
                2: {  # 粉质粘土
                    'color': [160, 130, 98],
                    'opacity': 0.70,
                    'metallic': 0.0,
                    'roughness': 0.85,
                    'show_edges': False,
                    'edge_color': 'brown',
                    'line_width': 0.2
                },
                3: {  # 细砂
                    'color': [181, 148, 116],
                    'opacity': 0.65,
                    'metallic': 0.1,
                    'roughness': 0.8,
                    'show_edges': False,
                    'edge_color': 'tan',
                    'line_width': 0.2
                },
                4: {  # 中砂
                    'color': [205, 170, 125],
                    'opacity': 0.65,
                    'metallic': 0.1,
                    'roughness': 0.75,
                    'show_edges': False,
                    'edge_color': 'sandybrown',
                    'line_width': 0.2
                },
                5: {  # 粗砂
                    'color': [218, 185, 140],
                    'opacity': 0.60,
                    'metallic': 0.15,
                    'roughness': 0.7,
                    'show_edges': False,
                    'edge_color': 'wheat',
                    'line_width': 0.2
                },
                6: {  # 粉土
                    'color': [139, 125, 107],
                    'opacity': 0.70,
                    'metallic': 0.0,
                    'roughness': 0.9,
                    'show_edges': False,
                    'edge_color': 'gray',
                    'line_width': 0.2
                },
                7: {  # 粘土
                    'color': [120, 105, 88],
                    'opacity': 0.75,
                    'metallic': 0.0,
                    'roughness': 0.95,
                    'show_edges': False,
                    'edge_color': 'darkgray',
                    'line_width': 0.2
                },
                8: {  # 淤泥质土
                    'color': [98, 85, 70],
                    'opacity': 0.80,
                    'metallic': 0.0,
                    'roughness': 1.0,
                    'show_edges': False,
                    'edge_color': 'black',
                    'line_width': 0.2
                },
                9: {  # 强风化岩
                    'color': [75, 60, 48],
                    'opacity': 0.85,
                    'metallic': 0.2,
                    'roughness': 0.6,
                    'show_edges': True,
                    'edge_color': 'darkslategray',
                    'line_width': 0.3
                },

                # === 工程材料 (专业工程外观) ===
                10: {  # 混凝土桩
                    'color': [70, 130, 180],
                    'opacity': 0.90,
                    'metallic': 0.1,
                    'roughness': 0.7,
                    'show_edges': True,
                    'edge_color': 'navy',
                    'line_width': 0.5
                },
                11: {  # 钢支撑
                    'color': [169, 169, 169],
                    'opacity': 0.95,
                    'metallic': 0.8,
                    'roughness': 0.2,
                    'show_edges': True,
                    'edge_color': 'darkgray',
                    'line_width': 0.8
                },
                12: {  # 地连墙
                    'color': [139, 90, 43],
                    'opacity': 0.85,
                    'metallic': 0.1,
                    'roughness': 0.6,
                    'show_edges': True,
                    'edge_color': 'saddlebrown',
                    'line_width': 0.6
                },

                # === 支护材料 (醒目安全色系) ===
                46: {  # 预应力锚杆
                    'color': [255, 140, 0],
                    'opacity': 0.95,
                    'metallic': 0.6,
                    'roughness': 0.3,
                    'show_edges': True,
                    'edge_color': 'darkorange',
                    'line_width': 1.0
                },
                47: {  # 锚杆
                    'color': [255, 165, 0],
                    'opacity': 0.90,
                    'metallic': 0.5,
                    'roughness': 0.4,
                    'show_edges': True,
                    'edge_color': 'orange',
                    'line_width': 0.8
                }
            }

            # 获取材料配置
            config = PROFESSIONAL_MATERIAL_APPEARANCE.get(material_id)

            if config:
                # 转换RGB到0-1范围
                color_rgb = [c/255.0 for c in config['color']]
                opacity = config['opacity']
                material_props = {
                    'metallic': config['metallic'],
                    'roughness': config['roughness'],
                    'show_edges': config['show_edges'],
                    'edge_color': config['edge_color'],
                    'line_width': config['line_width']
                }
            else:
                # 默认土体外观
                color_rgb = self.get_material_color(material_id)
                opacity = 0.70
                material_props = {
                    'metallic': 0.0,
                    'roughness': 0.8,
                    'show_edges': False,
                    'edge_color': 'gray',
                    'line_width': 0.2
                }

            return color_rgb, opacity, material_props

        except Exception as e:
            print(f"材料外观配置失败: {e}")
            # 安全回退
            return [0.7, 0.7, 0.7], 0.7, {'metallic': 0.0, 'roughness': 0.8, 'show_edges': False, 'edge_color': 'gray', 'line_width': 0.2}

    def _force_display_engineering_components(self):
        """强制显示工程构件 - 不受保护机制影响"""
        try:
            # 🏗️ 地连墙 - 强制显示
            if hasattr(self, 'fpn_data') and self.fpn_data:
                diaphragm_elements = self._extract_diaphragm_wall_elements()
                if diaphragm_elements:
                    self._render_diaphragm_wall(diaphragm_elements)

            # ⚡ 锚杆 - 强制显示
            anchor_elements = self._extract_anchor_elements()
            if anchor_elements:
                self._render_anchors(anchor_elements)

            print("✅ 关键工程构件已强制显示")

        except Exception as e:
            print(f"⚠️ 工程构件显示部分失败: {e}")
            
    def _extract_diaphragm_wall_elements(self):
        """从FPN提取地连墙元素"""
        elements = []
        if not hasattr(self, 'fpn_data') or not self.fpn_data:
            return elements

        try:
            # 策略1: 根据材料ID识别混凝土构件
            all_elements = self.fpn_data.get('elements', {})
            if isinstance(all_elements, list):
                all_elements = {i: elem for i, elem in enumerate(all_elements)}
                
            for eid, elem in all_elements.items():
                if isinstance(elem, dict):
                    material_id = elem.get('material_id', elem.get('material', 0))
                    # 地连墙通常使用混凝土材料 (ID: 10-15)
                    if 10 <= int(material_id) <= 15:
                        elements.append(elem)

            print(f"🏗️ 发现地连墙元素: {len(elements)}个")
        except Exception as e:
            print(f"⚠️ 提取地连墙元素失败: {e}")

        return elements
        
    def _extract_anchor_elements(self):
        """从FPN提取锚杆元素"""
        elements = []
        try:
            # 从line_elements中提取
            line_elems = getattr(self, 'fpn_data', {}).get('line_elements', {})
            for eid, elem in line_elems.items():
                if isinstance(elem, dict):
                    elements.append(elem)
            print(f"⚡ 发现锚杆元素: {len(elements)}个")
        except Exception as e:
            print(f"⚠️ 提取锚杆元素失败: {e}")
        return elements
            
    def _render_diaphragm_wall(self, elements):
        """渲染地连墙"""
        try:
            if elements and hasattr(self, 'mesh'):
                # 简化渲染：高亮显示地连墙材料
                mat_ids = self.mesh.cell_data.get('MaterialID', [])
                wall_mask = np.isin(mat_ids, [10, 11, 12, 13, 14, 15])
                if np.any(wall_mask):
                    wall_mesh = self.mesh.extract_cells(wall_mask)
                    self.plotter.add_mesh(
                        wall_mesh,
                        color='brown',
                        opacity=0.9,
                        name='diaphragm_wall'
                    )
                    print("✅ 地连墙渲染完成")
        except Exception as e:
            print(f"⚠️ 地连墙渲染失败: {e}")
            
    def _render_anchors(self, elements):
        """渲染锚杆"""
        try:
            # 使用已有的锚杆显示逻辑
            if hasattr(self, 'show_anchors'):
                self.show_anchors = True
                self.toggle_show_anchors(True)
        except Exception as e:
            print(f"⚠️ 锚杆渲染失败: {e}")

    def set_display_mode(self, mode):
        """设置显示模式（增强版 - 大模型优化）"""
        if mode in ['wireframe', 'solid', 'transparent']:
            self.display_mode = mode
            
            # 🎯 大模型智能模式切换
            if getattr(self, '_is_big_model', False):
                self._set_large_model_display_mode(mode)
            else:
                self.display_mesh()  # 常规重新显示
                
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

    def _set_large_model_display_mode(self, mode):
        """大模型显示模式切换（性能优化）"""
        try:
            print(f"🔧 大模型模式切换: {mode}")
            
            # 根据模式调整LOD级别
            if mode == 'wireframe':
                # 线框模式可以使用较高质量
                self._current_lod_level = 'medium'
            elif mode == 'transparent':
                # 半透明模式需要较低质量以保证性能
                self._current_lod_level = 'ultra_low'  
            else:
                # 实体模式使用默认级别
                self._current_lod_level = getattr(self, '_original_lod_level', 'low')
            
            # 重新显示网格
            self._display_main_mesh()
            
            print(f"✅ 大模型模式切换完成，当前LOD: {self._current_lod_level}")
            
        except Exception as e:
            print(f"❌ 大模型模式切换失败: {e}")
            # 回退到常规显示
            self.display_mesh()

    def set_lod_level(self, level):
        """手动设置LOD级别"""
        try:
            valid_levels = ['ultra_low', 'low', 'medium', 'high']
            if level not in valid_levels:
                print(f"❌ 无效LOD级别: {level}，可选: {valid_levels}")
                return False
            
            if not getattr(self, '_is_big_model', False):
                print("⚠️ 当前不是大模型，LOD功能无效")
                return False
            
            if not hasattr(self, '_lod_cache') or level not in self._lod_cache:
                print(f"❌ LOD级别 {level} 不可用")
                return False
            
            # 记录内存使用情况
            self._report_memory_usage_before_switch()
            
            # 切换LOD
            old_level = getattr(self, '_current_lod_level', 'unknown')
            self._current_lod_level = level
            
            # 重新渲染
            self._display_main_mesh()
            
            # 报告切换结果
            new_mesh = self._lod_cache[level]
            print(f"✅ LOD切换成功: {old_level} → {level}")
            print(f"   网格面数: {new_mesh.n_cells:,}")
            
            self._report_memory_usage_after_switch()
            
            return True
            
        except Exception as e:
            print(f"❌ LOD切换失败: {e}")
            return False

    def _report_memory_usage_before_switch(self):
        """报告LOD切换前的内存使用"""
        try:
            import psutil
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024
            print(f"📊 切换前内存使用: {memory_mb:.1f}MB")
        except Exception:
            pass

    def _report_memory_usage_after_switch(self):
        """报告LOD切换后的内存使用"""
        try:
            import psutil
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024
            print(f"📊 切换后内存使用: {memory_mb:.1f}MB")
        except Exception:
            pass

    def get_lod_info(self):
        """获取当前LOD信息"""
        try:
            if not getattr(self, '_is_big_model', False):
                return {'is_big_model': False}
            
            info = {
                'is_big_model': True,
                'current_level': getattr(self, '_current_lod_level', 'unknown'),
                'available_levels': list(getattr(self, '_lod_cache', {}).keys()),
                'current_face_count': 0,
                'original_face_count': getattr(self, '_original_face_count', 0)
            }
            
            # 获取当前面数
            current_mesh = self._get_appropriate_lod_mesh()
            if current_mesh:
                info['current_face_count'] = current_mesh.n_cells
            
            # 获取各级别详细信息
            level_details = {}
            if hasattr(self, '_lod_cache'):
                for level, mesh in self._lod_cache.items():
                    level_details[level] = {
                        'face_count': mesh.n_cells,
                        'memory_estimate_mb': self._estimate_mesh_memory(mesh)
                    }
            info['level_details'] = level_details
            
            return info
            
        except Exception as e:
            print(f"❌ 获取LOD信息失败: {e}")
            return {'error': str(e)}

    def _estimate_mesh_memory(self, mesh):
        """估算网格内存占用"""
        try:
            if not mesh:
                return 0
            
            # 粗略估算：点数 * 12字节(3个float) + 面数 * 16字节(平均4个点的索引)
            points_memory = mesh.n_points * 12
            cells_memory = mesh.n_cells * 16
            
            # 加上cell_data内存
            cell_data_memory = 0
            if hasattr(mesh, 'cell_data'):
                for key, data in mesh.cell_data.items():
                    if hasattr(data, 'nbytes'):
                        cell_data_memory += data.nbytes
            
            total_bytes = points_memory + cells_memory + cell_data_memory
            return total_bytes / (1024 * 1024)  # 转换为MB
            
        except Exception:
            return 0

    def optimize_for_interaction(self, enable=True):
        """优化交互性能"""
        try:
            if not getattr(self, '_is_big_model', False):
                print("⚠️ 非大模型，交互优化无效")
                return False
            
            if enable:
                # 切换到超低质量LOD以提高交互性能
                self._interaction_backup_lod = getattr(self, '_current_lod_level', 'low')
                self.set_lod_level('ultra_low')
                print("🚀 交互优化已启用，切换到超低质量LOD")
            else:
                # 恢复之前的LOD级别
                backup_lod = getattr(self, '_interaction_backup_lod', 'low')
                self.set_lod_level(backup_lod)
                print("✅ 交互优化已关闭，恢复正常LOD")
                
            return True
            
        except Exception as e:
            print(f"❌ 交互优化切换失败: {e}")
            return False

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
            'constraints_count': len(getattr(self, 'constraints', [])),
            'loads_count': len(getattr(self, 'loads', []))
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

    def _render_plates_internal(self):
        """内部板元渲染函数"""
        try:
            if self._plates_cached is None:
                self._plates_cached = self._build_plate_geometry()
            pdata = self._plates_cached
            if pdata is not None and pdata.n_cells > 0:
                # 若存在名为“衬砌/lining”的板属性，则采用更接近衬砌的配色
                color = 'lightsteelblue'
                try:
                    props = (self.fpn_data or {}).get('shell_properties') or {}
                    has_lining = False
                    if isinstance(props, dict):
                        for _pid, info in props.items():
                            nm = str(info.get('name', '')).lower()
                            raw = str(info.get('name', ''))
                            if 'lining' in nm or ('衬砌' in raw):
                                has_lining = True
                                break
                    if has_lining:
                        color = 'lightgray'
                except Exception:
                    pass

                if PYVISTA_AVAILABLE and self.plotter:
                    self.plotter.add_mesh(
                        pdata,
                        color=color,
                        opacity=0.75,
                        show_edges=True,
                        edge_color='darkblue',
                        line_width=0.8,
                        name='plate_elements',
                    )
        except Exception as e:
            print(f"渲染板元失败: {e}")

    def _display_main_mesh(self):
        """显示主体网格，根据显示模式和复选框状态（智能边框优化 + 异步渲染）"""
        try:
            # 🎯 大模型智能渲染策略
            if getattr(self, '_is_big_model', False):
                self._display_large_model_optimized()
                return
                
            # 常规模型的原有逻辑
            self._display_regular_mesh()
            
        except Exception as e:
            print(f"显示主体网格失败: {e}")

    def _display_large_model_optimized(self):
        """大模型优化显示策略"""
        try:
            # 📊 性能监控
            import time
            start_time = time.time()
            
            # 选择合适的LOD级别
            lod_level = getattr(self, '_current_lod_level', 'low')
            mesh_to_show = self._get_appropriate_lod_mesh()
            
            if mesh_to_show is None:
                print("⚠️ 无可用LOD网格，回退到原始网格")
                mesh_to_show = self.mesh
            
            # 🎨 智能材料着色（大模型专用）
            color_strategy = self._get_large_model_color_strategy()
            
            # 🚀 异步渲染准备
            render_params = self._prepare_large_model_render_params(mesh_to_show)
            
            # 清理之前的渲染
            try:
                self.plotter.remove_actor('main_mesh')
            except:
                pass
            
            # 根据显示模式微调参数
            mode = getattr(self, 'display_mode', 'transparent')
            if mode == 'wireframe':
                render_params.update({'style': 'wireframe', 'line_width': 1.0, 'opacity': 1.0})
            elif mode == 'transparent':
                render_params.update({'opacity': min(render_params.get('opacity', 0.7), 0.7)})
            else:
                render_params.update({'opacity': 1.0})

            # 执行渲染
            self.plotter.add_mesh(
                mesh_to_show,
                **render_params
            )
            
            # 📈 性能报告
            render_time = time.time() - start_time
            face_count = mesh_to_show.n_cells
            print(f"🚀 大模型渲染完成 - LOD:{lod_level}, 面数:{face_count:,}, 耗时:{render_time:.2f}s")
            
            # 🎛️ 启用大模型交互优化
            self._enable_large_model_interaction_optimizations()
            
        except Exception as e:
            print(f"❌ 大模型优化显示失败: {e}")
            # 回退到简化渲染
            self._fallback_simple_render()

    def _display_regular_mesh(self):
        """常规网格显示逻辑"""
        try:
            # 智能边框显示
            show_edges = getattr(self, 'show_mesh_edges', True)
            show_edges_default = getattr(self, 'show_edges_default', True)
            
            if hasattr(self, 'show_edges_default'):
                show_edges = show_edges_default
            
            # 显示模式覆盖
            if self.display_mode == 'wireframe':
                show_edges = True
            elif self.display_mode == 'solid':
                show_edges = False
                
            # 确定透明度
            opacity = 0.6 if self.display_mode == 'transparent' else 1.0
            
            mesh_to_show = self.mesh
            element_count = mesh_to_show.n_cells if mesh_to_show else 0
            
            # 线框模式时使用style=wireframe更明确
            if self.display_mode == 'wireframe':
                # 🎨 专业线框显示
                self.plotter.add_mesh(
                    mesh_to_show,
                    style='wireframe',
                    color=[78, 52, 46],  # 深褐色线框
                    opacity=1.0,
                    show_edges=False,
                    line_width=1.2,
                    lighting=True,
                    name='main_mesh',
                )
            else:
                self.plotter.add_mesh(
                    mesh_to_show,
                    color='#8090a0',
                    opacity=opacity,
                    show_edges=show_edges,
                    edge_color='#404040',
                    line_width=0.5,
                    name='main_mesh',
                )
            print(f"常规网格显示成功 - 元素数: {element_count:,}, 边框: {show_edges}, 透明度: {opacity}")
        except Exception as e:
            print(f"常规网格显示失败: {e}")

    def _get_appropriate_lod_mesh(self):
        """根据当前状态获取合适的LOD网格"""
        try:
            if not hasattr(self, '_lod_cache'):
                return self.mesh
            
            lod_level = getattr(self, '_current_lod_level', 'low')
            return self._lod_cache.get(lod_level, self.mesh)
        except Exception as e:
            print(f"⚠️ LOD网格获取失败: {e}")
            return self.mesh

    def _get_large_model_color_strategy(self):
        """大模型颜色策略"""
        try:
            if hasattr(self.mesh, 'cell_data') and 'MaterialID' in self.mesh.cell_data:
                return 'material_based'
            return 'uniform'
        except Exception:
            return 'uniform'

    def _prepare_large_model_render_params(self, mesh):
        """准备大模型渲染参数（视觉增强版）"""
        try:
            params = {
                'name': 'main_mesh',
                'show_edges': False,  # 大模型强制关闭边框
                'opacity': 1.0 if self.display_mode != 'transparent' else 0.7,
                'smooth_shading': True,  # 启用平滑着色
                'lighting': True,  # 启用光照
                'ambient': 0.3,   # 环境光
                'diffuse': 0.7,   # 漫反射
                'specular': 0.2,  # 镜面反射
                'specular_power': 20,  # 镜面反射强度
            }

            # 🎨 专业地质工程着色系统（回滚至按MaterialID色带的旧策略）
            if hasattr(mesh, 'cell_data') and 'MaterialID' in mesh.cell_data:
                material_ids = np.unique(mesh.cell_data['MaterialID'])
                print(f"🎨 检测到 {len(material_ids)} 种材料: {sorted(material_ids.tolist())}")

                if len(material_ids) > 1:
                    # 多材料：使用专业土木工程配色
                    params['scalars'] = 'MaterialID'
                    params['cmap'] = self._get_geotechnical_colormap(material_ids)
                    params['clim'] = [material_ids.min(), material_ids.max()]  # 设置颜色范围
                    print(f"✅ 多材料着色: 使用 {params['cmap']} 配色方案")
                else:
                    # 单一材料：使用土体专用颜色
                    soil_color = self._get_soil_color(material_ids[0])
                    params['color'] = soil_color
                    print(f"✅ 单一材料着色: 材料ID={material_ids[0]}, 颜色={soil_color}")
            else:
                params['color'] = '#8D6E63'  # 默认土褐色
                print("⚠️ 无材料ID，使用默认土褐色")

            # 显示模式特定优化
            if self.display_mode == 'wireframe':
                params.update({
                    'style': 'wireframe',
                    'line_width': 1.2,
                    'color': [78, 52, 46],  # 专业深褐色线框
                    'lighting': True,
                    'ambient': 0.8,      # 线框模式提高环境光
                })
            elif self.display_mode == 'transparent':
                params.update({
                    'opacity': 0.6,
                    'ambient': 0.4,      # 半透明模式适当提高环境光
                })

            return params
        except Exception as e:
            print(f"❌ 渲染参数准备失败: {e}")
            return {'name': 'main_mesh', 'color': '#8D6E63', 'show_edges': False}

    def _get_geotechnical_colormap(self, material_ids):
        """获取岩土工程专用配色方案"""
        n_materials = len(material_ids)
        
        if n_materials <= 3:
            return 'brown'      # 土体经典配色
        elif n_materials <= 6:
            return 'terrain'    # 地形配色，适合多层土体
        elif n_materials <= 10:
            return 'gist_earth' # 地球色系，丰富的土体颜色
        else:
            return 'tab20'      # 高对比度配色，适合复杂地层

    def _get_soil_color(self, material_id):
        """根据材料ID获取土体颜色"""
        # 🎨 专业岩土工程颜色映射 (基于地质勘察标准)
        soil_colors = {
            1: '#8B7355',   # 填土 - 深土褐色
            2: '#A08262',   # 粉质粘土 - 中土褐色
            3: '#B59474',   # 细砂 - 浅土褐色
            4: '#CDA67D',   # 中砂 - 沙土色
            5: '#DAB98C',   # 粗砂 - 浅沙色
            6: '#8B7D6B',   # 粉土 - 灰褐色
            7: '#786958',   # 粘土 - 深灰褐色
            8: '#625546',   # 淤泥质土 - 深褐色
            9: '#4B3C30',   # 强风化岩 - 深岩色
            10: '#4682B4',  # 混凝土桩 - 钢蓝色
            11: '#A9A9A9',  # 钢支撑 - 银灰色
            12: '#8B5A2B',  # 地连墙 - 混凝土褐色
        }
        
        # 默认使用材料ID取模生成颜色
        if material_id in soil_colors:
            return soil_colors[material_id]
        else:
            # 动态生成土体色系
            import matplotlib.colors as mcolors
            colors = ['#8D6E63', '#A1887F', '#BCAAA4', '#D7CCC8', '#5D4037', '#795548']
            return colors[int(material_id) % len(colors)]

    def _enable_large_model_interaction_optimizations(self):
        """启用大模型交互优化"""
        try:
            if hasattr(self.plotter, 'render_window'):
                # 设置渲染窗口优化
                render_window = self.plotter.render_window
                
                # 启用LOD优化
                if hasattr(render_window, 'SetDesiredUpdateRate'):
                    render_window.SetDesiredUpdateRate(10)  # 交互时降低帧率
                
                # 优化交互响应
                if hasattr(self.plotter, 'enable_parallel_projection'):
                    self.plotter.enable_parallel_projection()
                
                print("✅ 大模型交互优化已启用")
        except Exception as e:
            print(f"⚠️ 交互优化启用失败: {e}")

    def _fallback_simple_render(self):
        """回退到最简渲染"""
        try:
            if self.mesh:
                self.plotter.add_mesh(
                    self.mesh,
                    color='gray',
                    show_edges=False,
                    name='main_mesh'
                )
                print("✅ 回退渲染成功")
        except Exception as e:
            print(f"❌ 回退渲染也失败: {e}")

    def _create_demo_mesh(self):
        """创建演示网格用于测试复选框功能"""
        if not PYVISTA_AVAILABLE:
            return
        try:
            import pyvista as pv
            import numpy as np
            
            # 创建一个简单的立方体网格
            mesh = pv.Box(bounds=(-5, 5, -5, 5, -5, 5))
            
            # 添加一些材料属性用于测试
            n_cells = mesh.n_cells
            materials = np.random.choice(['soil', 'concrete', 'steel'], n_cells)
            mesh['material'] = materials
            
            self.mesh = mesh
            self._display_main_mesh()
            print("✅ 演示网格创建成功")
        except Exception as e:
            print(f"创建演示网格失败: {e}")

    def _display_nodes(self):
        """显示节点"""
        if not (PYVISTA_AVAILABLE and self.mesh):
            return
        try:
            # 获取节点坐标
            points = self.mesh.points
            
            # 创建节点显示
            self.plotter.add_points(
                points,
                color='red',
                point_size=8,
                name='nodes'
            )
            print(f"✅ 显示节点: {len(points)} 个")
        except Exception as e:
            print(f"显示节点失败: {e}")

    def _display_supports(self):
        """显示支承约束"""
        try:
            if not (PYVISTA_AVAILABLE and self.mesh):
                return
                
            # 创建简单的支承符号（在底部边界）
            import pyvista as pv
            import numpy as np
            
            bounds = self.mesh.bounds
            # 在底面创建约束符号
            z_min = bounds[4]
            x_range = np.linspace(bounds[0], bounds[1], 5)
            y_range = np.linspace(bounds[2], bounds[3], 5)
            
            support_points = []
            for x in x_range:
                for y in y_range:
                    support_points.append([x, y, z_min])
            
            if support_points:
                support_points = np.array(support_points)
                self.plotter.add_points(
                    support_points,
                    color='green',
                    point_size=12,
                    name='supports',
                    render_points_as_spheres=True
                )
                print(f"✅ 显示支承: {len(support_points)} 个")
        except Exception as e:
            print(f"显示支承失败: {e}")

    def _display_loads(self):
        """显示荷载"""
        try:
            if not (PYVISTA_AVAILABLE and self.mesh):
                return
                
            import pyvista as pv
            import numpy as np
            
            bounds = self.mesh.bounds
            # 在顶面创建荷载箭头
            z_max = bounds[5]
            x_center = (bounds[0] + bounds[1]) / 2
            y_center = (bounds[2] + bounds[3]) / 2
            
            # 创建向下的荷载箭头
            arrow_start = [x_center, y_center, z_max + 2]
            arrow_end = [x_center, y_center, z_max]
            
            # 添加箭头
            arrow = pv.Arrow(start=arrow_start, direction=[0, 0, -1], scale=2)
            
            self.plotter.add_mesh(
                arrow,
                color='blue',
                name='loads'
            )
            print(f"✅ 显示荷载箭头")
        except Exception as e:
            print(f"显示荷载失败: {e}")

    def _update_status_display(self):
        """更新状态显示信息"""
        try:
            status_info = []
            status_info.append(f"显示模式: {self.display_mode}")
            
            if hasattr(self, 'show_mesh_edges'):
                status_info.append(f"网格边: {'开' if getattr(self, 'show_mesh_edges', False) else '关'}")
            if hasattr(self, 'show_nodes'):
                status_info.append(f"节点: {'开' if getattr(self, 'show_nodes', False) else '关'}")
            if hasattr(self, 'show_supports'):
                status_info.append(f"支承: {'开' if getattr(self, 'show_supports', False) else '关'}")
            if hasattr(self, 'show_loads'):
                status_info.append(f"荷载: {'开' if getattr(self, 'show_loads', False) else '关'}")
                
            status_text = " | ".join(status_info)
            
            # 添加状态文本到视图
            self.plotter.add_text(
                status_text,
                position='lower_left',
                font_size=10,
                color='white',
                name='status_text'
            )
        except Exception as e:
            print(f"更新状态显示失败: {e}")

    def _display_diaphragm_wall(self):
        """显示地连墙"""
        try:
            if not (PYVISTA_AVAILABLE and self.plotter):
                return
                
            import pyvista as pv
            import numpy as np
            
            # 创建地连墙示例（垂直墙板）
            wall_height = 20
            wall_width = 50
            wall_thickness = 0.8
            
            # 创建地连墙几何体
            wall = pv.Box(bounds=[
                -wall_width/2, wall_width/2,
                -wall_thickness/2, wall_thickness/2,
                -wall_height, 0
            ])
            
            self.plotter.add_mesh(
                wall,
                color='brown',
                opacity=0.8,
                name='diaphragm_wall'
            )
            print("显示地连墙成功")
        except Exception as e:
            print(f"显示地连墙失败: {e}")

    def _display_piles(self):
        """显示桩基"""
        try:
            if not (PYVISTA_AVAILABLE and self.plotter):
                return
                
            import pyvista as pv
            import numpy as np
            
            # 创建桩基示例（圆柱形桩）
            pile_radius = 0.5
            pile_length = 30
            num_piles = 9
            
            # 3x3 桩基布置
            for i in range(3):
                for j in range(3):
                    x = (i - 1) * 10
                    y = (j - 1) * 10
                    
                    pile = pv.Cylinder(
                        center=[x, y, -pile_length/2],
                        direction=[0, 0, 1],
                        radius=pile_radius,
                        height=pile_length
                    )
                    
                    self.plotter.add_mesh(
                        pile,
                        color='gray',
                        name=f'pile_{i}_{j}'
                    )
            
            print(f"显示 {num_piles} 根桩基成功")
        except Exception as e:
            print(f"显示桩基失败: {e}")

    def _display_strutting(self):
        """显示内撑"""
        try:
            if not (PYVISTA_AVAILABLE and self.plotter):
                return
                
            import pyvista as pv
            import numpy as np
            
            # 创建内撑示例（水平支撑梁）
            strut_length = 40
            strut_height = 1.0
            strut_width = 0.8
            
            # 创建多层内撑
            for level in range(3):
                z_pos = -5 - level * 8
                
                # 水平内撑
                strut = pv.Box(bounds=[
                    -strut_length/2, strut_length/2,
                    -strut_width/2, strut_width/2,
                    z_pos, z_pos + strut_height
                ])
                
                self.plotter.add_mesh(
                    strut,
                    color='yellow',
                    name=f'strut_level_{level}'
                )
            
            print("显示内撑支撑系统成功")
        except Exception as e:
            print(f"显示内撑失败: {e}")

    def _display_steel_structures(self):
        """显示钢构"""
        try:
            if not (PYVISTA_AVAILABLE and self.plotter):
                return
                
            import pyvista as pv
            import numpy as np
            
            # 创建钢构示例（H型钢梁）
            beam_length = 20
            beam_height = 0.6
            beam_width = 0.3
            
            # 创建主梁
            main_beam = pv.Box(bounds=[
                -beam_length/2, beam_length/2,
                -beam_width/2, beam_width/2,
                -beam_height/2, beam_height/2
            ])
            
            # 创建次梁
            for i in range(3):
                y_pos = -8 + i * 8
                secondary_beam = pv.Box(bounds=[
                    -beam_width/2, beam_width/2,
                    y_pos - beam_length/4, y_pos + beam_length/4,
                    -beam_height/2, beam_height/2
                ])
                
                self.plotter.add_mesh(
                    secondary_beam,
                    color='lightblue',
                    name=f'steel_beam_{i}'
                )
            
            self.plotter.add_mesh(
                main_beam,
                color='steelblue',
                name='main_steel_beam'
            )
            
            print("显示钢构框架成功")
        except Exception as e:
            print(f"显示钢构失败: {e}")

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