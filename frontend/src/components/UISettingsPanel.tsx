import React, { useState } from 'react';
import { useUIStore } from '../stores/useUIStore';
import { useShallow } from 'zustand/react/shallow';
import QuantumCard from './quantum/QuantumCard';
import QuantumToggle from './quantum/QuantumToggle';
import QuantumButton from './quantum/QuantumButton';
import QuantumSelect from './quantum/QuantumSelect';

interface UISettingsPanelProps {
  onClose?: () => void;
}

const UISettingsPanel: React.FC<UISettingsPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'advanced' | 'accessibility'>('general');
  
  const {
    uiMode,
    setUIMode,
    toggleUIMode,
    particleEffectsEnabled,
    toggleParticleEffects,
    quantumEffectsEnabled,
    toggleQuantumEffects,
    animationsEnabled,
    toggleAnimations,
    soundEffectsEnabled,
    toggleSoundEffects,
    performanceMode,
    setPerformanceMode,
    uiScale,
    setUIScale,
    primaryColor,
    setPrimaryColor,
    highContrastMode,
    toggleHighContrastMode,
    resetUISettings,
  } = useUIStore(
    useShallow(state => ({
      uiMode: state.uiMode,
      setUIMode: state.setUiMode,
      toggleUIMode: state.toggleUiMode || (() => {}),
      particleEffectsEnabled: state.particleEffectsEnabled,
      toggleParticleEffects: state.toggleParticleEffects,
      quantumEffectsEnabled: state.quantumEffectsEnabled || false,
      toggleQuantumEffects: state.toggleQuantumEffects,
      animationsEnabled: state.animationsEnabled,
      toggleAnimations: state.toggleAnimations,
      soundEffectsEnabled: state.soundEffectsEnabled,
      toggleSoundEffects: state.toggleSoundEffects,
      performanceMode: state.performanceMode,
      setPerformanceMode: state.setPerformanceMode,
      uiScale: state.uiScale,
      setUIScale: state.setUIScale,
      primaryColor: state.primaryColor,
      setPrimaryColor: state.setPrimaryColor,
      highContrastMode: state.highContrastMode,
      toggleHighContrastMode: state.toggleHighContrastMode,
      resetUISettings: state.resetUISettings,
    }))
  );
  
  // 性能模式选项
  const performanceModeOptions = [
    { value: 'high', label: '高性能 (全部特效)' },
    { value: 'balanced', label: '平衡 (部分特效)' },
    { value: 'low', label: '低性能 (最少特效)' },
  ];
  
  // 主题色选项
  const colorOptions = [
    { color: '#3a86ff', name: '量子蓝' },
    { color: '#8a2be2', name: '量子紫' },
    { color: '#00e5ff', name: '量子青' },
    { color: '#ff00aa', name: '量子粉' },
    { color: '#00e676', name: '量子绿' },
    { color: '#ffea00', name: '量子黄' },
    { color: '#ff9100', name: '量子橙' },
    { color: '#ff3d00', name: '量子红' },
  ];
  
  // 缩放选项
  const scaleOptions = [
    { value: 0.8, label: '80%' },
    { value: 0.9, label: '90%' },
    { value: 1, label: '100%' },
    { value: 1.1, label: '110%' },
    { value: 1.2, label: '120%' },
  ];
  
  // 渲染标签页
  const renderTabs = () => {
    return (
      <div className="ui-settings-tabs" style={{ display: 'flex', marginBottom: '16px' }}>
        <div
          className={`ui-settings-tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            borderBottom: activeTab === 'general' ? `2px solid ${primaryColor}` : '2px solid transparent',
            color: activeTab === 'general' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'general' ? 600 : 400,
            transition: 'all var(--transition-fast)',
          }}
        >
          常规
        </div>
        <div
          className={`ui-settings-tab ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            borderBottom: activeTab === 'advanced' ? `2px solid ${primaryColor}` : '2px solid transparent',
            color: activeTab === 'advanced' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'advanced' ? 600 : 400,
            transition: 'all var(--transition-fast)',
          }}
        >
          高级
        </div>
        <div
          className={`ui-settings-tab ${activeTab === 'accessibility' ? 'active' : ''}`}
          onClick={() => setActiveTab('accessibility')}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            borderBottom: activeTab === 'accessibility' ? `2px solid ${primaryColor}` : '2px solid transparent',
            color: activeTab === 'accessibility' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'accessibility' ? 600 : 400,
            transition: 'all var(--transition-fast)',
          }}
        >
          辅助功能
        </div>
      </div>
    );
  };
  
  // 渲染常规设置
  const renderGeneralSettings = () => {
    return (
      <div className="ui-settings-general">
        <div className="ui-settings-item" style={{ marginBottom: '16px' }}>
          <div className="ui-settings-item-label" style={{ marginBottom: '8px' }}>
            界面模式
          </div>
          <div className="ui-settings-item-control" style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px', color: 'var(--text-secondary)' }}>极简</span>
            <QuantumToggle
              checked={uiMode === 'fusion'}
              onChange={(checked) => setUIMode(checked ? 'fusion' : 'minimal')}
              checkedChildren="融合"
              unCheckedChildren="极简"
            />
            <span style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}>融合</span>
          </div>
          <div className="ui-settings-item-description" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            融合模式启用全部视觉特效，极简模式专注于性能和简洁
          </div>
        </div>
        
        <div className="ui-settings-item" style={{ marginBottom: '16px' }}>
          <div className="ui-settings-item-label" style={{ marginBottom: '8px' }}>
            粒子效果
          </div>
          <div className="ui-settings-item-control">
            <QuantumToggle
              checked={particleEffectsEnabled}
              onChange={toggleParticleEffects}
              disabled={uiMode !== 'fusion'}
            />
          </div>
          <div className="ui-settings-item-description" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            启用交互式粒子效果（仅在融合模式下可用）
          </div>
        </div>
        
        <div className="ui-settings-item" style={{ marginBottom: '16px' }}>
          <div className="ui-settings-item-label" style={{ marginBottom: '8px' }}>
            量子特效
          </div>
          <div className="ui-settings-item-control">
            <QuantumToggle
              checked={quantumEffectsEnabled}
              onChange={toggleQuantumEffects}
              disabled={uiMode !== 'fusion'}
            />
          </div>
          <div className="ui-settings-item-description" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            启用量子特效，如发光、波纹等（仅在融合模式下可用）
          </div>
        </div>
        
        <div className="ui-settings-item" style={{ marginBottom: '16px' }}>
          <div className="ui-settings-item-label" style={{ marginBottom: '8px' }}>
            动画效果
          </div>
          <div className="ui-settings-item-control">
            <QuantumToggle
              checked={animationsEnabled}
              onChange={toggleAnimations}
            />
          </div>
          <div className="ui-settings-item-description" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            启用界面动画效果
          </div>
        </div>
        
        <div className="ui-settings-item" style={{ marginBottom: '16px' }}>
          <div className="ui-settings-item-label" style={{ marginBottom: '8px' }}>
            音效
          </div>
          <div className="ui-settings-item-control">
            <QuantumToggle
              checked={soundEffectsEnabled}
              onChange={toggleSoundEffects}
            />
          </div>
          <div className="ui-settings-item-description" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            启用界面交互音效
          </div>
        </div>
      </div>
    );
  };
  
  // 渲染高级设置
  const renderAdvancedSettings = () => {
    return (
      <div className="ui-settings-advanced">
        <div className="ui-settings-item" style={{ marginBottom: '16px' }}>
          <div className="ui-settings-item-label" style={{ marginBottom: '8px' }}>
            性能模式
          </div>
          <div className="ui-settings-item-control">
            <QuantumSelect
              value={performanceMode}
              onChange={(value) => setPerformanceMode(value as 'high' | 'balanced' | 'low')}
              options={performanceModeOptions.map(option => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </div>
          <div className="ui-settings-item-description" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            调整性能与视觉效果的平衡
          </div>
        </div>
        
        <div className="ui-settings-item" style={{ marginBottom: '16px' }}>
          <div className="ui-settings-item-label" style={{ marginBottom: '8px' }}>
            界面缩放
          </div>
          <div className="ui-settings-item-control">
            <QuantumSelect
              value={uiScale.toString()}
              onChange={(value) => setUIScale(parseFloat(value))}
              options={scaleOptions.map(option => ({
                value: option.value.toString(),
                label: option.label,
              }))}
            />
          </div>
          <div className="ui-settings-item-description" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            调整界面元素的大小
          </div>
        </div>
        
        <div className="ui-settings-item" style={{ marginBottom: '16px' }}>
          <div className="ui-settings-item-label" style={{ marginBottom: '8px' }}>
            主题颜色
          </div>
          <div className="ui-settings-item-control" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {colorOptions.map(option => (
              <div
                key={option.color}
                onClick={() => setPrimaryColor(option.color)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: option.color,
                  cursor: 'pointer',
                  border: primaryColor === option.color ? '2px solid var(--text-primary)' : '2px solid transparent',
                  transition: 'all var(--transition-fast)',
                  position: 'relative',
                }}
                title={option.name}
              >
                {primaryColor === option.color && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#fff',
                    fontSize: '16px',
                  }}>
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="ui-settings-item-description" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            选择界面主题色
          </div>
        </div>
      </div>
    );
  };
  
  // 渲染辅助功能设置
  const renderAccessibilitySettings = () => {
    return (
      <div className="ui-settings-accessibility">
        <div className="ui-settings-item" style={{ marginBottom: '16px' }}>
          <div className="ui-settings-item-label" style={{ marginBottom: '8px' }}>
            高对比度模式
          </div>
          <div className="ui-settings-item-control">
            <QuantumToggle
              checked={highContrastMode}
              onChange={toggleHighContrastMode}
            />
          </div>
          <div className="ui-settings-item-description" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            提高界面对比度，增强可读性
          </div>
        </div>
        
        <div className="ui-settings-item" style={{ marginBottom: '16px' }}>
          <div className="ui-settings-item-label" style={{ marginBottom: '8px' }}>
            减少动画
          </div>
          <div className="ui-settings-item-control">
            <QuantumToggle
              checked={!animationsEnabled}
              onChange={(checked) => toggleAnimations()}
            />
          </div>
          <div className="ui-settings-item-description" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            减少或禁用界面动画效果
          </div>
        </div>
      </div>
    );
  };
  
  // 渲染底部按钮
  const renderFooter = () => {
    return (
      <div className="ui-settings-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        <QuantumButton
          variant="ghost"
          onClick={resetUISettings}
        >
          恢复默认
        </QuantumButton>
        
        <QuantumButton
          variant="primary"
          onClick={onClose}
        >
          完成
        </QuantumButton>
      </div>
    );
  };

  return (
    <QuantumCard
      title="界面设置"
      variant="glass"
      style={{ width: '100%', maxWidth: '500px' }}
    >
      {renderTabs()}
      
      <div className="ui-settings-content" style={{ marginTop: '16px' }}>
        {activeTab === 'general' && renderGeneralSettings()}
        {activeTab === 'advanced' && renderAdvancedSettings()}
        {activeTab === 'accessibility' && renderAccessibilitySettings()}
      </div>
      
      {renderFooter()}
    </QuantumCard>
  );
};

export default UISettingsPanel; 