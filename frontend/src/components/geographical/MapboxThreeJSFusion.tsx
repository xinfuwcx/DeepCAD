/**
 * Three.js 地理可视化控制中心（优化版）
 * 2号几何专家 - 基于Three.js的专业地理可视化界面
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button, Typography, Card } from 'antd';
import * as THREE from 'three';

const { Title, Text } = Typography;

interface MapboxThreeJSFusionProps {
  className?: string;
  style?: React.CSSProperties;
  onProjectLocationSelect?: (location: { lat: number; lng: number; elevation: number }) => void;
  projects?: any[];
}

export const ThreeJSGeoVisualization: React.FC<MapboxThreeJSFusionProps> = ({
  className,
  style,
  onProjectLocationSelect,
  projects = []
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  useEffect(() => {
    // 模拟地图加载
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleMapClick = (event: React.MouseEvent) => {
    if (onProjectLocationSelect) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const lat = 39.9 + (y / rect.height - 0.5) * 10;
      const lng = 116.4 + (x / rect.width - 0.5) * 10;
      
      onProjectLocationSelect({ lat, lng, elevation: 50 });
    }
  };

  return (
    <motion.div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'linear-gradient(135deg, #1a2332, #0f1419)',
        borderRadius: '8px',
        overflow: 'hidden',
        ...style
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      onClick={handleMapClick}
    >
      {isLoading ? (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#00d9ff',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ marginRight: '12px' }}
          >
            🌍
          </motion.div>
          加载地理可视化系统...
        </div>
      ) : (
        <>
          {/* 模拟地图背景 */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(0, 217, 255, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(82, 196, 26, 0.2) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(235, 47, 150, 0.1) 0%, transparent 50%)
            `,
            opacity: 0.6
          }} />
          
          {/* 项目标记 */}
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
              style={{
                position: 'absolute',
                left: `${20 + index * 25}%`,
                top: `${30 + index * 15}%`,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: project.status === 'active' ? '#52c41a' : 
                           project.status === 'planning' ? '#faad14' : '#1890ff',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(0, 217, 255, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px'
              }}
              whileHover={{ scale: 1.5 }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                📍
              </motion.div>
            </motion.div>
          ))}
          
          {/* 地图网格线 */}
          <svg style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0.2,
            pointerEvents: 'none'
          }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <g key={i}>
                <line
                  x1={`${i * 10}%`}
                  y1="0%"
                  x2={`${i * 10}%`}
                  y2="100%"
                  stroke="rgba(0, 217, 255, 0.3)"
                  strokeWidth="1"
                />
                <line
                  x1="0%"
                  y1={`${i * 10}%`}
                  x2="100%"
                  y2={`${i * 10}%`}
                  stroke="rgba(0, 217, 255, 0.3)"
                  strokeWidth="1"
                />
              </g>
            ))}
          </svg>
        </>
      )}
    </motion.div>
  );
};

export default MapboxThreeJSFusion;