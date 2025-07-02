import * as THREE from 'three';
import { SoilParameters, ExcavationParameters } from '../pages/MainPage';
import { getInterpolatedY } from '../components/shared/interpolation';

/**
 * 根据土壤参数创建一个三维的土体网格模型
 * @param params - 土壤参数，包括地表点和厚度
 * @returns - 代表土体的 THREE.Mesh 对象
 */
export function createSoilMesh(params: SoilParameters): THREE.Mesh {
  const { surfacePoints, thickness } = params;
  
  const topShape = new THREE.Shape(surfacePoints.map(p => new THREE.Vector2(p.x, p.z)));
  const extrudeSettings = { depth: thickness, bevelEnabled: false };
  const geometry = new THREE.ExtrudeGeometry(topShape, extrudeSettings);
  
  const positions = geometry.attributes.position;
  const originalPositions = surfacePoints.map(p => new THREE.Vector2(p.x, p.z));
  
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    if (y > 0) { // 顶面
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const interpolatedY = getInterpolatedY(new THREE.Vector2(x,z), originalPositions, surfacePoints.map(p=>p.y));
      positions.setY(i, interpolatedY);
    } else { // 底面
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const interpolatedY = getInterpolatedY(new THREE.Vector2(x,z), originalPositions, surfacePoints.map(p=>p.y));
      positions.setY(i, interpolatedY - thickness);
    }
  }
  geometry.computeVertexNormals();

  const material = new THREE.MeshPhongMaterial({ color: 0xA0522D, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

/**
 * 根据DXF数据和开挖参数，创建一个用于布尔运算的"冲头"模型
 * @param params - 开挖参数，包括DXF数据和深度
 * @param soilParams - 土壤参数，用于对齐
 * @returns - 代表开挖区域的 THREE.Mesh 对象, 或在无法创建时返回 null
 */
export function createExcavationPunch(params: ExcavationParameters, soilParams: SoilParameters): THREE.Mesh | null {
  const { dxf, depth } = params;
  if (!dxf || !dxf.entities) return null;

  const polyline = dxf.entities.find((e:any) => e.type === 'LWPOLYLINE');
  if (!polyline) return null;

  const points = polyline.vertices.map((v: any) => new THREE.Vector2(v.x, v.y));
  const shape = new THREE.Shape(points);

  const soilCenter = new THREE.Vector2();
  soilParams.surfacePoints.forEach(p => soilCenter.add(new THREE.Vector2(p.x, p.z)));
  soilCenter.divideScalar(soilParams.surfacePoints.length);

  const shapeCenter = new THREE.Vector2();
  const shapePointsForCenter = shape.getPoints();
  shapePointsForCenter.forEach(p => shapeCenter.add(p));
  shapeCenter.divideScalar(shapePointsForCenter.length);
  
  const offset = soilCenter.sub(shapeCenter);
  shape.getPoints().forEach(p => p.add(offset));

  const highestPoint = Math.max(...soilParams.surfacePoints.map(p => p.y));
  const extrudeSettings = { depth: depth + 5, bevelEnabled: false };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.translate(0, 0, -highestPoint - 2); 
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
} 