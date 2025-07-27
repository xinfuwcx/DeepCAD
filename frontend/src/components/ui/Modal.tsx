/**
 * DeepCAD Modal组件
 * 1号架构师 - 专业CAE平台模态框系统
 */

import React, { forwardRef, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { designTokens } from '../../design/tokens';

// ==================== 类型定义 ====================

export interface ModalProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  
  // 显示控制
  open: boolean;
  onClose?: () => void;
  
  // 模态框变体
  variant?: 'default' | 'glass' | 'premium' | 'fullscreen' | 'drawer' | 'popup';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  
  // 视觉效果
  blur?: boolean;           // 背景模糊
  glowing?: boolean;        // 发光边框
  animated?: boolean;       // 动画效果
  
  // CAE专用属性
  caeType?: 'analysis' | 'settings' | 'results' | 'export' | 'import' | 'wizard';
  title?: string;           // 标题
  description?: string;     // 描述
  
  // 交互属性
  closable?: boolean;       // 是否可关闭
  maskClosable?: boolean;   // 点击遮罩关闭
  keyboard?: boolean;       // ESC键关闭
  
  // 布局属性
  centered?: boolean;       // 垂直居中
  
  // 事件处理
  onAfterOpen?: () => void;
  onAfterClose?: () => void;
  
  // 可访问性
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

// ==================== 样式配置 ====================

const getVariantStyles = (variant: ModalProps['variant'] = 'default') => {
  const styles = {
    default: {
      background: designTokens.colors.background.secondary,
      border: `1px solid ${designTokens.colors.neutral[700]}`,
      boxShadow: designTokens.shadows['2xl'],
      borderRadius: designTokens.borderRadius.xl,
    },
    
    glass: {
      background: designTokens.colors.background.glass,
      border: `1px solid ${designTokens.colors.neutral[800]}`,
      boxShadow: `${designTokens.shadows.xl}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
      borderRadius: designTokens.borderRadius.xl,
      backdropFilter: 'blur(20px)',
    },
    
    premium: {
      background: `linear-gradient(135deg, ${designTokens.colors.background.glass}, ${designTokens.colors.background.tertiary})`,
      border: `1px solid transparent`,
      boxShadow: `${designTokens.shadows['2xl']}, 0 0 0 1px ${designTokens.colors.primary[500]}40`,
      borderRadius: designTokens.borderRadius['2xl'],
      backdropFilter: 'blur(20px)',
    },
    
    fullscreen: {
      background: designTokens.colors.background.primary,
      border: 'none',
      boxShadow: 'none',
      borderRadius: 0,
    },
    
    drawer: {
      background: designTokens.colors.background.secondary,
      border: `1px solid ${designTokens.colors.neutral[700]}`,
      boxShadow: designTokens.shadows.xl,
      borderRadius: 0,
    },
    
    popup: {
      background: designTokens.colors.background.tertiary,
      border: `1px solid ${designTokens.colors.neutral[600]}`,
      boxShadow: designTokens.shadows.lg,
      borderRadius: designTokens.borderRadius.lg,
    }
  };
  
  return styles[variant];
};

const getSizeStyles = (size: ModalProps['size'] = 'md') => {
  const styles = {
    xs: {
      width: '320px',
      maxWidth: '90vw',
      minHeight: '200px',
      maxHeight: '80vh',
    },
    sm: {
      width: '480px',
      maxWidth: '90vw',
      minHeight: '300px',
      maxHeight: '80vh',
    },
    md: {
      width: '640px',
      maxWidth: '90vw',
      minHeight: '400px',
      maxHeight: '80vh',
    },
    lg: {
      width: '800px',
      maxWidth: '90vw',
      minHeight: '500px',
      maxHeight: '85vh',
    },
    xl: {
      width: '1024px',
      maxWidth: '95vw',
      minHeight: '600px',
      maxHeight: '90vh',
    },
    full: {
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
    }
  };
  
  return styles[size];
};

const getCAEStyles = (caeType: ModalProps['caeType']) => {
  if (!caeType) return {};
  
  const caeColors = {
    analysis: designTokens.colors.semantic.computing,
    settings: designTokens.colors.semantic.geometry,
    results: designTokens.colors.semantic.safety,
    export: designTokens.colors.secondary[500],
    import: designTokens.colors.accent[500],
    wizard: designTokens.colors.primary[500]
  };
  
  const color = caeColors[caeType];
  return {
    borderTop: `4px solid ${color}`,
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      right: 0,
      height: '4px',
      background: `linear-gradient(90deg, ${color}, ${color}60)`,
      filter: `drop-shadow(0 0 4px ${color}40)`
    }
  };
};

// ==================== 模态框头部组件 ====================

const ModalHeader: React.FC<{
  title?: string;
  description?: string;
  caeType?: ModalProps['caeType'];
  closable?: boolean;
  onClose?: () => void;
}> = ({ title, description, caeType, closable, onClose }) => {
  if (!title && !description) return null;

  const caeIcons = {
    analysis: '⚡',
    settings: '⚙️',
    results: '📊',
    export: '📤',
    import: '📥',
    wizard: '🪄'
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: designTokens.spacing[6],
      paddingBottom: designTokens.spacing[4],
      borderBottom: `1px solid ${designTokens.colors.neutral[800]}`
    }}>
      <div style={{ flex: 1 }}>
        {title && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: designTokens.spacing[3],
            marginBottom: description ? designTokens.spacing[2] : 0
          }}>
            {caeType && (
              <span style={{ fontSize: designTokens.typography.fontSize.xl }}>
                {caeIcons[caeType]}
              </span>
            )}
            <h2 style={{
              color: designTokens.colors.neutral[100],
              fontSize: designTokens.typography.fontSize['2xl'],
              fontWeight: designTokens.typography.fontWeight.bold,
              margin: 0
            }}>
              {title}
            </h2>
          </div>
        )}
        
        {description && (
          <p style={{
            color: designTokens.colors.neutral[400],
            fontSize: designTokens.typography.fontSize.base,
            lineHeight: designTokens.typography.lineHeight.relaxed,
            margin: 0
          }}>
            {description}
          </p>
        )}
      </div>

      {closable && (
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: designTokens.colors.neutral[400],
            cursor: 'pointer',
            fontSize: '24px',
            padding: designTokens.spacing[2],
            borderRadius: designTokens.borderRadius.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            marginLeft: designTokens.spacing[4]
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = designTokens.colors.background.tertiary;
            e.currentTarget.style.color = designTokens.colors.neutral[200];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = designTokens.colors.neutral[400];
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

// ==================== 主模态框组件 ====================

export const Modal = forwardRef<HTMLDivElement, ModalProps>(({
  children,
  className = '',
  style,
  open,
  onClose,
  variant = 'default',
  size = 'md',
  blur = true,
  glowing = false,
  animated = true,
  caeType,
  title,
  description,
  closable = true,
  maskClosable = true,
  keyboard = true,
  centered = true,
  onAfterOpen,
  onAfterClose,
  ...htmlProps
}, ref) => {
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // 样式计算
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);
  const caeStyles = getCAEStyles(caeType);

  // 处理打开关闭
  useEffect(() => {
    if (open) {
      setIsVisible(true);
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      onAfterOpen?.();
      
      // 焦点管理
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
      if (previousActiveElement.current) {
        (previousActiveElement.current as HTMLElement).focus?.();
      }
      onAfterClose?.();
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open, onAfterOpen, onAfterClose]);

  // 键盘事件处理
  useEffect(() => {
    if (!open || !keyboard) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, keyboard, onClose]);

  // 点击遮罩关闭
  const handleMaskClick = (event: React.MouseEvent) => {
    if (maskClosable && event.target === event.currentTarget) {
      onClose?.();
    }
  };

  // 动画变体
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeOut' }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2, ease: 'easeIn' }
    }
  };

  const modalVariants = {
    hidden: animated ? {
      opacity: 0,
      scale: 0.9,
      y: 50
    } : { opacity: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1]
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2,
        ease: 'easeIn'
      }
    }
  };

  const drawerVariants = {
    hidden: { x: '100%', opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeOut' }
    },
    exit: { 
      x: '100%', 
      opacity: 0,
      transition: { duration: 0.2, ease: 'easeIn' }
    }
  };

  const currentVariants = variant === 'drawer' ? drawerVariants : modalVariants;

  if (!open && !isVisible) return null;

  const modalContent = (
    <AnimatePresence
      onExitComplete={() => setIsVisible(false)}
    >
      {open && (
        <motion.div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: centered ? 'center' : 'flex-start',
            justifyContent: variant === 'drawer' ? 'flex-end' : 'center',
            padding: variant === 'fullscreen' || size === 'full' ? 0 : designTokens.spacing[4],
            background: blur ? 
              'rgba(0, 0, 0, 0.8)' : 
              'rgba(0, 0, 0, 0.5)',
            backdropFilter: blur ? 'blur(8px)' : 'none'
          }}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleMaskClick}
        >
          <motion.div
            ref={ref || modalRef}
            className={`deepcad-modal ${className}`}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              outline: 'none',
              
              // 基础样式
              ...sizeStyles,
              background: variantStyles.background,
              border: variantStyles.border,
              boxShadow: variantStyles.boxShadow,
              borderRadius: variantStyles.borderRadius,
              backdropFilter: variantStyles.backdropFilter,
              
              // 特殊效果
              ...(glowing && {
                filter: `drop-shadow(0 0 12px ${designTokens.colors.primary[500]}40)`
              }),
              
              // CAE样式
              ...caeStyles,
              
              // 变体特殊处理
              ...(variant === 'drawer' && {
                height: '100vh',
                borderRadius: 0,
                maxHeight: '100vh'
              }),
              
              ...style
            }}
            variants={currentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            {...htmlProps}
          >
            {/* 内容容器 */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: designTokens.spacing[6],
              overflow: 'hidden'
            }}>
              {/* 头部 */}
              <ModalHeader
                title={title}
                description={description}
                caeType={caeType}
                closable={closable}
                onClose={onClose}
              />
              
              {/* 内容区域 */}
              <div style={{
                flex: 1,
                overflow: 'auto',
                marginRight: `-${designTokens.spacing[2]}`,
                paddingRight: designTokens.spacing[2]
              }}>
                {children}
              </div>
            </div>

            {/* 发光效果 */}
            {glowing && (
              <div
                style={{
                  position: 'absolute',
                  inset: -2,
                  background: `linear-gradient(45deg, ${designTokens.colors.primary[500]}40, transparent, ${designTokens.colors.accent[500]}40)`,
                  borderRadius: 'inherit',
                  filter: 'blur(4px)',
                  zIndex: -1,
                  animation: 'modalGlow 3s ease-in-out infinite'
                }}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // 使用 Portal 渲染到 body
  return createPortal(
    <>
      {modalContent}
      
      {/* 全局样式注入 */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes modalGlow {
          0%, 100% { 
            opacity: 0.3;
            transform: scale(1);
          }
          50% { 
            opacity: 0.6;
            transform: scale(1.02);
          }
        }
        
        .deepcad-modal:focus-visible {
          outline: 2px solid ${designTokens.colors.primary[500]};
          outline-offset: 2px;
        }
        
        /* 滚动条样式 */
        .deepcad-modal *::-webkit-scrollbar {
          width: 6px;
        }
        
        .deepcad-modal *::-webkit-scrollbar-track {
          background: ${designTokens.colors.neutral[800]};
          border-radius: 3px;
        }
        
        .deepcad-modal *::-webkit-scrollbar-thumb {
          background: ${designTokens.colors.neutral[600]};
          border-radius: 3px;
        }
        
        .deepcad-modal *::-webkit-scrollbar-thumb:hover {
          background: ${designTokens.colors.neutral[500]};
        }
      `}} />
    </>,
    document.body
  );
});

Modal.displayName = 'Modal';

// ==================== 预设模态框组件 ====================

export const GlassModal = forwardRef<HTMLDivElement, Omit<ModalProps, 'variant'>>((props, ref) => (
  <Modal ref={ref} variant="glass" {...props} />
));

export const PremiumModal = forwardRef<HTMLDivElement, Omit<ModalProps, 'variant'>>((props, ref) => (
  <Modal ref={ref} variant="premium" {...props} />
));

export const DrawerModal = forwardRef<HTMLDivElement, Omit<ModalProps, 'variant'>>((props, ref) => (
  <Modal ref={ref} variant="drawer" {...props} />
));

export const FullscreenModal = forwardRef<HTMLDivElement, Omit<ModalProps, 'variant'>>((props, ref) => (
  <Modal ref={ref} variant="fullscreen" {...props} />
));

// CAE专用模态框
export const AnalysisModal = forwardRef<HTMLDivElement, Omit<ModalProps, 'caeType'>>((props, ref) => (
  <Modal ref={ref} caeType="analysis" {...props} />
));

export const SettingsModal = forwardRef<HTMLDivElement, Omit<ModalProps, 'caeType'>>((props, ref) => (
  <Modal ref={ref} caeType="settings" {...props} />
));

export const ResultsModal = forwardRef<HTMLDivElement, Omit<ModalProps, 'caeType'>>((props, ref) => (
  <Modal ref={ref} caeType="results" {...props} />
));

export const WizardModal = forwardRef<HTMLDivElement, Omit<ModalProps, 'caeType'>>((props, ref) => (
  <Modal ref={ref} caeType="wizard" {...props} />
));

// 显示名称
GlassModal.displayName = 'GlassModal';
PremiumModal.displayName = 'PremiumModal';
DrawerModal.displayName = 'DrawerModal';
FullscreenModal.displayName = 'FullscreenModal';
AnalysisModal.displayName = 'AnalysisModal';
SettingsModal.displayName = 'SettingsModal';
ResultsModal.displayName = 'ResultsModal';
WizardModal.displayName = 'WizardModal';

export default Modal;