/**
 * 科技风格Logo组件
 * 1号架构师 - DeepCAD统一Logo系统
 */

import React from 'react';
import { motion } from 'framer-motion';

interface TechLogoProps {
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  showText?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const TechLogo: React.FC<TechLogoProps> = ({
  size = 'medium',
  animated = true,
  showText = true,
  className = '',
  style = {},
  onClick
}) => {
  // 尺寸映射
  const sizeMap = {
    small: { logo: 32, text: 14 },
    medium: { logo: 48, text: 16 },
    large: { logo: 64, text: 20 }
  };

  const logoSize = sizeMap[size].logo;
  const textSize = sizeMap[size].text;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: onClick ? 'pointer' : 'default',
    ...style
  };

  const logoStyle: React.CSSProperties = {
    width: logoSize,
    height: logoSize,
    background: 'linear-gradient(135deg, #00d9ff, #722ed1)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: logoSize * 0.3,
    fontFamily: '"JetBrains Mono", monospace',
    boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)',
    border: '1px solid rgba(0, 217, 255, 0.5)'
  };

  const textStyle: React.CSSProperties = {
    color: '#00d9ff',
    fontSize: textSize,
    fontWeight: 'bold',
    fontFamily: '"Orbitron", sans-serif',
    textShadow: '0 0 10px rgba(0, 217, 255, 0.5)',
    background: 'linear-gradient(135deg, #00d9ff, #ffffff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  };

  const animationProps = animated ? {
    initial: { scale: 0.9, opacity: 0.8 },
    animate: { 
      scale: 1, 
      opacity: 1,
      boxShadow: [
        '0 0 20px rgba(0, 217, 255, 0.3)',
        '0 0 30px rgba(0, 217, 255, 0.5)',
        '0 0 20px rgba(0, 217, 255, 0.3)'
      ]
    },
    transition: { 
      duration: 2,
      repeat: Infinity,
      repeatType: 'reverse' as const
    },
    whileHover: {
      scale: 1.05,
      boxShadow: '0 0 40px rgba(0, 217, 255, 0.6)'
    },
    whileTap: onClick ? { scale: 0.95 } : {}
  } : {};

  return (
    <div 
      className={`tech-logo ${className}`}
      style={containerStyle}
      onClick={onClick}
    >
      <motion.div
        style={logoStyle}
        {...animationProps}
      >
        CAD
      </motion.div>
      
      {showText && (
        <motion.div
          style={textStyle}
          initial={animated ? { opacity: 0, x: -10 } : {}}
          animate={animated ? { opacity: 1, x: 0 } : {}}
          transition={animated ? { delay: 0.2, duration: 0.6 } : {}}
        >
          DeepCAD
        </motion.div>
      )}
    </div>
  );
};

export default TechLogo;