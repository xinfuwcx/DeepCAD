import React, { useEffect, useRef } from 'react';

export const Sparkline: React.FC<{ values: number[]; width?: number; height?: number; color?: string }>=({values,width=120,height=40,color='#00ffff'})=>{
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c = ref.current; if(!c) return; const ctx = c.getContext('2d'); if(!ctx) return;
    ctx.clearRect(0,0,width,height);
    if(!values.length) return;
    const min = Math.min(...values); const max = Math.max(...values); const span = max-min || 1;
    ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.beginPath();
    values.forEach((v,i)=>{
      const x = (i/(values.length-1))* (width-4) + 2;
      const y = height - ((v-min)/span)*(height-4) -2;
      i? ctx.lineTo(x,y): ctx.moveTo(x,y);
    });
    ctx.stroke();
  },[values,width,height,color]);
  return <canvas ref={ref} width={width} height={height} style={{ width, height }} />;
};

export const Donut: React.FC<{ segments: { value:number; color:string }[]; size?: number }>=({segments,size=60})=>{
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=ref.current; if(!c) return; const ctx=c.getContext('2d'); if(!ctx) return;
    ctx.clearRect(0,0,size,size);
    const total = segments.reduce((s,a)=>s+a.value,0)||1; let start= -Math.PI/2;
    segments.forEach(seg=>{ const angle = (seg.value/total)*Math.PI*2; ctx.beginPath(); ctx.strokeStyle=seg.color; ctx.lineWidth=10; ctx.arc(size/2,size/2,size/2-8,start,start+angle,false); ctx.stroke(); start += angle; });
  },[segments,size]);
  return <canvas ref={ref} width={size} height={size} style={{ width:size, height:size }} />;
};
