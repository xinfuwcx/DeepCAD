import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '../../stores/useUIStore';
import { useShallow } from 'zustand/react/shallow';

export interface QuantumInputProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
  type?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  size?: 'small' | 'middle' | 'large';
  maxLength?: number;
  id?: string;
  name?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  glowColor?: string;
  glowIntensity?: number;
}

const QuantumInput: React.FC<QuantumInputProps> = ({
  value,
  defaultValue,
  placeholder,
  onChange,
  onFocus,
  onBlur,
  disabled = false,
  readOnly = false,
  className = '',
  style,
  type = 'text',
  prefix,
  suffix,
  size = 'middle',
  maxLength,
  id,
  name,
  autoComplete,
  autoFocus,
  glowColor,
  glowIntensity = 0.6,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value || defaultValue || '');
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; size: number; opacity: number; id: number }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);
  
  const { uiMode, particleEffectsEnabled } = useUIStore(
    useShallow(state => ({
      uiMode: (state as any).uiMode || 'normal',
      particleEffectsEnabled: (state as any).particleEffectsEnabled || false
    }))
  );
  
  const isFusionMode = uiMode === 'fusion';
  
  // 同步外部value
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);
  
  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    if (value === undefined) {
      setInputValue(newValue);
    }
    
    if (onChange) {
      onChange(newValue);
    }
    
    // 在Fusion模式下，添加涟漪效果
    if (isFusionMode && particleEffectsEnabled && !disabled && !readOnly) {
      addRipple();
    }
  };
  
  // 处理聚焦
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    
    if (onFocus) {
      onFocus(e);
    }
    
    // 在Fusion模式下，添加涟漪效果
    if (isFusionMode && particleEffectsEnabled && !disabled && !readOnly) {
      addRipple();
    }
  };
  
  // 处理失焦
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    
    if (onBlur) {
      onBlur(e);
    }
  };
  
  // 添加涟漪效果
  const addRipple = () => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;
    
    const x = Math.random() * containerWidth;
    const y = Math.random() * containerHeight;
    const size = Math.random() * 10 + 5;
    const id = rippleIdRef.current++;
    
    setRipples(prev => [...prev, { x, y, size, opacity: 0.7, id }]);
    
    // 3秒后移除涟漪
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id));
    }, 3000);
  };
  
  // 获取容器样式
  const getContainerStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      borderRadius: '8px',
      background: 'var(--bg-secondary)',
      border: focused 
        ? `1px solid ${glowColor || 'var(--quantum-blue)'}`
        : 'var(--glass-border)',
      transition: 'all var(--transition-medium)',
      boxShadow: focused 
        ? `0 0 8px ${glowColor || 'var(--quantum-blue)'}${Math.round(glowIntensity * 50)}`
        : 'none',
      opacity: disabled ? 0.6 : 1,
      cursor: disabled ? 'not-allowed' : 'text',
      overflow: 'hidden',
      backdropFilter: isFusionMode ? 'blur(var(--glass-blur))' : 'none',
      WebkitBackdropFilter: isFusionMode ? 'blur(var(--glass-blur))' : 'none',
      ...style
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
  
  // 获取输入框样式
  const getInputStyles = (): React.CSSProperties => {
    return {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: 'var(--text-primary)',
      width: '100%',
      fontSize: 'inherit',
      fontFamily: 'inherit',
    };
  };
  
  // 获取类名
  const getClassName = () => {
    const baseClass = 'quantum-input';
    const modeClass = isFusionMode ? 'fusion-mode' : 'minimal-mode';
    const sizeClass = `quantum-input-${size}`;
    const stateClass = disabled ? 'disabled' : focused ? 'focused' : '';
    
    return `${baseClass} ${modeClass} ${sizeClass} ${stateClass} ${className}`;
  };

  return (
    <motion.div
      ref={containerRef}
      className={getClassName()}
      style={getContainerStyles()}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 前缀图标 */}
      {prefix && (
        <div className="quantum-input-prefix" style={{ marginRight: '8px' }}>
          {prefix}
        </div>
      )}
      
      {/* 输入框 */}
      <input
        ref={inputRef}
        type={type}
        value={inputValue}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        readOnly={readOnly}
        style={getInputStyles()}
        maxLength={maxLength}
        id={id}
        name={name}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        {...props}
      />
      
      {/* 后缀图标 */}
      {suffix && (
        <div className="quantum-input-suffix" style={{ marginLeft: '8px' }}>
          {suffix}
        </div>
      )}
      
      {/* 涟漪效果 - 仅在Fusion模式下显示 */}
      {isFusionMode && particleEffectsEnabled && ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          className="quantum-input-ripple"
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: 2,
            height: 2,
            borderRadius: '50%',
            background: glowColor || 'var(--quantum-blue)',
            pointerEvents: 'none',
          }}
          initial={{ scale: 0, opacity: ripple.opacity }}
          animate={{ 
            scale: ripple.size,
            opacity: 0,
          }}
          transition={{ 
            duration: 3,
            ease: 'easeOut'
          }}
        />
      ))}
      
      {/* 底部边框发光效果 - 仅在Fusion模式和聚焦时显示 */}
      {isFusionMode && focused && (
        <motion.div
          className="quantum-input-glow"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: glowColor || 'var(--gradient-blue)',
            pointerEvents: 'none',
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.div>
  );
};

export default QuantumInput; 