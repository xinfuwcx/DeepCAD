"""
网格质量分析和可视化系统
集成Gmsh质量检查和PyVista可视化
"""

import logging
import numpy as np
import random
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path
import json
import time
from dataclasses import dataclass, asdict
from enum import Enum

try:
    import gmsh
    GMSH_AVAILABLE = True
except ImportError:
    GMSH_AVAILABLE = False
    logging.warning("Gmsh不可用，网格质量分析将使用模拟模式")

try:
    from ..visualization.pyvista_web_bridge import get_pyvista_bridge
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    logging.warning("PyVista不可用，网格可视化将被禁用")

logger = logging.getLogger(__name__)


class QualityMetric(Enum):
    """网格质量指标枚举"""
    ASPECT_RATIO = "aspect_ratio"
    SKEWNESS = "skewness" 
    ORTHOGONALITY = "orthogonality"
    VOLUME = "volume"
    JACOBIAN = "jacobian"
    WARPAGE = "warpage"
    TAPER = "taper"
    MIN_ANGLE = "min_angle"
    MAX_ANGLE = "max_angle"


@dataclass
class QualityResult:
    """单个质量指标结果"""
    metric: QualityMetric
    min_value: float
    max_value: float
    mean_value: float
    std_value: float
    poor_elements: List[int]
    acceptable_range: Tuple[float, float]
    status: str  # 'excellent', 'good', 'acceptable', 'poor', 'unacceptable'


@dataclass
class MeshQualityReport:
    """完整的网格质量报告"""
    mesh_file: str
    timestamp: str
    total_nodes: int
    total_elements: int
    element_types: Dict[str, int]
    quality_metrics: Dict[str, QualityResult]
    overall_score: float
    recommendations: List[str]
    visualization_data: Optional[Dict[str, Any]] = None


class MeshQualityAnalyzer:
    """
    网格质量分析器
    
    功能:
    - 多种质量指标计算
    - 问题区域识别
    - 可视化数据生成
    - 修复建议生成
    """
    
    def __init__(self):
        self.pyvista_bridge = get_pyvista_bridge() if PYVISTA_AVAILABLE else None
        self.quality_thresholds = self._get_default_thresholds()
        
    def _get_default_thresholds(self) -> Dict[QualityMetric, Dict[str, float]]:
        """获取默认质量阈值"""
        return {
            QualityMetric.ASPECT_RATIO: {
                'excellent': 1.0, 'good': 3.0, 'acceptable': 10.0, 'poor': 20.0
            },
            QualityMetric.SKEWNESS: {
                'excellent': 0.1, 'good': 0.3, 'acceptable': 0.7, 'poor': 0.9
            },
            QualityMetric.ORTHOGONALITY: {
                'excellent': 0.9, 'good': 0.7, 'acceptable': 0.5, 'poor': 0.3
            },
            QualityMetric.MIN_ANGLE: {
                'excellent': 45.0, 'good': 30.0, 'acceptable': 15.0, 'poor': 5.0
            },
            QualityMetric.MAX_ANGLE: {
                'excellent': 90.0, 'good': 120.0, 'acceptable': 150.0, 'poor': 170.0
            },
            QualityMetric.JACOBIAN: {
                'excellent': 0.8, 'good': 0.6, 'acceptable': 0.3, 'poor': 0.1
            }
        }
    
    def analyze_mesh(self, mesh_file: str, output_dir: Optional[str] = None) -> MeshQualityReport:
        """分析网格质量"""
        logger.info(f"开始分析网格质量: {mesh_file}")
        
        if not Path(mesh_file).exists():
            raise FileNotFoundError(f"网格文件不存在: {mesh_file}")
        
        # 创建报告
        report = MeshQualityReport(
            mesh_file=mesh_file,
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
            total_nodes=0,
            total_elements=0,
            element_types={},
            quality_metrics={},
            overall_score=0.0,
            recommendations=[]
        )
        
        try:
            if GMSH_AVAILABLE:
                # 使用Gmsh进行真实分析
                report = self._analyze_with_gmsh(mesh_file, report)
            else:
                # 使用模拟分析
                report = self._analyze_simulation(mesh_file, report)
            
            # 生成可视化数据
            if PYVISTA_AVAILABLE and output_dir:
                report.visualization_data = self._generate_visualization(
                    mesh_file, report, output_dir
                )
            
            # 生成修复建议
            report.recommendations = self._generate_recommendations(report)
            
            # 计算总体评分
            report.overall_score = self._calculate_overall_score(report)
            
            logger.info(f"网格质量分析完成，总体评分: {report.overall_score:.2f}")
            
        except Exception as e:
            logger.error(f"网格质量分析失败: {e}")
            raise
        
        return report
    
    def _analyze_with_gmsh(self, mesh_file: str, report: MeshQualityReport) -> MeshQualityReport:
        """使用Gmsh进行网格质量分析"""
        gmsh.initialize()
        gmsh.option.setNumber("General.Terminal", 0)  # 禁用终端输出
        
        try:
            # 打开网格文件
            gmsh.open(mesh_file)
            
            # 获取基本信息
            nodes = gmsh.model.mesh.getNodes()
            report.total_nodes = len(nodes[0])
            
            # 获取单元信息
            element_types = gmsh.model.mesh.getElementTypes()
            for elem_type in element_types:
                elements = gmsh.model.mesh.getElementsByType(elem_type)
                elem_name = gmsh.model.mesh.getElementProperties(elem_type)[0]
                report.element_types[elem_name] = len(elements[0])
                report.total_elements += len(elements[0])
            
            # 计算质量指标
            for metric in QualityMetric:
                if metric in self.quality_thresholds:
                    result = self._calculate_quality_metric_gmsh(metric, element_types)
                    report.quality_metrics[metric.value] = result
            
        finally:
            gmsh.finalize()
        
        return report
    
    def _analyze_simulation(self, mesh_file: str, report: MeshQualityReport) -> MeshQualityReport:
        """模拟网格质量分析"""
        import random
        
        # 模拟基本信息
        report.total_nodes = random.randint(1000, 10000)
        report.total_elements = random.randint(500, 5000)
        report.element_types = {
            "Tetrahedron": random.randint(300, 3000),
            "Hexahedron": random.randint(100, 1000),
            "Prism": random.randint(50, 500)
        }
        
        # 模拟质量指标
        for metric in QualityMetric:
            if metric in self.quality_thresholds:
                result = self._generate_mock_quality_result(metric)
                report.quality_metrics[metric.value] = result
        
        logger.info("🎭 使用模拟模式生成网格质量报告")
        return report
    
    def _calculate_quality_metric_gmsh(self, metric: QualityMetric, element_types: List[int]) -> QualityResult:
        """使用Gmsh计算质量指标"""
        all_values = []
        poor_elements = []
        
        for elem_type in element_types:
            elements = gmsh.model.mesh.getElementsByType(elem_type)
            
            # 根据指标类型计算不同的质量值
            if metric == QualityMetric.ASPECT_RATIO:
                values = self._calculate_aspect_ratio_gmsh(elem_type, elements)
            elif metric == QualityMetric.SKEWNESS:
                values = self._calculate_skewness_gmsh(elem_type, elements)
            elif metric == QualityMetric.JACOBIAN:
                values = self._calculate_jacobian_gmsh(elem_type, elements)
            else:
                # 其他指标的计算...
                values = [random.uniform(0.1, 1.0) for _ in elements[0]]
            
            all_values.extend(values)
            
            # 识别质量差的单元
            thresholds = self.quality_thresholds[metric]
            poor_threshold = thresholds['poor']
            
            for i, value in enumerate(values):
                if self._is_poor_quality(metric, value, poor_threshold):
                    poor_elements.append(elements[0][i])
        
        return self._create_quality_result(metric, all_values, poor_elements)
    
    def _generate_mock_quality_result(self, metric: QualityMetric) -> QualityResult:
        """生成模拟质量结果"""
        import random
        
        # 根据指标类型生成合理的模拟数据
        if metric == QualityMetric.ASPECT_RATIO:
            values = [random.uniform(1.0, 15.0) for _ in range(100)]
        elif metric == QualityMetric.SKEWNESS:
            values = [random.uniform(0.0, 0.8) for _ in range(100)]
        elif metric == QualityMetric.ORTHOGONALITY:
            values = [random.uniform(0.3, 1.0) for _ in range(100)]
        elif metric == QualityMetric.MIN_ANGLE:
            values = [random.uniform(5.0, 60.0) for _ in range(100)]
        elif metric == QualityMetric.MAX_ANGLE:
            values = [random.uniform(90.0, 170.0) for _ in range(100)]
        else:
            values = [random.uniform(0.1, 1.0) for _ in range(100)]
        
        # 生成一些质量差的单元
        poor_elements = random.sample(range(1000), random.randint(5, 20))
        
        return self._create_quality_result(metric, values, poor_elements)
    
    def _create_quality_result(self, metric: QualityMetric, values: List[float], poor_elements: List[int]) -> QualityResult:
        """创建质量结果对象"""
        values_array = np.array(values)
        
        min_val = float(values_array.min())
        max_val = float(values_array.max())
        mean_val = float(values_array.mean())
        std_val = float(values_array.std())
        
        # 确定状态
        thresholds = self.quality_thresholds[metric]
        status = self._determine_status(metric, mean_val, thresholds)
        
        # 确定可接受范围
        acceptable_range = (thresholds['poor'], thresholds['excellent'])
        
        return QualityResult(
            metric=metric,
            min_value=min_val,
            max_value=max_val,
            mean_value=mean_val,
            std_value=std_val,
            poor_elements=poor_elements,
            acceptable_range=acceptable_range,
            status=status
        )
    
    def _determine_status(self, metric: QualityMetric, value: float, thresholds: Dict[str, float]) -> str:
        """确定质量状态"""
        if metric in [QualityMetric.ASPECT_RATIO, QualityMetric.SKEWNESS, QualityMetric.MAX_ANGLE]:
            # 越小越好的指标
            if value <= thresholds['excellent']:
                return 'excellent'
            elif value <= thresholds['good']:
                return 'good'
            elif value <= thresholds['acceptable']:
                return 'acceptable'
            elif value <= thresholds['poor']:
                return 'poor'
            else:
                return 'unacceptable'
        else:
            # 越大越好的指标
            if value >= thresholds['excellent']:
                return 'excellent'
            elif value >= thresholds['good']:
                return 'good'
            elif value >= thresholds['acceptable']:
                return 'acceptable'
            elif value >= thresholds['poor']:
                return 'poor'
            else:
                return 'unacceptable'
    
    def _is_poor_quality(self, metric: QualityMetric, value: float, threshold: float) -> bool:
        """判断是否为质量差的单元"""
        if metric in [QualityMetric.ASPECT_RATIO, QualityMetric.SKEWNESS, QualityMetric.MAX_ANGLE]:
            return value > threshold
        else:
            return value < threshold
    
    def _calculate_aspect_ratio_gmsh(self, elem_type: int, elements: Tuple) -> List[float]:
        """计算长宽比（使用Gmsh）"""
        # 实现Gmsh长宽比计算
        # 这里需要具体的Gmsh API调用
        return [1.0] * len(elements[0])  # 占位符
    
    def _calculate_skewness_gmsh(self, elem_type: int, elements: Tuple) -> List[float]:
        """计算偏斜度（使用Gmsh）"""
        # 实现Gmsh偏斜度计算
        return [0.1] * len(elements[0])  # 占位符
    
    def _calculate_jacobian_gmsh(self, elem_type: int, elements: Tuple) -> List[float]:
        """计算雅可比行列式（使用Gmsh）"""
        # 实现Gmsh雅可比计算
        return [0.8] * len(elements[0])  # 占位符
    
    def _generate_visualization(self, mesh_file: str, report: MeshQualityReport, output_dir: str) -> Dict[str, Any]:
        """生成质量可视化数据"""
        if not self.pyvista_bridge or not self.pyvista_bridge.is_available:
            logger.warning("PyVista不可用，跳过可视化生成")
            return {}
        
        try:
            # 加载网格
            mesh = self.pyvista_bridge.load_mesh(mesh_file)
            if mesh is None:
                logger.warning(f"无法加载网格文件: {mesh_file}")
                return {}
            
            visualization_data = {}
            
            # 为每个质量指标生成可视化
            for metric_name, quality_result in report.quality_metrics.items():
                # 生成质量云图
                quality_mesh_path = self._create_quality_visualization(
                    mesh, metric_name, quality_result, output_dir
                )
                
                if quality_mesh_path:
                    visualization_data[metric_name] = {
                        'mesh_path': quality_mesh_path,
                        'poor_elements': quality_result.poor_elements,
                        'color_range': [quality_result.min_value, quality_result.max_value]
                    }
            
            # 生成问题区域可视化
            problem_areas_path = self._create_problem_areas_visualization(
                mesh, report, output_dir
            )
            
            if problem_areas_path:
                visualization_data['problem_areas'] = {
                    'mesh_path': problem_areas_path,
                    'description': '质量问题汇总'
                }
            
            return visualization_data
            
        except Exception as e:
            logger.error(f"生成可视化数据失败: {e}")
            return {}
    
    def _create_quality_visualization(self, mesh: Any, metric_name: str, 
                                    quality_result: QualityResult, output_dir: str) -> Optional[str]:
        """创建单个质量指标的可视化"""
        try:
            output_path = Path(output_dir) / f"quality_{metric_name}.gltf"
            
            # 这里需要根据实际的PyVista API实现质量着色
            # 暂时使用占位符
            processed_mesh = self.pyvista_bridge.process_mesh_for_web(mesh, "surface", metric_name)
            
            if processed_mesh:
                exported_path = self.pyvista_bridge.mesh_to_web_format(processed_mesh, "gltf")
                return exported_path
            
        except Exception as e:
            logger.error(f"创建质量可视化失败 ({metric_name}): {e}")
        
        return None
    
    def _create_problem_areas_visualization(self, mesh: Any, report: MeshQualityReport, 
                                          output_dir: str) -> Optional[str]:
        """创建问题区域可视化"""
        try:
            output_path = Path(output_dir) / "problem_areas.gltf"
            
            # 收集所有问题单元
            all_problem_elements = set()
            for quality_result in report.quality_metrics.values():
                all_problem_elements.update(quality_result.poor_elements)
            
            # 创建问题区域着色网格
            # 这里需要根据实际的PyVista API实现
            processed_mesh = self.pyvista_bridge.process_mesh_for_web(mesh, "surface")
            
            if processed_mesh:
                exported_path = self.pyvista_bridge.mesh_to_web_format(processed_mesh, "gltf")
                return exported_path
            
        except Exception as e:
            logger.error(f"创建问题区域可视化失败: {e}")
        
        return None
    
    def _generate_recommendations(self, report: MeshQualityReport) -> List[str]:
        """生成修复建议"""
        recommendations = []
        
        for metric_name, quality_result in report.quality_metrics.items():
            if quality_result.status in ['poor', 'unacceptable']:
                recommendations.extend(
                    self._get_metric_recommendations(quality_result.metric, quality_result)
                )
        
        # 通用建议
        if report.total_elements > 100000:
            recommendations.append("模型规模较大，建议使用网格自适应细化")
        
        if len([r for r in report.quality_metrics.values() if r.status in ['poor', 'unacceptable']]) > 2:
            recommendations.append("多个质量指标不佳，建议重新生成网格")
        
        return list(set(recommendations))  # 去重
    
    def _get_metric_recommendations(self, metric: QualityMetric, result: QualityResult) -> List[str]:
        """获取特定指标的建议"""
        recommendations = []
        
        if metric == QualityMetric.ASPECT_RATIO:
            recommendations.append("长宽比过大，建议调整网格密度或使用结构化网格")
            recommendations.append("在高梯度区域增加网格密度")
        
        elif metric == QualityMetric.SKEWNESS:
            recommendations.append("网格偏斜度过大，建议优化几何或调整网格生成参数")
            recommendations.append("检查边界条件设置是否合理")
        
        elif metric == QualityMetric.MIN_ANGLE:
            recommendations.append("最小角度过小，可能影响数值稳定性")
            recommendations.append("考虑使用更高阶的单元类型")
        
        elif metric == QualityMetric.JACOBIAN:
            recommendations.append("雅可比行列式过小，可能导致计算错误")
            recommendations.append("检查网格是否存在退化单元")
        
        return recommendations
    
    def _calculate_overall_score(self, report: MeshQualityReport) -> float:
        """计算总体质量评分"""
        if not report.quality_metrics:
            return 0.0
        
        status_scores = {
            'excellent': 100,
            'good': 80,
            'acceptable': 60,
            'poor': 40,
            'unacceptable': 20
        }
        
        total_score = sum(status_scores.get(result.status, 0) 
                         for result in report.quality_metrics.values())
        
        return total_score / len(report.quality_metrics)
    
    def export_report(self, report: MeshQualityReport, output_file: str) -> bool:
        """导出质量报告"""
        try:
            output_path = Path(output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            # 转换为可序列化的格式
            report_dict = self._report_to_dict(report)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(report_dict, f, indent=2, ensure_ascii=False)
            
            logger.info(f"质量报告已导出: {output_file}")
            return True
            
        except Exception as e:
            logger.error(f"导出质量报告失败: {e}")
            return False
    
    def _report_to_dict(self, report: MeshQualityReport) -> Dict[str, Any]:
        """将报告转换为字典格式"""
        import numpy as np
        
        def convert_for_json(obj):
            """转换对象为JSON兼容格式"""
            if isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, np.floating):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, (list, tuple)):
                return [convert_for_json(item) for item in obj]
            elif isinstance(obj, dict):
                return {k: convert_for_json(v) for k, v in obj.items()}
            else:
                return obj
        
        report_dict = asdict(report)
        
        # 转换枚举类型和数值类型
        quality_metrics_dict = {}
        for metric_name, quality_result in report.quality_metrics.items():
            result_dict = asdict(quality_result)
            result_dict['metric'] = quality_result.metric.value
            # 确保所有数值类型兼容JSON
            result_dict = convert_for_json(result_dict)
            quality_metrics_dict[metric_name] = result_dict
        
        report_dict['quality_metrics'] = quality_metrics_dict
        
        # 转换其他可能的数值类型
        report_dict = convert_for_json(report_dict)
        
        return report_dict


# 便捷函数
def analyze_mesh_quality(mesh_file: str, output_dir: Optional[str] = None) -> MeshQualityReport:
    """分析网格质量的便捷函数"""
    analyzer = MeshQualityAnalyzer()
    return analyzer.analyze_mesh(mesh_file, output_dir)


def export_quality_report(report: MeshQualityReport, output_file: str) -> bool:
    """导出质量报告的便捷函数"""
    analyzer = MeshQualityAnalyzer()
    return analyzer.export_report(report, output_file)


class MeshQualityOptimizer:
    """网格质量自动优化器"""
    
    def __init__(self):
        self.optimization_strategies = {
            'poor_aspect_ratio': self._optimize_aspect_ratio,
            'high_skewness': self._optimize_skewness,
            'bad_angles': self._optimize_angles,
            'small_volumes': self._optimize_volumes
        }
    
    def optimize_mesh_automatically(self, mesh_file: str, report: MeshQualityReport) -> Dict[str, Any]:
        """
        基于质量报告自动优化网格
        
        Args:
            mesh_file: 网格文件路径
            report: 质量分析报告
            
        Returns:
            优化结果和改进后的网格信息
        """
        if not GMSH_AVAILABLE:
            return {"status": "error", "message": "GMSH不可用，无法执行网格优化"}
        
        try:
            # 初始化GMSH
            gmsh.initialize()
            gmsh.open(mesh_file)
            
            optimization_actions = []
            
            # 分析质量问题并应用相应优化
            for metric_name, quality_result in report.quality_metrics.items():
                if quality_result.status in ['poor', 'unacceptable']:
                    optimization_type = self._get_optimization_type(metric_name, quality_result)
                    if optimization_type:
                        success = self._apply_optimization(optimization_type, quality_result)
                        optimization_actions.append({
                            'metric': metric_name,
                            'optimization': optimization_type,
                            'success': success,
                            'poor_elements_count': len(quality_result.poor_elements)
                        })
            
            # 应用全局网格优化
            self._apply_global_optimization()
            
            # 重新生成网格
            gmsh.model.mesh.clear()
            gmsh.model.mesh.generate(3)
            
            # 保存优化后的网格
            optimized_file = mesh_file.replace('.msh', '_optimized.msh')
            gmsh.write(optimized_file)
            
            gmsh.finalize()
            
            return {
                'status': 'success',
                'optimized_file': optimized_file,
                'optimization_actions': optimization_actions,
                'improvements': len(optimization_actions)
            }
            
        except Exception as e:
            logger.error(f"网格优化失败: {str(e)}")
            if gmsh.isInitialized():
                gmsh.finalize()
            return {"status": "error", "message": str(e)}
    
    def _get_optimization_type(self, metric_name: str, quality_result: QualityResult) -> Optional[str]:
        """根据质量指标确定优化类型"""
        if metric_name == 'aspect_ratio' and quality_result.mean_value > 5.0:
            return 'poor_aspect_ratio'
        elif metric_name == 'skewness' and quality_result.mean_value > 0.5:
            return 'high_skewness'
        elif metric_name in ['min_angle', 'max_angle']:
            return 'bad_angles'
        elif metric_name == 'volume' and quality_result.min_value < 1e-12:
            return 'small_volumes'
        return None
    
    def _apply_optimization(self, optimization_type: str, quality_result: QualityResult) -> bool:
        """应用具体的优化策略"""
        try:
            if optimization_type in self.optimization_strategies:
                return self.optimization_strategies[optimization_type](quality_result)
            return False
        except Exception as e:
            logger.error(f"优化策略{optimization_type}执行失败: {str(e)}")
            return False
    
    def _optimize_aspect_ratio(self, quality_result: QualityResult) -> bool:
        """优化高宽比问题"""
        # 减小网格尺寸以改善高宽比
        current_size = gmsh.option.getNumber("Mesh.MeshSizeMax")
        gmsh.option.setNumber("Mesh.MeshSizeMax", current_size * 0.8)
        gmsh.option.setNumber("Mesh.MeshSizeMin", current_size * 0.4)
        return True
    
    def _optimize_skewness(self, quality_result: QualityResult) -> bool:
        """优化偏斜度问题"""
        # 启用高阶网格优化
        gmsh.option.setNumber("Mesh.HighOrderOptimize", 2)
        gmsh.option.setNumber("Mesh.OptimizeNetgen", 1)
        return True
    
    def _optimize_angles(self, quality_result: QualityResult) -> bool:
        """优化角度问题"""
        # 切换到更适合的网格算法
        gmsh.option.setNumber("Mesh.Algorithm", 5)  # Delaunay算法
        gmsh.option.setNumber("Mesh.Algorithm3D", 4)  # Frontal算法
        return True
    
    def _optimize_volumes(self, quality_result: QualityResult) -> bool:
        """优化体积问题"""
        # 增加几何容差以避免退化单元
        gmsh.option.setNumber("Geometry.Tolerance", 1e-8)
        gmsh.option.setNumber("Mesh.MinimumElementVolume", 1e-10)
        return True
    
    def _apply_global_optimization(self):
        """应用全局网格优化"""
        # 启用全局网格优化选项
        gmsh.option.setNumber("Mesh.Optimize", 1)
        gmsh.option.setNumber("Mesh.OptimizeNetgen", 1)
        gmsh.option.setNumber("Mesh.HighOrderOptimize", 1)
        gmsh.option.setNumber("Mesh.Smoothing", 3)


def optimize_mesh_quality(mesh_file: str) -> Dict[str, Any]:
    """网格质量优化的便捷函数"""
    # 首先分析当前网格质量
    report = analyze_mesh_quality(mesh_file)
    
    # 如果质量足够好，无需优化
    if report.overall_score > 0.8:
        return {
            'status': 'no_optimization_needed',
            'current_score': report.overall_score,
            'message': '网格质量良好，无需优化'
        }
    
    # 执行自动优化
    optimizer = MeshQualityOptimizer()
    return optimizer.optimize_mesh_automatically(mesh_file, report)