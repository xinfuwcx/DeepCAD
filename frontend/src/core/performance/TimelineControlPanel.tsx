import React, { useCallback } from 'react';
import { useTimelineStore } from '../timelineStore';

export const TimelineControlPanel: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const currentTime = useTimelineStore(s=>s.currentTime);
  const playing = useTimelineStore(s=>s.playing);
  const speed = useTimelineStore(s=>s.speed);
  const range = useTimelineStore(s=>s.range);
  const markers = useTimelineStore(s=>s.markers);
  const loopSegment = useTimelineStore(s=>s.loopSegment);
  const play = useTimelineStore(s=>s.play);
  const pause = useTimelineStore(s=>s.pause);
  const setSpeed = useTimelineStore(s=>s.setSpeed);
  const seekPercent = useTimelineStore(s=>s.seekPercent);
  const addMarker = useTimelineStore(s=>s.addMarker);
  const removeMarker = useTimelineStore(s=>s.removeMarker);
  const setLoopSegment = useTimelineStore(s=>s.setLoopSegment);

  const pct = (currentTime - range.start) / (range.end - range.start);
  const togglePlay = useCallback(()=> { playing ? pause() : play(); }, [playing, play, pause]);

  return (
    <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.55)', padding: '8px 12px', border: '1px solid rgba(0,255,255,0.3)', borderRadius: 8, color: '#0ff', fontFamily: 'monospace', fontSize: 12, width: 260, ...style }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <button onClick={togglePlay} style={{ background:'rgba(0,255,255,0.15)', color:'#0ff', border:'1px solid rgba(0,255,255,0.4)', borderRadius:4, cursor:'pointer', padding:'2px 8px' }}>{playing ? 'Pause' : 'Play'}</button>
        <div>{currentTime.toFixed(2)}s / {range.end.toFixed(1)}s</div>
      </div>
      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(pct*1000)}
        onChange={(e)=> seekPercent(Number(e.target.value)/1000)}
        style={{ width:'100%' }}
      />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
        <span>Speed</span>
        <select value={speed} onChange={(e)=> setSpeed(Number(e.target.value))} style={{ background:'rgba(0,0,0,0.6)', color:'#0ff', border:'1px solid rgba(0,255,255,0.4)', borderRadius:4 }}>
          {[0.25,0.5,1,1.5,2,4].map(v=> <option key={v} value={v}>{v}x</option>)}
        </select>
      </div>
      <div style={{ marginTop:8, display:'flex', gap:4 }}>
        <button onClick={()=> addMarker(currentTime, 'M'+markers.length)} style={{ flex:1, background:'rgba(0,255,255,0.15)', color:'#0ff', border:'1px solid rgba(0,255,255,0.4)', borderRadius:4, cursor:'pointer' }}>AddMark</button>
        <button onClick={()=> markers.length && removeMarker(markers[markers.length-1].id)} style={{ flex:1, background:'rgba(255,140,0,0.25)', color:'#fa0', border:'1px solid rgba(255,140,0,0.5)', borderRadius:4, cursor:'pointer' }}>PopMark</button>
      </div>
      <div style={{ marginTop:6, maxHeight:60, overflowY:'auto' }}>
        {markers.map(m => (
          <div key={m.id} style={{ display:'flex', justifyContent:'space-between' }}>
            <span>{m.label || m.id}</span>
            <span>{m.time.toFixed(1)}</span>
          </div>
        ))}
        {!markers.length && <div style={{ opacity:0.5 }}>No markers</div>}
      </div>
      <div style={{ marginTop:8, display:'flex', gap:4 }}>
        <button onClick={()=> setLoopSegment(loopSegment ? { ...loopSegment, enabled: !loopSegment.enabled } : { start: range.start, end: range.end/4, enabled: true })} style={{ flex:1, background:'rgba(0,200,255,0.2)', color:'#0ff', border:'1px solid rgba(0,255,255,0.4)', borderRadius:4, cursor:'pointer' }}>{loopSegment?.enabled ? 'Loop On' : 'Loop Off'}</button>
        <button onClick={()=> loopSegment && setLoopSegment({ ...loopSegment, start: currentTime })} style={{ flex:1, background:'rgba(0,255,100,0.2)', color:'#0f8', border:'1px solid rgba(0,255,100,0.4)', borderRadius:4 }}>SetStart</button>
        <button onClick={()=> loopSegment && setLoopSegment({ ...loopSegment, end: currentTime })} style={{ flex:1, background:'rgba(255,100,0,0.25)', color:'#fa4', border:'1px solid rgba(255,100,0,0.4)', borderRadius:4 }}>SetEnd</button>
      </div>
      {loopSegment && (
        <div style={{ marginTop:4, fontSize:11 }}>Loop [{loopSegment.start.toFixed(1)} - {loopSegment.end.toFixed(1)}]{loopSegment.enabled ? '' : ' (disabled)'}</div>
      )}
    </div>
  );
};

export default TimelineControlPanel;
