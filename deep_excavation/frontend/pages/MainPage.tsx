import React, { useState, useMemo } from 'react';
import { Box, Paper, Button, Typography, Card, CardContent, CardActions, CircularProgress } from '@mui/material';
import * as THREE from 'three';
import ProjectTree from '../components/layout/ProjectTree';
import PropertyPanel from '../components/layout/PropertyPanel';
import Viewport from '../components/viewport/Viewport';
import { createSoilMesh, createExcavationPunch } from '../services/geometryService';
import { loadVtkMesh } from '../services/meshService';

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

// --- 新增类型定义 ---
interface MeshStatistics {
  num_points: number;
  num_cells: number;
  cell_types: string[];
}

interface AnalysisResultData {
  status: 'success' | 'error';
  message: string;
  mesh_statistics: MeshStatistics;
  mesh_filename: string | null;
}
// ---

declare const ThreeBvhCsg: any;

const MainPage: React.FC = () => {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMeshLoading, setIsMeshLoading] = useState(false);
  const [analysisMesh, setAnalysisMesh] = useState<THREE.Mesh | null>(null);

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
  
  const handleLoadAnalysisMesh = async () => {
    if (!analysisResult || !analysisResult.mesh_filename) {
      alert("没有可加载的分析结果文件。");
      return;
    }
    setIsMeshLoading(true);
    try {
      const geometry = await loadVtkMesh(analysisResult.mesh_filename);
      const material = new THREE.MeshStandardMaterial({
        color: 0x007bff,
        wireframe: true,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      // 清空现有场景并加载新网格
      setObjects([]); 
      setAnalysisMesh(mesh);

    } catch (error) {
      console.error(error);
      alert("加载分析网格失败，请查看控制台获取详细信息。");
    } finally {
      setIsMeshLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (objects.length === 0) {
      alert("场景中没有对象可供分析。");
      return;
    }
    
    setIsLoading(true);
    setAnalysisResult(null); // 开始分析前清空旧结果
    setAnalysisMesh(null); // 开始新分析前清空旧的可视化网格

    const sceneDescription = {
      version: "1.0",
      objects: objects,
    };
    
    const jsonData = JSON.stringify(sceneDescription, null, 2);
    
    console.log("正在向后端发送BIM数据:", jsonData);

    try {
      const response = await fetch('http://localhost:8000/api/analysis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonData,
      });

      const result: AnalysisResultData = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }
      
      console.log("收到后端响应:", result);
      setAnalysisResult(result);
      alert(`分析成功！后端消息: ${result.message}`);

    } catch (error: any) {
      console.error("分析请求失败:", error);
      setAnalysisResult({
        status: 'error',
        message: error.message || '未知错误',
        mesh_statistics: { num_points: 0, num_cells: 0, cell_types: [] },
        mesh_filename: null
      });
      alert(`分析请求失败: ${error.message}`);
    } finally {
      setIsLoading(false);
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
        {analysisResult && (
          <Card sx={{ mt: 2 }} variant="outlined">
            <CardContent>
              <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                分析结果
              </Typography>
              <Typography variant="h6" component="div" color={analysisResult.status === 'success' ? 'success.main' : 'error.main'}>
                {analysisResult.status === 'success' ? '网格生成成功' : '分析失败'}
              </Typography>
              <Typography sx={{ mb: 1.5, fontSize: '0.8rem' }} color="text.secondary">
                {analysisResult.message}
              </Typography>
              {analysisResult.status === 'success' && (
                <>
                  <Typography variant="body2">
                    节点数: {analysisResult.mesh_statistics.num_points}
                  </Typography>
                  <Typography variant="body2">
                    单元数: {analysisResult.mesh_statistics.num_cells}
                  </Typography>
                </>
              )}
            </CardContent>
            {analysisResult.status === 'success' && analysisResult.mesh_filename && (
              <CardActions>
                <Button 
                  size="small" 
                  variant="contained"
                  onClick={handleLoadAnalysisMesh}
                  disabled={isMeshLoading}
                >
                  {isMeshLoading ? <CircularProgress size={20} color="inherit" /> : '加载分析网格'}
                </Button>
              </CardActions>
            )}
          </Card>
        )}
      </Paper>
      <Box sx={{ flex: 1, position: 'relative' }}>
        <Viewport meshes={sceneMeshes} analysisMesh={analysisMesh} />
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleRunAnalysis}
          disabled={isLoading}
          sx={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000 }}
        >
          {isLoading ? '正在分析...' : '开始分析'}
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