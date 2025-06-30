import React from 'react';
import { Box, Card, CardContent, Typography, styled } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { defaultTokens } from '../../styles/tokens/defaultTokens';

interface GlassmorphismCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  intensity?: 'low' | 'medium' | 'high';
  blur?: number;
  glow?: boolean;
  hover?: boolean;
  width?: string | number;
  height?: string | number;
  className?: string;
}

const StyledGlassCard = styled(Card)<{ 
  intensity: string; 
  blur: number; 
  glow: boolean; 
  hover: boolean 
}>(({ theme, intensity, blur, glow, hover }) => {
  const baseOpacity = {
    low: 0.05,
    medium: 0.08,
    high: 0.12
  }[intensity];

  const glowColor = glow ? defaultTokens.colors.quantum.glow : 'transparent';
  
  return {
    background: `linear-gradient(135deg, 
      ${alpha(defaultTokens.colors.quantum.primary, baseOpacity)}, 
      ${alpha(defaultTokens.colors.quantum.secondary, baseOpacity * 0.7)})`,
    backdropFilter: `blur(${blur}px) saturate(180%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(180%)`,
    border: `1px solid ${alpha(defaultTokens.colors.glass.border, 0.2)}`,
    borderRadius: defaultTokens.borderRadius.glass,
    boxShadow: [
      `0 8px 32px ${alpha(defaultTokens.colors.quantum.primary, 0.1)}`,
      glow ? `0 0 24px ${alpha(glowColor, 0.3)}` : 'none',
      `inset 0 1px 1px ${alpha('#ffffff', 0.1)}`
    ].filter(shadow => shadow !== 'none').join(', '),
    position: 'relative',
    overflow: 'hidden',
    transition: defaultTokens.animations.quantum.transition,
    
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '1px',
      background: `linear-gradient(90deg, 
        transparent, 
        ${alpha(defaultTokens.colors.glass.highlight, 0.5)}, 
        transparent)`,
      zIndex: 1
    },

    ...(hover && {
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-4px) scale(1.02)',
        boxShadow: [
          `0 16px 48px ${alpha(defaultTokens.colors.quantum.primary, 0.15)}`,
          glow ? `0 0 32px ${alpha(glowColor, 0.4)}` : 'none',
          `inset 0 1px 1px ${alpha('#ffffff', 0.15)}`
        ].filter(shadow => shadow !== 'none').join(', '),
        border: `1px solid ${alpha(defaultTokens.colors.glass.border, 0.3)}`
      }
    })
  };
});

const StyledCardContent = styled(CardContent)({
  position: 'relative',
  zIndex: 2,
  padding: defaultTokens.spacing.quantum.md,
  '&:last-child': {
    paddingBottom: defaultTokens.spacing.quantum.md
  }
});

const GlassmorphismCard: React.FC<GlassmorphismCardProps> = ({
  children,
  title,
  subtitle,
  intensity = 'medium',
  blur = 20,
  glow = false,
  hover = false,
  width,
  height,
  className
}) => {
  return (
    <StyledGlassCard 
      intensity={intensity}
      blur={blur}
      glow={glow}
      hover={hover}
      className={className}
      sx={{ width, height }}
    >
      <StyledCardContent>
        {title && (
          <Typography 
            variant="h6" 
            sx={{ 
              color: defaultTokens.colors.glass.text,
              fontWeight: 600,
              letterSpacing: '0.5px',
              marginBottom: subtitle ? 1 : 2
            }}
          >
            {title}
          </Typography>
        )}
        {subtitle && (
          <Typography 
            variant="body2" 
            sx={{ 
              color: alpha(defaultTokens.colors.glass.text, 0.7),
              marginBottom: 2
            }}
          >
            {subtitle}
          </Typography>
        )}
        <Box>{children}</Box>
      </StyledCardContent>
    </StyledGlassCard>
  );
};

export default GlassmorphismCard;
