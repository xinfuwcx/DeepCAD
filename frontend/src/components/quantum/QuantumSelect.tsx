import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../stores/useUIStore';
import { useShallow } from 'zustand/react/shallow';

export interface QuantumSelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface QuantumSelectProps {
  options: QuantumSelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  size?: 'small' | 'middle' | 'large';
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  glowColor?: string;
  glowIntensity?: number;
  dropdownMatchWidth?: boolean;
  loading?: boolean;
  allowClear?: boolean;
}

const QuantumSelect: React.FC<QuantumSelectProps> = ({
  options,
  value,
  defaultValue,
  placeholder = '请选择',
  onChange,
  onFocus,
  onBlur,
  disabled = false,
  className = '',
  style,
  size = 'middle',
  prefix,
  suffix,
  glowColor,
  glowIntensity = 0.6,
  dropdownMatchWidth = true,
  loading = false,
  allowClear = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | undefined>(value || defaultValue);
  const [hoverIndex, setHoverIndex] = useState<number>(-1);
  const [isClearHovered, setIsClearHovered] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { uiMode, particleEffectsEnabled } = useUIStore(
    useShallow(state => ({
      uiMode: (state as any).uiMode || 'normal',
      particleEffectsEnabled: (state as any).particleEffectsEnabled || false
    }))
  );
  
  const isFusionMode = uiMode === 'fusion';
  
  // 同步外部value
  useEffect(() => {
    if (value !== undefined && value !== selectedValue) {
      setSelectedValue(value);
    }
  }, [value]);
  
  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current && 
        !selectRef.current.contains(event.target as Node) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        
        if (onBlur) {
          onBlur();
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onBlur]);
  
  // 处理选择项点击
  const handleOptionClick = (option: QuantumSelectOption) => {
    if (option.disabled) return;
    
    setSelectedValue(option.value);
    setIsOpen(false);
    
    if (onChange) {
      onChange(option.value);
    }
    
    if (onBlur) {
      onBlur();
    }
  };
  
  // 处理清除按钮点击
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedValue(undefined);
    
    if (onChange) {
      onChange('');
    }
  };
  
  // 处理下拉框切换
  const toggleDropdown = () => {
    if (disabled || loading) return;
    
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    if (newIsOpen) {
      if (onFocus) {
        onFocus();
      }
    } else {
      if (onBlur) {
        onBlur();
      }
    }
  };
  
  // 获取选中项的标签
  const getSelectedLabel = () => {
    if (selectedValue === undefined) {
      return placeholder;
    }
    
    const selectedOption = options.find(option => option.value === selectedValue);
    return selectedOption ? selectedOption.label : placeholder;
  };
  
  // 获取容器样式
  const getContainerStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'relative',
      width: '100%',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      ...style,
    };
    
    return baseStyles;
  };
  
  // 获取选择器样式
  const getSelectorStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      borderRadius: '8px',
      background: 'var(--bg-secondary)',
      border: isOpen 
        ? `1px solid ${glowColor || 'var(--quantum-blue)'}`
        : 'var(--glass-border)',
      transition: 'all var(--transition-medium)',
      boxShadow: isOpen 
        ? `0 0 8px ${glowColor || 'var(--quantum-blue)'}${Math.round(glowIntensity * 50)}`
        : 'none',
      backdropFilter: isFusionMode ? 'blur(var(--glass-blur))' : 'none',
      WebkitBackdropFilter: isFusionMode ? 'blur(var(--glass-blur))' : 'none',
      overflow: 'hidden',
    };
    
    // 根据尺寸调整内边距和高度
    if (size === 'small') {
      return {
        ...baseStyles,
        padding: '4px 8px',
        height: '32px',
        fontSize: '14px',
      };
    } else if (size === 'large') {
      return {
        ...baseStyles,
        padding: '8px 12px',
        height: '40px',
        fontSize: '16px',
      };
    } else {
      return {
        ...baseStyles,
        padding: '6px 10px',
        height: '36px',
        fontSize: '14px',
      };
    }
  };
  
  // 获取下拉框样式
  const getDropdownStyles = (): React.CSSProperties => {
    const width = dropdownMatchWidth && selectRef.current 
      ? selectRef.current.offsetWidth 
      : 200;
    
    return {
      position: 'absolute',
      top: 'calc(100% + 4px)',
      left: 0,
      width: dropdownMatchWidth ? '100%' : width,
      maxHeight: '250px',
      overflow: 'auto',
      background: 'var(--bg-dropdown)',
      borderRadius: '8px',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 1000,
      border: 'var(--glass-border)',
      backdropFilter: isFusionMode ? 'blur(var(--glass-blur))' : 'none',
      WebkitBackdropFilter: isFusionMode ? 'blur(var(--glass-blur))' : 'none',
    };
  };
  
  // 获取选项样式
  const getOptionStyles = (option: QuantumSelectOption, index: number): React.CSSProperties => {
    const isSelected = option.value === selectedValue;
    const isHovered = index === hoverIndex;
    
    return {
      padding: size === 'small' ? '6px 8px' : size === 'large' ? '10px 12px' : '8px 10px',
      cursor: option.disabled ? 'not-allowed' : 'pointer',
      background: isSelected 
        ? isFusionMode ? 'var(--gradient-blue-subtle)' : 'var(--bg-selected)' 
        : isHovered 
          ? 'var(--bg-hover)' 
          : 'transparent',
      color: option.disabled 
        ? 'var(--text-disabled)' 
        : isSelected 
          ? 'var(--text-selected)' 
          : 'var(--text-primary)',
      opacity: option.disabled ? 0.5 : 1,
      transition: 'all var(--transition-fast)',
      position: 'relative',
      overflow: 'hidden',
    };
  };
  
  // 获取类名
  const getClassName = () => {
    const baseClass = 'quantum-select';
    const modeClass = isFusionMode ? 'fusion-mode' : 'minimal-mode';
    const sizeClass = `quantum-select-${size}`;
    const stateClass = disabled ? 'disabled' : isOpen ? 'open' : '';
    const loadingClass = loading ? 'loading' : '';
    
    return `${baseClass} ${modeClass} ${sizeClass} ${stateClass} ${loadingClass} ${className}`;
  };
  
  // 渲染下拉箭头
  const renderArrow = () => {
    return (
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
        style={{ marginLeft: '8px' }}
      >
        <svg 
          width="10" 
          height="6" 
          viewBox="0 0 10 6" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M1 1L5 5L9 1" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    );
  };
  
  // 渲染加载状态
  const renderLoading = () => {
    if (!loading) return null;
    
    return (
      <div 
        className="quantum-select-loading"
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: glowColor || 'var(--quantum-blue)',
          animation: 'quantum-spin 1s linear infinite',
          marginLeft: '8px',
        }}
      />
    );
  };
  
  // 渲染清除按钮
  const renderClear = () => {
    if (!allowClear || !selectedValue || disabled) return null;
    
    return (
      <div 
        className="quantum-select-clear"
        onClick={handleClear}
        onMouseEnter={() => setIsClearHovered(true)}
        onMouseLeave={() => setIsClearHovered(false)}
        style={{
          marginLeft: '8px',
          opacity: isClearHovered ? 1 : 0.6,
          transition: 'opacity var(--transition-fast)',
          cursor: 'pointer',
        }}
      >
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 12 12" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M1 1L11 11M1 11L11 1" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
          />
        </svg>
      </div>
    );
  };
  
  // 渲染发光效果
  const renderGlowEffect = (option: QuantumSelectOption, index: number) => {
    if (!isFusionMode || !particleEffectsEnabled || option.disabled) return null;
    
    const isSelected = option.value === selectedValue;
    const isHovered = index === hoverIndex;
    
    if (!isSelected && !isHovered) return null;
    
    return (
      <div
        className="quantum-select-option-glow"
        style={{
          position: 'absolute',
          inset: 0,
          background: isSelected 
            ? `linear-gradient(135deg, ${glowColor || 'var(--quantum-blue)'}, ${glowColor || 'var(--quantum-purple)'})`
            : 'var(--bg-hover)',
          opacity: isSelected ? 0.2 : 0.1,
          pointerEvents: 'none',
        }}
      />
    );
  };

  return (
    <div
      className={getClassName()}
      style={getContainerStyles()}
    >
      {/* 选择器 */}
      <div
        ref={selectRef}
        className="quantum-select-selector"
        style={getSelectorStyles()}
        onClick={toggleDropdown}
      >
        <div className="quantum-select-content" style={{ display: 'flex', alignItems: 'center' }}>
          {prefix && (
            <div className="quantum-select-prefix" style={{ marginRight: '8px' }}>
              {prefix}
            </div>
          )}
          
          <div 
            className="quantum-select-value" 
            style={{ 
              flex: 1, 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              color: selectedValue === undefined ? 'var(--text-placeholder)' : 'var(--text-primary)',
            }}
          >
            {getSelectedLabel()}
          </div>
        </div>
        
        <div className="quantum-select-suffix" style={{ display: 'flex', alignItems: 'center' }}>
          {renderClear()}
          {renderLoading()}
          {suffix || renderArrow()}
        </div>
      </div>
      
      {/* 下拉框 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            className="quantum-select-dropdown"
            style={getDropdownStyles()}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {options.length === 0 ? (
              <div 
                className="quantum-select-empty" 
                style={{ 
                  padding: '10px', 
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                }}
              >
                暂无数据
              </div>
            ) : (
              options.map((option, index) => (
                <div
                  key={option.value}
                  className={`quantum-select-option ${option.disabled ? 'disabled' : ''} ${option.value === selectedValue ? 'selected' : ''}`}
                  style={getOptionStyles(option, index)}
                  onClick={() => handleOptionClick(option)}
                  onMouseEnter={() => setHoverIndex(index)}
                  onMouseLeave={() => setHoverIndex(-1)}
                >
                  {renderGlowEffect(option, index)}
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    {option.label}
                  </div>
                </div>
              ))
            )}
            
            {/* 融合模式下的粒子效果 */}
            {isFusionMode && particleEffectsEnabled && (
              <div
                className="quantum-select-particles"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: 'none',
                  overflow: 'hidden',
                  borderRadius: 'inherit',
                  zIndex: 0,
                }}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      width: '2px',
                      height: '2px',
                      borderRadius: '50%',
                      background: glowColor || 'var(--quantum-blue)',
                      opacity: 0.6,
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      animation: `quantum-float ${Math.random() * 3 + 2}s infinite ease-in-out`,
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuantumSelect; 