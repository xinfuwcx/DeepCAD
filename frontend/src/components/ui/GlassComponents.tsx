import React from 'react';
import { cn } from '../../utils/cn';

// ===== Base Glass Component =====
interface GlassProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'strong';
  children: React.ReactNode;
}

const Glass: React.FC<GlassProps> = ({ 
  variant = 'default', 
  className, 
  children, 
  ...props 
}) => {
  const variantStyles = {
    default: 'bg-glass backdrop-blur-[10px] border border-glass-border',
    elevated: 'bg-glass backdrop-blur-[16px] border border-glass-border shadow-2xl',
    subtle: 'bg-glass/50 backdrop-blur-[6px] border border-glass-border/50',
    strong: 'bg-glass backdrop-blur-[20px] border-2 border-glass-border'
  };

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-out',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// ===== Glass Card =====
interface GlassCardProps extends GlassProps {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  hover = false,
  padding = 'md',
  className,
  children,
  ...props 
}) => {
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  };

  return (
    <Glass
      className={cn(
        'rounded-xl',
        paddingStyles[padding],
        hover && 'hover:shadow-2xl hover:scale-[1.02] cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </Glass>
  );
};

// ===== Glass Panel =====
interface GlassPanelProps extends GlassProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  header,
  footer,
  collapsible = false,
  collapsed = false,
  onCollapse,
  className,
  children,
  ...props
}) => {
  return (
    <Glass
      className={cn(
        'rounded-lg overflow-hidden',
        className
      )}
      {...props}
    >
      {header && (
        <div className="px-4 py-3 border-b border-glass-border/50 bg-glass/30">
          <div className="flex items-center justify-between">
            <div>{header}</div>
            {collapsible && (
              <button
                onClick={() => onCollapse?.(!collapsed)}
                className="p-1 rounded-md hover:bg-glass/50 transition-colors"
                aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
              >
                <svg
                  className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    collapsed && 'rotate-180'
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      
      {!collapsed && (
        <div className="p-4">
          {children}
        </div>
      )}
      
      {footer && !collapsed && (
        <div className="px-4 py-3 border-t border-glass-border/50 bg-glass/30">
          {footer}
        </div>
      )}
    </Glass>
  );
};

// ===== Glass Button =====
interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-primary-500/20 border-primary-400/50 text-primary-700 hover:bg-primary-500/30',
    secondary: 'bg-secondary-500/20 border-secondary-400/50 text-secondary-700 hover:bg-secondary-500/30',
    ghost: 'bg-glass border-glass-border hover:bg-glass/80',
    danger: 'bg-red-500/20 border-red-400/50 text-red-700 hover:bg-red-500/30'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg',
        'backdrop-blur-md border transition-all duration-200',
        'font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'hover:scale-[1.02] active:scale-[0.98]',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="w-4 h-4 animate-spin"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ) : icon}
      {children}
    </button>
  );
};

// ===== Glass Input =====
interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  error,
  icon,
  className,
  ...props
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted">
            {icon}
          </div>
        )}
        <input
          className={cn(
            'w-full px-4 py-2 rounded-lg',
            'bg-glass backdrop-blur-md border border-glass-border',
            'text-primary placeholder-muted',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50',
            'transition-all duration-200',
            icon && 'pl-10',
            error && 'border-red-500/50 focus:ring-red-500/50',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

// ===== Glass Badge =====
interface GlassBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  variant = 'default',
  size = 'sm',
  className,
  children,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-neutral-500/20 border-neutral-400/50 text-neutral-700',
    success: 'bg-green-500/20 border-green-400/50 text-green-700',
    warning: 'bg-yellow-500/20 border-yellow-400/50 text-yellow-700',
    error: 'bg-red-500/20 border-red-400/50 text-red-700',
    info: 'bg-blue-500/20 border-blue-400/50 text-blue-700'
  };

  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full',
        'backdrop-blur-md border font-medium',
        'transition-all duration-200',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

// ===== Glass Tooltip =====
interface GlassTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const GlassTooltip: React.FC<GlassTooltipProps> = ({
  content,
  children,
  position = 'top'
}) => {
  const [isVisible, setIsVisible] = React.useState(false);

  const positionStyles = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-2 py-1 text-sm',
            'bg-glass backdrop-blur-md border border-glass-border rounded-md',
            'text-primary whitespace-nowrap',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            positionStyles[position]
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};

// ===== Glass Progress =====
interface GlassProgressProps {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const GlassProgress: React.FC<GlassProgressProps> = ({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  className
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  const variantStyles = {
    default: 'bg-primary-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-sm text-secondary">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full rounded-full overflow-hidden',
          'bg-glass backdrop-blur-md border border-glass-border',
          sizeStyles[size]
        )}
      >
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out rounded-full',
            variantStyles[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default Glass;