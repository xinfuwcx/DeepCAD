/**
 * PyVista结果查看器
 * 0号架构师 - 基于3号专家PyVista接口规范
 * 集成PyVista计算结果的Three.js显示组件
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { FunctionalIcons } from './icons/FunctionalIconsQuickFix';
import PyVistaRealtimeRenderer, { PyVistaVisualizationState, PyVistaRenderingConfig } from '../services/PyVistaRealtimeRenderer';
import { getPyVistaIntegrationService } from '../services/PyVistaIntegrationService';

interface PyVistaResultsViewerProps {
  meshData?: any;
  computationData?: any;
  onVisualizationUpdate?: (state: PyVistaVisualizationState) => void;
  workspaceWidth?: number;
  workspaceHeight?: number;
}

const PyVistaResultsViewer: React.FC<PyVistaResultsViewerProps> = ({
  meshData,
  computationData,
  onVisualizationUpdate,
  workspaceWidth = 1200,
  workspaceHeight = 800
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const pyvistaRendererRef = useRef<PyVistaRealtimeRenderer>();

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [visualizationState, setVisualizationState] = useState<PyVistaVisualizationState>({
    currentDataset: null,
    activeScalarField: null,
    activeVectorField: null,
    displayMode: 'stress',
    isAnimating: false,
    currentStage: 0
  });

  const [renderingConfig, setRenderingConfig] = useState<PyVistaRenderingConfig>({
    autoUpdate: true,
    maxUpdateRate: 30,
    showVectors: false,
    vectorSampleRate: 0.1,
    scalarOpacity: 0.9,
    enableAnimations: true,
    animationDuration: 1000
  });

  // 初始化3D场景和PyVista渲染器
  const initializePyVistaViewer = useCallback(() => {
    if (!mountRef.current || isInitialized) return;

    try {
      // 创建Three.js场景
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a1a);
      sceneRef.current = scene;

      // 创建相机
      const camera = new THREE.PerspectiveCamera(75, workspaceWidth / workspaceHeight, 0.1, 1000);
      camera.position.set(50, 50, 100);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // 创建渲染器
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
      });
      renderer.setSize(workspaceWidth, workspaceHeight);
      renderer.setClearColor(0x1a1a1a, 1);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mountRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 添加光照
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(100, 100, 100);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      scene.add(directionalLight);

      // 添加辅助网格
      const gridHelper = new THREE.GridHelper(200, 20, 0x333333, 0x222222);
      scene.add(gridHelper);

      // 创建坐标轴辅助器
      const axesHelper = new THREE.AxesHelper(50);
      scene.add(axesHelper);

      // 初始化PyVista渲染器
      const pyvistaRenderer = new PyVistaRealtimeRenderer(scene);
      pyvistaRenderer.onStateChange((state) => {
        setVisualizationState(state);
        onVisualizationUpdate?.(state);
      });
      pyvistaRendererRef.current = pyvistaRenderer;

      // 创建轨道控制器（如果需要）
      // const controls = new OrbitControls(camera, renderer.domElement);

      // 渲染循环
      const animate = () => {
        requestAnimationFrame(animate);
        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      };
      animate();

      setIsInitialized(true);
      console.log('✅ PyVista查看器初始化完成');

    } catch (error) {
      console.error('❌ PyVista查看器初始化失败:', error);
    }
  }, [workspaceWidth, workspaceHeight, isInitialized, onVisualizationUpdate]);

  // 启动PyVista分析可视化
  const startAnalysisVisualization = async () => {
    if (!pyvistaRendererRef.current || !meshData || !computationData) {
      console.warn('⚠️ PyVista分析启动条件不满足');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🚀 启动PyVista分析可视化');

      // 获取PyVista服务
      const pyvistaService = getPyVistaIntegrationService(sceneRef.current!);

      // 构建分析参数
      const analysisParams = {
        geometry: {
          mesh: meshData,
          computationParams: computationData
        },
        analysisType: 'deep_excavation',
        stages: [
          { id: 1, name: '初始状态', operations: [] },
          { id: 2, name: '第一层开挖', operations: ['excavate_layer_1'] },
          { id: 3, name: '支护安装', operations: ['install_support'] },
          { id: 4, name: '第二层开挖', operations: ['excavate_layer_2'] },
          { id: 5, name: '最终状态', operations: ['final_analysis'] }
        ],
        outputRequests: [
          'stress_field',
          'displacement_field',
          'seepage_field',
          'safety_factor'
        ]
      };

      // 提交计算任务
      const { jobId } = await pyvistaService.api.submitComputation(analysisParams);
      setCurrentJobId(jobId);

      console.log('📋 PyVista计算任务提交成功:', jobId);

      // 启动实时渲染
      pyvistaRendererRef.current.startRealtimeRendering(jobId);

      // 监控计算进度
      monitorComputationProgress(jobId);

    } catch (error) {
      console.error('❌ PyVista分析启动失败:', error);
      setIsLoading(false);
    }
  };

  // 监控计算进度
  const monitorComputationProgress = async (jobId: string) => {
    const pyvistaService = getPyVistaIntegrationService();
    let completed = false;

    while (!completed) {
      try {
        const status = await pyvistaService.api.getComputationStatus(jobId);
        
        console.log('📊 计算进度:', {
          状态: status.status,
          进度: `${(status.progress * 100).toFixed(1)}%`,
          消息: status.message,
          预计时间: status.estimatedTime ? `${status.estimatedTime}s` : '未知'
        });

        if (status.status === 'completed') {
          completed = true;
          setIsLoading(false);
          console.log('✅ PyVista计算完成');
        } else if (status.status === 'error') {
          completed = true;
          setIsLoading(false);
          console.error('❌ PyVista计算失败:', status.message);
          break;
        }

        // 等待2秒后继续查询
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error('❌ 计算进度查询失败:', error);
        break;
      }
    }
  };

  // 切换显示模式
  const switchDisplayMode = (mode: PyVistaVisualizationState['displayMode']) => {
    if (pyvistaRendererRef.current) {
      pyvistaRendererRef.current.setDisplayMode(mode);
    }
  };

  // 切换向量场显示
  const toggleVectorDisplay = () => {
    const newConfig = {
      ...renderingConfig,
      showVectors: !renderingConfig.showVectors
    };
    setRenderingConfig(newConfig);
    
    if (pyvistaRendererRef.current) {
      pyvistaRendererRef.current.updateConfig(newConfig);
    }
  };

  // 调整透明度
  const adjustOpacity = (opacity: number) => {
    const newConfig = {
      ...renderingConfig,
      scalarOpacity: opacity
    };
    setRenderingConfig(newConfig);
    
    if (pyvistaRendererRef.current) {
      pyvistaRendererRef.current.updateConfig(newConfig);
    }
  };

  // 停止分析
  const stopAnalysis = () => {
    if (pyvistaRendererRef.current) {
      pyvistaRendererRef.current.stopRealtimeRendering();
    }
    setIsLoading(false);
    setCurrentJobId(null);
  };

  // 初始化场景
  useEffect(() => {
    initializePyVistaViewer();
    
    return () => {
      if (pyvistaRendererRef.current) {
        pyvistaRendererRef.current.dispose();
      }
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [initializePyVistaViewer]);

  // 监听mesh数据变化
  useEffect(() => {
    if (meshData && computationData && isInitialized && !isLoading) {
      console.log('🔄 检测到新的网格数据，准备启动PyVista分析');
    }
  }, [meshData, computationData, isInitialized, isLoading]);

  return (
    <div className="pyvista-results-viewer relative">
      {/* 3D PyVista场景 */}
      <div 
        ref={mountRef} 
        className="pyvista-3d-scene w-full h-full"
        style={{ width: workspaceWidth, height: workspaceHeight }}
      />
      
      {/* PyVista控制面板 */}
      <div className="absolute top-4 left-4 space-y-4">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 w-80">
          <h3 className="text-white font-medium mb-3 flex items-center">
            <FunctionalIcons.DataVisualization size={20} className="mr-2" />
            PyVista结果显示
          </h3>
          
          <div className="space-y-3">
            {/* 分析控制 */}
            <div>
              <motion.button
                className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
                  isLoading 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
                onClick={isLoading ? stopAnalysis : startAnalysisVisualization}
                disabled={!meshData || !computationData || !isInitialized}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? '停止分析' : '启动PyVista分析'}
              </motion.button>
            </div>

            {/* 显示模式切换 */}
            <div>
              <label className="text-sm text-gray-300 block mb-2">显示模式</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { mode: 'stress', label: '应力', icon: FunctionalIcons.StressAnalysis },
                  { mode: 'displacement', label: '位移', icon: FunctionalIcons.Displacement },
                  { mode: 'seepage', label: '渗流', icon: FunctionalIcons.FluidFlow },
                  { mode: 'safety', label: '安全', icon: FunctionalIcons.SafetyFactor }
                ].map(({ mode, label, icon: Icon }) => (
                  <motion.button
                    key={mode}
                    className={`flex items-center justify-center space-x-1 px-2 py-1 rounded text-xs transition-all ${
                      visualizationState.displayMode === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    onClick={() => switchDisplayMode(mode as any)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* 向量场控制 */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={renderingConfig.showVectors}
                  onChange={toggleVectorDisplay}
                  className="rounded"
                />
                <span className="text-sm text-gray-300">显示向量场</span>
              </label>
            </div>

            {/* 透明度控制 */}
            <div>
              <label className="text-sm text-gray-300 block mb-1">透明度</label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={renderingConfig.scalarOpacity}
                onChange={(e) => adjustOpacity(parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-gray-400">
                {(renderingConfig.scalarOpacity * 100).toFixed(0)}%
              </span>
            </div>

            {/* 动画控制 */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={renderingConfig.enableAnimations}
                  onChange={(e) => setRenderingConfig(prev => ({
                    ...prev,
                    enableAnimations: e.target.checked
                  }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-300">启用动画</span>
              </label>
            </div>
          </div>
        </div>

        {/* 当前状态显示 */}
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 w-80">
          <h3 className="text-white font-medium mb-3">分析状态</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">当前模式:</span>
              <span className="text-white capitalize">{visualizationState.displayMode}</span>
            </div>
            
            {visualizationState.activeScalarField && (
              <div className="flex justify-between">
                <span className="text-gray-300">活动标量场:</span>
                <span className="text-white text-xs">{visualizationState.activeScalarField}</span>
              </div>
            )}
            
            {visualizationState.currentStage > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-300">施工阶段:</span>
                <span className="text-white">{visualizationState.currentStage}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-300">是否动画中:</span>
              <span className={visualizationState.isAnimating ? 'text-yellow-400' : 'text-green-400'}>
                {visualizationState.isAnimating ? '是' : '否'}
              </span>
            </div>

            {currentJobId && (
              <div className="flex justify-between">
                <span className="text-gray-300">任务ID:</span>
                <span className="text-white text-xs">{currentJobId.substring(0, 8)}...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 加载指示器 */}
      {isLoading && (
        <div className="absolute top-4 right-4 w-80 bg-purple-600/20 backdrop-blur-sm rounded-lg p-4 border border-purple-500/30">
          <div className="flex items-center space-x-2 mb-3">
            <FunctionalIcons.ComputationalProgress size={20} className="text-purple-400 animate-spin" />
            <span className="text-purple-300 font-medium">PyVista计算中</span>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-purple-200">
              正在进行深基坑分析...
            </div>
            <div className="w-full bg-purple-900/30 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        </div>
      )}

      {/* 初始化提示 */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white">
            <FunctionalIcons.SystemLoading size={48} className="mx-auto mb-4 animate-spin" />
            <div className="text-lg font-medium">初始化PyVista查看器...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PyVistaResultsViewer;