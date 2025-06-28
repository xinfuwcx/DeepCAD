import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Slider, 
  Grid,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  Button,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  PanTool as PanToolIcon,
  Undo as UndoIcon,
  Redo as RedoIcon
} from '@mui/icons-material';

interface Point {
  id: string;
  x: number;
  y: number;
  z?: number;
}

interface MonitoringPoint {
  x: number;
  depth: number;
  name: string;
  value: string;
}

interface ExcavationDiagramData {
  excavationDepth: number;
  contour?: Point[];
  waterLevel?: number;
  monitoringPoints?: MonitoringPoint[];
}

interface ExcavationDiagramViewerProps {
  projectId: number;
  height?: number;
  initialData?: ExcavationDiagramData;
  editMode?: boolean;
  onDataChange?: (data: ExcavationDiagramData) => void;
}

/**
 * 基坑二维示意图查看器组件
 */
const ExcavationDiagramViewer: React.FC<ExcavationDiagramViewerProps> = ({
  projectId,
  height = 400,
  initialData,
  editMode = false,
  onDataChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 状态
  const [data, setData] = useState<ExcavationDiagramData>({
    excavationDepth: initialData?.excavationDepth || 10,
    contour: initialData?.contour || [
      { id: '1', x: 0, y: 0 },
      { id: '2', x: 30, y: 0 },
      { id: '3', x: 30, y: 20 },
      { id: '4', x: 0, y: 20 }
    ],
    waterLevel: initialData?.waterLevel || 5,
    monitoringPoints: initialData?.monitoringPoints || []
  });
  
  // 视图状态
  const [scale, setScale] = useState<number>(10); // 像素/米
  const [pan, setPan] = useState<{ x: number, y: number }>({ x: 50, y: 50 });
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  
  // 绘制历史记录
  const [history, setHistory] = useState<ExcavationDiagramData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
  // 初始化历史记录
  useEffect(() => {
    if (initialData) {
      setHistory([{...data}]);
      setHistoryIndex(0);
    }
  }, [initialData]);
  
  // 数据变更时通知父组件
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        excavationDepth: data.excavationDepth,
        contour: data.contour,
        waterLevel: data.waterLevel,
        monitoringPoints: data.monitoringPoints
      });
    }
  }, [data, onDataChange]);
  
  // 绘制基坑示意图
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 设置背景
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制坐标系
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    // 水平网格线
    for (let y = 0; y <= data.excavationDepth * 2; y += 5) {
      const canvasY = pan.y + y * scale;
      ctx.beginPath();
      ctx.moveTo(0, canvasY);
      ctx.lineTo(canvas.width, canvasY);
      ctx.stroke();
      
      // 标注深度
      ctx.fillStyle = '#999';
      ctx.font = '10px Arial';
      ctx.fillText(`${y}m`, 5, canvasY - 2);
    }
    
    // 垂直网格线
    for (let x = 0; x <= 50; x += 5) {
      const canvasX = pan.x + x * scale;
      ctx.beginPath();
      ctx.moveTo(canvasX, 0);
      ctx.lineTo(canvasX, canvas.height);
      ctx.stroke();
      
      // 标注宽度
      ctx.fillStyle = '#999';
      ctx.font = '10px Arial';
      ctx.fillText(`${x}m`, canvasX + 2, 15);
    }
    
    // 绘制地表线
    ctx.strokeStyle = '#8B4513'; // 土色
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, pan.y);
    ctx.lineTo(canvas.width, pan.y);
    ctx.stroke();
    
    // 绘制水位线
    if (data.waterLevel !== undefined) {
      const waterY = pan.y + data.waterLevel * scale;
      ctx.strokeStyle = '#4fc3f7'; // 水蓝色
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 3]); // 虚线
      ctx.beginPath();
      ctx.moveTo(0, waterY);
      ctx.lineTo(canvas.width, waterY);
      ctx.stroke();
      ctx.setLineDash([]); // 恢复实线
      
      // 标注水位
      ctx.fillStyle = '#4fc3f7';
      ctx.font = '12px Arial';
      ctx.fillText(`水位线 ${data.waterLevel}m`, 10, waterY - 5);
    }
    
    // 绘制基坑轮廓
    if (data.contour && data.contour.length > 1) {
      ctx.strokeStyle = '#f44336'; // 红色
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const firstPoint = data.contour[0];
      ctx.moveTo(pan.x + firstPoint.x * scale, pan.y + firstPoint.y * scale);
      
      for (let i = 1; i < data.contour.length; i++) {
        const point = data.contour[i];
        ctx.lineTo(pan.x + point.x * scale, pan.y + point.y * scale);
      }
      
      // 闭合路径
      ctx.lineTo(pan.x + firstPoint.x * scale, pan.y + firstPoint.y * scale);
      ctx.stroke();
      
      // 绘制基坑底部填充
      ctx.fillStyle = 'rgba(244, 67, 54, 0.1)'; // 半透明红色
      ctx.fill();
      
      // 在编辑模式下绘制控制点
      if (editMode) {
        data.contour.forEach(point => {
          const isSelected = point.id === selectedPoint;
          
          ctx.fillStyle = isSelected ? '#2196f3' : '#f44336';
          ctx.beginPath();
          ctx.arc(
            pan.x + point.x * scale, 
            pan.y + point.y * scale, 
            isSelected ? 6 : 4, 
            0, 
            Math.PI * 2
          );
          ctx.fill();
          
          // 显示坐标
          if (isSelected) {
            ctx.fillStyle = '#000';
            ctx.font = '12px Arial';
            ctx.fillText(
              `(${point.x}m, ${point.y}m)`, 
              pan.x + point.x * scale + 10, 
              pan.y + point.y * scale - 10
            );
          }
        });
      }
    }
    
    // 绘制监测点
    if (data.monitoringPoints) {
      data.monitoringPoints.forEach(point => {
        const x = pan.x + point.x * scale;
        const y = pan.y + point.depth * scale;
        
        // 绘制监测点标记
        ctx.fillStyle = '#4caf50'; // 绿色
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制监测点名称和值
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.fillText(`${point.name}: ${point.value}`, x + 10, y);
      });
    }
    
    // 绘制基坑深度标注
    const depthY = pan.y + data.excavationDepth * scale;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]); // 虚线
    ctx.beginPath();
    ctx.moveTo(pan.x, pan.y);
    ctx.lineTo(pan.x, depthY);
    ctx.stroke();
    ctx.setLineDash([]); // 恢复实线
    
    // 绘制深度箭头和标注
    ctx.beginPath();
    ctx.moveTo(pan.x - 5, pan.y);
    ctx.lineTo(pan.x, pan.y - 5);
    ctx.lineTo(pan.x + 5, pan.y);
    ctx.moveTo(pan.x - 5, depthY);
    ctx.lineTo(pan.x, depthY + 5);
    ctx.lineTo(pan.x + 5, depthY);
    ctx.stroke();
    
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.fillText(`${data.excavationDepth}m`, pan.x + 10, (pan.y + depthY) / 2);
    
  }, [data, scale, pan, selectedPoint, editMode]);
  
  // 处理缩放
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 50));
  };
  
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 1));
  };
  
  // 处理平移
  const handlePan = (dx: number, dy: number) => {
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };
  
  // 处理深度变化
  const handleDepthChange = (event: Event, value: number | number[]) => {
    const newDepth = value as number;
    setData(prev => ({
      ...prev,
      excavationDepth: newDepth
    }));
    
    // 添加到历史记录
    if (editMode) {
      addToHistory({
        ...data,
        excavationDepth: newDepth
      });
    }
  };
  
  // 处理水位变化
  const handleWaterLevelChange = (event: Event, value: number | number[]) => {
    const newWaterLevel = value as number;
    setData(prev => ({
      ...prev,
      waterLevel: newWaterLevel
    }));
    
    // 添加到历史记录
    if (editMode) {
      addToHistory({
        ...data,
        waterLevel: newWaterLevel
      });
    }
  };
  
  // 处理点击选择点
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editMode || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 检查是否点击了控制点
    const clickedPoint = data.contour?.find(point => {
      const pointX = pan.x + point.x * scale;
      const pointY = pan.y + point.y * scale;
      const distance = Math.sqrt(Math.pow(pointX - x, 2) + Math.pow(pointY - y, 2));
      return distance <= 6;
    });
    
    if (clickedPoint) {
      setSelectedPoint(clickedPoint.id);
    } else {
      setSelectedPoint(null);
    }
  };
  
  // 处理拖动控制点
  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editMode || !selectedPoint || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 更新选中点的坐标
    const newContour = data.contour?.map(point => {
      if (point.id === selectedPoint) {
        return {
          ...point,
          x: Math.max(0, Math.round((x - pan.x) / scale * 10) / 10),
          y: Math.max(0, Math.round((y - pan.y) / scale * 10) / 10)
        };
      }
      return point;
    });
    
    setData(prev => ({
      ...prev,
      contour: newContour
    }));
  };
  
  // 处理鼠标抬起
  const handleCanvasMouseUp = () => {
    if (selectedPoint && editMode) {
      // 添加到历史记录
      addToHistory({...data});
    }
  };
  
  // 添加新点
  const handleAddPoint = () => {
    if (!data.contour) return;
    
    // 找到最后一个点和第一个点之间的中点
    const lastPoint = data.contour[data.contour.length - 1];
    const firstPoint = data.contour[0];
    const midX = (lastPoint.x + firstPoint.x) / 2;
    const midY = (lastPoint.y + firstPoint.y) / 2;
    
    const newPoint = {
      id: `point_${Date.now()}`,
      x: midX,
      y: midY
    };
    
    const newContour = [...data.contour, newPoint];
    
    setData(prev => ({
      ...prev,
      contour: newContour
    }));
    
    // 添加到历史记录
    addToHistory({
      ...data,
      contour: newContour
    });
  };
  
  // 删除选中的点
  const handleDeletePoint = () => {
    if (!selectedPoint || !data.contour || data.contour.length <= 3) return;
    
    const newContour = data.contour.filter(point => point.id !== selectedPoint);
    
    setData(prev => ({
      ...prev,
      contour: newContour
    }));
    
    setSelectedPoint(null);
    
    // 添加到历史记录
    addToHistory({
      ...data,
      contour: newContour
    });
  };
  
  // 添加到历史记录
  const addToHistory = (newData: ExcavationDiagramData) => {
    // 如果当前不是最新状态，删除后面的历史记录
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({...newData});
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  
  // 撤销
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setData({...history[newIndex]});
    }
  };
  
  // 重做
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setData({...history[newIndex]});
    }
  };
  
  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">基坑二维示意图</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="放大">
            <IconButton size="small" onClick={handleZoomIn}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="缩小">
            <IconButton size="small" onClick={handleZoomOut}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="平移">
            <IconButton size="small">
              <PanToolIcon />
            </IconButton>
          </Tooltip>
          {editMode && (
            <>
              <Tooltip title="撤销">
                <span>
                  <IconButton 
                    size="small" 
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                  >
                    <UndoIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="重做">
                <span>
                  <IconButton 
                    size="small" 
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                  >
                    <RedoIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>
      
      <Box 
        sx={{ 
          position: 'relative',
          height: height,
          border: '1px solid #ddd',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        <canvas 
          ref={canvasRef}
          width={800}
          height={height}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          style={{ cursor: editMode ? (selectedPoint ? 'move' : 'pointer') : 'default' }}
        />
      </Box>
      
      {editMode && (
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                基坑深度 (m)
              </Typography>
              <Slider
                value={data.excavationDepth}
                onChange={handleDepthChange}
                min={1}
                max={30}
                step={0.1}
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                水位深度 (m)
              </Typography>
              <Slider
                value={data.waterLevel}
                onChange={handleWaterLevelChange}
                min={0}
                max={20}
                step={0.1}
                valueLabelDisplay="auto"
              />
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>
            基坑轮廓点
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <Button 
              size="small" 
              startIcon={<AddIcon />}
              onClick={handleAddPoint}
              variant="outlined"
            >
              添加点
            </Button>
            <Button 
              size="small" 
              startIcon={<DeleteIcon />}
              onClick={handleDeletePoint}
              variant="outlined"
              color="error"
              disabled={!selectedPoint || !data.contour || data.contour.length <= 3}
            >
              删除选中点
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            点击基坑轮廓上的点进行编辑。至少需要3个点来定义基坑轮廓。
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default ExcavationDiagramViewer; 