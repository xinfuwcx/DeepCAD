// This import was for type-checking during development.
// We are confident the TS interfaces now match the Pydantic models.
// import { AnalysisResult } from '../../../../backend/api/routes/analysis_router';

/**
 * =================================================================================================
 * 全新的、与后端 `analysis_router.py` 完全匹配的参数化场景数据结构。
 * This is the TypeScript representation of our backend's `ParametricScene` Pydantic model.
 * =================================================================================================
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

// --- 特征基础接口 ---
export interface BaseFeature {
  id: string;
  name: string;
  parentId?: string;
}

// --- 几何特征 ---
export interface CreateBoxParameters {
  width: number;
  height: number;
  depth: number;
  position: Point3D;
}

export interface CreateBoxFeature extends BaseFeature {
  type: 'CreateBox';
  parameters: CreateBoxParameters;
}

// --- 地形特征 ---
export interface CreateTerrainParameters {
  points: Point3D[];
  depth: number;
}

export interface CreateTerrainFeature extends BaseFeature {
  type: 'CreateTerrain';
  parameters: CreateTerrainParameters;
}

// --- 隧道特征 ---
export interface CreateTunnelParameters {
  pathPoints: Point3D[];
  width: number;
  height: number;
}

export interface CreateTunnelFeature extends BaseFeature {
  type: 'CreateTunnel';
  parameters: CreateTunnelParameters;
}

// --- 建筑物特征 ---
export interface CreateBuildingParameters {
  width: number;
  height: number;
  depth: number;
  position: Point3D;
}

export interface CreateBuildingFeature extends BaseFeature {
  type: 'CreateBuilding';
  parameters: CreateBuildingParameters;
}

// --- 基坑特征 ---
export interface CreateExcavationParameters {
  points: Point2D[];
  depth: number;
}

export type CreateExcavationFeature = BaseFeature & {
  type: 'CreateExcavation';
  parentId?: string; // Should be optional
  parameters: CreateExcavationParameters;
};

export type CreateExcavationFromDXFParameters = {
  // ... existing parameters ...
};

export type CreateExcavationFromDXFFeature = BaseFeature & {
  type: 'CreateExcavationFromDXF';
  parameters: CreateExcavationFromDXFParameters;
};

// --- 排桩特征 ---
export interface CreatePileRaftParameters {
  // --- 几何参数 ---
  path: [Point3D, Point3D]; // Start and end points of the pile raft
  pileDiameter: number;
  pileSpacing: number;
  pileLength: number;
  capBeamWidth: number;
  capBeamHeight: number;

  // --- 分析参数 ---
  pileAnalysisModel: 'beam' | 'solid';
  capBeamAnalysisModel: 'beam' | 'solid';
}

export interface CreatePileRaftFeature extends BaseFeature {
  type: 'CreatePileRaft';
  parameters: CreatePileRaftParameters;
}

// --- 地连墙特征 ---
export interface CreateDiaphragmWallParameters {
  // --- 几何参数 ---
  path: [Point3D, Point3D]; // Start and end points of the wall
  thickness: number;
  height: number;

  // --- 分析参数 ---
  analysisModel: 'shell' | 'solid';
}

export interface CreateDiaphragmWallFeature extends BaseFeature {
  type: 'CreateDiaphragmWall';
  parameters: CreateDiaphragmWallParameters;
}

// --- 预应力锚杆系统特征 ---
export interface CreateAnchorSystemParameters {
  // Attachment
  parentId: string; // The ID of the wall to attach to
  
  // Layout
  rowCount: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  startHeight: number; // Y-coordinate of the first row

  // Anchor properties (Geometry)
  anchorLength: number;
  angle: number; // Angle in degrees, downwards from horizontal
  prestress: number; // in kN

  // Waler (腰梁) properties (Geometry)
  walerWidth: number;
  walerHeight: number;

  // --- 分析参数 ---
  anchorAnalysisModel: 'beam' | 'truss'; // 锚杆通常是梁或桁架单元
  walerAnalysisModel: 'beam' | 'solid'; // 腰梁是梁单元
}

export interface CreateAnchorSystemFeature extends BaseFeature {
  type: 'CreateAnchorSystem';
  parameters: CreateAnchorSystemParameters;
}

// --- 2D 草图特征 ---
export interface CreateSketchParameters {
  plane: 'XY' | 'XZ' | 'YZ';
  plane_offset: number;
  points: Point2D[];
}

export interface CreateSketchFeature extends BaseFeature {
  type: 'CreateSketch';
  parameters: CreateSketchParameters;
}

// --- 从草图拉伸的特征 ---
export interface ExtrudeParameters {
  depth: number;
}

export interface ExtrudeFeature extends BaseFeature {
  type: 'Extrude';
  parentId: string; // Must reference a sketch
  parameters: ExtrudeParameters;
}

// --- 高级分析特征 ---
export interface AddInfiniteDomainParameters {
  thickness: number;
}

export interface AddInfiniteDomainFeature extends BaseFeature {
  type: 'AddInfiniteDomain';
  parentId: string; // Must reference a 3D body
  parameters: AddInfiniteDomainParameters;
}

// --- 分析特征 ---
export interface AssignGroupParameters {
  group_name: string;
  entity_type: 'face' | 'volume';
  // 前端在选择时, 会获取到几何实体的唯一标识(tag)
  entity_tags: number[];
}

export interface AssignGroupFeature extends BaseFeature {
  type: 'AssignGroup';
  parameters: AssignGroupParameters;
}


// --- 新增: 地质模型特征 ---
export interface CreateGeologicalModelParameters {
  csvData: string; // The raw CSV string content
}

export type CreateGeologicalModelFeature = BaseFeature & {
  type: 'CreateGeologicalModel';
  parameters: CreateGeologicalModelParameters;
};


// --- 特征联合类型 ---
export type AnyFeature = 
  | CreateBoxFeature 
  | CreateTerrainFeature
  | CreateTunnelFeature
  | CreateBuildingFeature
  | CreateExcavationFeature
  | CreateExcavationFromDXFFeature
  | CreatePileRaftFeature
  | CreateDiaphragmWallFeature
  | CreateAnchorSystemFeature
  | CreateSketchFeature
  | ExtrudeFeature
  | AddInfiniteDomainFeature
  | AssignGroupFeature
  | CreateGeologicalModelFeature;


// --- 场景顶层接口 ---
export interface ParametricScene {
  version: "2.0-parametric";
  features: AnyFeature[];
}

/**
 * 分析结果的数据结构，与后端 `AnalysisResult` Pydantic 模型匹配
 */
export interface AnalysisResult {
    status: string;
    message: string;
    mesh_statistics: Record<string, any>;
    mesh_filename?: string;
}

/**
 * 调用后端参数化分析API
 * @param scene - 包含完整特征历史的参数化场景对象
 * @returns - 分析结果
 */
export const runParametricAnalysis = async (scene: ParametricScene): Promise<AnalysisResult> => {
  const response = await fetch('/api/analysis/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scene),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Analysis failed');
  }

  return response.json();
};

/**
 * 从后端获取分析结果文件 (例如 .vtk)
 * @param filename - The name of the result file to fetch.
 * @returns A blob containing the file data.
 */
export const getAnalysisResultFile = async (filename: string): Promise<Blob> => {
    const response = await fetch(`/api/analysis/results/${filename}`);
    if (!response.ok) {
        throw new Error(`Could not fetch result file: ${filename}`);
    }
    return response.blob();
}; 