/**
 * 视口坐标轴组件 - 固定在左下角，跟随主相机旋转
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';

interface ViewportAxesProps {
  camera?: THREE.PerspectiveCamera;
  size?: number;
  position?: 'fixed' | 'absolute';
  offset?: { left?: number; bottom?: number; right?: number; top?: number };
  zIndex?: number;
  className?: string;
  style?: React.CSSProperties;
  /** 跟随模式: instant 立即复制; smooth 平滑插值 */
  followMode?: 'instant' | 'smooth';
  /** 平滑时的阻尼 (0-1, 越大越快) */
  damping?: number;
}

export const ViewportAxes: React.FC<ViewportAxesProps> = ({ 
  camera, 
  size = 120,
  position = 'absolute',
  offset = { left: 20, bottom: 20 },
  zIndex = 999,
  className,
  style,
  followMode = 'smooth',
  damping = 0.18
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const axesCameraRef = useRef<THREE.PerspectiveCamera>();
  const frameIdRef = useRef<number>();
  const [fallback, setFallback] = useState(false);
  const axesGroupRef = useRef<THREE.Group>();

  const createAxes = useCallback((): THREE.Group => {
    console.log('ViewportAxes: Creating axes geometry...');
    const group = new THREE.Group();
  group.name = 'mini-axes-root';
    
  const axisLength = 1.7; // 略微加长，便于观察
    const arrowLength = 0.3;
    const arrowRadius = 0.1;
    const axisRadius = 0.03;

    // X轴 - 红色
    const xAxisGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
    const xAxisMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const xAxis = new THREE.Mesh(xAxisGeometry, xAxisMaterial);
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.x = axisLength / 2;
    group.add(xAxis);

    // X轴箭头
    const xArrowGeometry = new THREE.ConeGeometry(arrowRadius, arrowLength, 8);
    const xArrow = new THREE.Mesh(xArrowGeometry, xAxisMaterial);
    xArrow.rotation.z = -Math.PI / 2;
    xArrow.position.x = axisLength + arrowLength / 2;
    group.add(xArrow);

    // Y轴 - 绿色
    const yAxisGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
    const yAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const yAxis = new THREE.Mesh(yAxisGeometry, yAxisMaterial);
    yAxis.position.y = axisLength / 2;
    group.add(yAxis);

    // Y轴箭头
    const yArrowGeometry = new THREE.ConeGeometry(arrowRadius, arrowLength, 8);
    const yArrow = new THREE.Mesh(yArrowGeometry, yAxisMaterial);
    yArrow.position.y = axisLength + arrowLength / 2;
    group.add(yArrow);

    // Z轴 - 蓝色
    const zAxisGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
    const zAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const zAxis = new THREE.Mesh(zAxisGeometry, zAxisMaterial);
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.z = axisLength / 2;
    group.add(zAxis);

    // Z轴箭头
    const zArrowGeometry = new THREE.ConeGeometry(arrowRadius, arrowLength, 8);
    const zArrow = new THREE.Mesh(zArrowGeometry, zAxisMaterial);
    zArrow.rotation.x = Math.PI / 2;
    zArrow.position.z = axisLength + arrowLength / 2;
    group.add(zArrow);

  // THREE 自带辅助 (细线) 作为兜底，先放大避免被箭头遮挡
  const helper = new THREE.AxesHelper(2.2);
  helper.name = 'axes-helper';
  group.add(helper);

  // 原点立方体
    const originCubeGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const originCubeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent:true, opacity:0.9 });
    const originCube = new THREE.Mesh(originCubeGeo, originCubeMat);
    originCube.name = 'origin-cube';
    group.add(originCube);

    // 文本标签创建函数 (基于 Canvas 生成纹理)
    const createLabelSprite = (text: string, color: string, position: THREE.Vector3) => {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0,0,size,size);
      ctx.font = 'bold 72px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // 背景圆
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.arc(size/2, size/2, size/2-4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = color;
      ctx.fillText(text, size/2, size/2+4);
      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = 4;
      const material = new THREE.SpriteMaterial({ map: texture, depthTest:false, depthWrite:false, transparent:true });
      const sprite = new THREE.Sprite(material);
      const labelScale = 0.55; // 控制标签实体大小
      sprite.scale.set(labelScale, labelScale, labelScale);
      sprite.position.copy(position);
      sprite.renderOrder = 1000;
      group.add(sprite);
    };

    // 添加 X/Y/Z 标签 (稍微超出箭头)
    createLabelSprite('X', '#ff4d4d', new THREE.Vector3(axisLength + arrowLength + 0.55, 0, 0));
    createLabelSprite('Y', '#4dff4d', new THREE.Vector3(0, axisLength + arrowLength + 0.55, 0));
    createLabelSprite('Z', '#4d6dff', new THREE.Vector3(0, 0, axisLength + arrowLength + 0.55));

  console.log('ViewportAxes: Axes group created with', group.children.length, 'children');
    return group;
  }, []);

  useEffect(() => {
    console.log('ViewportAxes: useEffect triggered, camera:', !!camera, 'mount:', !!mountRef.current);
    
  if (!mountRef.current) {
      console.log('ViewportAxes: mountRef not ready');
      return;
    }

    if (!camera) {
      console.log('ViewportAxes: camera not provided');
      return;
    }

    console.log('ViewportAxes: Initializing...');

    // 创建独立场景
    const scene = new THREE.Scene();
    scene.background = null; // 透明背景
    sceneRef.current = scene;

    // 创建独立相机
    const axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    axesCamera.position.set(0, 0, 4);
    axesCameraRef.current = axesCamera;

    // 创建渲染器
    let renderer:THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: true,
        premultipliedAlpha: false
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(size, size, false);
      renderer.setClearColor(0x000000, 0);
      renderer.shadowMap.enabled = false;
      rendererRef.current = renderer;
    } catch (e) {
      console.warn('ViewportAxes: WebGLRenderer init failed, switching to fallback', e);
      setFallback(true);
      return;
    }

    try {
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  mountRef.current.appendChild(renderer.domElement);
      console.log('ViewportAxes: Renderer added to DOM, canvas size:', renderer.domElement.width, 'x', renderer.domElement.height);
    } catch (error) {
      console.error('ViewportAxes: Failed to add renderer to DOM:', error);
      return;
    }

    // 创建坐标轴
  const axesGroup = createAxes();
  axesGroupRef.current = axesGroup;
  scene.add(axesGroup);
    console.log('ViewportAxes: Axes added to scene, children count:', scene.children.length);

    // 添加光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    console.log('ViewportAxes: Lights added, total children:', scene.children.length);

    // 手动渲染一次测试
  renderer.render(scene, axesCamera);
    console.log('ViewportAxes: Initial render complete');

    // 渲染循环
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      // 同步相机旋转
      if (camera && axesGroupRef.current) {
        if (followMode === 'instant') {
          axesGroupRef.current.quaternion.copy(camera.quaternion);
        } else {
          // 平滑插值 (四元数球面插值)
          axesGroupRef.current.quaternion.slerp(camera.quaternion, damping);
        }
      }

  renderer.render(scene, axesCamera);
    };

    console.log('ViewportAxes: Starting animation loop');
    animate();

    return () => {
      console.log('ViewportAxes: Cleaning up...');
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (mountRef.current && rendererRef.current.domElement && mountRef.current.contains(rendererRef.current.domElement)) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, [camera, size, createAxes, followMode, damping]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        position,
        bottom: offset.bottom ?? undefined,
        left: offset.left ?? undefined,
        right: offset.right ?? undefined,
        top: offset.top ?? undefined,
        width: `${size}px`,
        height: `${size}px`,
        zIndex,
        pointerEvents: 'none',
  border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: '8px',
        background: 'linear-gradient(135deg, rgba(0,0,0,0.35), rgba(0,0,0,0.1))',
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        color: '#fff',
        fontFamily: 'Inter, system-ui, Arial',
        letterSpacing: 0.5,
        ...style,
      }}
    >
      {fallback && (
        <div style={{ textAlign:'center', lineHeight:1.2 }}>
          <div style={{fontSize:12}}>X Y Z</div>
          <div style={{opacity:0.6}}>No WebGL</div>
        </div>
      )}
    </div>
  );
};

export default ViewportAxes;