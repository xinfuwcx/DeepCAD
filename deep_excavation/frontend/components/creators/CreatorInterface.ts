/**
 * @file 建模组件创建器接口
 * @description 定义所有建模组件创建器的通用接口
 */

import { ReactNode } from 'react';

/**
 * 通用参数类型
 */
export interface CreatorParams {
  [key: string]: any;
}

/**
 * 建模组件创建器接口
 */
export interface CreatorInterface<T extends CreatorParams = CreatorParams> {
  /**
   * 组件唯一标识
   */
  id: string;
  
  /**
   * 组件名称
   */
  name: string;
  
  /**
   * 组件图标
   */
  icon: ReactNode;
  
  /**
   * 组件描述
   */
  description: string;
  
  /**
   * 组件分类
   */
  category: 'geology' | 'structure' | 'support' | 'excavation' | 'tunnel' | 'other';
  
  /**
   * 组件参数
   */
  params: T;
  
  /**
   * 创建组件
   * @param params 组件参数
   */
  create: (params: T) => Promise<any>;
  
  /**
   * 获取组件表单
   */
  getForm: () => ReactNode;
  
  /**
   * 验证参数
   * @param params 组件参数
   */
  validate?: (params: T) => { valid: boolean; errors?: string[] };
}

/**
 * 创建器状态
 */
export type CreatorStatus = 'idle' | 'creating' | 'editing' | 'error';

/**
 * 基本几何参数
 */
export interface GeometryParams extends CreatorParams {
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  color?: string;
}

/**
 * 结构参数
 */
export interface StructureParams extends GeometryParams {
  material?: string;
  thickness?: number;
}

/**
 * 土体参数
 */
export interface SoilParams extends GeometryParams {
  soilType?: string;
  density?: number;
  cohesion?: number;
  frictionAngle?: number;
  elasticModulus?: number;
  poissonRatio?: number;
}

/**
 * 支护结构参数
 */
export interface SupportParams extends StructureParams {
  installationStage?: number;
  preload?: number;
}

/**
 * 开挖参数
 */
export interface ExcavationParams extends GeometryParams {
  stages?: number[];
  excavationSequence?: { stage: number; depth: number }[];
}

/**
 * 隧道参数
 */
export interface TunnelParams extends GeometryParams {
  diameter?: number;
  length?: number;
  lining?: {
    thickness: number;
    material: string;
  };
}

/**
 * 地下连续墙参数
 */
export interface DiaphragmWallParams extends StructureParams {
  depth?: number;
  length?: number;
  segments?: number;
}

/**
 * 排桩参数
 */
export interface PileParams extends StructureParams {
  diameter?: number;
  depth?: number;
  spacing?: number;
  rows?: number;
}

/**
 * 锚索/锚杆参数
 */
export interface AnchorParams extends SupportParams {
  length?: number;
  angle?: number;
  freeLength?: number;
  bondLength?: number;
  diameter?: number;
  tension?: number;
}

/**
 * 土钉参数
 */
export interface SoilNailParams extends SupportParams {
  length?: number;
  angle?: number;
  diameter?: number;
  spacing?: { horizontal: number; vertical: number };
  rows?: number;
}

/**
 * 支撑参数
 */
export interface StrutParams extends SupportParams {
  length?: number;
  section?: { width: number; height: number } | { diameter: number };
  level?: number;
}

/**
 * 围护结构参数
 */
export interface RetainingWallParams extends StructureParams {
  height?: number;
  length?: number;
  type?: 'concrete' | 'sheet_pile' | 'soldier_pile' | 'secant_pile';
} 