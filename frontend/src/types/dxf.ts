// DXF导入相关类型定义

export interface DXFImportTask {
  import_id: string;
  filename: string;
  file_size: number;
  status: DXFFileStatus;
  progress: number;
  created_at: string;
  analysis?: DXFAnalysisResult;
  processing_result?: DXFProcessingResult;
  qualityReport?: DXFQualityReport;
}

export type DXFFileStatus = 'PENDING' | 'ANALYZING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type DXFProcessingMode = 'STRICT' | 'TOLERANT' | 'REPAIR' | 'PREVIEW';
export type DXFCoordinateSystem = 'WCS' | 'UCS' | 'OCS';
export type DXFUnitConversion = 'METER' | 'MILLIMETER' | 'INCH' | 'FOOT';

export interface DXFProcessingOptions {
  mode: DXFProcessingMode;
  coordinate_system: DXFCoordinateSystem;
  scale_factor: number;
  unit_conversion: DXFUnitConversion;
  merge_duplicate_points: boolean;
  tolerance: number;
  repair_invalid_geometry: boolean;
  layer_filter: string[];
  entity_filter: string[];
  preserve_original_structure?: boolean;
  generate_quality_report?: boolean;
}

export interface DXFFileInfo {
  filename: string;
  file_size: number;
  dxf_version: string;
  created_by: string;
  last_modified: string;
  units: string;
  coordinate_system: string;
}

export interface DXFGeometryInfo {
  total_entities: number;
  entities_by_type: Record<string, number>;
  layers_count: number;
  blocks_count: number;
  total_length: number;
  total_area: number;
  bounding_box: number[];
}

export interface DXFLayerInfo {
  name: string;
  entity_count: number;
  is_visible: boolean;
  is_frozen: boolean;
  is_locked: boolean;
  color?: number;
  linetype?: string;
}

export interface DXFEntityInfo {
  handle: string;
  type: string;
  layer: string;
  color?: number;
  bounding_box?: number[];
  properties?: Record<string, any>;
}

export interface DXFValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  entity_handle?: string;
  layer?: string;
  suggestion?: string;
}

export interface DXFAnalysisResult {
  file_info: DXFFileInfo;
  geometry_info: DXFGeometryInfo;
  layers: DXFLayerInfo[];
  entities: DXFEntityInfo[];
  validation_issues: DXFValidationIssue[];
  completeness_score: number;
  processing_recommendations: string[];
  analysis_time: number;
}

export interface DXFGeometrySummary {
  points: number;
  lines: number;
  curves: number;
  surfaces: number;
}

export interface DXFProcessingResult {
  success: boolean;
  processed_entities: number;
  skipped_entities: number;
  repaired_entities: number;
  processing_time: number;
  output_files: string[];
  warnings: string[];
  errors: string[];
  geometry_summary: DXFGeometrySummary;
  task_id?: string;
}

export interface DXFQualityRecommendation {
  type: 'critical' | 'important' | 'suggestion';
  message: string;
  action?: string;
}

export interface DXFCriticalIssue {
  issue_type: string;
  description: string;
  affected_entities: number;
  severity: 'high' | 'medium' | 'low';
}

export interface DXFQualityReport {
  overall_score: number;
  completeness_score: number;
  accuracy_score: number;
  consistency_score: number;
  recommendations: DXFQualityRecommendation[];
  critical_issues: DXFCriticalIssue[];
  warnings: string[];
  generated_at: string;
}

// API响应类型
export interface DXFImportResponse {
  import_id: string;
  status: DXFFileStatus;
  message?: string;
  analysis_result?: DXFAnalysisResult;
  processing_result?: DXFProcessingResult;
}

export interface DXFValidationResult {
  is_valid: boolean;
  issues: DXFValidationIssue[];
  accuracy_score: number;
  consistency_score: number;
}

export interface DXFRepairResult {
  success: boolean;
  repaired_issues: string[];
  remaining_issues: string[];
  repair_time: number;
  output_file?: string;
}

export interface DXFConversionResult {
  success: boolean;
  output_format: string;
  output_file: string;
  conversion_time: number;
  geometry_summary: DXFGeometrySummary;
}

// 批量处理相关类型
export interface DXFBatchProcessRequest {
  file_ids: string[];
  options: DXFProcessingOptions;
  parallel_processing: boolean;
}

export interface DXFBatchProcessResponse {
  batch_id: string;
  total_files: number;
  completed_files: number;
  failed_files: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: DXFProcessingResult[];
}

// 图层过滤请求
export interface LayerFilterRequest {
  file_id: string;
  selected_layers: string[];
  merge_layers: boolean;
}

// 支持的格式信息
export interface DXFSupportedFormats {
  input_formats: string[];
  output_formats: string[];
  dxf_versions: string[];
  entity_types: string[];
  processing_modes: string[];
}

// Hook返回类型
export interface UseDXFImportReturn {
  tasks: DXFImportTask[];
  isLoading: boolean;
  uploadFile: (file: File, options: DXFProcessingOptions, onProgress?: (progress: number) => void) => Promise<DXFImportTask>;
  getAnalysis: (importId: string) => Promise<DXFAnalysisResult>;
  getQualityReport: (importId: string) => Promise<DXFQualityReport>;
  deleteTask: (importId: string) => Promise<void>;
  refreshStatus: (importId: string) => Promise<void>;
  refreshAllTasks: () => Promise<void>;
  clearTasks: () => void;
}

// 常量定义
export const DXF_PROCESSING_MODES: Record<DXFProcessingMode, string> = {
  STRICT: '严格模式',
  TOLERANT: '容错模式',
  REPAIR: '修复模式',
  PREVIEW: '预览模式',
};

export const DXF_COORDINATE_SYSTEMS: Record<DXFCoordinateSystem, string> = {
  WCS: '世界坐标系',
  UCS: '用户坐标系',
  OCS: '对象坐标系',
};

export const DXF_UNIT_CONVERSIONS: Record<DXFUnitConversion, string> = {
  METER: '米',
  MILLIMETER: '毫米',
  INCH: '英寸',
  FOOT: '英尺',
};

export const DXF_ENTITY_TYPES = [
  'LINE',
  'POLYLINE',
  'LWPOLYLINE',
  'ARC',
  'CIRCLE',
  'ELLIPSE',
  'SPLINE',
  'TEXT',
  'MTEXT',
  'POINT',
  'INSERT',
  'HATCH',
  'DIMENSION',
  'LEADER',
  'SOLID',
  'TRACE',
  'FACE3D',
  'POLYFACE',
  'MESH',
] as const;

export type DXFEntityType = typeof DXF_ENTITY_TYPES[number];

export const DXF_FILE_STATUSES: Record<DXFFileStatus, { text: string; color: string }> = {
  PENDING: { text: '等待中', color: 'default' },
  ANALYZING: { text: '分析中', color: 'processing' },
  PROCESSING: { text: '处理中', color: 'processing' },
  COMPLETED: { text: '已完成', color: 'success' },
  FAILED: { text: '失败', color: 'error' },
};

// 默认配置
export const DEFAULT_DXF_PROCESSING_OPTIONS: DXFProcessingOptions = {
  mode: 'TOLERANT',
  coordinate_system: 'WCS',
  scale_factor: 1.0,
  unit_conversion: 'METER',
  merge_duplicate_points: true,
  tolerance: 1e-6,
  repair_invalid_geometry: true,
  layer_filter: [],
  entity_filter: [],
  preserve_original_structure: true,
  generate_quality_report: true,
};

// 质量评分等级
export const QUALITY_SCORE_LEVELS = [
  { min: 90, max: 100, level: '优秀', color: '#52c41a' },
  { min: 80, max: 89, level: '良好', color: '#1890ff' },
  { min: 70, max: 79, level: '一般', color: '#faad14' },
  { min: 60, max: 69, level: '较差', color: '#fa8c16' },
  { min: 0, max: 59, level: '很差', color: '#ff4d4f' },
] as const;

// 错误代码映射
export const DXF_ERROR_CODES: Record<string, string> = {
  'E001': '文件格式错误',
  'E002': '版本不支持',
  'E003': '文件损坏',
  'E004': '缺少必需数据',
  'W001': '图层信息不完整',
  'W002': '几何精度较低',
  'W003': '存在重复实体',
  'I001': '建议启用自动修复',
  'I002': '建议调整容差设置',
  'I003': '建议过滤无效图层',
};

export default {
  DXF_PROCESSING_MODES,
  DXF_COORDINATE_SYSTEMS,
  DXF_UNIT_CONVERSIONS,
  DXF_ENTITY_TYPES,
  DXF_FILE_STATUSES,
  DEFAULT_DXF_PROCESSING_OPTIONS,
  QUALITY_SCORE_LEVELS,
  DXF_ERROR_CODES,
};