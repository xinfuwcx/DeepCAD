/**
 * DeepCAD 组件开发示例 (修复版)
 * 1号架构师提供 - 给2号和3号的开发参考
 * 移除装饰器语法，改用普通函数导出
 */

import React, { useState, useCallback } from 'react';
import { Card, Button, Input, Select, message, Space, Typography, Alert } from 'antd';
import { SettingOutlined, PlayCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { ComponentDevHelper } from '../utils/developmentTools';

// 3号计算专家组件导入
// import { MeshGenerationConfigPanel } from '../components/meshing';
// import { ComputationAnalysisConfigPanel, TerraSolverControlPanel } from '../components/computation';

const { Text } = Typography;
const { Option } = Select;

// ==========================================
// 示例1: 2号几何专家 - RBF插值组件示例
// ==========================================

interface RBFInterpolationProps {
  onResult?: (result: any) => void;
  onError?: (error: string) => void;
}

export const RBFInterpolationPanel: React.FC<RBFInterpolationProps> = ({
  onResult,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [interpolationMethod, setInterpolationMethod] = useState('multiquadric');
  const [smoothingFactor, setSmoothingFactor] = useState(0.1);

  const handleInterpolation = useCallback(async () => {
    try {
      setLoading(true);
      ComponentDevHelper.logAPICall('/api/geometry/geology/interpolate', 'POST', '2号几何专家');
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResult = {
        interpolatedPoints: 1250,
        averageError: 0.025,
        maxError: 0.12,
        r2Score: 0.96,
        executionTime: '1.85s'
      };
      
      onResult?.(mockResult);
      message.success('RBF插值计算完成');
      ComponentDevHelper.logDevTip(`插值完成: R²=${mockResult.r2Score}, 误差=${mockResult.averageError}`);
      
    } catch (error) {
      const errorMsg = 'RBF插值计算失败';
      onError?.(errorMsg);
      message.error(errorMsg);
      ComponentDevHelper.logError(error as Error, 'RBF插值', '2号几何专家');
    } finally {
      setLoading(false);
    }
  }, [interpolationMethod, smoothingFactor, onResult, onError]);

  return (
    <Card
      title={
        <span style={{ color: '#52c41a' }}>
          <SettingOutlined style={{ marginRight: 8 }} />
          RBF地质插值面板
        </span>
      }
      size="small"
      style={{ 
        background: '#001529',
        border: '1px solid #52c41a30'
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Alert
          message="2号几何专家开发示例"
          description="展示RBF径向基函数插值的参数配置和计算流程"
          type="info"
          showIcon
          size="small"
        />
        
        <div>
          <Text style={{ color: '#fff', marginBottom: 8, display: 'block' }}>插值核函数</Text>
          <Select
            value={interpolationMethod}
            onChange={setInterpolationMethod}
            style={{ width: '100%' }}
            size="small"
          >
            <Option value="multiquadric">Multiquadric (推荐)</Option>
            <Option value="inverse">Inverse Multiquadric</Option>
            <Option value="gaussian">Gaussian</Option>
            <Option value="thin_plate_spline">Thin Plate Spline</Option>
          </Select>
        </div>

        <div>
          <Text style={{ color: '#fff', marginBottom: 8, display: 'block' }}>平滑因子</Text>
          <Input
            type="number"
            value={smoothingFactor}
            onChange={(e) => setSmoothingFactor(parseFloat(e.target.value) || 0)}
            min={0}
            max={1}
            step={0.01}
            size="small"
            style={{ width: '100%' }}
          />
        </div>

        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          loading={loading}
          onClick={handleInterpolation}
          block
          style={{ marginTop: 16 }}
        >
          {loading ? '插值计算中...' : '开始RBF插值'}
        </Button>
      </Space>
    </Card>
  );
};

// ==========================================
// 示例2: 3号计算专家 - Terra求解器控制面板
// ==========================================

interface TerraSolverProps {
  onSolverStart?: (jobId: string) => void;
  onSolverComplete?: (result: any) => void;
}

export const TerraSolverControlPanel: React.FC<TerraSolverProps> = ({
  onSolverStart,
  onSolverComplete
}) => {
  const [solving, setSolving] = useState(false);
  const [memoryLimit, setMemoryLimit] = useState(8192);
  const [elementCount, setElementCount] = useState(2000000);

  const handleStartSolver = useCallback(async () => {
    try {
      setSolving(true);
      const jobId = `terra_${Date.now()}`;
      
      ComponentDevHelper.logAPICall('/api/computation/terra/solve', 'POST', '3号计算专家');
      onSolverStart?.(jobId);
      
      // 模拟Terra求解过程
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const mockResult = {
        jobId,
        converged: true,
        iterations: 145,
        maxDisplacement: 25.6,
        maxStress: 1.8,
        solvingTime: '667s',
        memoryUsed: '7.2GB'
      };
      
      onSolverComplete?.(mockResult);
      message.success('Terra求解完成');
      ComponentDevHelper.logDevTip(`Terra求解成功: 收敛${mockResult.iterations}次迭代`);
      
    } catch (error) {
      message.error('Terra求解失败');
      ComponentDevHelper.logError(error as Error, 'Terra求解', '3号计算专家');
    } finally {
      setSolving(false);
    }
  }, [memoryLimit, elementCount, onSolverStart, onSolverComplete]);

  return (
    <Card
      title={
        <span style={{ color: '#faad14' }}>
          <ThunderboltOutlined style={{ marginRight: 8 }} />
          Terra求解器控制
        </span>
      }
      size="small"
      style={{ 
        background: '#001529',
        border: '1px solid #faad1430'
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Alert
          message="3号计算专家开发示例"
          description="展示Terra求解器的配置参数和计算控制"
          type="warning"
          showIcon
          size="small"
        />
        
        <div>
          <Text style={{ color: '#fff', marginBottom: 8, display: 'block' }}>内存限制 (MB)</Text>
          <Input
            type="number"
            value={memoryLimit}
            onChange={(e) => setMemoryLimit(parseInt(e.target.value) || 8192)}
            min={1024}
            max={32768}
            size="small"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <Text style={{ color: '#fff', marginBottom: 8, display: 'block' }}>单元数量</Text>
          <Input
            type="number"
            value={elementCount}
            onChange={(e) => setElementCount(parseInt(e.target.value) || 2000000)}
            min={1000}
            max={10000000}
            size="small"
            style={{ width: '100%' }}
          />
        </div>

        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          loading={solving}
          onClick={handleStartSolver}
          block
          danger={solving}
          style={{ marginTop: 16 }}
        >
          {solving ? 'Terra求解中...' : '启动Terra求解器'}
        </Button>
      </Space>
    </Card>
  );
};

// ==========================================
// 主展示组件
// ==========================================

export const ComponentExampleShowcase: React.FC = () => {
  const [rbfResult, setRbfResult] = useState<any>(null);
  const [terraResult, setTerraResult] = useState<any>(null);

  return (
    <div style={{ 
      padding: '24px',
      background: '#0a0a0a',
      minHeight: '100vh'
    }}>
      <Typography.Title level={2} style={{ color: '#00d9ff', marginBottom: '24px' }}>
        DeepCAD 组件开发示例
      </Typography.Title>
      
      <Typography.Paragraph style={{ color: '#ffffff80', marginBottom: '32px' }}>
        1号架构师为2号和3号专家提供的组件开发参考示例。展示了如何构建专业的CAE组件。
      </Typography.Paragraph>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <RBFInterpolationPanel 
          onResult={setRbfResult}
          onError={(error) => console.error('RBF Error:', error)}
        />
        
        <TerraSolverControlPanel 
          onSolverStart={(jobId) => ComponentDevHelper.logDevTip(`Terra任务启动: ${jobId}`)}
          onSolverComplete={setTerraResult}
        />
      </div>

      {/* 结果显示区域 */}
      {(rbfResult || terraResult) && (
        <Card
          title="计算结果展示"
          style={{ 
            background: '#001529',
            border: '1px solid #00d9ff30'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {rbfResult && (
              <div>
                <Typography.Title level={4} style={{ color: '#52c41a' }}>
                  RBF插值结果
                </Typography.Title>
                <Space direction="vertical">
                  <Text style={{ color: '#fff' }}>插值点数: {rbfResult.interpolatedPoints}</Text>
                  <Text style={{ color: '#fff' }}>平均误差: {rbfResult.averageError}</Text>
                  <Text style={{ color: '#fff' }}>R²评分: {rbfResult.r2Score}</Text>
                  <Text style={{ color: '#fff' }}>执行时间: {rbfResult.executionTime}</Text>
                </Space>
              </div>
            )}

            {terraResult && (
              <div>
                <Typography.Title level={4} style={{ color: '#faad14' }}>
                  Terra求解结果
                </Typography.Title>
                <Space direction="vertical">
                  <Text style={{ color: '#fff' }}>收敛状态: {terraResult.converged ? '已收敛' : '未收敛'}</Text>
                  <Text style={{ color: '#fff' }}>迭代次数: {terraResult.iterations}</Text>
                  <Text style={{ color: '#fff' }}>最大位移: {terraResult.maxDisplacement}mm</Text>
                  <Text style={{ color: '#fff' }}>求解时间: {terraResult.solvingTime}</Text>
                  <Text style={{ color: '#fff' }}>内存使用: {terraResult.memoryUsed}</Text>
                </Space>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ComponentExampleShowcase;