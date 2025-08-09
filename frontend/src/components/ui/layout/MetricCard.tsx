import React, { ReactNode, useMemo } from 'react';

interface MetricCardProps {
  icon?: ReactNode;
  label: ReactNode;
  value: ReactNode;
  trend?: ReactNode;
  accent?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  compact?: boolean;
  sparkline?: number[]; // mini chart data
  sparkColor?: string;
  tooltip?: string;
}

const colorMap: Record<string, string> = {
  blue: '#3498db',
  green: '#22c55e',
  orange: '#f59e0b',
  red: '#e74c3c',
  purple: '#9333ea'
};

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, trend, accent = 'blue', compact, sparkline, sparkColor, tooltip }) => {
  const path = useMemo(() => {
    if (!sparkline || sparkline.length < 2) return '';
    const w = 48; const h = 18;
    const min = Math.min(...sparkline); const max = Math.max(...sparkline);
    const range = max - min || 1;
    return sparkline.map((v,i) => {
      const x = (i/(sparkline.length-1))*w;
      const y = h - ((v - min)/range)*h;
      return `${i===0?'M':'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [sparkline]);
  return (
    <div className={`dc-metric ${compact ? 'dc-metric-compact' : ''}`} title={tooltip}>
      <div className="dc-metric-icon" style={{ backgroundColor: colorMap[accent] + '22', color: colorMap[accent] }}>{icon}</div>
      <div className="dc-metric-main">
        <div className="dc-metric-label">{label}</div>
        <div className="dc-metric-value" style={{ color: colorMap[accent] }}>{value}</div>
      </div>
      {sparkline && path && (
        <svg width={50} height={20} style={{ overflow:'visible', marginLeft:4 }}>
          <path d={path} fill="none" stroke={sparkColor || colorMap[accent]} strokeWidth={1.2} strokeLinecap="round" />
        </svg>
      )}
      {trend && <div className="dc-metric-trend">{trend}</div>}
    </div>
  );
};

export default MetricCard;
