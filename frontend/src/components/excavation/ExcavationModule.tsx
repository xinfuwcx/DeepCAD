/**
 * 基坑开挖模块
 * 支持轮廓导入和开挖参数配置
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Button, Typography, Form, InputNumber, Alert, Progress, message, Card } from 'antd';
import { FileTextOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
// Unified layout components
import UnifiedModuleLayout from '../ui/layout/UnifiedModuleLayout';
import MetricCard from '../ui/layout/MetricCard';


const { Text } = Typography;

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
  // 原始（未旋转）DXF 线段集合
  const [rawDxfSegments, setRawDxfSegments] = useState<Array<{ start:{x:number;y:number}, end:{x:number;y:number} }>>([]);
  const [displayScale, setDisplayScale] = useState<number>(1); // 视图显示缩放系数（仅影响DXF渲染大小）
  const [isParsingDXF, setIsParsingDXF] = useState(false);
  // 标记旋转角度最近一次更新来源：'input' 表示用户输入，'camera' 表示视角变动
  const angleUpdateByRef = useRef<null | 'input' | 'camera'>(null);
  const initialFitDoneRef = useRef<boolean>(false);
  // 旋转角度输入的本地草稿，仅在失焦/回车时提交到全局状态
  const [rotationDraft, setRotationDraft] = useState<number>(0);
  const editingAngleRef = useRef<boolean>(false);
  
  
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

  // 已移除“旋转角度跟随视角”的联动功能

  // 移除单独的“当前视角角度”显示，旋转角度可按需跟随视角（通过开关控制）

  // 恢复默认画布（网格/地面等）并在 CAE 引擎就绪后移除地面与网格
  useEffect(() => {
    let cancelled = false;
    // 先恢复几何视口默认（若存在）
    try { (window as any).__GEOMETRY_VIEWPORT__?.restoreDefaults?.(); } catch {}

    const applyRemoval = () => {
      try {
        const eng = (window as any).__CAE_ENGINE__;
        if (eng?.hideGround && eng?.hideGrid && eng?.disableHelpers) {
          eng.hideGround();
          eng.hideGrid();
          eng.disableHelpers(); // 防止自动补回
          return true;
        }
      } catch {}
      return false;
    };

    // 立即尝试一次；若失败则重试等待引擎初始化完成
    if (!applyRemoval()) {
      let attempts = 0;
      const timer = setInterval(() => {
        if (cancelled) { clearInterval(timer); return; }
        attempts++;
        if (applyRemoval() || attempts > 50) { // 最长重试 ~10s (50*200ms)
          clearInterval(timer);
        }
      }, 200);
      return () => { cancelled = true; clearInterval(timer); };
    }

    return () => { cancelled = true; };
  }, []);




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

  // 提交旋转角度（在失焦或按回车时调用）
  const commitRotationDraft = useCallback((val?: number) => {
    const clamp = (v:number)=> {
      if (Number.isNaN(v)) return 0;
      let x = Math.round(v);
      x = ((x % 360) + 360) % 360; // 归一化到 0-360
      return x;
    };
    const src = typeof val === 'number' ? val : (rotationDraft as number);
    const next = clamp(src);
    setRotationDraft(next);
    angleUpdateByRef.current = 'input';
    handleContourChange('rotationAngle', next);
  }, [rotationDraft, handleContourChange]);

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

      // === 生成基础线段（未应用旋转）===
      const baseSegments: Array<{ start:{x:number;y:number}, end:{x:number;y:number} }> = [];
      entities.forEach(ent => {
        if (ent.type === 'LWPOLYLINE' && Array.isArray(ent.vertices) && ent.vertices.length >= 2) {
          for (let i = 0; i < ent.vertices.length - 1; i++) {
            baseSegments.push({ start: { x: ent.vertices[i].x, y: ent.vertices[i].y }, end: { x: ent.vertices[i+1].x, y: ent.vertices[i+1].y } });
          }
          // 闭合
          if (ent.vertices.length >= 3) {
            baseSegments.push({ start: { x: ent.vertices[ent.vertices.length - 1].x, y: ent.vertices[ent.vertices.length - 1].y }, end: { x: ent.vertices[0].x, y: ent.vertices[0].y } });
          }
        } else if (ent.type === 'LINE' && ent.start && ent.end) {
          baseSegments.push({ start: { x: ent.start.x, y: ent.start.y }, end: { x: ent.end.x, y: ent.end.y } });
        }
      });
      setRawDxfSegments(baseSegments);
      console.log('生成DXF基础线段数量:', baseSegments.length);

      // 初次尝试渲染（旋转角度初始为 0），并进行一次相机自适应
      try {
        (window as any).__GEOMETRY_VIEWPORT__?.renderDXFSegments?.(baseSegments);
  (window as any).__CAE_ENGINE__?.renderDXFSegments?.(baseSegments, { scaleMultiplier: displayScale, autoFit: true });
        initialFitDoneRef.current = true;
      } catch (e) { /* 视口可能尚未准备好 */ }
      
      message.success(`DXF文件解析成功！检测到 ${entities.length} 个实体，${result.originalPoints.length} 个点`);
      
      console.log('DXF解析结果:', {
        实体数量: entities.length,
        点数量: result.originalPoints.length,
        面积: result.area.toFixed(2) + ' 平方单位',
        周长: result.perimeter.toFixed(2) + ' 单位',
  宽度: result.width?.toFixed(2) + ' 单位',
  长度: result.length?.toFixed(2) + ' 单位'
      });
      
    } catch (error) {
      console.error('DXF文件处理错误:', error);
      message.error(`DXF文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsParsingDXF(false);
    }
  }, [handleContourChange, normalizeEntities]);

  // 订阅相机方位角，更新“旋转角度”显示，但不触发DXF重渲染
  useEffect(() => {
    let unsub: (()=>void) | undefined;
    const trySubscribe = () => {
      const bridge = (window as any).__CAE_ENGINE__;
      if (bridge?.subscribeCameraAzimuth && bridge?.getCameraAzimuthDeg) {
        // 初始化仅刷新输入显示，不修改参数
        try {
          const deg = Math.round(bridge.getCameraAzimuthDeg());
          angleUpdateByRef.current = 'camera';
          if (!editingAngleRef.current) setRotationDraft(deg);
        } catch {}
        unsub = bridge.subscribeCameraAzimuth((deg:number)=>{
          angleUpdateByRef.current = 'camera';
          if (!editingAngleRef.current) setRotationDraft(Math.round(deg));
        });
        return true;
      }
      return false;
    };
    if (!trySubscribe()) {
      const t = setInterval(()=>{ if (trySubscribe()) clearInterval(t); }, 300);
      return ()=> clearInterval(t);
    }
    return ()=> { try { unsub?.(); } catch{} };
  }, []);

  // =========== 旋转 & 渲染同步 ==========='
  useEffect(() => {
  if (!rawDxfSegments.length) return;
    // 若角度来自相机，仅更新显示，不触发DXF重绘，避免用户自由旋转时模型抖动
    const updatedBy = angleUpdateByRef.current;
    angleUpdateByRef.current = null;
    const skipRotate = updatedBy === 'camera';
    
    if (skipRotate) {
      // 仍同步几何视口的原始线段（保持显示），不改变DXF旋转
      try {
        (window as any).__GEOMETRY_VIEWPORT__?.renderDXFSegments?.(rawDxfSegments);
      } catch {}
      return;
    }
  const angleDeg = excavationParams.contourImport.rotationAngle;
    const angleRad = (angleDeg * Math.PI) / 180;
    if (!dxfData || !dxfData.bounds) {
      // 没有边界就直接渲染原始线段
      try {
  (window as any).__GEOMETRY_VIEWPORT__?.renderDXFSegments?.(rawDxfSegments);
  (window as any).__CAE_ENGINE__?.renderDXFSegments?.(rawDxfSegments, { scaleMultiplier: displayScale, autoFit: !initialFitDoneRef.current });
      } catch {}
      return;
    }
    const { minX, maxX, minY, maxY } = dxfData.bounds;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    if (angleDeg === 0) {
      try {
        (window as any).__GEOMETRY_VIEWPORT__?.renderDXFSegments?.(rawDxfSegments);
        (window as any).__CAE_ENGINE__?.renderDXFSegments?.(rawDxfSegments, { scaleMultiplier: displayScale });
      } catch {}
      return;
    }
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    const rotated = rawDxfSegments.map(seg => {
      const sx = seg.start.x - cx; const sy = seg.start.y - cy;
      const ex = seg.end.x - cx; const ey = seg.end.y - cy;
      return {
        start: { x: cx + sx * cosA - sy * sinA, y: cy + sx * sinA + sy * cosA },
        end: { x: cx + ex * cosA - ey * sinA, y: cy + ex * sinA + ey * cosA }
      };
    });
    try {
      (window as any).__GEOMETRY_VIEWPORT__?.renderDXFSegments?.(rotated);
      (window as any).__CAE_ENGINE__?.renderDXFSegments?.(rotated, { scaleMultiplier: displayScale, autoFit: !initialFitDoneRef.current });
    } catch {}
  }, [rawDxfSegments, excavationParams.contourImport.rotationAngle, dxfData, displayScale]);
  
  // 显示缩放系数变化时，按比例重渲染（不再自动相机适配以保留视觉缩放效果）
  useEffect(() => {
    if (!rawDxfSegments.length) return;
    try {
      const angleDeg = excavationParams.contourImport.rotationAngle;
      const angleRad = (angleDeg * Math.PI) / 180;
      if (!dxfData?.bounds || angleDeg === 0) {
        (window as any).__GEOMETRY_VIEWPORT__?.renderDXFSegments?.(rawDxfSegments);
        (window as any).__CAE_ENGINE__?.renderDXFSegments?.(rawDxfSegments, { scaleMultiplier: displayScale, autoFit: false });
        return;
      }
      const { minX, maxX, minY, maxY } = dxfData.bounds;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const cosA = Math.cos(angleRad); const sinA = Math.sin(angleRad);
      const rotated = rawDxfSegments.map(seg => {
        const sx = seg.start.x - cx; const sy = seg.start.y - cy;
        const ex = seg.end.x - cx; const ey = seg.end.y - cy;
        return {
          start: { x: cx + sx * cosA - sy * sinA, y: cy + sx * sinA + sy * cosA },
          end: { x: cx + ex * cosA - ey * sinA, y: cy + ex * sinA + ey * cosA }
        };
      });
      (window as any).__GEOMETRY_VIEWPORT__?.renderDXFSegments?.(rotated);
      (window as any).__CAE_ENGINE__?.renderDXFSegments?.(rotated, { scaleMultiplier: displayScale, autoFit: false });
    } catch {}
  }, [displayScale]);

  // 计算闭合多边形（优先使用 LWPOLYLINE 顶点序列）
  const computeClosedPolylines = useCallback((): Array<Array<{x:number;y:number}>> => {
    if (!dxfData?.entities) return [];
    const result: Array<Array<{x:number;y:number}>> = [];
    try {
      dxfData.entities.forEach((ent: any) => {
        if (ent.type === 'LWPOLYLINE' && Array.isArray(ent.vertices) && ent.vertices.length >= 3) {
          const pts = ent.vertices.map((v: any) => ({ x: v.x, y: v.y }));
          // 若未闭合，首尾闭合
          const p0 = pts[0], pn = pts[pts.length - 1];
          const dx = pn.x - p0.x, dy = pn.y - p0.y;
          if (Math.hypot(dx, dy) > 1e-6) pts.push({ ...p0 });
          result.push(pts);
        }
      });
    } catch {}
    return result;
  }, [dxfData]);

  const polyArea = (poly: Array<{x:number;y:number}>): number => {
    if (!poly || poly.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < poly.length - 1; i++) {
      const a = poly[i], b = poly[i+1];
      area += (a.x * b.y - b.x * a.y);
    }
    return Math.abs(area) * 0.5;
  };

  const selectPrimaryPolyline = (polys: Array<Array<{x:number;y:number}>>): Array<{x:number;y:number}> | null => {
    if (!polys.length) return null;
    let best = polys[0];
    let bestArea = polyArea(best);
    for (let i = 1; i < polys.length; i++) {
      const a = polyArea(polys[i]);
      if (a > bestArea) { bestArea = a; best = polys[i]; }
    }
    return best;
  };

  // 点击“开始开挖”生成实体
  const handleStartExcavation = useCallback(() => {
    if (!dxfData) { message.warning('请先导入 DXF 轮廓'); return; }
    const polylines = computeClosedPolylines();
    if (polylines.length === 0) { message.warning('未找到可闭合的轮廓'); return; }
    const primary = selectPrimaryPolyline(polylines);
    if (!primary) { message.warning('未找到可用的主要轮廓'); return; }

    const { depth, layerDepth, layerCount, stressReleaseCoefficient } = excavationParams.excavationParams;
    const rotationAngle = excavationParams.contourImport.rotationAngle;
    try {
      // 先强制同步一次 DXF 线段渲染与当前角度（避免因“相机更新跳过旋转”导致的视觉不一致）
      {
        // 只用主要轮廓来显示导线，确保与开挖实体一致
        const angleDeg = rotationAngle;
        const angleRad = (angleDeg * Math.PI) / 180;
        // 用主要轮廓自身的包围盒做旋转中心，和引擎中的逻辑保持一致
        let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
        primary.forEach(p=>{ minX=Math.min(minX,p.x); minY=Math.min(minY,p.y); maxX=Math.max(maxX,p.x); maxY=Math.max(maxY,p.y); });
        const cx=(minX+maxX)/2, cy=(minY+maxY)/2;
        const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
        const rotate = (x:number,y:number)=>({ x: cx + (x-cx)*cosA - (y-cy)*sinA, y: cy + (x-cx)*sinA + (y-cy)*cosA });
        const segs: Array<{start:{x:number;y:number}, end:{x:number;y:number}}> = [];
        for (let i=0;i<primary.length-1;i++){
          const a = rotate(primary[i].x, primary[i].y);
          const b = rotate(primary[i+1].x, primary[i+1].y);
          segs.push({ start:a, end:b });
        }
        (window as any).__GEOMETRY_VIEWPORT__?.renderDXFSegments?.(segs);
        (window as any).__CAE_ENGINE__?.renderDXFSegments?.(segs, { scaleMultiplier: displayScale, autoFit: false });
      }

      (window as any).__CAE_ENGINE__?.addExcavationSolids?.(
        [primary],
        { depth, layerDepth, layerCount, stressReleaseCoefficient, rotationAngleDeg: rotationAngle },
        { scaleMultiplier: displayScale, autoFit: true }
      );
      onGenerate?.(excavationParams);
      message.success('已根据主要轮廓生成分层开挖实体');
    } catch (e) {
      console.error(e);
      message.error('生成开挖实体失败');
    }
  }, [computeClosedPolylines, dxfData, excavationParams, displayScale]);

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


  return (
    <UnifiedModuleLayout
      left={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', padding: '16px', paddingBottom: 64 }}>
          <Card title="基坑轮廓导入" size="small" style={{ borderRadius: 8 }}>
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
                  value={rotationDraft}
                  onChange={(value) => {
                    if (typeof value === 'number') {
                      editingAngleRef.current = true; // 正在编辑
                      setRotationDraft(value);
                      // 立即提交并驱动模型旋转（双向联动）
                      commitRotationDraft(value);
                    }
                  }}
                  min={0}
                  max={360}
                  step={1}
                  precision={0}
                  size="large"
                  style={{ width: '100%' }}
                  onFocus={() => { editingAngleRef.current = true; }}
                  onBlur={() => { editingAngleRef.current = false; commitRotationDraft(); }}
                  onPressEnter={() => { editingAngleRef.current = false; commitRotationDraft(); }}
                />
              </Form.Item>
              <Form.Item label="显示缩放系数" tooltip="仅影响DXF/开挖轮廓的显示大小，不改变真实尺寸">
                <InputNumber
                  value={displayScale}
                  onChange={(v)=> setDisplayScale((v && v > 0) ? v : 1)}
                  min={0.1}
                  max={10}
                  step={0.1}
                  precision={2}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              {/* 已移除跟随视角开关 */}
            </Form>
          </Card>
          <Card title="开挖参数" size="small" style={{ borderRadius: 8 }}>
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
                  onClick={handleStartExcavation}
                >
                  开始开挖
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  disabled={status === 'processing'}
                  onClick={() => {
                    setExcavationParams(prev => ({
                      // 保持当前导入与旋转角度不变，仅重置开挖参数
                      contourImport: { ...prev.contourImport },
                      excavationParams: { depth: 10, layerDepth: 2, layerCount: 5, stressReleaseCoefficient: 0.7 }
                    }));
                  }}
                >重置</Button>
              </div>
            </Form>
          </Card>
          <Card title="参数指标" size="small" style={{ borderRadius: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <MetricCard label="总深度" value={excavationParams.excavationParams.depth.toFixed(1) + ' m'} accent="blue" />
              <MetricCard label="层厚" value={excavationParams.excavationParams.layerDepth.toFixed(1) + ' m'} accent="purple" />
              <MetricCard label="层数" value={excavationParams.excavationParams.layerCount} accent="orange" />
              <MetricCard label="应力释放" value={excavationParams.excavationParams.stressReleaseCoefficient.toFixed(1)} accent="green" />
              {dxfData && (
                <>
                  <MetricCard label="DXF宽度" value={dxfData.width.toFixed(1) + ' 单位'} accent="blue" />
                  <MetricCard label="DXF长度" value={dxfData.length.toFixed(1) + ' 单位'} accent="blue" />
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
          </Card>
          <Card title="执行状态" size="small" style={{ borderRadius: 8 }}>
            {statusAlert || (
              <Alert message="就绪" description="配置参数后点击开始开挖。" type="info" showIcon />
            )}
            {status === 'processing' && (
              <div style={{ marginTop: 16 }}>
                <Progress percent={55} status="active" strokeColor="#1890ff" showInfo={false} />
                <Text style={{ fontSize: 12, color: '#ffffff60' }}>模拟进度示例 (占位)</Text>
              </div>
            )}
          </Card>
        </div>
      }
    >
      {/* 主区域当前为空（由外层工作区3D视口占位时再替换）*/}
      <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#555',fontSize:12,opacity:0.3}}>Excavation Workspace</div>
    </UnifiedModuleLayout>
  );
};

export default ExcavationModule;