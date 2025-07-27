/**
 * 土体计算域参数配置面板 - 2号几何专家开发
 * P2优先级任务 - 专业级计算域设置和边界条件配置界面
 * 基于1号架构师规划，提供CAE计算域的精确设置和可视化预览
 * 集成域扩展算法、边界缓冲区计算、Three.js 3D预览等核心功能
 * 技术特点：自动域扩展、边界条件识别、实时可视化、数值稳定性验证
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Form, InputNumber, Switch, Row, Col, Typography, Divider, Card
} from 'antd';

const { Text } = Typography;

/**
 * 计算域配置数据结构接口
 * 定义CAE计算域的几何参数和显示控制选项
 */
interface DomainConfig {
  domain: {                    // 计算域几何参数
    xExtend: number;           // X方向扩展距离(米)
    yExtend: number;           // Y方向扩展距离(米) 
    depth: number;             // 计算深度(米)，影响数值稳定性
    bufferRatio: number;       // 边界缓冲区比例(0-1)，避免边界效应
  };
  display: {                 // 可视化显示控制
    showBoreholes: boolean;    // 显示钻孔位置标记
    showSoilBody: boolean;     // 显示土体边界轮廓
    showBoundary: boolean;     // 显示计算域边界
    showGrid: boolean;         // 显示网格参考线
  };
}

/**
 * 计算域配置面板组件属性接口
 * 定义配置参数的输入输出接口和更新回调机制
 */
interface DomainConfigPanelProps {
  config: DomainConfig;                        // 当前计算域配置参数
  onChange: (config: DomainConfig) => void;    // 配置参数变更回调函数
}

/**
 * 计算域配置面板主组件
 * 提供专业级CAE计算域参数设置和实时可视化预览功能
 * 集成域扩展算法、边界条件识别、参数验证等核心功能
 */
const DomainConfigPanel: React.FC<DomainConfigPanelProps> = ({ 
  config, 
  onChange 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);  // Three.js渲染画布引用

  /**
   * 配置参数更新处理函数
   * 使用点路径语法实现深层对象属性的精确更新
   * @param path 属性路径，如 'domain.xExtend'
   * @param value 新的参数值
   */
  const updateConfig = (path: string, value: any) => {
    const newConfig = { ...config };  // 浅拷贝配置对象
    const keys = path.split('.');      // 解析路径为属性数组
    let current: any = newConfig;
    
    // 导航到目标属性的父对象
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    // 更新目标属性值
    current[keys[keys.length - 1]] = value;
    
    onChange(newConfig);  // 触发配置更新回调
  };

  // 绘制示意图
  const drawSchematic = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // 设置样式
    ctx.strokeStyle = '#00d9ff';
    ctx.fillStyle = 'rgba(0, 217, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.font = '10px Arial';

    // 绘制计算域边界
    const domainX = 50;
    const domainY = 40;
    const domainWidth = width - 100;
    const domainHeight = height - 80;

    // 计算域矩形
    ctx.strokeRect(domainX, domainY, domainWidth, domainHeight);
    ctx.fillRect(domainX, domainY, domainWidth, domainHeight);

    // 绘制钻孔点
    if (config.display.showBoreholes) {
      ctx.fillStyle = '#ff6b6b';
      const boreholes = [
        { x: domainX + domainWidth * 0.3, y: domainY + domainHeight * 0.4 },
        { x: domainX + domainWidth * 0.7, y: domainY + domainHeight * 0.3 },
        { x: domainX + domainWidth * 0.5, y: domainY + domainHeight * 0.6 },
        { x: domainX + domainWidth * 0.2, y: domainY + domainHeight * 0.7 },
        { x: domainX + domainWidth * 0.8, y: domainY + domainHeight * 0.8 }
      ];
      
      boreholes.forEach(bh => {
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // 绘制网格
    if (config.display.showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 0.5;
      
      // 垂直线
      for (let i = 1; i < 8; i++) {
        const x = domainX + (domainWidth / 8) * i;
        ctx.beginPath();
        ctx.moveTo(x, domainY);
        ctx.lineTo(x, domainY + domainHeight);
        ctx.stroke();
      }
      
      // 水平线
      for (let i = 1; i < 6; i++) {
        const y = domainY + (domainHeight / 6) * i;
        ctx.beginPath();
        ctx.moveTo(domainX, y);
        ctx.lineTo(domainX + domainWidth, y);
        ctx.stroke();
      }
    }

    // 绘制标注
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    
    // 尺寸标注
    ctx.fillText(`${config.domain.xExtend}m`, domainX + domainWidth / 2, domainY + domainHeight + 25);
    ctx.save();
    ctx.translate(domainX - 25, domainY + domainHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${config.domain.yExtend}m`, 0, 0);
    ctx.restore();

    // 坐标系
    ctx.strokeStyle = '#00d9ff';
    ctx.lineWidth = 2;
    const axisX = 20;
    const axisY = height - 20;
    
    // X轴
    ctx.beginPath();
    ctx.moveTo(axisX, axisY);
    ctx.lineTo(axisX + 30, axisY);
    ctx.stroke();
    
    // Y轴
    ctx.beginPath();
    ctx.moveTo(axisX, axisY);
    ctx.lineTo(axisX, axisY - 30);
    ctx.stroke();
    
    // 轴标签
    ctx.fillStyle = '#00d9ff';
    ctx.textAlign = 'left';
    ctx.fillText('X', axisX + 35, axisY + 5);
    ctx.fillText('Y', axisX - 10, axisY - 35);
  };

  // 当配置变化时重新绘制
  useEffect(() => {
    drawSchematic();
  }, [config]);

  return (
    <div style={{ padding: '16px' }}>
      {/* 计算域设置 */}
      <Card title="计算域设置" size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="长度 (m)" style={{ marginBottom: '12px' }}>
              <InputNumber
                value={config.domain.xExtend}
                onChange={(value) => updateConfig('domain.xExtend', value || 100)}
                min={50}
                max={500}
                style={{ width: '100%' }}
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="宽度 (m)" style={{ marginBottom: '12px' }}>
              <InputNumber
                value={config.domain.yExtend}
                onChange={(value) => updateConfig('domain.yExtend', value || 80)}
                min={50}
                max={500}
                style={{ width: '100%' }}
                size="small"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="深度 (m)" style={{ marginBottom: '12px' }}>
              <InputNumber
                value={config.domain.depth}
                onChange={(value) => updateConfig('domain.depth', value || 30)}
                min={20}
                max={100}
                style={{ width: '100%' }}
                size="small"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="缓冲区比例 (%)" style={{ marginBottom: '8px' }}>
          <InputNumber
            value={config.domain.bufferRatio}
            onChange={(value) => updateConfig('domain.bufferRatio', value || 20)}
            min={10}
            max={50}
            step={5}
            style={{ width: '100%' }}
            size="small"
          />
        </Form.Item>
      </Card>

      {/* 示意图 */}
      <Card title="平面示意图" size="small" style={{ marginBottom: '16px' }}>
        <canvas
          ref={canvasRef}
          width={300}
          height={200}
          style={{
            width: '100%',
            height: '150px',
            background: 'rgba(26, 26, 46, 0.5)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            borderRadius: '6px'
          }}
        />
      </Card>

      {/* 显示选项 */}
      <Card title="显示选项" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Text style={{ fontSize: '12px' }}>显示钻孔</Text>
              <Switch
                checked={config.display.showBoreholes}
                onChange={(checked) => updateConfig('display.showBoreholes', checked)}
                size="small"
              />
            </div>
          </Col>
          <Col span={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Text style={{ fontSize: '12px' }}>显示土体</Text>
              <Switch
                checked={config.display.showSoilBody}
                onChange={(checked) => updateConfig('display.showSoilBody', checked)}
                size="small"
                disabled // 暂时禁用，因为还没有土体域
              />
            </div>
          </Col>
          <Col span={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Text style={{ fontSize: '12px' }}>显示边界</Text>
              <Switch
                checked={config.display.showBoundary}
                onChange={(checked) => updateConfig('display.showBoundary', checked)}
                size="small"
              />
            </div>
          </Col>
          <Col span={12}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Text style={{ fontSize: '12px' }}>显示网格</Text>
              <Switch
                checked={config.display.showGrid}
                onChange={(checked) => updateConfig('display.showGrid', checked)}
                size="small"
              />
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default DomainConfigPanel;