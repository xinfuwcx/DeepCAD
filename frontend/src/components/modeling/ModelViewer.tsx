import React, { useRef, useEffect, useState } from 'react';
import { useModelContext } from '../../context/ModelContext';
import { createChili3dService, IChili3dInstance } from '../../services/chili3dService';
import Toolbar from './Toolbar';
import ParametersPanel from './ParametersPanel';
import ExcavationTools from './ExcavationTools';
import ExcavationParameters from './ExcavationParameters';

// 这里是一个占位的模拟chili3d接口，实际开发中将导入真实的chili3d库
interface Chili3dInstance {
  init: (container: HTMLElement) => void;
  dispose: () => void;
  render: () => void;
  // 后续会添加更多实际的chili3d方法
}

// 模拟导入chili3d库，后续会替换为实际导入
const createChili3d = (): Chili3dInstance => {
  return {
    init: (container: HTMLElement) => {
      console.log('chili3d初始化', container);
      // 模拟初始化逻辑
      const canvas = document.createElement('canvas');
      canvas.className = 'fullsize-canvas';
      container.appendChild(canvas);
      
      // 这里会有实际的three.js初始化代码
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1A1A2E';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制网格线模拟3D网格
        ctx.strokeStyle = '#333366';
        ctx.lineWidth = 0.5;
        
        for (let i = 0; i < canvas.width; i += 20) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, canvas.height);
          ctx.stroke();
        }
        
        for (let j = 0; j < canvas.height; j += 20) {
          ctx.beginPath();
          ctx.moveTo(0, j);
          ctx.lineTo(canvas.width, j);
          ctx.stroke();
        }
        
        // 绘制示例文字
        ctx.fillStyle = '#4A90E2';
        ctx.font = '16px Arial';
        ctx.fillText('chili3d视图模拟 - 这里将显示实际的3D模型', 20, 40);
      }
    },
    dispose: () => {
      console.log('chili3d资源释放');
    },
    render: () => {
      console.log('chili3d渲染帧');
    }
  };
};

const ModelViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chili3dRef = useRef<IChili3dInstance | null>(null);
  const { setIsModelLoaded } = useModelContext();
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [selectedExcavationTool, setSelectedExcavationTool] = useState<string>('');
  const [mode, setMode] = useState<'general' | 'excavation'>('general');
  
  useEffect(() => {
    if (containerRef.current) {
      // 初始化chili3d服务实例
      const initialize = async () => {
        try {
          chili3dRef.current = createChili3dService();
          await chili3dRef.current.initialize(containerRef.current!);
          
          // 添加窗口大小变化的事件处理
          const handleResize = () => {
            if (chili3dRef.current) {
              chili3dRef.current.resize();
            }
          };
          
          window.addEventListener('resize', handleResize);
          
          // 通知模型已加载
          setIsModelLoaded(true);
          
          return () => {
            window.removeEventListener('resize', handleResize);
          };
        } catch (error) {
          console.error('初始化chili3d引擎失败:', error);
        }
      };
      
      initialize();
    }
    
    // 清理函数
    return () => {
      if (chili3dRef.current) {
        chili3dRef.current.dispose();
        chili3dRef.current = null;
      }
    };
  }, [setIsModelLoaded]);
  
  // 处理工具选择
  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
    console.log(`选择了工具: ${toolId}`);
    
    // 在实际开发中，这里会根据选择的工具执行不同的chili3d操作
    if (chili3dRef.current) {
      switch (toolId) {
        case 'box':
          chili3dRef.current.createBox(1, 1, 1);
          break;
        case 'cylinder':
          chili3dRef.current.createCylinder(0.5, 2);
          break;
        case 'select':
          // 设置选择模式
          break;
        default:
          // 其他工具操作
          break;
      }
    }
  };
  
  // 处理专业工具选择
  const handleExcavationToolSelect = (toolId: string) => {
    setSelectedExcavationTool(toolId);
    console.log(`选择了专业工具: ${toolId}`);
    
    // 在实际开发中，这里会根据选择的工具执行不同的专业操作
    // 例如创建土层、支护结构等
  };
  
  // 处理参数变更
  const handleParameterChange = (paramId: string, value: any) => {
    console.log(`参数变更: ${paramId} = ${value}`);
    
    // 在实际开发中，这里会根据参数更新模型
    if (chili3dRef.current) {
      // 例如更新几何尺寸等
    }
  };
  
  // 处理专业参数变更
  const handleExcavationParameterChange = (project: any) => {
    console.log('深基坑参数变更:', project);
    
    // 在实际开发中，这里会根据参数更新深基坑模型
    if (chili3dRef.current) {
      // 更新土层、支护结构等
    }
  };
  
  // 切换模式
  const toggleMode = () => {
    setMode(mode === 'general' ? 'excavation' : 'general');
  };
  
  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* 模式切换按钮 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        display: 'flex',
        gap: '2px',
        background: '#2A2A42',
        padding: '3px',
        borderRadius: '4px'
      }}>
        <button
          style={{
            padding: '5px 15px',
            backgroundColor: mode === 'general' ? '#4A90E2' : 'transparent',
            color: mode === 'general' ? 'white' : '#ccc',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
          onClick={() => setMode('general')}
        >
          基本建模
        </button>
        <button
          style={{
            padding: '5px 15px',
            backgroundColor: mode === 'excavation' ? '#4A90E2' : 'transparent',
            color: mode === 'excavation' ? 'white' : '#ccc',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
          onClick={() => setMode('excavation')}
        >
          深基坑工程
        </button>
      </div>
      
      {/* 根据模式显示不同工具栏和参数面板 */}
      {mode === 'general' ? (
        <>
          {/* 通用工具栏 */}
          <Toolbar 
            onToolSelect={handleToolSelect}
            selectedTool={selectedTool}
          />
          
          {/* 通用参数面板 */}
          <ParametersPanel 
            onParameterChange={handleParameterChange}
          />
        </>
      ) : (
        <>
          {/* 深基坑专业工具栏 */}
          <ExcavationTools 
            onToolSelect={handleExcavationToolSelect}
            selectedTool={selectedExcavationTool}
          />
          
          {/* 深基坑专业参数面板 */}
          <ExcavationParameters 
            onParameterChange={handleExcavationParameterChange}
          />
        </>
      )}
      
      {/* chili3d会将其内容渲染到此div中 */}
    </div>
  );
};

export default ModelViewer; 