import React from 'react';
import MainContainer from './MainContainer';
import PrimaryAppBar from './PrimaryAppBar';
import StatusBar from './StatusBar';

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <MainContainer>
      <div className="h-full flex flex-col">
        {/* App Bar */}
        <PrimaryAppBar />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {children}
        </div>

        {/* Status Bar */}
        <StatusBar />
      </div>
    </MainContainer>
  );
};

export default AppShell;