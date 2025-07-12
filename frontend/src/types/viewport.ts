/**
 * Viewport3D 相关类型定义
 */

// 工具栏动作类型
export enum ToolbarAction {
  SELECT = 'select',
  ORBIT = 'orbit', 
  PAN = 'pan',
  ZOOM = 'zoom',
  FIT = 'fit',
  RESET = 'reset',
  MEASURE = 'measure',
  SECTION_CUT = 'section_cut',
  WIREFRAME = 'wireframe',
  GRID = 'grid',
  SCREENSHOT = 'screenshot',
  SETTINGS = 'settings'
}

// 渲染模式
export enum RenderMode {
  SOLID = 'solid',
  WIREFRAME = 'wireframe',
  POINTS = 'points'
}

// 视图模式
export enum ViewMode {
  PERSPECTIVE = 'perspective',
  ORTHOGRAPHIC = 'orthographic'
}

// 工具栏位置
export enum ToolbarPosition {
  TOP_LEFT = 'top-left',
  TOP_RIGHT = 'top-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right',
  TOP_CENTER = 'top-center',
  BOTTOM_CENTER = 'bottom-center'
}

// 工具栏显示模式
export enum ToolbarDisplay {
  ALWAYS = 'always',
  AUTO_HIDE = 'auto-hide',
  COLLAPSED = 'collapsed',
  HIDDEN = 'hidden'
}

// 网格配置
export interface GridConfig {
  visible: boolean;
  size: number;
  divisions: number;
  color: string;
  opacity: number;
  infinite: boolean;
}

// 坐标系配置
export interface CoordinateSystemConfig {
  visible: boolean;
  size: number;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  labels: boolean;
}

// 视口配置
export interface ViewportConfig {
  background: string;
  renderMode: RenderMode;
  viewMode: ViewMode;
  fov: number;
  near: number;
  far: number;
  enableDamping: boolean;
  dampingFactor: number;
  enablePan: boolean;
  enableZoom: boolean;
  enableRotate: boolean;
}

// 工具栏配置
export interface ToolbarConfig {
  position: ToolbarPosition;
  display: ToolbarDisplay;
  size: 'small' | 'medium' | 'large';
  orientation: 'horizontal' | 'vertical';
  visibleTools: ToolbarAction[];
  customOrder?: ToolbarAction[];
}

// 测量数据
export interface MeasurementData {
  id: string;
  type: 'distance' | 'angle' | 'area';
  points: Array<{x: number, y: number, z: number}>;
  value: number;
  unit: string;
  label?: string;
}

// 剖切平面数据
export interface SectionPlane {
  id: string;
  position: {x: number, y: number, z: number};
  normal: {x: number, y: number, z: number};
  enabled: boolean;
  color?: string;
}

// 视口状态
export interface ViewportState {
  activeTool: ToolbarAction;
  isInteracting: boolean;
  measurements: MeasurementData[];
  sectionPlanes: SectionPlane[];
  grid: GridConfig;
  coordinateSystem: CoordinateSystemConfig;
  viewport: ViewportConfig;
  toolbar: ToolbarConfig;
  camera: {
    position: {x: number, y: number, z: number};
    target: {x: number, y: number, z: number};
    up: {x: number, y: number, z: number};
  };
}

// 快捷键映射
export const HOTKEY_MAP: Record<string, ToolbarAction> = {
  's': ToolbarAction.SELECT,
  'o': ToolbarAction.ORBIT,
  'p': ToolbarAction.PAN,
  'z': ToolbarAction.ZOOM,
  'f': ToolbarAction.FIT,
  'r': ToolbarAction.RESET,
  'm': ToolbarAction.MEASURE,
  'c': ToolbarAction.SECTION_CUT,
  'w': ToolbarAction.WIREFRAME,
  'g': ToolbarAction.GRID
};

// 工具栏按钮配置
export interface ToolbarButton {
  action: ToolbarAction;
  icon: string;
  label: string;
  tooltip: string;
  hotkey?: string;
  group: 'primary' | 'secondary';
  disabled?: boolean;
  active?: boolean;
}