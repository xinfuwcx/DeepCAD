import React, { useState, useMemo } from 'react';
import { Box, Paper, Button } from '@mui/material';
import * as THREE from 'three';
import ProjectTree from '../components/layout/ProjectTree';
import PropertyPanel from '../components/layout/PropertyPanel';
import Viewport from '../components/viewport/Viewport';
import { createSoilMesh, createExcavationPunch } from '../services/geometryService';

// --- 类型定义 ---
export interface Point3D { x: number; y: number; z: number; }

export interface SoilParameters {
  surfacePoints: Point3D[];
  thickness: number;
  infiniteElement: boolean;
}

export interface ExcavationParameters {
  dxf: any;
  depth: number;
}

export type SceneObject = {
  id: string;
  name: string;
} & (
  {
    type: 'soil';
    parameters: SoilParameters;
  } | {
    type: 'excavation';
    parameters: ExcavationParameters;
  }
);
// --- End of 类型定义 ---

declare const ThreeBvhCsg: any;

const MainPage: React.FC = () => {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  const handleAddObject = (params: Omit<SceneObject, 'id' | 'name'>) => {
    let name = '';
    switch (params.type) {
      case 'soil':
        name = `土体-${objects.filter(o => o.type === 'soil').length + 1}`;
        break;
      case 'excavation':
        name = `基坑-${objects.filter(o => o.type === 'excavation').length + 1}`;
        break;
      default:
        name = `对象-${objects.length + 1}`;
    }

    const newObject = {
      ...params,
      id: `${Date.now()}-${Math.random()}`,
      name: name,
    } as SceneObject;
    setObjects([...objects, newObject]);
    setSelectedObjectId(newObject.id);
  };

  const handleUpdateObject = (id: string, updatedParams: Partial<SoilParameters | ExcavationParameters>) => {
    setObjects(currentObjects =>
      currentObjects.map(obj => {
        if (obj.id === id) {
          const newParameters = { ...obj.parameters, ...updatedParams };
          return { ...obj, parameters: newParameters } as SceneObject;
        }
        return obj;
      })
    );
  };

  const handleSelectObject = (id: string | null) => {
    setSelectedObjectId(id);
  };

  const sceneMeshes = useMemo(() => {
    const soilObject = objects.find((o): o is SceneObject & { type: 'soil' } => o.type === 'soil');
    if (!soilObject) return [];

    let soilMesh: THREE.Mesh = createSoilMesh(soilObject.parameters);
    
    if (typeof ThreeBvhCsg !== 'undefined') {
        const csgEvaluator = new ThreeBvhCsg.Evaluator();
        const excavations = objects.filter((o): o is SceneObject & { type: 'excavation' } => o.type === 'excavation');
        excavations.forEach(exc => {
          const punchMesh = createExcavationPunch(exc.parameters, soilObject.parameters);
          if (punchMesh) {
            soilMesh.updateMatrixWorld();
            punchMesh.updateMatrixWorld();
            const brush = new ThreeBvhCsg.Brush(punchMesh.geometry);
            const result = csgEvaluator.evaluate(soilMesh, brush, ThreeBvhCsg.SUBTRACTION);
            result.material = soilMesh.material;
            soilMesh = result;
          }
        });
    }
    
    soilMesh.userData.isSceneObject = true;
    soilMesh.userData.id = soilObject.id; // 关联ID
    return [soilMesh];
  }, [objects]);
  
  const handleRunAnalysis = async () => {
    if (objects.length === 0) {
      alert("场景中没有对象可供分析。");
      return;
    }

    const sceneDescription = {
      version: "1.0",
      objects: objects,
    };
    
    const jsonData = JSON.stringify(sceneDescription, null, 2);
    
    console.log("正在向后端发送BIM数据:", jsonData);

    try {
      const response = await fetch('http://localhost:8000/api/v4/analyze/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("收到后端响应:", result);
      alert(`分析请求成功！后端消息: ${result.message}`);
    } catch (error) {
      console.error("分析请求失败:", error);
      alert(`分析请求失败，请检查后端服务是否已启动，并查看控制台获取详细信息。`);
    }
  };

  const selectedObject = objects.find(obj => obj.id === selectedObjectId) || null;

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <Paper sx={{ width: '240px', p: 1, overflowY: 'auto', zIndex: 1 }}>
        <ProjectTree 
          objects={objects} 
          selectedId={selectedObjectId} 
          onSelect={handleSelectObject} 
        />
      </Paper>
      <Box sx={{ flex: 1, position: 'relative' }}>
        <Viewport meshes={sceneMeshes} />
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleRunAnalysis}
          sx={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000 }}
        >
          开始分析
        </Button>
      </Box>
      <Paper sx={{ width: '320px', p: 1, overflowY: 'auto', zIndex: 1 }}>
        <PropertyPanel 
          selectedObject={selectedObject} 
          onAddObject={handleAddObject} 
          onUpdateObject={handleUpdateObject} 
        />
      </Paper>
    </Box>
  );
};

export default MainPage; 