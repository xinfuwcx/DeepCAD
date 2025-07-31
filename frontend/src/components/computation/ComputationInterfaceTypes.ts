/**
 * 计算集成接口类型定义
 * 修复TypeScript编译错误
 */

export type ComputationStatus = 'idle' | 'running' | 'completed' | 'error' | 'cancelled';

export type ComputationTask = 
  | 'soil_structure_coupling'
  | 'construction_stage_analysis' 
  | 'safety_assessment'
  | 'stress_visualization'
  | 'flow_field_analysis'
  | 'deformation_monitoring'
  | 'stability_evaluation'
  | 'deformation_animation'
  | 'flow_field_visualization'
  | 'comprehensive_analysis';

export interface ComputationTaskInfo {
  id: string;
  name: string;
  status: ComputationStatus;
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  result?: any;
}

export interface ComputationEngine {
  id: string;
  name: string;
  version: string;
  status: ComputationStatus;
  supportedTasks: string[];
}

export interface ComputationResource {
  cpu: {
    usage: number;
    cores: number;
    temperature?: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
  };
  gpu?: {
    usage: number;
    memory: number;
    temperature?: number;
  };
}