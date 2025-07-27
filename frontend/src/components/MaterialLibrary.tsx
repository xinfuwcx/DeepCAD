/**
 * 材料库组件 - 重定向到新的MaterialLibraryView
 * 保持向后兼容性
 */
import React from 'react';
import MaterialLibraryView from './materials/MaterialLibraryView';

interface MaterialLibraryProps {
  visible: boolean;
  onClose: () => void;
}

const MaterialLibrary: React.FC<MaterialLibraryProps> = ({ visible, onClose }) => {
  if (!visible) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      backgroundColor: 'rgba(0, 0, 0, 0.9)'
    }}>
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 1001
      }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '6px',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ✕ 关闭
        </button>
      </div>
      <MaterialLibraryView />
    </div>
  );
};

export default MaterialLibrary;