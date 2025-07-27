/**
 * DeepCAD 科技未来感输入框组件
 * 1号架构师 - 基础原子组件
 */

import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { designTokens } from '../../design/tokens';

// ==================== 类型定义 ====================

export interface InputProps {
  // 基础属性
  className?: string;
  style?: React.CSSProperties;
  
  // 输入框变体
  variant?: 'default' | 'filled' | 'outline' | 'borderless';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  
  // 状态属性
  loading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: boolean;
  success?: boolean;
  
  // 视觉效果
  glow?: boolean;          // 辉光效果
  quantum?: boolean;       // 量子闪烁效果  
  rounded?: boolean;       // 圆角样式
  fluid?: boolean;         // 流体宽度
  
  // CAE专用属性
  caeType?: 'geometry' | 'mesh' | 'material' | 'computation' | 'results';
  precision?: number;      // 数值精度
  unit?: string;          // 单位标识
  min?: number;           // 最小值
  max?: number;           // 最大值
  step?: number;          // 步长
  
  // 内容属性
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'url' | 'search';
  
  // 验证属性
  required?: boolean;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  
  // 辅助元素
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  addonBefore?: React.ReactNode;
  addonAfter?: React.ReactNode;
  
  // 状态文本
  errorMessage?: string;
  successMessage?: string;
  helperText?: string;
  
  // 事件处理
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyUp?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onEnterPress?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  
  // HTML属性
  id?: string;
  name?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  tabIndex?: number;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'data-testid'?: string;
}

// ==================== 样式配置 ====================

const getVariantStyles = (
  variant: InputProps['variant'] = 'default',
  isFocused: boolean = false,
  error: boolean = false,
  success: boolean = false
) => {
  const baseStyles = {
    default: {
      background: designTokens.colors.neutral[900],
      border: `1px solid ${designTokens.colors.neutral[700]}`,
      color: designTokens.colors.neutral[100],
      focus: {
        background: designTokens.colors.neutral[900],
        border: `1px solid ${designTokens.colors.primary[500]}`,
        boxShadow: `0 0 0 2px ${designTokens.colors.primary[500]}20`
      }
    },
    filled: {
      background: designTokens.colors.neutral[800],
      border: '1px solid transparent',
      color: designTokens.colors.neutral[100],
      focus: {
        background: designTokens.colors.neutral[800],
        border: `1px solid ${designTokens.colors.primary[500]}`,
        boxShadow: `0 0 0 2px ${designTokens.colors.primary[500]}20`
      }
    },
    outline: {
      background: 'transparent',
      border: `2px solid ${designTokens.colors.neutral[600]}`,
      color: designTokens.colors.neutral[200],
      focus: {
        background: `${designTokens.colors.primary[500]}05`,
        border: `2px solid ${designTokens.colors.primary[500]}`,
        boxShadow: designTokens.shadows.glow.sm
      }
    },
    borderless: {
      background: 'transparent',
      border: '1px solid transparent',
      borderBottom: `2px solid ${designTokens.colors.neutral[600]}`,
      color: designTokens.colors.neutral[200],
      borderRadius: '0',
      focus: {
        background: 'transparent',
        border: '1px solid transparent',
        borderBottom: `2px solid ${designTokens.colors.primary[500]}`,
        boxShadow: 'none'
      }
    }
  };

  let styles = baseStyles[variant];
  
  // 错误状态
  if (error) {
    const errorColor = designTokens.colors.semantic.error;
    styles = {
      ...styles,
      border: styles.border?.replace(designTokens.colors.neutral[700], errorColor) || `1px solid ${errorColor}`,
      focus: {
        ...styles.focus,
        border: styles.focus.border?.replace(designTokens.colors.primary[500], errorColor) || `1px solid ${errorColor}`,
        boxShadow: `0 0 0 2px ${errorColor}20`
      }
    };
  }
  
  // 成功状态
  if (success) {
    const successColor = designTokens.colors.semantic.success;
    styles = {
      ...styles,
      border: styles.border?.replace(designTokens.colors.neutral[700], successColor) || `1px solid ${successColor}`,
      focus: {
        ...styles.focus,
        border: styles.focus.border?.replace(designTokens.colors.primary[500], successColor) || `1px solid ${successColor}`,
        boxShadow: `0 0 0 2px ${successColor}20`
      }
    };
  }

  return isFocused ? styles.focus : styles;
};

const getSizeStyles = (size: InputProps['size'] = 'md') => {
  const styles = {
    xs: {
      padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
      fontSize: designTokens.typography.fontSize.xs,
      height: '24px'
    },
    sm: {
      padding: `${designTokens.spacing[1.5]} ${designTokens.spacing[3]}`,
      fontSize: designTokens.typography.fontSize.sm,
      height: '32px'
    },
    md: {
      padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
      fontSize: designTokens.typography.fontSize.base,
      height: '40px'
    },
    lg: {
      padding: `${designTokens.spacing[2.5]} ${designTokens.spacing[4]}`,
      fontSize: designTokens.typography.fontSize.lg,
      height: '48px'
    },
    xl: {
      padding: `${designTokens.spacing[3]} ${designTokens.spacing[5]}`,
      fontSize: designTokens.typography.fontSize.xl,
      height: '56px'
    }
  };
  
  return styles[size];
};

const getCAEStyles = (caeType: InputProps['caeType']) => {
  if (!caeType) return {};
  
  const caeColors = {
    geometry: designTokens.colors.semantic.geometry,
    mesh: designTokens.colors.semantic.mesh,
    material: designTokens.colors.semantic.material,
    computation: designTokens.colors.semantic.computing,
    results: designTokens.colors.semantic.safety
  };
  
  const color = caeColors[caeType];
  return {
    borderLeft: `3px solid ${color}`,
    paddingLeft: designTokens.spacing[3]
  };
};

// ==================== 组件实现 ====================

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  className = '',
  style,
  variant = 'default',
  size = 'md',
  loading = false,
  disabled = false,
  readOnly = false,
  error = false,
  success = false,
  glow = false,
  quantum = false,
  rounded = false,
  fluid = false,
  caeType,
  precision,
  unit,
  min,
  max,
  step,
  value,
  defaultValue,
  placeholder,
  type = 'text',
  required = false,
  pattern,
  minLength,
  maxLength,
  prefix,
  suffix,
  addonBefore,
  addonAfter,
  errorMessage,
  successMessage,
  helperText,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  onKeyUp,
  onEnterPress,
  ...htmlProps
}, ref) => {
  // 状态管理
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value || defaultValue || '');
  const inputRef = useRef<HTMLInputElement>(null);

  // 处理受控/非受控组件
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  // 样式计算
  const variantStyles = getVariantStyles(variant, isFocused, error, success);
  const sizeStyles = getSizeStyles(size);
  const caeStyles = getCAEStyles(caeType);

  // 容器样式
  const containerStyles: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    width: fluid ? '100%' : 'auto',
    fontFamily: designTokens.typography.fontFamily.primary.join(', '),
    
    // 变体样式
    background: variantStyles.background,
    border: variantStyles.border,
    borderRadius: rounded ? designTokens.borderRadius.full : 
                  variant === 'borderless' ? '0' : designTokens.borderRadius.md,
    boxShadow: variantStyles.boxShadow || 'none',
    
    // 尺寸样式
    height: sizeStyles.height,
    
    // 视觉效果
    transition: `all ${designTokens.animation.duration[200]} ${designTokens.animation.timing.smooth}`,
    
    // 禁用状态
    ...(disabled && {
      opacity: 0.6,
      cursor: 'not-allowed',
      background: designTokens.colors.neutral[950]
    }),
    
    // 辉光效果
    ...(glow && isFocused && !disabled && {
      filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))'
    }),
    
    // CAE专用样式
    ...caeStyles,
    
    // 自定义样式
    ...style
  };

  // 输入框样式
  const inputStyles: React.CSSProperties = {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: variantStyles.color,
    fontSize: sizeStyles.fontSize,
    padding: `0 ${designTokens.spacing[1]}`,
    fontFamily: 'inherit',
    
    '::placeholder': {
      color: designTokens.colors.neutral[500],
      opacity: 1
    }
  };

  // 事件处理
  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    if (!disabled && !readOnly) {
      setIsFocused(true);
      onFocus?.(event);
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = event.target.value;
    
    // 数值类型精度处理
    if (type === 'number' && precision !== undefined && newValue) {
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue)) {
        newValue = numValue.toFixed(precision);
      }
    }
    
    if (value === undefined) {
      setInternalValue(newValue);
    }
    
    onChange?.(event);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onEnterPress?.(event);
    }
    onKeyDown?.(event);
  };

  // 量子动画变体
  const quantumVariants = {
    animate: quantum ? {
      boxShadow: [
        `0 0 5px ${designTokens.colors.primary[500]}40`,
        `0 0 15px ${designTokens.colors.primary[400]}60`,
        `0 0 5px ${designTokens.colors.primary[500]}40`
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    } : {}
  };

  // 消息文本
  const messageText = errorMessage || successMessage || helperText;
  const messageType = error ? 'error' : success ? 'success' : 'helper';

  return (
    <div className={`deepcad-input-wrapper ${className}`}>
      {/* 前置插件 */}
      {addonBefore && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: designTokens.colors.neutral[800],
          border: `1px solid ${designTokens.colors.neutral[700]}`,
          borderRight: 'none',
          borderRadius: `${designTokens.borderRadius.md} 0 0 ${designTokens.borderRadius.md}`,
          padding: `0 ${designTokens.spacing[3]}`,
          color: designTokens.colors.neutral[400],
          fontSize: sizeStyles.fontSize
        }}>
          {addonBefore}
        </div>
      )}

      {/* 主输入容器 */}
      <motion.div
        style={containerStyles}
        variants={quantumVariants}
        animate={quantumVariants.animate}
      >
        {/* 前缀 */}
        {prefix && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            color: designTokens.colors.neutral[400],
            paddingLeft: sizeStyles.padding.split(' ')[1],
            fontSize: sizeStyles.fontSize
          }}>
            {prefix}
          </div>
        )}

        {/* 输入框 */}
        <input
          ref={ref || inputRef}
          type={type}
          value={value !== undefined ? value : internalValue}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          pattern={pattern}
          minLength={minLength}
          maxLength={maxLength}
          min={min}
          max={max}
          step={step}
          style={inputStyles}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={onKeyUp}
          {...htmlProps}
        />

        {/* 加载状态 */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                paddingRight: sizeStyles.padding.split(' ')[1]
              }}
            >
              <motion.div
                style={{
                  width: '14px',
                  height: '14px',
                  border: `2px solid ${designTokens.colors.neutral[600]}`,
                  borderTop: `2px solid ${designTokens.colors.primary[500]}`,
                  borderRadius: '50%'
                }}
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 后缀和单位 */}
        {(suffix || unit) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            color: designTokens.colors.neutral[400],
            paddingRight: sizeStyles.padding.split(' ')[1],
            fontSize: sizeStyles.fontSize,
            gap: designTokens.spacing[1]
          }}>
            {suffix}
            {unit && (
              <span style={{
                fontSize: '0.85em',
                fontWeight: designTokens.typography.fontWeight.medium,
                color: designTokens.colors.neutral[300]
              }}>
                {unit}
              </span>
            )}
          </div>
        )}

        {/* CAE类型指示器 */}
        {caeType && (
          <div
            style={{
              position: 'absolute',
              right: '4px',
              top: '4px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: designTokens.colors.semantic[caeType] || designTokens.colors.primary[500],
              filter: `drop-shadow(0 0 2px ${designTokens.colors.semantic[caeType] || designTokens.colors.primary[500]})`
            }}
          />
        )}
      </motion.div>

      {/* 后置插件 */}
      {addonAfter && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: designTokens.colors.neutral[800],
          border: `1px solid ${designTokens.colors.neutral[700]}`,
          borderLeft: 'none',
          borderRadius: `0 ${designTokens.borderRadius.md} ${designTokens.borderRadius.md} 0`,
          padding: `0 ${designTokens.spacing[3]}`,
          color: designTokens.colors.neutral[400],
          fontSize: sizeStyles.fontSize
        }}>
          {addonAfter}
        </div>
      )}

      {/* 状态消息 */}
      <AnimatePresence>
        {messageText && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            style={{
              marginTop: designTokens.spacing[1],
              fontSize: designTokens.typography.fontSize.xs,
              color: messageType === 'error' ? designTokens.colors.semantic.error :
                     messageType === 'success' ? designTokens.colors.semantic.success :
                     designTokens.colors.neutral[400]
            }}
          >
            {messageText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 全局样式注入 */}
      <style dangerouslySetInnerHTML={{__html: `
        .deepcad-input-wrapper input::placeholder {
          color: ${designTokens.colors.neutral[500]};
          opacity: 1;
        }
        
        .deepcad-input-wrapper input::-webkit-outer-spin-button,
        .deepcad-input-wrapper input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        .deepcad-input-wrapper input[type=number] {
          -moz-appearance: textfield;
        }
        
        .deepcad-input-wrapper input:focus {
          outline: none;
        }
      `}} />
    </div>
  );
});

Input.displayName = 'Input';

// ==================== 预设输入框组件 ====================

export const TextInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>((props, ref) => (
  <Input ref={ref} type="text" {...props} />
));

export const NumberInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>((props, ref) => (
  <Input ref={ref} type="number" {...props} />
));

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>((props, ref) => (
  <Input ref={ref} type="password" {...props} />
));

export const EmailInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>((props, ref) => (
  <Input ref={ref} type="email" {...props} />
));

export const SearchInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>((props, ref) => (
  <Input ref={ref} type="search" {...props} />
));

// CAE专用输入框
export const GeometryInput = forwardRef<HTMLInputElement, Omit<InputProps, 'caeType'>>((props, ref) => (
  <Input ref={ref} caeType="geometry" {...props} />
));

export const MeshInput = forwardRef<HTMLInputElement, Omit<InputProps, 'caeType'>>((props, ref) => (
  <Input ref={ref} caeType="mesh" {...props} />
));

export const ComputationInput = forwardRef<HTMLInputElement, Omit<InputProps, 'caeType'>>((props, ref) => (
  <Input ref={ref} caeType="computation" {...props} />
));

export const ResultsInput = forwardRef<HTMLInputElement, Omit<InputProps, 'caeType'>>((props, ref) => (
  <Input ref={ref} caeType="results" {...props} />
));

// 设置显示名称
TextInput.displayName = 'TextInput';
NumberInput.displayName = 'NumberInput';
PasswordInput.displayName = 'PasswordInput';
EmailInput.displayName = 'EmailInput';
SearchInput.displayName = 'SearchInput';
GeometryInput.displayName = 'GeometryInput';
MeshInput.displayName = 'MeshInput';
ComputationInput.displayName = 'ComputationInput';
ResultsInput.displayName = 'ResultsInput';

export default Input;