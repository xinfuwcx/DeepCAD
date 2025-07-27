import React from 'react';
import { useTheme, type Theme } from '../../hooks/useTheme';
import { GlassButton } from './GlassComponents';
import { cn } from '../../utils/cn';

interface ThemeToggleProps {
  className?: string;
  variant?: 'icon' | 'full' | 'dropdown';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className, 
  variant = 'icon' 
}) => {
  const { theme, setTheme, resolvedTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  // Icon components
  const SunIcon = () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );

  const MoonIcon = () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );

  const SystemIcon = () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );

  const getThemeIcon = (themeType: Theme) => {
    switch (themeType) {
      case 'light':
        return <SunIcon />;
      case 'dark':
        return <MoonIcon />;
      case 'system':
        return <SystemIcon />;
    }
  };

  const getThemeLabel = (themeType: Theme) => {
    switch (themeType) {
      case 'light':
        return '浅色主题';
      case 'dark':
        return '深色主题';
      case 'system':
        return '跟随系统';
    }
  };

  if (variant === 'icon') {
    return (
      <GlassButton
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className={cn('relative', className)}
        title={`当前: ${getThemeLabel(theme)}`}
      >
        <div className="relative">
          {getThemeIcon(resolvedTheme)}
        </div>
      </GlassButton>
    );
  }

  if (variant === 'full') {
    return (
      <GlassButton
        variant="ghost"
        size="md"
        onClick={toggleTheme}
        className={cn('gap-2', className)}
      >
        {getThemeIcon(resolvedTheme)}
        <span className="text-sm">{getThemeLabel(theme)}</span>
      </GlassButton>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <GlassButton
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={cn('gap-2', className)}
        >
          {getThemeIcon(resolvedTheme)}
          <span className="text-sm">{getThemeLabel(theme)}</span>
          <svg
            className={cn(
              'w-3 h-3 transition-transform duration-200',
              isOpen && 'rotate-180'
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
        </GlassButton>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-2 z-20 w-48 py-2 bg-glass backdrop-blur-md border border-glass-border rounded-lg shadow-xl">
              {(['light', 'dark', 'system'] as Theme[]).map((themeOption) => (
                <button
                  key={themeOption}
                  onClick={() => {
                    setTheme(themeOption);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full px-4 py-2 text-left text-sm',
                    'flex items-center gap-3',
                    'hover:bg-glass/50 transition-colors',
                    theme === themeOption && 'bg-glass/30 text-primary-600'
                  )}
                >
                  {getThemeIcon(themeOption)}
                  <span>{getThemeLabel(themeOption)}</span>
                  {theme === themeOption && (
                    <svg
                      className="w-4 h-4 ml-auto text-primary-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
};

export default ThemeToggle;