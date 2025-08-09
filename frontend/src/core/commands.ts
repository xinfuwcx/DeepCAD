// 命令枚举与类型
export enum Command {
  MeshingStart = 'meshing:start',
  MeshingProgress = 'meshing:progress',
  MeshingCompleted = 'meshing:completed',
  AnalysisStart = 'analysis:start',
  AnalysisProgress = 'analysis:progress',
  AnalysisComplete = 'analysis:complete',
  PhysicsAIEnable = 'physicsAI:enable',
  PhysicsAIStart = 'physicsAI:start',
  PhysicsAIStop = 'physicsAI:stop',
  PhysicsAIReset = 'physicsAI:reset',
  PhysicsAIParams = 'physicsAI:params',
  PhysicsAIClose = 'physicsAI:close',
  PhysicsAIToggle = 'physicsAI:toggle',
  ResultsVisualization = 'results:visualization',
  ResultsExportCSV = 'results:export',
  ResultsExportVTK = 'results:export:vtk',
  ResultsExportJSON = 'results:export:json',
  ResultsExportPNG = 'results:export:png'
}

// 判别联合类型定义
export interface MeshingStartCmd { command: Command.MeshingStart; }
export interface MeshingProgressCmd { command: Command.MeshingProgress; progress: number; }
export interface MeshingCompletedCmd { command: Command.MeshingCompleted; quality?: number; }
export interface AnalysisStartCmd { command: Command.AnalysisStart; taskType?: string; }
export interface AnalysisProgressCmd { command: Command.AnalysisProgress; progress: number; }
export interface AnalysisCompleteCmd { command: Command.AnalysisComplete; results?: any; }
export interface PhysicsAIEnableCmd { command: Command.PhysicsAIEnable; }
export interface PhysicsAIStartCmd { command: Command.PhysicsAIStart; }
export interface PhysicsAIStopCmd { command: Command.PhysicsAIStop; }
export interface PhysicsAIResetCmd { command: Command.PhysicsAIReset; }
export interface PhysicsAIParamsCmd { command: Command.PhysicsAIParams; }
export interface PhysicsAICloseCmd { command: Command.PhysicsAIClose; }
export interface PhysicsAIToggleCmd { command: Command.PhysicsAIToggle; }
export interface ResultsVisualizationCmd { command: Command.ResultsVisualization; mode: '3D' | 'chart' | 'table'; }
export interface ResultsExportCSVCmd { command: Command.ResultsExportCSV; }
export interface ResultsExportVTKCmd { command: Command.ResultsExportVTK; }
export interface ResultsExportJSONCmd { command: Command.ResultsExportJSON; }
export interface ResultsExportPNGCmd { command: Command.ResultsExportPNG; }

export type CommandEvent =
  | MeshingStartCmd
  | MeshingProgressCmd
  | MeshingCompletedCmd
  | AnalysisStartCmd
  | AnalysisProgressCmd
  | AnalysisCompleteCmd
  | PhysicsAIEnableCmd
  | PhysicsAIStartCmd
  | PhysicsAIStopCmd
  | PhysicsAIResetCmd
  | PhysicsAIParamsCmd
  | PhysicsAICloseCmd
  | PhysicsAIToggleCmd
  | ResultsVisualizationCmd
  | ResultsExportCSVCmd
  | ResultsExportVTKCmd
  | ResultsExportJSONCmd
  | ResultsExportPNGCmd;

export type CommandPayload = CommandEvent; // 向后兼容
