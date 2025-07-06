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