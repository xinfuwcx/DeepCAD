import * as THREE from 'three';

/**
 * Creates a text label as a Sprite.
 * @param text The text to display.
 * @param color The color of the text.
 * @param size The size of the canvas texture.
 * @returns A THREE.Sprite object.
 */
function createAxisLabel(text: string, color: string, size: number = 64): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context from canvas');

    canvas.width = size;
    canvas.height = size;

    context.font = `Bold ${size * 0.5}px Arial`;
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.5, 0.5, 0.5); // Adjust scale to fit the gizmo size

    return sprite;
}

/**
 * 创建ABAQUS风格的坐标轴指示器
 * @returns {THREE.Object3D} 坐标轴指示器对象
 */
export function createAxesGizmo(): THREE.Object3D {
  // 创建一个组来容纳所有坐标轴元素
  const axesGroup = new THREE.Group();
  axesGroup.name = 'AxesGizmo';
  
  // 坐标轴长度
  const axisLength = 1.0;
  const headLength = 0.2; // 箭头头部长度
  const headWidth = 0.07; // 箭头头部宽度
  const lineWidth = 2; // 线宽
  
  // X轴 (红色)
  const xAxis = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0), // 方向
    new THREE.Vector3(0, 0, 0), // 原点
    axisLength,
    0xff0000, // 红色
    headLength,
    headWidth
  );
  axesGroup.add(xAxis);
  
  // Y轴 (绿色)
  const yAxis = new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0), // 方向
    new THREE.Vector3(0, 0, 0), // 原点
    axisLength,
    0x00ff00, // 绿色
    headLength,
    headWidth
  );
  axesGroup.add(yAxis);
  
  // Z轴 (蓝色)
  const zAxis = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1), // 方向
    new THREE.Vector3(0, 0, 0), // 原点
    axisLength,
    0x0000ff, // 蓝色
    headLength,
    headWidth
  );
  axesGroup.add(zAxis);
  
  // 添加轴标签
  const createLabel = (text: string, position: THREE.Vector3, color: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    
    const context = canvas.getContext('2d');
    if (!context) return null;
    
    context.fillStyle = `rgb(${color >> 16 & 255}, ${color >> 8 & 255}, ${color & 255})`;
    context.font = 'bold 48px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(0.3, 0.3, 0.3);
    
    return sprite;
  };
  
  // 添加X、Y、Z标签
  const xLabel = createLabel('X', new THREE.Vector3(axisLength + 0.2, 0, 0), 0xff0000);
  const yLabel = createLabel('Y', new THREE.Vector3(0, axisLength + 0.2, 0), 0x00ff00);
  const zLabel = createLabel('Z', new THREE.Vector3(0, 0, axisLength + 0.2), 0x0000ff);
  
  if (xLabel) axesGroup.add(xLabel);
  if (yLabel) axesGroup.add(yLabel);
  if (zLabel) axesGroup.add(zLabel);
  
  // 添加原点小球
  const originGeometry = new THREE.SphereGeometry(0.05, 16, 16);
  const originMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const originSphere = new THREE.Mesh(originGeometry, originMaterial);
  axesGroup.add(originSphere);
  
  return axesGroup;
}

/**
 * [重构] 创建并返回一个可直接添加到主场景的坐标轴对象。
 * 它不再自己处理渲染，而是作为一个普通对象存在。
 * 其旋转将在主渲染循环中被更新。
 * @returns {THREE.Object3D} 坐标轴指示器对象
 */
export function setupAxesGizmo() {
  const axesGizmo = createAxesGizmo();
  // 我们将不再在这里处理渲染逻辑，而是将gizmo作为普通对象返回
  return axesGizmo;
} 