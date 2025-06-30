import React from 'react';
import { Box, Card, CardContent, CardProps, styled } from '@mui/material';
import { quantumTokens } from '../../styles/tokens/quantumTokens';

/**
 * 玻璃态卡片组件
 * 实现未来科技风的玻璃态效果
 */

// 自定义样式的Card组件
const GlassCard = styled(Card)(({ theme }) => ({
  backgroundColor: quantumTokens.components.glassCard.background,
  backdropFilter: quantumTokens.components.glassCard.backdropFilter,
  border: quantumTokens.components.glassCard.border,
  boxShadow: quantumTokens.components.glassCard.boxShadow,
  transition: quantumTokens.animation.transitions.normal,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)',
  },
  '&:hover': {
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    transform: 'translateY(-2px)',
  },
}));

// 边缘发光效果
const GlowBorder = styled(Box)(({ color = quantumTokens.colors.quantumBrightEnd }) => ({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  borderRadius: 'inherit',
  opacity: 0,
  transition: quantumTokens.animation.transitions.normal,
  boxShadow: `0 0 15px ${color}`,
  '.MuiCard-root:hover &': {
    opacity: 0.5,
  },
}));

export interface GlassmorphismCardProps extends CardProps {
  glowColor?: string;
  glowOnHover?: boolean;
  blurStrength?: 'low' | 'medium' | 'high';
  children: React.ReactNode;
}

export const GlassmorphismCard: React.FC<GlassmorphismCardProps> = ({
  children,
  glowColor,
  glowOnHover = true,
  blurStrength = 'medium',
  ...cardProps
}) => {
  // 根据模糊强度设置不同的模糊值
  const getBlurFilter = () => {
    switch (blurStrength) {
      case 'low':
        return 'blur(5px)';
      case 'high':
        return 'blur(20px)';
      case 'medium':
      default:
        return 'blur(10px)';
    }
  };

  return (
    <GlassCard
      {...cardProps}
      sx={{
        backdropFilter: getBlurFilter(),
        ...cardProps.sx,
      }}
    >
      {glowOnHover && <GlowBorder color={glowColor} />}
      <CardContent>{children}</CardContent>
    </GlassCard>
  );
};

export default GlassmorphismCard; 