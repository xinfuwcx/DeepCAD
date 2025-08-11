/**
 * 基坑开挖模块
 * 支持轮廓导入和开挖参数配置
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Button, Typography, Form, InputNumber, Alert, Progress, message } from 'antd';
import { FileTextOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
// Unified layout components
import UnifiedModuleLayout from '../ui/layout/UnifiedModuleLayout';
import Panel from '../ui/layout/Panel';
import MetricCard from '../ui/layout/MetricCard';


const { Title, Text } = Typography;

// 开挖参数接口
interface ExcavationParameters {
  // 轮廓导入
  contourImport: {
    fileName: string | null;
    fileData: any | null;
    rotationAngle: number; // 旋转角度 (度)
  };
  
  // 开挖参数
  excavationParams: {
    depth: number;           // 开挖深度 (m)
    layerDepth: number;      // 分层深度 (m)
    layerCount: number;      // 开挖层数
    stressReleaseCoefficient: number; // 应力释放系数
  };
  

}

interface ExcavationModuleProps {
  onParametersChange?: (params: ExcavationParameters) => void;
  onGenerate?: (params: ExcavationParameters) => void;
  status?: 'idle' | 'processing' | 'completed' | 'error';
  disabled?: boolean;
}

const ExcavationModule: React.FC<ExcavationModuleProps> = ({
  onParametersChange,
  onGenerate,
  status = 'idle',
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dxfData, setDxfData] = useState<any>(null);
  const [isParsingDXF, setIsParsingDXF] = useState(false);
  
  const [excavationParams, setExcavationParams] = useState<ExcavationParameters>({
    contourImport: {
      fileName: null,
      fileData: null,
      rotationAngle: 0
    },
    excavationParams: {
      depth: 10.0,
      layerDepth: 2.0,
      layerCount: 5,
      stressReleaseCoefficient: 0.7
    }
  });



  // 更新参数的通用函数
  const updateParams = useCallback((newParams: Partial<ExcavationParameters>) => {
    setExcavationParams(prev => {
      const updated = { ...prev, ...newParams };
      onParametersChange?.(updated);
      return updated;
    });
  }, [onParametersChange]);

  const handleContourChange = useCallback((field: string, value: any) => {
    const newContour = { ...excavationParams.contourImport, [field]: value };
    updateParams({ contourImport: newContour });
  }, [excavationParams.contourImport, updateParams]);

  const handleExcavationChange = useCallback((field: string, value: any) => {
    const newExcav = { ...excavationParams.excavationParams, [field]: value };
    updateParams({ excavationParams: newExcav });
  }, [excavationParams.excavationParams, updateParams]);

  // DXF解析逻辑
  const normalizeEntities = useCallback((entities: any[]) => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    const originalPoints: { x: number, y: number }[] = [];

    // 获取原始边界
    entities.forEach((entity) => {
      if (entity.type === 'LWPOLYLINE') {
        entity.vertices.forEach((v: any) => {
          originalPoints.push({ x: v.x, y: v.y });
          minX = Math.min(minX, v.x);
          maxX = Math.max(maxX, v.x);
          minY = Math.min(minY, v.y);
          maxY = Math.max(maxY, v.y);
        });
      } else if (entity.type === 'LINE') {
        originalPoints.push({ x: entity.start.x, y: entity.start.y });
        originalPoints.push({ x: entity.end.x, y: entity.end.y });
        minX = Math.min(minX, entity.start.x, entity.end.x);
        maxX = Math.max(maxX, entity.start.x, entity.end.x);
        minY = Math.min(minY, entity.start.y, entity.end.y);
        maxY = Math.max(maxY, entity.start.y, entity.end.y);
      } else if (entity.type === 'CIRCLE') {
        const left = entity.center.x - entity.radius;
        const right = entity.center.x + entity.radius;
        const top = entity.center.y + entity.radius;
        const bottom = entity.center.y - entity.radius;
        minX = Math.min(minX, left);
        maxX = Math.max(maxX, right);
        minY = Math.min(minY, bottom);
        maxY = Math.max(maxY, top);
      }
    });

    if (minX === Infinity || maxX === -Infinity || minY === Infinity || maxY === -Infinity) {
      console.warn('未找到有效的几何实体');
      return { entities, scaleFactor: 1, originalPoints, area: 0, perimeter: 0 };
    }

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    
    // 计算面积（矩形近似）
    const area = rangeX * rangeY;
    
    // 计算周长（矩形近似）
    const perimeter = 2 * (rangeX + rangeY);

    return {
      entities,
      scaleFactor: 1,
      originalPoints,
      area,
      perimeter,
      width: rangeX,
      length: rangeY,
      bounds: { minX, maxX, minY, maxY }
    };
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    handleContourChange('fileName', file.name);
    handleContourChange('fileData', file);
    
    setIsParsingDXF(true);
    
    try {
      const text = await file.text();
      console.log('开始解析DXF文件:', file.name);
      
      // 简单的DXF解析（提取基本几何信息）
      const lines = text.split('\n');
      const entities: any[] = [];
      // 仅扫描 ENTITIES 段，避免 BLOCKS 中的符号干扰
      let entitiesStart = -1;
      let entitiesEnd = lines.length;
      for (let i = 0; i < lines.length - 2; i++) {
        if (lines[i].trim() === 'SECTION' && lines[i + 1]?.trim() === '2' && lines[i + 2]?.trim() === 'ENTITIES') {
          entitiesStart = i + 3;
        }
        if (entitiesStart !== -1 && lines[i].trim() === 'ENDSEC') {
          entitiesEnd = i;
          break;
        }
      }
      const scanStart = entitiesStart !== -1 ? entitiesStart : 0;
      const scanEnd = entitiesEnd;
      
      // 解析LWPOLYLINE
      for (let i = scanStart; i < scanEnd; i++) {
        const line = lines[i].trim();
        
        if (line === 'LWPOLYLINE') {
          const entity = { type: 'LWPOLYLINE', vertices: [] as any[] };
          let j = i + 1;
          let vertexCount = 0;
          
          // 首先找到顶点数量（90代码）
          while (j < scanEnd) {
            if (lines[j].trim() === '90') {
              vertexCount = parseInt(lines[j + 1]?.trim() || '0');
              break;
            }
            j++;
          }
          
          console.log(`找到LWPOLYLINE，顶点数量: ${vertexCount}`);
          
          // 重新从开始位置解析坐标
          j = i + 1;
          let coordPairs = 0;
          
          while (j < scanEnd && coordPairs < vertexCount) {
            const code = lines[j].trim();
            const value = lines[j + 1]?.trim();
            
            if (code === '10') { // X坐标
              const x = parseFloat(value);
              // 寻找对应的Y坐标（下一个20代码）
              let k = j + 2;
              while (k < scanEnd && lines[k].trim() !== '20') {
                k += 2;
              }
              if (k < lines.length && lines[k].trim() === '20') {
                const y = parseFloat(lines[k + 1]?.trim() || '0');
                entity.vertices.push({ x, y });
                coordPairs++;
                console.log(`解析坐标 ${coordPairs}: (${x}, ${y})`);
              }
            }
            j += 2;
          }
          
          // 必须 >=3 个顶点才认作轮廓，避免类似 _ArchTick 的两点标记
          if (entity.vertices.length >= 3) {
            entities.push(entity);
            console.log(`LWPOLYLINE解析完成，实际获得 ${entity.vertices.length} 个顶点`);
          }
        }
      }
      
      if (entities.length === 0) {
        // 如果没有找到LWPOLYLINE，尝试解析LINE
        for (let i = scanStart; i < scanEnd; i++) {
          const line = lines[i].trim();
          
          if (line === 'LINE') {
            const entity = { type: 'LINE', start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
            let j = i + 1;
            
            while (j < scanEnd && lines[j].trim() !== 'LINE') {
              const code = lines[j].trim();
              const value = parseFloat(lines[j + 1]?.trim() || '0');
              
              if (code === '10') entity.start.x = value;
              else if (code === '20') entity.start.y = value;
              else if (code === '11') entity.end.x = value;
              else if (code === '21') entity.end.y = value;
              
              j += 2;
            }
            
            entities.push(entity);
          }
        }
      }

      if (entities.length === 0) {
        throw new Error('未在DXF文件中找到有效的几何实体');
      }

      const result = normalizeEntities(entities);
      console.log('normalizeEntities结果:', result);
      setDxfData(result);
      
      message.success(`DXF文件解析成功！检测到 ${entities.length} 个实体，${result.originalPoints.length} 个点`);
      
      console.log('DXF解析结果:', {
        实体数量: entities.length,
        点数量: result.originalPoints.length,
        面积: result.area.toFixed(2) + ' 平方单位',
        周长: result.perimeter.toFixed(2) + ' 单位',
        宽度: result.width.toFixed(2) + ' 单位',
        长度: result.length.toFixed(2) + ' 单位'
      });
      
    } catch (error) {
      console.error('DXF文件处理错误:', error);
      message.error(`DXF文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsParsingDXF(false);
    }
  }, [handleContourChange, normalizeEntities]);

  // 衍生指标
  const derived = useMemo(() => {
    const { depth, layerDepth, layerCount, stressReleaseCoefficient } = excavationParams.excavationParams;
    const theoreticalDepth = layerDepth * layerCount;
    const coverageRatio = depth > 0 ? Math.min(theoreticalDepth / depth, 1) : 0;
    const depthGap = depth - theoreticalDepth;
    let coverageStatus: 'optimal' | 'insufficient' | 'excess' = 'optimal';
    if (Math.abs(depthGap) > 0.01) {
      coverageStatus = depthGap > 0 ? 'insufficient' : 'excess';
    }
    return { theoreticalDepth, coverageRatio, depthGap, coverageStatus, stressReleaseCoefficient };
  }, [excavationParams.excavationParams]);

  const statusAlert = useMemo(() => {
    if (status === 'processing') return <Alert message="正在进行基坑开挖..." description="请稍候，开挖过程可能需要几分钟时间。" type="info" showIcon />;
    if (status === 'completed') return <Alert message="基坑开挖完成" description="开挖已成功完成，您可以查看结果。" type="success" showIcon />;
    if (status === 'error') return <Alert message="基坑开挖失败" description="开挖过程中发生错误，请检查参数设置后重试。" type="error" showIcon />;
    return null;
  }, [status]);


  return (
    <UnifiedModuleLayout
      left={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="基坑轮廓导入" subtitle="支持复杂异形基坑" dense>
            <Form layout="vertical" size="large">
              <input
                ref={fileInputRef}
                type="file"
                accept=".dxf,.dwg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                  if (e.target) e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                block
                style={{ height: 56, fontSize: 16 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || status === 'processing' || isParsingDXF}
                loading={isParsingDXF}
              >
                {isParsingDXF ? '正在解析...' : '选择 DXF / DWG 文件'}
              </Button>
              <Text style={{ color: '#ffffff60', fontSize: 12, marginTop: 8, display: 'block' }}>
                {disabled ? '请先完成地质建模' : '推荐 AutoCAD 2018+ 版本输出'}
              </Text>
              {excavationParams.contourImport.fileName && (
                <div style={{ marginTop: 12, padding: 12, border: '1px solid #52c41a40', borderRadius: 8, background: 'linear-gradient(135deg, rgba(82,196,26,0.15), rgba(82,196,26,0.05))' }}>
                  <Text style={{ color: '#52c41a', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                    ✅ 已选文件: {excavationParams.contourImport.fileName}
                  </Text>
                  {dxfData && (
                    <div style={{ fontSize: 12, color: '#ffffff80' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>轮廓宽度:</span>
                        <span style={{ color: '#52c41a' }}>{dxfData.width.toFixed(2)} 单位</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>轮廓长度:</span>
                        <span style={{ color: '#52c41a' }}>{dxfData.length.toFixed(2)} 单位</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>轮廓面积:</span>
                        <span style={{ color: '#52c41a' }}>{dxfData.area.toFixed(2)} 平方单位</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>轮廓周长:</span>
                        <span style={{ color: '#52c41a' }}>{dxfData.perimeter.toFixed(2)} 单位</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>点数量:</span>
                        <span style={{ color: '#52c41a' }}>{dxfData.originalPoints.length} 个</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <Form.Item label="旋转角度 (度)" tooltip="导入轮廓的旋转角度, 0-360 度" style={{ marginTop: 16 }}>
                <InputNumber
                  value={excavationParams.contourImport.rotationAngle}
                  onChange={(value) => handleContourChange('rotationAngle', value || 0)}
                  min={0}
                  max={360}
                  step={1}
                  precision={0}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Form>
          </Panel>
          <Panel title="开挖参数" subtitle="分层与应力释放配置" dense>
            <Form layout="vertical" size="large">
              <Form.Item label="开挖深度 (m)" tooltip="基坑总开挖深度">
                <InputNumber
                  value={excavationParams.excavationParams.depth}
                  onChange={(value) => handleExcavationChange('depth', value || 10.0)}
                  min={1}
                  max={200}
                  step={0.5}
                  precision={1}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label="分层深度 (m)" tooltip="单次开挖层厚">
                <InputNumber
                  value={excavationParams.excavationParams.layerDepth}
                  onChange={(value) => handleExcavationChange('layerDepth', value || 2.0)}
                  min={0.5}
                  max={20}
                  step={0.5}
                  precision={1}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label="开挖层数" tooltip="计划分几层完成">
                <InputNumber
                  value={excavationParams.excavationParams.layerCount}
                  onChange={(value) => handleExcavationChange('layerCount', value || 5)}
                  min={1}
                  max={100}
                  step={1}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label="应力释放系数" tooltip="0 无释放, 1 完全释放">
                <InputNumber
                  value={excavationParams.excavationParams.stressReleaseCoefficient}
                  onChange={(value) => handleExcavationChange('stressReleaseCoefficient', value ?? 0)}
                  min={0}
                  max={1}
                  step={0.1}
                  precision={1}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <div style={{ display: 'flex', gap: 12 }}>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  block
                  disabled={disabled || status === 'processing'}
                  onClick={() => onGenerate?.(excavationParams)}
                >
                  开始开挖
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  disabled={status === 'processing'}
                  onClick={() => {
                    setExcavationParams(prev => ({
                      contourImport: { ...prev.contourImport, rotationAngle: 0 },
                      excavationParams: { depth: 10, layerDepth: 2, layerCount: 5, stressReleaseCoefficient: 0.7 }
                    }));
                  }}
                >重置</Button>
              </div>
            </Form>
          </Panel>
        </div>
      }
      right={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="参数指标" dense>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
              <MetricCard label="总深度" value={excavationParams.excavationParams.depth.toFixed(1) + ' m'} accent="blue" />
              <MetricCard label="层厚" value={excavationParams.excavationParams.layerDepth.toFixed(1) + ' m'} accent="purple" />
              <MetricCard label="层数" value={excavationParams.excavationParams.layerCount} accent="orange" />
              <MetricCard label="应力释放" value={excavationParams.excavationParams.stressReleaseCoefficient.toFixed(1)} accent="green" />
              {dxfData && (
                <>
                  <MetricCard label="DXF宽度" value={dxfData.width.toFixed(1) + ' 单位'} accent="cyan" />
                  <MetricCard label="DXF长度" value={dxfData.length.toFixed(1) + ' 单位'} accent="cyan" />
                  <MetricCard label="DXF面积" value={dxfData.area.toFixed(1) + ' ㎡'} accent="green" />
                  <MetricCard label="DXF周长" value={dxfData.perimeter.toFixed(1) + ' m'} accent="purple" />
                </>
              )}
              <MetricCard label="理论累计" value={derived.theoreticalDepth.toFixed(1) + ' m'} accent="blue" />
              <MetricCard label="覆盖率" value={(derived.coverageRatio * 100).toFixed(0) + '%'} accent={derived.coverageStatus === 'optimal' ? 'green' : derived.coverageStatus === 'insufficient' ? 'orange' : 'red'} />
            </div>
            <div style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 12, color: '#ffffff80' }}>
                理论累计 = 分层深度 * 层数。覆盖率 = 理论累计 / 总深度。
                {derived.coverageStatus === 'insufficient' && ' 当前层数不足, 可增加层数或层厚。'}
                {derived.coverageStatus === 'excess' && ' 当前层数/层厚总和超过目标深度, 可适当减少。'}
              </Text>
            </div>
          </Panel>
          <Panel title="执行状态" dense>
            {statusAlert || (
              <Alert message="就绪" description="配置参数后点击开始开挖。" type="info" showIcon />
            )}
            {status === 'processing' && (
              <div style={{ marginTop: 16 }}>
                <Progress percent={55} status="active" strokeColor="#1890ff" showInfo={false} />
                <Text style={{ fontSize: 12, color: '#ffffff60' }}>模拟进度示例 (占位)</Text>
              </div>
            )}
          </Panel>
        </div>
      }
    />
  );
};

export default ExcavationModule;