import React, { useRef, useEffect } from 'react';
import { Card } from 'antd';

interface SoilDomainCanvas2DProps {
  boreholeExtents: { minX: number; maxX: number; minY: number; maxY: number };
  domainExpansion: { dx: number; dy: number };
  bottomElevation: number;
}

const BOREHOLE_AREA_COLOR = 'rgba(255, 165, 0, 0.3)'; // Orange, semi-transparent
const EXPANSION_AREA_COLOR = 'rgba(0, 128, 255, 0.3)'; // Blue, semi-transparent
const BORDER_COLOR = '#888';
const TEXT_COLOR = '#333';
const DIMENSION_LINE_COLOR = '#c41d7f';

export const SoilDomainCanvas2D: React.FC<SoilDomainCanvas2DProps> = ({
  boreholeExtents,
  domainExpansion,
  bottomElevation,
}) => {
  const topViewRef = useRef<HTMLCanvasElement>(null);
  const sideViewRef = useRef<HTMLCanvasElement>(null);

  const draw = () => {
    // --- Top View ---
    const topCtx = topViewRef.current?.getContext('2d');
    if (topCtx) {
      const canvas = topViewRef.current!;
      const { width, height } = canvas;
      topCtx.clearRect(0, 0, width, height);

      const bhWidth = boreholeExtents.maxX - boreholeExtents.minX;
      const bhHeight = boreholeExtents.maxY - boreholeExtents.minY;
      const totalWidth = bhWidth + 2 * domainExpansion.dx;
      const totalHeight = bhHeight + 2 * domainExpansion.dy;

      if (totalWidth <= 0 || totalHeight <= 0) return;

      const scale = Math.min((width - 40) / totalWidth, (height - 40) / totalHeight);
      const offsetX = (width - totalWidth * scale) / 2;
      const offsetY = (height - totalHeight * scale) / 2;
      
      topCtx.strokeStyle = BORDER_COLOR;
      topCtx.lineWidth = 1;

      // Draw expansion area
      topCtx.fillStyle = EXPANSION_AREA_COLOR;
      topCtx.fillRect(offsetX, offsetY, totalWidth * scale, totalHeight * scale);
      topCtx.strokeRect(offsetX, offsetY, totalWidth * scale, totalHeight * scale);

      // Draw borehole area
      topCtx.fillStyle = BOREHOLE_AREA_COLOR;
      const coreX = offsetX + domainExpansion.dx * scale;
      const coreY = offsetY + domainExpansion.dy * scale;
      const coreW = bhWidth * scale;
      const coreH = bhHeight * scale;
      topCtx.fillRect(coreX, coreY, coreW, coreH);
      topCtx.strokeRect(coreX, coreY, coreW, coreH);
      
      // Draw dimensions
      topCtx.fillStyle = TEXT_COLOR;
      topCtx.font = '12px Arial';
      topCtx.textAlign = 'center';
      topCtx.textBaseline = 'middle';
      topCtx.fillText('Borehole Zone', coreX + coreW / 2, coreY + coreH / 2);

      drawDimension(topCtx, coreX, coreY + coreH + 5, coreX + coreW, coreY + coreH + 5, `${bhWidth.toFixed(1)}m`);
      drawDimension(topCtx, coreX - 5, coreY, coreX - 5, coreY + coreH, `${bhHeight.toFixed(1)}m`, 'vertical');
      drawDimension(topCtx, offsetX, offsetY - 5, offsetX + totalWidth*scale, offsetY - 5, `${totalWidth.toFixed(1)}m`);

    }

    // --- Side View ---
    const sideCtx = sideViewRef.current?.getContext('2d');
    if (sideCtx) {
        const canvas = sideViewRef.current!;
        const { width, height } = canvas;
        sideCtx.clearRect(0, 0, width, height);

        const totalWidth = boreholeExtents.maxX - boreholeExtents.minX + 2 * domainExpansion.dx;
        // Assuming some average ground elevation for drawing purposes, e.g., 0
        const topElevation = 5; 
        const totalHeight = topElevation - bottomElevation;
        
        if (totalWidth <= 0 || totalHeight <= 0) return;

        const scaleX = (width - 60) / totalWidth;
        const scaleY = (height - 40) / totalHeight;
        
        const offsetX = 30;
        const offsetY = 20;

        // Draw ground surface line
        sideCtx.strokeStyle = '#8c522a'; // Brown for ground
        sideCtx.lineWidth = 2;
        sideCtx.beginPath();
        sideCtx.moveTo(offsetX, offsetY);
        sideCtx.lineTo(offsetX + totalWidth * scaleX, offsetY);
        sideCtx.stroke();
        sideCtx.fillText('Ground (approx. 0.0m)', offsetX + 5, offsetY - 10);
        
        // Draw bottom elevation line
        sideCtx.strokeStyle = BORDER_COLOR;
        sideCtx.lineWidth = 1;
        const bottomY = offsetY + totalHeight * scaleY;
        sideCtx.beginPath();
        sideCtx.moveTo(offsetX, bottomY);
        sideCtx.lineTo(offsetX + totalWidth * scaleX, bottomY);
        sideCtx.stroke();
        
        drawDimension(sideCtx, offsetX - 5, offsetY, offsetX - 5, bottomY, `${totalHeight.toFixed(1)}m`, 'vertical');
        sideCtx.fillStyle = TEXT_COLOR;
        sideCtx.fillText(`Bottom Elevation: ${bottomElevation.toFixed(1)}m`, offsetX + 5, bottomY - 10);
    }
  };

  const drawDimension = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, text: string, orientation = 'horizontal') => {
    ctx.strokeStyle = DIMENSION_LINE_COLOR;
    ctx.fillStyle = DIMENSION_LINE_COLOR;
    ctx.lineWidth = 0.5;
    ctx.font = '10px Arial';

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const tickSize = 3;
    ctx.beginPath();
    if(orientation === 'horizontal') {
        ctx.moveTo(x1, y1 - tickSize);
        ctx.lineTo(x1, y1 + tickSize);
        ctx.moveTo(x2, y2 - tickSize);
        ctx.lineTo(x2, y2 + tickSize);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(text, x1 + (x2 - x1) / 2, y1 - tickSize);
    } else {
        ctx.moveTo(x1 - tickSize, y1);
        ctx.lineTo(x1 + tickSize, y1);
        ctx.moveTo(x2 - tickSize, y2);
        ctx.lineTo(x2 + tickSize, y2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.save();
        ctx.translate(x1 - tickSize - 2, y1 + (y2-y1)/2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(text, 0, 0);
        ctx.restore();
    }
    ctx.stroke();
};


  useEffect(() => {
    draw();
  }, [boreholeExtents, domainExpansion, bottomElevation]);

  return (
    <Card title="2D Schematic Views">
      <div style={{ display: 'flex', justifyContent: 'space-around', gap: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <h4>Top View (Plan)</h4>
          <canvas ref={topViewRef} width={300} height={250} style={{ border: '1px solid #d9d9d9' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h4>Side View (Profile)</h4>
          <canvas ref={sideViewRef} width={300} height={250} style={{ border: '1px solid #d9d9d9' }} />
        </div>
      </div>
    </Card>
  );
};

// Add default extents to prevent errors on first render
SoilDomainCanvas2D.defaultProps = {
    boreholeExtents: { minX: 0, maxX: 1, minY: 0, maxY: 1},
    domainExpansion: { dx: 10, dy: 10 },
    bottomElevation: -20
}
