import React, { useState, useMemo } from 'react';
import { Button, Space, Typography, Tabs, Select, Slider, Switch, Tag, Progress } from 'antd';
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
// Unified layout components
import UnifiedModuleLayout from '../ui/layout/UnifiedModuleLayout';
import Panel from '../ui/layout/Panel';
import MetricCard from '../ui/layout/MetricCard';

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

  const metrics = useMemo(() => (
    analysisResults.map(r => ({
      label: r.metric,
      value: r.value + ' ' + r.unit,
      accent: r.status === 'warning' ? 'orange' : r.status === 'good' ? 'green' : 'blue' as const
    }))
  ), [analysisResults]);

  return (
    <UnifiedModuleLayout
      left={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="结果后处理" subtitle="类型/显示/动画/工具" dense>
            <Tabs defaultActiveKey="1" size="small">
              <TabPane tab="结果类型" key="1">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  {resultTypes.map((type, i) => (
                    <Button
                      key={i}
                      style={{
                        height: 80,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid var(--border-color)', position: 'relative', background: 'rgba(255,255,255,0.02)'
                      }}
                      onClick={() => setResultSettings({ ...resultSettings, resultType: type.name })}
                    >
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{type.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 'bold' }}>{type.name}</div>
                      <div style={{ fontSize: 9, opacity: 0.6 }}>{type.description}</div>
                      <Tag color="blue" style={{ position: 'absolute', top: 4, right: 4, fontSize: 8 }}>{type.unit}</Tag>
                    </Button>
                  ))}
                </div>
              </TabPane>
              <TabPane tab="可视化设置" key="2">
                <div style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, opacity: 0.7 }}>颜色映射</Text>
                  <Select
                    value={resultSettings.colorScale}
                    onChange={(value) => setResultSettings({ ...resultSettings, colorScale: value })}
                    style={{ width: '100%', marginTop: 4 }}
                    size="small"
                  >
                    {colorMaps.map((map, idx) => (
                      <Option key={idx} value={map.name.toLowerCase()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 40, height: 8, background: `linear-gradient(to right, ${map.colors.join(', ')})`, borderRadius: 2 }} />
                          {map.name}
                        </div>
                      </Option>
                    ))}
                  </Select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, opacity: 0.7 }}>等值线级数</Text>
                  <Slider
                    min={5}
                    max={50}
                    value={resultSettings.contourLevels}
                    onChange={(value) => setResultSettings({ ...resultSettings, contourLevels: value })}
                    marks={{ 5: '5', 20: '20', 35: '35', 50: '50' }}
                  />
                  <Text style={{ fontSize: 12, color: 'var(--primary-color)' }}>级数: {resultSettings.contourLevels}</Text>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, opacity: 0.7 }}>显示变形</Text>
                    <Switch checked={resultSettings.showDeformation} onChange={(checked) => setResultSettings({ ...resultSettings, showDeformation: checked })} size="small" />
                  </div>
                </div>
                {resultSettings.showDeformation && (
                  <div style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, opacity: 0.7 }}>变形缩放系数</Text>
                    <Slider
                      min={1}
                      max={100}
                      value={resultSettings.animationSpeed * 50}
                      onChange={(value) => setResultSettings({ ...resultSettings, animationSpeed: value / 50 })}
                      marks={{ 1: '1x', 25: '25x', 50: '50x', 100: '100x' }}
                    />
                    <Text style={{ fontSize: 12, color: 'var(--accent-color)' }}>缩放: {(resultSettings.animationSpeed * 50).toFixed(0)}x</Text>
                  </div>
                )}
              </TabPane>
              <TabPane tab="动画控制" key="3">
                <div style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: 600 }}>时步动画播放</Text>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, opacity: 0.7 }}>当前时步</Text>
                  <Slider
                    min={1}
                    max={animationStatus.totalFrames}
                    value={animationStatus.currentFrame}
                    onChange={(value) => setAnimationStatus({ ...animationStatus, currentFrame: value })}
                    marks={{ 1: '1', 25: '25', 50: '50', 75: '75', 100: '100' }}
                  />
                  <Text style={{ fontSize: 12, color: 'var(--primary-color)' }}>步骤: {animationStatus.currentFrame}/{animationStatus.totalFrames}</Text>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <Button icon={<StepBackwardOutlined />} onClick={() => setAnimationStatus({ ...animationStatus, currentFrame: Math.max(1, animationStatus.currentFrame - 1) })} />
                  <Button
                    type="primary"
                    icon={animationStatus.isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={() => setAnimationStatus({ ...animationStatus, isPlaying: !animationStatus.isPlaying })}
                    style={{ flex: 1 }}
                  >
                    {animationStatus.isPlaying ? '暂停' : '播放'}
                  </Button>
                  <Button icon={<StepForwardOutlined />} onClick={() => setAnimationStatus({ ...animationStatus, currentFrame: Math.min(animationStatus.totalFrames, animationStatus.currentFrame + 1) })} />
                </div>
                <div style={{ padding: 10, border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><Text style={{ opacity: 0.7 }}>播放状态:</Text> <Text style={{ color: animationStatus.isPlaying ? 'var(--success-color)' : 'var(--text-secondary)', fontWeight: 600 }}>{animationStatus.isPlaying ? '播放中' : '已暂停'}</Text></div>
                  <div><Text style={{ opacity: 0.7 }}>帧间隔:</Text> <Text style={{ color: 'var(--accent-color)', fontWeight: 600 }}>{animationStatus.frameDuration}</Text></div>
                </div>
              </TabPane>
              <TabPane tab="分析工具" key="4">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {postProcessTools.map((tool, i) => (
                    <Button
                      key={i}
                      style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 14px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}
                      onClick={() => console.log('Use tool', tool.name)}
                    >
                      <div style={{ fontSize: 16, marginRight: 12, color: 'var(--primary-color)' }}>{tool.icon}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{tool.name}</div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>{tool.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </TabPane>
            </Tabs>
          </Panel>
          <Panel title="导出选项" dense>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {exportOptions.map((option, i) => (
                <Button key={i} icon={option.icon} onClick={() => console.log('Export', option.format)} style={{ height: 34 }}>{option.name}</Button>
              ))}
            </div>
          </Panel>
        </div>
      }
      right={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="关键结果" dense>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
              {metrics.map((m, i) => (
                <MetricCard key={i} label={m.label} value={m.value} accent={m.accent as 'blue' | 'green' | 'orange' | 'purple' | 'red'} />
              ))}
            </div>
          </Panel>
          <Panel title="当前设置" dense>
            <div style={{ display: 'grid', gap: 8, fontSize: 12 }}>
              <div><Text style={{ opacity: 0.6 }}>类型:</Text> <Text style={{ color: 'var(--primary-color)' }}>{resultSettings.resultType}</Text></div>
              <div><Text style={{ opacity: 0.6 }}>映射:</Text> <Text style={{ color: 'var(--accent-color)' }}>{resultSettings.colorScale}</Text></div>
              <div><Text style={{ opacity: 0.6 }}>等值线:</Text> <Text style={{ color: 'var(--success-color)' }}>{resultSettings.contourLevels}</Text></div>
              <div><Text style={{ opacity: 0.6 }}>变形显示:</Text> <Text>{resultSettings.showDeformation ? '是' : '否'}</Text></div>
              <div><Text style={{ opacity: 0.6 }}>动画帧:</Text> <Text>{animationStatus.currentFrame}/{animationStatus.totalFrames}</Text></div>
              <div><Progress percent={(animationStatus.currentFrame / animationStatus.totalFrames) * 100} size="small" showInfo={false} /></div>
            </div>
          </Panel>
        </div>
      }
      overlay={
        <div style={{ position: 'absolute', left: '50%', bottom: 24, transform: 'translateX(-50%)', display: 'flex', gap: 18, background: 'rgba(26,26,26,0.72)', padding: '10px 24px', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(18px)' }}>
          <Button type="text" style={{ color: 'var(--primary-color)' }}>📊 云图</Button>
          <Button type="text" style={{ color: 'var(--text-secondary)' }}>🎬 动画</Button>
          <Button type="text" style={{ color: 'var(--text-secondary)' }}>📈 分析</Button>
          <Button type="text" style={{ color: 'var(--text-secondary)' }}>💾 导出</Button>
        </div>
      }
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(26,26,26,0.95) 0%, rgba(40,40,40,0.95) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(52,199,89,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,107,104,0.1) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(139,92,246,0.1) 0%, transparent 50%)', opacity: 0.6 }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', userSelect: 'none' }}>
          <div style={{ fontSize: 60, marginBottom: 20, opacity: 0.25 }}>📊</div>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, opacity: 0.7 }}>3D结果可视化视口</div>
          <div style={{ fontSize: 14, opacity: 0.5, lineHeight: 1.6 }}>
            ✅ 云图可视化<br/>✅ 动画播放<br/>✅ 交互式分析<br/>✅ 等值线显示
          </div>
        </div>
      </div>
    </UnifiedModuleLayout>
  );
};

export default ResultsModule;