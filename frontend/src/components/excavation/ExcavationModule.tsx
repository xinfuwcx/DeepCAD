/**
 * 基坑开挖模块
 * 支持轮廓导入和开挖参数配置
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Button, Typography, Form, InputNumber, Alert, Progress } from 'antd';
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

  const handleFileSelect = useCallback((file: File) => {
    handleContourChange('fileName', file.name);
    handleContourChange('fileData', file);
  }, [handleContourChange]);

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
                disabled={disabled || status === 'processing'}
              >
                选择 DXF / DWG 文件
              </Button>
              <Text style={{ color: '#ffffff60', fontSize: 12, marginTop: 8, display: 'block' }}>
                推荐 AutoCAD 2018+ 版本输出
              </Text>
              {excavationParams.contourImport.fileName && (
                <div style={{ marginTop: 12, padding: 10, border: '1px solid #52c41a40', borderRadius: 8, background: 'linear-gradient(135deg, rgba(82,196,26,0.15), rgba(82,196,26,0.05))' }}>
                  <Text style={{ color: '#52c41a', fontWeight: 600 }}>
                    已选文件: {excavationParams.contourImport.fileName}
                  </Text>
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
    >
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#ffffff90' }}>
        <Title level={3} style={{ color: 'white', margin: 0, letterSpacing: 1 }}>基坑开挖预览区</Title>
        <Text style={{ maxWidth: 480, textAlign: 'center', lineHeight: 1.6 }}>
          未来此区域将展示开挖 3D 过程、分层施工动画及应力释放可视化。当前版本专注参数配置与指标反馈。
        </Text>
        <div style={{ fontSize: 12, opacity: 0.6 }}>即将支持: 分层序列、结构支护同步、施工阶段回放</div>
      </div>
    </UnifiedModuleLayout>
  );
};

export default ExcavationModule;