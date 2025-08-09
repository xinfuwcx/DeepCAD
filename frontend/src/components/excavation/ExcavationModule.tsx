/**
 * 基坑开挖模块
 * 支持轮廓导入和开挖参数配置
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Button, Typography, Form, InputNumber, Alert, Progress, message } from 'antd';
import { FileTextOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
// Unified layout components
import UnifiedModuleLayout from '../ui/layout/UnifiedModuleLayout';
import Panel from '../ui/layout/Panel';
import MetricCard from '../ui/layout/MetricCard';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// DXF可视化组件
const DXFVisualization: React.FC<{ dxfData: any | null }> = ({ dxfData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawDXF = useCallback(() => {
    console.log('=== DXF可视化开始 ===');
    console.log('DXF可视化组件收到数据:', dxfData);
    console.log('Canvas引用状态:', !!canvasRef.current);
    
    if (!dxfData) {
      console.log('❌ 没有DXF数据');
      return;
    }
    
    if (!canvasRef.current) {
      console.log('❌ 没有canvas引用');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('❌ 无法获取canvas上下文');
      return;
    }

    console.log('✅ Canvas和上下文准备就绪');

    // 设置高DPI支持
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    console.log('Canvas尺寸设置:', { 
      rectWidth: rect.width, 
      rectHeight: rect.height, 
      canvasWidth: canvas.width, 
      canvasHeight: canvas.height, 
      dpr 
    });

    // 清空画布
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    // 设置画布样式
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    // 检查是否有实体数据
    if (!dxfData.entities || dxfData.entities.length === 0) {
      console.log('没有实体数据可绘制');
      ctx.fillStyle = '#ffffff60';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('没有DXF几何数据', (canvas.width / dpr) / 2, (canvas.height / dpr) / 2);
      return;
    }

    console.log('开始绘制DXF实体，数量:', dxfData.entities.length);
    console.log('边界数据:', dxfData.bounds);

    // 计算缩放和偏移
    const { bounds } = dxfData;
    if (!bounds || bounds.maxX === bounds.minX || bounds.maxY === bounds.minY) {
      console.log('边界数据无效');
      return;
    }

    const padding = 30;
    const canvasWidth = (canvas.width / dpr) - 2 * padding;
    const canvasHeight = (canvas.height / dpr) - 2 * padding;
    
    // 计算几何体的中心点
    const geometryCenterX = (bounds.maxX + bounds.minX) / 2;
    const geometryCenterY = (bounds.maxY + bounds.minY) / 2;
    
    // 计算缩放比例
    const rangeX = bounds.maxX - bounds.minX;
    const rangeY = bounds.maxY - bounds.minY;
    const scaleX = canvasWidth / rangeX;
    const scaleY = canvasHeight / rangeY;
    const scale = Math.min(scaleX, scaleY) * 0.7; // 更保守的缩放
    
    // 计算画布中心
    const canvasCenterX = (canvas.width / dpr) / 2;
    const canvasCenterY = (canvas.height / dpr) / 2;
    
    // 计算偏移量以居中显示
    const offsetX = canvasCenterX - geometryCenterX * scale;
    const offsetY = canvasCenterY - geometryCenterY * scale;

    console.log('缩放参数:', { scale, offsetX, offsetY, bounds, canvasCenterX, canvasCenterY });

    // 先绘制一个测试矩形确保canvas工作
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 50, 50);
    
    // 绘制画布中心点
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(canvasCenterX, canvasCenterY, 5, 0, 2 * Math.PI);
    ctx.fill();

    // 绘制网格
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = ((canvas.width / dpr) / 10) * i;
      const y = ((canvas.height / dpr) / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height / dpr);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width / dpr, y);
      ctx.stroke();
    }

    // 绘制DXF实体
    dxfData.entities.forEach((entity: any, index: number) => {
      console.log(`绘制实体 ${index + 1}:`, entity.type, entity);
      
      ctx.strokeStyle = '#00d9ff';
      ctx.lineWidth = 3;
      ctx.beginPath();

      if (entity.type === 'LWPOLYLINE' && entity.vertices && entity.vertices.length > 0) {
        // 绘制多段线
        const firstPoint = entity.vertices[0];
        const startX = firstPoint.x * scale + offsetX;
        const startY = (canvas.height / dpr) - (firstPoint.y * scale + offsetY);
        
        ctx.moveTo(startX, startY);
        console.log(`起始点: (${startX}, ${startY}) - 原始坐标: (${firstPoint.x}, ${firstPoint.y})`);

        for (let i = 1; i < entity.vertices.length; i++) {
          const point = entity.vertices[i];
          const x = point.x * scale + offsetX;
          const y = (canvas.height / dpr) - (point.y * scale + offsetY);
          ctx.lineTo(x, y);
          console.log(`点 ${i}: (${x}, ${y}) - 原始坐标: (${point.x}, ${point.y})`);
        }

        // 连接到起始点形成闭合轮廓
        ctx.closePath();
        
        // 绘制实体中心点作为测试
        const centerX = (bounds.maxX + bounds.minX) / 2 * scale + offsetX;
        const centerY = (canvas.height / dpr) - ((bounds.maxY + bounds.minY) / 2 * scale + offsetY);
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
        ctx.fill();
        
      } else if (entity.type === 'LINE' && entity.start && entity.end) {
        // 绘制直线
        const startX = entity.start.x * scale + offsetX;
        const startY = (canvas.height / dpr) - (entity.start.y * scale + offsetY);
        const endX = entity.end.x * scale + offsetX;
        const endY = (canvas.height / dpr) - (entity.end.y * scale + offsetY);
        
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        console.log(`直线: (${startX}, ${startY}) -> (${endX}, ${endY})`);
      }

      ctx.stroke();
    });

    // 绘制点
    if (dxfData.originalPoints && dxfData.originalPoints.length > 0) {
      ctx.fillStyle = '#ff6b6b';
      dxfData.originalPoints.forEach((point: any, index: number) => {
        const x = point.x * scale + offsetX;
        const y = (canvas.height / dpr) - (point.y * scale + offsetY);
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

  }, [dxfData]);

  React.useEffect(() => {
    drawDXF();
  }, [drawDXF]);

  React.useEffect(() => {
    const handleResize = () => {
      setTimeout(drawDXF, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawDXF]);

  if (!dxfData) {
    return (
      <div style={{
        width: '100%',
        height: '200px',
        background: '#1a1a1a',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666'
      }}>
        导入DXF文件后显示轮廓
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={300}
        height={200}
        style={{
          width: '100%',
          height: '200px',
          background: '#1a1a1a',
          border: '1px solid #00d9ff40',
          borderRadius: '8px'
        }}
      />
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: '#00d9ff',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        DXF轮廓预览
      </div>
    </div>
  );
};

const { Title, Text } = Typography;

// 开挖参数接口
interface ExcavationParameters {
  // 轮廓导入
  contourImport: {
    fileName: string | null;
    fileData: any | null;
    rotationAngle: number; // 旋转角度 (度)
  };
  
  // 开挖参数
  excavationParams: {
    depth: number;           // 开挖深度 (m)
    layerDepth: number;      // 分层深度 (m)
    layerCount: number;      // 开挖层数
    stressReleaseCoefficient: number; // 应力释放系数
  };
  

}

interface ExcavationModuleProps {
  onParametersChange?: (params: ExcavationParameters) => void;
  onGenerate?: (params: ExcavationParameters) => void;
  status?: 'idle' | 'processing' | 'completed' | 'error';
  disabled?: boolean;
}

const ExcavationModule: React.FC<ExcavationModuleProps> = ({
  onParametersChange,
  onGenerate,
  status = 'idle',
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dxfData, setDxfData] = useState<any>(null);
  const [isParsingDXF, setIsParsingDXF] = useState(false);
  
  const [excavationParams, setExcavationParams] = useState<ExcavationParameters>({
    contourImport: {
      fileName: null,
      fileData: null,
      rotationAngle: 0
    },
    excavationParams: {
      depth: 10.0,
      layerDepth: 2.0,
      layerCount: 5,
      stressReleaseCoefficient: 0.7
    }
  });



  // 更新参数的通用函数
  const updateParams = useCallback((newParams: Partial<ExcavationParameters>) => {
    setExcavationParams(prev => {
      const updated = { ...prev, ...newParams };
      onParametersChange?.(updated);
      return updated;
    });
  }, [onParametersChange]);

  const handleContourChange = useCallback((field: string, value: any) => {
    const newContour = { ...excavationParams.contourImport, [field]: value };
    updateParams({ contourImport: newContour });
  }, [excavationParams.contourImport, updateParams]);

  const handleExcavationChange = useCallback((field: string, value: any) => {
    const newExcav = { ...excavationParams.excavationParams, [field]: value };
    updateParams({ excavationParams: newExcav });
  }, [excavationParams.excavationParams, updateParams]);

  // DXF解析逻辑
  const normalizeEntities = useCallback((entities: any[]) => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    const originalPoints: { x: number, y: number }[] = [];

    // 获取原始边界
    entities.forEach((entity) => {
      if (entity.type === 'LWPOLYLINE') {
        entity.vertices.forEach((v: any) => {
          originalPoints.push({ x: v.x, y: v.y });
          minX = Math.min(minX, v.x);
          maxX = Math.max(maxX, v.x);
          minY = Math.min(minY, v.y);
          maxY = Math.max(maxY, v.y);
        });
      } else if (entity.type === 'LINE') {
        originalPoints.push({ x: entity.start.x, y: entity.start.y });
        originalPoints.push({ x: entity.end.x, y: entity.end.y });
        minX = Math.min(minX, entity.start.x, entity.end.x);
        maxX = Math.max(maxX, entity.start.x, entity.end.x);
        minY = Math.min(minY, entity.start.y, entity.end.y);
        maxY = Math.max(maxY, entity.start.y, entity.end.y);
      } else if (entity.type === 'CIRCLE') {
        const left = entity.center.x - entity.radius;
        const right = entity.center.x + entity.radius;
        const top = entity.center.y + entity.radius;
        const bottom = entity.center.y - entity.radius;
        minX = Math.min(minX, left);
        maxX = Math.max(maxX, right);
        minY = Math.min(minY, bottom);
        maxY = Math.max(maxY, top);
      }
    });

    if (minX === Infinity || maxX === -Infinity || minY === Infinity || maxY === -Infinity) {
      console.warn('未找到有效的几何实体');
      return { entities, scaleFactor: 1, originalPoints, area: 0, perimeter: 0 };
    }

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    
    // 计算面积（矩形近似）
    const area = rangeX * rangeY;
    
    // 计算周长（矩形近似）
    const perimeter = 2 * (rangeX + rangeY);

    return {
      entities,
      scaleFactor: 1,
      originalPoints,
      area,
      perimeter,
      width: rangeX,
      length: rangeY,
      bounds: { minX, maxX, minY, maxY }
    };
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    handleContourChange('fileName', file.name);
    handleContourChange('fileData', file);
    
    setIsParsingDXF(true);
    
    try {
      const text = await file.text();
      console.log('开始解析DXF文件:', file.name);
      
      // 简单的DXF解析（提取基本几何信息）
      const lines = text.split('\n');
      const entities: any[] = [];
      // 仅扫描 ENTITIES 段，避免 BLOCKS 中的符号干扰
      let entitiesStart = -1;
      let entitiesEnd = lines.length;
      for (let i = 0; i < lines.length - 2; i++) {
        if (lines[i].trim() === 'SECTION' && lines[i + 1]?.trim() === '2' && lines[i + 2]?.trim() === 'ENTITIES') {
          entitiesStart = i + 3;
        }
        if (entitiesStart !== -1 && lines[i].trim() === 'ENDSEC') {
          entitiesEnd = i;
          break;
        }
      }
      const scanStart = entitiesStart !== -1 ? entitiesStart : 0;
      const scanEnd = entitiesEnd;
      
      // 解析LWPOLYLINE
      for (let i = scanStart; i < scanEnd; i++) {
        const line = lines[i].trim();
        
        if (line === 'LWPOLYLINE') {
          const entity = { type: 'LWPOLYLINE', vertices: [] as any[] };
          let j = i + 1;
          let vertexCount = 0;
          
          // 首先找到顶点数量（90代码）
          while (j < scanEnd) {
            if (lines[j].trim() === '90') {
              vertexCount = parseInt(lines[j + 1]?.trim() || '0');
              break;
            }
            j++;
          }
          
          console.log(`找到LWPOLYLINE，顶点数量: ${vertexCount}`);
          
          // 重新从开始位置解析坐标
          j = i + 1;
          let coordPairs = 0;
          
          while (j < scanEnd && coordPairs < vertexCount) {
            const code = lines[j].trim();
            const value = lines[j + 1]?.trim();
            
            if (code === '10') { // X坐标
              const x = parseFloat(value);
              // 寻找对应的Y坐标（下一个20代码）
              let k = j + 2;
              while (k < scanEnd && lines[k].trim() !== '20') {
                k += 2;
              }
              if (k < lines.length && lines[k].trim() === '20') {
                const y = parseFloat(lines[k + 1]?.trim() || '0');
                entity.vertices.push({ x, y });
                coordPairs++;
                console.log(`解析坐标 ${coordPairs}: (${x}, ${y})`);
              }
            }
            j += 2;
          }
          
          // 必须 >=3 个顶点才认作轮廓，避免类似 _ArchTick 的两点标记
          if (entity.vertices.length >= 3) {
            entities.push(entity);
            console.log(`LWPOLYLINE解析完成，实际获得 ${entity.vertices.length} 个顶点`);
          }
        }
      }
      
      if (entities.length === 0) {
        // 如果没有找到LWPOLYLINE，尝试解析LINE
        for (let i = scanStart; i < scanEnd; i++) {
          const line = lines[i].trim();
          
          if (line === 'LINE') {
            const entity = { type: 'LINE', start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
            let j = i + 1;
            
            while (j < scanEnd && lines[j].trim() !== 'LINE') {
              const code = lines[j].trim();
              const value = parseFloat(lines[j + 1]?.trim() || '0');
              
              if (code === '10') entity.start.x = value;
              else if (code === '20') entity.start.y = value;
              else if (code === '11') entity.end.x = value;
              else if (code === '21') entity.end.y = value;
              
              j += 2;
            }
            
            entities.push(entity);
          }
        }
      }

      if (entities.length === 0) {
        throw new Error('未在DXF文件中找到有效的几何实体');
      }

      const result = normalizeEntities(entities);
      console.log('normalizeEntities结果:', result);
      setDxfData(result);
      
      message.success(`DXF文件解析成功！检测到 ${entities.length} 个实体，${result.originalPoints.length} 个点`);
      
      console.log('DXF解析结果:', {
        实体数量: entities.length,
        点数量: result.originalPoints.length,
        面积: result.area.toFixed(2) + ' 平方单位',
        周长: result.perimeter.toFixed(2) + ' 单位',
        宽度: result.width.toFixed(2) + ' 单位',
        长度: result.length.toFixed(2) + ' 单位'
      });
      
    } catch (error) {
      console.error('DXF文件处理错误:', error);
      message.error(`DXF文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsParsingDXF(false);
    }
  }, [handleContourChange, normalizeEntities]);

  // 衍生指标
  const derived = useMemo(() => {
    const { depth, layerDepth, layerCount, stressReleaseCoefficient } = excavationParams.excavationParams;
    const theoreticalDepth = layerDepth * layerCount;
    const coverageRatio = depth > 0 ? Math.min(theoreticalDepth / depth, 1) : 0;
    const depthGap = depth - theoreticalDepth;
    let coverageStatus: 'optimal' | 'insufficient' | 'excess' = 'optimal';
    if (Math.abs(depthGap) > 0.01) {
      coverageStatus = depthGap > 0 ? 'insufficient' : 'excess';
    }
    return { theoreticalDepth, coverageRatio, depthGap, coverageStatus, stressReleaseCoefficient };
  }, [excavationParams.excavationParams]);

  const statusAlert = useMemo(() => {
    if (status === 'processing') return <Alert message="正在进行基坑开挖..." description="请稍候，开挖过程可能需要几分钟时间。" type="info" showIcon />;
    if (status === 'completed') return <Alert message="基坑开挖完成" description="开挖已成功完成，您可以查看结果。" type="success" showIcon />;
    if (status === 'error') return <Alert message="基坑开挖失败" description="开挖过程中发生错误，请检查参数设置后重试。" type="error" showIcon />;
    return null;
  }, [status]);

  /**
   * 中央Three.js预览，将DXF轮廓渲染到3D画布
   */
  const DXFThreePreview: React.FC<{ data: any }> = ({ data }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene>();
    const cameraRef = useRef<THREE.PerspectiveCamera>();
    const rendererRef = useRef<THREE.WebGLRenderer>();
    const controlsRef = useRef<OrbitControls>();
    const outlineRef = useRef<THREE.Object3D | null>(null);
    const frameRef = useRef<number>();

    // 初始化Three环境
    useEffect(() => {
      const mount = mountRef.current;
      if (!mount) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1f2a);
      sceneRef.current = scene;

      const width = mount.clientWidth;
      const height = mount.clientHeight;
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
      camera.position.set(120, 120, 120);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 监听上下文丢失，避免白屏
      const onContextLost = (e: Event) => { e.preventDefault(); console.warn('[DXFThreePreview] WebGL context lost'); };
      const onContextRestored = () => { console.warn('[DXFThreePreview] WebGL context restored'); };
      renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);
      renderer.domElement.addEventListener('webglcontextrestored', onContextRestored, false);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.target.set(0, 0, 0);
      controlsRef.current = controls;

      // 灯光
      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const dir = new THREE.DirectionalLight(0xffffff, 0.6);
      dir.position.set(200, 300, 150);
      scene.add(dir);

      // 网格
      const grid = new THREE.GridHelper(400, 40, 0x2b3a4c, 0x2b3a4c);
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = 0.5;
      scene.add(grid);

      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        if (!mount || !rendererRef.current || !cameraRef.current) return;
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(mount);

      return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        ro.disconnect();
        if (rendererRef.current) {
          const dom = rendererRef.current.domElement;
          if (dom && dom.parentElement === mount) mount.removeChild(dom);
          try { (rendererRef.current.getContext && (rendererRef.current as any).forceContextLoss?.()); } catch {}
          rendererRef.current.dispose();
        }
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      };
    }, []);

    // 根据 dxf 数据生成/更新轮廓
    useEffect(() => {
      const scene = sceneRef.current;
      if (!scene) return;

      // 清除旧的轮廓
      if (outlineRef.current) {
        scene.remove(outlineRef.current);
        outlineRef.current.traverse(obj => {
          if ((obj as any).geometry) (obj as any).geometry.dispose();
          if ((obj as any).material) {
            const m = (obj as any).material;
            if (Array.isArray(m)) m.forEach(x => x.dispose()); else m.dispose();
          }
        });
        outlineRef.current = null;
      }

      if (!data || !data.entities || !data.bounds) return;

      const group = new THREE.Group();
      group.name = 'dxf-outline';

      const { minX, maxX, minY, maxY } = data.bounds;
      const width = Math.max(1e-6, maxX - minX);
      const height = Math.max(1e-6, maxY - minY);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      // 目标尺寸映射到网格范围
      const target = 150; // 映射到 [-150,150] 量级内
      const scale = Math.min(target / width, target / height);

      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00d9ff });

      data.entities.forEach((e: any) => {
        if (e.type === 'LWPOLYLINE' && e.vertices?.length) {
          const pts = e.vertices.map((v: any) => new THREE.Vector3((v.x - centerX) * scale, 0, (v.y - centerY) * scale));
          // 闭合
          if (pts.length > 2) pts.push(pts[0].clone());
          const g = new THREE.BufferGeometry().setFromPoints(pts);
          const line = new THREE.Line(g, lineMaterial);
          group.add(line);
        } else if (e.type === 'LINE' && e.start && e.end) {
          const pts = [
            new THREE.Vector3((e.start.x - centerX) * scale, 0, (e.start.y - centerY) * scale),
            new THREE.Vector3((e.end.x - centerX) * scale, 0, (e.end.y - centerY) * scale)
          ];
          const g = new THREE.BufferGeometry().setFromPoints(pts);
          const line = new THREE.Line(g, lineMaterial);
          group.add(line);
        }
      });

      // 中心标记
      const mark = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
      group.add(mark);

      scene.add(group);
      outlineRef.current = group;

      // 相机对准
      if (cameraRef.current && controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        const maxDim = Math.max(width, height) * scale;
        cameraRef.current.position.set(maxDim * 1.2, maxDim * 0.9, maxDim * 1.2);
        cameraRef.current.lookAt(0, 0, 0);
        controlsRef.current.update();
      }
    }, [data]);

    return (
      <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'relative' }} />
    );
  };

  return (
    <UnifiedModuleLayout
      left={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="基坑轮廓导入" subtitle="支持复杂异形基坑" dense>
            <Form layout="vertical" size="large">
              <input
                ref={fileInputRef}
                type="file"
                accept=".dxf,.dwg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                  if (e.target) e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                block
                style={{ height: 56, fontSize: 16 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || status === 'processing' || isParsingDXF}
                loading={isParsingDXF}
              >
                {isParsingDXF ? '正在解析...' : '选择 DXF / DWG 文件'}
              </Button>
              <Text style={{ color: '#ffffff60', fontSize: 12, marginTop: 8, display: 'block' }}>
                {disabled ? '请先完成地质建模' : '推荐 AutoCAD 2018+ 版本输出'}
              </Text>
              {excavationParams.contourImport.fileName && (
                <div style={{ marginTop: 12, padding: 12, border: '1px solid #52c41a40', borderRadius: 8, background: 'linear-gradient(135deg, rgba(82,196,26,0.15), rgba(82,196,26,0.05))' }}>
                  <Text style={{ color: '#52c41a', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                    ✅ 已选文件: {excavationParams.contourImport.fileName}
                  </Text>
                  {dxfData && (
                    <div style={{ fontSize: 12, color: '#ffffff80' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>轮廓宽度:</span>
                        <span style={{ color: '#52c41a' }}>{dxfData.width.toFixed(2)} 单位</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>轮廓长度:</span>
                        <span style={{ color: '#52c41a' }}>{dxfData.length.toFixed(2)} 单位</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>轮廓面积:</span>
                        <span style={{ color: '#52c41a' }}>{dxfData.area.toFixed(2)} 平方单位</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>轮廓周长:</span>
                        <span style={{ color: '#52c41a' }}>{dxfData.perimeter.toFixed(2)} 单位</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>点数量:</span>
                        <span style={{ color: '#52c41a' }}>{dxfData.originalPoints.length} 个</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <Form.Item label="旋转角度 (度)" tooltip="导入轮廓的旋转角度, 0-360 度" style={{ marginTop: 16 }}>
                <InputNumber
                  value={excavationParams.contourImport.rotationAngle}
                  onChange={(value) => handleContourChange('rotationAngle', value || 0)}
                  min={0}
                  max={360}
                  step={1}
                  precision={0}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Form>
          </Panel>
          <Panel title="开挖参数" subtitle="分层与应力释放配置" dense>
            <Form layout="vertical" size="large">
              <Form.Item label="开挖深度 (m)" tooltip="基坑总开挖深度">
                <InputNumber
                  value={excavationParams.excavationParams.depth}
                  onChange={(value) => handleExcavationChange('depth', value || 10.0)}
                  min={1}
                  max={200}
                  step={0.5}
                  precision={1}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label="分层深度 (m)" tooltip="单次开挖层厚">
                <InputNumber
                  value={excavationParams.excavationParams.layerDepth}
                  onChange={(value) => handleExcavationChange('layerDepth', value || 2.0)}
                  min={0.5}
                  max={20}
                  step={0.5}
                  precision={1}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label="开挖层数" tooltip="计划分几层完成">
                <InputNumber
                  value={excavationParams.excavationParams.layerCount}
                  onChange={(value) => handleExcavationChange('layerCount', value || 5)}
                  min={1}
                  max={100}
                  step={1}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label="应力释放系数" tooltip="0 无释放, 1 完全释放">
                <InputNumber
                  value={excavationParams.excavationParams.stressReleaseCoefficient}
                  onChange={(value) => handleExcavationChange('stressReleaseCoefficient', value ?? 0)}
                  min={0}
                  max={1}
                  step={0.1}
                  precision={1}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <div style={{ display: 'flex', gap: 12 }}>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  block
                  disabled={disabled || status === 'processing'}
                  onClick={() => onGenerate?.(excavationParams)}
                >
                  开始开挖
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  disabled={status === 'processing'}
                  onClick={() => {
                    setExcavationParams(prev => ({
                      contourImport: { ...prev.contourImport, rotationAngle: 0 },
                      excavationParams: { depth: 10, layerDepth: 2, layerCount: 5, stressReleaseCoefficient: 0.7 }
                    }));
                  }}
                >重置</Button>
              </div>
            </Form>
          </Panel>
        </div>
      }
      right={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="参数指标" dense>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
              <MetricCard label="总深度" value={excavationParams.excavationParams.depth.toFixed(1) + ' m'} accent="blue" />
              <MetricCard label="层厚" value={excavationParams.excavationParams.layerDepth.toFixed(1) + ' m'} accent="purple" />
              <MetricCard label="层数" value={excavationParams.excavationParams.layerCount} accent="orange" />
              <MetricCard label="应力释放" value={excavationParams.excavationParams.stressReleaseCoefficient.toFixed(1)} accent="green" />
              {dxfData && (
                <>
                  <MetricCard label="DXF宽度" value={dxfData.width.toFixed(1) + ' 单位'} accent="cyan" />
                  <MetricCard label="DXF长度" value={dxfData.length.toFixed(1) + ' 单位'} accent="cyan" />
                  <MetricCard label="DXF面积" value={dxfData.area.toFixed(1) + ' ㎡'} accent="green" />
                  <MetricCard label="DXF周长" value={dxfData.perimeter.toFixed(1) + ' m'} accent="purple" />
                </>
              )}
              <MetricCard label="理论累计" value={derived.theoreticalDepth.toFixed(1) + ' m'} accent="blue" />
              <MetricCard label="覆盖率" value={(derived.coverageRatio * 100).toFixed(0) + '%'} accent={derived.coverageStatus === 'optimal' ? 'green' : derived.coverageStatus === 'insufficient' ? 'orange' : 'red'} />
            </div>
            <div style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 12, color: '#ffffff80' }}>
                理论累计 = 分层深度 * 层数。覆盖率 = 理论累计 / 总深度。
                {derived.coverageStatus === 'insufficient' && ' 当前层数不足, 可增加层数或层厚。'}
                {derived.coverageStatus === 'excess' && ' 当前层数/层厚总和超过目标深度, 可适当减少。'}
              </Text>
            </div>
          </Panel>
          <Panel title="DXF轮廓预览" dense>
            <DXFVisualization dxfData={dxfData} />
          </Panel>
          <Panel title="执行状态" dense>
            {statusAlert || (
              <Alert message="就绪" description="配置参数后点击开始开挖。" type="info" showIcon />
            )}
            {status === 'processing' && (
              <div style={{ marginTop: 16 }}>
                <Progress percent={55} status="active" strokeColor="#1890ff" showInfo={false} />
                <Text style={{ fontSize: 12, color: '#ffffff60' }}>模拟进度示例 (占位)</Text>
              </div>
            )}
          </Panel>
        </div>
      }
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <DXFThreePreview data={dxfData} />
        {!dxfData && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#ffffff90', pointerEvents: 'none' }}>
            <Title level={3} style={{ color: 'white', margin: 0, letterSpacing: 1 }}>基坑开挖预览区</Title>
            <Text style={{ maxWidth: 480, textAlign: 'center', lineHeight: 1.6 }}>
              导入 DXF/DWG 轮廓后，将在此处显示三维预览。
            </Text>
          </div>
        )}
      </div>
    </UnifiedModuleLayout>
  );
};

export default ExcavationModule;