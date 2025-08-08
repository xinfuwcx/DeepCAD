/**
 * GempyDirectService
 * 解决 GeologyModule 中缺失的 '@/services/GempyDirectService' 导入导致的编译错误。
 * 提供与后端 GemPy → Three.js 直接显示链路的轻量封装，并在后端不可用时生成降级占位几何。
 */

export interface BoreholeLayer {
  topDepth: number;
  bottomDepth: number;
  soilType?: string;
  properties?: Record<string, any>;
}

export interface BoreholeEntry {
  id?: string;
  name?: string;
  x: number;
  y: number;
  z: number; // 地表或参考高程
  depth: number;
  layers?: BoreholeLayer[];
}

export interface DomainBounds {
  x_min: number; x_max: number;
  y_min: number; y_max: number;
  z_min: number; z_max: number;
}

export interface BuildModelPayload {
  boreholes: BoreholeEntry[];
  domain: { bounds: DomainBounds; resolution: [number, number, number] };
}

export type RawThreeJsGeometry = {
  vertices: number[];
  indices: number[];
  normals?: number[];
  colors?: number[];
  formation_id?: number;
  vertex_count?: number;
  face_count?: number;
};

export type RawThreeJsData = Record<string, RawThreeJsGeometry>;

interface GempyDirectAPIResult {
  success?: boolean;
  threejs_data?: RawThreeJsData;
  model_id?: string;
  [k: string]: any;
}

function buildFallbackGeometry(): RawThreeJsData {
  // 生成一个简单盒体 + 斜层占位，保证前端可视化不至于报错
  const cubeVerts = [
    -10, -10, -10,
     10, -10, -10,
     10,  10, -10,
    -10,  10, -10,
    -10, -10,  10,
     10, -10,  10,
     10,  10,  10,
    -10,  10,  10,
  ];
  const cubeIdx = [
    0,1,2, 0,2,3,
    4,5,6, 4,6,7,
    0,1,5, 0,5,4,
    1,2,6, 1,6,5,
    2,3,7, 2,7,6,
    3,0,4, 3,4,7
  ];
  const layerVerts = [
    -10, -10, -2,
     10, -10, -4,
     10,  10, -3,
    -10,  10, -1,
  ];
  const layerIdx = [0,1,2, 0,2,3];
  return {
    base_volume: {
      vertices: cubeVerts,
      indices: cubeIdx,
      vertex_count: cubeVerts.length / 3,
      face_count: cubeIdx.length / 3,
      formation_id: 0
    },
    layer_hint: {
      vertices: layerVerts,
      indices: layerIdx,
      vertex_count: layerVerts.length / 3,
      face_count: layerIdx.length / 3,
      formation_id: 1
    }
  };
}

async function callBackend(payload: BuildModelPayload): Promise<GempyDirectAPIResult> {
  const borehole_data = payload.boreholes.map(b => ({
    x: b.x,
    y: b.y,
    z: b.z,
    formation: b.layers?.[0]?.soilType || 'default',
    properties: b.layers?.[0]?.properties || {}
  }));

  const formations: Record<string, string> = {};
  payload.boreholes.forEach(b => b.layers?.forEach(l => { if (l.soilType) formations[l.soilType] = l.soilType; }));

  const requestBody = {
    borehole_data,
    domain: payload.domain.bounds ? {
      bounds: payload.domain.bounds,
      resolution: payload.domain.resolution
    } : undefined,
    formations,
    options: {
      resolution_x: payload.domain.resolution[0],
      resolution_y: payload.domain.resolution[1]
    }
  };

  const resp = await fetch('/api/geology/gempy-direct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`GemPy Direct API 调用失败: ${resp.status} ${resp.statusText} ${txt}`);
  }

  return await resp.json();
}

export const GempyDirectService = {
  async buildModel(payload: BuildModelPayload): Promise<RawThreeJsData> {
    try {
      const result = await callBackend(payload);
      if (result?.threejs_data && Object.keys(result.threejs_data).length > 0) {
        return result.threejs_data as RawThreeJsData;
      }
      console.warn('⚠️ 后端未返回 threejs_data，使用占位几何');
      return buildFallbackGeometry();
    } catch (err) {
      console.error('❌ GempyDirectService.buildModel 后端调用失败，返回占位几何:', err);
      return buildFallbackGeometry();
    }
  }
};

export default GempyDirectService;
