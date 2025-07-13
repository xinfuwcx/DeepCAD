import React from 'react';
import { cn } from '../../utils/cn';

interface MainContainerProps {
  children: React.ReactNode;
  className?: string;
}

const MainContainer: React.FC<MainContainerProps> = ({ children, className }) => {
  return (
    <div 
      className={cn(
        "h-screen w-screen overflow-hidden",
        "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50",
        "dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900",
        "relative",
        className
      )}
      style={{
        background: `
          radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(120, 200, 255, 0.3) 0%, transparent 50%),
          linear-gradient(135deg, var(--bg-primary) 0%, var(--color-primary-50) 100%)
        `
      }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern
              id="engineeringGrid"
              x="0"
              y="0"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke="var(--border-primary)"
                strokeWidth="0.5"
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#engineeringGrid)"
          />
        </svg>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary-400 rounded-full opacity-20 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
};

export default MainContainer;