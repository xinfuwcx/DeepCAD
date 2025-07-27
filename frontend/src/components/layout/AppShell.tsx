import React from 'react';
import { Sidebar } from './Sidebar';

export const AppShell: React.FC = () => {
  return (
    <div className="flex h-screen bg-deepcad-dark text-deepcad-light font-inter">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold font-orbitron text-deepcad-primary">
          Main Content Area
        </h1>
        <p className="mt-4">This is where the main application content will be displayed.</p>
        <p className="mt-2">For example, the 3D viewport, data tables, or charts.</p>
      </main>
    </div>
  );
}; 