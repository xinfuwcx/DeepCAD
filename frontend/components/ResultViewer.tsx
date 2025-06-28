import React, { useEffect, useRef, useState } from 'react';

interface ResultViewerProps {
  analysisId?: string;
  serverUrl?: string;
  autoConnect?: boolean;
  showControls?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 分析结果查看器组件
 * 使用Trame作为显示平台，显示网格和云图
 */
const ResultViewer: React.FC<ResultViewerProps> = ({
  analysisId,
  serverUrl = '/api/visualization',
  autoConnect = true,
  showControls = true,
  className = '',
  style = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const resultVisualizerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化结果可视化器
  useEffect(() => {
    if (!containerRef.current) return;

    // 动态导入结果可视化器脚本
    const script = document.createElement('script');
    script.src = '/js/result_visualizer.js';
    script.async = true;
    
    script.onload = () => {
      if (!containerRef.current) return;
      
      // 创建结果可视化器实例
      if (window.ResultVisualizer) {
        try {
          resultVisualizerRef.current = new window.ResultVisualizer(containerRef.current, {
            serverUrl,
            autoConnect,
            showControls
          });
          
          // 如果提供了分析ID，加载结果
          if (analysisId) {
            loadAnalysisResult(analysisId);
          } else {
            setIsLoading(false);
          }
        } catch (err) {
          console.error('创建结果可视化器失败:', err);
          setError('创建结果可视化器失败');
          setIsLoading(false);
        }
      } else {
        console.error('ResultVisualizer类未找到');
        setError('ResultVisualizer类未找到');
        setIsLoading(false);
      }
    };
    
    script.onerror = () => {
      console.error('加载结果可视化器脚本失败');
      setError('加载结果可视化器脚本失败');
      setIsLoading(false);
    };
    
    document.body.appendChild(script);
    
    // 清理函数
    return () => {
      if (resultVisualizerRef.current) {
        resultVisualizerRef.current.destroy();
        resultVisualizerRef.current = null;
      }
      document.body.removeChild(script);
    };
  }, [serverUrl, autoConnect, showControls]);

  // 当分析ID变更时，加载新的结果
  useEffect(() => {
    if (analysisId && resultVisualizerRef.current) {
      loadAnalysisResult(analysisId);
    }
  }, [analysisId]);

  // 加载分析结果
  const loadAnalysisResult = async (id: string) => {
    if (!resultVisualizerRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await resultVisualizerRef.current.loadAnalysisResult(id);
      setIsLoading(false);
    } catch (err) {
      console.error('加载分析结果失败:', err);
      setError('加载分析结果失败');
      setIsLoading(false);
    }
  };

  // 截图
  const takeScreenshot = async (): Promise<string> => {
    if (!resultVisualizerRef.current) {
      throw new Error('结果可视化器未初始化');
    }
    
    try {
      return await resultVisualizerRef.current.takeScreenshot();
    } catch (err) {
      console.error('截图失败:', err);
      throw new Error('截图失败');
    }
  };

  // 导出视图
  const exportView = async (format: string = 'png'): Promise<Blob> => {
    if (!resultVisualizerRef.current) {
      throw new Error('结果可视化器未初始化');
    }
    
    try {
      return await resultVisualizerRef.current.exportView(format);
    } catch (err) {
      console.error('导出视图失败:', err);
      throw new Error('导出视图失败');
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`result-viewer-container ${className}`}
      style={{ width: '100%', height: '100%', position: 'relative', ...style }}
    >
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div className="loading-text">加载中...</div>
        </div>
      )}
      {error && (
        <div className="error-overlay">
          <div className="error-icon">!</div>
          <div className="error-text">{error}</div>
        </div>
      )}
    </div>
  );
};

// 为TypeScript添加全局声明
declare global {
  interface Window {
    ResultVisualizer: any;
  }
}

export default ResultViewer; 