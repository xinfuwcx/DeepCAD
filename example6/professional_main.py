#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD-SCOUR 专业级主界面 - 以3D视口为中心，左右Dock面板
PyQt6 + 可选 PyVista/pyvistaqt
"""

import sys
from pathlib import Path
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QGridLayout,
    QLabel, QComboBox, QPushButton, QTextEdit, QProgressBar,
    QGroupBox, QDoubleSpinBox, QSpinBox, QCheckBox, QFrame, QDockWidget, QToolBar
)
from PyQt6.QtCore import QThread, pyqtSignal, Qt
from PyQt6.QtGui import QFont, QAction

try:
    import pyvista as pv
    from pyvistaqt import QtInteractor
    PYVISTA_AVAILABLE = True
except Exception:
    PYVISTA_AVAILABLE = False

# 添加路径以导入核心模块
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from core.empirical_solver import ScourParameters, PierShape
from core.solver_manager import create_default_manager, SolverType, ComparisonResult
from core.fenics_solver import NumericalParameters, TurbulenceModel

# 专业样式（简化）
PROFESSIONAL_STYLE = """
QMainWindow { background-color: #1f1f1f; color: #eaeaea; }
QGroupBox { font-weight: bold; border: 1px solid #444; border-radius: 8px; margin-top: 12px; padding-top: 8px; background-color: #2a2a2a; }
QGroupBox::title { left: 10px; padding: 0 6px; color: #00aaff; }
QPushButton { background-color: #2d6cdf; color: #fff; border: 1px solid #1e3a5f; border-radius: 6px; padding: 8px 12px; }
QPushButton:hover { background-color: #3d7cf0; }
QDoubleSpinBox, QComboBox { background-color: #3a3a3a; color: #fff; border: 1px solid #555; border-radius: 4px; padding: 4px 8px; }
QTextEdit { background-color: #1e1e1e; color: #ddd; border: 1px solid #444; border-radius: 6px; }
QStatusBar { background-color: #141414; color: #9a9a9a; border-top: 1px solid #333; }
"""


class Simple3DViewer(QFrame):
    """3D视口：优先使用PyVista，否则提供占位视图。"""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.has_3d = False
        self.plotter = None
        self.setMinimumSize(900, 600)
        self._setup_ui()
        self._create_scene()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        if PYVISTA_AVAILABLE:
            try:
                self.plotter = QtInteractor(self)
                self.plotter.set_background('#1f1f1f')
                layout.addWidget(self.plotter.interactor)
                self.has_3d = True
                return
            except Exception:
                pass
        # fallback: 占位
        self.setStyleSheet("""
        QFrame { background: qlineargradient(x1:0,y1:0,x2:1,y2:1, stop:0 #0f0f0f, stop:1 #1a1a1a); border: 1px dashed #00aaff; border-radius: 12px; }
        """)
        v = QVBoxLayout()
        v.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title = QLabel("3D 视图 (安装 pyvista/pyvistaqt 以启用)")
        title.setStyleSheet("font-size:18px; color:#66d9ff; margin:8px;")
        tips = QLabel("pip install pyvista pyvistaqt")
        tips.setStyleSheet("color:#c6c6c6;")
        v.addWidget(title)
        v.addWidget(tips)
        layout.addLayout(v)

    def _create_scene(self):
        if not (self.has_3d and self.plotter):
            return
        try:
            pier = pv.Cylinder(height=6.0, radius=1.0, center=(0, 0, 3))
            water = pv.Plane(center=(0, 0, 4), i_size=20, j_size=10)
            bed = pv.Plane(center=(0, 0, 0), i_size=20, j_size=10)
            self.plotter.add_mesh(bed, color='sienna', opacity=0.7)
            self.plotter.add_mesh(water, color='cyan', opacity=0.25)
            self.plotter.add_mesh(pier, color='lightblue', opacity=0.9)
            self.plotter.camera_position = [(16, 16, 10), (0, 0, 2), (0, 0, 1)]
            self.plotter.add_axes()
            self.plotter.add_text("DeepCAD-SCOUR", font_size=12)
        except Exception:
            pass

    def update_visualization(self, result):
        if not (self.has_3d and self.plotter):
            return
        try:
            self.plotter.clear_actors()
            self._create_scene()
            if hasattr(result, 'scour_depth'):
                d = float(result.scour_depth)
                scour = pv.Cylinder(height=d, radius=max(0.1, d*1.2), center=(0, 0, -d/2))
                self.plotter.add_mesh(scour, color='red', opacity=0.5)
            self.plotter.render()
        except Exception:
            pass


class CalculationThread(QThread):
    finished = pyqtSignal(object)
    progress = pyqtSignal(int)

    def __init__(self, manager, params: ScourParameters, solver_type, numerical_params: NumericalParameters | None):
        super().__init__()
        self.manager = manager
        self.params = params
        self.solver_type = solver_type
        self.numerical_params = numerical_params

    def run(self):
        try:
            self.progress.emit(20)
            result = self.manager.solve(self.params, numerical_params=self.numerical_params, solver_type=self.solver_type)
            self.progress.emit(100)
            self.finished.emit(result)
        except Exception:
            self.finished.emit(None)


class ProfessionalMainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.manager = create_default_manager()
        self.calc_thread = None
        self.left_dock: QDockWidget | None = None
        self.right_dock: QDockWidget | None = None

        self.setWindowTitle("DeepCAD-SCOUR 专业版 - 3D桥墩冲刷")
        self.resize(1800, 1100)
        self.setMinimumSize(1200, 800)
        self.setStyleSheet(PROFESSIONAL_STYLE)

        self._setup_ui()
        self._setup_toolbar()
        self._setup_status()

    def _setup_ui(self):
        # 中央 3D 视口
        self.viewer_3d = Simple3DViewer()
        self.setCentralWidget(self.viewer_3d)
        self.setDockNestingEnabled(True)

        # 左 Dock：参数
        left_widget = self._create_controls()
        self.left_dock = QDockWidget("参数", self)
        self.left_dock.setWidget(left_widget)
        self.left_dock.setAllowedAreas(Qt.DockWidgetArea.LeftDockWidgetArea)
        self.addDockWidget(Qt.DockWidgetArea.LeftDockWidgetArea, self.left_dock)
        self.left_dock.setMinimumWidth(340)

        # 右 Dock：结果
        right_widget = self._create_results()
        self.right_dock = QDockWidget("结果", self)
        self.right_dock.setWidget(right_widget)
        self.right_dock.setAllowedAreas(Qt.DockWidgetArea.RightDockWidgetArea)
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.right_dock)
        self.right_dock.setMinimumWidth(360)

    def _setup_toolbar(self):
        tb = QToolBar("视图", self)
        self.addToolBar(Qt.ToolBarArea.TopToolBarArea, tb)

        act_focus = QAction("专注3D", self)
        act_focus.setCheckable(True)
        act_focus.toggled.connect(self._toggle_focus_3d)
        tb.addAction(act_focus)

        act_reset = QAction("重置视角", self)
        act_reset.triggered.connect(self.reset_3d_view)
        tb.addAction(act_reset)

        act_ss = QAction("导出图像", self)
        act_ss.triggered.connect(self.export_view)
        tb.addAction(act_ss)

        if self.left_dock:
            tb.addAction(self.left_dock.toggleViewAction())
        if self.right_dock:
            tb.addAction(self.right_dock.toggleViewAction())

    def _setup_status(self):
        status = "就绪 | " + ("PyVista可用" if PYVISTA_AVAILABLE else "PyVista未安装")
        self.statusBar().showMessage(status)

    # ----- Panels -----
    def _create_controls(self) -> QWidget:
        w = QWidget()
        layout = QVBoxLayout(w)

        # 桥墩参数
        g_pier = QGroupBox("🌉 桥墩参数")
        g1 = QGridLayout(g_pier)
        g1.addWidget(QLabel("直径 (m):"), 0, 0)
        self.diameter_spin = QDoubleSpinBox(); self.diameter_spin.setRange(0.5, 10.0); self.diameter_spin.setValue(2.0); self.diameter_spin.setDecimals(2)
        g1.addWidget(self.diameter_spin, 0, 1)
        g1.addWidget(QLabel("形状:"), 1, 0)
        self.shape_combo = QComboBox(); self.shape_combo.addItems(["圆形", "矩形", "椭圆形"]) 
        g1.addWidget(self.shape_combo, 1, 1)
        layout.addWidget(g_pier)

        # 流体参数
        g_flow = QGroupBox("💧 流体参数")
        g2 = QGridLayout(g_flow)
        g2.addWidget(QLabel("流速 (m/s):"), 0, 0)
        self.velocity_spin = QDoubleSpinBox(); self.velocity_spin.setRange(0.1, 5.0); self.velocity_spin.setValue(1.5); self.velocity_spin.setDecimals(2)
        g2.addWidget(self.velocity_spin, 0, 1)
        g2.addWidget(QLabel("水深 (m):"), 1, 0)
        self.depth_spin = QDoubleSpinBox(); self.depth_spin.setRange(1.0, 20.0); self.depth_spin.setValue(4.0); self.depth_spin.setDecimals(1)
        g2.addWidget(self.depth_spin, 1, 1)
        layout.addWidget(g_flow)

        # 沉积物参数
        g_sed = QGroupBox("🏔️ 沉积物参数")
        g3 = QGridLayout(g_sed)
        g3.addWidget(QLabel("d50 (mm):"), 0, 0)
        self.d50_spin = QDoubleSpinBox(); self.d50_spin.setRange(0.1, 10.0); self.d50_spin.setValue(0.8); self.d50_spin.setDecimals(2)
        g3.addWidget(self.d50_spin, 0, 1)
        layout.addWidget(g_sed)

        # 求解器选择
        g_solver = QGroupBox("🧠 求解器")
        g4 = QGridLayout(g_solver)
        g4.addWidget(QLabel("求解模式:"), 0, 0)
        self.solver_mode_combo = QComboBox(); self.solver_mode_combo.addItems(["自动", "经验公式", "数值(FEniCS)", "混合"]); self.solver_mode_combo.setCurrentIndex(0)
        g4.addWidget(self.solver_mode_combo, 0, 1)
        layout.addWidget(g_solver)

        # 高级 CAE 设置
        g_cae = QGroupBox("⚙️ 高级CAE设置")
        g5 = QGridLayout(g_cae)
        row = 0
        g5.addWidget(QLabel("网格分辨率 (m):"), row, 0)
        self.mesh_res_spin = QDoubleSpinBox(); self.mesh_res_spin.setRange(0.01, 1.0); self.mesh_res_spin.setSingleStep(0.01); self.mesh_res_spin.setValue(0.10); self.mesh_res_spin.setDecimals(3)
        g5.addWidget(self.mesh_res_spin, row, 1); row += 1

        g5.addWidget(QLabel("时间步长 (s):"), row, 0)
        self.dt_spin = QDoubleSpinBox(); self.dt_spin.setRange(0.01, 5.0); self.dt_spin.setSingleStep(0.01); self.dt_spin.setValue(0.10); self.dt_spin.setDecimals(2)
        g5.addWidget(self.dt_spin, row, 1); row += 1

        g5.addWidget(QLabel("迭代上限:"), row, 0)
        self.iters_spin = QSpinBox(); self.iters_spin.setRange(1, 500); self.iters_spin.setValue(50)
        g5.addWidget(self.iters_spin, row, 1); row += 1

        g5.addWidget(QLabel("湍流模型:"), row, 0)
        self.turbulence_combo = QComboBox(); self.turbulence_combo.addItems(["k-epsilon", "k-epsilon-rng", "k-omega-sst", "spalart-allmaras"])
        g5.addWidget(self.turbulence_combo, row, 1); row += 1

        self.sediment_check = QCheckBox("启用总输沙")
        self.sediment_check.setChecked(True)
        g5.addWidget(self.sediment_check, row, 0, 1, 2); row += 1

        self.bedload_check = QCheckBox("床沙输运")
        self.bedload_check.setChecked(True)
        g5.addWidget(self.bedload_check, row, 0, 1, 2); row += 1

        self.suspended_check = QCheckBox("悬沙输运")
        self.suspended_check.setChecked(False)
        g5.addWidget(self.suspended_check, row, 0, 1, 2)

        layout.addWidget(g_cae)

        # 3D控制
        g_view = QGroupBox("🎮 3D视图控制")
        v = QVBoxLayout(g_view)
        btn_reset = QPushButton("重置视角"); btn_reset.clicked.connect(self.reset_3d_view)
        btn_mesh = QPushButton("切换网格"); btn_mesh.clicked.connect(self.toggle_mesh)
        btn_ss = QPushButton("导出图像"); btn_ss.clicked.connect(self.export_view)
        v.addWidget(btn_reset); v.addWidget(btn_mesh); v.addWidget(btn_ss)
        layout.addWidget(g_view)

        # 计算
        g_calc = QGroupBox("🚀 计算控制")
        v2 = QVBoxLayout(g_calc)
        self.calc_btn = QPushButton("开始计算"); self.calc_btn.clicked.connect(self.start_calculation)
        self.calc_btn.setStyleSheet("font-size:14px; font-weight:bold; padding:10px; background-color:#e4572e;")
        self.progress_bar = QProgressBar(); self.progress_bar.setVisible(False)
        v2.addWidget(self.calc_btn); v2.addWidget(self.progress_bar)
        layout.addWidget(g_calc)

        layout.addStretch(1)
        return w

    def _create_results(self) -> QWidget:
        w = QWidget()
        layout = QVBoxLayout(w)

        g_res = QGroupBox("📊 计算结果")
        g = QGridLayout(g_res)
        g.addWidget(QLabel("冲刷深度:"), 0, 0)
        self.depth_label = QLabel("--")
        self.depth_label.setStyleSheet("font-size:24px; font-weight:bold; color:#00ff88; border:1px solid #00ff88; border-radius:8px; padding:8px; background:#0e2a1f;")
        g.addWidget(self.depth_label, 0, 1)
        g.addWidget(QLabel("m"), 0, 2)
        layout.addWidget(g_res)

        g_ana = QGroupBox("🔬 3D流场分析")
        v = QVBoxLayout(g_ana)
        self.analysis_text = QTextEdit(); self.analysis_text.setMaximumHeight(220)
        self.analysis_text.setPlainText("等待3D CFD计算...\n\n将显示:\n• 流线分布\n• 压力场\n• 剪应力云图\n• 湍动能分布")
        v.addWidget(self.analysis_text)
        layout.addWidget(g_ana)

        g_adv = QGroupBox("💡 专业建议")
        v2 = QVBoxLayout(g_adv)
        self.advice_text = QTextEdit(); self.advice_text.setMaximumHeight(180)
        self.advice_text.setPlainText("基于3D CFD分析的专业建议...")
        v2.addWidget(self.advice_text)
        layout.addWidget(g_adv)

        layout.addStretch(1)
        return w

    # ----- Logic -----
    def _get_params(self) -> ScourParameters:
        shape_map = {0: PierShape.CIRCULAR, 1: PierShape.RECTANGULAR, 2: PierShape.ELLIPTICAL}
        return ScourParameters(
            pier_diameter=self.diameter_spin.value(),
            pier_shape=shape_map.get(self.shape_combo.currentIndex(), PierShape.CIRCULAR),
            flow_velocity=self.velocity_spin.value(),
            water_depth=self.depth_spin.value(),
            d50=self.d50_spin.value(),
        )

    def _get_numerical_params(self) -> NumericalParameters:
        idx = self.turbulence_combo.currentIndex() if hasattr(self, 'turbulence_combo') else 0
        turb = [TurbulenceModel.K_EPSILON, TurbulenceModel.K_EPSILON_RNG, TurbulenceModel.K_OMEGA_SST, TurbulenceModel.SPALART_ALLMARAS][idx]
        return NumericalParameters(
            mesh_resolution=self.mesh_res_spin.value() if hasattr(self, 'mesh_res_spin') else 0.1,
            time_step=self.dt_spin.value() if hasattr(self, 'dt_spin') else 0.1,
            max_iterations=self.iters_spin.value() if hasattr(self, 'iters_spin') else 50,
            turbulence_model=turb,
            sediment_transport=self.sediment_check.isChecked() if hasattr(self, 'sediment_check') else True,
            bed_load_transport=self.bedload_check.isChecked() if hasattr(self, 'bedload_check') else True,
            suspended_load_transport=self.suspended_check.isChecked() if hasattr(self, 'suspended_check') else False,
        )

    def start_calculation(self):
        if self.calc_thread and self.calc_thread.isRunning():
            return
        params = self._get_params()
        idx = self.solver_mode_combo.currentIndex() if hasattr(self, 'solver_mode_combo') else 0
        solver_type = {0: SolverType.AUTO, 1: SolverType.EMPIRICAL, 2: SolverType.NUMERICAL, 3: SolverType.HYBRID}.get(idx, SolverType.AUTO)
        numerical_params = self._get_numerical_params()
        self.calc_thread = CalculationThread(self.manager, params, solver_type, numerical_params)
        self.calc_thread.progress.connect(self._on_progress)
        self.calc_thread.finished.connect(self._on_finished)
        self.calc_btn.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        self.statusBar().showMessage("计算中...")
        self.calc_thread.start()

    def _on_progress(self, v: int):
        self.progress_bar.setValue(v)

    def _on_finished(self, result):
        self.calc_btn.setEnabled(True)
        self.progress_bar.setVisible(False)
        if result is None:
            self.statusBar().showMessage("计算完成（无结果）")
            return

        def _extract(res):
            try:
                return float(getattr(res, 'scour_depth')), float(getattr(res, 'scour_width'))
            except Exception:
                return None, None

        if isinstance(result, ComparisonResult):
            rec = getattr(result, 'recommended_result', None)
            if rec is None:
                self.statusBar().showMessage("无推荐结果")
                return
            depth, width = _extract(rec)
            method_label = getattr(rec, 'method', 'Hybrid')
        else:
            depth, width = _extract(result)
            method_label = getattr(result, 'method', 'Result')

        if depth is None:
            self.statusBar().showMessage("结果解析失败")
            return

        self.depth_label.setText(f"{depth:.3f}")
        class _Viz: pass
        viz = _Viz(); viz.scour_depth = depth; viz.scour_width = width
        self.viewer_3d.update_visualization(viz)

        self.analysis_text.setPlainText(
            f"""3D 计算结果 ({method_label}):
冲刷深度: {depth:.3f} m
冲刷宽度: {width:.3f} m
最大流速(估计): {depth*2.5:.2f} m/s
最大剪应力(估计): {depth*150:.1f} Pa

流场特征:
• 桥墩前方形成高压区
• 桥墩两侧产生涡旋
• 桥墩后方形成尾涡
• 河床底部剪应力集中"""
        )
        self.advice_text.setPlainText(
            f"""建议:
• 设计冲刷深度: {depth*1.5:.2f} m
• 桩基埋深建议: ≥ {depth*2.0:.1f} m
• 护底措施: 抛石/铠甲层
• 形状优化: 减小迎流分离
• 监测: 冲刷深度与振动在线监测"""
        )
        self.statusBar().showMessage(f"完成 - 冲刷深度: {depth:.3f} m ({method_label})")

    # ----- View ops -----
    def reset_3d_view(self):
        if hasattr(self.viewer_3d, 'plotter') and self.viewer_3d.has_3d:
            self.viewer_3d.plotter.camera_position = [(16, 16, 10), (0, 0, 2), (0, 0, 1)]
            self.viewer_3d.plotter.render()

    def toggle_mesh(self):
        # 可扩展：切换显示网格/光滑表面
        pass

    def export_view(self):
        if hasattr(self.viewer_3d, 'plotter') and self.viewer_3d.has_3d:
            try:
                self.viewer_3d.plotter.screenshot('scour_3d_view.png')
                self.statusBar().showMessage("已导出 scour_3d_view.png")
            except Exception as e:
                self.statusBar().showMessage(f"导出失败: {e}")

    def _toggle_focus_3d(self, checked: bool):
        if self.left_dock:
            self.left_dock.setVisible(not checked)
        if self.right_dock:
            self.right_dock.setVisible(not checked)
        self.statusBar().showMessage("专注3D" if checked else "显示全部面板")
 
def main():
    app = QApplication(sys.argv)
    app.setApplicationName("DeepCAD-SCOUR Professional")
    app.setApplicationVersion("3.1")
    app.setFont(QFont("微软雅黑", 10))
    w = ProfessionalMainWindow()
    w.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()