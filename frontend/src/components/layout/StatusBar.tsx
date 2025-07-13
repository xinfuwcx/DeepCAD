import React from 'react';
import { GlassCard, GlassBadge } from '../ui/GlassComponents';
import { cn } from '../../utils/cn';

interface StatusBarProps {
  className?: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ className }) => {
  // Simulate real-time status data
  const systemStatus = {
    mesh: { nodes: '125,483', elements: '89,762', quality: 0.85 },
    analysis: { progress: 75, status: 'running', time: '00:03:24' },
    memory: { used: '2.3GB', total: '16GB', percentage: 14 },
    gpu: { usage: 45, model: 'RTX 4080' }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'info';
      case 'completed': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'default';
    }
  };

  return (
    <GlassCard
      variant="elevated"
      className={cn(
        "h-8 px-4 flex items-center justify-between",
        "border-t border-glass-border/50",
        "backdrop-blur-xl bg-glass/50",
        "text-xs",
        className
      )}
      padding="none"
    >
      {/* Left Status */}
      <div className="flex items-center gap-6">
        {/* Project Status */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-secondary">项目: 上海某基坑工程</span>
        </div>

        {/* Mesh Info */}
        <div className="flex items-center gap-3 text-secondary">
          <span>网格: {systemStatus.mesh.nodes} 节点</span>
          <span>•</span>
          <span>{systemStatus.mesh.elements} 单元</span>
          <span>•</span>
          <span>质量: {(systemStatus.mesh.quality * 100).toFixed(0)}%</span>
        </div>

        {/* Analysis Status */}
        <div className="flex items-center gap-2">
          <GlassBadge 
            variant={getStatusColor(systemStatus.analysis.status)} 
            size="sm"
          >
            <div className="flex items-center gap-1">
              {systemStatus.analysis.status === 'running' && (
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              )}
              <span>
                {systemStatus.analysis.status === 'running' ? '计算中' : '就绪'}
              </span>
            </div>
          </GlassBadge>
          {systemStatus.analysis.status === 'running' && (
            <span className="text-secondary">
              {systemStatus.analysis.progress}% • {systemStatus.analysis.time}
            </span>
          )}
        </div>
      </div>

      {/* Right Status */}
      <div className="flex items-center gap-6">
        {/* Performance */}
        <div className="flex items-center gap-3 text-secondary">
          <span>内存: {systemStatus.memory.used}/{systemStatus.memory.total}</span>
          <span>•</span>
          <span>GPU: {systemStatus.gpu.usage}% ({systemStatus.gpu.model})</span>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          <span className="text-secondary">求解器已连接</span>
        </div>

        {/* Time */}
        <div className="text-secondary">
          {new Date().toLocaleTimeString('zh-CN')}
        </div>

        {/* Zoom Level */}
        <div className="text-secondary">
          缩放: 100%
        </div>

        {/* Coordinate System */}
        <div className="flex items-center gap-1 text-secondary">
          <span>坐标:</span>
          <span className="text-red-500">X</span>
          <span className="text-green-500">Y</span>
          <span className="text-blue-500">Z</span>
        </div>
      </div>
    </GlassCard>
  );
};

export default StatusBar;