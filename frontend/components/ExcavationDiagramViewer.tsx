import React, { useEffect, useRef } from 'react';

interface SoilLayer {
  depth: number;
  thickness: number;
  color: string;
  name: string;
}

interface ExcavationData {
  width: number;
  depth: number;
  x?: number;
  y?: number;
}

interface ExcavationDiagramViewerProps {
  soilLayers?: SoilLayer[];
  excavation?: ExcavationData;
  waterLevel?: number;
  showAnnotations?: boolean;
  showControls?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 深基坑二维示意图查看器组件
 */
const ExcavationDiagramViewer: React.FC<ExcavationDiagramViewerProps> = ({
  soilLayers,
  excavation,
  waterLevel,
  showAnnotations = true,
  showControls = true,
  className = '',
  style = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramInstanceRef = useRef<any>(null);

  // 初始化示意图
  useEffect(() => {
    if (!containerRef.current) return;

    // 动态导入ExcavationDiagram类
    const script = document.createElement('script');
    script.src = '/js/excavation_diagram.js';
    script.async = true;
    
    script.onload = () => {
      if (!containerRef.current) return;
      
      // 创建示意图实例
      if (window.ExcavationDiagram) {
        diagramInstanceRef.current = new window.ExcavationDiagram(containerRef.current, {
          soilLayers,
          excavation,
          waterLevel,
          showAnnotations,
          showControls
        });
      } else {
        console.error('ExcavationDiagram类未找到');
      }
    };
    
    document.body.appendChild(script);
    
    // 清理函数
    return () => {
      if (diagramInstanceRef.current) {
        diagramInstanceRef.current.destroy();
        diagramInstanceRef.current = null;
      }
      document.body.removeChild(script);
    };
  }, []);

  // 更新示意图数据
  useEffect(() => {
    if (!diagramInstanceRef.current) return;
    
    // 更新土层数据
    if (soilLayers) {
      diagramInstanceRef.current.updateSoilLayers(soilLayers);
    }
    
    // 更新基坑数据
    if (excavation) {
      diagramInstanceRef.current.updateExcavation(excavation);
    }
    
    // 更新水位深度
    if (waterLevel !== undefined) {
      diagramInstanceRef.current.updateWaterLevel(waterLevel);
    }
  }, [soilLayers, excavation, waterLevel]);

  return (
    <div 
      ref={containerRef} 
      className={`excavation-diagram-container ${className}`}
      style={{ width: '100%', height: '100%', ...style }}
    />
  );
};

// 为TypeScript添加全局声明
declare global {
  interface Window {
    ExcavationDiagram: any;
  }
}

export default ExcavationDiagramViewer; 