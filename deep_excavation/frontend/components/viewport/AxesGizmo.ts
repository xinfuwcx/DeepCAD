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
 * 将坐标轴指示器添加到场景和相机中
 * @param {THREE.Camera} camera - Three.js相机
 * @param {THREE.WebGLRenderer} renderer - Three.js渲染器
 * @returns {Object} 包含更新和清理方法的对象
 */
export function setupAxesGizmo(camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
  // 创建坐标轴指示器
  const axesGizmo = createAxesGizmo();
  
  // 设置位置在左下角
  const gizmoSize = 100; // 增大指示器大小（像素）
  const padding = 30; // 增大边距（像素）
  
  // 创建一个正交相机用于渲染指示器
  const gizmoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  gizmoCamera.position.set(0, 0, 1);
  
  // 创建一个场景用于渲染指示器
  const gizmoScene = new THREE.Scene();
  gizmoScene.add(axesGizmo);
  
  // 添加一个背景圆形，增强可见性
  const circleGeometry = new THREE.CircleGeometry(0.9, 32);
  const circleMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x000000, 
    transparent: true, 
    opacity: 0.3,
    depthTest: false,
    depthWrite: false
  });
  const circleBackground = new THREE.Mesh(circleGeometry, circleMaterial);
  circleBackground.position.z = -0.1; // 放在坐标轴后面
  gizmoScene.add(circleBackground);
  
  // 更新函数，在主渲染循环中调用
  const update = () => {
    // 复制主相机的旋转到坐标轴上
    axesGizmo.quaternion.copy(camera.quaternion).invert();
    
    // 获取渲染器尺寸
    const { width, height } = renderer.getSize(new THREE.Vector2());
    
    // 保存当前视口和剪裁设置
    const currentViewport = renderer.getViewport(new THREE.Vector4());
    const currentScissor = renderer.getScissor(new THREE.Vector4());
    const currentScissorTest = renderer.getScissorTest();
    const currentAutoClear = renderer.autoClear;
    
    // 设置左下角的视口
    renderer.setViewport(padding, padding, gizmoSize, gizmoSize);
    renderer.setScissor(padding, padding, gizmoSize, gizmoSize);
    renderer.setScissorTest(true);
    renderer.autoClear = false; // 不要清除之前的渲染结果
    
    // 只清除深度缓冲区，确保坐标系始终在最上层
    renderer.clearDepth();
    
    // 渲染坐标轴指示器
    renderer.render(gizmoScene, gizmoCamera);
    
    // 恢复之前的设置
    renderer.setViewport(currentViewport);
    renderer.setScissor(currentScissor);
    renderer.setScissorTest(currentScissorTest);
    renderer.autoClear = currentAutoClear;
  };
  
  // 清理函数
  const dispose = () => {
    gizmoScene.remove(axesGizmo);
    gizmoScene.remove(circleBackground);
    
    // 清理几何体和材质
    circleGeometry.dispose();
    circleMaterial.dispose();
    
    axesGizmo.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  };
  
  return { update, dispose };
} 