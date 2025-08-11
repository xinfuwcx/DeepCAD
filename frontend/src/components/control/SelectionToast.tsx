import React, { useEffect, useState } from 'react';
import { onSelection } from '../../core/picking/selectionDispatcher';

interface Entry { id: string; ts: number; source: string; }

export const SelectionToast: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  useEffect(()=>{
    const off = onSelection(({ source, projectId }) => {
      setEntries(prev => [{ id: projectId, ts: Date.now(), source }, ...prev].slice(0,5));
    });
    const gc = setInterval(()=>{
      setEntries(prev => prev.filter(e => Date.now() - e.ts < 5000));
    }, 1000);
    return ()=> { off(); clearInterval(gc); };
  }, []);
  return (
    <div style={{ position:'absolute', bottom: 140, right: 30, zIndex: 4000, display:'flex', flexDirection:'column', gap:8 }}>
      {entries.map(e => (
        <div key={e.ts+e.id} style={{
          background:'rgba(0,0,0,0.55)',
          border:'1px solid rgba(0,255,255,0.4)',
          padding:'6px 10px',
          color:'#0ff',
          fontFamily:'monospace',
          fontSize:12,
          borderRadius:6,
          boxShadow:'0 0 12px rgba(0,255,255,0.3)'
        }}>
          <span style={{ opacity:0.7, marginRight:6 }}>{e.source}</span> {e.id}
        </div>
      ))}
    </div>
  );
};

export default SelectionToast;
