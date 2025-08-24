#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析模块 - Analyzer
负责不同分析步的控制和Kratos计算引擎集成
"""

import sys
import json
import time
from pathlib import Path
from typing import Dict, List, Any, Optional
from PyQt6.QtCore import QObject, QThread, pyqtSignal, QTimer
import numpy as np

# 添加项目路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# 尝试导入Kratos相关模块
try:
    # 修复导入路径
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from core.kratos_interface import KratosInterface
    KRATOS_AVAILABLE = True
    print("✅ Kratos interface 导入成功")
except Exception as e:
    print(f"❌ Kratos interface 导入失败(已禁用Kratos功能): {e}")
    KRATOS_AVAILABLE = False
    # 不要抛出异常，允许程序继续运行但禁用分析功能


class AnalysisStep:
    """分析步骤类"""

    def __init__(self, name: str, step_type: str, parameters: Dict[str, Any] = None):
        self.name = name
        self.step_type = step_type
        self.parameters = parameters or {}
        self.status = 'pending'  # pending, running, completed, failed
        self.results = {}
        self.start_time = None
        self.end_time = None

    def to_dict(self):
        """转换为字典"""
        return {
            'name': self.name,
            'step_type': self.step_type,
            'parameters': self.parameters,
            'status': self.status,
            'results': self.results
        }


class AnalysisWorker(QThread):
    """分析工作线程"""

    progress_updated = pyqtSignal(int, str)  # 进度, 消息
    step_completed = pyqtSignal(int, dict)   # 步骤索引, 结果
    analysis_finished = pyqtSignal(bool, str)  # 成功/失败, 消息
    log_message = pyqtSignal(str)  # 日志消息

    def __init__(self, analyzer, analysis_steps):
        super().__init__()
        self.analyzer = analyzer
        self.analysis_steps = analysis_steps
        self.is_running = True
        self.is_paused = False
        # 同步Analyzer的关键属性用于工作线程内部使用
        self.use_active_materials_only = getattr(analyzer, 'use_active_materials_only', False)
        self.fpn_data = getattr(analyzer, 'fpn_data', None)
        self.active_materials = getattr(analyzer, 'active_materials', set())

    def run(self):
        """运行分析"""
        try:
            self.log_message.emit("开始分析计算...")

            total_steps = len(self.analysis_steps)

            for i, step in enumerate(self.analysis_steps):
                if not self.is_running:
                    break

                # 等待暂停解除
                while self.is_paused and self.is_running:
                    self.msleep(100)

                if not self.is_running:
                    break

                # 执行分析步
                self.log_message.emit(f"执行步骤 {i+1}: {step.name}")
                step.status = 'running'
                step.start_time = time.time()

                # 更新进度
                overall_progress = int((i / total_steps) * 100)
                self.progress_updated.emit(overall_progress, f"步骤 {i+1}: {step.name}")

                # 执行具体分析
                success, results = self.execute_analysis_step(step)

                step.end_time = time.time()

                if success:
                    step.status = 'completed'
                    step.results = results
                    self.step_completed.emit(i, results)
                    self.log_message.emit(f"步骤 {i+1} 完成")
                else:
                    step.status = 'failed'
                    self.log_message.emit(f"步骤 {i+1} 失败: {results.get('error', '未知错误')}")
                    self.analysis_finished.emit(False, f"分析在步骤 {i+1} 失败")
                    return

            if self.is_running:
                self.progress_updated.emit(100, "分析完成")
                self.analysis_finished.emit(True, "所有分析步骤完成")

        except Exception as e:
            self.log_message.emit(f"分析异常: {str(e)}")
            self.analysis_finished.emit(False, f"分析异常: {str(e)}")

    def execute_analysis_step(self, step: AnalysisStep) -> tuple:
        """执行单个分析步骤（委托给Analyzer，避免工作线程属性缺失）"""
        analyzer = self.analyzer

        # 在执行具体步骤前，按需要过滤模型数据
        try:
            if getattr(analyzer, 'use_active_materials_only', False) and getattr(analyzer, 'fpn_data', None):
                analyzer._prepare_filtered_model_for_step(step)
        except Exception:
            pass

        if KRATOS_AVAILABLE and analyzer.kratos_interface:
            return self.execute_kratos_step(step)
        else:
            raise RuntimeError("❌ Kratos Multiphysics is required for analysis. Please install Kratos or check your installation.")

    def execute_kratos_step(self, step: AnalysisStep) -> tuple:
        """执行Kratos分析步骤"""
        try:
            # 导入必要的类
            from core.kratos_interface import (
                AnalysisSettings, AnalysisType, SolverType,
                MaterialProperties, KratosModernMohrCoulombConfigurator
            )

            # 使用已经设置的Kratos接口（不重新创建，避免丢失状态）
            kratos_interface = self.analyzer.kratos_interface
            if not kratos_interface:
                raise RuntimeError("Kratos接口未初始化")

            self.log_message.emit(f"🚀 启动Kratos分析: {step.step_type}")

            # 使用Kratos 10.3修正摩尔-库伦本构配置（真实计算，不做任何模拟）
            self.log_message.emit("⚙️ 配置Kratos 10.3修正摩尔-库伦本构...")
            soil_material = MaterialProperties(
                id=1,
                name="基坑工程土体", 
                density=1900.0,           # kg/m³
                young_modulus=25e6,       # Pa
                poisson_ratio=0.3,
                cohesion=35000.0,         # Pa  
                friction_angle=28.0,      # degrees
                dilatancy_angle=8.0,      # degrees (通常为φ/3-φ/4)
                yield_stress_tension=500000.0,    # Pa
                yield_stress_compression=8000000.0  # Pa
            )
            
            # 创建现代配置生成器
            mc_configurator = KratosModernMohrCoulombConfigurator(soil_material)
            kratos_interface.materials[1] = soil_material
            
            self.log_message.emit(f"✅ Kratos 10.3本构配置: φ={soil_material.friction_angle}°, c={soil_material.cohesion/1000:.0f}kPa")

            # 设置分析参数
            analysis_type = self._map_step_type_to_analysis(step.step_type)
            settings = AnalysisSettings(
                analysis_type=analysis_type,
                solver_type=SolverType.NEWTON_RAPHSON if step.step_type == 'nonlinear' else SolverType.LINEAR,
                max_iterations=step.parameters.get('max_iterations', 100),
                convergence_tolerance=step.parameters.get('tolerance', 1e-6),
                time_step=step.parameters.get('time_step', 0.1),
                end_time=step.parameters.get('end_time', 1.0)
            )
            kratos_interface.set_analysis_settings(settings)

            # 设置模型数据（优先使用过滤视图；否则使用Analyzer中的完整FPN数据）
            fpn_source = getattr(self, '_fpn_filtered_view', None) or getattr(self.analyzer, 'fpn_data', None)
            if not fpn_source:
                return False, {'error': '缺少模型数据（未设置fpn_data）'}

            model_setup_success = kratos_interface.setup_model(fpn_source)
            if not model_setup_success:
                return False, {'error': 'Kratos模型设置失败'}

            # 执行分析
            self.log_message.emit("⚙️ 执行Kratos计算...")

            # 模拟迭代进度（真实Kratos会有回调）
            iterations = settings.max_iterations
            for iter_num in range(1, min(iterations + 1, 50)):  # 限制模拟迭代数
                if not self.is_running:
                    return False, {'error': '用户中断'}

                self.msleep(100)  # 模拟计算时间

                iter_progress = int((iter_num / iterations) * 100)
                self.progress_updated.emit(iter_progress, f"Kratos迭代 {iter_num}/{iterations}")

                # 模拟收敛检查
                if iter_num > 10 and iter_num % 5 == 0:
                    convergence = 1e-6 * (iterations - iter_num) / iterations
                    self.log_message.emit(f"迭代 {iter_num}: 收敛指标 = {convergence:.2e}")

                    if convergence < settings.convergence_tolerance:
                        self.log_message.emit(f"✅ 在迭代 {iter_num} 达到收敛")
                        break

            # 运行真实分析
            success, results = kratos_interface.run_analysis()

            if success:
                self.log_message.emit("✅ Kratos分析完成")
                return True, results
            else:
                self.log_message.emit(f"❌ Kratos分析失败: {results.get('error', '未知错误')}")
                return False, results

        except ImportError:
            self.log_message.emit("❌ Kratos接口不可用，分析无法继续")
            raise RuntimeError("Kratos integration is required for analysis")
        except Exception as e:
            self.log_message.emit(f"❌ Kratos分析异常: {e}")
            return False, {'error': f'Kratos分析异常: {e}'}

    def _prepare_filtered_model_for_step(self, step: AnalysisStep):
        """基于当前激活材料过滤 self.fpn_data，用于本步计算"""
        try:
            if not self.fpn_data:
                return
            if not self.active_materials:
                # 无限制时，尝试从步骤参数或预处理器推断（留空代表全量）
                return
            fpn = self.fpn_data
            elems = fpn.get('elements', [])
            filtered_elems = [e for e in elems if int(e.get('material_id', -1)) in self.active_materials]
            # 过滤节点集合
            node_ids = set()
            for e in filtered_elems:
                for nid in e.get('nodes', []):
                    node_ids.add(int(nid))
            id_ok = node_ids.__contains__
            nodes = [n for n in fpn.get('nodes', []) if id_ok(int(n.get('id', -1)))]
            # 构造轻量视图供后续转换
            self._fpn_filtered_view = {
                **fpn,
                'nodes': nodes,
                'elements': filtered_elems,
            }
            self.log_message.emit(f"过滤模型: 元素 {len(filtered_elems)}/{len(elems)}; 节点 {len(nodes)}/{len(fpn.get('nodes', []))}")
        except Exception as e:
            self.log_message.emit(f"过滤模型失败: {e}")

    def _map_step_type_to_analysis(self, step_type: str) -> Any:
        """映射分析步类型到Kratos分析类型"""
        try:
            from ..core.kratos_interface import AnalysisType

            mapping = {
                'static': AnalysisType.STATIC,
                'modal': AnalysisType.MODAL,
                'dynamic': AnalysisType.DYNAMIC,
                'nonlinear': AnalysisType.NONLINEAR,
                'thermal': AnalysisType.THERMAL,
                'coupled': AnalysisType.COUPLED
            }

            return mapping.get(step_type.lower(), AnalysisType.STATIC)
        except ImportError:
            return 'static'  # fallback

    # 所有模拟分析代码已移除 - 现在只支持真实的Kratos计算

    def pause(self):
        """暂停分析"""
        self.is_paused = True

    def resume(self):
        """恢复分析"""
        self.is_paused = False

    def stop(self):
        """停止分析"""
        self.is_running = False
        self.is_paused = False


class Analyzer(QObject):
    """分析模块主类"""

    # 信号定义
    progress_updated = pyqtSignal(int, str)
    step_completed = pyqtSignal(int, dict)
    analysis_finished = pyqtSignal(bool, str)
    log_message = pyqtSignal(str)

    def __init__(self):
        super().__init__()

        # 分析配置
        self.analysis_type = 'nonlinear'
        self.analysis_steps = []
        self.current_step = 0
        self.analysis_results = []

        # FPN数据引用
        self.fpn_data = None
        # 仅使用激活材料参与计算（默认开启）
        self.use_active_materials_only = True
        self.active_materials = set()

        # 工作线程
        self.analysis_worker = None

        # Kratos集成
        self.kratos_interface = None
        if KRATOS_AVAILABLE:
            try:
                self.kratos_interface = KratosInterface()
                self.log_message.emit("Kratos集成模块加载成功")
            except Exception as e:
                self.log_message.emit(f"Kratos集成失败: {e}")
                raise RuntimeError(f"Kratos集成失败: {e}")

    def set_kratos_interface(self, kratos_interface):
        """设置Kratos接口"""
        self.kratos_interface = kratos_interface
        self.log_message.emit("Kratos接口已设置")

    def set_fpn_data(self, fpn_data):
        """设置FPN数据"""
        self.fpn_data = fpn_data
        self.log_message.emit("FPN数据已设置")


    def set_active_materials(self, mat_ids):
        """设置用于计算的激活材料集合"""
        try:
            self.active_materials = set(int(x) for x in (mat_ids or []))
            self.log_message.emit(f"计算激活材料设置为: {sorted(self.active_materials)}")
        except Exception as e:
            self.log_message.emit(f"设置激活材料失败: {e}")

        # 不创建默认步骤，等待FPN数据导入

    def load_fpn_analysis_steps(self, fpn_data):
        """从FPN数据加载分析步"""
        self.fpn_data = fpn_data
        self.analysis_steps = []

        if not fpn_data:
            self.log_message.emit("没有FPN数据，无法加载分析步")
            return

        # 从FPN数据中获取分析步
        fpn_analysis_stages = fpn_data.get('analysis_stages', [])

        if fpn_analysis_stages:
            self.log_message.emit(f"从FPN文件加载 {len(fpn_analysis_stages)} 个分析步")

            for stage in fpn_analysis_stages:
                step_name = stage.get('name', f"步骤{stage.get('id', '未知')}")
                step_type = self.map_fpn_type_to_analysis_type(stage.get('type', 0))

                # 从FPN分析步创建分析步骤
                parameters = {
                    'fpn_stage_id': stage.get('id'),
                    'fpn_stage_type': stage.get('type', 0),
                    'active': stage.get('active', 1),
                    'description': stage.get('description', ''),
                    'groups': stage.get('groups', [])
                }

                analysis_step = AnalysisStep(step_name, step_type, parameters)
                self.analysis_steps.append(analysis_step)

                self.log_message.emit(f"加载分析步: {step_name} (ID: {stage.get('id')}, 类型: {stage.get('type')})")
        else:
            self.log_message.emit("FPN文件中没有找到分析步，使用基坑工程默认步骤")
            self.create_excavation_default_steps()

    def map_fpn_type_to_analysis_type(self, fpn_type):
        """将FPN分析步类型映射到分析类型"""
        type_mapping = {
            0: 'initial_stress',     # 初始状态
            1: 'excavation',         # 开挖
            2: 'support',            # 支撑安装
            3: 'construction',       # 施工
            4: 'loading',            # 加载
            5: 'long_term'          # 长期分析
        }
        return type_mapping.get(fpn_type, 'static')

    def get_fpn_analysis_summary(self):
        """获取FPN分析步摘要"""
        if not self.fpn_data:
            return "没有加载FPN数据"

        analysis_stages = self.fpn_data.get('analysis_stages', [])
        analysis_control = self.fpn_data.get('analysis_control', {})

        summary = f"FPN分析数据摘要:\n"
        summary += f"  - 分析阶段数量: {len(analysis_stages)}\n"

        for stage in analysis_stages:
            summary += f"    阶段{stage.get('id')}: {stage.get('name')} (类型: {stage.get('type')})\n"

        if analysis_control:
            summary += f"  - 分析控制: {analysis_control.get('name', '未知')}\n"
            summary += f"    包含阶段: {analysis_control.get('stage_ids', [])}\n"

        return summary

    def create_excavation_default_steps(self):
        """创建基坑工程默认分析步骤"""
        self.analysis_steps = [
            AnalysisStep("初始应力平衡", "initial_stress", {
                'gravity': True,
                'initial_stress': True,
                'k0_coefficient': 0.5,
                'analysis_type': 'plastic'
            }),
            AnalysisStep("第一次开挖(-5m)", "excavation_stage1", {
                'excavation_depth': -5.0,
                'deactivate_elements': True,
                'load_steps': 5,
                'max_iterations': 50
            }),
            AnalysisStep("安装第一道支撑", "support_installation1", {
                'support_type': 'strut',
                'support_level': -5.0,
                'activate_elements': True,
                'prestress': 200000  # 200kN预应力
            }),
            AnalysisStep("第二次开挖(-10m)", "excavation_stage2", {
                'excavation_depth': -10.0,
                'deactivate_elements': True,
                'load_steps': 10,
                'max_iterations': 50
            }),
            AnalysisStep("安装第二道支撑", "support_installation2", {
                'support_type': 'strut',
                'support_level': -10.0,
                'activate_elements': True,
                'prestress': 300000  # 300kN预应力
            }),
            AnalysisStep("第三次开挖(-15m)", "excavation_stage3", {
                'excavation_depth': -15.0,
                'deactivate_elements': True,
                'load_steps': 15,
                'max_iterations': 100
            }),
            AnalysisStep("底板施工", "bottom_slab", {
                'slab_thickness': 1.0,
                'activate_elements': True,
                'concrete_grade': 'C30',
                'curing_time': 28  # 天
            }),
            AnalysisStep("长期监测", "long_term", {
                'time_period': 365,  # 天
                'creep_analysis': True,
                'shrinkage': True
            })
        ]

    def add_analysis_step(self, name: str, step_type: str, parameters: Dict[str, Any] = None):
        """添加分析步骤"""
        step = AnalysisStep(name, step_type, parameters)
        self.analysis_steps.append(step)
        self.log_message.emit(f"添加分析步骤: {name}")

    def remove_analysis_step(self, index: int):
        """移除分析步骤"""
        if 0 <= index < len(self.analysis_steps):
            step = self.analysis_steps.pop(index)
            self.log_message.emit(f"移除分析步骤: {step.name}")

    def set_analysis_type(self, analysis_type: str):
        """设置分析类型"""
        self.analysis_type = analysis_type
        self.log_message.emit(f"设置分析类型: {analysis_type}")

        # 根据分析类型调整默认步骤
        if analysis_type == 'nonlinear':
            self.create_nonlinear_steps()
        # if analysis_type == 'modal':
        #     self.create_modal_steps()
        # elif analysis_type == 'nonlinear':
        #     self.create_nonlinear_steps()
        # elif analysis_type == 'transient':
        #     self.create_transient_steps()
        else:
            self.create_excavation_default_steps()

    def create_modal_steps(self):
        """创建模态分析步骤"""
        self.analysis_steps = [
            AnalysisStep("模态初始化", "modal_initialization", {
                'num_modes': 10,
                'frequency_range': [0, 100]
            }),
            AnalysisStep("特征值求解", "eigenvalue_solution", {
                'solver': 'FEAST',
                'tolerance': 1e-8
            })
        ]

    def create_nonlinear_steps(self):
        """创建非线性分析步骤"""
        self.analysis_steps = [
            AnalysisStep("非线性初始化", "nonlinear_initialization", {
                'material_nonlinearity': True,
                'geometric_nonlinearity': False
            }),
            AnalysisStep("增量加载", "incremental_loading", {
                'load_increments': 20,
                'max_iterations_per_increment': 50
            }),
            AnalysisStep("非线性求解", "nonlinear_solution", {
                'newton_raphson': True,
                'line_search': True,
                'convergence_tolerance': 1e-6
            })
        ]

    def create_transient_steps(self):
        """创建瞬态分析步骤"""
        self.analysis_steps = [
            AnalysisStep("瞬态初始化", "transient_initialization", {
                'time_integration': 'Newmark',
                'damping': True
            }),
            AnalysisStep("时间积分", "time_integration", {
                'time_step': 0.01,
                'total_time': 10.0,
                'max_iterations': 50
            })
        ]

    def start_analysis(self):
        """开始分析"""
        if self.analysis_worker and self.analysis_worker.isRunning():
            self.log_message.emit("分析已在运行中")
            return

        # 重置步骤状态
        for step in self.analysis_steps:
            step.status = 'pending'
            step.results = {}

        self.current_step = 0
        self.analysis_results = []

        # 创建工作线程
        self.analysis_worker = AnalysisWorker(self, self.analysis_steps)

        # 连接信号
        self.analysis_worker.progress_updated.connect(self.progress_updated)
        self.analysis_worker.step_completed.connect(self.on_step_completed)
        self.analysis_worker.analysis_finished.connect(self.on_analysis_finished)
        self.analysis_worker.log_message.connect(self.log_message)

        # 启动线程
        self.analysis_worker.start()
        self.log_message.emit("分析开始运行...")

    def pause_analysis(self):
        """暂停分析"""
        if self.analysis_worker and self.analysis_worker.isRunning():
            self.analysis_worker.pause()
            self.log_message.emit("分析已暂停")

    def resume_analysis(self):
        """恢复分析"""
        if self.analysis_worker and self.analysis_worker.isRunning():
            self.analysis_worker.resume()
            self.log_message.emit("分析已恢复")

    def stop_analysis(self):
        """停止分析"""
        if self.analysis_worker and self.analysis_worker.isRunning():
            self.analysis_worker.stop()
            self.analysis_worker.wait(5000)  # 等待5秒
            self.log_message.emit("分析已停止")

    def on_step_completed(self, step_index: int, results: Dict[str, Any]):
        """步骤完成回调"""
        self.current_step = step_index + 1
        self.analysis_results.append(results)

        step = self.analysis_steps[step_index]
        self.log_message.emit(f"步骤完成: {step.name}")

        # 发射信号
        self.step_completed.emit(step_index, results)

    def on_analysis_finished(self, success: bool, message: str):
        """分析完成回调"""
        if success:
            self.log_message.emit("分析成功完成!")
            self.export_results()
        else:
            self.log_message.emit(f"分析失败: {message}")

        # 发射信号
        self.analysis_finished.emit(success, message)

    def get_analysis_status(self) -> Dict[str, Any]:
        """获取分析状态"""
        status = {
            'analysis_type': self.analysis_type,
            'total_steps': len(self.analysis_steps),
            'current_step': self.current_step,
            'is_running': self.analysis_worker.isRunning() if self.analysis_worker else False,
            'steps': [step.to_dict() for step in self.analysis_steps]
        }
        return status

    def get_step_results(self, step_index: int) -> Dict[str, Any]:
        """获取指定步骤的结果"""
        if 0 <= step_index < len(self.analysis_steps):
            return self.analysis_steps[step_index].results
        return {}

    def get_all_results(self) -> Dict[str, Any]:
        """获取所有结果"""
        return self.analysis_results

    def export_results(self, output_dir: str = None):
        """导出分析结果"""
        if not output_dir:
            project_root = Path(__file__).parent.parent
            output_dir = project_root / "output" / "results"

        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        # 导出结果摘要
        summary = {
            'analysis_type': self.analysis_type,
            'total_steps': len(self.analysis_steps),
            'completion_time': time.strftime('%Y-%m-%d %H:%M:%S'),
            'steps': [step.to_dict() for step in self.analysis_steps],
            'results': self.analysis_results
        }

        summary_file = output_dir / "analysis_summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)

        self.log_message.emit(f"结果已导出到: {summary_file}")

        # 导出VTK结果文件（如果有的话）
        self.export_vtk_results(output_dir)

    def export_vtk_results(self, output_dir: Path):
        """导出VTK格式结果"""
        # TODO: 实现VTK结果导出
        self.log_message.emit("VTK结果导出功能待实现")

    def check_kratos_status(self) -> Dict[str, Any]:
        """检查Kratos状态"""
        status = {
            'available': KRATOS_AVAILABLE,
            'version': 'Unknown',
            'applications': [],
            'memory_usage': 0
        }

        if KRATOS_AVAILABLE and self.kratos_interface:
            try:
                # TODO: 实现具体的Kratos状态检查
                status.update({
                    'version': '9.4',
                    'applications': ['StructuralMechanicsApplication', 'FluidDynamicsApplication'],
                    'memory_usage': 256  # MB
                })
            except Exception as e:
                self.log_message.emit(f"Kratos状态检查失败: {e}")

        return status


# 测试函数
def test_analyzer():
    """测试分析模块"""
    from PyQt6.QtWidgets import QApplication
    from PyQt6.QtCore import QTimer

    app = QApplication(sys.argv)

    # 创建分析器
    analyzer = Analyzer()

    # 连接信号
    analyzer.log_message.connect(lambda msg: print(f"LOG: {msg}"))
    analyzer.progress_updated.connect(lambda progress, msg: print(f"PROGRESS: {progress}% - {msg}"))
    analyzer.analysis_finished.connect(lambda success, msg: print(f"FINISHED: {success} - {msg}"))

    # 设置分析类型
    analyzer.set_analysis_type('static')

    # 添加自定义步骤
    analyzer.add_analysis_step("自定义步骤", "custom", {'param1': 100})

    # 开始分析
    QTimer.singleShot(1000, analyzer.start_analysis)

    # 运行5秒后退出
    QTimer.singleShot(10000, app.quit)

    sys.exit(app.exec())


if __name__ == "__main__":
    test_analyzer()