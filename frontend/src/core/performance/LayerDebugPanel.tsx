import React, { useEffect, useState, useCallback } from 'react';
import { globalSceneRegistry } from '../sceneRegistry';

interface SceneInfo { id: string; layers: { id: string; visible: boolean }[] }

export const LayerDebugPanel: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const [scenes, setScenes] = useState<SceneInfo[]>([]);
  useEffect(() => {
    const interval = setInterval(() => {
      const arr: SceneInfo[] = [];
      globalSceneRegistry.forEach(ctx => {
        arr.push({ id: ctx.id, layers: ctx.layers.map(l => ({ id: l.id, visible: l.visible })) });
      });
      setScenes(arr);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const toggleLayer = useCallback((sceneId: string, layerId: string) => {
    const ctx = globalSceneRegistry.get(sceneId);
    if (!ctx) return;
    const layer = ctx.layers.find(l => l.id === layerId);
    if (!layer) return;
    layer.setVisible(!layer.visible);
    // immediate refresh
    const arr: SceneInfo[] = [];
    globalSceneRegistry.forEach(c => {
      arr.push({ id: c.id, layers: c.layers.map(l => ({ id: l.id, visible: l.visible })) });
    });
    setScenes(arr);
  }, []);
  return (
    <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 11, fontFamily: 'monospace', background: 'rgba(0,0,0,0.55)', color: '#0ff', padding: '6px 10px', border: '1px solid rgba(0,255,255,0.3)', borderRadius: 6, maxWidth: 260, ...style }}>
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Scenes / Layers</div>
      {scenes.map(s => (
        <div key={s.id} style={{ marginBottom: 4 }}>
          <div>• {s.id}</div>
          {s.layers.map(l => (
            <div
              key={l.id}
              onClick={() => toggleLayer(s.id, l.id)}
              style={{ paddingLeft: 10, cursor: 'pointer', userSelect: 'none', color: l.visible ? '#0ff' : '#066' }}
              title="点击切换可见性"
            >- {l.id} {l.visible ? '👁️' : '🚫'}</div>
          ))}
        </div>
      ))}
      {!scenes.length && <div>no scenes</div>}
    </div>
  );
};

export default LayerDebugPanel;
