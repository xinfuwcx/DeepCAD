import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import * as THREE from 'three';
import Background3D from '../../../js/background3d';
import { ExcavationModel } from '../../models/types';

interface ExcavationDiagramViewerProps {
  model: ExcavationModel;
  width?: string | number;
  height?: string | number;
}

const ExcavationDiagramViewer: React.FC<ExcavationDiagramViewerProps> = ({
  model,
  width = '100%',
  height = '600px'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const background3DRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 初始化3D背景
    background3DRef.current = new Background3D(containerRef.current, {
      gridSize: 200,
      gridDivisions: 20,
      gridColor1: 0x444444,
      gridColor2: 0x888888,
      backgroundColor: 0x1A1A2E,
      axisLength: 50,
      showGrid: true,
      showAxes: true
    });

    // 如果有模型数据，添加到场景
    if (model && model.geometryData) {
      renderModelData(model);
    }

    return () => {
      // 清理
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
      }
    };
  }, []);

  // 当模型数据更新时重新渲染
  useEffect(() => {
    if (!background3DRef.current || !model) return;
    renderModelData(model);
  }, [model]);

  const renderModelData = (modelData: ExcavationModel) => {
    if (!background3DRef.current) return;

    // 清除现有模型（保留背景和坐标系）
    background3DRef.current.clearScene();

    // 这里添加模型渲染逻辑
    // 示例：根据模型数据创建基坑几何体
    if (modelData.geometryData) {
      try {
        // 创建基坑几何体
        const excavationGeometry = createExcavationGeometry(modelData);
        background3DRef.current.addToScene(excavationGeometry);

        // 创建地层
        const soilLayers = createSoilLayers(modelData);
        soilLayers.forEach(layer => {
          background3DRef.current.addToScene(layer);
        });

        // 创建支护结构
        const supportStructures = createSupportStructures(modelData);
        supportStructures.forEach(structure => {
          background3DRef.current.addToScene(structure);
        });

        // 调整相机位置以适应模型
        const size = modelData.geometryData.width || 100;
        background3DRef.current.setCameraPosition(size, size * 0.7, size);
      } catch (error) {
        console.error('Error rendering excavation model:', error);
      }
    }
  };

  // 创建基坑几何体
  const createExcavationGeometry = (modelData: ExcavationModel) => {
    const { width = 100, length = 100, depth = 20 } = modelData.geometryData || {};
    
    // 创建基坑轮廓（底面）
    const shape = new THREE.Shape();
    shape.moveTo(-width/2, -length/2);
    shape.lineTo(width/2, -length/2);
    shape.lineTo(width/2, length/2);
    shape.lineTo(-width/2, length/2);
    shape.lineTo(-width/2, -length/2);
    
    // 创建挤压几何体
    const extrudeSettings = {
      steps: 1,
      depth: depth,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // 创建网格材质
    const material = new THREE.MeshPhongMaterial({
      color: 0x4A90E2,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      wireframe: false
    });
    
    // 创建网格
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, 0);
    mesh.rotation.x = Math.PI / 2; // 旋转使Y轴向上
    
    // 添加边框线
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x2C3E50, linewidth: 1 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    wireframe.rotation.x = Math.PI / 2;
    
    // 创建组合对象
    const group = new THREE.Group();
    group.add(mesh);
    group.add(wireframe);
    
    return group;
  };

  // 创建土层
  const createSoilLayers = (modelData: ExcavationModel) => {
    const layers = [];
    const { width = 100, length = 100 } = modelData.geometryData || {};
    
    // 从模型中获取土层数据
    const soilLayers = modelData.soilLayers || [
      { depth: 5, color: 0xE8C17D, name: '填土层' },
      { depth: 10, color: 0xC19A6B, name: '粉质粘土' },
      { depth: 15, color: 0x8B4513, name: '砂质土' }
    ];
    
    let currentDepth = 0;
    
    // 为每个土层创建几何体
    soilLayers.forEach((layer, index) => {
      const layerWidth = width * 2; // 扩展土层宽度
      const layerLength = length * 2; // 扩展土层长度
      const layerDepth = layer.depth;
      
      // 创建土层几何体
      const geometry = new THREE.BoxGeometry(layerWidth, layerDepth, layerLength);
      
      // 创建材质
      const material = new THREE.MeshPhongMaterial({
        color: layer.color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      
      // 创建网格
      const mesh = new THREE.Mesh(geometry, material);
      
      // 定位土层（Y轴向上）
      mesh.position.set(0, currentDepth + layerDepth/2, 0);
      
      // 添加到土层数组
      layers.push(mesh);
      
      // 更新当前深度
      currentDepth += layerDepth;
    });
    
    return layers;
  };

  // 创建支护结构
  const createSupportStructures = (modelData: ExcavationModel) => {
    const structures = [];
    const { width = 100, length = 100, depth = 20 } = modelData.geometryData || {};
    
    // 示例：创建地连墙
    if (modelData.supportStructures?.diaphragmWall) {
      const wallThickness = 1;
      const wallDepth = depth * 1.5; // 地连墙深度通常大于挖掘深度
      
      // 创建四面墙
      const wallMaterial = new THREE.MeshPhongMaterial({
        color: 0xCCCCCC,
        transparent: true,
        opacity: 0.9
      });
      
      // 前墙
      const frontWallGeometry = new THREE.BoxGeometry(width, wallDepth, wallThickness);
      const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
      frontWall.position.set(0, wallDepth/2, length/2);
      structures.push(frontWall);
      
      // 后墙
      const backWallGeometry = new THREE.BoxGeometry(width, wallDepth, wallThickness);
      const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
      backWall.position.set(0, wallDepth/2, -length/2);
      structures.push(backWall);
      
      // 左墙
      const leftWallGeometry = new THREE.BoxGeometry(wallThickness, wallDepth, length);
      const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
      leftWall.position.set(-width/2, wallDepth/2, 0);
      structures.push(leftWall);
      
      // 右墙
      const rightWallGeometry = new THREE.BoxGeometry(wallThickness, wallDepth, length);
      const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
      rightWall.position.set(width/2, wallDepth/2, 0);
      structures.push(rightWall);
    }
    
    // 示例：创建支撑
    if (modelData.supportStructures?.struts) {
      const strutMaterial = new THREE.MeshPhongMaterial({
        color: 0x2CC16A
      });
      
      // 水平支撑
      for (let i = 1; i <= 2; i++) {
        const strutLevel = depth * i / 3;
        
        // 横向支撑
        const horizontalStrutGeometry = new THREE.CylinderGeometry(1, 1, width - 10, 16);
        horizontalStrutGeometry.rotateZ(Math.PI/2);
        const horizontalStrut = new THREE.Mesh(horizontalStrutGeometry, strutMaterial);
        horizontalStrut.position.set(0, strutLevel, 0);
        structures.push(horizontalStrut);
        
        // 纵向支撑
        const verticalStrutGeometry = new THREE.CylinderGeometry(1, 1, length - 10, 16);
        verticalStrutGeometry.rotateX(Math.PI/2);
        const verticalStrut = new THREE.Mesh(verticalStrutGeometry, strutMaterial);
        verticalStrut.position.set(0, strutLevel, 0);
        structures.push(verticalStrut);
      }
    }
    
    // 示例：创建锚索
    if (modelData.supportStructures?.anchors) {
      const anchorMaterial = new THREE.MeshPhongMaterial({
        color: 0xF5A623
      });
      
      // 每面墙上添加锚索
      const anchorRadius = 0.5;
      const anchorLength = 30;
      const anchorAngle = Math.PI / 6; // 30度
      
      // 在四面墙上添加锚索
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++) {
          const anchorLevel = depth * (j + 1) / 4;
          const anchorGeometry = new THREE.CylinderGeometry(anchorRadius, anchorRadius, anchorLength, 8);
          const anchor = new THREE.Mesh(anchorGeometry, anchorMaterial);
          
          // 根据墙的位置旋转和定位锚索
          switch(i) {
            case 0: // 前墙
              anchor.rotation.x = -anchorAngle;
              anchor.position.set(-width/4 + j*width/4, anchorLevel, length/2);
              break;
            case 1: // 后墙
              anchor.rotation.x = anchorAngle;
              anchor.position.set(-width/4 + j*width/4, anchorLevel, -length/2);
              break;
            case 2: // 左墙
              anchor.rotation.z = anchorAngle;
              anchor.position.set(-width/2, anchorLevel, -length/4 + j*length/4);
              break;
            case 3: // 右墙
              anchor.rotation.z = -anchorAngle;
              anchor.position.set(width/2, anchorLevel, -length/4 + j*length/4);
              break;
          }
          
          structures.push(anchor);
        }
      }
    }
    
    return structures;
  };

  return (
    <Box sx={{ position: 'relative', width, height }}>
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      />
      {!model && (
        <Typography 
          variant="h6" 
          sx={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            color: 'text.secondary'
          }}
        >
          无可用模型数据
        </Typography>
      )}
    </Box>
  );
};

export default ExcavationDiagramViewer; 