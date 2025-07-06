import * as THREE from 'three';
import { BufferGeometryUtils } from 'three-addons';
import { AnyFeature } from '../services/parametricAnalysisService';
import { GemPyInspiredColorSystem } from './gempyInspiredColorSystem';

/**
 * @file Replay engine for parametric features. (Client-side stub)
 * @author GeoStruct-5 Team
 * @date 2025-07-06
 * @description This is a client-side stub. The actual geometry generation
 *              is handled by the backend replay engine (e.g., in v5_runner.py).
 *              This function exists to provide a basic scene structure and
 *              to avoid breaking the viewport rendering logic which expects
 *              a parametric model object.
 */

/**
 * Create geological surfaces with elevation data from CSV
 * Based on GemPy's surface visualization approach with proper 3D terrain
 * Performance-optimized with geometry merging.
 */
function createGeologicalSurfaces(feature: AnyFeature): THREE.Group | null {
  if (feature.type !== 'CreateGeologicalModel') return null;
  
  console.log('🏔️ 开始创建地质表面（高性能合并模式），特征信息:', {
    id: feature.id,
    name: feature.name,
    type: feature.type,
  });
  
  const { csvData, terrainParams, layerInfo } = feature.parameters;
  
  if (!csvData || !layerInfo || layerInfo.length === 0) {
    console.error('❌ 缺少必要数据:', { csvData: !!csvData, layerInfo: !!layerInfo });
    return null;
  }

  const group = new THREE.Group();
  group.name = 'GeologicalVolumes_Merged';

  try {
    // 解析CSV数据
    const lines = csvData.split('\n').filter(line => line.trim());
    console.log(`📊 CSV数据行数: ${lines.length}`);
    
    if (lines.length < 2) {
      console.error('❌ CSV数据行数不足');
      // 返回一个简单的占位符，避免场景为空
      const placeholderGeometry = new THREE.BoxGeometry(10, 10, 10);
      const placeholderMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
      const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
      placeholder.name = "CSV_Data_Error_Placeholder";
      group.add(placeholder);
      return group;
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    console.log(`📋 CSV列头: ${headers.join(', ')}`);
    
    // 检查必要的列是否存在
    if (!headers.includes('X') || !headers.includes('Y') || !headers.includes('Z') || !headers.includes('surface')) {
      console.error('❌ CSV缺少必要的列 (X, Y, Z, surface)');
      throw new Error('CSV格式错误: 缺少必要的列');
    }
    
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const point: any = {};
      headers.forEach((header, index) => {
        if (index < values.length) {
          point[header] = (header === 'X' || header === 'Y' || header === 'Z') 
            ? parseFloat(values[index]) 
            : values[index];
        } else {
          console.warn(`⚠️ 行数据缺少列 "${header}"`);
          point[header] = (header === 'X' || header === 'Y' || header === 'Z') ? 0 : '';
        }
      });
      return point;
    });
    
    console.log(`📊 解析后数据点数量: ${data.length}`);

    // 按地层分组数据
    const surfaceGroups: { [key: string]: any[] } = {};
    data.forEach(point => {
      const surface = point.surface || point.description;
      if (surface) {
        if (!surfaceGroups[surface]) surfaceGroups[surface] = [];
        surfaceGroups[surface].push(point);
      }
    });
    
    const surfaceNames = Object.keys(surfaceGroups);
    console.log(`🌍 识别到的地层: ${surfaceNames.join(', ')}`);
    console.log(`🌍 各地层点数: ${surfaceNames.map(s => `${s}(${surfaceGroups[s].length})`).join(', ')}`);

    // 计算域边界
    const xValues = data.map(p => p.X).filter(x => !isNaN(x));
    const yValues = data.map(p => p.Y).filter(y => !isNaN(y));
    const zValues = data.map(p => p.Z).filter(z => !isNaN(z));
    
    if (xValues.length === 0 || yValues.length === 0 || zValues.length === 0) {
      console.error('❌ 无效的坐标数据');
      throw new Error('无效的坐标数据');
    }
    
    const bounds = {
      minX: Math.min(...xValues), maxX: Math.max(...xValues),
      minY: Math.min(...yValues), maxY: Math.max(...yValues),
      minZ: Math.min(...zValues), maxZ: Math.max(...zValues)
    };
    
    console.log(`📏 计算域边界: X(${bounds.minX.toFixed(1)}-${bounds.maxX.toFixed(1)}), Y(${bounds.minY.toFixed(1)}-${bounds.maxY.toFixed(1)}), Z(${bounds.minZ.toFixed(1)}-${bounds.maxZ.toFixed(1)})`);

    // 按深度对地层排序
    const sortedSurfaces = Object.entries(surfaceGroups)
      .map(([name, points]) => ({
        name,
        points,
        avgZ: points.reduce((sum, p) => sum + p.Z, 0) / points.length
      }))
      .sort((a, b) => b.avgZ - a.avgZ);
    
    console.log(`🔄 排序后的地层: ${sortedSurfaces.map(s => `${s.name}(${s.avgZ.toFixed(1)})`).join(', ')}`);

    const allGeometries: THREE.BufferGeometry[] = [];

    // 创建地层间的三维体积
    for (let i = 0; i < sortedSurfaces.length; i++) {
      const currentLayer = sortedSurfaces[i];
      const nextLayer = sortedSurfaces[i + 1];
      
      const gempyColors = GemPyInspiredColorSystem.getDepthBasedColors();
      const surfaceNames = Object.keys(gempyColors);
      const colorKey = surfaceNames[i % surfaceNames.length];
      const colorHex = gempyColors[colorKey];
      const color = new THREE.Color(colorHex);

      try {
        const layerGeometries = createLayerVolumeGeometry(
          currentLayer, 
          nextLayer, 
          bounds, 
          color, 
          i
        );
        
        if (layerGeometries.length > 0) {
          allGeometries.push(...layerGeometries);
          console.log(`✅ 地层 ${currentLayer.name} 几何体创建成功，生成 ${layerGeometries.length} 个几何体`);
        } else {
          console.warn(`⚠️ 地层 ${currentLayer.name} 未生成几何体`);
        }
      } catch (error) {
        console.error(`❌ 创建地层 ${currentLayer.name} 几何体失败:`, error);
      }
    }

    if (allGeometries.length > 0) {
      try {
        console.log(`🔄 合并 ${allGeometries.length} 个几何体...`);
        const mergedGeometry = BufferGeometryUtils.mergeGeometries(allGeometries, false);
        
        if (mergedGeometry) {
          mergedGeometry.computeBoundingSphere();
          mergedGeometry.computeBoundingBox();

          const material = new THREE.MeshLambertMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
          });

          const finalMesh = new THREE.Mesh(mergedGeometry, material);
          finalMesh.name = "MergedGeologicalModel";
          finalMesh.castShadow = true;
          finalMesh.receiveShadow = true;
          group.add(finalMesh);
          console.log(`✅ 合并几何体成功，顶点数: ${mergedGeometry.attributes.position.count}`);
        } else {
          console.error('❌ 几何体合并失败');
          throw new Error('几何体合并失败');
        }
      } catch (error) {
        console.error('❌ 合并几何体时出错:', error);
        
        // 如果合并失败，尝试单独添加每个几何体
        console.log('🔄 尝试单独添加每个几何体...');
        allGeometries.forEach((geo, index) => {
          const material = new THREE.MeshLambertMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
          });
          const mesh = new THREE.Mesh(geo, material);
          mesh.name = `GeologicalLayer_${index}`;
          group.add(mesh);
        });
      }
    } else {
      console.error('❌ 未生成任何几何体');
      throw new Error('未生成任何几何体');
    }

    // 添加计算域边界框和坐标轴
    const boundingBox = createDomainBoundingBox(bounds);
    group.add(boundingBox);
    const axes = createCoordinateAxes(bounds);
    group.add(axes);

    console.log(`✅ 地质模型创建完成: 总共 ${group.children.length} 个对象`);
  } catch (error) {
    console.error('❌ 创建地质表面时发生错误:', error);
    
    // 添加一个错误指示器，避免场景为空
    const errorGeometry = new THREE.SphereGeometry(20, 16, 16);
    const errorMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const errorIndicator = new THREE.Mesh(errorGeometry, errorMaterial);
    errorIndicator.name = "Error_Indicator";
    group.add(errorIndicator);
    
    // 添加一个简单的边界框
    const simpleBounds = {
      minX: 0, maxX: 100,
      minY: 0, maxY: 100,
      minZ: 0, maxZ: 50
    };
    const simpleBoundingBox = createDomainBoundingBox(simpleBounds);
    group.add(simpleBoundingBox);
  }
  
  return group;
}

function createLayerVolumeGeometry(
  topLayer: any, 
  bottomLayer: any | null, 
  bounds: any, 
  color: THREE.Color, 
  layerIndex: number
): THREE.BufferGeometry[] {
  
  const geometries: THREE.BufferGeometry[] = [];
  const gridResolution = 20;

  const interpolateZ = (x: number, y: number, points: any[]): number => {
    let weightedSum = 0;
    let weightSum = 0;
    const power = 2;
    for (const point of points) {
      const distance = Math.sqrt(Math.pow(x - point.X, 2) + Math.pow(y - point.Y, 2));
      if (distance < 0.001) return point.Z;
      const weight = 1 / Math.pow(distance, power);
      weightedSum += point.Z * weight;
      weightSum += weight;
    }
    return weightSum > 0 ? weightedSum / weightSum : points[0].Z;
  };

  const topSurface = createSurfaceMesh(topLayer.points, bounds, gridResolution, interpolateZ, true);
  const bottomSurface = bottomLayer 
    ? createSurfaceMesh(bottomLayer.points, bounds, gridResolution, interpolateZ, false)
    : createFlatSurface(bounds, gridResolution, bounds.minZ - 5);

  if (!topSurface || !bottomSurface) return [];

  // Assign vertex colors
  assignVertexColors(topSurface, color);
  assignVertexColors(bottomSurface, new THREE.Color(color).multiplyScalar(0.8));
  geometries.push(topSurface, bottomSurface);
  
  const sideWalls = createSideWalls(topSurface, bottomSurface, bounds, gridResolution);
  sideWalls.forEach(wall => {
    assignVertexColors(wall, new THREE.Color(color).multiplyScalar(0.9));
    geometries.push(wall);
  });
  
  return geometries;
}

function assignVertexColors(geometry: THREE.BufferGeometry, color: THREE.Color) {
  const positionAttribute = geometry.getAttribute('position');
  const colors = [];
  for (let i = 0; i < positionAttribute.count; i++) {
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

/**
 * 创建表面网格
 */
function createSurfaceMesh(
  points: any[], 
  bounds: any, 
  gridResolution: number, 
  interpolateZ: Function,
  isTop: boolean
): THREE.BufferGeometry | null {
  
  const vertices: number[] = [];
  const indices: number[] = [];
  
  const stepX = (bounds.maxX - bounds.minX) / gridResolution;
  const stepY = (bounds.maxY - bounds.minY) / gridResolution;

  // 生成网格顶点
  for (let i = 0; i <= gridResolution; i++) {
    for (let j = 0; j <= gridResolution; j++) {
      const x = bounds.minX + i * stepX;
      const y = bounds.minY + j * stepY;
      let z = interpolateZ(x, y, points);
      
      // 大幅增强起伏效果
      const heightMultiplier = 3.0; // 从1.5增加到3.0
      const avgZ = points.reduce((sum, p) => sum + p.Z, 0) / points.length;
      z = avgZ + (z - avgZ) * heightMultiplier;
      
      // 添加随机变化模拟地质不规则性
      const randomVariation = (Math.random() - 0.5) * 2.0; // ±1米随机变化
      z += randomVariation;
      
      vertices.push(x, y, z);
    }
  }

  // 生成三角形索引
  for (let i = 0; i < gridResolution; i++) {
    for (let j = 0; j < gridResolution; j++) {
      const a = i * (gridResolution + 1) + j;
      const b = a + 1;
      const c = a + (gridResolution + 1);
      const d = c + 1;

      if (isTop) {
        // 顶面：法向量向上
        indices.push(a, b, c);
        indices.push(b, d, c);
      } else {
        // 底面：法向量向下
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * 创建平面表面（用于最底层）
 */
function createFlatSurface(bounds: any, gridResolution: number, z: number): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  
  const stepX = (bounds.maxX - bounds.minX) / gridResolution;
  const stepY = (bounds.maxY - bounds.minY) / gridResolution;

  // 生成平面顶点
  for (let i = 0; i <= gridResolution; i++) {
    for (let j = 0; j <= gridResolution; j++) {
      const x = bounds.minX + i * stepX;
      const y = bounds.minY + j * stepY;
      vertices.push(x, y, z);
    }
  }

  // 生成三角形索引
  for (let i = 0; i < gridResolution; i++) {
    for (let j = 0; j < gridResolution; j++) {
      const a = i * (gridResolution + 1) + j;
      const b = a + 1;
      const c = a + (gridResolution + 1);
      const d = c + 1;

      // 底面：法向量向下
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * 创建侧壁连接顶面和底面
 */
function createSideWalls(
  topGeometry: THREE.BufferGeometry, 
  bottomGeometry: THREE.BufferGeometry, 
  bounds: any, 
  gridResolution: number
): THREE.BufferGeometry[] {
  
  const walls: THREE.BufferGeometry[] = [];
  
  // 获取顶点数据
  const topVertices = topGeometry.getAttribute('position').array as Float32Array;
  const bottomVertices = bottomGeometry.getAttribute('position').array as Float32Array;
  
  // 创建四个侧壁：前、后、左、右
  const sides = [
    { name: 'front', indices: [] as number[] },
    { name: 'back', indices: [] as number[] },
    { name: 'left', indices: [] as number[] },
    { name: 'right', indices: [] as number[] }
  ];
  
  // 前壁 (j = 0)
  for (let i = 0; i < gridResolution; i++) {
    const topLeft = i * (gridResolution + 1);
    const topRight = (i + 1) * (gridResolution + 1);
    sides[0].indices.push(topLeft, topRight);
  }
  
  // 后壁 (j = gridResolution)
  for (let i = 0; i < gridResolution; i++) {
    const topLeft = i * (gridResolution + 1) + gridResolution;
    const topRight = (i + 1) * (gridResolution + 1) + gridResolution;
    sides[1].indices.push(topLeft, topRight);
  }
  
  // 左壁 (i = 0)
  for (let j = 0; j < gridResolution; j++) {
    sides[2].indices.push(j, j + 1);
  }
  
  // 右壁 (i = gridResolution)
  for (let j = 0; j < gridResolution; j++) {
    const base = gridResolution * (gridResolution + 1);
    sides[3].indices.push(base + j, base + j + 1);
  }
  
  // 为每个侧壁创建几何体
  sides.forEach(side => {
    if (side.indices.length >= 4) {
      const wallGeometry = createWallGeometry(
        topVertices, 
        bottomVertices, 
        side.indices
      );
      if (wallGeometry) {
        walls.push(wallGeometry);
      }
    }
  });
  
  return walls;
}

/**
 * 创建单个侧壁几何体
 */
function createWallGeometry(
  topVertices: Float32Array, 
  bottomVertices: Float32Array, 
  edgeIndices: number[]
): THREE.BufferGeometry | null {
  
  if (edgeIndices.length < 4) return null;
  
  const vertices: number[] = [];
  const indices: number[] = [];
  
  // 添加顶边和底边的顶点
  for (let i = 0; i < edgeIndices.length; i++) {
    const idx = edgeIndices[i];
    
    // 顶边顶点
    vertices.push(
      topVertices[idx * 3],
      topVertices[idx * 3 + 1],
      topVertices[idx * 3 + 2]
    );
    
    // 底边顶点
    vertices.push(
      bottomVertices[idx * 3],
      bottomVertices[idx * 3 + 1],
      bottomVertices[idx * 3 + 2]
    );
  }
  
  // 生成侧壁三角形
  for (let i = 0; i < edgeIndices.length - 1; i++) {
    const topLeft = i * 2;
    const bottomLeft = i * 2 + 1;
    const topRight = (i + 1) * 2;
    const bottomRight = (i + 1) * 2 + 1;
    
    // 两个三角形组成一个四边形
    indices.push(topLeft, bottomLeft, topRight);
    indices.push(topRight, bottomLeft, bottomRight);
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}

/**
 * 创建计算域边界框
 */
function createDomainBoundingBox(bounds: any): THREE.Group {
  const group = new THREE.Group();
  
  // 计算尺寸
  const width = bounds.maxX - bounds.minX;
  const length = bounds.maxY - bounds.minY;
  const height = bounds.maxZ - bounds.minZ;
  
  console.log(`创建边界框: ${width.toFixed(1)}×${length.toFixed(1)}×${height.toFixed(1)}m`);
  console.log(`边界范围: X(${bounds.minX.toFixed(1)}-${bounds.maxX.toFixed(1)}), Y(${bounds.minY.toFixed(1)}-${bounds.maxY.toFixed(1)}), Z(${bounds.minZ.toFixed(1)}-${bounds.maxZ.toFixed(1)})`);
  
  // 创建边界框几何体
  const geometry = new THREE.BoxGeometry(width, length, height);
  const edges = new THREE.EdgesGeometry(geometry);
  
  // 使用更明显的颜色和线宽
  const material = new THREE.LineBasicMaterial({ 
    color: 0x00ff88, // 青绿色，更明显
    linewidth: 2,
    transparent: true,
    opacity: 0.9
  });
  const wireframe = new THREE.LineSegments(edges, material);
  
  // 设置位置到边界框中心
  const centerX = (bounds.maxX + bounds.minX) / 2;
  const centerY = (bounds.maxY + bounds.minY) / 2;
  const centerZ = (bounds.maxZ + bounds.minZ) / 2;
  
  wireframe.position.set(centerX, centerY, centerZ);
  wireframe.name = 'DomainBoundary';
  group.add(wireframe);
  
  // 添加角点标记 - 使用更小更明显的标记
  const cornerGeometry = new THREE.SphereGeometry(Math.min(width, length, height) * 0.01, 8, 8);
  const cornerMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444 });
  
  const corners = [
    [bounds.minX, bounds.minY, bounds.minZ], // 左下后
    [bounds.maxX, bounds.minY, bounds.minZ], // 右下后
    [bounds.minX, bounds.maxY, bounds.minZ], // 左上后
    [bounds.maxX, bounds.maxY, bounds.minZ], // 右上后
    [bounds.minX, bounds.minY, bounds.maxZ], // 左下前
    [bounds.maxX, bounds.minY, bounds.maxZ], // 右下前
    [bounds.minX, bounds.maxY, bounds.maxZ], // 左上前
    [bounds.maxX, bounds.maxY, bounds.maxZ]  // 右上前
  ];
  
  corners.forEach((corner, index) => {
    const sphere = new THREE.Mesh(cornerGeometry, cornerMaterial);
    sphere.position.set(corner[0], corner[1], corner[2]);
    sphere.name = `Corner_${index}`;
    group.add(sphere);
  });
  
  // 添加尺寸标注线
  const labelMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
  
  // X方向尺寸线 (底部)
  const xDimLine = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(bounds.minX, bounds.minY, bounds.minZ),
    new THREE.Vector3(bounds.maxX, bounds.minY, bounds.minZ)
  ]);
  const xLine = new THREE.Line(xDimLine, labelMaterial);
  xLine.name = 'X-Dimension';
  group.add(xLine);
  
  // Y方向尺寸线 (底部)
  const yDimLine = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(bounds.minX, bounds.minY, bounds.minZ),
    new THREE.Vector3(bounds.minX, bounds.maxY, bounds.minZ)
  ]);
  const yLine = new THREE.Line(yDimLine, labelMaterial);
  yLine.name = 'Y-Dimension';
  group.add(yLine);
  
  // Z方向尺寸线 (左侧)
  const zDimLine = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(bounds.minX, bounds.minY, bounds.minZ),
    new THREE.Vector3(bounds.minX, bounds.minY, bounds.maxZ)
  ]);
  const zLine = new THREE.Line(zDimLine, labelMaterial);
  zLine.name = 'Z-Dimension';
  group.add(zLine);
  
  group.name = 'DomainBoundingBox';
  return group;
}

/**
 * 创建坐标轴 - 修正坐标系
 */
function createCoordinateAxes(bounds: any): THREE.Group {
  const group = new THREE.Group();
  
  // 计算合适的轴长度 - 基于数据范围
  const axisLength = Math.min(
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY,
    bounds.maxZ - bounds.minZ
  ) * 0.3; // 使用较小的系数避免轴太长

  // 起点设置在数据范围的最小角落
  const origin = new THREE.Vector3(bounds.minX, bounds.minY, bounds.minZ);
  
  console.log(`坐标轴设置: 原点=(${origin.x.toFixed(1)}, ${origin.y.toFixed(1)}, ${origin.z.toFixed(1)}), 长度=${axisLength.toFixed(1)}m`);

  // X轴 - 红色 (东向) 
  const xGeometry = new THREE.BufferGeometry().setFromPoints([
    origin,
    new THREE.Vector3(origin.x + axisLength, origin.y, origin.z)
  ]);
  const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 4 });
  const xAxis = new THREE.Line(xGeometry, xMaterial);
  xAxis.name = 'X-Axis-East';
  group.add(xAxis);

  // Y轴 - 绿色 (北向)
  const yGeometry = new THREE.BufferGeometry().setFromPoints([
    origin,
    new THREE.Vector3(origin.x, origin.y + axisLength, origin.z)
  ]);
  const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 4 });
  const yAxis = new THREE.Line(yGeometry, yMaterial);
  yAxis.name = 'Y-Axis-North';
  group.add(yAxis);

  // Z轴 - 蓝色 (向上)
  const zGeometry = new THREE.BufferGeometry().setFromPoints([
    origin,
    new THREE.Vector3(origin.x, origin.y, origin.z + axisLength)
  ]);
  const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 4 });
  const zAxis = new THREE.Line(zGeometry, zMaterial);
  zAxis.name = 'Z-Axis-Up';
  group.add(zAxis);

  // 添加轴标签（使用小球体标记轴端点）
  const sphereGeometry = new THREE.SphereGeometry(axisLength * 0.05, 8, 8);
  
  // X轴端点 - 红色球
  const xSphere = new THREE.Mesh(sphereGeometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
  xSphere.position.set(origin.x + axisLength, origin.y, origin.z);
  xSphere.name = 'X-Label';
  group.add(xSphere);
  
  // Y轴端点 - 绿色球
  const ySphere = new THREE.Mesh(sphereGeometry, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
  ySphere.position.set(origin.x, origin.y + axisLength, origin.z);
  ySphere.name = 'Y-Label';
  group.add(ySphere);
  
  // Z轴端点 - 蓝色球
  const zSphere = new THREE.Mesh(sphereGeometry, new THREE.MeshBasicMaterial({ color: 0x0000ff }));
  zSphere.position.set(origin.x, origin.y, origin.z + axisLength);
  zSphere.name = 'Z-Label';
  group.add(zSphere);

  group.name = 'CoordinateAxes';
  return group;
}

/**
 * 创建地质剖面线
 */
function createCrossSections(sortedSurfaces: any[], bounds: any): THREE.Line[] {
  const sections: THREE.Line[] = [];
  
  try {
    // 创建X方向剖面线
    const midY = (bounds.maxY + bounds.minY) / 2;
    const xSectionPoints: THREE.Vector3[] = [];
    
    for (let i = 0; i < sortedSurfaces.length; i++) {
      const surface = sortedSurfaces[i];
      const avgZ = surface.avgZ;
      
      xSectionPoints.push(
        new THREE.Vector3(bounds.minX, midY, avgZ),
        new THREE.Vector3(bounds.maxX, midY, avgZ)
      );
    }
    
    if (xSectionPoints.length > 0) {
      const xSectionGeometry = new THREE.BufferGeometry().setFromPoints(xSectionPoints);
      const xSectionMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.6
      });
      const xSection = new THREE.LineSegments(xSectionGeometry, xSectionMaterial);
      xSection.name = 'CrossSection_X';
      sections.push(xSection);
    }
    
  } catch (error) {
    console.warn('创建剖面线失败:', error);
  }

  return sections;
}

/**
 * Client-side replay engine (stub)
 * Creates realistic 3D visualization from parametric features
 */
export function replayFeatures(features: AnyFeature[]): THREE.Group {
  console.log('Client-side replayFeatures - 创建真实3D地质模型');
  console.log('输入特征数量:', features.length);
  
  const group = new THREE.Group();
  group.name = 'ParametricModel';

  features.forEach((feature, index) => {
    console.log(`处理特征 ${index + 1}/${features.length}: ${feature.type}`);
    let featureGroup: THREE.Group | null = null;

    switch (feature.type) {
      case 'CreateGeologicalModel':
        featureGroup = createGeologicalSurfaces(feature);
        if (featureGroup) {
          console.log('✅ 成功创建地质模型3D表面，子对象数量:', featureGroup.children.length);
          
          // 计算模型边界框
          const box = new THREE.Box3().setFromObject(featureGroup);
          console.log('📦 地质模型边界框:', {
            min: { x: box.min.x, y: box.min.y, z: box.min.z },
            max: { x: box.max.x, y: box.max.y, z: box.max.z },
            size: { 
              width: box.max.x - box.min.x, 
              length: box.max.y - box.min.y, 
              height: box.max.z - box.min.z 
            }
          });
        } else {
          console.warn('❌ 地质模型创建失败');
        }
        break;
      
      default:
        console.log(`创建默认预览: ${feature.type}`);
        // 其他特征类型的基本预览
        featureGroup = new THREE.Group();
        featureGroup.name = `Feature_${feature.type}_${index}`;
        
        // 添加一个简单的占位符
        const geometry = new THREE.BoxGeometry(10, 10, 10);
        const material = new THREE.MeshBasicMaterial({ 
          color: 0x888888, 
          wireframe: true 
        });
        const placeholder = new THREE.Mesh(geometry, material);
        featureGroup.add(placeholder);
        break;
    }

    if (featureGroup) {
      group.add(featureGroup);
      console.log(`✅ 特征 ${feature.type} 已添加到场景`);
    } else {
      console.warn(`❌ 特征 ${feature.type} 创建失败`);
    }
  });

  // 计算整个场景的边界框
  if (group.children.length > 0) {
    const sceneBox = new THREE.Box3().setFromObject(group);
    console.log('🌍 整个场景边界框:', {
      min: { x: sceneBox.min.x, y: sceneBox.min.y, z: sceneBox.min.z },
      max: { x: sceneBox.max.x, y: sceneBox.max.y, z: sceneBox.max.z },
      center: {
        x: (sceneBox.max.x + sceneBox.min.x) / 2,
        y: (sceneBox.max.y + sceneBox.min.y) / 2,
        z: (sceneBox.max.z + sceneBox.min.z) / 2
      }
    });
  } else {
    console.warn('⚠️ 场景中没有任何对象！');
  }

  return group;
} 