"""
网格-几何质量反馈机制
3号计算专家 -> 2号几何专家的质量反馈系统
"""
import asyncio
import json
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum

class IssueType(Enum):
    LOW_QUALITY = "low_quality"
    HIGH_ASPECT_RATIO = "high_aspect_ratio" 
    SKEWED = "skewed"
    DEGENERATE = "degenerate"
    OVERLAPPING = "overlapping"

class IssueSeverity(Enum):
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class ProblemArea:
    issueType: IssueType
    severity: IssueSeverity
    affectedElements: List[int]
    geometryRegion: str  # "corner", "contact", "interior"
    suggestedFix: str
    impactScore: float  # 0-1, 影响计算精度的程度

@dataclass
class GeometryOptimizationSuggestion:
    region: str
    currentSize: float
    suggestedSize: float
    reason: str
    priorityLevel: int  # 1-5, 优化优先级

@dataclass
class MeshQualityFeedback:
    """完整的网格质量反馈数据结构"""
    geometryId: str
    timestamp: str
    
    # 网格质量指标
    qualityMetrics: Dict[str, float]
    
    # 问题区域
    problemAreas: List[ProblemArea]
    
    # 几何优化建议
    geometryOptimization: Dict[str, Any]
    
    # 3号补充的计算性能数据
    computationalMetrics: Dict[str, float]

class GeometryMeshFeedbackSystem:
    """几何-网格质量反馈系统"""
    
    def __init__(self):
        self.feedback_history: Dict[str, List[MeshQualityFeedback]] = {}
        self.optimization_templates = self._load_optimization_templates()
    
    def _load_optimization_templates(self) -> Dict[str, str]:
        """加载几何优化建议模板"""
        return {
            IssueType.HIGH_ASPECT_RATIO.value: "建议减小该区域的几何特征尺寸或增加过渡圆角",
            IssueType.SKEWED.value: "建议调整几何边界角度，避免锐角和钝角",
            IssueType.LOW_QUALITY.value: "建议简化该区域的复杂几何特征",
            IssueType.DEGENERATE.value: "建议检查几何模型的拓扑一致性",
            IssueType.OVERLAPPING.value: "建议调整Fragment切割的几何容差参数"
        }
    
    async def analyze_mesh_quality_for_geometry(
        self, 
        geometry_id: str,
        mesh_file: str,
        geometry_data: Dict[str, Any]
    ) -> MeshQualityFeedback:
        """
        分析网格质量并生成对几何的反馈建议
        
        Args:
            geometry_id: 几何模型ID
            mesh_file: 网格文件路径
            geometry_data: 2号提供的几何数据
            
        Returns:
            完整的质量反馈报告
        """
        
        # 导入网格质量分析工具
        from .quality_analyzer import analyze_mesh_quality
        
        # 执行网格质量分析
        quality_report = analyze_mesh_quality(mesh_file)
        
        # 分析问题区域
        problem_areas = await self._identify_problem_areas(quality_report, geometry_data)
        
        # 生成几何优化建议
        optimization_suggestions = await self._generate_optimization_suggestions(
            problem_areas, geometry_data
        )
        
        # 计算性能指标
        computational_metrics = await self._calculate_computational_metrics(
            quality_report, geometry_data
        )
        
        # 构建反馈报告
        feedback = MeshQualityFeedback(
            geometryId=geometry_id,
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
            qualityMetrics={
                "elementCount": quality_report.total_elements,
                "nodeCount": quality_report.total_nodes,
                "averageQuality": quality_report.overall_score,
                "minAngle": min(result.min_value for result in quality_report.quality_metrics.values()
                              if result.metric.value == "min_angle"),
                "maxAspectRatio": max(result.max_value for result in quality_report.quality_metrics.values()
                                    if result.metric.value == "aspect_ratio"),
                "skewnessMax": max(result.max_value for result in quality_report.quality_metrics.values()
                                 if result.metric.value == "skewness"),
                "warpage": 0.0  # TODO: 实现warpage计算
            },
            problemAreas=problem_areas,
            geometryOptimization={
                "simplifyFeatures": await self._identify_complex_features(geometry_data),
                "adjustMeshSize": optimization_suggestions,
                "recommendedChanges": await self._generate_geometry_recommendations(problem_areas)
            },
            computationalMetrics=computational_metrics
        )
        
        # 保存反馈历史
        if geometry_id not in self.feedback_history:
            self.feedback_history[geometry_id] = []
        self.feedback_history[geometry_id].append(feedback)
        
        return feedback
    
    async def _identify_problem_areas(
        self, 
        quality_report: Any, 
        geometry_data: Dict[str, Any]
    ) -> List[ProblemArea]:
        """识别网格质量问题区域"""
        problem_areas = []
        
        for metric_name, quality_result in quality_report.quality_metrics.items():
            if quality_result.status in ['poor', 'unacceptable']:
                # 确定问题类型
                issue_type = self._map_metric_to_issue_type(metric_name)
                
                # 确定严重程度
                severity = self._determine_severity(quality_result)
                
                # 分析几何区域
                geometry_region = await self._analyze_geometry_region(
                    quality_result.poor_elements, geometry_data
                )
                
                # 生成修复建议
                suggested_fix = self.optimization_templates.get(
                    issue_type.value, "建议检查该区域的几何定义"
                )
                
                problem_areas.append(ProblemArea(
                    issueType=issue_type,
                    severity=severity,
                    affectedElements=quality_result.poor_elements,
                    geometryRegion=geometry_region,
                    suggestedFix=suggested_fix,
                    impactScore=1.0 - quality_result.mean_value
                ))
        
        return problem_areas
    
    def _map_metric_to_issue_type(self, metric_name: str) -> IssueType:
        """将质量指标映射到问题类型"""
        mapping = {
            "aspect_ratio": IssueType.HIGH_ASPECT_RATIO,
            "skewness": IssueType.SKEWED,
            "volume": IssueType.DEGENERATE,
            "min_angle": IssueType.LOW_QUALITY,
            "max_angle": IssueType.LOW_QUALITY
        }
        return mapping.get(metric_name, IssueType.LOW_QUALITY)
    
    def _determine_severity(self, quality_result: Any) -> IssueSeverity:
        """确定问题严重程度"""
        if quality_result.status == 'unacceptable':
            return IssueSeverity.CRITICAL
        elif quality_result.status == 'poor':
            return IssueSeverity.ERROR
        else:
            return IssueSeverity.WARNING
    
    async def _analyze_geometry_region(
        self, 
        affected_elements: List[int], 
        geometry_data: Dict[str, Any]
    ) -> str:
        """分析受影响的几何区域类型"""
        # 简化实现：基于单元数量和分布判断区域类型
        total_elements = len(geometry_data.get('faces', []))
        affected_ratio = len(affected_elements) / total_elements if total_elements > 0 else 0
        
        if affected_ratio < 0.1:
            return "corner"  # 局部区域，可能是角落
        elif affected_ratio < 0.3:
            return "contact"  # 接触面区域
        else:
            return "interior"  # 内部区域
    
    async def _generate_optimization_suggestions(
        self, 
        problem_areas: List[ProblemArea], 
        geometry_data: Dict[str, Any]
    ) -> List[GeometryOptimizationSuggestion]:
        """生成几何优化建议"""
        suggestions = []
        
        for problem in problem_areas:
            if problem.issueType == IssueType.HIGH_ASPECT_RATIO:
                # 建议减小网格尺寸
                current_size = geometry_data.get('meshGuidance', {}).get('suggestedElementSize', 2.0)
                suggested_size = current_size * 0.7
                
                suggestions.append(GeometryOptimizationSuggestion(
                    region=problem.geometryRegion,
                    currentSize=current_size,
                    suggestedSize=suggested_size,
                    reason=f"改善{problem.issueType.value}问题",
                    priorityLevel=int(problem.impactScore * 5)
                ))
        
        return suggestions
    
    async def _identify_complex_features(self, geometry_data: Dict[str, Any]) -> List[str]:
        """识别需要简化的复杂几何特征"""
        complex_features = []
        
        # 分析顶点密度
        vertices = geometry_data.get('vertices', [])
        if len(vertices) > 10000:
            complex_features.append("high_vertex_density")
        
        # 分析面片复杂度
        faces = geometry_data.get('faces', [])
        if len(faces) > 20000:
            complex_features.append("high_face_count")
        
        return complex_features
    
    async def _generate_geometry_recommendations(
        self, 
        problem_areas: List[ProblemArea]
    ) -> List[str]:
        """生成具体的几何修改建议"""
        recommendations = []
        
        for problem in problem_areas:
            if problem.severity == IssueSeverity.CRITICAL:
                recommendations.append(f"紧急修复{problem.geometryRegion}区域的{problem.issueType.value}问题")
            elif problem.impactScore > 0.7:
                recommendations.append(f"优先处理{problem.geometryRegion}区域的几何定义")
        
        return recommendations
    
    async def _calculate_computational_metrics(
        self, 
        quality_report: Any, 
        geometry_data: Dict[str, Any]
    ) -> Dict[str, float]:
        """计算计算性能相关指标"""
        return {
            "meshGenerationTime": 0.0,  # TODO: 从实际测量获取
            "memoryUsage": quality_report.total_elements * 0.001,  # MB 估算
            "estimatedSolveTime": quality_report.total_elements * 0.01,  # 秒 估算
            "convergenceRisk": 1.0 - quality_report.overall_score  # 收敛风险评估
        }
    
    async def send_feedback_to_geometry_module(
        self, 
        feedback: MeshQualityFeedback
    ) -> bool:
        """将反馈发送给2号几何模块"""
        try:
            # TODO: 实现WebSocket或HTTP POST发送反馈
            # await websocket.send(json.dumps(asdict(feedback)))
            
            print(f"发送质量反馈给几何模块: {feedback.geometryId}")
            print(f"质量评分: {feedback.qualityMetrics['averageQuality']:.3f}")
            print(f"问题区域: {len(feedback.problemAreas)}个")
            print(f"优化建议: {len(feedback.geometryOptimization['adjustMeshSize'])}项")
            
            return True
        except Exception as e:
            print(f"发送反馈失败: {e}")
            return False

# 全局反馈系统实例
geometry_mesh_feedback_system = GeometryMeshFeedbackSystem()

def get_feedback_system() -> GeometryMeshFeedbackSystem:
    """获取反馈系统实例"""
    return geometry_mesh_feedback_system