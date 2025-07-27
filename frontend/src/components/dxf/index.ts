export { DXFImportInterface } from './DXFImportInterface';
export { DXFBatchProcessor } from './DXFBatchProcessor';

// DXF相关类型定义
export interface DXFProcessingOptions {
  mode: 'strict' | 'tolerant' | 'repair' | 'preview';
  coordinate_system: 'WCS' | 'UCS' | 'OCS';
  scale_factor: number;
  tolerance: number;
  quality_check_enabled: boolean;
  fix_geometry_issues: boolean;
  remove_invalid_entities: boolean;
  layer_filter?: string[];
  output_formats: string[];
  merge_duplicate_vertices: boolean;
  simplify_curves: boolean;
  preserve_layers: boolean;
}

export interface DXFAnalysisResult {
  file_size: number;
  dxf_version: string;
  entity_count: number;
  layer_count: number;
  block_count: number;
  entity_types: Record<string, number>;
  layer_names: string[];
  coordinate_system: string;
  drawing_bounds: {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
  };
  units: string;
  creation_time?: string;
  modification_time?: string;
}

export interface DXFQualityReport {
  overall_quality: 'excellent' | 'good' | 'fair' | 'poor';
  quality_score: number;
  validation_issues: Array<{
    type: string;
    severity: 'error' | 'warning' | 'info';
    description: string;
    count: number;
    affected_entities: string[];
  }>;
  geometry_statistics: {
    total_vertices: number;
    duplicate_vertices: number;
    invalid_geometries: number;
    self_intersections: number;
    tiny_edges: number;
    degenerate_faces: number;
  };
  recommendations: string[];
}

export interface DXFProcessingResult {
  success: boolean;
  output_file_path: string;
  converted_files: Record<string, string>;
  processing_time: number;
  warnings: string[];
  errors: string[];
  statistics: {
    input_entities: number;
    output_entities: number;
    removed_entities: number;
    fixed_entities: number;
  };
}

// DXF处理工具函数
export const DXFUtils = {
  // 格式化文件大小
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // 格式化处理时间
  formatProcessingTime: (seconds: number): string => {
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  },

  // 获取质量等级颜色
  getQualityColor: (quality: string): string => {
    const colorMap: Record<string, string> = {
      excellent: '#52c41a',
      good: '#1890ff',
      fair: '#faad14',
      poor: '#ff4d4f'
    };
    return colorMap[quality] || '#d9d9d9';
  },

  // 获取处理模式描述
  getModeDescription: (mode: string): string => {
    const descriptions: Record<string, string> = {
      strict: '严格验证，不允许任何几何错误',
      tolerant: '容忍小的几何误差，自动修复常见问题',
      repair: '主动修复几何问题，适合损坏的DXF文件',
      preview: '快速预览，跳过复杂验证'
    };
    return descriptions[mode] || '未知模式';
  },

  // 验证DXF文件扩展名
  isValidDXFFile: (filename: string): boolean => {
    return filename.toLowerCase().endsWith('.dxf');
  },

  // 生成唯一的处理ID
  generateProcessingId: (): string => {
    return `dxf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // 解析输出格式
  parseOutputFormats: (formats: string[]): Array<{label: string, value: string, extension: string}> => {
    const formatMap: Record<string, {label: string, extension: string}> = {
      geo: { label: 'Gmsh几何文件', extension: '.geo' },
      step: { label: 'STEP文件', extension: '.step' },
      iges: { label: 'IGES文件', extension: '.iges' },
      stl: { label: 'STL网格', extension: '.stl' },
      obj: { label: 'OBJ模型', extension: '.obj' },
      ply: { label: 'PLY点云', extension: '.ply' },
      gltf: { label: 'glTF模型', extension: '.gltf' }
    };

    return formats.map(format => ({
      label: formatMap[format]?.label || format.toUpperCase(),
      value: format,
      extension: formatMap[format]?.extension || `.${format}`
    }));
  }
};

// DXF常量定义
export const DXF_CONSTANTS = {
  // 支持的DXF版本
  SUPPORTED_VERSIONS: [
    'R12', 'R13', 'R14', 'R2000', 'R2004', 
    'R2007', 'R2010', 'R2013', 'R2018'
  ],

  // 支持的实体类型
  ENTITY_TYPES: [
    'LINE', 'POLYLINE', 'LWPOLYLINE', 'ARC', 'CIRCLE',
    'ELLIPSE', 'SPLINE', 'POINT', 'TEXT', 'MTEXT',
    'INSERT', 'BLOCK', 'HATCH', 'DIMENSION', 'LEADER'
  ],

  // 处理模式
  PROCESSING_MODES: ['strict', 'tolerant', 'repair', 'preview'],

  // 坐标系统
  COORDINATE_SYSTEMS: ['WCS', 'UCS', 'OCS'],

  // 输出格式
  OUTPUT_FORMATS: ['geo', 'step', 'iges', 'stl', 'obj', 'ply', 'gltf'],

  // 质量等级
  QUALITY_LEVELS: ['excellent', 'good', 'fair', 'poor'],

  // 文件大小限制 (50MB)
  MAX_FILE_SIZE: 50 * 1024 * 1024,

  // 默认处理选项
  DEFAULT_OPTIONS: {
    mode: 'tolerant',
    coordinate_system: 'WCS',
    scale_factor: 1.0,
    tolerance: 1e-6,
    quality_check_enabled: true,
    fix_geometry_issues: true,
    remove_invalid_entities: false,
    output_formats: ['geo'],
    merge_duplicate_vertices: true,
    simplify_curves: false,
    preserve_layers: true
  } as DXFProcessingOptions
};