import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Button, Typography, Space } from 'antd';
import { useRealisticRendering } from '../hooks/useRealisticRendering';
import RealisticRenderingEngine, { QUALITY_PRESETS } from '../services/RealisticRenderingEngine';
import { eventBus } from '../core/eventBus';
import { geometryAlgorithmIntegration } from '../services';
import { localGeometryRegistry } from '../services/LocalGeometryRegistry';
import { isFeatureEnabled } from '../config/featureFlags';
import ViewportAxes from './3d/ViewportAxes';
// @ts-ignore - optional local CSG lib (may be absent during initial dev)
// dynamic import used later
// import { CSG } from 'three-csg-ts';
// import { useModernAxis } from '../hooks/useModernAxis'; // 临时禁用

const { Text } = Typography;

interface ProfessionalViewport3DProps {
  title?: string;
  description?: string;
  mode?: 'advanced' | 'geometry' | 'mesh' | 'results' | 'data' | 'settings' | 'analysis';
  className?: string;
  onAction?: (action: string) => void;
  /** 是否在挂载时隐藏旧版全局 CADToolbar */
  suppressLegacyToolbar?: boolean;
}

const ProfessionalViewport3D: React.FC<ProfessionalViewport3DProps> = ({ 
  title = "3D 视口",
  description = "三维可视化",
  mode = 'geometry',
  className,
  onAction,
  suppressLegacyToolbar
}) => {
  // 若要求隐藏旧版 CADToolbar, 在初始化阶段就设置一个同步标志，避免首次渲染闪现
  if (typeof window !== 'undefined') {
    if (suppressLegacyToolbar || !isFeatureEnabled('legacyCADToolbar')) {
      (window as any).__HIDE_LEGACY_CAD_TOOLBAR__ = true;
    }
  }
  const [qualityLevel, setQualityLevel] = useState<keyof typeof QUALITY_PRESETS>('high');
  const [showControls, setShowControls] = useState(false);
  // 工具与交互状态
  const [activeTool, setActiveTool] = useState<string>('select');
  const [sketchPoints, setSketchPoints] = useState<THREE.Vector3[]>([]);
  const sketchLineRef = useRef<THREE.Line | null>(null);
  const sketchPreviewMeshRef = useRef<THREE.Mesh | null>(null);
  const [isSketchClosed, setIsSketchClosed] = useState(false);
  const [extrudeHeight, setExtrudeHeight] = useState<number>(10);
  const [selection, setSelection] = useState<THREE.Mesh[]>([]);
  const selectionGroupRef = useRef<THREE.Group | null>(null);
  // 测量
  type MeasurementMode = 'distance' | 'polyline' | 'area' | 'angle';
  const [measurementMode, setMeasurementMode] = useState<MeasurementMode>('distance');
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);
  const measureLineRef = useRef<THREE.Line | null>(null);
  const measureOverlayGroupRef = useRef<THREE.Group | null>(null);
  const measureAngleArcRef = useRef<THREE.Line | null>(null);
  // 布尔
  const [booleanMode, setBooleanMode] = useState<'local' | 'backend'>('local');
  const pendingBooleanOpRef = useRef<string | null>(null);
  const [preserveOriginal,setPreserveOriginal] = useState(false);
  // 捕捉
  const [enableSnapping, setEnableSnapping] = useState(true);
  const snapMarkerRef = useRef<THREE.Mesh | null>(null);
  // 子要素粒度 & 高亮
  type SelectionGranularity = 'object' | 'face' | 'edge' | 'vertex';
  const [selectionGranularity, setSelectionGranularity] = useState<SelectionGranularity>('object');
  const subHighlightGroupRef = useRef<THREE.Group | null>(null);
  // 捕捉特征点缓存
  interface FeaturePoint { pos: THREE.Vector3; type: 'vertex' | 'edgeMid' | 'faceCenter'; owner: string; }
  const featurePointsRef = useRef<FeaturePoint[]>([]);
  const featureNeedsRebuildRef = useRef(true);
  const meshesNeedingFeatureRefresh = useRef<Set<string>>(new Set());
  // 捕捉过滤
  const [snapUseVertex,setSnapUseVertex] = useState(true);
  const [snapUseEdgeMid,setSnapUseEdgeMid] = useState(true);
  const [snapUseFaceCenter,setSnapUseFaceCenter] = useState(false);
  const [lastSnapType,setLastSnapType] = useState('');
  // Undo/Redo & face selection & boolean HUD
  interface SerializedMesh { uuid?: string; entityId?: string; color:number; positions: Float32Array; indices?: Uint32Array; matrix:number[]; }
  type Action = { type:'add'; mesh: SerializedMesh } | { type:'remove'; mesh: SerializedMesh } | { type:'boolean'; result: SerializedMesh; consumed: SerializedMesh[] } | { type:'modify'; before: SerializedMesh[]; after: SerializedMesh[] };
  const undoStackRef = useRef<Action[]>([]);
  const redoStackRef = useRef<Action[]>([]);
  const serializeMesh = (mesh:THREE.Mesh):SerializedMesh => {
    const g = mesh.geometry as THREE.BufferGeometry; const pos = g.getAttribute('position') as THREE.BufferAttribute; const positions = new Float32Array(pos.array as ArrayLike<number>);
    const idxAttr = g.getIndex(); const indices = idxAttr? new Uint32Array(idxAttr.array as ArrayLike<number>) : undefined;
    return { uuid: mesh.uuid, entityId: mesh.userData.entityId, color: (mesh.material as any).color?.getHex? (mesh.material as any).color.getHex():0xcccccc, positions, indices, matrix: mesh.matrix.toArray() };
  };
  const deserializeMesh = (data:SerializedMesh):THREE.Mesh => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data.positions),3)); if(data.indices) g.setIndex(new THREE.BufferAttribute(new Uint32Array(data.indices),1)); g.computeVertexNormals();
    const mat = RealisticRenderingEngine.createPBRMaterial({color:data.color, metalness:0.2, roughness:0.5});
    const mesh = new THREE.Mesh(g, mat); const m = new THREE.Matrix4().fromArray(data.matrix); mesh.applyMatrix4(m); mesh.userData.entityId = data.entityId || nextEntityId(); scene.add(mesh); registerMesh(mesh,'csg'); return mesh;
  };
  const pushAction = (act:Action) => { undoStackRef.current.push(act); redoStackRef.current.length=0; };
  const trimUndoStack = () => { const MAX=100; if(undoStackRef.current.length>MAX){ undoStackRef.current.splice(0, undoStackRef.current.length-MAX); } };
  const pushActionCapped = (act:Action) => { pushAction(act); trimUndoStack(); };
  const applySerializedMesh = (sm:SerializedMesh) => {
    const mesh = scene.getObjectByProperty('uuid', sm.uuid!) as THREE.Mesh; if(!mesh) return;
    const newG = new THREE.BufferGeometry();
    newG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sm.positions),3));
    if(sm.indices) newG.setIndex(new THREE.BufferAttribute(new Uint32Array(sm.indices),1));
    newG.computeVertexNormals();
    (mesh.geometry as THREE.BufferGeometry).dispose();
    mesh.geometry = newG;
    // matrix 恢复
    const mat4 = new THREE.Matrix4().fromArray(sm.matrix); mesh.matrix.copy(mat4); mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
    // material color (optional)
    const mat:any = mesh.material; if(mat?.color){ mat.color.setHex(sm.color); }
    featureNeedsRebuildRef.current = true; meshesNeedingFeatureRefresh.current.add(mesh.uuid);
  };
  const undo = () => { const act = undoStackRef.current.pop(); if(!act) return;
    if(act.type==='add'){
      const mesh = scene.getObjectByProperty('uuid', act.mesh.uuid!) as THREE.Mesh; if(mesh) removeMeshAndFeatures(mesh); redoStackRef.current.push(act);
    } else if(act.type==='remove'){
      deserializeMesh(act.mesh); featureNeedsRebuildRef.current=true; redoStackRef.current.push(act);
    } else if(act.type==='boolean'){
      const resMesh = scene.getObjectByProperty('uuid', act.result.uuid!) as THREE.Mesh; if(resMesh) removeMeshAndFeatures(resMesh); act.consumed.forEach(sm=>deserializeMesh(sm)); featureNeedsRebuildRef.current=true; redoStackRef.current.push(act);
    } else if(act.type==='modify'){
      // 恢复 before 状态
      act.before.forEach(sm=> applySerializedMesh(sm));
      redoStackRef.current.push(act);
    }
  };
  const redo = () => { const act = redoStackRef.current.pop(); if(!act) return;
    if(act.type==='add'){
      deserializeMesh(act.mesh); featureNeedsRebuildRef.current=true; undoStackRef.current.push(act);
    } else if(act.type==='remove'){
      const mesh = scene.getObjectByProperty('uuid', act.mesh.uuid!) as THREE.Mesh; if(mesh) removeMeshAndFeatures(mesh); undoStackRef.current.push(act);
    } else if(act.type==='boolean'){
      act.consumed.forEach(sm=>{ const existing = scene.getObjectByProperty('uuid', sm.uuid!) as THREE.Mesh; if(existing) removeMeshAndFeatures(existing); }); deserializeMesh(act.result); featureNeedsRebuildRef.current=true; undoStackRef.current.push(act);
    } else if(act.type==='modify'){
      act.after.forEach(sm=> applySerializedMesh(sm));
      undoStackRef.current.push(act);
    }
  };
  const selectedFacesRef = useRef<Map<string, Set<number>>>(new Map());
  const selectedFacesGroupRef = useRef<THREE.Group|null>(null);
  const rebuildSelectedFacesVisual = () => {
    if(!scene) return; if(!selectedFacesGroupRef.current){ selectedFacesGroupRef.current = new THREE.Group(); scene.add(selectedFacesGroupRef.current); }
    const grp=selectedFacesGroupRef.current; while(grp.children.length){ const c=grp.children.pop()!; (c as any).geometry?.dispose?.(); }
    selectedFacesRef.current.forEach((faceSet, uuid)=>{
      const mesh = scene.getObjectByProperty('uuid', uuid) as THREE.Mesh; if(!mesh) return; const geom = mesh.geometry as THREE.BufferGeometry; const index = geom.getIndex(); const pos = geom.getAttribute('position'); if(!index||!pos) return;
      faceSet.forEach(fi=>{ const tri=fi*3; const ids=[index.getX(tri),index.getX(tri+1),index.getX(tri+2)]; const vs=ids.map(i=>{ const v=new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)); mesh.localToWorld(v); return v; }); const loop=[...vs,vs[0]]; const g=new THREE.BufferGeometry().setFromPoints(loop); grp.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:0xff8800}))); });
    });
  };
  const [booleanStats,setBooleanStats] = useState<any>(null);
  const [booleanQuality,setBooleanQuality] = useState<any>(null);
  const [booleanMetrics,setBooleanMetrics] = useState<any>(null);
  useEffect(()=>{ const offC = eventBus.on('geometry:boolean:complete',(p:any)=>{ setBooleanStats(p.statistics); setBooleanQuality(p.quality); }); const offM = eventBus.on('geometry:boolean:metrics',(p:any)=> setBooleanMetrics(p)); return ()=>{ offC(); offM(); }; },[]);
  // 选面拉伸 / 视图对齐参数
  const [faceExtrudeDistance,setFaceExtrudeDistance] = useState(1);
  // Entity ID 生成
  const entityCounterRef = useRef(1);
  const nextEntityId = () => `entity_${entityCounterRef.current++}`;
  const registerMesh = (mesh:THREE.Mesh, source:'sample'|'extrude'|'boolean'|'csg') => {
    if(!mesh.userData.entityId) mesh.userData.entityId = nextEntityId();
    // Map to registry source union
    const sourceMap:Record<string,'dxf'|'extrude'|'csg'|'import'|'other'> = {
      sample:'other', extrude:'extrude', boolean:'csg', csg:'csg'
    };
    localGeometryRegistry.register({ uuid: mesh.uuid, entityId: mesh.userData.entityId, source: sourceMap[source] });
    // 增量追加特征点
    collectFeaturePointsForMesh(mesh, featurePointsRef.current);
  };
  // 特征点去重（距离阈值）
  const dedupeFeaturePoints = (arr:FeaturePoint[], eps=1e-5) => {
    const result:FeaturePoint[] = [];
    for(const fp of arr){
      let dup=false; for(const r of result){ if(r.pos.distanceToSquared(fp.pos)<eps*eps && r.type===fp.type){ dup=true; break; } }
      if(!dup) result.push(fp);
    }
    return result;
  };
  // 收集单个网格特征点（分类）
  const collectFeaturePointsForMesh = (mesh:THREE.Mesh, out:FeaturePoint[]) => {
    const geom = mesh.geometry as THREE.BufferGeometry;
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
    if(!posAttr) return;
    // 顶点
    for(let i=0;i<posAttr.count;i++){
      const v = new THREE.Vector3().fromBufferAttribute(posAttr,i); mesh.localToWorld(v);
      out.push({pos:v,type:'vertex', owner: mesh.uuid});
    }
    // 面/边 (假设三角面)
    for(let i=0;i<posAttr.count;i+=3){
      const a = new THREE.Vector3().fromBufferAttribute(posAttr,i); const b=new THREE.Vector3().fromBufferAttribute(posAttr,i+1); const c=new THREE.Vector3().fromBufferAttribute(posAttr,i+2);
      mesh.localToWorld(a); mesh.localToWorld(b); mesh.localToWorld(c);
      out.push({pos: a.clone().add(b).multiplyScalar(0.5), type:'edgeMid', owner: mesh.uuid});
      out.push({pos: b.clone().add(c).multiplyScalar(0.5), type:'edgeMid', owner: mesh.uuid});
      out.push({pos: c.clone().add(a).multiplyScalar(0.5), type:'edgeMid', owner: mesh.uuid});
      out.push({pos: a.clone().add(b).add(c).multiplyScalar(1/3), type:'faceCenter', owner: mesh.uuid});
    }
  };
  // 移除网格 + 增量删除特征点
  const removeMeshAndFeatures = (mesh:THREE.Mesh) => {
    featurePointsRef.current = featurePointsRef.current.filter(fp=>fp.owner !== mesh.uuid);
    mesh.parent?.remove(mesh);
    meshesNeedingFeatureRefresh.current.delete(mesh.uuid);
  };

  //============== 面选择衍生操作 ==============
  const computeSelectedFacesAverage = () => {
    const normals:THREE.Vector3[] = []; const centers:THREE.Vector3[] = [];
    selectedFacesRef.current.forEach((set, uuid)=>{
      const mesh = scene.getObjectByProperty('uuid', uuid) as THREE.Mesh; if(!mesh) return; const geom = mesh.geometry as THREE.BufferGeometry; const index = geom.getIndex(); const pos = geom.getAttribute('position'); if(!index||!pos) return;
      set.forEach(fi=>{ const tri=fi*3; const ia=index.getX(tri), ib=index.getX(tri+1), ic=index.getX(tri+2);
        const a=new THREE.Vector3(pos.getX(ia),pos.getY(ia),pos.getZ(ia)); const b=new THREE.Vector3(pos.getX(ib),pos.getY(ib),pos.getZ(ib)); const c=new THREE.Vector3(pos.getX(ic),pos.getY(ic),pos.getZ(ic));
        mesh.localToWorld(a); mesh.localToWorld(b); mesh.localToWorld(c);
        const n = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(b,a), new THREE.Vector3().subVectors(c,a)).normalize();
        const center = new THREE.Vector3().addVectors(a,b).add(c).multiplyScalar(1/3);
        normals.push(n); centers.push(center);
      });
    });
    if(!normals.length) return null;
    const avgNormal = normals.reduce((acc,n)=>acc.add(n), new THREE.Vector3()).normalize();
    const avgCenter = centers.reduce((acc,c)=>acc.add(c), new THREE.Vector3()).multiplyScalar(1/centers.length);
    return { avgNormal, avgCenter };
  };

  const faceNormalArrowRef = useRef<THREE.ArrowHelper|null>(null);
  const updateAverageNormalArrow = () => {
    if(!scene) return; const data = computeSelectedFacesAverage();
    if(!data){ if(faceNormalArrowRef.current){ scene.remove(faceNormalArrowRef.current); faceNormalArrowRef.current=null; } return; }
    const dir = data.avgNormal.clone(); const len=2; const origin = data.avgCenter.clone();
    if(!faceNormalArrowRef.current){ faceNormalArrowRef.current = new THREE.ArrowHelper(dir, origin, len, 0xffb74d); scene.add(faceNormalArrowRef.current); }
    else { faceNormalArrowRef.current.setDirection(dir); faceNormalArrowRef.current.position.copy(origin); faceNormalArrowRef.current.setLength(len); }
  };
  const alignCameraToSelectedFaces = () => {
    const data = computeSelectedFacesAverage(); if(!data) return;
    const dist = 6; // 视距
    const targetPos = new THREE.Vector3().copy(data.avgCenter).addScaledVector(data.avgNormal, dist);
    setCameraPosition(targetPos.x, targetPos.y, targetPos.z);
    lookAt(data.avgCenter.x, data.avgCenter.y, data.avgCenter.z);
    eventBus.emit('geometry:faceAlign:done', { normal: data.avgNormal.toArray(), center: data.avgCenter.toArray() });
    updateAverageNormalArrow();
  };

  const extrudeSelectedFaces = () => {
    const d = faceExtrudeDistance; if(!d) return;
    const before:SerializedMesh[] = []; const after:SerializedMesh[] = [];
    selectedFacesRef.current.forEach((set, uuid)=>{
      const mesh = scene.getObjectByProperty('uuid', uuid) as THREE.Mesh; if(!mesh) return; const geom = mesh.geometry as THREE.BufferGeometry; const index = geom.getIndex(); const posAttr = geom.getAttribute('position') as THREE.BufferAttribute; if(!index||!posAttr) return;
      before.push(serializeMesh(mesh));
      // 收集顶点位移
      const displacement = new Map<number, THREE.Vector3>();
      set.forEach(fi=>{
        const tri = fi*3; const ia=index.getX(tri), ib=index.getX(tri+1), ic=index.getX(tri+2);
        const a=new THREE.Vector3(posAttr.getX(ia),posAttr.getY(ia),posAttr.getZ(ia));
        const b=new THREE.Vector3(posAttr.getX(ib),posAttr.getY(ib),posAttr.getZ(ib));
        const c=new THREE.Vector3(posAttr.getX(ic),posAttr.getY(ic),posAttr.getZ(ic));
        const n = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(b,a), new THREE.Vector3().subVectors(c,a)).normalize();
        const disp = n.clone().multiplyScalar(d);
        [ia,ib,ic].forEach(id=>{ if(!displacement.has(id)) displacement.set(id, disp.clone()); else displacement.get(id)!.add(disp); });
      });
      // 应用 (平均化重复加权)
      displacement.forEach((v, id)=>{ v.multiplyScalar(1); posAttr.setXYZ(id, posAttr.getX(id)+v.x, posAttr.getY(id)+v.y, posAttr.getZ(id)+v.z); });
      posAttr.needsUpdate = true; geom.computeVertexNormals(); meshesNeedingFeatureRefresh.current.add(uuid);
      after.push(serializeMesh(mesh));
    });
    if(before.length){ pushActionCapped({type:'modify', before, after}); }
    featureNeedsRebuildRef.current=true; updateAverageNormalArrow();
    eventBus.emit('geometry:faceExtrude:created',{ mode:'inplace', count: Array.from(selectedFacesRef.current.values()).reduce((a,s)=>a+s.size,0), distance:d });
  };
  
  // 使用真实级渲染引擎
  const {
    mountRef,
    engine,
    scene,
    camera,
    isInitialized,
    render,
    setQuality,
    updatePostProcessing,
    getStats,
    addToScene,
    setCameraPosition,
    lookAt
  } = useRealisticRendering({
    qualityLevel,
    autoResize: true,
    enableStats: true
  });

  const controlsRef = useRef<OrbitControls | null>(null);
  const frameRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 初始化3D场景内容
  useEffect(() => {
    if (!isInitialized || !engine) return;

    console.log('🎨 SimpleViewport3D: 使用真实级渲染引擎初始化场景');

    try {
      // 设置相机位置
      setCameraPosition(8, 6, 8);
      lookAt(0, 0, 0);

      // 添加现代化照明系统
      const setupLighting = () => {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        addToScene(ambientLight);

        // 主光源
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.setScalar(2048);
        directionalLight.shadow.bias = -0.001;
        addToScene(directionalLight);

        // 补光
        const fillLight = new THREE.DirectionalLight(0x9bb7ff, 0.3);
        fillLight.position.set(-5, 3, -5);
        addToScene(fillLight);
      };

      setupLighting();

      // 创建轨道控制器（使用渲染引擎的渲染器）
      if (engine && mountRef.current) {
        const controls = new OrbitControls(camera, engine.getRenderer().domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.enableRotate = true;
        controls.minDistance = 2;
        controls.maxDistance = 50;
        controlsRef.current = controls;
      }

      // 创建现代化网格系统
      const createModernGrid = () => {
        const gridGroup = new THREE.Group();
        
        // 主网格 - 使用PBR材质
        const mainGrid = new THREE.GridHelper(20, 20, 0x1a2332, 0x1a2332);
        (mainGrid.material as THREE.Material).transparent = true;
        (mainGrid.material as THREE.Material).opacity = 0.6;
        gridGroup.add(mainGrid);
        
        // 细网格
        const subGrid = new THREE.GridHelper(20, 40, 0x0f1419, 0x0f1419);
        (subGrid.material as THREE.Material).transparent = true;
        (subGrid.material as THREE.Material).opacity = 0.2;
        subGrid.position.y = -0.01;
        gridGroup.add(subGrid);
        
        return gridGroup;
      };

      // 首先完全清空场景
      console.log('🧹 开始清空场景...');
      scene.clear(); // 完全清空场景
      
      // 重新添加基础元素
      console.log('🔧 重新添加基础元素...');
      
      const modernGrid = createModernGrid();
      addToScene(modernGrid);

      // 注意：现代化坐标轴将通过 useModernAxis hook 添加

      // 持续监控并阻止任何不需要的对象被添加
      let clearIntervalId = setInterval(() => {
        const toRemove: THREE.Object3D[] = [];
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // 只允许网格和坐标轴
            const allowedNames = ['ground', 'simple-axes'];
            const isGrid = child.name && child.name.includes('grid');
            const isAxis = child.name && (child.name.includes('axis') || child.name.includes('helper'));
            const isAllowed = child.name && allowedNames.includes(child.name);
            
            if (!isGrid && !isAxis && !isAllowed) {
              toRemove.push(child);
              console.log(`🚫 阻止加载不需要的对象: ${child.type} - ${child.name || '(无名称)'} - ${child.constructor.name}`);
            }
          }
        });
        
        toRemove.forEach(obj => {
          if (obj.parent) {
            obj.parent.remove(obj);
          }
          if (obj instanceof THREE.Mesh) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
              } else {
                obj.material.dispose();
              }
            }
          }
        });
      }, 100); // 每100ms检查一次
      
      // 10秒后停止监控（应该足够阻止初始加载）
      setTimeout(() => {
        if (clearIntervalId) {
          clearInterval(clearIntervalId);
          console.log('⏰ 停止场景监控');
        }
      }, 10000);

      // 移除示例几何体
      // if (mode === 'geometry') {
      //   const addSample = (x:number,color:number) => {
      //     const g = new THREE.BoxGeometry(2,2,2);
      //     const m = RealisticRenderingEngine.createPBRMaterial({color,metalness:0.2,roughness:0.5});
      //     const mesh = new THREE.Mesh(g,m);
      //     mesh.position.set(x,1,0);
      //     mesh.castShadow = true; mesh.receiveShadow = true; addToScene(mesh);
      //     registerMesh(mesh,'sample');
      //   };
      //   addSample(0,0x00d9ff);
      //   addSample(3,0xff6b35);
      // }

      // 创建动画循环
      const animate = () => {
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current);
        }
        frameRef.current = requestAnimationFrame(animate);
        
        // 强力清理所有不需要的模型（防止任何形式的异步模型加载）
        if (scene) {
          const toRemove: THREE.Object3D[] = [];
          scene.traverse((child) => {
            // 移除所有Mesh对象，除了明确允许的类型
            if (child instanceof THREE.Mesh) {
              const allowedNames = ['ground', 'simple-axes'];
              const allowedTypes = ['GridHelper', 'AxesHelper'];
              
              const isAllowedByName = child.name && allowedNames.includes(child.name);
              const isAllowedByType = allowedTypes.includes(child.constructor.name);
              const isGridOrAxis = child.name && (child.name.includes('grid') || child.name.includes('axis') || child.name.includes('helper'));
              
              if (!isAllowedByName && !isAllowedByType && !isGridOrAxis) {
                toRemove.push(child);
                console.log(`🗑️ 移除不需要的对象: ${child.type} - ${child.name || '(无名称)'} - ${child.constructor.name}`);
              }
            }
          });
          
          toRemove.forEach(obj => {
            if (obj.parent) {
              obj.parent.remove(obj);
            }
            // 强制销毁几何体和材质
            if (obj instanceof THREE.Mesh) {
              if (obj.geometry) {
                obj.geometry.dispose();
              }
              if (obj.material) {
                if (Array.isArray(obj.material)) {
                  obj.material.forEach(m => m.dispose());
                } else {
                  obj.material.dispose();
                }
              }
            }
          });
        }
        
        // 更新控制器
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        
        // 渲染
        render();
      };

      animate();
      
      // 调试: 列出场景中的所有对象
      console.log('🎉 SimpleViewport3D: 真实级渲染场景初始化成功');
      console.log('📋 场景中的对象列表:');
      scene.traverse((child) => {
        console.log(`- ${child.type}: ${child.name || '(无名称)'} - ${child.constructor.name}`);
      });

      // 清理函数
      return () => {
        console.log('SimpleViewport3D: 清理资源');
        
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current);
        }
        
        if (controlsRef.current) {
          controlsRef.current.dispose();
          controlsRef.current = null;
        }
        
        // 清理定时器
        if (clearIntervalId) {
          clearInterval(clearIntervalId);
        }
      };
    } catch (err) {
      console.error('SimpleViewport3D: 3D场景初始化失败:', err);
    }
  }, [isInitialized, engine, mode, addToScene, setCameraPosition, lookAt, render]);

  // 挂载时可隐藏旧版 CADToolbar
  useEffect(()=>{ if(suppressLegacyToolbar){ eventBus.emit('ui:hideCADToolbar',{}); } },[suppressLegacyToolbar]);

  // 事件监听：工具切换 / 拉伸参数 / 布尔操作
  useEffect(()=>{
    const offTool = eventBus.on('geometry:tool',(p:any)=>{ setActiveTool(p.tool); });
    const offExtrudeParam = eventBus.on('geometry:extrude:param',(p:any)=>{ if (p?.height) setExtrudeHeight(p.height); performExtrude(); });
    const offBoolean = eventBus.on('geometry:boolean:op',(p:any)=>{ if(p?.op){ pendingBooleanOpRef.current = p.op; performBooleanOperation(); }});
    return ()=>{ offTool(); offExtrudeParam(); offBoolean(); };
  },[selection, extrudeHeight]);

  // 射线与拾取
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerNDC = useRef(new THREE.Vector2());

  const getIntersections = useCallback((clientX:number, clientY:number)=>{
    if(!engine || !camera || !mountRef.current) return [] as THREE.Intersection[];
    const rect = engine.getRenderer().domElement.getBoundingClientRect();
    pointerNDC.current.x = ((clientX - rect.left)/rect.width)*2 -1;
    pointerNDC.current.y = -(((clientY - rect.top)/rect.height)*2 -1);
    raycasterRef.current.setFromCamera(pointerNDC.current,camera);
    const objs = [] as THREE.Object3D[];
    scene.traverse(o=>{ if((o as THREE.Mesh).isMesh) objs.push(o); });
    return raycasterRef.current.intersectObjects(objs,true);
  },[engine,camera,scene]);

  // 选择逻辑
  const applySelectionHighlight = useCallback(()=>{
    // 简单高亮：更改材质颜色发光
    selection.forEach(m=>{ (m.material as any).emissive = new THREE.Color(0x222222); (m.material as any).emissiveIntensity = 1; });
  },[selection]);

  const clearSelectionHighlight = () => {
    scene.traverse(o=>{ if((o as THREE.Mesh).isMesh){ const mat:any = (o as THREE.Mesh).material; if(mat?.emissive) { mat.emissive = new THREE.Color(0x000000); mat.emissiveIntensity=0; } } });
  };

  const setSelectionSafe = (meshes:THREE.Mesh[], append=false) => {
    clearSelectionHighlight();
    setSelection(prev=> append ? Array.from(new Set([...prev,...meshes])) : meshes);
  };

  useEffect(()=>{ applySelectionHighlight(); },[selection, applySelectionHighlight]);

  // 草图辅助线更新
  const updateSketchLine = () => {
    if(!scene) return;
    const pts = sketchPoints.map(p=>p.clone());
    if(isSketchClosed && pts.length>2) pts.push(pts[0].clone());
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    if(!sketchLineRef.current){
      const mat = new THREE.LineBasicMaterial({color:0xffff00});
      sketchLineRef.current = new THREE.Line(geom,mat);
      sketchLineRef.current.name = 'sketch-line';
      scene.add(sketchLineRef.current);
    } else {
      sketchLineRef.current.geometry.dispose();
      sketchLineRef.current.geometry = geom;
    }
  };

  // 生成草图预览面 (仅平面多边形)
  const updateSketchPreviewFace = () => {
    if(!scene) return;
    if(!isSketchClosed || sketchPoints.length<3){
      if(sketchPreviewMeshRef.current){ scene.remove(sketchPreviewMeshRef.current); sketchPreviewMeshRef.current.geometry.dispose(); sketchPreviewMeshRef.current = null; }
      return;
    }
    const shape = new THREE.Shape(sketchPoints.map(p=> new THREE.Vector2(p.x,p.z)));
    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshBasicMaterial({color:0x00d9ff, transparent:true, opacity:0.25, side:THREE.DoubleSide, depthWrite:false});
    if(sketchPreviewMeshRef.current){ scene.remove(sketchPreviewMeshRef.current); sketchPreviewMeshRef.current.geometry.dispose(); }
    const mesh = new THREE.Mesh(geo,mat); mesh.rotation.x = -Math.PI/2; mesh.position.y = 0.001; sketchPreviewMeshRef.current = mesh; scene.add(mesh);
  };

  // 执行拉伸
  const performExtrude = async () => {
    if(!isSketchClosed || sketchPoints.length<3 || !scene) return;
    const shape = new THREE.Shape(sketchPoints.map(p=> new THREE.Vector2(p.x,p.z)));
    const extrudeGeo = new THREE.ExtrudeGeometry(shape,{depth: extrudeHeight, bevelEnabled:false});
    extrudeGeo.rotateX(-Math.PI/2);
    const mat = RealisticRenderingEngine.createPBRMaterial({color:0x55ff99, metalness:0.15, roughness:0.6});
    const mesh = new THREE.Mesh(extrudeGeo, mat);
    mesh.position.y = 0; mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    registerMesh(mesh,'extrude');
    featureNeedsRebuildRef.current = true;
  pushActionCapped({type:'add', mesh: serializeMesh(mesh)});
    eventBus.emit('geometry:extrude:created',{height:extrudeHeight, vertices: extrudeGeo.attributes.position.count});
    // 重置草图
    setSketchPoints([]); setIsSketchClosed(false);
    if(sketchLineRef.current){ scene.remove(sketchLineRef.current); sketchLineRef.current.geometry.dispose(); sketchLineRef.current=null; }
    if(sketchPreviewMeshRef.current){ scene.remove(sketchPreviewMeshRef.current); sketchPreviewMeshRef.current.geometry.dispose(); sketchPreviewMeshRef.current=null; }
  };

  // 布尔操作
  const performBooleanOperation = async () => {
    if(selection.length<2) return;
    const op = pendingBooleanOpRef.current; if(!op) return;
    if(booleanMode==='local'){
      try {
  // 动态导入 three-csg-ts（存在则使用，不存在自动回退后端）
  // 使用 /* @vite-ignore */ 防止 Vite 预打包阶段强解析导致启动失败
  // @ts-ignore
  const mod = await import(/* @vite-ignore */ 'three-csg-ts').catch(()=>null);
        if(!mod){ throw new Error('three-csg-ts 不可用'); }
        const CSG = (mod as any).CSG; // runtime
        let base = CSG.fromMesh(selection[0]);
        for(let i=1;i<selection.length;i++){
          const cur = CSG.fromMesh(selection[i]);
          if(op==='union') base = base.union(cur);
          else if(op==='subtract') base = base.subtract(cur);
          else if(op==='intersect') base = base.intersect(cur);
        }
        const baseMat = selection[0].material;
        const clonedMat = Array.isArray(baseMat) ? baseMat[0] : (baseMat as THREE.Material).clone();
        const resultMesh = CSG.toMesh(base, selection[0].matrix, clonedMat);
  const consumed = preserveOriginal? [] : selection;
  consumed.forEach(m=> removeMeshAndFeatures(m));
  scene.add(resultMesh);
  registerMesh(resultMesh,'csg');
  setSelection([resultMesh]);
  pushActionCapped({type:'boolean', result: serializeMesh(resultMesh), consumed: consumed.map(serializeMesh)});
        eventBus.emit('geometry:boolean',{mode:'local', op, parts: selection.length});
      } catch(e){
        console.warn('[CSG] 本地 three-csg-ts 不可用或运算失败，自动回退后端布尔。', e);
        await performBackendBoolean(op);
      }
    } else {
      await performBackendBoolean(op);
    }
    pendingBooleanOpRef.current = null;
  };

  const performBackendBoolean = async (op:string) => {
    if(selection.length<2) return;
    const target = selection[0];
    const tools = selection.slice(1);
    eventBus.emit('geometry:boolean:start',{ mode:'backend', op, object: target.userData.entityId, tools: tools.map(t=>t.userData.entityId)});
    try {
      selection.forEach(m=>{ if(!m.userData.entityId) registerMesh(m,'boolean'); });
      const config:any = {
        operation: op==='union'?'union': (op==='subtract'?'difference':'intersection'),
        objectEntityIds: [target.userData.entityId],
        toolEntityIds: tools.map(t=>t.userData.entityId),
        tolerance: 1e-6,
        preserveOriginal
      };
      const result = await geometryAlgorithmIntegration.performDXFBooleanOperation(config);
      if(result && result.geometry){
        // 构建新几何
        const geomData = result.geometry;
        const g = new THREE.BufferGeometry();
        const flatVerts = new Float32Array(geomData.vertices.flat());
        g.setAttribute('position', new THREE.BufferAttribute(flatVerts,3));
        if(geomData.faces && geomData.faces.length){
          const flatIdx = new Uint32Array(geomData.faces.flat());
          g.setIndex(new THREE.BufferAttribute(flatIdx,1));
        }
        g.computeVertexNormals();
        const mat = RealisticRenderingEngine.createPBRMaterial({color:0x0099ff, metalness:0.25, roughness:0.55});
        // 移除/保留
  const consumed = preserveOriginal? [] : selection;
  if(!preserveOriginal){ consumed.forEach(m=> removeMeshAndFeatures(m)); }
        const newMesh = new THREE.Mesh(g, mat);
        newMesh.castShadow = true; newMesh.receiveShadow = true;
        scene.add(newMesh);
  registerMesh(newMesh,'boolean');
  pushActionCapped({type:'boolean', result: serializeMesh(newMesh), consumed: consumed.map(serializeMesh)});
        // 更新 registry geometryTag
        if(result.resultTags && result.resultTags.length){
          // 对结果主标签选用第一个
          const tag = result.resultTags[0];
          localGeometryRegistry.updateGeometryTag(newMesh.userData.entityId, tag);
          eventBus.emit('geometry:boolean:tags',{ entity: newMesh.userData.entityId, tags: result.resultTags });
        }
        eventBus.emit('geometry:boolean:metrics',{ volume: geomData.volume, surfaceArea: geomData.surface_area });
        setSelection([newMesh]);
        eventBus.emit('geometry:boolean:complete',{ mode:'backend', op, object: newMesh.userData.entityId, tools: tools.map(t=>t.userData.entityId), statistics: (result as any).statistics, quality: (result as any).quality });
      } else {
        eventBus.emit('geometry:boolean:fail',{ mode:'backend', op, reason:'empty' });
      }
    } catch(e){
      console.error('后端布尔失败', e);
      eventBus.emit('geometry:boolean:fail',{ mode:'backend', op, error: String(e) });
    }
  };

  // 测量更新
  const updateMeasurementVisual = () => {
    if(!scene) return;
    if(!measureOverlayGroupRef.current){
      measureOverlayGroupRef.current = new THREE.Group();
      measureOverlayGroupRef.current.name='measure-overlay';
      scene.add(measureOverlayGroupRef.current);
    }
    // 线
    const pts = measurePoints.map(p=>p.clone());
    if(measurementMode==='polyline' && pts.length>1){ /* open polyline */ }
    if(measurementMode==='area' && pts.length>2){ pts.push(pts[0].clone()); }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    if(!measureLineRef.current){
      const mat = new THREE.LineBasicMaterial({color:0xffaa00});
      measureLineRef.current = new THREE.Line(geom,mat);
      measureOverlayGroupRef.current.add(measureLineRef.current);
    } else { measureLineRef.current.geometry.dispose(); measureLineRef.current.geometry = geom; }
    // 角度弧线
    if(measurementMode==='angle'){
      if(measureAngleArcRef.current){ measureAngleArcRef.current.parent?.remove(measureAngleArcRef.current); measureAngleArcRef.current.geometry.dispose(); measureAngleArcRef.current=null; }
      if(measurePoints.length===3){
        const arc = buildAngleArc(measurePoints[0], measurePoints[1], measurePoints[2]);
        if(arc){ measureAngleArcRef.current = arc; measureOverlayGroupRef.current.add(arc); }
      }
    } else if(measureAngleArcRef.current){ measureAngleArcRef.current.parent?.remove(measureAngleArcRef.current); measureAngleArcRef.current.geometry.dispose(); measureAngleArcRef.current=null; }
    // 结果计算
    let distance = 0, area = 0, angle = 0;
    if(measurementMode==='distance' && pts.length===2){ distance = pts[0].distanceTo(pts[1]); }
    if(measurementMode==='polyline' && pts.length>1){ for(let i=0;i<pts.length-1;i++) distance += pts[i].distanceTo(pts[i+1]); }
    if(measurementMode==='area' && measurePoints.length>2){
      // 简单平面投影到 XZ 计算面积 (假设水平)
      for(let i=0;i<measurePoints.length;i++){
        const a = measurePoints[i]; const b = measurePoints[(i+1)%measurePoints.length];
        area += (a.x*b.z - b.x*a.z);
      }
      area = Math.abs(area)/2.0;
    }
    if(measurementMode==='angle' && measurePoints.length===3){
      const v1 = new THREE.Vector3().subVectors(measurePoints[0], measurePoints[1]).normalize();
      const v2 = new THREE.Vector3().subVectors(measurePoints[2], measurePoints[1]).normalize();
      angle = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(v1.dot(v2),-1,1)));
    }
    eventBus.emit('measurement:update',{mode:measurementMode, distance, area, angle, points: measurePoints.length});
  };

  const buildAngleArc = (a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3):THREE.Line | null => {
    const v1 = new THREE.Vector3().subVectors(a,b); const v2 = new THREE.Vector3().subVectors(c,b);
    if(v1.lengthSq()<1e-6 || v2.lengthSq()<1e-6) return null;
    const n = new THREE.Vector3().crossVectors(v1,v2).normalize(); if(n.lengthSq()<1e-6) return null;
    const r = Math.min(v1.length(), v2.length())*0.3; v1.normalize(); v2.normalize();
    const ang = Math.acos(THREE.MathUtils.clamp(v1.dot(v2),-1,1)); const seg=32; const pts:THREE.Vector3[]=[];
    for(let i=0;i<=seg;i++){ const t=i/seg; const dir = new THREE.Vector3().copy(v1).applyAxisAngle(n, ang*t).normalize(); pts.push(new THREE.Vector3().copy(b).addScaledVector(dir,r)); }
    const g=new THREE.BufferGeometry().setFromPoints(pts); const m=new THREE.LineBasicMaterial({color:0x44ddff}); return new THREE.Line(g,m);
  };

  // 捕捉计算（分类 + 过滤 + 网格备选）
  const applySnapping = (raw:THREE.Vector3) => {
    if(!enableSnapping) return raw;
    rebuildFeaturePointsIfNeeded();
    let best:FeaturePoint | null = null; let bestD = Infinity; const threshold=0.35;
    const priority:Record<string,number> = { vertex:0, edgeMid:1, faceCenter:2, grid:3 };
    for(const fp of featurePointsRef.current){
      if((fp.type==='vertex' && !snapUseVertex) || (fp.type==='edgeMid' && !snapUseEdgeMid) || (fp.type==='faceCenter' && !snapUseFaceCenter)) continue;
      const d = fp.pos.distanceTo(raw);
      const better = d<bestD - 1e-6 || (Math.abs(d-bestD)<1e-6 && best && priority[fp.type]<priority[best.type]);
      if(better){ bestD=d; best=fp; }
    }
    if(best && bestD < threshold){ updateSnapMarker(best.pos, best.type); return best.pos.clone(); }
    const s=0.5; const grid = new THREE.Vector3(Math.round(raw.x/s)*s, raw.y, Math.round(raw.z/s)*s); updateSnapMarker(grid,'grid'); return grid;
  };

  const updateSnapMarker = (pos:THREE.Vector3, type:string)=>{
    if(!scene) return; if(!snapMarkerRef.current){ const g=new THREE.SphereGeometry(0.07,16,16); const m=new THREE.MeshBasicMaterial({color:0xffff00}); snapMarkerRef.current=new THREE.Mesh(g,m); scene.add(snapMarkerRef.current); }
    const colorMap:Record<string,number> = { vertex:0xffff00, edgeMid:0x00ffff, faceCenter:0xff55ff, grid:0xffffff };
    const scaleMap:Record<string,number> = { vertex:1.2, edgeMid:1.0, faceCenter:0.9, grid:0.8 };
    (snapMarkerRef.current.material as THREE.MeshBasicMaterial).color.setHex(colorMap[type]||0xffffff);
    const s = scaleMap[type]||1;
    snapMarkerRef.current.scale.setScalar(s);
    snapMarkerRef.current.position.copy(pos).add(new THREE.Vector3(0,0.02,0));
    setLastSnapType(type);
  };

  const rebuildFeaturePointsIfNeeded = () => {
    if(!featureNeedsRebuildRef.current || !scene) return;
    // 若有指定需刷新网格则仅替换其 owner 特征点
    if(meshesNeedingFeatureRefresh.current.size && scene){
      const owners = meshesNeedingFeatureRefresh.current;
      featurePointsRef.current = featurePointsRef.current.filter(fp=> !owners.has(fp.owner));
      scene.traverse(o=>{ if((o as THREE.Mesh).isMesh && owners.has(o.uuid)){ collectFeaturePointsForMesh(o as THREE.Mesh, featurePointsRef.current); } });
      meshesNeedingFeatureRefresh.current.clear();
    } else {
      const list:FeaturePoint[] = [];
      scene.traverse(o=>{ if((o as THREE.Mesh).isMesh){ collectFeaturePointsForMesh(o as THREE.Mesh, list); } });
      featurePointsRef.current = list;
    }
    // 去重 & 完成
    featurePointsRef.current = dedupeFeaturePoints(featurePointsRef.current);
    featureNeedsRebuildRef.current=false;
  };

  const updateSubElementHighlight = (intersection:THREE.Intersection | null) => {
    if(!scene) return; if(!subHighlightGroupRef.current){ subHighlightGroupRef.current=new THREE.Group(); scene.add(subHighlightGroupRef.current); }
    const grp=subHighlightGroupRef.current; while(grp.children.length){ const c=grp.children.pop()!; (c as any).geometry?.dispose?.(); }
    if(!intersection) return; const mesh=intersection.object as THREE.Mesh; const geom=mesh.geometry as THREE.BufferGeometry; const index=geom.getIndex(); const pos=geom.getAttribute('position');
    if(selectionGranularity==='face' && intersection.faceIndex!=null && index){ const tri=intersection.faceIndex*3; const ids=[index.getX(tri),index.getX(tri+1),index.getX(tri+2)]; const vs=ids.map(i=>{ const v=new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)); mesh.localToWorld(v); return v; }); const loop=[...vs,vs[0]]; const g=new THREE.BufferGeometry().setFromPoints(loop); grp.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:0xffff00}))); }
    if(selectionGranularity==='vertex'){ const s=new THREE.Mesh(new THREE.SphereGeometry(0.08,12,12), new THREE.MeshBasicMaterial({color:0xffff00})); s.position.copy(intersection.point); grp.add(s); }
    if(selectionGranularity==='edge' && intersection.faceIndex!=null && index){ const tri=intersection.faceIndex*3; const vids=[index.getX(tri),index.getX(tri+1),index.getX(tri+2)]; let best:[number,number]|null=null; let bestD=Infinity; for(let i=0;i<3;i++){ const aIdx=vids[i]; const bIdx=vids[(i+1)%3]; const a=new THREE.Vector3(pos.getX(aIdx),pos.getY(aIdx),pos.getZ(aIdx)); const b=new THREE.Vector3(pos.getX(bIdx),pos.getY(bIdx),pos.getZ(bIdx)); mesh.localToWorld(a); mesh.localToWorld(b); const d=pointToSegmentDistance(intersection.point,a,b); if(d<bestD){ bestD=d; best=[aIdx,bIdx]; } } if(best){ const a=new THREE.Vector3(pos.getX(best[0]),pos.getY(best[0]),pos.getZ(best[0])); const b=new THREE.Vector3(pos.getX(best[1]),pos.getY(best[1]),pos.getZ(best[1])); mesh.localToWorld(a); mesh.localToWorld(b); const g=new THREE.BufferGeometry().setFromPoints([a,b]); grp.add(new THREE.Line(g, new THREE.LineBasicMaterial({color:0xffff00}))); } }
  };

  const pointToSegmentDistance = (p:THREE.Vector3,a:THREE.Vector3,b:THREE.Vector3) => { const ab=new THREE.Vector3().subVectors(b,a); const t=THREE.MathUtils.clamp(new THREE.Vector3().subVectors(p,a).dot(ab)/ab.lengthSq(),0,1); const proj=new THREE.Vector3().copy(a).addScaledVector(ab,t); return proj.distanceTo(p); };

  // 鼠标事件处理
  useEffect(()=>{
    if(!engine || !mountRef.current || !camera) return;
    const dom = engine.getRenderer().domElement;

  const onPointerDown = (e:MouseEvent) => {
      if(activeTool==='select') {
        const ints = getIntersections(e.clientX,e.clientY);
        if(ints.length){
          const mesh = ints[0].object as THREE.Mesh;
          setSelectionSafe([mesh], e.shiftKey);
        } else { setSelectionSafe([]); }
      } else if(activeTool==='sketch') {
        // 投影到水平面 y=0
        const ints = getIntersections(e.clientX,e.clientY);
        let point:THREE.Vector3 | null = null;
        if(ints.length){ point = ints[0].point.clone(); }
        else {
          // 射线与平面
          const rect = dom.getBoundingClientRect();
          pointerNDC.current.x = ((e.clientX - rect.left)/rect.width)*2 -1;
          pointerNDC.current.y = -(((e.clientY - rect.top)/rect.height)*2 -1);
          raycasterRef.current.setFromCamera(pointerNDC.current,camera);
          const plane = new THREE.Plane(new THREE.Vector3(0,1,0),0);
          const hit = new THREE.Vector3();
            raycasterRef.current.ray.intersectPlane(plane, hit);
            point = hit;
        }
        if(point){
          point = applySnapping(point);
          setSketchPoints(prev=>[...prev, point!]);
        }
      } else if(activeTool==='measure') {
        const ints = getIntersections(e.clientX,e.clientY);
        let point:THREE.Vector3 | null = null;
        if(ints.length) point = applySnapping(ints[0].point.clone());
        if(point) {
          setMeasurePoints(prev=>{
            const next = [...prev, point!];
            return next;
          });
        }
      }
      else if(activeTool==='faceSelect') {
        const ints = getIntersections(e.clientX,e.clientY);
        if(ints.length && ints[0].faceIndex!=null){
          const mesh = ints[0].object as THREE.Mesh; const fi = Math.floor(ints[0].faceIndex/1);
          let set = selectedFacesRef.current.get(mesh.uuid); if(!set){ set=new Set(); selectedFacesRef.current.set(mesh.uuid,set); }
          if(e.shiftKey){ if(set.has(fi)) set.delete(fi); else set.add(fi); }
          else { set.clear(); set.add(fi); }
          rebuildSelectedFacesVisual(); updateAverageNormalArrow();
        }
      }
    };

    const onDoubleClick = (e:MouseEvent) => {
      if(activeTool==='sketch' && sketchPoints.length>2 && !isSketchClosed){ setIsSketchClosed(true); }
      if(activeTool==='measure') {
        if(measurementMode==='distance' && measurePoints.length>=2) { /* finalize */ }
        if(measurementMode==='polyline') { /* keep adding until reset */ }
        if(measurementMode==='area' && measurePoints.length>2) { /* close */ }
        if(measurementMode==='angle' && measurePoints.length===3) { /* finalize */ }
      }
    };

    const onPointerMove = (e:MouseEvent) => {
      if(activeTool==='select' && selectionGranularity!=='object'){
        const ints = getIntersections(e.clientX,e.clientY);
        updateSubElementHighlight(ints.length?ints[0]:null);
      }
    };

    const onKeyDown = (e:KeyboardEvent) => {
      if(e.key==='Escape'){
        if(activeTool==='sketch' && sketchPoints.length) resetSketch();
        if(activeTool==='measure' && measurePoints.length) resetMeasurement();
      }
      // 测量局部撤销
      if(e.key==='z' && (e.metaKey || e.ctrlKey) && activeTool==='measure'){ e.preventDefault(); setMeasurePoints(p=>p.slice(0,-1)); return; }
      // 草图局部撤销 (合并点)
      if(e.key==='z' && (e.metaKey || e.ctrlKey) && activeTool==='sketch') { e.preventDefault(); undoSketchPointGroup(); return; }
      // 全局撤销 / 重做
      if(e.key==='z' && (e.metaKey || e.ctrlKey) && e.shiftKey){ e.preventDefault(); redo(); return; }
      if(e.key==='y' && (e.metaKey || e.ctrlKey)){ e.preventDefault(); redo(); return; }
      if(e.key==='z' && (e.metaKey || e.ctrlKey)){ e.preventDefault(); undo(); return; }
      // 选面快捷键
      if(activeTool==='faceSelect'){
        if(e.key==='e'){ extrudeSelectedFaces(); }
        if(e.key==='v'){ alignCameraToSelectedFaces(); }
      }
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('dblclick', onDoubleClick);
    dom.addEventListener('pointermove', onPointerMove);
    window.addEventListener('keydown', onKeyDown);
  return ()=>{ dom.removeEventListener('pointerdown', onPointerDown); dom.removeEventListener('dblclick', onDoubleClick); dom.removeEventListener('pointermove', onPointerMove); window.removeEventListener('keydown', onKeyDown); };
  },[engine, camera, activeTool, getIntersections, sketchPoints, isSketchClosed, measurementMode, measurePoints, enableSnapping, selectionGranularity]);

  // 草图点添加分组撤销
  const sketchHistoryRef = useRef<THREE.Vector3[][]>([]);
  const lastSketchAddRef = useRef<number>(0);
  const groupInterval = 800; // ms
  const undoSketchPointGroup = () => {
    setSketchPoints(prev=>{
      if(!prev.length) return prev;
      if(sketchHistoryRef.current.length){ const snap = sketchHistoryRef.current.pop()!; return snap; }
      return prev.slice(0,-1);
    });
  };
  // 监视草图点添加 (pointerDown 中已经 push 了新点) - 我们在 sketchPoints 变化时决定是否创建快照
  useEffect(()=>{
    if(!sketchPoints.length) { sketchHistoryRef.current=[]; return; }
    const now = Date.now();
    if(now - lastSketchAddRef.current > groupInterval){ // 新组开始 => 保存当前(变化前)快照
      // 保存当前状态去除最后一个点 (回退目标)
      const currentWithoutLast = sketchPoints.slice(0,-1).map(v=>v.clone());
      sketchHistoryRef.current.push(currentWithoutLast);
    }
    lastSketchAddRef.current = now;
  },[sketchPoints]);

  // 更新草图与预览
  useEffect(()=>{ updateSketchLine(); updateSketchPreviewFace(); },[sketchPoints, isSketchClosed]);

  // 更新测量
  useEffect(()=>{ updateMeasurementVisual(); },[measurePoints, measurementMode]);

  const resetMeasurement = () => { setMeasurePoints([]); if(measureLineRef.current){ measureLineRef.current.geometry.dispose(); measureLineRef.current.parent?.remove(measureLineRef.current); measureLineRef.current=null; } if(measureAngleArcRef.current){ measureAngleArcRef.current.geometry.dispose(); measureAngleArcRef.current.parent?.remove(measureAngleArcRef.current); measureAngleArcRef.current=null; } };
  const undoMeasurementPoint = () => setMeasurePoints(p=>p.slice(0,-1));

  const resetSketch = () => { setSketchPoints([]); setIsSketchClosed(false); if(sketchLineRef.current){ scene.remove(sketchLineRef.current); sketchLineRef.current.geometry.dispose(); sketchLineRef.current=null;} if(sketchPreviewMeshRef.current){ scene.remove(sketchPreviewMeshRef.current); sketchPreviewMeshRef.current.geometry.dispose(); sketchPreviewMeshRef.current=null;} };

  const toggleBooleanMode = () => setBooleanMode(m=> m==='local'?'backend':'local');

  // 临时禁用现代化坐标轴，使用基础THREE.js坐标轴
  useEffect(() => {
    if (isInitialized && scene) {
      const axesHelper = new THREE.AxesHelper(5);
      axesHelper.setColors(
        new THREE.Color(0xff3333), // X轴 - 红色
        new THREE.Color(0x33ff33), // Y轴 - 绿色
        new THREE.Color(0x3333ff)  // Z轴 - 蓝色
      );
      axesHelper.name = 'simple-axes';
      scene.add(axesHelper);
      
      return () => {
        const axes = scene.getObjectByName('simple-axes');
        if (axes) scene.remove(axes);
      };
    }
  }, [isInitialized, scene]);

  const resetCamera = () => {
    setCameraPosition(8, 6, 8);
    lookAt(0, 0, 0);
    if (controlsRef.current) {
      controlsRef.current.update();
    }
    onAction?.('reset');
  };

  if (error) {
    return (
      <div 
        className={`simple-viewport-3d ${className || ''}`}
        style={{
          width: '100%',
          height: '100%',
          background: '#ff4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '16px'
        }}
      >
        错误: {error}
      </div>
    );
  }

  const stats = getStats();

  return (
    <div
      className={`simple-viewport-3d ${className || ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#1a1a2e',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      {/* 标题栏和控制 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '40px',
          background: 'rgba(26, 26, 46, 0.9)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 100,
          borderBottom: '1px solid rgba(0, 217, 255, 0.3)'
        }}
      >
        <div>
          <Text style={{ color: '#00d9ff', fontSize: '14px', fontWeight: 'bold', marginRight: '12px' }}>
            {title}
          </Text>
          <Text style={{ color: '#cccccc', fontSize: '12px' }}>
            {description}
          </Text>
          {stats && (
            <Text style={{ color: '#666', fontSize: '11px', marginLeft: '16px' }}>
              {stats.fps} FPS | {stats.memory} MB
            </Text>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button
            size="small"
            onClick={() => setShowControls(!showControls)}
            style={{
              background: 'rgba(0, 217, 255, 0.1)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              color: '#00d9ff',
              fontSize: '11px'
            }}
          >
            质量
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isInitialized ? '#52c41a' : '#fa8c16'
              }}
            />
            <Text style={{ color: '#cccccc', fontSize: '12px' }}>
              {isInitialized ? '真实级渲染' : '初始化中...'}
            </Text>
          </div>
        </div>
      </div>

      {/* 3D视图容器 */}
      <div
        ref={mountRef}
        style={{
          position: 'absolute',
          top: '40px',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: 'calc(100% - 40px)'
        }}
      />

      {/* 控制按钮 */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          display: 'flex',
          gap: '8px',
          zIndex: 100
        }}
      >
  <Button size="small" style={{ background:'rgba(26, 26, 46, 0.8)', border:'1px solid rgba(0, 217, 255, 0.3)', color:'#ffffff'}} onClick={resetCamera}>重置视图</Button>
        <Button 
          size="small"
          style={{ 
            background: 'rgba(26, 26, 46, 0.8)', 
            border: '1px solid rgba(0, 217, 255, 0.3)',
            color: '#ffffff'
          }}
          onClick={() => onAction?.('screenshot')}
        >
          截图
        </Button>
  <Button size="small" style={{ background: enableSnapping?'#1976d2':'#333', border:'1px solid #1976d2', color:'#fff'}} onClick={()=>setEnableSnapping(s=>!s)}>捕捉 {enableSnapping?'开':'关'}</Button>
  <Button size="small" style={{ background: activeTool==='faceSelect'?'#ff9800':'#333', border:'1px solid #ff9800', color:'#fff'}} onClick={()=>setActiveTool('faceSelect')}>选面</Button>
  <Button size="small" style={{ background:'#455a64', border:'1px solid #607d8b', color:'#fff'}} onClick={undo}>撤销</Button>
  <Button size="small" style={{ background:'#455a64', border:'1px solid #607d8b', color:'#fff'}} onClick={redo}>重做</Button>
  <Button size="small" style={{ background: booleanMode==='backend'?'#673ab7':'#333', border:'1px solid #673ab7', color:'#fff'}} onClick={toggleBooleanMode}>布尔:{booleanMode==='backend'?'后端':'本地'}</Button>
  <label style={{color:'#ccc',fontSize:11,display:'flex',alignItems:'center',gap:4}}>
    <input type='checkbox' checked={preserveOriginal} onChange={e=>setPreserveOriginal(e.target.checked)} />保留原件
  </label>
  <div style={{background:'rgba(0,0,0,0.45)',padding:'4px 6px',borderRadius:4,display:'flex',flexDirection:'column',gap:2}}>
    <span style={{color:'#fff',fontSize:10}}>过滤</span>
    <label style={{color:'#ccc',fontSize:10}}><input type='checkbox' checked={snapUseVertex} onChange={e=>{setSnapUseVertex(e.target.checked); featureNeedsRebuildRef.current=true;}}/> 顶点</label>
    <label style={{color:'#ccc',fontSize:10}}><input type='checkbox' checked={snapUseEdgeMid} onChange={e=>{setSnapUseEdgeMid(e.target.checked); featureNeedsRebuildRef.current=true;}}/> 边中点</label>
    <label style={{color:'#ccc',fontSize:10}}><input type='checkbox' checked={snapUseFaceCenter} onChange={e=>{setSnapUseFaceCenter(e.target.checked); featureNeedsRebuildRef.current=true;}}/> 面中心</label>
    <span style={{color:'#0fd',fontSize:10}}>SNAP:{lastSnapType}</span>
  </div>
      </div>

      {/* 质量控制面板 */}
      {showControls && (
        <div
          style={{
            position: 'absolute',
            top: '50px',
            right: '10px',
            width: '200px',
            background: 'rgba(26, 26, 46, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            zIndex: 100
          }}
        >
          <Text style={{ color: '#00d9ff', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
            渲染质量
          </Text>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text style={{ color: '#fff', fontSize: '11px' }}>质量等级</Text>
              <select
                value={qualityLevel}
                onChange={(e) => {
                  const level = e.target.value as keyof typeof QUALITY_PRESETS;
                  setQualityLevel(level);
                  setQuality(level);
                }}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                  color: '#fff',
                  padding: '4px',
                  borderRadius: '4px',
                  fontSize: '11px'
                }}
              >
                <option value="low">低质量</option>
                <option value="medium">中等</option>
                <option value="high">高质量</option>
                <option value="ultra">极致</option>
              </select>
            </div>
            
            {stats && (
              <div style={{ fontSize: '10px', color: '#666' }}>
                <div>FPS: {stats.fps}</div>
                <div>内存: {stats.memory} MB</div>
                <div>绘制调用: {stats.drawCalls}</div>
              </div>
            )}
          </Space>
        </div>
      )}

      {/* 坐标系说明 & 状态提示 */}
      <div
        style={{
          position: 'absolute',
          top: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(26, 26, 46, 0.9)',
          border: '1px solid rgba(0, 217, 255, 0.3)',
          padding: '8px 12px',
          borderRadius: '8px',
          color: 'white',
          fontSize: '11px',
          zIndex: 100,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          display: 'flex',
          gap: '12px'
        }}
      >
        <div style={{ color: '#ff0000' }}>X轴</div>
        <div style={{ color: '#00ff00' }}>Y轴</div>
  <div style={{ color: '#0000ff' }}>Z轴</div>
  <div style={{ color:'#ccc'}}>| 工具: {activeTool} {activeTool==='measure'?`(${measurementMode})`:''}</div>
  {booleanStats && <div style={{color:'#0af'}}>布尔 V:{booleanMetrics?.volume?.toFixed?.(2)} S:{booleanMetrics?.surfaceArea?.toFixed?.(2)} 面:{booleanStats?.face_count} 质:{(booleanQuality?.mesh_quality??0).toFixed(2)}</div>}
  {activeTool==='sketch' && <div style={{color:'#ccc'}}>点数:{sketchPoints.length}{isSketchClosed?'(已闭合)':''}</div>}
  {activeTool==='measure' && <div style={{color:'#ccc'}}>点数:{measurePoints.length}</div>}
  {activeTool==='faceSelect' && (()=>{ const cnt = Array.from(selectedFacesRef.current.values()).reduce((a,s)=>a+s.size,0); const data=computeSelectedFacesAverage(); const n=data?data.avgNormal:null; return <div style={{color:'#ffb74d'}}>选面:{cnt} 法向:{n?`${n.x.toFixed(2)},${n.y.toFixed(2)},${n.z.toFixed(2)}`:'-'}</div>; })()}
      </div>

      {/* 选面工具操作面板 */}
      {activeTool==='faceSelect' && (
        <div style={{position:'absolute', right:10, top:50, background:'rgba(26,26,46,0.9)', border:'1px solid #ff9800', padding:10, borderRadius:8, zIndex:200, display:'flex', flexDirection:'column', gap:6, minWidth:140}}>
          <div style={{color:'#ff9800', fontSize:12, fontWeight:'bold'}}>选面操作</div>
          <label style={{color:'#ccc', fontSize:11}}>拉伸距离
            <input type='number' value={faceExtrudeDistance} onChange={e=>setFaceExtrudeDistance(parseFloat(e.target.value)||0)} style={{width:60, marginLeft:6}} />
          </label>
          <button onClick={extrudeSelectedFaces} style={{background:'#ff9800', color:'#000', border:'none', borderRadius:4, padding:'4px 8px', fontSize:12, cursor:'pointer'}}>面拉伸(E)</button>
          <button onClick={alignCameraToSelectedFaces} style={{background:'#455a64', color:'#fff', border:'1px solid #607d8b', borderRadius:4, padding:'4px 8px', fontSize:12, cursor:'pointer'}}>对齐视图(V)</button>
          <div style={{color:'#777', fontSize:10}}>Shift+点击 多/减选</div>
        </div>
      )}
      
      {/* 坐标轴组件 */}
      {camera && (
        <ViewportAxes 
          camera={camera} 
          size={120} 
        />
      )}
    </div>
  );
};

export default ProfessionalViewport3D;