/**
 * Mapbox调试测试组件
 * 用于诊断Mapbox无法加载的具体原因
 */

import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export const MapboxDebugTest: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [mapStatus, setMapStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const addDebugInfo = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    addDebugInfo('🔍 开始Mapbox调试测试...');
    
    // 测试1: 检查Mapbox GL JS加载
    addDebugInfo(`📦 Mapbox GL JS版本: ${mapboxgl.version}`);
    addDebugInfo(`🌐 Mapbox GL JS支持: ${mapboxgl.supported() ? '✅ 支持' : '❌ 不支持'}`);

    // 测试不同的访问令牌
    const testTokens = [
      'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M3VycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
      'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
      // Mapbox公共演示token
      'pk.eyJ1IjoiZXhhbXBsZXMiLCJhIjoiY2p1dDB5eGo1MDExZDQ1cGptZnVjczhudiJ9.53RfaZp4-AE5zWz9m0iHFg'
    ];

    let currentTokenIndex = 0;

    const tryNextToken = () => {
      if (currentTokenIndex >= testTokens.length) {
        addDebugInfo('❌ 所有token都失败了');
        setMapStatus('error');
        return;
      }

      const currentToken = testTokens[currentTokenIndex];
      addDebugInfo(`🔑 测试Token ${currentTokenIndex + 1}: ${currentToken.substring(0, 20)}...`);
      
      mapboxgl.accessToken = currentToken;

      try {
        const map = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [116.4, 39.9], // 北京
          zoom: 5
        });

        // 设置超时
        const timeout = setTimeout(() => {
          addDebugInfo(`⏰ Token ${currentTokenIndex + 1} 超时`);
          map.remove();
          currentTokenIndex++;
          tryNextToken();
        }, 10000);

        map.on('load', () => {
          clearTimeout(timeout);
          addDebugInfo(`✅ Token ${currentTokenIndex + 1} 成功！地图已加载`);
          addDebugInfo(`🗺️ 地图样式: ${map.getStyle().name}`);
          addDebugInfo(`📍 地图中心: ${map.getCenter().lng.toFixed(2)}, ${map.getCenter().lat.toFixed(2)}`);
          addDebugInfo(`🔍 地图缩放: ${map.getZoom().toFixed(1)}`);
          setMapStatus('success');

          // 添加一个测试标记
          new mapboxgl.Marker({ color: '#FF0000' })
            .setLngLat([116.4, 39.9])
            .setPopup(new mapboxgl.Popup().setHTML('<h4>北京测试标记</h4><p>Mapbox工作正常！</p>'))
            .addTo(map);

          addDebugInfo('📍 已添加北京测试标记');
        });

        map.on('error', (e) => {
          clearTimeout(timeout);
          addDebugInfo(`❌ Token ${currentTokenIndex + 1} 错误: ${e.error?.message || '未知错误'}`);
          map.remove();
          currentTokenIndex++;
          tryNextToken();
        });

        map.on('idle', () => {
          addDebugInfo('😴 地图进入空闲状态 - 完全加载完成');
        });

      } catch (error) {
        addDebugInfo(`💥 Token ${currentTokenIndex + 1} 异常: ${error instanceof Error ? error.message : '未知异常'}`);
        currentTokenIndex++;
        tryNextToken();
      }
    };

    // 开始测试
    tryNextToken();

  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000011',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 调试信息面板 */}
      <div style={{
        width: '100%',
        height: '300px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: '#00ffff',
        padding: '20px',
        fontFamily: 'monospace',
        fontSize: '12px',
        overflowY: 'auto',
        borderBottom: '2px solid #00ffff'
      }}>
        <h2 style={{ color: '#ffffff', margin: '0 0 15px 0' }}>
          🔍 Mapbox GL JS 调试测试报告
        </h2>
        
        <div style={{ marginBottom: '15px' }}>
          <strong>状态: </strong>
          <span style={{ 
            color: mapStatus === 'loading' ? '#ffaa00' : 
                   mapStatus === 'success' ? '#00ff00' : '#ff4444'
          }}>
            {mapStatus === 'loading' ? '🔄 测试中...' : 
             mapStatus === 'success' ? '✅ 测试成功' : 
             '❌ 测试失败'}
          </span>
        </div>

        <div style={{ 
          background: 'rgba(0, 255, 255, 0.1)', 
          padding: '10px', 
          borderRadius: '5px',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {debugInfo.map((info, index) => (
            <div key={index} style={{ marginBottom: '5px' }}>
              {info}
            </div>
          ))}
        </div>
      </div>

      {/* 地图容器 */}
      <div style={{
        flex: 1,
        position: 'relative'
      }}>
        <div
          ref={mapContainer}
          style={{
            width: '100%',
            height: '100%',
            background: '#001122'
          }}
        />
        
        {mapStatus === 'loading' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#00ffff',
            padding: '20px',
            borderRadius: '10px',
            textAlign: 'center',
            border: '2px solid #00ffff'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔄</div>
            <div>正在测试Mapbox连接...</div>
          </div>
        )}

        {mapStatus === 'error' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 0, 0, 0.1)',
            color: '#ff4444',
            padding: '30px',
            borderRadius: '10px',
            textAlign: 'center',
            border: '2px solid #ff4444',
            maxWidth: '400px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>❌</div>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>Mapbox加载失败</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              可能原因：网络问题、Token无效、防火墙阻止
            </div>
          </div>
        )}
      </div>

      {/* 控制按钮 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 10000
      }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'rgba(0, 255, 255, 0.2)',
            border: '1px solid #00ffff',
            color: '#ffffff',
            padding: '10px 15px',
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          🔄 重新测试
        </button>
        <button
          onClick={() => {
            // 回到主应用
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = '/';
            }
          }}
          style={{
            background: 'rgba(255, 100, 100, 0.8)',
            border: 'none',
            color: '#ffffff',
            padding: '10px 15px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          ✕ 返回
        </button>
      </div>
    </div>
  );
};

export default MapboxDebugTest;