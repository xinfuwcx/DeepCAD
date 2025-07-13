import React from 'react';
import { GlassCard } from '../ui/GlassComponents';
import { cn } from '../../utils/cn';

interface MainContentProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

const MainContent: React.FC<MainContentProps> = ({ 
  children, 
  className,
  padding = true 
}) => {
  return (
    <div className={cn(
      "flex-1 h-full overflow-hidden",
      className
    )}>
      <GlassCard
        variant="subtle"
        className={cn(
          "h-full",
          "border border-glass-border/30",
          "backdrop-blur-sm bg-glass/20",
          "rounded-lg",
          "overflow-hidden"
        )}
        padding={padding ? "md" : "none"}
      >
        <div className="h-full overflow-auto">
          {children}
        </div>
      </GlassCard>
    </div>
  );
};

export default MainContent;