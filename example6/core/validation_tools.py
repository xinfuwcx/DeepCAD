#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
结果验证和对比工具 - Result Validation and Comparison Tools
专业的桥墩冲刷分析验证系统

Features:
- 标准算例验证
- 实验数据对比
- 多方法交叉验证  
- 误差分析和统计检验
- 基准测试和性能评估
- 文献数据库集成
"""

import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import json
import csv
from datetime import datetime
import warnings

# 科学计算库
try:
    from scipy import stats, optimize
    from scipy.interpolate import interp1d
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

# 统计分析库
try:
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
    from sklearn.linear_model import LinearRegression
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

# 本地模块
from .empirical_solver import ScourParameters, ScourResult, PierShape
from .advanced_solver import SolverResult, NumericalParameters


class ValidationDataSource(Enum):
    """验证数据源类型"""
    LABORATORY = "laboratory"          # 实验室数据
    FIELD = "field"                   # 现场监测数据
    LITERATURE = "literature"         # 文献数据
    NUMERICAL = "numerical"           # 数值模拟数据
    ANALYTICAL = "analytical"         # 解析解
    BENCHMARK = "benchmark"           # 标准算例


class ValidationMetric(Enum):
    """验证指标类型"""
    RMSE = "rmse"                     # 均方根误差
    MAE = "mae"                       # 平均绝对误差
    MAPE = "mape"                     # 平均绝对百分比误差
    R2 = "r2"                         # 决定系数
    BIAS = "bias"                     # 偏差
    NSE = "nse"                       # Nash-Sutcliffe效率系数
    CORRELATION = "correlation"        # 相关系数
    INDEX_AGREEMENT = "index_agreement" # 一致性指数


@dataclass
class ValidationCase:
    """验证算例"""
    case_id: str
    name: str
    description: str
    source: ValidationDataSource
    
    # 输入参数
    parameters: ScourParameters
    
    # 参考结果
    reference_value: float
    reference_uncertainty: Optional[float] = None
    
    # 元数据
    author: str = ""
    year: int = 0
    reference_citation: str = ""
    conditions: Dict[str, Any] = field(default_factory=dict)
    notes: str = ""


@dataclass
class ValidationResult:
    """验证结果"""
    case_id: str
    predicted_value: float
    reference_value: float
    absolute_error: float
    relative_error: float
    
    # 统计指标
    metrics: Dict[ValidationMetric, float] = field(default_factory=dict)
    
    # 置信区间
    confidence_interval: Optional[Tuple[float, float]] = None
    
    # 验证状态
    is_valid: bool = True
    validation_notes: str = ""


@dataclass
class ValidationReport:
    """验证报告"""
    method_name: str
    total_cases: int
    valid_cases: int
    overall_metrics: Dict[ValidationMetric, float]
    case_results: List[ValidationResult]
    
    # 统计分析
    statistical_tests: Dict[str, Dict[str, float]] = field(default_factory=dict)
    performance_grade: str = "Unknown"
    recommendations: List[str] = field(default_factory=list)


class ValidationDatabase:
    """验证数据库"""
    
    def __init__(self, database_path: Optional[Path] = None):
        self.database_path = database_path or Path("validation_database.json")
        self.cases = {}
        self.load_database()
        
        # 加载内置标准算例
        self._load_built_in_cases()
    
    def load_database(self):
        """加载验证数据库"""
        if self.database_path.exists():
            try:
                with open(self.database_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                for case_data in data.get('cases', []):
                    case = ValidationCase(**case_data)
                    self.cases[case.case_id] = case
                    
            except Exception as e:
                print(f"加载验证数据库失败: {e}")
    
    def save_database(self):
        """保存验证数据库"""
        try:
            data = {
                'metadata': {
                    'created_at': datetime.now().isoformat(),
                    'version': '1.0',
                    'total_cases': len(self.cases)
                },
                'cases': [self._case_to_dict(case) for case in self.cases.values()]
            }
            
            with open(self.database_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False, default=str)
                
        except Exception as e:
            print(f"保存验证数据库失败: {e}")
    
    def add_case(self, case: ValidationCase):
        """添加验证算例"""
        self.cases[case.case_id] = case
        self.save_database()
    
    def get_cases_by_source(self, source: ValidationDataSource) -> List[ValidationCase]:
        """按数据源获取算例"""
        return [case for case in self.cases.values() if case.source == source]
    
    def get_cases_by_parameter_range(self, 
                                   parameter_name: str,
                                   min_value: float,
                                   max_value: float) -> List[ValidationCase]:
        """按参数范围获取算例"""
        cases = []
        for case in self.cases.values():
            if hasattr(case.parameters, parameter_name):
                value = getattr(case.parameters, parameter_name)
                if min_value <= value <= max_value:
                    cases.append(case)
        return cases
    
    def _case_to_dict(self, case: ValidationCase) -> Dict:
        """将算例转换为字典"""
        return {
            'case_id': case.case_id,
            'name': case.name,
            'description': case.description,
            'source': case.source.value,
            'parameters': {
                'pier_diameter': case.parameters.pier_diameter,
                'pier_shape': case.parameters.pier_shape.value,
                'flow_velocity': case.parameters.flow_velocity,
                'water_depth': case.parameters.water_depth,
                'd50': case.parameters.d50,
                'pier_angle': getattr(case.parameters, 'pier_angle', 0)
            },
            'reference_value': case.reference_value,
            'reference_uncertainty': case.reference_uncertainty,
            'author': case.author,
            'year': case.year,
            'reference_citation': case.reference_citation,
            'conditions': case.conditions,
            'notes': case.notes
        }
    
    def _load_built_in_cases(self):
        """加载内置标准算例"""
        # Melville & Chiew (1999) 实验数据
        melville_cases = [
            {
                'case_id': 'melville_1999_case1',
                'name': 'Melville清水冲刷实验1',
                'description': '圆形桥墩清水冲刷实验，深水条件',
                'source': ValidationDataSource.LABORATORY,
                'parameters': ScourParameters(
                    pier_diameter=0.05,  # 5cm
                    pier_shape=PierShape.CIRCULAR,
                    flow_velocity=0.26,
                    water_depth=0.15,
                    d50=0.8
                ),
                'reference_value': 0.0295,  # 冲刷深度/桥墩直径 = 0.59
                'reference_uncertainty': 0.002,
                'author': 'Melville & Chiew',
                'year': 1999,
                'reference_citation': 'Melville, B.W. & Chiew, Y.M. (1999). Time scale for local scour.',
                'conditions': {
                    'flow_type': 'clear_water',
                    'bed_material': 'uniform_sand',
                    'approach_flow': 'uniform'
                }
            },
            {
                'case_id': 'melville_1999_case2', 
                'name': 'Melville清水冲刷实验2',
                'description': '圆形桥墩清水冲刷实验，浅水条件',
                'source': ValidationDataSource.LABORATORY,
                'parameters': ScourParameters(
                    pier_diameter=0.05,
                    pier_shape=PierShape.CIRCULAR,
                    flow_velocity=0.23,
                    water_depth=0.08,
                    d50=0.8
                ),
                'reference_value': 0.032,
                'reference_uncertainty': 0.002,
                'author': 'Melville & Chiew',
                'year': 1999,
                'reference_citation': 'Melville, B.W. & Chiew, Y.M. (1999). Time scale for local scour.',
                'conditions': {
                    'flow_type': 'clear_water',
                    'bed_material': 'uniform_sand',
                    'approach_flow': 'uniform',
                    'depth_condition': 'shallow'
                }
            }
        ]
        
        # Richardson & Davis (2001) HEC-18 数据
        hec18_cases = [
            {
                'case_id': 'hec18_example_1',
                'name': 'HEC-18标准算例1',
                'description': 'HEC-18手册标准算例，圆形桥墩',
                'source': ValidationDataSource.BENCHMARK,
                'parameters': ScourParameters(
                    pier_diameter=1.2,
                    pier_shape=PierShape.CIRCULAR,
                    flow_velocity=2.1,
                    water_depth=4.5,
                    d50=0.3
                ),
                'reference_value': 2.7,
                'author': 'Richardson & Davis',
                'year': 2001,
                'reference_citation': 'Richardson, E.V. & Davis, S.R. (2001). HEC-18.',
                'conditions': {
                    'flow_type': 'live_bed',
                    'bed_material': 'sand',
                    'design_condition': 'standard'
                }
            }
        ]
        
        # 添加内置算例
        all_builtin_cases = melville_cases + hec18_cases
        
        for case_data in all_builtin_cases:
            # 重建参数对象
            params_dict = case_data['parameters']
            if isinstance(params_dict, dict):
                case_data['parameters'] = ScourParameters(
                    pier_diameter=params_dict['pier_diameter'],
                    pier_shape=PierShape(params_dict['pier_shape']),
                    flow_velocity=params_dict['flow_velocity'],
                    water_depth=params_dict['water_depth'],
                    d50=params_dict['d50']
                )
            
            case = ValidationCase(**case_data)
            if case.case_id not in self.cases:
                self.cases[case.case_id] = case


class ResultValidator:
    """结果验证器"""
    
    def __init__(self, database: Optional[ValidationDatabase] = None):
        self.database = database or ValidationDatabase()
        self.validation_history = []
    
    def validate_single_case(self, 
                           case: ValidationCase,
                           solver_function: Callable,
                           tolerance: float = 0.3) -> ValidationResult:
        """验证单个算例"""
        
        try:
            # 计算预测值
            result = solver_function(case.parameters)
            predicted_value = result.scour_depth if hasattr(result, 'scour_depth') else result
            
            # 计算误差
            absolute_error = abs(predicted_value - case.reference_value)
            relative_error = absolute_error / case.reference_value * 100
            
            # 计算统计指标
            metrics = {}
            metrics[ValidationMetric.RMSE] = absolute_error
            metrics[ValidationMetric.MAE] = absolute_error
            metrics[ValidationMetric.MAPE] = relative_error
            metrics[ValidationMetric.BIAS] = predicted_value - case.reference_value
            
            # 验证状态
            is_valid = relative_error <= tolerance * 100
            validation_notes = ""
            
            if not is_valid:
                validation_notes = f"相对误差 {relative_error:.1f}% 超过容忍度 {tolerance*100:.1f}%"
            
            return ValidationResult(
                case_id=case.case_id,
                predicted_value=predicted_value,
                reference_value=case.reference_value,
                absolute_error=absolute_error,
                relative_error=relative_error,
                metrics=metrics,
                is_valid=is_valid,
                validation_notes=validation_notes
            )
            
        except Exception as e:
            return ValidationResult(
                case_id=case.case_id,
                predicted_value=np.nan,
                reference_value=case.reference_value,
                absolute_error=np.nan,
                relative_error=np.nan,
                is_valid=False,
                validation_notes=f"计算失败: {str(e)}"
            )
    
    def validate_method(self,
                       solver_function: Callable,
                       method_name: str,
                       case_filter: Optional[Callable] = None,
                       tolerance: float = 0.3) -> ValidationReport:
        """验证计算方法"""
        
        # 筛选算例
        if case_filter:
            cases = [case for case in self.database.cases.values() if case_filter(case)]
        else:
            cases = list(self.database.cases.values())
        
        if not cases:
            return ValidationReport(
                method_name=method_name,
                total_cases=0,
                valid_cases=0,
                overall_metrics={},
                case_results=[]
            )
        
        # 验证各个算例
        case_results = []
        for case in cases:
            result = self.validate_single_case(case, solver_function, tolerance)
            case_results.append(result)
        
        # 计算总体指标
        valid_results = [r for r in case_results if r.is_valid and not np.isnan(r.predicted_value)]
        valid_cases = len(valid_results)
        
        overall_metrics = {}
        if valid_results:
            predicted_values = [r.predicted_value for r in valid_results]
            reference_values = [r.reference_value for r in valid_results]
            
            overall_metrics[ValidationMetric.RMSE] = np.sqrt(np.mean([(p-r)**2 for p, r in zip(predicted_values, reference_values)]))
            overall_metrics[ValidationMetric.MAE] = np.mean([abs(p-r) for p, r in zip(predicted_values, reference_values)])
            overall_metrics[ValidationMetric.MAPE] = np.mean([abs(p-r)/r*100 for p, r in zip(predicted_values, reference_values)])
            overall_metrics[ValidationMetric.BIAS] = np.mean([p-r for p, r in zip(predicted_values, reference_values)])
            
            if SCIPY_AVAILABLE:
                correlation, p_value = stats.pearsonr(predicted_values, reference_values)
                overall_metrics[ValidationMetric.CORRELATION] = correlation
            
            if SKLEARN_AVAILABLE:
                overall_metrics[ValidationMetric.R2] = r2_score(reference_values, predicted_values)
        
        # 统计检验
        statistical_tests = {}
        if len(valid_results) >= 3 and SCIPY_AVAILABLE:
            # t检验检查偏差显著性
            errors = [r.predicted_value - r.reference_value for r in valid_results]
            t_stat, p_value = stats.ttest_1samp(errors, 0)
            statistical_tests['bias_t_test'] = {'t_statistic': t_stat, 'p_value': p_value}
            
            # Shapiro-Wilk正态性检验
            shapiro_stat, shapiro_p = stats.shapiro(errors)
            statistical_tests['normality_test'] = {'statistic': shapiro_stat, 'p_value': shapiro_p}
        
        # 性能评级
        performance_grade = self._assess_performance(overall_metrics, valid_cases, len(cases))
        
        # 生成建议
        recommendations = self._generate_recommendations(overall_metrics, statistical_tests)
        
        report = ValidationReport(
            method_name=method_name,
            total_cases=len(cases),
            valid_cases=valid_cases,
            overall_metrics=overall_metrics,
            case_results=case_results,
            statistical_tests=statistical_tests,
            performance_grade=performance_grade,
            recommendations=recommendations
        )
        
        # 记录验证历史
        self.validation_history.append({
            'timestamp': datetime.now(),
            'method': method_name,
            'report': report
        })
        
        return report
    
    def cross_validate_methods(self,
                             solver_methods: Dict[str, Callable],
                             case_filter: Optional[Callable] = None) -> Dict[str, ValidationReport]:
        """交叉验证多个方法"""
        
        reports = {}
        for method_name, solver_func in solver_methods.items():
            print(f"正在验证方法: {method_name}")
            report = self.validate_method(solver_func, method_name, case_filter)
            reports[method_name] = report
        
        return reports
    
    def benchmark_performance(self,
                            solver_function: Callable,
                            method_name: str,
                            n_iterations: int = 100) -> Dict[str, float]:
        """性能基准测试"""
        
        # 选择基准测试用例
        test_case = list(self.database.cases.values())[0]
        
        import time
        
        # 预热
        for _ in range(5):
            solver_function(test_case.parameters)
        
        # 性能测试
        start_time = time.time()
        for _ in range(n_iterations):
            solver_function(test_case.parameters)
        end_time = time.time()
        
        total_time = end_time - start_time
        avg_time = total_time / n_iterations
        
        return {
            'method_name': method_name,
            'total_time': total_time,
            'average_time': avg_time,
            'iterations': n_iterations,
            'throughput': n_iterations / total_time
        }
    
    def _assess_performance(self, 
                          metrics: Dict[ValidationMetric, float],
                          valid_cases: int,
                          total_cases: int) -> str:
        """评估性能等级"""
        
        if not metrics or valid_cases == 0:
            return "F - 无法评估"
        
        success_rate = valid_cases / total_cases
        mape = metrics.get(ValidationMetric.MAPE, 100)
        correlation = metrics.get(ValidationMetric.CORRELATION, 0)
        
        # 综合评分
        score = 0
        
        # 成功率评分 (40%)
        if success_rate >= 0.9:
            score += 40
        elif success_rate >= 0.8:
            score += 30
        elif success_rate >= 0.7:
            score += 20
        elif success_rate >= 0.6:
            score += 10
        
        # 精度评分 (40%)
        if mape <= 10:
            score += 40
        elif mape <= 20:
            score += 30
        elif mape <= 30:
            score += 20
        elif mape <= 50:
            score += 10
        
        # 相关性评分 (20%)
        if correlation >= 0.9:
            score += 20
        elif correlation >= 0.8:
            score += 15
        elif correlation >= 0.7:
            score += 10
        elif correlation >= 0.6:
            score += 5
        
        # 等级判定
        if score >= 90:
            return "A - 优秀"
        elif score >= 80:
            return "B - 良好"
        elif score >= 70:
            return "C - 中等"
        elif score >= 60:
            return "D - 及格"
        else:
            return "F - 不及格"
    
    def _generate_recommendations(self,
                                metrics: Dict[ValidationMetric, float],
                                statistical_tests: Dict[str, Dict[str, float]]) -> List[str]:
        """生成改进建议"""
        
        recommendations = []
        
        # 精度建议
        mape = metrics.get(ValidationMetric.MAPE, 0)
        if mape > 30:
            recommendations.append("方法精度较低，建议重新校正模型参数")
        elif mape > 20:
            recommendations.append("方法精度中等，建议在特定条件下使用")
        
        # 偏差建议
        bias = metrics.get(ValidationMetric.BIAS, 0)
        if abs(bias) > 0.5:
            if bias > 0:
                recommendations.append("方法存在系统性高估，建议调整系数")
            else:
                recommendations.append("方法存在系统性低估，建议调整系数")
        
        # 相关性建议
        correlation = metrics.get(ValidationMetric.CORRELATION, 1)
        if correlation < 0.7:
            recommendations.append("预测值与观测值相关性较低，建议检查方法适用性")
        
        # 统计检验建议
        if 'bias_t_test' in statistical_tests:
            p_value = statistical_tests['bias_t_test']['p_value']
            if p_value < 0.05:
                recommendations.append("偏差具有统计显著性，建议系统性校正")
        
        if not recommendations:
            recommendations.append("方法性能良好，建议继续使用")
        
        return recommendations
    
    def plot_validation_results(self,
                              report: ValidationReport,
                              save_path: Optional[Path] = None) -> plt.Figure:
        """绘制验证结果图表"""
        
        if not report.case_results:
            return None
        
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        
        valid_results = [r for r in report.case_results if not np.isnan(r.predicted_value)]
        
        if not valid_results:
            return fig
        
        predicted = [r.predicted_value for r in valid_results]
        reference = [r.reference_value for r in valid_results]
        errors = [r.predicted_value - r.reference_value for r in valid_results]
        relative_errors = [r.relative_error for r in valid_results]
        
        # 1. 散点图对比
        ax1 = axes[0, 0]
        ax1.scatter(reference, predicted, alpha=0.6, s=50)
        
        # 添加1:1线
        min_val = min(min(reference), min(predicted))
        max_val = max(max(reference), max(predicted))
        ax1.plot([min_val, max_val], [min_val, max_val], 'r--', linewidth=2, label='1:1线')
        
        # 添加回归线
        if SKLEARN_AVAILABLE:
            reg = LinearRegression()
            X = np.array(reference).reshape(-1, 1)
            reg.fit(X, predicted)
            y_pred = reg.predict(X)
            ax1.plot(reference, y_pred, 'b-', linewidth=2, label=f'回归线 (R²={r2_score(predicted, y_pred):.3f})')
        
        ax1.set_xlabel('参考值')
        ax1.set_ylabel('预测值')
        ax1.set_title(f'{report.method_name} - 预测vs参考值')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # 2. 残差图
        ax2 = axes[0, 1]
        ax2.scatter(reference, errors, alpha=0.6, s=50)
        ax2.axhline(y=0, color='r', linestyle='--', linewidth=2)
        ax2.set_xlabel('参考值')
        ax2.set_ylabel('残差 (预测值 - 参考值)')
        ax2.set_title('残差分布')
        ax2.grid(True, alpha=0.3)
        
        # 3. 误差分布直方图
        ax3 = axes[1, 0]
        ax3.hist(relative_errors, bins=min(15, len(relative_errors)//2), alpha=0.7, edgecolor='black')
        ax3.axvline(np.mean(relative_errors), color='r', linestyle='--', 
                   label=f'均值: {np.mean(relative_errors):.1f}%')
        ax3.set_xlabel('相对误差 (%)')
        ax3.set_ylabel('频次')
        ax3.set_title('相对误差分布')
        ax3.legend()
        ax3.grid(True, alpha=0.3)
        
        # 4. 统计指标总结
        ax4 = axes[1, 1]
        ax4.axis('off')
        
        # 创建统计表格
        stats_text = f"""
验证统计摘要
==================
方法名称: {report.method_name}
总算例数: {report.total_cases}
有效算例: {report.valid_cases}
成功率: {report.valid_cases/report.total_cases*100:.1f}%

精度指标:
RMSE: {report.overall_metrics.get(ValidationMetric.RMSE, 0):.3f}
MAE:  {report.overall_metrics.get(ValidationMetric.MAE, 0):.3f}
MAPE: {report.overall_metrics.get(ValidationMetric.MAPE, 0):.1f}%
偏差: {report.overall_metrics.get(ValidationMetric.BIAS, 0):.3f}
相关系数: {report.overall_metrics.get(ValidationMetric.CORRELATION, 0):.3f}

性能等级: {report.performance_grade}
        """
        
        ax4.text(0.1, 0.9, stats_text, transform=ax4.transAxes, fontsize=10,
                verticalalignment='top', fontfamily='monospace',
                bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.8))
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
        
        return fig
    
    def export_validation_report(self,
                               report: ValidationReport,
                               output_path: Path,
                               format: str = 'excel') -> bool:
        """导出验证报告"""
        
        try:
            if format.lower() == 'excel' and 'pd' in globals():
                # 创建Excel报告
                with pd.ExcelWriter(output_path.with_suffix('.xlsx'), engine='openpyxl') as writer:
                    # 总体统计
                    summary_data = {
                        '指标': list(report.overall_metrics.keys()),
                        '数值': list(report.overall_metrics.values())
                    }
                    summary_df = pd.DataFrame(summary_data)
                    summary_df.to_excel(writer, sheet_name='总体统计', index=False)
                    
                    # 算例结果
                    case_data = []
                    for result in report.case_results:
                        case_data.append({
                            '算例ID': result.case_id,
                            '预测值': result.predicted_value,
                            '参考值': result.reference_value,
                            '绝对误差': result.absolute_error,
                            '相对误差(%)': result.relative_error,
                            '验证状态': '通过' if result.is_valid else '失败',
                            '备注': result.validation_notes
                        })
                    
                    case_df = pd.DataFrame(case_data)
                    case_df.to_excel(writer, sheet_name='算例结果', index=False)
            
            elif format.lower() == 'json':
                # 导出JSON格式
                report_dict = {
                    'method_name': report.method_name,
                    'summary': {
                        'total_cases': report.total_cases,
                        'valid_cases': report.valid_cases,
                        'success_rate': report.valid_cases / report.total_cases if report.total_cases > 0 else 0,
                        'performance_grade': report.performance_grade
                    },
                    'metrics': {metric.value: value for metric, value in report.overall_metrics.items()},
                    'statistical_tests': report.statistical_tests,
                    'recommendations': report.recommendations,
                    'case_results': [
                        {
                            'case_id': r.case_id,
                            'predicted_value': r.predicted_value,
                            'reference_value': r.reference_value,
                            'absolute_error': r.absolute_error,
                            'relative_error': r.relative_error,
                            'is_valid': r.is_valid,
                            'validation_notes': r.validation_notes
                        }
                        for r in report.case_results
                    ]
                }
                
                with open(output_path.with_suffix('.json'), 'w', encoding='utf-8') as f:
                    json.dump(report_dict, f, indent=2, ensure_ascii=False, default=str)
            
            return True
            
        except Exception as e:
            print(f"导出验证报告失败: {e}")
            return False


# 便利函数
def quick_validation(solver_function: Callable,
                    method_name: str,
                    output_dir: Path = Path("validation_results")) -> ValidationReport:
    """快速验证"""
    output_dir.mkdir(exist_ok=True)
    
    validator = ResultValidator()
    report = validator.validate_method(solver_function, method_name)
    
    # 生成图表
    fig = validator.plot_validation_results(report)
    if fig:
        fig.savefig(output_dir / f"{method_name}_validation.png", dpi=300, bbox_inches='tight')
        plt.close(fig)
    
    # 导出报告
    validator.export_validation_report(report, output_dir / f"{method_name}_report")
    
    return report


def compare_methods(solver_methods: Dict[str, Callable],
                   output_dir: Path = Path("method_comparison")) -> Dict[str, ValidationReport]:
    """方法对比"""
    output_dir.mkdir(exist_ok=True)
    
    validator = ResultValidator()
    reports = validator.cross_validate_methods(solver_methods)
    
    # 生成对比图表
    for method_name, report in reports.items():
        fig = validator.plot_validation_results(report)
        if fig:
            fig.savefig(output_dir / f"{method_name}_validation.png", dpi=300, bbox_inches='tight')
            plt.close(fig)
    
    # 生成综合对比图
    plot_method_comparison(reports, output_dir / "method_comparison.png")
    
    return reports


def plot_method_comparison(reports: Dict[str, ValidationReport], 
                         save_path: Optional[Path] = None) -> plt.Figure:
    """绘制方法对比图"""
    
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    
    method_names = list(reports.keys())
    colors = plt.cm.Set1(np.linspace(0, 1, len(method_names)))
    
    # 1. 精度对比
    ax1 = axes[0, 0]
    mape_values = [reports[name].overall_metrics.get(ValidationMetric.MAPE, 0) for name in method_names]
    bars1 = ax1.bar(method_names, mape_values, color=colors)
    ax1.set_ylabel('MAPE (%)')
    ax1.set_title('方法精度对比')
    ax1.tick_params(axis='x', rotation=45)
    
    # 添加数值标签
    for bar, value in zip(bars1, mape_values):
        ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                f'{value:.1f}%', ha='center', va='bottom')
    
    # 2. 成功率对比
    ax2 = axes[0, 1]
    success_rates = [reports[name].valid_cases / reports[name].total_cases * 100 
                    for name in method_names]
    bars2 = ax2.bar(method_names, success_rates, color=colors)
    ax2.set_ylabel('成功率 (%)')
    ax2.set_title('方法成功率对比')
    ax2.tick_params(axis='x', rotation=45)
    ax2.set_ylim(0, 100)
    
    for bar, value in zip(bars2, success_rates):
        ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 2,
                f'{value:.1f}%', ha='center', va='bottom')
    
    # 3. 相关性对比
    ax3 = axes[1, 0]
    correlations = [reports[name].overall_metrics.get(ValidationMetric.CORRELATION, 0) 
                   for name in method_names]
    bars3 = ax3.bar(method_names, correlations, color=colors)
    ax3.set_ylabel('相关系数')
    ax3.set_title('方法相关性对比')
    ax3.tick_params(axis='x', rotation=45)
    ax3.set_ylim(0, 1)
    
    for bar, value in zip(bars3, correlations):
        ax3.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.02,
                f'{value:.3f}', ha='center', va='bottom')
    
    # 4. 综合评级
    ax4 = axes[1, 1]
    grades = [reports[name].performance_grade for name in method_names]
    grade_colors = {'A': 'green', 'B': 'blue', 'C': 'orange', 'D': 'red', 'F': 'darkred'}
    colors4 = [grade_colors.get(grade.split()[0], 'gray') for grade in grades]
    
    bars4 = ax4.bar(method_names, [1]*len(method_names), color=colors4)
    ax4.set_ylabel('性能等级')
    ax4.set_title('方法综合评级')
    ax4.tick_params(axis='x', rotation=45)
    ax4.set_yticks([])
    
    for bar, grade in zip(bars4, grades):
        ax4.text(bar.get_x() + bar.get_width()/2, bar.get_height()/2,
                grade.split()[0], ha='center', va='center', fontweight='bold', fontsize=16)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
    
    return fig


if __name__ == "__main__":
    # 测试验证工具
    print("=== 结果验证和对比工具测试 ===")
    
    # 创建验证数据库
    db = ValidationDatabase()
    print(f"加载了 {len(db.cases)} 个验证算例")
    
    for case_id, case in db.cases.items():
        print(f"  {case_id}: {case.name} (参考值: {case.reference_value:.3f})")
    
    # 测试验证器
    from .empirical_solver import HEC18Solver
    
    def test_solver(params):
        solver = HEC18Solver()
        return solver.solve(params)
    
    validator = ResultValidator(db)
    
    # 验证单个算例
    test_case = list(db.cases.values())[0]
    single_result = validator.validate_single_case(test_case, test_solver)
    print(f"\n单个算例验证:")
    print(f"  预测值: {single_result.predicted_value:.3f}")
    print(f"  参考值: {single_result.reference_value:.3f}")
    print(f"  相对误差: {single_result.relative_error:.1f}%")
    print(f"  验证状态: {'通过' if single_result.is_valid else '失败'}")
    
    # 验证整个方法
    print(f"\n方法验证:")
    report = validator.validate_method(test_solver, "HEC-18")
    print(f"  总算例: {report.total_cases}")
    print(f"  有效算例: {report.valid_cases}")
    print(f"  成功率: {report.valid_cases/report.total_cases*100:.1f}%")
    print(f"  MAPE: {report.overall_metrics.get(ValidationMetric.MAPE, 0):.1f}%")
    print(f"  性能等级: {report.performance_grade}")
    
    print("\n验证工具测试完成!")