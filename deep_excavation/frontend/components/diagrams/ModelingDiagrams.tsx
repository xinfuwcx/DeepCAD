/**
 * 建模模块二维示意图组件
 * 基于Three.js CSS2DRenderer实现的交互式示意图
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

interface DiagramProps {
  type: 'geological' | 'excavation' | 'support' | 'monitoring' | 'analysis';
  width?: number;
  height?: number;
  interactive?: boolean;
}

export const ModelingDiagram: React.FC<DiagramProps> = ({ 
  type, 
  width = 400, 
  height = 300, 
  interactive = true 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cssRendererRef = useRef<CSS2DRenderer>();
  const cameraRef = useRef<THREE.OrthographicCamera>();
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // 初始化场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    sceneRef.current = scene;

    // 初始化相机
    const camera = new THREE.OrthographicCamera(
      -width / 2, width / 2, height / 2, -height / 2, 1, 1000
    );
    camera.position.set(0, 0, 100);
    cameraRef.current = camera;

    // 初始化WebGL渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // 初始化CSS2D渲染器
    const cssRenderer = new CSS2DRenderer();
    cssRenderer.setSize(width, height);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.pointerEvents = 'none';
    cssRendererRef.current = cssRenderer;

    // 添加到容器
    containerRef.current.appendChild(renderer.domElement);
    containerRef.current.appendChild(cssRenderer.domElement);

    // 根据类型创建不同的示意图
    createDiagram(type, scene);

    // 渲染循环
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (interactive && isHovered) {
        scene.rotation.y += 0.005;
      }
      
      renderer.render(scene, camera);
      cssRenderer.render(scene, camera);
    };
    animate();

    return () => {
      // 安全卸载 renderer.domElement（仅当确为其父节点时）
      try {
        const container = containerRef.current;
        const dom = renderer?.domElement;
        if (container && dom && dom.parentNode === container) {
          container.removeChild(dom);
        }
        renderer?.dispose?.();
      } catch (e) {
        // 忽略卸载期间的偶发性错误，避免 NotFoundError 影响卸载流程
        console.warn('[ModelingDiagrams] renderer cleanup warning:', e);
      }
      
      // 安全卸载 cssRenderer.domElement（仅当确为其父节点时）
      try {
        const container = containerRef.current;
        const cssDom = cssRenderer?.domElement;
        if (container && cssDom && cssDom.parentNode === container) {
          container.removeChild(cssDom);
        }
      } catch (e) {
        // 忽略卸载期间的偶发性错误，避免 NotFoundError 影响卸载流程
        console.warn('[ModelingDiagrams] cssRenderer cleanup warning:', e);
      }
    };
  }, [type, width, height, interactive, isHovered]);

  const createDiagram = (diagramType: string, scene: THREE.Scene) => {
    switch (diagramType) {
      case 'geological':
        createGeologicalDiagram(scene);
        break;
      case 'excavation':
        createExcavationDiagram(scene);
        break;
      case 'support':
        createSupportDiagram(scene);
        break;
      case 'monitoring':
        createMonitoringDiagram(scene);
        break;
      case 'analysis':
        createAnalysisDiagram(scene);
        break;
    }
  };

  const createGeologicalDiagram = (scene: THREE.Scene) => {
    // 创建地质层
    const layers = [
      { name: '填土层', color: 0xD2B48C, y: 80, thickness: 30 },
      { name: '粘土层', color: 0x8B4513, y: 40, thickness: 40 },
      { name: '砂土层', color: 0xF4A460, y: -10, thickness: 50 },
      { name: '粉质粘土', color: 0xA0522D, y: -70, thickness: 60 },
      { name: '基岩层', color: 0x696969, y: -140, thickness: 40 }
    ];

    layers.forEach((layer, index) => {
      // 创建地质层几何体
      const geometry = new THREE.PlaneGeometry(300, layer.thickness);
      const material = new THREE.MeshBasicMaterial({ 
        color: layer.color, 
        transparent: true, 
        opacity: 0.8 
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, layer.y, 0);
      scene.add(mesh);

      // 添加边框
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      wireframe.position.copy(mesh.position);
      scene.add(wireframe);

      // 添加CSS标签
      const labelDiv = document.createElement('div');
      labelDiv.className = 'diagram-label';
      labelDiv.style.cssText = `
        color: #333;
        font-size: 12px;
        font-weight: bold;
        background: rgba(255,255,255,0.9);
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid #ccc;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        pointer-events: auto;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      labelDiv.textContent = layer.name;
      
      // 添加悬停效果
      labelDiv.addEventListener('mouseenter', () => {
        labelDiv.style.background = 'rgba(255,255,255,1)';
        labelDiv.style.transform = 'scale(1.05)';
        material.opacity = 1.0;
      });
      
      labelDiv.addEventListener('mouseleave', () => {
        labelDiv.style.background = 'rgba(255,255,255,0.9)';
        labelDiv.style.transform = 'scale(1)';
        material.opacity = 0.8;
      });

      const label = new CSS2DObject(labelDiv);
      label.position.set(120, layer.y, 1);
      scene.add(label);
    });

    // 添加钻孔示意
    const boreholeGeometry = new THREE.CylinderGeometry(5, 5, 300, 8);
    const boreholeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x000000, 
      transparent: true, 
      opacity: 0.3 
    });
    const borehole = new THREE.Mesh(boreholeGeometry, boreholeMaterial);
    borehole.position.set(-100, 0, 0);
    scene.add(borehole);

    // 钻孔标签
    const boreholeLabel = document.createElement('div');
    boreholeLabel.style.cssText = `
      color: #000;
      font-size: 11px;
      background: rgba(255,255,0,0.8);
      padding: 2px 6px;
      border-radius: 3px;
      border: 1px solid #333;
    `;
    boreholeLabel.textContent = '钻孔BH-1';
    const boreholeLabelObj = new CSS2DObject(boreholeLabel);
    boreholeLabelObj.position.set(-100, 120, 1);
    scene.add(boreholeLabelObj);
  };

  const createExcavationDiagram = (scene: THREE.Scene) => {
    // 创建基坑轮廓
    const excavationGeometry = new THREE.BoxGeometry(200, 100, 150);
    const excavationMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x87CEEB, 
      transparent: true, 
      opacity: 0.3,
      side: THREE.BackSide
    });
    const excavation = new THREE.Mesh(excavationGeometry, excavationMaterial);
    excavation.position.set(0, -25, 0);
    scene.add(excavation);

    // 基坑边框
    const excavationEdges = new THREE.EdgesGeometry(excavationGeometry);
    const excavationWireframe = new THREE.LineSegments(
      excavationEdges, 
      new THREE.LineBasicMaterial({ color: 0x0066CC, linewidth: 2 })
    );
    excavationWireframe.position.copy(excavation.position);
    scene.add(excavationWireframe);

    // 地面
    const groundGeometry = new THREE.PlaneGeometry(350, 250);
    const groundMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x90EE90, 
      transparent: true, 
      opacity: 0.6 
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.set(0, 25, 0);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // 开挖深度标注
    const depthGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(120, 25, 0),
      new THREE.Vector3(120, -75, 0)
    ]);
    const depthLine = new THREE.Line(depthGeometry, new THREE.LineBasicMaterial({ color: 0xFF0000 }));
    scene.add(depthLine);

    // 深度标签
    const depthLabel = document.createElement('div');
    depthLabel.style.cssText = `
      color: #FF0000;
      font-size: 12px;
      font-weight: bold;
      background: rgba(255,255,255,0.9);
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #FF0000;
    `;
    depthLabel.textContent = '开挖深度: 10m';
    const depthLabelObj = new CSS2DObject(depthLabel);
    depthLabelObj.position.set(140, -25, 1);
    scene.add(depthLabelObj);

    // 基坑尺寸标注
    const sizeLabel = document.createElement('div');
    sizeLabel.style.cssText = `
      color: #0066CC;
      font-size: 11px;
      background: rgba(255,255,255,0.9);
      padding: 3px 6px;
      border-radius: 3px;
      border: 1px solid #0066CC;
    `;
    sizeLabel.textContent = '20m × 15m';
    const sizeLabelObj = new CSS2DObject(sizeLabel);
    sizeLabelObj.position.set(0, 60, 1);
    scene.add(sizeLabelObj);
  };

  const createSupportDiagram = (scene: THREE.Scene) => {
    // 地连墙
    const wallGeometry = new THREE.BoxGeometry(200, 120, 5);
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(0, 0, 0);
    scene.add(wall);

    // 支撑系统
    const strutGeometry = new THREE.CylinderGeometry(8, 8, 180, 8);
    const strutMaterial = new THREE.MeshBasicMaterial({ color: 0xFF6B35 });
    
    // 第一道支撑
    const strut1 = new THREE.Mesh(strutGeometry, strutMaterial);
    strut1.position.set(0, 30, 20);
    strut1.rotation.z = Math.PI / 2;
    scene.add(strut1);

    // 第二道支撑
    const strut2 = new THREE.Mesh(strutGeometry, strutMaterial);
    strut2.position.set(0, -20, 20);
    strut2.rotation.z = Math.PI / 2;
    scene.add(strut2);

    // 锚杆
    const anchorGeometry = new THREE.CylinderGeometry(3, 3, 80, 6);
    const anchorMaterial = new THREE.MeshBasicMaterial({ color: 0x4169E1 });
    
    for (let i = 0; i < 3; i++) {
      const anchor = new THREE.Mesh(anchorGeometry, anchorMaterial);
      anchor.position.set(-50 + i * 50, 10, -30);
      anchor.rotation.y = Math.PI / 6;
      scene.add(anchor);
    }

    // 标签
    const labels = [
      { text: '地连墙', position: new THREE.Vector3(-80, 0, 10), color: '#808080' },
      { text: '钢支撑', position: new THREE.Vector3(100, 30, 30), color: '#FF6B35' },
      { text: '预应力锚杆', position: new THREE.Vector3(0, -50, -20), color: '#4169E1' }
    ];

    labels.forEach(({ text, position, color }) => {
      const labelDiv = document.createElement('div');
      labelDiv.style.cssText = `
        color: ${color};
        font-size: 11px;
        font-weight: bold;
        background: rgba(255,255,255,0.9);
        padding: 3px 6px;
        border-radius: 3px;
        border: 1px solid ${color};
      `;
      labelDiv.textContent = text;
      const labelObj = new CSS2DObject(labelDiv);
      labelObj.position.copy(position);
      scene.add(labelObj);
    });
  };

  const createMonitoringDiagram = (scene: THREE.Scene) => {
    // 监测点
    const monitoringPoints = [
      { name: '测斜仪', position: new THREE.Vector3(-60, 0, 0), color: 0xFF0000 },
      { name: '水位监测', position: new THREE.Vector3(0, -40, 0), color: 0x0000FF },
      { name: '应力监测', position: new THREE.Vector3(60, 20, 0), color: 0x00FF00 },
      { name: '位移监测', position: new THREE.Vector3(0, 60, 0), color: 0xFF00FF }
    ];

    monitoringPoints.forEach(({ name, position, color }) => {
      // 监测设备
      const deviceGeometry = new THREE.SphereGeometry(12, 8, 8);
      const deviceMaterial = new THREE.MeshBasicMaterial({ color });
      const device = new THREE.Mesh(deviceGeometry, deviceMaterial);
      device.position.copy(position);
      scene.add(device);

      // 信号线
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        position,
        new THREE.Vector3(0, 0, 0)
      ]);
      const line = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ 
        color, 
        transparent: true, 
        opacity: 0.6 
      }));
      scene.add(line);

      // 标签
      const labelDiv = document.createElement('div');
      labelDiv.style.cssText = `
        color: #${color.toString(16).padStart(6, '0')};
        font-size: 10px;
        font-weight: bold;
        background: rgba(255,255,255,0.9);
        padding: 2px 4px;
        border-radius: 3px;
        border: 1px solid #${color.toString(16).padStart(6, '0')};
      `;
      labelDiv.textContent = name;
      const labelObj = new CSS2DObject(labelDiv);
      labelObj.position.set(position.x, position.y + 20, position.z);
      scene.add(labelObj);
    });

    // 中央数据采集器
    const collectorGeometry = new THREE.BoxGeometry(20, 20, 20);
    const collectorMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const collector = new THREE.Mesh(collectorGeometry, collectorMaterial);
    collector.position.set(0, 0, 0);
    scene.add(collector);

    // 数据采集器标签
    const collectorLabel = document.createElement('div');
    collectorLabel.style.cssText = `
      color: #333;
      font-size: 11px;
      font-weight: bold;
      background: rgba(255,255,255,0.9);
      padding: 3px 6px;
      border-radius: 3px;
      border: 1px solid #333;
    `;
    collectorLabel.textContent = '数据采集器';
    const collectorLabelObj = new CSS2DObject(collectorLabel);
    collectorLabelObj.position.set(0, -30, 0);
    scene.add(collectorLabelObj);
  };

  const createAnalysisDiagram = (scene: THREE.Scene) => {
    // 网格划分
    const gridGeometry = new THREE.PlaneGeometry(200, 150, 10, 8);
    const gridMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x87CEEB, 
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.position.set(0, 0, 0);
    scene.add(grid);

    // 边界条件
    const boundaryPoints = [
      new THREE.Vector3(-100, -75, 0),
      new THREE.Vector3(100, -75, 0),
      new THREE.Vector3(100, 75, 0),
      new THREE.Vector3(-100, 75, 0)
    ];

    boundaryPoints.forEach((point, index) => {
      const boundaryGeometry = new THREE.SphereGeometry(5, 6, 6);
      const boundaryMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
      const boundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
      boundary.position.copy(point);
      scene.add(boundary);

      // 约束符号
      const constraintGeometry = new THREE.ConeGeometry(3, 10, 4);
      const constraintMaterial = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
      const constraint = new THREE.Mesh(constraintGeometry, constraintMaterial);
      constraint.position.set(point.x, point.y - 15, point.z);
      scene.add(constraint);
    });

    // 荷载箭头
    const loadGeometry = new THREE.ConeGeometry(5, 20, 6);
    const loadMaterial = new THREE.MeshBasicMaterial({ color: 0x0000FF });
    
    for (let i = -2; i <= 2; i++) {
      const load = new THREE.Mesh(loadGeometry, loadMaterial);
      load.position.set(i * 40, 90, 0);
      load.rotation.x = Math.PI;
      scene.add(load);
    }

    // 分析类型标签
    const analysisTypes = [
      { text: '有限元网格', position: new THREE.Vector3(-80, 0, 10) },
      { text: '边界条件', position: new THREE.Vector3(80, -60, 10) },
      { text: '荷载施加', position: new THREE.Vector3(0, 110, 10) }
    ];

    analysisTypes.forEach(({ text, position }) => {
      const labelDiv = document.createElement('div');
      labelDiv.style.cssText = `
        color: #333;
        font-size: 11px;
        font-weight: bold;
        background: rgba(255,255,255,0.9);
        padding: 3px 6px;
        border-radius: 3px;
        border: 1px solid #333;
      `;
      labelDiv.textContent = text;
      const labelObj = new CSS2DObject(labelDiv);
      labelObj.position.copy(position);
      scene.add(labelObj);
    });
  };

  return (
    <div 
      ref={containerRef}
      className="modeling-diagram"
      style={{ 
        position: 'relative', 
        width: `${width}px`, 
        height: `${height}px`,
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#f8f9fa'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    />
  );
};

// 预定义的示意图组件
export const GeologicalModelDiagram: React.FC<{ width?: number; height?: number }> = ({ width, height }) => (
  <ModelingDiagram type="geological" width={width} height={height} />
);

export const ExcavationDiagram: React.FC<{ width?: number; height?: number }> = ({ width, height }) => (
  <ModelingDiagram type="excavation" width={width} height={height} />
);

export const SupportDiagram: React.FC<{ width?: number; height?: number }> = ({ width, height }) => (
  <ModelingDiagram type="support" width={width} height={height} />
);

export const MonitoringDiagram: React.FC<{ width?: number; height?: number }> = ({ width, height }) => (
  <ModelingDiagram type="monitoring" width={width} height={height} />
);

export const AnalysisDiagram: React.FC<{ width?: number; height?: number }> = ({ width, height }) => (
  <ModelingDiagram type="analysis" width={width} height={height} />
);

export default ModelingDiagram; 