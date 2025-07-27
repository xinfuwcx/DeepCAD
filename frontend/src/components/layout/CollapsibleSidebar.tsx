import React, { useState } from 'react';
import { GlassPanel, GlassButton } from '../ui/GlassComponents';
import { cn } from '../../utils/cn';

interface SidebarProps {
  children: React.ReactNode;
  side: 'left' | 'right';
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  defaultCollapsed?: boolean;
  title?: string;
  className?: string;
}

const CollapsibleSidebar: React.FC<SidebarProps> = ({
  children,
  side,
  defaultWidth = 350,
  minWidth = 200,
  maxWidth = 600,
  defaultCollapsed = false,
  title,
  className
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    
    const startX = e.pageX;
    const startWidth = width;

    const doDrag = (e: MouseEvent) => {
      const newWidth = side === 'left' 
        ? startWidth + (e.pageX - startX)
        : startWidth - (e.pageX - startX);
      
      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      setWidth(clampedWidth);
    };

    const stopDrag = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          "relative h-full transition-all duration-300 ease-out",
          "flex-shrink-0",
          collapsed && "w-0 overflow-hidden",
          className
        )}
        style={{ 
          width: collapsed ? 0 : width,
          minWidth: collapsed ? 0 : minWidth 
        }}
      >
        <GlassPanel
          variant="elevated"
          className="h-full border-r border-glass-border/50"
          header={
            title && (
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary">{title}</h3>
                <GlassButton
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapse}
                  className="p-1"
                  title={collapsed ? '展开面板' : '折叠面板'}
                >
                  <svg
                    className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      side === 'left' && collapsed && "rotate-180",
                      side === 'right' && !collapsed && "rotate-180"
                    )}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={side === 'left' ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
                    />
                  </svg>
                </GlassButton>
              </div>
            )
          }
        >
          <div className="h-full overflow-hidden">
            {children}
          </div>
        </GlassPanel>

        {/* Resize Handle */}
        {!collapsed && (
          <div
            className={cn(
              "absolute top-0 w-1 h-full cursor-col-resize",
              "hover:bg-primary-400/50 transition-colors duration-200",
              "group",
              side === 'left' ? "-right-0.5" : "-left-0.5"
            )}
            onMouseDown={handleMouseDown}
          >
            <div className="w-full h-full relative">
              <div className={cn(
                "absolute inset-y-0 w-px bg-border-primary",
                side === 'left' ? "right-0" : "left-0"
              )} />
              <div className={cn(
                "absolute inset-y-0 w-0.5 bg-primary-400 opacity-0",
                "group-hover:opacity-100 transition-opacity duration-200",
                side === 'left' ? "right-0" : "left-0"
              )} />
            </div>
          </div>
        )}

        {/* Resize Overlay */}
        {isResizing && (
          <div className="fixed inset-0 cursor-col-resize z-50" />
        )}
      </div>

      {/* Collapsed Toggle Button */}
      {collapsed && (
        <div className={cn(
          "absolute top-1/2 transform -translate-y-1/2 z-20",
          side === 'left' ? "left-2" : "right-2"
        )}>
          <GlassButton
            variant="primary"
            size="sm"
            onClick={toggleCollapse}
            className="p-2 shadow-lg animate-pulse"
            title={`展开${title || '面板'}`}
          >
            <svg
              className={cn(
                "w-4 h-4",
                side === 'right' && "rotate-180"
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </GlassButton>
        </div>
      )}
    </>
  );
};

export default CollapsibleSidebar;