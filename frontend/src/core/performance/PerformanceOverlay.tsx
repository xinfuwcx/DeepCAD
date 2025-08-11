import React, { useEffect, useRef, useState } from 'react';
import { globalSceneRegistry } from '../sceneRegistry';
import { useTimelineStore } from '../timelineStore';

interface PerfStats { fps: number; frameTime: number; layers: number; scenes: number; time: number; geometries: number; materials: number; textures: number; uniqueGeometries: number; uniqueMaterials: number; estGPUBytes: number; }

export const PerformanceOverlay: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const [stats, setStats] = useState<PerfStats>({ fps: 0, frameTime: 0, layers: 0, scenes: 0, time: 0, geometries: 0, materials: 0, textures: 0, uniqueGeometries: 0, uniqueMaterials: 0, estGPUBytes: 0 });
  const [snapA, setSnapA] = useState<PerfStats | null>(null);
  const [snapB, setSnapB] = useState<PerfStats | null>(null);
  const [leakWarn, setLeakWarn] = useState<string>('');
  const [autoDiff, setAutoDiff] = useState<string>('');
  const gpuHistoryRef = useRef<number[]>([]);
  const fpsHistoryRef = useRef<number[]>([]);
  const lastRef = useRef<number>(performance.now());
  const framesRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    const loop = () => {
      const now = performance.now();
      framesRef.current++;
      const elapsed = now - lastRef.current;
      if (elapsed >= 500) { // update twice per second
        const fps = (framesRef.current * 1000) / elapsed;
        framesRef.current = 0;
        lastRef.current = now;
        let layerCount = 0; let sceneCount = 0;
        globalSceneRegistry.forEach(s => { sceneCount++; layerCount += s.layers.length; });
        if (mounted) {
          // aggregate resource counts
          let geom = 0, mat = 0, tex = 0;
          const geomSet = new Set<any>();
          const matSet = new Set<any>();
          let estGPU = 0;
          globalSceneRegistry.forEach(s => {
            s.scene.traverse(obj => {
              const anyObj: any = obj as any;
              if (anyObj.geometry) {
                geom++; geomSet.add(anyObj.geometry);
                // estimate buffer attribute bytes
                const g: any = anyObj.geometry;
                if (g.attributes) {
                  Object.keys(g.attributes).forEach(k => {
                    const attr = g.attributes[k];
                    if (attr && attr.count && attr.itemSize) {
                      // assume Float32 by default (4 bytes) unless array.BYTES_PER_ELEMENT present
                      const bytesPer = attr.array?.BYTES_PER_ELEMENT || 4;
                      estGPU += attr.count * attr.itemSize * bytesPer;
                    }
                  });
                }
                if (g.index && g.index.count && g.index.array) {
                  estGPU += g.index.array.BYTES_PER_ELEMENT * g.index.count;
                }
              }
              const mats = anyObj.material ? (Array.isArray(anyObj.material) ? anyObj.material : [anyObj.material]) : [];
              mat += mats.length; mats.forEach((m: any) => matSet.add(m));
              mats.forEach((m: any) => {
                ['map','normalMap','roughnessMap','metalnessMap','alphaMap','envMap'].forEach(k => { if (m[k]) tex++; });
              });
            });
          });
          const nextStats: PerfStats = {
            fps: parseFloat(fps.toFixed(1)),
            frameTime: parseFloat((1000 / fps).toFixed(1)),
            layers: layerCount,
            scenes: sceneCount,
            time: useTimelineStore.getState().currentTime,
            geometries: geom,
            materials: mat,
            textures: tex,
            uniqueGeometries: geomSet.size,
            uniqueMaterials: matSet.size,
            estGPUBytes: estGPU
          };
          // rolling histories (last 60 samples ~ 30s)
          gpuHistoryRef.current.push(nextStats.estGPUBytes);
          if (gpuHistoryRef.current.length > 60) gpuHistoryRef.current.shift();
          fpsHistoryRef.current.push(nextStats.fps);
          if (fpsHistoryRef.current.length > 60) fpsHistoryRef.current.shift();
          // leak heuristic: if uniqueGeometries keeps growing and gpu mem slope positive for last N samples
          if (gpuHistoryRef.current.length === 60) {
            const first = gpuHistoryRef.current[0];
            const last = gpuHistoryRef.current[gpuHistoryRef.current.length-1];
            const growthMB = (last-first)/1024/1024;
            if (growthMB > 8 && nextStats.uniqueGeometries > (snapA?.uniqueGeometries || 0) + 50) {
              setLeakWarn(`⚠️ GPU内存疑似增长 ${growthMB.toFixed(1)}MB / ~30s (UniqueGeom:${nextStats.uniqueGeometries})`);
            }
          }
          setStats(nextStats);
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    // 自动快照/对比: 每 45s 更新 snapA/snapB 并输出 Δ
    const autoTimer = setInterval(()=>{
      setSnapA(prev => prev ? prev : stats);
      if (snapA) {
        setSnapB(stats);
        if (snapA) {
          const dg = stats.uniqueGeometries - snapA.uniqueGeometries;
          const dm = stats.uniqueMaterials - snapA.uniqueMaterials;
          const dGPU = ((stats.estGPUBytes - snapA.estGPUBytes)/1024/1024).toFixed(2);
          setAutoDiff(`ΔGeom:${dg} ΔMat:${dm} ΔGPU:${dGPU}MB`);
        }
        setSnapA(stats); // 滚动窗口
      }
    }, 45000);
    return () => { mounted = false; clearInterval(autoTimer); };
  }, []);

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      left: 12,
      padding: '8px 12px',
      background: 'rgba(0,0,0,0.55)',
      border: '1px solid rgba(0,255,255,0.3)',
      borderRadius: 8,
      fontFamily: 'monospace',
      fontSize: 12,
      color: '#0ff',
      lineHeight: 1.4,
      pointerEvents: 'none',
      ...style
    }}>
      <div>FPS: {stats.fps}</div>
      <div>Frame: {stats.frameTime} ms</div>
      <div>Scenes: {stats.scenes}</div>
      <div>Layers: {stats.layers}</div>
      <div>Time: {stats.time.toFixed(2)}s</div>
      <div>Geom: {stats.geometries} ({stats.uniqueGeometries}u) Mat: {stats.materials} ({stats.uniqueMaterials}u)</div>
      <div>Tex refs: {stats.textures}</div>
      <div>GPU≈ {(stats.estGPUBytes/1024/1024).toFixed(2)} MB</div>
  {leakWarn && <div style={{ color:'#ff8080', fontWeight:'bold', maxWidth:180 }}>{leakWarn}</div>}
  {autoDiff && <div style={{ color:'#0f0', fontSize:11 }}>{autoDiff}</div>}
      {(snapA || snapB) && (
        <div style={{ marginTop:4 }}>
          <div style={{ fontWeight:'bold' }}>Diff</div>
          {snapA && snapB && (
            <div style={{ whiteSpace:'pre-line' }}>
              ΔGeom: {snapB.uniqueGeometries - snapA.uniqueGeometries}\n
              ΔMat: {snapB.uniqueMaterials - snapA.uniqueMaterials}\n
              ΔGPU(MB): {((snapB.estGPUBytes - snapA.estGPUBytes)/1024/1024).toFixed(2)}
            </div>
          )}
        </div>
      )}
      <div style={{ display:'flex', gap:4, marginTop:6 }}>
        <button onClick={()=> setSnapA(stats)} style={{ background:'rgba(0,255,255,0.15)', color:'#0ff', border:'1px solid rgba(0,255,255,0.4)', borderRadius:4, cursor:'pointer', padding:'2px 6px' }}>SnapA</button>
        <button onClick={()=> setSnapB(stats)} style={{ background:'rgba(0,255,255,0.15)', color:'#0ff', border:'1px solid rgba(0,255,255,0.4)', borderRadius:4, cursor:'pointer', padding:'2px 6px' }}>SnapB</button>
        <button onClick={()=> { setSnapA(null); setSnapB(null); }} style={{ background:'rgba(255,0,80,0.25)', color:'#f66', border:'1px solid rgba(255,0,80,0.5)', borderRadius:4, cursor:'pointer', padding:'2px 6px' }}>Clear</button>
      </div>
    </div>
  );
};
