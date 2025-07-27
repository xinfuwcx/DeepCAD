import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GlassCard, GlassButton } from '../ui/GlassComponents';
import ThemeToggle from '../ui/ThemeToggle';
import { cn } from '../../utils/cn';

interface AppBarProps {
  className?: string;
}

const PrimaryAppBar: React.FC<AppBarProps> = ({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { path: '/dashboard', label: '仪表板', icon: '📊' },
    { path: '/geometry', label: '几何建模', icon: '🔧' },
    { path: '/dxf-import', label: 'DXF导入', icon: '📐' },
    { path: '/meshing', label: '网格划分', icon: '🕸️' },
    { path: '/analysis', label: '数值分析', icon: '🧮' },
    { path: '/results', label: '后处理', icon: '📈' },
    { path: '/materials', label: '材料库', icon: '🏗️' }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <GlassCard
      variant="elevated"
      className={cn(
        "h-16 px-6 flex items-center justify-between",
        "border-b border-glass-border/50",
        "backdrop-blur-xl bg-glass/50",
        className
      )}
      padding="none"
    >
      {/* Logo and Brand */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">DC</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gradient">DeepCAD</h1>
            <p className="text-xs text-secondary leading-none">深基坑CAE分析平台</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-2">
        {navigationItems.map((item) => (
          <GlassButton
            key={item.path}
            variant={isActive(item.path) ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => navigate(item.path)}
            className={cn(
              "gap-2 px-3 py-2 text-sm font-medium transition-all duration-200",
              isActive(item.path) && "shadow-lg"
            )}
          >
            <span>{item.icon}</span>
            <span className="hidden md:inline">{item.label}</span>
          </GlassButton>
        ))}
      </nav>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <GlassButton
          variant="ghost"
          size="sm"
          className="gap-2"
          title="搜索"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="hidden lg:inline text-sm">搜索</span>
        </GlassButton>

        {/* Notifications */}
        <GlassButton
          variant="ghost"
          size="sm"
          className="relative"
          title="通知"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5v10M4 15.5h.01M4 8.5h.01M4 11.5h.01M4 19.5h.01" />
          </svg>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-[10px] text-white font-medium">3</span>
          </div>
        </GlassButton>

        {/* Help */}
        <GlassButton
          variant="ghost"
          size="sm"
          onClick={() => navigate('/help')}
          title="帮助"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </GlassButton>

        {/* Theme Toggle */}
        <ThemeToggle variant="icon" />

        {/* User Menu */}
        <GlassButton
          variant="ghost"
          size="sm"
          className="gap-2"
          title="用户菜单"
        >
          <div className="w-6 h-6 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-medium">U</span>
          </div>
          <span className="hidden lg:inline text-sm">用户</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </GlassButton>
      </div>
    </GlassCard>
  );
};

export default PrimaryAppBar;