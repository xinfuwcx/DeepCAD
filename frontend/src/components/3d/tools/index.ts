import * as THREE from 'three';

export { InteractionTools } from './InteractionTools';
export { InteractionToolbar } from './InteractionToolbar';
export { MeasurementPanel } from './MeasurementPanel';

export type {
  InteractionTool,
  Annotation,
  InteractionToolEvents
} from './InteractionTools';

// 临时定义MeasurementResult类型
export interface MeasurementResult {
  id: string;
  type: 'distance' | 'angle' | 'area';
  value: number;
  unit: string;
  points: THREE.Vector3[];
  label?: string;
  createdAt?: number;
}

// 交互工具工具函数
export const InteractionUtils = {
  // 计算两点距离
  calculateDistance: (p1: THREE.Vector3, p2: THREE.Vector3): number => {
    return p1.distanceTo(p2);
  },

  // 计算三点角度
  calculateAngle: (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): number => {
    const v1 = p1.clone().sub(p2).normalize();
    const v2 = p3.clone().sub(p2).normalize();
    return Math.acos(Math.max(-1, Math.min(1, v1.dot(v2))));
  },

  // 计算多边形面积（2D投影）
  calculatePolygonArea: (points: THREE.Vector3[]): number => {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  },

  // 生成测量标签文本
  generateMeasurementLabel: (measurement: MeasurementResult): string => {
    const typeLabels = {
      distance: '距离',
      angle: '角度',
      area: '面积',
      volume: '体积'
    };
    
    const typeLabel = typeLabels[measurement.type] || measurement.type;
    return `${typeLabel}_${measurement.id.slice(-6)}`;
  },

  // 格式化测量值
  formatMeasurementValue: (value: number, unit: string, precision: number = 3): string => {
    return `${value.toFixed(precision)} ${unit}`;
  },

  // 转换单位
  convertUnit: (value: number, fromUnit: string, toUnit: string): number => {
    const conversions: Record<string, Record<string, number>> = {
      // 长度单位转换（基准：毫米）
      mm: { mm: 1, cm: 0.1, m: 0.001, in: 0.0393701, ft: 0.00328084 },
      cm: { mm: 10, cm: 1, m: 0.01, in: 0.393701, ft: 0.0328084 },
      m: { mm: 1000, cm: 100, m: 1, in: 39.3701, ft: 3.28084 },
      in: { mm: 25.4, cm: 2.54, m: 0.0254, in: 1, ft: 0.0833333 },
      ft: { mm: 304.8, cm: 30.48, m: 0.3048, in: 12, ft: 1 },
      
      // 角度单位转换（基准：弧度）
      rad: { rad: 1, deg: 180 / Math.PI },
      deg: { rad: Math.PI / 180, deg: 1 }
    };

    const fromConversions = conversions[fromUnit];
    const toConversion = fromConversions?.[toUnit];
    
    if (toConversion !== undefined) {
      return value * toConversion;
    }
    
    return value; // 如果转换不支持，返回原值
  },

  // 生成唯一ID
  generateId: (prefix: string = 'item'): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // 颜色值转换
  colorToHex: (color: number): string => {
    return `#${color.toString(16).padStart(6, '0')}`;
  },

  // 十六进制颜色转数值
  hexToColor: (hex: string): number => {
    return parseInt(hex.replace('#', ''), 16);
  },

  // 创建测量报告
  createMeasurementReport: (measurements: MeasurementResult[]): string => {
    let report = '测量报告\n';
    report += '='.repeat(50) + '\n\n';
    
    measurements.forEach((measurement, index) => {
      report += `${index + 1}. ${measurement.label || `测量_${measurement.id.slice(-6)}`}\n`;
      report += `   类型: ${measurement.type}\n`;
      report += `   数值: ${measurement.value.toFixed(3)} ${measurement.unit}\n`;
      report += `   点数: ${measurement.points.length}\n`;
      report += `   创建时间: ${new Date(measurement.createdAt).toLocaleString()}\n\n`;
    });
    
    return report;
  },

  // 导出为CSV格式
  exportToCSV: (measurements: MeasurementResult[]): string => {
    const headers = ['ID', '标签', '类型', '数值', '单位', '点数', '创建时间'];
    const rows = measurements.map(m => [
      m.id,
      m.label || `测量_${m.id.slice(-6)}`,
      m.type,
      m.value.toFixed(3),
      m.unit,
      m.points.length.toString(),
      new Date(m.createdAt).toLocaleString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  },

  // 验证测量数据
  validateMeasurement: (measurement: Partial<MeasurementResult>): string[] => {
    const errors: string[] = [];
    
    if (!measurement.type) {
      errors.push('测量类型不能为空');
    }
    
    if (measurement.value === undefined || measurement.value < 0) {
      errors.push('测量数值必须为非负数');
    }
    
    if (!measurement.unit) {
      errors.push('测量单位不能为空');
    }
    
    if (!measurement.points || measurement.points.length === 0) {
      errors.push('测量点不能为空');
    }
    
    return errors;
  },

  // 查找最近的测量点
  findNearestMeasurementPoint: (
    position: THREE.Vector3,
    measurements: MeasurementResult[],
    maxDistance: number = 1
  ): { measurement: MeasurementResult; pointIndex: number; distance: number } | null => {
    let nearest: { measurement: MeasurementResult; pointIndex: number; distance: number } | null = null;
    let minDistance = maxDistance;
    
    measurements.forEach(measurement => {
      measurement.points.forEach((point, index) => {
        const distance = position.distanceTo(point);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = { measurement, pointIndex: index, distance };
        }
      });
    });
    
    return nearest;
  }
};

// 测量工具常量
export const MEASUREMENT_CONSTANTS = {
  // 默认单位
  DEFAULT_UNITS: {
    distance: 'mm',
    angle: 'deg',
    area: 'mm²',
    volume: 'mm³'
  },

  // 单位选项
  UNIT_OPTIONS: {
    distance: ['mm', 'cm', 'm', 'in', 'ft'],
    angle: ['deg', 'rad'],
    area: ['mm²', 'cm²', 'm²', 'in²', 'ft²'],
    volume: ['mm³', 'cm³', 'm³', 'in³', 'ft³']
  },

  // 精度设置
  PRECISION: {
    distance: 3,
    angle: 2,
    area: 2,
    volume: 2
  },

  // 颜色预设
  COLORS: {
    distance: 0x00ff00,  // 绿色
    angle: 0xff9900,     // 橙色
    area: 0x0099ff,      // 蓝色
    volume: 0xff0099,    // 紫色
    selected: 0xff0000,  // 红色
    highlight: 0xffff00  // 黄色
  },

  // 工具提示
  TOOLTIPS: {
    select: '左键点击选择对象，Ctrl+左键多选，Shift+拖拽框选',
    measure: '左键点击测量点，双击完成测量，支持连续测量',
    annotate: '左键点击添加标注，双击编辑文本，拖拽调整位置',
    section: '拖拽调整剖切位置，滚轮调整剖切深度，右键重置剖切',
    explode: '滚轮调整爆炸程度，双击重置视图'
  }
};