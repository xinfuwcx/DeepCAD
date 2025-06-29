// TerrainDomain Component
import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, Slider, FormControl, InputLabel, Select, MenuItem, Button, Grid, TextField } from '@mui/material';
import { styled } from '@mui/material/styles';
import * as THREE from 'three';
import { Background3D } from '../../utils/background3d';
import { DomainInfo, SoilLayer, Point } from '../../models/types';

// 样式组件
const TerrainContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '600px',
  position: 'relative',
  backgroundColor: '#f5f5f5',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
}));

const ControlPanel = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  padding: theme.spacing(2),
  zIndex: 10,
  width: '280px',
  maxHeight: 'calc(100% - 32px)',
  overflow: 'auto',
}));

const LayerItem = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  marginBottom: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
}));

// 接口定义
interface TerrainDomainProps {
  domainInfo?: DomainInfo;
  soilLayers?: SoilLayer[];
  onChange?: (domain: DomainInfo, layers: SoilLayer[]) => void;
  readOnly?: boolean;
}

/**
 * TerrainDomain组件 - 用于显示和编辑地形域
 */
const TerrainDomain: React.FC<TerrainDomainProps> = ({
  domainInfo,
  soilLayers = [],
  onChange,
  readOnly = false,
}) => {
  // 状态
  const [domain, setDomain] = useState<DomainInfo>(domainInfo || {
    width: 100,
    length: 100,
    total_depth: 50,
  });
  const [layers, setLayers] = useState<SoilLayer[]>(soilLayers);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(-1);

  // 引用
  const containerRef = useRef<HTMLDivElement>(null);
  const background3DRef = useRef<Background3D | null>(null);
  const terrainMeshRef = useRef<THREE.Group | null>(null);

  // 初始化3D场景
  useEffect(() => {
    if (!containerRef.current) return;

    // 创建Background3D实例
    background3DRef.current = new Background3D(containerRef.current, {
      gridSize: Math.max(domain.width, domain.length),
      backgroundColor: 0xf0f0f0,
    });
    background3DRef.current.init();

    // 创建地形模型
    createTerrainModel();

    // 清理函数
    return () => {
      if (background3DRef.current) {
        // 清理资源
        background3DRef.current.dispose();
      }
    };
  }, []);

  // 当域信息或土层变化时更新模型
  useEffect(() => {
    createTerrainModel();
  }, [domain, layers]);

  // 创建地形模型
  const createTerrainModel = () => {
    if (!background3DRef.current) return;

    // 清除现有地形模型
    if (terrainMeshRef.current) {
      background3DRef.current.removeFromScene(terrainMeshRef.current);
    }

    // 创建新的地形组
    const terrainGroup = new THREE.Group();
    terrainMeshRef.current = terrainGroup;

    // 创建域边界框
    const boxGeometry = new THREE.BoxGeometry(domain.width, domain.total_depth, domain.length);
    const boxMaterial = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.1,
      wireframe: true,
    });
    const domainBox = new THREE.Mesh(boxGeometry, boxMaterial);
    domainBox.position.set(domain.width / 2, -domain.total_depth / 2, domain.length / 2);
    terrainGroup.add(domainBox);

    // 创建土层
    let currentDepth = 0;
    layers.forEach((layer, index) => {
      const layerHeight = layer.depth;
      const layerGeometry = new THREE.BoxGeometry(domain.width, layerHeight, domain.length);
      const layerMaterial = new THREE.MeshStandardMaterial({
        color: layer.color || getRandomColor(),
        transparent: true,
        opacity: 0.8,
      });
      const layerMesh = new THREE.Mesh(layerGeometry, layerMaterial);
      
      // 定位土层（从上到下堆叠）
      layerMesh.position.set(
        domain.width / 2,
        -currentDepth - layerHeight / 2,
        domain.length / 2
      );
      
      // 添加到地形组
      terrainGroup.add(layerMesh);
      
      // 如果是选中的土层，添加高亮边框
      if (index === selectedLayerIndex) {
        const edgesGeometry = new THREE.EdgesGeometry(layerGeometry);
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        layerMesh.add(edges);
      }
      
      // 更新当前深度
      currentDepth += layerHeight;
    });

    // 添加到场景
    background3DRef.current.addToScene(terrainGroup);

    // 调整相机位置以查看整个地形
    background3DRef.current.setCameraPosition(
      domain.width * 1.5,
      domain.total_depth * 0.8,
      domain.length * 1.5
    );
    background3DRef.current.setCameraLookAt(domain.width / 2, -domain.total_depth / 2, domain.length / 2);
  };

  // 更新域信息
  const handleDomainChange = (property: keyof DomainInfo, value: number) => {
    if (readOnly) return;
    
    const updatedDomain = { ...domain, [property]: value };
    setDomain(updatedDomain);
    
    if (onChange) {
      onChange(updatedDomain, layers);
    }
  };

  // 添加新土层
  const addNewLayer = () => {
    if (readOnly) return;
    
    // 计算剩余深度
    const usedDepth = layers.reduce((sum, layer) => sum + layer.depth, 0);
    const remainingDepth = Math.max(0, domain.total_depth - usedDepth);
    
    // 创建新土层
    const newLayer: SoilLayer = {
      name: `土层 ${layers.length + 1}`,
      depth: Math.min(10, remainingDepth),
      color: getRandomColor(),
      properties: {
        cohesion: 20,
        frictionAngle: 30,
        unitWeight: 18,
        elasticModulus: 50000,
        poissonRatio: 0.3,
      },
    };
    
    const updatedLayers = [...layers, newLayer];
    setLayers(updatedLayers);
    setSelectedLayerIndex(updatedLayers.length - 1);
    
    if (onChange) {
      onChange(domain, updatedLayers);
    }
  };

  // 更新土层
  const updateLayer = (index: number, property: keyof SoilLayer, value: any) => {
    if (readOnly) return;
    
    const updatedLayers = [...layers];
    updatedLayers[index] = { ...updatedLayers[index], [property]: value };
    
    setLayers(updatedLayers);
    
    if (onChange) {
      onChange(domain, updatedLayers);
    }
  };

  // 更新土层属性
  const updateLayerProperty = (index: number, property: string, value: any) => {
    if (readOnly) return;
    
    const updatedLayers = [...layers];
    updatedLayers[index] = {
      ...updatedLayers[index],
      properties: {
        ...updatedLayers[index].properties,
        [property]: value,
      },
    };
    
    setLayers(updatedLayers);
    
    if (onChange) {
      onChange(domain, updatedLayers);
    }
  };

  // 删除土层
  const deleteLayer = (index: number) => {
    if (readOnly) return;
    
    const updatedLayers = layers.filter((_, i) => i !== index);
    setLayers(updatedLayers);
    
    if (selectedLayerIndex === index) {
      setSelectedLayerIndex(-1);
    } else if (selectedLayerIndex > index) {
      setSelectedLayerIndex(selectedLayerIndex - 1);
    }
    
    if (onChange) {
      onChange(domain, updatedLayers);
    }
  };

  // 生成随机颜色
  const getRandomColor = (): string => {
    const colors = [
      '#A67D3D', // 棕色
      '#8B4513', // 深棕色
      '#D2B48C', // 浅棕色
      '#CD853F', // 秘鲁色
      '#DAA520', // 金菊色
      '#B8860B', // 暗金色
      '#BC8F8F', // 玫瑰棕色
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <TerrainContainer>
      {/* 3D渲染容器 */}
      <Box ref={containerRef} sx={{ width: '100%', height: '100%' }} />
      
      {/* 控制面板 */}
      <ControlPanel>
        <Typography variant="h6" gutterBottom>
          地形域设置
        </Typography>
        
        {/* 域尺寸控制 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            域尺寸
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2">宽度: {domain.width} m</Typography>
              <Slider
                value={domain.width}
                onChange={(_, value) => handleDomainChange('width', value as number)}
                min={10}
                max={500}
                disabled={readOnly}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2">长度: {domain.length} m</Typography>
              <Slider
                value={domain.length}
                onChange={(_, value) => handleDomainChange('length', value as number)}
                min={10}
                max={500}
                disabled={readOnly}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2">总深度: {domain.total_depth} m</Typography>
              <Slider
                value={domain.total_depth}
                onChange={(_, value) => handleDomainChange('total_depth', value as number)}
                min={10}
                max={200}
                disabled={readOnly}
              />
            </Grid>
          </Grid>
        </Box>
        
        {/* 土层控制 */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">
              土层 ({layers.length})
            </Typography>
            
            {!readOnly && (
              <Button
                variant="outlined"
                size="small"
                onClick={addNewLayer}
                disabled={layers.reduce((sum, layer) => sum + layer.depth, 0) >= domain.total_depth}
              >
                添加土层
              </Button>
            )}
          </Box>
          
          {/* 土层列表 */}
          {layers.map((layer, index) => (
            <LayerItem
              key={index}
              onClick={() => setSelectedLayerIndex(index)}
              sx={{
                bgcolor: selectedLayerIndex === index ? 'action.selected' : 'background.paper',
                cursor: 'pointer',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      bgcolor: layer.color || '#ccc',
                      mr: 1,
                      border: '1px solid #999',
                    }}
                  />
                  <Typography variant="body2">{layer.name}</Typography>
                </Box>
                
                {!readOnly && (
                  <Button
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLayer(index);
                    }}
                  >
                    删除
                  </Button>
                )}
              </Box>
              
              <Typography variant="caption">
                深度: {layer.depth} m
              </Typography>
              
              {selectedLayerIndex === index && (
                <Box sx={{ mt: 1 }}>
                  <TextField
                    label="名称"
                    value={layer.name}
                    onChange={(e) => updateLayer(index, 'name', e.target.value)}
                    size="small"
                    fullWidth
                    margin="dense"
                    disabled={readOnly}
                  />
                  
                  <Typography variant="caption">
                    深度 (m)
                  </Typography>
                  <Slider
                    value={layer.depth}
                    onChange={(_, value) => updateLayer(index, 'depth', value as number)}
                    min={1}
                    max={50}
                    disabled={readOnly}
                  />
                  
                  {layer.properties && (
                    <Grid container spacing={1} sx={{ mt: 1 }}>
                      <Grid item xs={6}>
                        <TextField
                          label="粘聚力 (kPa)"
                          type="number"
                          value={layer.properties.cohesion}
                          onChange={(e) => updateLayerProperty(index, 'cohesion', parseFloat(e.target.value))}
                          size="small"
                          fullWidth
                          disabled={readOnly}
                        />
                      </Grid>
                      
                      <Grid item xs={6}>
                        <TextField
                          label="摩擦角 (°)"
                          type="number"
                          value={layer.properties.frictionAngle}
                          onChange={(e) => updateLayerProperty(index, 'frictionAngle', parseFloat(e.target.value))}
                          size="small"
                          fullWidth
                          disabled={readOnly}
                        />
                      </Grid>
                      
                      <Grid item xs={6}>
                        <TextField
                          label="单位重 (kN/m³)"
                          type="number"
                          value={layer.properties.unitWeight}
                          onChange={(e) => updateLayerProperty(index, 'unitWeight', parseFloat(e.target.value))}
                          size="small"
                          fullWidth
                          disabled={readOnly}
                        />
                      </Grid>
                      
                      <Grid item xs={6}>
                        <TextField
                          label="弹性模量 (MPa)"
                          type="number"
                          value={layer.properties.elasticModulus}
                          onChange={(e) => updateLayerProperty(index, 'elasticModulus', parseFloat(e.target.value))}
                          size="small"
                          fullWidth
                          disabled={readOnly}
                        />
                      </Grid>
                      
                      <Grid item xs={6}>
                        <TextField
                          label="泊松比"
                          type="number"
                          value={layer.properties.poissonRatio}
                          onChange={(e) => updateLayerProperty(index, 'poissonRatio', parseFloat(e.target.value))}
                          size="small"
                          fullWidth
                          disabled={readOnly}
                        />
                      </Grid>
                    </Grid>
                  )}
                </Box>
              )}
            </LayerItem>
          ))}
          
          {layers.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              暂无土层，请添加土层
            </Typography>
          )}
        </Box>
      </ControlPanel>
    </TerrainContainer>
  );
};

export default TerrainDomain;
