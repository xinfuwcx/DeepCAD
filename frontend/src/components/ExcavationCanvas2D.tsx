/**
 * DeepCAD 深基坑二维平面图组件
 * @description 基于Canvas2D的深基坑工程平面视图显示组件，支持DXF导入和土体区域可视化
 * 提供基坑轮廓、土体域、开挖范围的二维绘制功能
 * @author 1号架构师
 * @version 2.0.0
 * @since 2024-07-25
 */

import React, { useRef, useEffect } from 'react';
import { Card } from 'antd';
import * as dxf from 'dxf-parser';

/**
 * 深基坑二维画布组件属性接口
 * @interface ExcavationCanvas2DProps
 */
interface ExcavationCanvas2DProps {
  /** 土体域范围坐标 */
  soilDomainExtents: { 
    /** 最小X坐标 (米) */
    minX: number; 
    /** 最大X坐标 (米) */
    maxX: number; 
    /** 最小Y坐标 (米) */
    minY: number; 
    /** 最大Y坐标 (米) */
    maxY: number; 
  };
  /** DXF轮廓点坐标数组 */
  dxfContourPoints: { x: number; y: number }[] | null;
  /** 基坑开挖深度 (米) */
  excavationDepth: number;
}

// 绘制样式常量定义
/** 土体区域颜色 - 棕色半透明 */
const SOIL_AREA_COLOR = 'rgba(139, 69, 19, 0.2)';
/** 开挖区域颜色 - 红色半透明 */
const EXCAVATION_AREA_COLOR = 'rgba(255, 0, 0, 0.4)';
/** 边界线颜色 */
const BORDER_COLOR = '#888';
/** 文字颜色 */
const TEXT_COLOR = '#333';

/**
 * 深基坑二维平面图组件
 * @description 渲染深基坑工程的二维平面视图，包括土体域、基坑轮廓、开挖区域等
 * @param props - 组件属性参数
 * @returns JSX.Element - 二维画布组件
 */
export const ExcavationCanvas2D: React.FC<ExcavationCanvas2DProps> = ({
  soilDomainExtents,
  dxfContourPoints,
  excavationDepth,
}) => {
  /** Canvas画布引用 */
  const topViewRef = useRef<HTMLCanvasElement>(null);

  /**
   * 绘制基坑俯视图
   * @description 在Canvas上绘制土体域、基坑轮廓、开挖区域等二维平面图形
   * @returns void
   */
  const drawTopView = () => {
    const ctx = topViewRef.current?.getContext('2d');
    if (!ctx) return;

    const canvas = topViewRef.current!;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    
    // 计算土体域尺寸
    const soilWidth = soilDomainExtents.maxX - soilDomainExtents.minX;
    const soilHeight = soilDomainExtents.maxY - soilDomainExtents.minY;

    if (soilWidth <= 0 || soilHeight <= 0) return;

    // 计算缩放比例和偏移量，保持纵横比
    const scale = Math.min((width - 40) / soilWidth, (height - 40) / soilHeight);
    const offsetX = (width - soilWidth * scale) / 2;
    const offsetY = (height - soilHeight * scale) / 2;

    // 绘制土体域区域
    ctx.fillStyle = SOIL_AREA_COLOR;
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.fillRect(offsetX, offsetY, soilWidth * scale, soilHeight * scale);
    ctx.strokeRect(offsetX, offsetY, soilWidth * scale, soilHeight * scale);
    
    // 绘制土体域标签
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('土体域', width / 2, offsetY + (soilHeight * scale) / 2);

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
