// 通用 Canvas 绘图辅助函数
export const getScale = (canvas: HTMLCanvasElement, modelWidth: number, margin = 20) => {
  return (canvas.width - margin * 2) / modelWidth;
};

export const drawDimension = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  text: string,
  vertical = false,
) => {
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  const arrow = 4;
  if (vertical) {
    ctx.beginPath();
    ctx.moveTo(startX - arrow, startY + arrow);
    ctx.lineTo(startX + arrow, startY + arrow);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(endX - arrow, endY - arrow);
    ctx.lineTo(endX + arrow, endY - arrow);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(startX + arrow, startY - arrow);
    ctx.lineTo(startX + arrow, startY + arrow);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(endX - arrow, endY - arrow);
    ctx.lineTo(endX - arrow, endY + arrow);
    ctx.stroke();
  }

  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (vertical) {
    ctx.save();
    ctx.translate((startX + endX) / 2, (startY + endY) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  } else {
    ctx.fillText(text, (startX + endX) / 2, (startY + endY) / 2 - 8);
  }
  ctx.restore();
};

// 土层 2D 剖面示意图
export interface SoilLayerDiagramParams {
  thickness: number; // m
  width: number; // m
  color: string;
}

export const drawSoilLayerDiagram = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  params: SoilLayerDiagramParams,
) => {
  const { thickness, width, color } = params;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scale = getScale(canvas, width);
  const layerHeight = thickness * scale;

  const startX = 40;
  const groundY = 40;

  ctx.fillStyle = color;
  ctx.fillRect(startX, groundY, width * scale, layerHeight);
  ctx.strokeStyle = '#000';
  ctx.strokeRect(startX, groundY, width * scale, layerHeight);

  ctx.beginPath();
  ctx.moveTo(startX - 10, groundY);
  ctx.lineTo(startX + width * scale + 10, groundY);
  ctx.stroke();

  drawDimension(
    ctx,
    startX + width * scale + 15,
    groundY,
    startX + width * scale + 15,
    groundY + layerHeight,
    `${thickness}m`,
    true,
  );
};

// 多视图图例渲染
export interface LegendItem {
  name: string;
  color: string;
}

export const drawLegend = (
  ctx: CanvasRenderingContext2D, 
  canvas: HTMLCanvasElement,
  items: LegendItem[],
  title: string = '图例'
) => {
  const padding = 10;
  const itemHeight = 20;
  const colorBoxWidth = 15;
  const spacing = 5;
  const titleHeight = 20;
  
  // 计算图例总高度
  const totalHeight = titleHeight + padding * 2 + items.length * itemHeight;
  
  // 计算最长文本宽度
  ctx.font = '12px Arial';
  let maxTextWidth = ctx.measureText(title).width;
  items.forEach(item => {
    const textWidth = ctx.measureText(item.name).width;
    if (textWidth > maxTextWidth) maxTextWidth = textWidth;
  });
  
  // 计算图例总宽度
  const totalWidth = padding * 2 + colorBoxWidth + spacing + maxTextWidth + 20;
  
  // 绘制图例背景
  const x = canvas.width - totalWidth - padding;
  const y = padding;
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, totalWidth, totalHeight);
  ctx.strokeRect(x, y, totalWidth, totalHeight);
  
  // 绘制标题
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + totalWidth / 2, y + padding + titleHeight / 2);
  
  // 绘制分隔线
  ctx.beginPath();
  ctx.moveTo(x, y + padding + titleHeight);
  ctx.lineTo(x + totalWidth, y + padding + titleHeight);
  ctx.stroke();
  
  // 绘制图例项
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  
  items.forEach((item, index) => {
    const itemY = y + padding + titleHeight + index * itemHeight + itemHeight / 2;
    
    // 绘制颜色框
    ctx.fillStyle = item.color;
    ctx.fillRect(x + padding, itemY - colorBoxWidth / 2, colorBoxWidth, colorBoxWidth);
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(x + padding, itemY - colorBoxWidth / 2, colorBoxWidth, colorBoxWidth);
    
    // 绘制文本
    ctx.fillStyle = '#000000';
    ctx.fillText(item.name, x + padding + colorBoxWidth + spacing, itemY);
  });
};

// 绘制坐标轴指示器
export const drawCoordinateSystem = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  size: number = 40,
  x: number = 50,
  y: number = canvas.height - 50
) => {
  const axisLength = size;
  const arrowSize = 5;
  
  // X轴 (红色)
  ctx.beginPath();
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 2;
  ctx.moveTo(x, y);
  ctx.lineTo(x + axisLength, y);
  ctx.stroke();
  
  // X轴箭头
  ctx.beginPath();
  ctx.moveTo(x + axisLength, y);
  ctx.lineTo(x + axisLength - arrowSize, y - arrowSize);
  ctx.lineTo(x + axisLength - arrowSize, y + arrowSize);
  ctx.closePath();
  ctx.fillStyle = '#FF0000';
  ctx.fill();
  
  // Y轴 (绿色)
  ctx.beginPath();
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 2;
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - axisLength);
  ctx.stroke();
  
  // Y轴箭头
  ctx.beginPath();
  ctx.moveTo(x, y - axisLength);
  ctx.lineTo(x - arrowSize, y - axisLength + arrowSize);
  ctx.lineTo(x + arrowSize, y - axisLength + arrowSize);
  ctx.closePath();
  ctx.fillStyle = '#00FF00';
  ctx.fill();
  
  // Z轴 (蓝色) - 使用等角投影
  ctx.beginPath();
  ctx.strokeStyle = '#0000FF';
  ctx.lineWidth = 2;
  ctx.moveTo(x, y);
  ctx.lineTo(x - axisLength * 0.7, y - axisLength * 0.7);
  ctx.stroke();
  
  // Z轴箭头
  ctx.beginPath();
  ctx.moveTo(x - axisLength * 0.7, y - axisLength * 0.7);
  ctx.lineTo(x - axisLength * 0.7 + arrowSize, y - axisLength * 0.7);
  ctx.lineTo(x - axisLength * 0.7, y - axisLength * 0.7 + arrowSize);
  ctx.closePath();
  ctx.fillStyle = '#0000FF';
  ctx.fill();
  
  // 坐标轴标签
  ctx.font = '12px Arial';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('X', x + axisLength + 10, y);
  ctx.fillText('Y', x, y - axisLength - 10);
  ctx.fillText('Z', x - axisLength * 0.7 - 10, y - axisLength * 0.7 - 10);
};

// 绘制网格地面
export const drawGridGround = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  gridSize: number = 20,
  majorLineInterval: number = 5
) => {
  const width = canvas.width;
  const height = canvas.height;
  
  // 计算网格数量
  const numGridsX = Math.floor(width / gridSize);
  const numGridsY = Math.floor(height / gridSize);
  
  // 绘制网格线
  ctx.strokeStyle = '#CCCCCC';
  ctx.lineWidth = 0.5;
  
  // 水平线
  for (let i = 0; i <= numGridsY; i++) {
    const y = i * gridSize;
    ctx.beginPath();
    
    // 主网格线加粗
    if (i % majorLineInterval === 0) {
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 1;
    } else {
      ctx.strokeStyle = '#DDDDDD';
      ctx.lineWidth = 0.5;
    }
    
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // 垂直线
  for (let i = 0; i <= numGridsX; i++) {
    const x = i * gridSize;
    ctx.beginPath();
    
    // 主网格线加粗
    if (i % majorLineInterval === 0) {
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 1;
    } else {
      ctx.strokeStyle = '#DDDDDD';
      ctx.lineWidth = 0.5;
    }
    
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}; 