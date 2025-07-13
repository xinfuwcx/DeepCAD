import React from 'react';
import DXFImportManager from '../components/dxf-import/DXFImportManager';

const DXFImportView: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <DXFImportManager />
    </div>
  );
};

export default DXFImportView;