/**
 * 3D瓦片URL管理器
 * 提供多个可用的3D瓦片数据源
 */

export interface TilesetSource {
  id: string;
  name: string;
  url: string;
  description: string;
  type: 'cesium' | 'custom' | 'demo';
  position?: {
    x: number;
    y: number;
    z: number;
  };
}

// 可用的3D瓦片数据源
export const AVAILABLE_TILESETS: TilesetSource[] = [
  {
    id: 'cesium-discrete-lod',
    name: 'Cesium离散LOD示例',
    url: 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/tilesets/TilesetWithDiscreteLOD/tileset.json',
    description: 'Cesium官方提供的离散LOD 3D瓦片示例',
    type: 'cesium',
    position: { x: 0, y: 0, z: 0 }
  },
  {
    id: 'cesium-tree',
    name: 'Cesium树木示例',
    url: 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/tilesets/TilesetWithTreeBillboards/tileset.json',
    description: 'Cesium树木广告牌3D瓦片示例',
    type: 'cesium',
    position: { x: 0, y: 0, z: 0 }
  },
  {
    id: 'cesium-request-volume',
    name: 'Cesium请求体积示例',
    url: 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/tilesets/TilesetWithRequestVolume/tileset.json',
    description: 'Cesium请求体积3D瓦片示例',
    type: 'cesium',
    position: { x: 0, y: 0, z: 0 }
  },
  {
    id: 'local-demo',
    name: '本地演示模型',
    url: '/assets/3d-tiles/demo/tileset.json',
    description: '本地演示用的3D瓦片模型',
    type: 'demo',
    position: { x: 0, y: 0, z: 0 }
  }
];

// 获取默认的瓦片集
export const getDefaultTileset = (): TilesetSource => {
  return AVAILABLE_TILESETS[0]; // 返回第一个Cesium示例
};

// 根据ID获取瓦片集
export const getTilesetById = (id: string): TilesetSource | undefined => {
  return AVAILABLE_TILESETS.find(tileset => tileset.id === id);
};

// 获取所有Cesium示例瓦片集
export const getCesiumTilesets = (): TilesetSource[] => {
  return AVAILABLE_TILESETS.filter(tileset => tileset.type === 'cesium');
};

// 验证瓦片集URL是否可访问
export const validateTilesetUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn(`瓦片集URL验证失败: ${url}`, error);
    return false;
  }
};

// 获取可用的瓦片集（验证URL后）
export const getAvailableTilesets = async (): Promise<TilesetSource[]> => {
  const availableTilesets: TilesetSource[] = [];
  
  for (const tileset of AVAILABLE_TILESETS) {
    const isAvailable = await validateTilesetUrl(tileset.url);
    if (isAvailable) {
      availableTilesets.push(tileset);
    }
  }
  
  return availableTilesets;
};

// 深基坑项目专用瓦片集配置
export const DEEP_EXCAVATION_TILESETS: TilesetSource[] = [
  {
    id: 'shanghai-center',
    name: '上海中心深基坑项目',
    url: 'https://example.com/shanghai-center/tileset.json',
    description: '上海中心大厦深基坑工程3D模型',
    type: 'custom',
    position: { x: 0, y: 0, z: 0 }
  },
  {
    id: 'beijing-tower',
    name: '北京塔楼深基坑项目',
    url: 'https://example.com/beijing-tower/tileset.json',
    description: '北京某高层建筑深基坑工程3D模型',
    type: 'custom',
    position: { x: 100, y: 0, z: 0 }
  },
  {
    id: 'guangzhou-metro',
    name: '广州地铁深基坑项目',
    url: 'https://example.com/guangzhou-metro/tileset.json',
    description: '广州地铁站深基坑工程3D模型',
    type: 'custom',
    position: { x: -100, y: 0, z: 0 }
  }
];

// 获取深基坑项目瓦片集
export const getDeepExcavationTilesets = (): TilesetSource[] => {
  return DEEP_EXCAVATION_TILESETS;
};

// 创建瓦片集信息对象（兼容现有接口）
export const createTilesetInfo = (source: TilesetSource) => {
  return {
    id: source.id,
    name: source.name,
    url: source.url,
    loaded: false,
    position: source.position || { x: 0, y: 0, z: 0 }
  };
};
