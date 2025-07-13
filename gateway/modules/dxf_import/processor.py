import os
import time
import traceback
import uuid
from typing import List, Dict, Any, Optional, Tuple
import logging
import numpy as np
from pathlib import Path

try:
    import ezdxf
    from ezdxf import recover
    from ezdxf.addons import r12writer
    from ezdxf.math import Vec3, Matrix44
    from ezdxf.layouts import BaseLayout
    EZDXF_AVAILABLE = True
except ImportError:
    EZDXF_AVAILABLE = False
    logging.warning("ezdxf not available, DXF processing will be limited")

try:
    import gmsh
    GMSH_AVAILABLE = True
except ImportError:
    GMSH_AVAILABLE = False
    logging.warning("gmsh not available, mesh generation will be disabled")

from .schemas import (
    DXFFileStatus, DXFEntityType, DXFProcessingMode, LayerInfo, BlockInfo,
    EntityInfo, GeometryStatistics, DXFValidationIssue, DXFProcessingOptions,
    DXFAnalysisResult, DXFProcessingResult, DXFQualityReport, EntityConversionOptions,
    DXFRepairOptions
)


class DXFProcessor:
    """DXF文件处理器 - 提供强大的DXF导入和处理功能"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.temp_dir = Path("./temp/dxf_processing")
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
    def analyze_dxf(self, file_path: str) -> DXFAnalysisResult:
        """分析DXF文件结构和内容"""
        start_time = time.time()
        
        try:
            # 尝试正常加载文件
            try:
                doc = ezdxf.readfile(file_path)
                load_method = "normal"
            except ezdxf.DXFStructureError:
                # 如果正常加载失败，尝试恢复模式
                self.logger.warning(f"DXF文件结构错误，尝试恢复模式: {file_path}")
                doc, auditor = recover.readfile(file_path)
                load_method = "recovery"
            
            # 文件基本信息
            file_info = {
                "filename": os.path.basename(file_path),
                "dxf_version": doc.dxfversion,
                "load_method": load_method,
                "encoding": getattr(doc, 'encoding', 'unknown'),
                "units": self._get_drawing_units(doc),
                "created": getattr(doc.header, '$TDCREATE', None),
                "modified": getattr(doc.header, '$TDUCREATE', None)
            }
            
            # 分析图层
            layers = self._analyze_layers(doc)
            
            # 分析块定义
            blocks = self._analyze_blocks(doc)
            
            # 分析实体
            entities = self._analyze_entities(doc)
            
            # 计算统计信息
            statistics = self._calculate_statistics(doc, entities)
            
            # 验证问题检查
            validation_issues = self._validate_geometry(doc, entities)
            
            analysis_time = time.time() - start_time
            
            return DXFAnalysisResult(
                file_info=file_info,
                layers=layers,
                blocks=blocks,
                entities=entities,
                statistics=statistics,
                validation_issues=validation_issues,
                analysis_time=analysis_time
            )
            
        except Exception as e:
            self.logger.error(f"DXF分析失败: {str(e)}")
            return DXFAnalysisResult(
                file_info={"error": str(e)},
                validation_issues=[
                    DXFValidationIssue(
                        severity="error",
                        code="ANALYSIS_FAILED",
                        message=f"DXF文件分析失败: {str(e)}",
                        suggestion="请检查文件是否为有效的DXF格式"
                    )
                ],
                analysis_time=time.time() - start_time
            )
    
    def process_dxf(self, file_path: str, options: DXFProcessingOptions) -> DXFProcessingResult:
        """处理DXF文件，执行转换和修复"""
        start_time = time.time()
        
        try:
            # 加载DXF文档
            doc = self._load_dxf_document(file_path, options.mode)
            
            # 应用坐标变换
            if options.scale_factor != 1.0 or options.rotation_angle != 0.0 or any(t != 0 for t in options.translation):
                doc = self._apply_transformations(doc, options)
            
            # 过滤实体
            if options.layer_filter or options.entity_type_filter:
                doc = self._filter_entities(doc, options)
            
            # 修复几何
            repair_stats = self._repair_geometry(doc, options)
            
            # 转换几何
            conversion_stats = self._convert_entities(doc, options)
            
            # 生成输出
            output_files = self._generate_outputs(doc, options)
            
            processing_time = time.time() - start_time
            
            return DXFProcessingResult(
                success=True,
                status=DXFFileStatus.COMPLETED,
                message="DXF处理成功完成",
                processed_entities=repair_stats.get('processed', 0),
                skipped_entities=repair_stats.get('skipped', 0),
                repaired_entities=repair_stats.get('repaired', 0),
                output_files=output_files,
                processing_time=processing_time
            )
            
        except Exception as e:
            self.logger.error(f"DXF处理失败: {str(e)}")
            return DXFProcessingResult(
                success=False,
                status=DXFFileStatus.FAILED,
                message=f"DXF处理失败: {str(e)}",
                processing_time=time.time() - start_time,
                errors=[
                    DXFValidationIssue(
                        severity="error",
                        code="PROCESSING_FAILED",
                        message=str(e),
                        suggestion="请检查处理选项和文件完整性"
                    )
                ]
            )
    
    def generate_quality_report(self, file_path: str) -> DXFQualityReport:
        """生成DXF文件质量报告"""
        try:
            analysis = self.analyze_dxf(file_path)
            
            # 计算质量指标
            total_entities = analysis.statistics.total_entities
            error_count = len([issue for issue in analysis.validation_issues if issue.severity == "error"])
            warning_count = len([issue for issue in analysis.validation_issues if issue.severity == "warning"])
            
            # 几何完整性分数
            geometry_integrity = max(0, 100 - (error_count * 10 + warning_count * 5))
            
            # 数据一致性分数
            data_consistency = self._calculate_data_consistency(analysis)
            
            # 标准符合性分数
            standards_compliance = self._calculate_standards_compliance(analysis)
            
            # 总体质量分数
            quality_score = (geometry_integrity + data_consistency + standards_compliance) / 3
            
            # 质量等级
            if quality_score >= 90:
                overall_quality = "excellent"
            elif quality_score >= 75:
                overall_quality = "good"
            elif quality_score >= 60:
                overall_quality = "fair"
            else:
                overall_quality = "poor"
            
            # 生成建议
            recommendations = self._generate_quality_recommendations(analysis, quality_score)
            
            # 关键问题
            critical_issues = [issue for issue in analysis.validation_issues if issue.severity == "error"]
            
            return DXFQualityReport(
                overall_quality=overall_quality,
                quality_score=quality_score,
                geometry_integrity=geometry_integrity,
                data_consistency=data_consistency,
                standards_compliance=standards_compliance,
                closed_boundaries_ratio=0.0,  # TODO: 实现计算
                valid_geometries_ratio=max(0, (total_entities - error_count) / max(1, total_entities) * 100),
                duplicate_entities_count=0,  # TODO: 实现计算
                orphaned_entities_count=0,  # TODO: 实现计算
                recommendations=recommendations,
                critical_issues=critical_issues
            )
            
        except Exception as e:
            self.logger.error(f"质量报告生成失败: {str(e)}")
            return DXFQualityReport(
                overall_quality="poor",
                quality_score=0.0,
                geometry_integrity=0.0,
                data_consistency=0.0,
                standards_compliance=0.0,
                closed_boundaries_ratio=0.0,
                valid_geometries_ratio=0.0,
                duplicate_entities_count=0,
                orphaned_entities_count=0,
                recommendations=[f"质量分析失败: {str(e)}"],
                critical_issues=[]
            )
    
    def convert_to_gmsh(self, file_path: str, options: DXFProcessingOptions) -> Optional[str]:
        """将DXF转换为Gmsh几何"""
        if not GMSH_AVAILABLE:
            raise RuntimeError("Gmsh不可用，无法进行转换")
        
        try:
            # 分析DXF文件
            analysis = self.analyze_dxf(file_path)
            
            # 初始化Gmsh
            gmsh.initialize()
            gmsh.clear()
            
            model_name = f"dxf_import_{int(time.time())}"
            gmsh.model.add(model_name)
            
            # 加载DXF并转换实体
            doc = self._load_dxf_document(file_path, options.mode)
            
            # 转换几何实体到Gmsh
            self._convert_dxf_to_gmsh(doc, options)
            
            # 同步几何
            gmsh.model.occ.synchronize()
            
            # 保存为.geo文件
            output_file = self.temp_dir / f"{model_name}.geo"
            gmsh.write(str(output_file))
            
            return str(output_file)
            
        except Exception as e:
            self.logger.error(f"DXF到Gmsh转换失败: {str(e)}")
            raise
        finally:
            if GMSH_AVAILABLE and gmsh.isInitialized():
                gmsh.finalize()
    
    # 私有辅助方法
    def _load_dxf_document(self, file_path: str, mode: DXFProcessingMode):
        """加载DXF文档，根据模式选择不同的加载策略"""
        if not EZDXF_AVAILABLE:
            raise RuntimeError("ezdxf不可用，无法处理DXF文件")
        
        if mode == DXFProcessingMode.STRICT:
            return ezdxf.readfile(file_path)
        else:
            try:
                return ezdxf.readfile(file_path)
            except ezdxf.DXFStructureError:
                doc, auditor = recover.readfile(file_path)
                if mode == DXFProcessingMode.REPAIR:
                    # 尝试修复文档
                    auditor.run()
                return doc
    
    def _analyze_layers(self, doc) -> List[LayerInfo]:
        """分析DXF文档中的图层"""
        layers = []
        
        for layer_name in doc.layers:
            layer = doc.layers.get(layer_name)
            
            # 统计该图层的实体数量
            entity_count = 0
            for layout in doc.layouts:
                entity_count += len([e for e in layout if e.dxf.layer == layer_name])
            
            layers.append(LayerInfo(
                name=layer_name,
                color=getattr(layer.dxf, 'color', None),
                linetype=getattr(layer.dxf, 'linetype', None),
                lineweight=getattr(layer.dxf, 'lineweight', None),
                entity_count=entity_count,
                is_frozen=getattr(layer.dxf, 'flags', 0) & 1 != 0,
                is_locked=getattr(layer.dxf, 'flags', 0) & 4 != 0,
                is_visible=not (getattr(layer.dxf, 'flags', 0) & 2 != 0)
            ))
        
        return layers
    
    def _analyze_blocks(self, doc) -> List[BlockInfo]:
        """分析DXF文档中的块定义"""
        blocks = []
        
        for block_name in doc.blocks:
            if block_name.startswith('*'):  # 跳过匿名块
                continue
                
            block = doc.blocks.get(block_name)
            base_point = [0.0, 0.0, 0.0]  # 默认基点
            
            if hasattr(block, 'base_point'):
                base_point = list(block.base_point)[:3]
            
            blocks.append(BlockInfo(
                name=block_name,
                base_point=base_point,
                entity_count=len(block),
                description=getattr(block, 'description', None)
            ))
        
        return blocks
    
    def _analyze_entities(self, doc) -> List[EntityInfo]:
        """分析DXF文档中的实体"""
        entities = []
        
        for layout in doc.layouts:
            for entity in layout:
                # 获取实体类型
                entity_type = self._map_entity_type(entity.dxftype())
                
                # 计算边界框
                bounding_box = self._calculate_entity_bbox(entity)
                
                # 提取实体属性
                properties = self._extract_entity_properties(entity)
                
                entities.append(EntityInfo(
                    handle=entity.dxf.handle,
                    entity_type=entity_type,
                    layer=getattr(entity.dxf, 'layer', '0'),
                    color=getattr(entity.dxf, 'color', None),
                    linetype=getattr(entity.dxf, 'linetype', None),
                    bounding_box=bounding_box,
                    properties=properties
                ))
        
        return entities
    
    def _map_entity_type(self, dxf_type: str) -> DXFEntityType:
        """映射DXF实体类型到内部枚举"""
        type_mapping = {
            'LINE': DXFEntityType.LINE,
            'POLYLINE': DXFEntityType.POLYLINE,
            'LWPOLYLINE': DXFEntityType.LWPOLYLINE,
            'ARC': DXFEntityType.ARC,
            'CIRCLE': DXFEntityType.CIRCLE,
            'ELLIPSE': DXFEntityType.ELLIPSE,
            'SPLINE': DXFEntityType.SPLINE,
            'POINT': DXFEntityType.POINT,
            'TEXT': DXFEntityType.TEXT,
            'MTEXT': DXFEntityType.MTEXT,
            'INSERT': DXFEntityType.INSERT,
            'HATCH': DXFEntityType.HATCH,
            'DIMENSION': DXFEntityType.DIMENSION,
            'LEADER': DXFEntityType.LEADER
        }
        return type_mapping.get(dxf_type, DXFEntityType.UNKNOWN)
    
    def _calculate_entity_bbox(self, entity) -> Optional[List[float]]:
        """计算实体的边界框"""
        try:
            if hasattr(entity, 'bounding_box'):
                bbox = entity.bounding_box
                if bbox:
                    return [bbox.extmin.x, bbox.extmin.y, bbox.extmax.x, bbox.extmax.y]
            
            # 对于某些实体类型，手动计算边界框
            if entity.dxftype() == 'LINE':
                start = entity.dxf.start
                end = entity.dxf.end
                return [
                    min(start.x, end.x), min(start.y, end.y),
                    max(start.x, end.x), max(start.y, end.y)
                ]
            elif entity.dxftype() == 'CIRCLE':
                center = entity.dxf.center
                radius = entity.dxf.radius
                return [
                    center.x - radius, center.y - radius,
                    center.x + radius, center.y + radius
                ]
            
        except Exception:
            pass
        
        return None
    
    def _extract_entity_properties(self, entity) -> Dict[str, Any]:
        """提取实体的详细属性"""
        properties = {}
        
        try:
            # 基本属性
            if hasattr(entity.dxf, 'thickness'):
                properties['thickness'] = entity.dxf.thickness
            
            # 特定实体类型的属性
            if entity.dxftype() == 'LINE':
                properties['start_point'] = list(entity.dxf.start)[:3]
                properties['end_point'] = list(entity.dxf.end)[:3]
                properties['length'] = (entity.dxf.end - entity.dxf.start).magnitude
                
            elif entity.dxftype() == 'CIRCLE':
                properties['center'] = list(entity.dxf.center)[:3]
                properties['radius'] = entity.dxf.radius
                properties['area'] = 3.14159 * entity.dxf.radius ** 2
                
            elif entity.dxftype() == 'ARC':
                properties['center'] = list(entity.dxf.center)[:3]
                properties['radius'] = entity.dxf.radius
                properties['start_angle'] = entity.dxf.start_angle
                properties['end_angle'] = entity.dxf.end_angle
                
            elif entity.dxftype() in ['POLYLINE', 'LWPOLYLINE']:
                if hasattr(entity, 'vertices'):
                    properties['vertex_count'] = len(list(entity.vertices))
                    properties['is_closed'] = entity.is_closed
                
        except Exception as e:
            properties['extraction_error'] = str(e)
        
        return properties
    
    def _calculate_statistics(self, doc, entities: List[EntityInfo]) -> GeometryStatistics:
        """计算几何统计信息"""
        # 按类型统计实体
        entities_by_type = {}
        for entity in entities:
            entity_type = entity.entity_type.value
            entities_by_type[entity_type] = entities_by_type.get(entity_type, 0) + 1
        
        # 计算图形范围
        drawing_extents = None
        valid_boxes = [e.bounding_box for e in entities if e.bounding_box]
        if valid_boxes:
            min_x = min(bbox[0] for bbox in valid_boxes)
            min_y = min(bbox[1] for bbox in valid_boxes)
            max_x = max(bbox[2] for bbox in valid_boxes)
            max_y = max(bbox[3] for bbox in valid_boxes)
            drawing_extents = [min_x, min_y, max_x, max_y]
        
        # 计算总长度和面积（简化计算）
        total_length = 0.0
        total_area = 0.0
        
        for entity in entities:
            props = entity.properties
            if 'length' in props:
                total_length += props['length']
            if 'area' in props:
                total_area += props['area']
        
        return GeometryStatistics(
            total_entities=len(entities),
            entities_by_type=entities_by_type,
            layers_count=len(doc.layers),
            blocks_count=len([name for name in doc.blocks if not name.startswith('*')]),
            total_length=total_length,
            total_area=total_area,
            drawing_extents=drawing_extents
        )
    
    def _validate_geometry(self, doc, entities: List[EntityInfo]) -> List[DXFValidationIssue]:
        """验证几何并识别问题"""
        issues = []
        
        # 检查零长度线
        for entity in entities:
            if entity.entity_type == DXFEntityType.LINE:
                props = entity.properties
                if 'length' in props and props['length'] < 1e-10:
                    issues.append(DXFValidationIssue(
                        severity="warning",
                        code="ZERO_LENGTH_LINE",
                        message="发现零长度线",
                        entity_handle=entity.handle,
                        layer=entity.layer,
                        suggestion="可以删除此线或检查坐标精度"
                    ))
        
        # 检查图层问题
        for layer_name in [e.layer for e in entities]:
            if layer_name not in doc.layers:
                issues.append(DXFValidationIssue(
                    severity="error",
                    code="UNDEFINED_LAYER",
                    message=f"实体引用了未定义的图层: {layer_name}",
                    layer=layer_name,
                    suggestion="创建缺失的图层定义或修改实体图层"
                ))
        
        # 检查边界框
        entities_without_bbox = [e for e in entities if e.bounding_box is None]
        if entities_without_bbox:
            issues.append(DXFValidationIssue(
                severity="warning",
                code="MISSING_BOUNDING_BOX",
                message=f"有 {len(entities_without_bbox)} 个实体无法计算边界框",
                suggestion="检查这些实体的几何定义是否完整"
            ))
        
        return issues
    
    def _get_drawing_units(self, doc) -> str:
        """获取图形单位"""
        try:
            units_map = {
                0: "无单位",
                1: "英寸",
                2: "英尺",
                3: "英里",
                4: "毫米",
                5: "厘米",
                6: "米",
                7: "千米",
                8: "微英寸",
                9: "密耳",
                10: "码",
                11: "埃",
                12: "纳米",
                13: "微米",
                14: "分米",
                15: "十米",
                16: "百米",
                17: "千兆米",
                18: "天文单位",
                19: "光年",
                20: "秒差距"
            }
            
            unit_code = getattr(doc.header, '$INSUNITS', 0)
            return units_map.get(unit_code, f"未知单位({unit_code})")
        except:
            return "未知"
    
    def _apply_transformations(self, doc, options: DXFProcessingOptions):
        """应用坐标变换"""
        # 这里应该实现坐标变换逻辑
        # 包括缩放、旋转、平移等
        # 由于复杂性，这里仅返回原文档
        self.logger.info("应用坐标变换（暂未实现）")
        return doc
    
    def _filter_entities(self, doc, options: DXFProcessingOptions):
        """过滤实体"""
        # 这里应该实现实体过滤逻辑
        # 根据图层、实体类型等进行过滤
        self.logger.info("过滤实体（暂未实现）")
        return doc
    
    def _repair_geometry(self, doc, options: DXFProcessingOptions) -> Dict[str, int]:
        """修复几何"""
        # 这里应该实现几何修复逻辑
        self.logger.info("修复几何（暂未实现）")
        return {"processed": 0, "skipped": 0, "repaired": 0}
    
    def _convert_entities(self, doc, options: DXFProcessingOptions) -> Dict[str, int]:
        """转换实体"""
        # 这里应该实现实体转换逻辑
        self.logger.info("转换实体（暂未实现）")
        return {"converted": 0}
    
    def _generate_outputs(self, doc, options: DXFProcessingOptions) -> List[str]:
        """生成输出文件"""
        output_files = []
        
        try:
            # 保存修复后的DXF文件
            output_file = self.temp_dir / f"processed_{int(time.time())}.dxf"
            doc.saveas(str(output_file))
            output_files.append(str(output_file))
            
        except Exception as e:
            self.logger.error(f"生成输出文件失败: {str(e)}")
        
        return output_files
    
    def _convert_dxf_to_gmsh(self, doc, options: DXFProcessingOptions):
        """将DXF实体转换为Gmsh几何"""
        # 这里应该实现DXF到Gmsh的转换逻辑
        # 包括线、圆弧、样条曲线等的转换
        self.logger.info("DXF到Gmsh转换（暂未实现）")
        pass
    
    def _calculate_data_consistency(self, analysis: DXFAnalysisResult) -> float:
        """计算数据一致性分数"""
        # 简化实现
        error_count = len([issue for issue in analysis.validation_issues if issue.severity == "error"])
        total_entities = analysis.statistics.total_entities
        if total_entities == 0:
            return 100.0
        return max(0, 100 - (error_count / total_entities * 100))
    
    def _calculate_standards_compliance(self, analysis: DXFAnalysisResult) -> float:
        """计算标准符合性分数"""
        # 简化实现
        if analysis.file_info.get("dxf_version", "").startswith("AC"):
            return 90.0  # AutoCAD格式
        return 70.0  # 其他格式
    
    def _generate_quality_recommendations(self, analysis: DXFAnalysisResult, quality_score: float) -> List[str]:
        """生成质量改进建议"""
        recommendations = []
        
        if quality_score < 60:
            recommendations.append("建议修复文件中的错误实体")
        
        if len(analysis.validation_issues) > 10:
            recommendations.append("建议清理文件，移除多余的图层和实体")
        
        if analysis.statistics.total_entities > 10000:
            recommendations.append("文件较大，建议考虑简化或分割")
        
        return recommendations