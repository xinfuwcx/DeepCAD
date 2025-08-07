/**
 * 3D瓦片控制面板
 * 管理和控制3D瓦片的加载、卸载和显示
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useControlCenterStore } from '../../stores/controlCenterStore';

interface TilesetControlPanelProps {
  visible: boolean;
  onClose: () => void;
}

const TilesetControlPanel: React.FC<TilesetControlPanelProps> = ({ visible, onClose }) => {
  const { 
    activeTilesets, 
    selectedTileset,
    unload3DTileset,
    flyToTileset,
    setSelectedTileset
  } = useControlCenterStore();

  const tilesetArray = Array.from(activeTilesets.entries());

  const handleUnloadTileset = (projectId: string) => {
    unload3DTileset(projectId);
  };

  const handleFlyToTileset = async (projectId: string) => {
    try {
      await flyToTileset(projectId);
    } catch (error) {
      console.error('飞行失败:', error);
    }
  };

  const handleSelectTileset = (projectId: string) => {
    setSelectedTileset(selectedTileset === projectId ? null : projectId);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={{
          position: 'fixed',
          top: '120px',
          right: '20px',
          width: '320px',
          maxHeight: 'calc(100vh - 140px)',
          background: 'rgba(21, 24, 34, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          overflow: 'hidden'
        }}
      >
        {/* 头部 */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(90deg, rgba(114, 46, 209, 0.2), rgba(67, 56, 202, 0.2))'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: 'white', margin: '0 0 4px 0', fontSize: '16px' }}>
                🏗️ 3D模型管理
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0, fontSize: '12px' }}>
                已加载 {tilesetArray.length} 个3D模型
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
          {tilesetArray.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
              <p>暂无加载的3D模型</p>
              <p style={{ fontSize: '12px' }}>
                在项目管理面板中点击"加载3D"按钮来加载模型
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tilesetArray.map(([projectId, tilesetInfo]) => (
                <motion.div
                  key={projectId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: selectedTileset === projectId 
                      ? 'rgba(114, 46, 209, 0.2)' 
                      : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${selectedTileset === projectId 
                      ? 'rgba(114, 46, 209, 0.5)' 
                      : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleSelectTileset(projectId)}
                  whileHover={{ scale: 1.02 }}
                >
                  {/* 模型信息 */}
                  <div style={{ marginBottom: '12px' }}>
                    <h4 style={{ 
                      color: 'white', 
                      margin: '0 0 4px 0', 
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      🏗️ {tilesetInfo.name}
                      {tilesetInfo.loaded && (
                        <span style={{
                          background: 'rgba(82, 196, 26, 0.2)',
                          color: '#52c41a',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px'
                        }}>
                          已加载
                        </span>
                      )}
                    </h4>
                    <p style={{ 
                      color: 'rgba(255, 255, 255, 0.6)', 
                      margin: 0, 
                      fontSize: '11px' 
                    }}>
                      ID: {projectId} | 进度: {tilesetInfo.progress}%
                    </p>
                  </div>

                  {/* 控制按钮 */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <motion.button
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        background: 'rgba(24, 144, 255, 0.2)',
                        border: '1px solid rgba(24, 144, 255, 0.5)',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFlyToTileset(projectId);
                      }}
                    >
                      🚁 飞行到此
                    </motion.button>

                    <motion.button
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(245, 34, 45, 0.2)',
                        border: '1px solid rgba(245, 34, 45, 0.5)',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnloadTileset(projectId);
                      }}
                    >
                      🗑️ 卸载
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* 底部统计信息 */}
        {tilesetArray.length > 0 && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '12px'
            }}>
              <span>总模型数: {tilesetArray.length}</span>
              <span>已选中: {selectedTileset ? '1' : '0'}</span>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default TilesetControlPanel;
