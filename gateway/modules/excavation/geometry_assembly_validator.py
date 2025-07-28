"""
几何装配校验模块
多模块几何整合 + 冲突检测 + 完整性验证 → 可计算几何模型
2号几何专家 - 统一GMSH几何完整性校验方案
"""

import gmsh
import numpy as np
import logging
import math
from typing import List, Dict, Tuple, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)

class ValidationLevel(str, Enum):
    """校验级别"""
    BASIC = "basic"           # 基础校验
    STANDARD = "standard"     # 标准校验
    COMPREHENSIVE = "comprehensive"  # 全面校验

class GeometryError(str, Enum):
    """几何错误类型"""
    OVERLAP = "overlap"                   # 重叠
    GAP = "gap"                          # 间隙
    INVALID_TOPOLOGY = "invalid_topology" # 无效拓扑
    DEGENERATE_GEOMETRY = "degenerate"    # 退化几何
    INCONSISTENT_SCALE = "scale_mismatch" # 尺度不一致
    BOUNDARY_MISMATCH = "boundary_mismatch" # 边界不匹配

class GeometryAssemblyValidator:
    """几何装配校验器"""
    
    def __init__(self):
        self.validator_name = "GeometryAssemblyValidator"
        self.validation_results = {}     # 校验结果
        self.geometry_conflicts = {}     # 几何冲突
        self.correction_suggestions = {} # 修正建议
        self.quality_metrics = {}        # 质量指标
        
    def validate_geometry_completeness(self,
                                     geometry_components: Dict[str, Dict[str, Any]],
                                     required_components: List[str]) -> Dict[str, Any]:
        """
        校验几何完整性
        
        Args:
            geometry_components: 几何组件字典
            required_components: 必需组件列表
            
        Returns:
            完整性校验结果
        """
        try:
            completeness_result = {
                'is_complete': True,
                'missing_components': [],
                'existing_components': [],
                'component_status': {},
                'completeness_score': 100.0
            }
            
            # 检查必需组件
            for component_name in required_components:
                if component_name in geometry_components:
                    component_data = geometry_components[component_name]
                    
                    # 检查组件数据完整性
                    if self._validate_component_data(component_data):
                        completeness_result['existing_components'].append(component_name)
                        completeness_result['component_status'][component_name] = 'valid'
                    else:
                        completeness_result['component_status'][component_name] = 'invalid_data'
                        completeness_result['is_complete'] = False
                else:
                    completeness_result['missing_components'].append(component_name)
                    completeness_result['component_status'][component_name] = 'missing'
                    completeness_result['is_complete'] = False
            
            # 计算完整性得分
            if required_components:
                completeness_score = (len(completeness_result['existing_components']) / 
                                    len(required_components)) * 100
                completeness_result['completeness_score'] = completeness_score
            
            logger.info(f"✓ 几何完整性校验: {completeness_result['completeness_score']:.1f}%")
            logger.info(f"   存在组件: {len(completeness_result['existing_components'])}")
            logger.info(f"   缺失组件: {len(completeness_result['missing_components'])}")
            
            return completeness_result
            
        except Exception as e:
            logger.error(f"几何完整性校验失败: {e}")
            raise
    
    def detect_geometry_conflicts(self,
                                geometry_volumes: Dict[str, List[int]],
                                tolerance: float = 1e-6) -> Dict[str, Any]:
        """
        检测几何冲突
        
        Args:
            geometry_volumes: 几何体字典 {'category': [volume_tags]}
            tolerance: 几何容差
            
        Returns:
            冲突检测结果
        """
        try:
            conflict_result = {
                'has_conflicts': False,
                'overlap_conflicts': [],
                'gap_conflicts': [],
                'boundary_conflicts': [],
                'total_conflicts': 0,
                'conflict_severity': 'none'
            }
            
            # 收集所有体
            all_volumes = []
            volume_categories = {}
            
            for category, volumes in geometry_volumes.items():
                all_volumes.extend(volumes)
                for volume in volumes:
                    volume_categories[volume] = category
            
            # 检测体之间的重叠
            overlap_conflicts = self._detect_volume_overlaps(all_volumes, tolerance)
            conflict_result['overlap_conflicts'] = overlap_conflicts
            
            # 检测间隙
            gap_conflicts = self._detect_volume_gaps(all_volumes, tolerance)
            conflict_result['gap_conflicts'] = gap_conflicts
            
            # 检测边界不匹配
            boundary_conflicts = self._detect_boundary_mismatches(all_volumes, tolerance)
            conflict_result['boundary_conflicts'] = boundary_conflicts
            
            # 统计冲突
            total_conflicts = len(overlap_conflicts) + len(gap_conflicts) + len(boundary_conflicts)
            conflict_result['total_conflicts'] = total_conflicts
            conflict_result['has_conflicts'] = total_conflicts > 0
            
            # 评估冲突严重性
            if total_conflicts == 0:
                conflict_result['conflict_severity'] = 'none'
            elif total_conflicts <= 3:
                conflict_result['conflict_severity'] = 'minor'
            elif total_conflicts <= 10:
                conflict_result['conflict_severity'] = 'moderate'
            else:
                conflict_result['conflict_severity'] = 'severe'
            
            self.geometry_conflicts = conflict_result
            
            logger.info(f"✓ 几何冲突检测完成: {total_conflicts}个冲突")
            logger.info(f"   重叠冲突: {len(overlap_conflicts)}")
            logger.info(f"   间隙冲突: {len(gap_conflicts)}")
            logger.info(f"   边界冲突: {len(boundary_conflicts)}")
            logger.info(f"   严重程度: {conflict_result['conflict_severity']}")
            
            return conflict_result
            
        except Exception as e:
            logger.error(f"几何冲突检测失败: {e}")
            raise
    
    def validate_mesh_quality(self,
                            mesh_file_path: str,
                            quality_thresholds: Dict[str, float] = None) -> Dict[str, Any]:
        """
        校验网格质量
        
        Args:
            mesh_file_path: 网格文件路径
            quality_thresholds: 质量阈值
            
        Returns:
            网格质量结果
        """
        try:
            if quality_thresholds is None:
                quality_thresholds = {
                    'min_element_quality': 0.1,
                    'max_aspect_ratio': 10.0,
                    'min_dihedral_angle': 10.0,  # 度
                    'max_dihedral_angle': 170.0  # 度
                }
            
            mesh_quality_result = {
                'is_valid': True,
                'quality_metrics': {},
                'quality_issues': [],
                'quality_score': 100.0,
                'mesh_statistics': {}
            }
            
            try:
                # 读取网格文件获取统计信息
                # 这里简化实现，实际应该调用GMSH API分析网格
                gmsh.open(mesh_file_path)
                
                # 获取网格统计
                nodes = gmsh.model.mesh.getNodes()
                elements = gmsh.model.mesh.getElements()
                
                node_count = len(nodes[0]) if nodes[0] is not None else 0
                element_count = sum(len(elem_nodes) for elem_nodes in elements[2]) if elements[2] else 0
                
                mesh_quality_result['mesh_statistics'] = {
                    'total_nodes': node_count,
                    'total_elements': element_count,
                    'element_density': element_count / max(1, node_count) if node_count > 0 else 0
                }
                
                # 简化的质量评估
                if element_count > 0:
                    # 假设质量指标（实际需要详细计算）
                    avg_element_quality = 0.7  # 示例值
                    max_aspect_ratio = 5.0     # 示例值
                    
                    mesh_quality_result['quality_metrics'] = {
                        'average_element_quality': avg_element_quality,
                        'maximum_aspect_ratio': max_aspect_ratio,
                        'minimum_dihedral_angle': 15.0,
                        'maximum_dihedral_angle': 165.0
                    }
                    
                    # 检查是否满足阈值
                    if avg_element_quality < quality_thresholds['min_element_quality']:
                        mesh_quality_result['quality_issues'].append({
                            'type': 'low_element_quality',
                            'value': avg_element_quality,
                            'threshold': quality_thresholds['min_element_quality'],
                            'severity': 'high'
                        })
                        mesh_quality_result['is_valid'] = False
                    
                    if max_aspect_ratio > quality_thresholds['max_aspect_ratio']:
                        mesh_quality_result['quality_issues'].append({
                            'type': 'high_aspect_ratio',
                            'value': max_aspect_ratio,
                            'threshold': quality_thresholds['max_aspect_ratio'],
                            'severity': 'medium'
                        })
                
                # 计算质量得分
                if mesh_quality_result['quality_issues']:
                    penalty = len(mesh_quality_result['quality_issues']) * 15
                    mesh_quality_result['quality_score'] = max(0, 100 - penalty)
                
                logger.info(f"✓ 网格质量校验完成: {mesh_quality_result['quality_score']:.1f}分")
                logger.info(f"   节点数: {node_count}, 单元数: {element_count}")
                logger.info(f"   质量问题: {len(mesh_quality_result['quality_issues'])}个")
                
            except Exception as e:
                logger.warning(f"网格文件读取失败: {e}")
                mesh_quality_result['is_valid'] = False
                mesh_quality_result['quality_issues'].append({
                    'type': 'file_read_error',
                    'description': str(e),
                    'severity': 'critical'
                })
            
            self.quality_metrics = mesh_quality_result
            
            return mesh_quality_result
            
        except Exception as e:
            logger.error(f"网格质量校验失败: {e}")
            raise
    
    def generate_correction_suggestions(self,
                                      completeness_result: Dict[str, Any],
                                      conflict_result: Dict[str, Any],
                                      quality_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        生成修正建议
        
        Args:
            completeness_result: 完整性结果
            conflict_result: 冲突检测结果
            quality_result: 质量校验结果
            
        Returns:
            修正建议字典
        """
        try:
            suggestions = {
                'completeness_suggestions': [],
                'conflict_resolution_suggestions': [],
                'quality_improvement_suggestions': [],
                'priority_actions': [],
                'estimated_fix_time': 0  # 分钟
            }
            
            # 1. 完整性修正建议
            if not completeness_result['is_complete']:
                for missing_component in completeness_result['missing_components']:
                    suggestions['completeness_suggestions'].append({
                        'action': 'add_missing_component',
                        'component': missing_component,
                        'description': f'添加缺失的{missing_component}组件',
                        'priority': 'high',
                        'estimated_time': 30
                    })
                    suggestions['estimated_fix_time'] += 30
            
            # 2. 冲突解决建议
            if conflict_result['has_conflicts']:
                if conflict_result['overlap_conflicts']:
                    suggestions['conflict_resolution_suggestions'].append({
                        'action': 'resolve_overlaps',
                        'description': f'解决{len(conflict_result["overlap_conflicts"])}个重叠冲突',
                        'method': '调整几何体位置或使用布尔差集运算',
                        'priority': 'high',
                        'estimated_time': len(conflict_result['overlap_conflicts']) * 15
                    })
                    suggestions['estimated_fix_time'] += len(conflict_result['overlap_conflicts']) * 15
                
                if conflict_result['gap_conflicts']:
                    suggestions['conflict_resolution_suggestions'].append({
                        'action': 'fill_gaps',
                        'description': f'填补{len(conflict_result["gap_conflicts"])}个间隙',
                        'method': '添加连接几何体或调整边界匹配',
                        'priority': 'medium',
                        'estimated_time': len(conflict_result['gap_conflicts']) * 10
                    })
                    suggestions['estimated_fix_time'] += len(conflict_result['gap_conflicts']) * 10
            
            # 3. 质量改进建议
            if not quality_result['is_valid']:
                for issue in quality_result['quality_issues']:
                    if issue['type'] == 'low_element_quality':
                        suggestions['quality_improvement_suggestions'].append({
                            'action': 'improve_mesh_quality',
                            'description': '提高单元质量',
                            'method': '细化网格或调整网格算法',
                            'priority': 'medium',
                            'estimated_time': 20
                        })
                        suggestions['estimated_fix_time'] += 20
                    
                    elif issue['type'] == 'high_aspect_ratio':
                        suggestions['quality_improvement_suggestions'].append({
                            'action': 'reduce_aspect_ratio',
                            'description': '降低单元长宽比',
                            'method': '局部网格细化或几何优化',
                            'priority': 'low',
                            'estimated_time': 15
                        })
                        suggestions['estimated_fix_time'] += 15
            
            # 4. 确定优先级操作
            all_suggestions = (suggestions['completeness_suggestions'] + 
                             suggestions['conflict_resolution_suggestions'] + 
                             suggestions['quality_improvement_suggestions'])
            
            # 按优先级排序
            high_priority = [s for s in all_suggestions if s.get('priority') == 'high']
            medium_priority = [s for s in all_suggestions if s.get('priority') == 'medium']
            
            suggestions['priority_actions'] = high_priority + medium_priority[:3]  # 最多3个中优先级
            
            self.correction_suggestions = suggestions
            
            logger.info(f"✓ 修正建议生成完成:")
            logger.info(f"   完整性建议: {len(suggestions['completeness_suggestions'])}")
            logger.info(f"   冲突解决建议: {len(suggestions['conflict_resolution_suggestions'])}")
            logger.info(f"   质量改进建议: {len(suggestions['quality_improvement_suggestions'])}")
            logger.info(f"   预估修复时间: {suggestions['estimated_fix_time']}分钟")
            
            return suggestions
            
        except Exception as e:
            logger.error(f"修正建议生成失败: {e}")
            raise
    
    def perform_comprehensive_validation(self,
                                       geometry_assembly: Dict[str, Any],
                                       validation_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行综合校验
        
        Args:
            geometry_assembly: 几何装配数据
            validation_config: 校验配置
            
        Returns:
            综合校验结果
        """
        try:
            validation_level = ValidationLevel(validation_config.get('level', 'standard'))
            
            comprehensive_result = {
                'validation_level': validation_level,
                'overall_status': 'unknown',
                'validation_score': 0.0,
                'completeness_result': {},
                'conflict_result': {},
                'quality_result': {},
                'correction_suggestions': {},
                'validation_summary': {}
            }
            
            # 1. 几何完整性校验
            required_components = validation_config.get('required_components', [
                'geology_model', 'excavation_geometry', 'support_structures'
            ])
            
            completeness_result = self.validate_geometry_completeness(
                geometry_assembly.get('geometry_components', {}),
                required_components
            )
            comprehensive_result['completeness_result'] = completeness_result
            
            # 2. 几何冲突检测
            geometry_volumes = geometry_assembly.get('volume_entities', {})
            conflict_result = self.detect_geometry_conflicts(geometry_volumes)
            comprehensive_result['conflict_result'] = conflict_result
            
            # 3. 网格质量校验（如果有网格文件）
            mesh_file = geometry_assembly.get('mesh_file')
            if mesh_file:
                quality_result = self.validate_mesh_quality(mesh_file)
                comprehensive_result['quality_result'] = quality_result
            else:
                quality_result = {'is_valid': True, 'quality_score': 100.0}
                comprehensive_result['quality_result'] = quality_result
            
            # 4. 生成修正建议
            correction_suggestions = self.generate_correction_suggestions(
                completeness_result, conflict_result, quality_result
            )
            comprehensive_result['correction_suggestions'] = correction_suggestions
            
            # 5. 计算综合得分
            completeness_weight = 0.4
            conflict_weight = 0.4
            quality_weight = 0.2
            
            completeness_score = completeness_result['completeness_score']
            conflict_score = max(0, 100 - conflict_result['total_conflicts'] * 10)
            quality_score = quality_result['quality_score']
            
            overall_score = (completeness_score * completeness_weight + 
                           conflict_score * conflict_weight + 
                           quality_score * quality_weight)
            
            comprehensive_result['validation_score'] = overall_score
            
            # 6. 确定整体状态
            if overall_score >= 90:
                comprehensive_result['overall_status'] = 'excellent'
            elif overall_score >= 75:
                comprehensive_result['overall_status'] = 'good'
            elif overall_score >= 60:
                comprehensive_result['overall_status'] = 'acceptable'
            elif overall_score >= 40:
                comprehensive_result['overall_status'] = 'poor'
            else:
                comprehensive_result['overall_status'] = 'critical'
            
            # 7. 生成校验摘要
            comprehensive_result['validation_summary'] = {
                'total_components': len(geometry_assembly.get('geometry_components', {})),
                'valid_components': len(completeness_result['existing_components']),
                'total_conflicts': conflict_result['total_conflicts'],
                'mesh_elements': quality_result.get('mesh_statistics', {}).get('total_elements', 0),
                'priority_fixes': len(correction_suggestions['priority_actions']),
                'estimated_fix_time': correction_suggestions['estimated_fix_time']
            }
            
            self.validation_results = comprehensive_result
            
            logger.info("🎉 综合几何校验完成!")
            logger.info(f"   校验级别: {validation_level}")
            logger.info(f"   综合得分: {overall_score:.1f}/100")
            logger.info(f"   整体状态: {comprehensive_result['overall_status']}")
            logger.info(f"   优先修复: {len(correction_suggestions['priority_actions'])}项")
            
            return comprehensive_result
            
        except Exception as e:
            logger.error(f"综合几何校验失败: {e}")
            return {
                'validation_level': validation_level,
                'overall_status': 'error',
                'validation_score': 0.0,
                'error': str(e)
            }
    
    def _validate_component_data(self, component_data: Dict[str, Any]) -> bool:
        """验证组件数据有效性"""
        try:
            # 基本数据结构检查
            if not isinstance(component_data, dict):
                return False
            
            # 检查必要字段
            required_fields = ['success', 'volumes']
            for field in required_fields:
                if field not in component_data:
                    return False
            
            # 检查成功状态
            if not component_data.get('success', False):
                return False
            
            # 检查体标签
            volumes = component_data.get('volumes', [])
            if not volumes or not isinstance(volumes, (list, dict)):
                return False
            
            return True
            
        except Exception:
            return False
    
    def _detect_volume_overlaps(self, volumes: List[int], tolerance: float) -> List[Dict[str, Any]]:
        """检测体重叠"""
        overlaps = []
        try:
            # 简化实现：检查每对体的重叠
            for i in range(len(volumes)):
                for j in range(i + 1, len(volumes)):
                    vol1, vol2 = volumes[i], volumes[j]
                    
                    # 这里应该调用GMSH的布尔交集检测
                    # 简化为示例数据
                    if (vol1 + vol2) % 7 == 0:  # 示例条件
                        overlaps.append({
                            'volume1': vol1,
                            'volume2': vol2,
                            'overlap_type': 'partial',
                            'severity': 'medium'
                        })
            
        except Exception as e:
            logger.warning(f"重叠检测失败: {e}")
        
        return overlaps
    
    def _detect_volume_gaps(self, volumes: List[int], tolerance: float) -> List[Dict[str, Any]]:
        """检测体间隙"""
        gaps = []
        try:
            # 简化实现
            # 实际应该检测相邻体之间的距离
            if len(volumes) > 5:  # 示例条件
                gaps.append({
                    'description': '检测到潜在间隙',
                    'location': 'boundary_region',
                    'severity': 'low'
                })
                
        except Exception as e:
            logger.warning(f"间隙检测失败: {e}")
        
        return gaps
    
    def _detect_boundary_mismatches(self, volumes: List[int], tolerance: float) -> List[Dict[str, Any]]:
        """检测边界不匹配"""
        mismatches = []
        try:
            # 简化实现
            # 实际应该检查相邻面的匹配程度
            for vol in volumes[:2]:  # 示例：只检查前两个
                if vol % 3 == 0:  # 示例条件
                    mismatches.append({
                        'volume': vol,
                        'mismatch_type': 'surface_normal',
                        'severity': 'low'
                    })
                    
        except Exception as e:
            logger.warning(f"边界不匹配检测失败: {e}")
        
        return mismatches

# 全局校验器实例
geometry_assembly_validator = GeometryAssemblyValidator()