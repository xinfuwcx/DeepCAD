import React, { useRef, useEffect } from 'react';
import { Card } from 'antd';
import * as dxf from 'dxf-parser';

interface ExcavationCanvas2DProps {
  soilDomainExtents: { minX: number; maxX: number; minY: number; maxY: number };
  dxfContourPoints: { x: number; y: number }[] | null;
  excavationDepth: number;
}

const SOIL_AREA_COLOR = 'rgba(139, 69, 19, 0.2)'; // Brown, semi-transparent
const EXCAVATION_AREA_COLOR = 'rgba(255, 0, 0, 0.4)'; // Red, semi-transparent
const BORDER_COLOR = '#888';
const TEXT_COLOR = '#333';

export const ExcavationCanvas2D: React.FC<ExcavationCanvas2DProps> = ({
  soilDomainExtents,
  dxfContourPoints,
  excavationDepth,
}) => {
  const topViewRef = useRef<HTMLCanvasElement>(null);

  const drawTopView = () => {
    const ctx = topViewRef.current?.getContext('2d');
    if (!ctx) return;

    const canvas = topViewRef.current!;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    
    const soilWidth = soilDomainExtents.maxX - soilDomainExtents.minX;
    const soilHeight = soilDomainExtents.maxY - soilDomainExtents.minY;

    if (soilWidth <= 0 || soilHeight <= 0) return;

    const scale = Math.min((width - 40) / soilWidth, (height - 40) / soilHeight);
    const offsetX = (width - soilWidth * scale) / 2;
    const offsetY = (height - soilHeight * scale) / 2;

    // Draw soil domain area
    ctx.fillStyle = SOIL_AREA_COLOR;
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.fillRect(offsetX, offsetY, soilWidth * scale, soilHeight * scale);
    ctx.strokeRect(offsetX, offsetY, soilWidth * scale, soilHeight * scale);
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Soil Domain', width / 2, offsetY + (soilHeight * scale) / 2);

    // Draw excavation contour if available
    if (dxfContourPoints && dxfContourPoints.length > 1) {
      // 1. Calculate centroid of the contour
      const contourXs = dxfContourPoints.map(p => p.x);
      const contourYs = dxfContourPoints.map(p => p.y);
      const contourMinX = Math.min(...contourXs);
      const contourMinY = Math.min(...contourYs);
      const contourCentroidX = contourMinX + (Math.max(...contourXs) - contourMinX) / 2;
      const contourCentroidY = contourMinY + (Math.max(...contourYs) - contourMinY) / 2;

      // 2. Calculate centroid of the soil domain
      const soilCentroidX = soilDomainExtents.minX + soilWidth / 2;
      const soilCentroidY = soilDomainExtents.minY + soilHeight / 2;
      
      // 3. Calculate translation needed
      const translateX = soilCentroidX - contourCentroidX;
      const translateY = soilCentroidY - contourCentroidY;

      // 4. Draw the moved contour
      ctx.fillStyle = EXCAVATION_AREA_COLOR;
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      
      dxfContourPoints.forEach((p, index) => {
        const canvasX = offsetX + ((p.x + translateX) - soilDomainExtents.minX) * scale;
        const canvasY = offsetY + ((p.y + translateY) - soilDomainExtents.minY) * scale;
        if (index === 0) {
          ctx.moveTo(canvasX, canvasY);
        } else {
          ctx.lineTo(canvasX, canvasY);
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFF';
      ctx.fillText('Excavation', width / 2, height / 2);
    }
  };

  useEffect(() => {
    drawTopView();
  }, [soilDomainExtents, dxfContourPoints]);

  return (
    <Card title="2D Schematic (Plan View)">
      <div style={{ textAlign: 'center' }}>
        <canvas ref={topViewRef} width={400} height={300} style={{ border: '1px solid #d9d9d9' }} />
      </div>
    </Card>
  );
};
