import React from 'react';
import { CubeIcon, DocumentDuplicateIcon, CogIcon, VariableIcon } from '@heroicons/react/24/outline';

const NavItem = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <button className="flex flex-col items-center justify-center w-full p-3 text-deepcad-light/70 hover:bg-deepcad-primary/20 hover:text-deepcad-primary rounded-lg transition-colors">
    <Icon className="h-6 w-6 mb-1" />
    <span className="text-xs font-medium">{label}</span>
  </button>
);

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-24 h-full p-4 flex flex-col items-center glassmorphism rounded-r-2xl border-l-0">
      {/* Logo */}
      <div className="w-12 h-12 mb-10 bg-gradient-to-br from-deepcad-primary to-deepcad-accent rounded-full flex items-center justify-center">
        <span className="font-orbitron font-bold text-2xl text-deepcad-dark">D</span>
      </div>
      
      {/* Navigation */}
      <nav className="flex flex-col items-center space-y-4 w-full">
        <NavItem icon={CubeIcon} label="几何" />
        <NavItem icon={DocumentDuplicateIcon} label="网格" />
        <NavItem icon={VariableIcon} label="分析" />
        <NavItem icon={CogIcon} label="设置" />
      </nav>
      
      {/* Footer / User Profile */}
      <div className="mt-auto">
        <img
          className="w-10 h-10 rounded-full border-2 border-deepcad-primary/50"
          src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
          alt="User"
        />
      </div>
    </aside>
  );
}; 