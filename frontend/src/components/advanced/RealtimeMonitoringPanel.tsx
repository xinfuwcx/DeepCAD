/**
 * 实时监测面板组件
 * 提供深基坑工程实时监测数据展示和预警功能
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FunctionalIcons } from '../icons/FunctionalIconsQuickFix';
import { StatusIcons } from '../icons/StatusIcons';

interface MonitoringPoint {
  id: string;
  name: string;
  type: 'displacement' | 'stress' | 'water_level' | 'tilt';
  location: { x: number; y: number; z: number };
  status: 'normal' | 'warning' | 'alarm' | 'offline';
  currentValue: number;
  threshold: { warning: number; alarm: number };
  unit: string;
  trend: 'stable' | 'increasing' | 'decreasing';
  lastUpdate: Date;
  history: { time: Date; value: number }[];
}

interface AlarmEvent {
  id: string;
  pointId: string;
  pointName: string;
  level: 'warning' | 'alarm';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface RealtimeMonitoringPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

const RealtimeMonitoringPanel: React.FC<RealtimeMonitoringPanelProps> = ({ isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'points' | 'alarms' | 'trends'>('overview');
  const [monitoringPoints, setMonitoringPoints] = useState<MonitoringPoint[]>([]);
  const [alarmEvents, setAlarmEvents] = useState<AlarmEvent[]>([]);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  // 初始化监测点数据
  useEffect(() => {
    if (isVisible) {
      const initialPoints: MonitoringPoint[] = [
        {
          id: 'INC-001',
          name: '围护墙顶部位移计',
          type: 'displacement',
          location: { x: 10, y: 0, z: -2 },
          status: 'warning',
          currentValue: 28.5,
          threshold: { warning: 25, alarm: 35 },
          unit: 'mm',
          trend: 'increasing',
          lastUpdate: new Date(),
          history: generateHistory(28.5, 24)
        },
        {
          id: 'INC-002',
          name: '基坑中部位移计',
          type: 'displacement',
          location: { x: 15, y: 10, z: -8 },
          status: 'normal',
          currentValue: 18.2,
          threshold: { warning: 25, alarm: 35 },
          unit: 'mm',
          trend: 'stable',
          lastUpdate: new Date(),
          history: generateHistory(18.2, 24)
        },
        {
          id: 'STR-001',
          name: '支撑轴力计',
          type: 'stress',
          location: { x: 8, y: 5, z: -6 },
          status: 'normal',
          currentValue: 850,
          threshold: { warning: 1000, alarm: 1200 },
          unit: 'kN',
          trend: 'stable',
          lastUpdate: new Date(),
          history: generateHistory(850, 24)
        },
        {
          id: 'WL-001',
          name: '地下水位监测井',
          type: 'water_level',
          location: { x: 20, y: 15, z: -12 },
          status: 'alarm',
          currentValue: -2.8,
          threshold: { warning: -3.0, alarm: -2.5 },
          unit: 'm',
          trend: 'increasing',
          lastUpdate: new Date(),
          history: generateHistory(-2.8, 24)
        },
        {
          id: 'TILT-001',
          name: '建筑物倾斜仪',
          type: 'tilt',
          location: { x: 25, y: -5, z: 0 },
          status: 'normal',
          currentValue: 0.8,
          threshold: { warning: 1.0, alarm: 1.5 },
          unit: 'mm/m',
          trend: 'stable',
          lastUpdate: new Date(),
          history: generateHistory(0.8, 24)
        }
      ];

      setMonitoringPoints(initialPoints);

      // 生成报警事件
      const initialAlarms: AlarmEvent[] = [
        {
          id: 'alarm-001',
          pointId: 'INC-001',
          pointName: '围护墙顶部位移计',
          level: 'warning',
          message: '位移值超过预警阈值',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          acknowledged: false
        },
        {
          id: 'alarm-002',
          pointId: 'WL-001',
          pointName: '地下水位监测井',
          level: 'alarm',
          message: '地下水位异常上升',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          acknowledged: false
        }
      ];

      setAlarmEvents(initialAlarms);
    }
  }, [isVisible]);

  // 生成历史数据
  function generateHistory(currentValue: number, hours: number): { time: Date; value: number }[] {
    const history = [];
    for (let i = hours; i >= 0; i--) {
      const time = new Date(Date.now() - i * 60 * 60 * 1000);
      const variation = (Math.random() - 0.5) * 2; // ±1的变化
      const value = currentValue + variation * (i / hours); // 逐渐变化到当前值
      history.push({ time, value });
    }
    return history;
  }

  // 实时数据更新
  useEffect(() => {
    if (!isVisible || !isRealTimeEnabled) return;

    const interval = setInterval(() => {
      setMonitoringPoints(prev => prev.map(point => {
        const variation = (Math.random() - 0.5) * 0.5; // 小幅随机变化
        const newValue = point.currentValue + variation;
        
        // 更新状态
        let newStatus: MonitoringPoint['status'] = 'normal';
        if (Math.abs(newValue) >= Math.abs(point.threshold.alarm)) {
          newStatus = 'alarm';
        } else if (Math.abs(newValue) >= Math.abs(point.threshold.warning)) {
          newStatus = 'warning';
        }

        // 更新历史数据
        const newHistory = [...point.history.slice(-23), { time: new Date(), value: newValue }];

        return {
          ...point,
          currentValue: newValue,
          status: newStatus,
          lastUpdate: new Date(),
          history: newHistory
        };
      }));
    }, 5000); // 每5秒更新一次

    return () => clearInterval(interval);
  }, [isVisible, isRealTimeEnabled]);

  // 获取状态颜色
  const getStatusColor = (status: MonitoringPoint['status']) => {
    switch (status) {
      case 'normal': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'alarm': return '#ef4444';
      case 'offline': return '#64748b';
      default: return '#64748b';
    }
  };

  const getStatusLabel = (status: MonitoringPoint['status']) => {
    switch (status) {
      case 'normal': return '正常';
      case 'warning': return '预警';
      case 'alarm': return '报警';
      case 'offline': return '离线';
      default: return '未知';
    }
  };

  const getTypeIcon = (type: MonitoringPoint['type']) => {
    switch (type) {
      case 'displacement': return FunctionalIcons.ExcavationDesign;
      case 'stress': return FunctionalIcons.StructuralAnalysis;
      case 'water_level': return FunctionalIcons.GeologyModeling;
      case 'tilt': return FunctionalIcons.MaterialProperties;
      default: return FunctionalIcons.MaterialProperties;
    }
  };

  const getTypeLabel = (type: MonitoringPoint['type']) => {
    switch (type) {
      case 'displacement': return '位移';
      case 'stress': return '应力';
      case 'water_level': return '水位';
      case 'tilt': return '倾斜';
      default: return '未知';
    }
  };

  // 确认报警
  const acknowledgeAlarm = (alarmId: string) => {
    setAlarmEvents(prev => prev.map(alarm => 
      alarm.id === alarmId ? { ...alarm, acknowledged: true } : alarm
    ));
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">RM</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">实时监测系统</h2>
                <p className="text-sm text-gray-600">深基坑工程安全监测与预警</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isRealTimeEnabled}
                  onChange={(e) => setIsRealTimeEnabled(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">实时更新</span>
              </label>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isRealTimeEnabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className="text-sm text-gray-600">
                  {isRealTimeEnabled ? '在线' : '离线'}
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <span className="text-gray-600">×</span>
              </button>
            </div>
          </div>

          {/* 标签页 */}
          <div className="flex border-b border-gray-200">
            {[
              { key: 'overview', label: '总览', icon: '📊' },
              { key: 'points', label: '监测点', icon: '📍' },
              { key: 'alarms', label: '报警', icon: '🚨' },
              { key: 'trends', label: '趋势', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.key}
                className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab(tab.key as any)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.key === 'alarms' && alarmEvents.filter(a => !a.acknowledged).length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                    {alarmEvents.filter(a => !a.acknowledged).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-hidden p-6">
            {activeTab === 'overview' && (
              <div className="h-full space-y-6">
                {/* 状态总览 */}
                <div className="grid grid-cols-4 gap-4">
                  {['normal', 'warning', 'alarm', 'offline'].map((status) => {
                    const count = monitoringPoints.filter(p => p.status === status).length;
                    return (
                      <div key={status} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{getStatusLabel(status as any)}</p>
                            <p className="text-2xl font-bold" style={{ color: getStatusColor(status as any) }}>
                              {count}
                            </p>
                          </div>
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getStatusColor(status as any) }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 重点监测点 */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">重点监测点</h3>
                  <div className="space-y-4">
                    {monitoringPoints
                      .filter(p => p.status === 'alarm' || p.status === 'warning')
                      .map((point) => {
                        const Icon = getTypeIcon(point.type);
                        return (
                          <div key={point.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Icon size={20} color={getStatusColor(point.status)} />
                              <div>
                                <p className="font-medium text-gray-800">{point.name}</p>
                                <p className="text-sm text-gray-600">{getTypeLabel(point.type)} • {point.id}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold" style={{ color: getStatusColor(point.status) }}>
                                {point.currentValue.toFixed(1)} {point.unit}
                              </p>
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <span>阈值: {point.threshold.warning}</span>
                                <span>/</span>
                                <span>{point.threshold.alarm}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 最新报警 */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">最新报警</h3>
                  <div className="space-y-3">
                    {alarmEvents.slice(0, 3).map((alarm) => (
                      <div key={alarm.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${alarm.level === 'alarm' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                          <div>
                            <p className="font-medium text-gray-800">{alarm.pointName}</p>
                            <p className="text-sm text-gray-600">{alarm.message}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {alarm.timestamp.toLocaleTimeString('zh-CN')}
                          </p>
                          {!alarm.acknowledged && (
                            <button
                              onClick={() => acknowledgeAlarm(alarm.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              确认
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'points' && (
              <div className="h-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 h-full overflow-y-auto">
                  {monitoringPoints.map((point) => {
                    const Icon = getTypeIcon(point.type);
                    return (
                      <div key={point.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Icon size={20} color={getStatusColor(point.status)} />
                            <span className="font-medium text-gray-800">{point.name}</span>
                          </div>
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getStatusColor(point.status) }}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">编号:</span>
                            <span className="font-mono">{point.id}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">类型:</span>
                            <span>{getTypeLabel(point.type)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">当前值:</span>
                            <span className="font-bold" style={{ color: getStatusColor(point.status) }}>
                              {point.currentValue.toFixed(2)} {point.unit}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">预警值:</span>
                            <span className="text-yellow-600">{point.threshold.warning} {point.unit}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">报警值:</span>
                            <span className="text-red-600">{point.threshold.alarm} {point.unit}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">更新时间:</span>
                            <span className="text-gray-500">{point.lastUpdate.toLocaleTimeString('zh-CN')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'alarms' && (
              <div className="h-full">
                <div className="space-y-4 h-full overflow-y-auto">
                  {alarmEvents.map((alarm) => (
                    <div key={alarm.id} className={`p-4 rounded-lg border-l-4 ${
                      alarm.level === 'alarm' 
                        ? 'bg-red-50 border-l-red-500' 
                        : 'bg-yellow-50 border-l-yellow-500'
                    } ${alarm.acknowledged ? 'opacity-60' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            alarm.level === 'alarm' ? 'bg-red-500' : 'bg-yellow-500'
                          }`} />
                          <div>
                            <p className="font-medium text-gray-800">{alarm.pointName}</p>
                            <p className="text-sm text-gray-600">{alarm.message}</p>
                            <p className="text-xs text-gray-500">
                              {alarm.timestamp.toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {alarm.acknowledged ? (
                            <span className="text-sm text-green-600 font-medium">已确认</span>
                          ) : (
                            <button
                              onClick={() => acknowledgeAlarm(alarm.id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                            >
                              确认
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'trends' && (
              <div className="h-full">
                <div className="bg-white border border-gray-200 rounded-lg p-6 h-full">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">监测数据趋势</h3>
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <FunctionalIcons.ResultVisualization size={48} color="#64748b" />
                      <p className="mt-2">趋势图表区域</p>
                      <p className="text-sm">实时数据趋势分析图表</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RealtimeMonitoringPanel;