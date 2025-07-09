import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { SoilParams } from '../creators/CreatorInterface';
import { GEMPY_COLOR_SCHEMES } from '../../core/geologicalColorSchemes';

interface GeologicalSectionRendererProps {
  soilLayers: SoilParams[];
  width?: number;
  height?: number;
  direction?: 'xz' | 'yz';
  position?: number;
  showLabels?: boolean;
  showGrid?: boolean;
  showAxis?: boolean;
  backgroundColor?: string;
}

const GeologicalSectionRenderer: React.FC<GeologicalSectionRendererProps> = ({
  soilLayers,
  width = 500,
  height = 300,
  direction = 'xz',
  position = 0,
  showLabels = true,
  showGrid = true,
  showAxis = true,
  backgroundColor = '#f5f5f5'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 设置坐标系
    const margin = 40;
    const plotWidth = canvas.width - 2 * margin;
    const plotHeight = canvas.height - 2 * margin;
    
    // 绘制网格
    if (showGrid) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 0.5;
      
      // 水平网格线
      for (let i = 0; i <= 5; i++) {
        const y = margin + i * (plotHeight / 5);
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(canvas.width - margin, y);
        ctx.stroke();
      }
      
      // 垂直网格线
      for (let i = 0; i <= 10; i++) {
        const x = margin + i * (plotWidth / 10);
        ctx.beginPath();
        ctx.moveTo(x, margin);
        ctx.lineTo(x, canvas.height - margin);
        ctx.stroke();
      }
    }
    
    // 绘制坐标轴
    if (showAxis) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      
      // X轴
      ctx.beginPath();
      ctx.moveTo(margin, canvas.height - margin);
      ctx.lineTo(canvas.width - margin, canvas.height - margin);
      ctx.stroke();
      
      // Y轴
      ctx.beginPath();
      ctx.moveTo(margin, margin);
      ctx.lineTo(margin, canvas.height - margin);
      ctx.stroke();
      
      // 绘制刻度
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      
      // X轴刻度
      for (let i = 0; i <= 10; i++) {
        const x = margin + (i * plotWidth / 10);
        ctx.beginPath();
        ctx.moveTo(x, canvas.height - margin);
        ctx.lineTo(x, canvas.height - margin + 5);
        ctx.stroke();
        
        const value = i * 50 - 250;
        ctx.fillText(value.toString(), x - 10, canvas.height - margin + 20);
      }
      
      // Y轴刻度
      for (let i = 0; i <= 5; i++) {
        const y = canvas.height - margin - (i * plotHeight / 5);
        ctx.beginPath();
        ctx.moveTo(margin - 5, y);
        ctx.lineTo(margin, y);
        ctx.stroke();
        
        const value = -i * 10;
        ctx.fillText(value.toString(), margin - 25, y + 5);
      }
      
      // 绘制标签
      ctx.font = '14px Arial';
      ctx.fillText(direction === 'xz' ? 'X (m)' : 'Y (m)', canvas.width - margin - 30, canvas.height - margin + 30);
      ctx.save();
      ctx.translate(margin - 30, margin + 50);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Z (m)', 0, 0);
      ctx.restore();
    }
    
    // 如果没有土层数据，则不绘制
    if (!soilLayers || soilLayers.length === 0) return;
    
    // 按Z坐标排序，从下到上绘制
    const sortedLayers = [...soilLayers].sort((a, b) => 
      ((a.position?.z || 0) - (a.scale?.z || 0)) - ((b.position?.z || 0) - (b.scale?.z || 0))
    );
    
    // 绘制土层
    sortedLayers.forEach(layer => {
      // 检查当前剖面是否穿过该土层
      const isInRange = direction === 'xz' 
        ? (layer.position?.y || 0) - (layer.scale?.y || 0) / 2 <= position && 
          (layer.position?.y || 0) + (layer.scale?.y || 0) / 2 >= position
        : (layer.position?.x || 0) - (layer.scale?.x || 0) / 2 <= position && 
          (layer.position?.x || 0) + (layer.scale?.x || 0) / 2 >= position;
      
      if (!isInRange) return;
      
      const top = layer.position?.z || 0;
      const bottom = top - (layer.scale?.z || 5);
      const left = direction === 'xz' 
        ? (layer.position?.x || 0) - (layer.scale?.x || 0) / 2
        : (layer.position?.y || 0) - (layer.scale?.y || 0) / 2;
      const right = direction === 'xz' 
        ? (layer.position?.x || 0) + (layer.scale?.x || 0) / 2
        : (layer.position?.y || 0) + (layer.scale?.y || 0) / 2;
      
      // 转换为画布坐标
      const xScale = plotWidth / 500; // 假设模型宽度为500m
      const zScale = plotHeight / 50;  // 假设模型深度为50m
      
      const x1 = margin + (left + 250) * xScale;
      const x2 = margin + (right + 250) * xScale;
      const y1 = canvas.height - margin - ((top / -50) * plotHeight);
      const y2 = canvas.height - margin - ((bottom / -50) * plotHeight);
      
      // 绘制土层矩形
      ctx.fillStyle = layer.color || GEMPY_COLOR_SCHEMES.standard.clay;
      ctx.beginPath();
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
      ctx.fill();
      
      // 绘制土层边界
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // 添加土层标签
      if (showLabels) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        const soilType = layer.soilType || '未知';
        
        // 获取土层类型的中文名称
        let soilTypeName = soilType;
        switch (soilType) {
          case 'clay': soilTypeName = '粘土'; break;
          case 'sand': soilTypeName = '砂土'; break;
          case 'silt': soilTypeName = '淤泥'; break;
          case 'gravel': soilTypeName = '砾石'; break;
          case 'rock': soilTypeName = '岩石'; break;
          default: soilTypeName = soilType;
        }
        
        const label = `${soilTypeName} (${bottom}m ~ ${top}m)`;
        const textWidth = ctx.measureText(label).width;
        
        if (y2 - y1 > 20 && x2 - x1 > textWidth) { // 只有当土层足够大时才显示标签
          ctx.fillText(label, (x1 + x2 - textWidth) / 2, (y1 + y2) / 2 + 5);
        }
      }
    });
    
  }, [soilLayers, width, height, direction, position, showLabels, showGrid, showAxis, backgroundColor]);
  
  return (
    <Box sx={{ width, height, position: 'relative' }}>
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
      
      {soilLayers.length === 0 && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          <Typography variant="body2" color="text.secondary">
            尚未添加任何土层
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default GeologicalSectionRenderer; 