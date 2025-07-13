from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from enum import Enum
import datetime


class DXFFileStatus(str, Enum):
    """DXF文件处理状态"""
    UPLOADING = "uploading"
    ANALYZING = "analyzing"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DXFEntityType(str, Enum):
    """DXF实体类型"""
    LINE = "line"
    POLYLINE = "polyline"
    LWPOLYLINE = "lwpolyline"
    ARC = "arc"
    CIRCLE = "circle"
    ELLIPSE = "ellipse"
    SPLINE = "spline"
    POINT = "point"
    TEXT = "text"
    MTEXT = "mtext"
    INSERT = "insert"
    BLOCK = "block"
    HATCH = "hatch"
    DIMENSION = "dimension"
    LEADER = "leader"
    UNKNOWN = "unknown"


class DXFProcessingMode(str, Enum):
    """DXF处理模式"""
    STRICT = "strict"           # 严格模式 - 遇到错误立即停止
    TOLERANT = "tolerant"       # 容错模式 - 跳过错误继续处理
    REPAIR = "repair"           # 修复模式 - 尝试修复错误
    PREVIEW = "preview"         # 预览模式 - 仅分析不处理


class CoordinateSystem(str, Enum):
    """坐标系统"""
    WCS = "wcs"                 # 世界坐标系
    UCS = "ucs"                 # 用户坐标系
    CUSTOM = "custom"           # 自定义坐标系


class LayerInfo(BaseModel):
    """图层信息"""
    name: str = Field(..., description="图层名称")
    color: Optional[int] = Field(None, description="图层颜色索引")
    linetype: Optional[str] = Field(None, description="线型")
    lineweight: Optional[float] = Field(None, description="线宽")
    entity_count: int = Field(0, description="实体数量")
    is_frozen: bool = Field(False, description="是否冻结")
    is_locked: bool = Field(False, description="是否锁定")
    is_visible: bool = Field(True, description="是否可见")


class BlockInfo(BaseModel):
    """块定义信息"""
    name: str = Field(..., description="块名称")
    base_point: List[float] = Field(..., description="基点坐标")
    entity_count: int = Field(0, description="包含实体数量")
    description: Optional[str] = Field(None, description="块描述")


class EntityInfo(BaseModel):
    """实体信息"""
    handle: str = Field(..., description="实体句柄")
    entity_type: DXFEntityType = Field(..., description="实体类型")
    layer: str = Field(..., description="所在图层")
    color: Optional[int] = Field(None, description="颜色索引")
    linetype: Optional[str] = Field(None, description="线型")
    bounding_box: Optional[List[float]] = Field(None, description="边界框 [xmin, ymin, xmax, ymax]")
    properties: Dict[str, Any] = Field(default_factory=dict, description="实体属性")


class GeometryStatistics(BaseModel):
    """几何统计信息"""
    total_entities: int = Field(0, description="总实体数量")
    entities_by_type: Dict[str, int] = Field(default_factory=dict, description="按类型分组的实体数量")
    layers_count: int = Field(0, description="图层数量")
    blocks_count: int = Field(0, description="块数量")
    total_length: float = Field(0.0, description="总长度")
    total_area: float = Field(0.0, description="总面积")
    drawing_extents: Optional[List[float]] = Field(None, description="图形范围 [xmin, ymin, xmax, ymax]")


class DXFValidationIssue(BaseModel):
    """DXF验证问题"""
    severity: str = Field(..., description="严重程度: error, warning, info")
    code: str = Field(..., description="问题代码")
    message: str = Field(..., description="问题描述")
    entity_handle: Optional[str] = Field(None, description="相关实体句柄")
    layer: Optional[str] = Field(None, description="相关图层")
    location: Optional[List[float]] = Field(None, description="问题位置")
    suggestion: Optional[str] = Field(None, description="修复建议")


class DXFProcessingOptions(BaseModel):
    """DXF处理选项"""
    mode: DXFProcessingMode = Field(DXFProcessingMode.TOLERANT, description="处理模式")
    coordinate_system: CoordinateSystem = Field(CoordinateSystem.WCS, description="坐标系统")
    scale_factor: float = Field(1.0, description="缩放因子")
    rotation_angle: float = Field(0.0, description="旋转角度（度）")
    translation: List[float] = Field([0.0, 0.0, 0.0], description="平移向量")
    
    # 过滤选项
    layer_filter: List[str] = Field(default_factory=list, description="图层过滤器")
    entity_type_filter: List[DXFEntityType] = Field(default_factory=list, description="实体类型过滤器")
    exclude_frozen_layers: bool = Field(True, description="排除冻结图层")
    exclude_locked_layers: bool = Field(False, description="排除锁定图层")
    
    # 修复选项
    fix_duplicate_vertices: bool = Field(True, description="修复重复顶点")
    fix_zero_length_lines: bool = Field(True, description="修复零长度线")
    fix_invalid_geometries: bool = Field(True, description="修复无效几何")
    merge_collinear_segments: bool = Field(False, description="合并共线段")
    
    # 输出选项
    preserve_layers: bool = Field(True, description="保留图层信息")
    preserve_colors: bool = Field(True, description="保留颜色信息")
    preserve_linetypes: bool = Field(True, description="保留线型信息")
    generate_3d_from_2d: bool = Field(False, description="从2D生成3D几何")
    extrusion_height: float = Field(1.0, description="挤出高度")


class DXFAnalysisResult(BaseModel):
    """DXF分析结果"""
    file_info: Dict[str, Any] = Field(default_factory=dict, description="文件信息")
    layers: List[LayerInfo] = Field(default_factory=list, description="图层信息")
    blocks: List[BlockInfo] = Field(default_factory=list, description="块信息")
    entities: List[EntityInfo] = Field(default_factory=list, description="实体信息")
    statistics: GeometryStatistics = Field(default_factory=GeometryStatistics, description="统计信息")
    validation_issues: List[DXFValidationIssue] = Field(default_factory=list, description="验证问题")
    analysis_time: float = Field(0.0, description="分析耗时（秒）")


class DXFProcessingResult(BaseModel):
    """DXF处理结果"""
    success: bool = Field(..., description="处理是否成功")
    status: DXFFileStatus = Field(..., description="处理状态")
    message: str = Field(..., description="处理消息")
    
    # 结果数据
    geometry_id: Optional[str] = Field(None, description="生成的几何ID")
    processed_entities: int = Field(0, description="已处理实体数量")
    skipped_entities: int = Field(0, description="跳过的实体数量")
    repaired_entities: int = Field(0, description="修复的实体数量")
    
    # 输出文件
    output_files: List[str] = Field(default_factory=list, description="输出文件列表")
    preview_image: Optional[str] = Field(None, description="预览图片路径")
    
    # 处理统计
    processing_time: float = Field(0.0, description="处理耗时（秒）")
    memory_usage: Optional[float] = Field(None, description="内存使用（MB）")
    
    # 问题报告
    errors: List[DXFValidationIssue] = Field(default_factory=list, description="错误列表")
    warnings: List[DXFValidationIssue] = Field(default_factory=list, description="警告列表")


class DXFImportRequest(BaseModel):
    """DXF导入请求"""
    file_id: str = Field(..., description="文件ID")
    project_id: str = Field(..., description="项目ID")
    options: DXFProcessingOptions = Field(default_factory=DXFProcessingOptions, description="处理选项")
    create_mesh: bool = Field(False, description="是否自动生成网格")
    mesh_size: Optional[float] = Field(None, description="网格尺寸")


class DXFImportResponse(BaseModel):
    """DXF导入响应"""
    import_id: str = Field(..., description="导入任务ID")
    status: DXFFileStatus = Field(..., description="任务状态")
    analysis_result: Optional[DXFAnalysisResult] = Field(None, description="分析结果")
    processing_result: Optional[DXFProcessingResult] = Field(None, description="处理结果")
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.now, description="创建时间")


class LayerFilterRequest(BaseModel):
    """图层过滤请求"""
    file_id: str = Field(..., description="文件ID")
    selected_layers: List[str] = Field(..., description="选择的图层")
    merge_layers: bool = Field(False, description="是否合并图层")
    target_layer_name: Optional[str] = Field(None, description="目标图层名称")


class EntityConversionOptions(BaseModel):
    """实体转换选项"""
    convert_text_to_curves: bool = Field(False, description="将文字转换为曲线")
    convert_hatches_to_regions: bool = Field(True, description="将填充转换为区域")
    simplify_splines: bool = Field(True, description="简化样条曲线")
    spline_tolerance: float = Field(0.01, description="样条曲线容差")
    arc_tessellation_angle: float = Field(5.0, description="圆弧细分角度")


class DXFRepairOptions(BaseModel):
    """DXF修复选项"""
    auto_fix_common_issues: bool = Field(True, description="自动修复常见问题")
    fix_overlapping_lines: bool = Field(True, description="修复重叠线")
    fix_gaps_in_polylines: bool = Field(True, description="修复多段线间隙")
    gap_tolerance: float = Field(0.001, description="间隙容差")
    remove_duplicate_entities: bool = Field(True, description="移除重复实体")
    normalize_coordinates: bool = Field(True, description="规范化坐标")


class DXFQualityReport(BaseModel):
    """DXF质量报告"""
    overall_quality: str = Field(..., description="整体质量评级: excellent, good, fair, poor")
    quality_score: float = Field(..., description="质量分数 (0-100)")
    
    # 质量指标
    geometry_integrity: float = Field(..., description="几何完整性分数")
    data_consistency: float = Field(..., description="数据一致性分数")
    standards_compliance: float = Field(..., description="标准符合性分数")
    
    # 详细指标
    closed_boundaries_ratio: float = Field(..., description="封闭边界比例")
    valid_geometries_ratio: float = Field(..., description="有效几何比例")
    duplicate_entities_count: int = Field(..., description="重复实体数量")
    orphaned_entities_count: int = Field(..., description="孤立实体数量")
    
    # 建议
    recommendations: List[str] = Field(default_factory=list, description="质量改进建议")
    critical_issues: List[DXFValidationIssue] = Field(default_factory=list, description="关键问题")


class DXFBatchProcessRequest(BaseModel):
    """DXF批量处理请求"""
    file_ids: List[str] = Field(..., description="文件ID列表")
    project_id: str = Field(..., description="项目ID")
    options: DXFProcessingOptions = Field(default_factory=DXFProcessingOptions, description="统一处理选项")
    merge_results: bool = Field(False, description="是否合并结果")
    parallel_processing: bool = Field(True, description="是否并行处理")


class DXFBatchProcessResponse(BaseModel):
    """DXF批量处理响应"""
    batch_id: str = Field(..., description="批量任务ID")
    total_files: int = Field(..., description="总文件数")
    completed_files: int = Field(..., description="已完成文件数")
    failed_files: int = Field(..., description="失败文件数")
    status: str = Field(..., description="批量任务状态")
    results: List[DXFImportResponse] = Field(default_factory=list, description="各文件处理结果")
    started_at: datetime.datetime = Field(default_factory=datetime.datetime.now, description="开始时间")
    estimated_completion: Optional[datetime.datetime] = Field(None, description="预计完成时间")