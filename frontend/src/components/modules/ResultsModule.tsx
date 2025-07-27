import React, { useState } from 'react';
import { Card, Button, Space, Typography, Tabs, List, Select, Slider, Switch, Tag, Progress } from 'antd';
import {
  BarChartOutlined,
  EyeOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  PrinterOutlined,
  FullscreenOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StepForwardOutlined,
  StepBackwardOutlined,
  SettingOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
  LineChartOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

export const ResultsModule: React.FC = () => {
  const [resultSettings, setResultSettings] = useState({
    resultType: 'stress',
    timeStep: 50,
    animationSpeed: 1.0,
    showDeformation: true,
    colorScale: 'rainbow',
    contourLevels: 20
  });

  const [animationStatus, setAnimationStatus] = useState({
    isPlaying: false,
    currentFrame: 50,
    totalFrames: 100,
    frameDuration: '0.1s'
  });

  const resultTypes = [
    { name: '等效应力', icon: '🔴', description: '冯米塞斯应力', unit: 'MPa' },
    { name: '位移场', icon: '🟡', description: '节点位移', unit: 'mm' },
    { name: '主应力', icon: '🟠', description: '主应力分量', unit: 'MPa' },
    { name: '应变能', icon: '🟢', description: '弹性应变能', unit: 'J' },
    { name: '安全系数', icon: '🔵', description: '稳定安全系数', unit: '-' },
    { name: '温度场', icon: '🟣', description: '温度分布', unit: '°C' }
  ];

  const postProcessTools = [
    { name: '截面分析', icon: <LineChartOutlined />, description: '截面切割' },
    { name: '数值探测', icon: <EyeOutlined />, description: '点值查询' },
    { name: '极值分析', icon: <BarChartOutlined />, description: '最值搜索' },
    { name: '矢量图', icon: <ShareAltOutlined />, description: '矢量显示' }
  ];

  const exportOptions = [
    { name: 'PNG图片', icon: <FileImageOutlined />, format: 'png' },
    { name: 'MP4视频', icon: <VideoCameraOutlined />, format: 'mp4' },
    { name: 'PDF报告', icon: <PrinterOutlined />, format: 'pdf' },
    { name: 'CSV数据', icon: <DownloadOutlined />, format: 'csv' }
  ];

  const analysisResults = [
    { metric: '最大应力', value: '287.5', unit: 'MPa', status: 'warning', location: '节点 #12456' },
    { metric: '最大位移', value: '12.8', unit: 'mm', status: 'normal', location: '节点 #8932' },
    { metric: '最小安全系数', value: '2.34', unit: '-', status: 'good', location: '单元 #5621' },
    { metric: '应变能', value: '1,425.6', unit: 'J', status: 'normal', location: '全域积分' }
  ];

  const colorMaps = [
    { name: 'Rainbow', colors: ['#0000ff', '#00ffff', '#00ff00', '#ffff00', '#ff0000'] },
    { name: 'Viridis', colors: ['#440154', '#31688e', '#35b779', '#fde725'] },
    { name: 'Plasma', colors: ['#0d0887', '#9c179e', '#ed7953', '#f0f921'] },
    { name: 'Cool', colors: ['#00ffff', '#0080ff', '#0000ff'] }
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* 全屏3D视口背景 */}
      <div style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(40, 40, 40, 0.95) 100%)',
        zIndex: 1
      }}>
        {/* 结果可视化背景效果 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(52, 199, 89, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255, 107, 104, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)
          `,
          opacity: 0.6
        }} />

        {/* 3D视口中心提示 */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          zIndex: 2,
          userSelect: 'none'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.2 }}>📊</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', opacity: 0.6 }}>3D结果可视化视口</div>
          <div style={{ fontSize: '16px', opacity: 0.4 }}>
            ✅ 云图可视化
            <br />
            ✅ 动画播放
            <br />
            ✅ 交互式分析
            <br />
            ✅ 等值线显示
          </div>
        </div>
      </div>

      {/* 悬浮左侧工具面板 */}
      <div style={{ 
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: '380px',
        maxHeight: 'calc(100% - 40px)',
        zIndex: 10
      }}>
        <Card 
          className="glass-card" 
          title={
            <Space>
              <BarChartOutlined style={{ color: 'var(--primary-color)' }} />
              <span style={{ color: 'white', fontSize: '14px' }}>结果后处理工具</span>
            </Space>
          }
          style={{ 
            background: 'rgba(26, 26, 26, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(52, 199, 89, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(52, 199, 89, 0.1)'
          }}
          styles={{ 
            body: { 
              padding: '16px', 
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto',
              background: 'transparent'
            },
            header: {
              background: 'transparent',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '12px 16px'
            }
          }}
        >
          <Tabs defaultActiveKey="1" >
            <TabPane tab="结果类型" key="1">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                {resultTypes.map((type, index) => (
                  <Button
                    key={index}
                    className="glass-card"
                    style={{
                      height: '85px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-color)',
                      position: 'relative'
                    }}
                    onClick={() => console.log('Select result', type.name)}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{type.icon}</div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', textAlign: 'center', marginBottom: '2px' }}>
                      {type.name}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      {type.description}
                    </div>
                    <Tag 
                       
                      color="blue"
                      style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '8px' }}
                    >
                      {type.unit}
                    </Tag>
                  </Button>
                ))}
              </div>
            </TabPane>
            
            <TabPane tab="可视化设置" key="2">
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>颜色映射</Text>
                <Select 
                  value={resultSettings.colorScale} 
                  onChange={(value) => setResultSettings({...resultSettings, colorScale: value})}
                  style={{ width: '100%', marginTop: '4px' }}
                >
                  {colorMaps.map((map, index) => (
                    <Option key={index} value={map.name.toLowerCase()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '8px', 
                          background: `linear-gradient(to right, ${map.colors.join(', ')})`,
                          borderRadius: '2px'
                        }} />
                        {map.name}
                      </div>
                    </Option>
                  ))}
                </Select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>等值线级数</Text>
                <Slider
                  min={5}
                  max={50}
                  value={resultSettings.contourLevels}
                  onChange={(value) => setResultSettings({...resultSettings, contourLevels: value})}
                  marks={{
                    5: '5',
                    20: '20',
                    35: '35',
                    50: '50'
                  }}
                />
                <Text style={{ color: 'var(--primary-color)', fontSize: '12px' }}>
                  级数: {resultSettings.contourLevels}
                </Text>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>显示变形</Text>
                  <Switch
                    checked={resultSettings.showDeformation}
                    onChange={(checked) => setResultSettings({
                      ...resultSettings, 
                      showDeformation: checked
                    })}
                  />
                </div>
              </div>

              {resultSettings.showDeformation && (
                <div style={{ marginBottom: '16px' }}>
                  <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>变形缩放系数</Text>
                  <Slider
                    min={1}
                    max={100}
                    value={resultSettings.animationSpeed * 50}
                    onChange={(value) => setResultSettings({
                      ...resultSettings, 
                      animationSpeed: value / 50
                    })}
                    marks={{
                      1: '1x',
                      25: '25x',
                      50: '50x',
                      100: '100x'
                    }}
                  />
                  <Text style={{ color: 'var(--accent-color)', fontSize: '12px' }}>
                    缩放: {(resultSettings.animationSpeed * 50).toFixed(0)}x
                  </Text>
                </div>
              )}
            </TabPane>

            <TabPane tab="动画控制" key="3">
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>
                  时步动画播放
                </Text>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>当前时步</Text>
                <Slider
                  min={1}
                  max={animationStatus.totalFrames}
                  value={animationStatus.currentFrame}
                  onChange={(value) => setAnimationStatus({
                    ...animationStatus, 
                    currentFrame: value
                  })}
                  marks={{
                    1: '1',
                    25: '25',
                    50: '50',
                    75: '75',
                    100: '100'
                  }}
                />
                <Text style={{ color: 'var(--primary-color)', fontSize: '12px' }}>
                  步骤: {animationStatus.currentFrame}/{animationStatus.totalFrames}
                </Text>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <Button 
                  icon={<StepBackwardOutlined />}
                  
                  onClick={() => setAnimationStatus({
                    ...animationStatus,
                    currentFrame: Math.max(1, animationStatus.currentFrame - 1)
                  })}
                />
                <Button 
                  type="primary"
                  icon={animationStatus.isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  
                  onClick={() => setAnimationStatus({
                    ...animationStatus,
                    isPlaying: !animationStatus.isPlaying
                  })}
                  style={{ flex: 1 }}
                >
                  {animationStatus.isPlaying ? '暂停' : '播放'}
                </Button>
                <Button 
                  icon={<StepForwardOutlined />}
                  
                  onClick={() => setAnimationStatus({
                    ...animationStatus,
                    currentFrame: Math.min(animationStatus.totalFrames, animationStatus.currentFrame + 1)
                  })}
                />
              </div>

              <div style={{ 
                padding: '12px', 
                background: 'var(--bg-secondary)', 
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <Text style={{ color: 'var(--text-secondary)' }}>播放状态:</Text>
                    <Text style={{ color: animationStatus.isPlaying ? 'var(--success-color)' : 'var(--text-secondary)', fontWeight: 'bold', marginLeft: '4px' }}>
                      {animationStatus.isPlaying ? '播放中' : '已暂停'}
                    </Text>
                  </div>
                  <div>
                    <Text style={{ color: 'var(--text-secondary)' }}>帧间隔:</Text>
                    <Text style={{ color: 'var(--accent-color)', fontWeight: 'bold', marginLeft: '4px' }}>
                      {animationStatus.frameDuration}
                    </Text>
                  </div>
                </div>
              </div>
            </TabPane>

            <TabPane tab="分析工具" key="4">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {postProcessTools.map((tool, index) => (
                  <Button
                    key={index}
                    className="glass-card"
                    style={{
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      border: '1px solid var(--border-color)',
                      padding: '0 16px'
                    }}
                    onClick={() => console.log('Use tool', tool.name)}
                  >
                    <div style={{ fontSize: '16px', marginRight: '12px', color: 'var(--primary-color)' }}>
                      {tool.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{tool.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{tool.description}</div>
                    </div>
                  </Button>
                ))}
              </div>

              {/* 分析结果统计 */}
              <div style={{ marginTop: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                  关键结果
                </Text>
                {analysisResults.map((result, index) => (
                  <div key={index} style={{ 
                    marginBottom: '8px',
                    padding: '8px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <Text style={{ color: 'white', fontSize: '12px' }}>{result.metric}</Text>
                      <Text style={{ 
                        color: result.status === 'warning' ? 'var(--warning-color)' : 
                              result.status === 'good' ? 'var(--success-color)' : 'var(--primary-color)', 
                        fontSize: '12px', 
                        fontWeight: 'bold' 
                      }}>
                        {result.value} {result.unit}
                      </Text>
                    </div>
                    <Text style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                      位置: {result.location}
                    </Text>
                  </div>
                ))}
              </div>
            </TabPane>
          </Tabs>

          {/* 导出控制 */}
          <div style={{ marginTop: '16px' }}>
            <Text style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
              导出选项
            </Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {exportOptions.map((option, index) => (
                <Button 
                  key={index}
                  icon={option.icon}
                  
                  onClick={() => console.log('Export', option.format)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '32px'
                  }}
                >
                  {option.name}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* 悬浮右侧结果设置指示器 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(26, 26, 26, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(52, 199, 89, 0.2)',
        borderRadius: '16px',
        padding: '16px',
        minWidth: '160px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(52, 199, 89, 0.1)'
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'center' }}>
          结果设置
        </div>
        <div style={{ fontSize: '11px', color: 'var(--primary-color)', marginBottom: '6px' }}>
          类型: {resultSettings.resultType}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--accent-color)', marginBottom: '6px' }}>
          映射: {resultSettings.colorScale}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--success-color)', marginBottom: '6px' }}>
          等值线: {resultSettings.contourLevels} 级
        </div>
        {animationStatus.isPlaying && (
          <div style={{ fontSize: '11px', color: 'var(--warning-color)' }}>
            播放: {animationStatus.currentFrame}/{animationStatus.totalFrames}
          </div>
        )}
      </div>

      {/* 悬浮底部工具栏 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(26, 26, 26, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(52, 199, 89, 0.2)',
        borderRadius: '20px',
        padding: '12px 24px',
        display: 'flex',
        gap: '20px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(52, 199, 89, 0.1)'
      }}>
        <Button  type="text" style={{ color: 'var(--primary-color)', border: 'none' }}>
          📊 云图
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          🎬 动画
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          📈 分析
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          💾 导出
        </Button>
      </div>
    </div>
  );
};

export default ResultsModule;