import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useVisualSettingsStore } from '../../core/visualSettingsStore';

interface Props {
  onClose: () => void;
}

// 一个轻量的可拖拽浮动卡片，包含常用显示/视角/底图切换
export default function FloatingQuickControlsPanel({ onClose }: Props) {
  const setVisual = useVisualSettingsStore((s:any)=> s.set);
  const { twoPointFiveD, basemap } = useVisualSettingsStore((s:any)=> ({ twoPointFiveD: s.twoPointFiveD, basemap: s.basemap }));
  const cardRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 24, y: 180 });

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    let isDown = false; let sx=0, sy=0;
    const onMouseDown = (e: MouseEvent) => { if ((e.target as HTMLElement).closest('[data-drag]')) { isDown = true; sx=e.clientX; sy=e.clientY; e.preventDefault(); }};
    const onMouseMove = (e: MouseEvent) => { if (!isDown) return; const dx=e.clientX-sx, dy=e.clientY-sy; sx=e.clientX; sy=e.clientY; pos.current.x += dx; pos.current.y += dy; el.style.left = pos.current.x + 'px'; el.style.top = pos.current.y + 'px'; };
    const onMouseUp = () => { isDown = false; };
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { el.removeEventListener('mousedown', onMouseDown); window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{
        position: 'absolute', left: pos.current.x, top: pos.current.y, zIndex: 3200,
        background: 'rgba(5, 16, 28, 0.92)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: 10,
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)', color: '#fff', width: 280
      }}
    >
      <div data-drag style={{ cursor: 'move', padding: '10px 12px', borderBottom: '1px solid rgba(0,255,255,0.15)', display: 'flex', justifyContent:'space-between', alignItems: 'center' }}>
        <div style={{ color: '#0ff', fontWeight: 700, fontSize: 12 }}>⚙️ 快捷控制</div>
        <button onClick={onClose} style={{ background:'transparent', border:'none', color:'#0ff', cursor:'pointer' }}>✕</button>
      </div>

      <div style={{ padding: 12, display: 'grid', gridTemplateColumns:'1fr 1fr', gap: 8 }}>
        <button
          onClick={() => setVisual({ twoPointFiveD: !twoPointFiveD })}
          className="neon-border"
          style={{ background:'linear-gradient(45deg, rgba(0,255,255,0.25), rgba(0,100,255,0.25))', borderRadius:6, color:'#fff', padding:'8px', fontSize:12 }}
        >{twoPointFiveD ? '2.5D ✓' : '2D'}</button>

        <button
          onClick={() => setVisual({ basemap: basemap === 'satellite' ? 'road' : 'satellite' })}
          className="neon-border"
          style={{ background:'linear-gradient(45deg, rgba(0,255,180,0.25), rgba(0,160,255,0.25))', borderRadius:6, color:'#fff', padding:'8px', fontSize:12 }}
        >{basemap === 'satellite' ? '卫星 ✓' : '道路'}</button>

        <button
          onClick={() => setVisual({ minimalMode: true })}
          className="neon-border"
          style={{ background:'linear-gradient(45deg, rgba(0,200,160,0.25), rgba(0,255,160,0.25))', borderRadius:6, color:'#fff', padding:'8px', fontSize:12 }}
        >极简</button>

        <button
          onClick={() => setVisual({ minimalMode: false })}
          className="neon-border"
          style={{ background:'linear-gradient(45deg, rgba(120,0,220,0.25), rgba(160,0,255,0.25))', borderRadius:6, color:'#fff', padding:'8px', fontSize:12 }}
        >炫酷</button>
      </div>
    </motion.div>
  );
}
