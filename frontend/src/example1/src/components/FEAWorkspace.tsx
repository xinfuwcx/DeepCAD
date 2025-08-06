import React, { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import { MSHLoader } from './MSHLoader'
import { MaterialEditor } from './MaterialEditor'
import { AnalysisPanel } from './AnalysisPanel'
import { LogPanel } from './LogPanel'
import { MeshRenderer } from './MeshRenderer'
import { useFEAStore, useCurrentStep, useMeshFiles } from '../stores/feaStore'
import { electronAPI } from '../services/electronAPI'
import { FileText, Settings, Play, BarChart3 } from 'lucide-react'

export const FEAWorkspace: React.FC = () => {
  const currentStep = useCurrentStep()
  const meshFiles = useMeshFiles()
  const { setCurrentStep, addPythonLog } = useFEAStore()

  // 监听Python日志
  useEffect(() => {
    if (electronAPI.isElectron()) {
      electronAPI.onPythonLog((data) => {
        addPythonLog({
          type: data.type,
          message: data.message,
          timestamp: Date.now()
        })
      })

      return () => {
        electronAPI.removeAllListeners('python-log')
      }
    }
  }, [addPythonLog])

  // 检查是否有加载的网格
  const hasLoadedMesh = Object.values(meshFiles).some(file => file.loaded)

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            DeepCAD FEA - Example1
          </h1>
          
          <div className="flex space-x-1">
            <button
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentStep === 'preprocessing'
                  ? 'bg-primary-100 text-primary-700 border border-primary-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => setCurrentStep('preprocessing')}
            >
              <FileText className="w-4 h-4 mr-2" />
              前处理
            </button>
            
            <button
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentStep === 'analysis'
                  ? 'bg-primary-100 text-primary-700 border border-primary-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => setCurrentStep('analysis')}
            >
              <Play className="w-4 h-4 mr-2" />
              分析计算
            </button>
            
            <button
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentStep === 'postprocessing'
                  ? 'bg-primary-100 text-primary-700 border border-primary-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => setCurrentStep('postprocessing')}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              后处理
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* 左侧面板 */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {currentStep === 'preprocessing' && (
              <div className="space-y-4 p-4">
                <MSHLoader />
                <MaterialEditor />
              </div>
            )}
            
            {currentStep === 'analysis' && (
              <div className="p-4">
                <AnalysisPanel />
              </div>
            )}
            
            {currentStep === 'postprocessing' && (
              <div className="p-4">
                <div className="panel">
                  <div className="panel-header">
                    结果查看
                  </div>
                  <div className="panel-content">
                    <p className="text-gray-500 text-sm">
                      分析完成后，结果将在此显示
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 底部日志面板 */}
          <div className="border-t border-gray-200">
            <LogPanel />
          </div>
        </div>

        {/* 中央3D视图区域 */}
        <div className="flex-1 relative">
          {hasLoadedMesh ? (
            <Canvas camera={{ position: [50, 50, 50], fov: 60 }}>
              <ambientLight intensity={0.4} />
              <directionalLight 
                position={[10, 10, 5]} 
                intensity={0.5}
                castShadow
                shadow-mapSize={[1024, 1024]}
              />
              <Environment preset="city" />
              
              <OrbitControls 
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                dampingFactor={0.05}
              />
              
              <Grid 
                infiniteGrid 
                size={100} 
                cellSize={5} 
                cellThickness={0.5}
                sectionSize={25}
                sectionThickness={1}
                fadeDistance={200}
                fadeStrength={1}
                cellColor="#6b7280"
                sectionColor="#374151"
              />
              
              <MeshRenderer />
            </Canvas>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  欢迎使用 DeepCAD FEA
                </h3>
                <p className="text-gray-500 max-w-md">
                  请先在左侧面板中加载 MSH 文件开始您的有限元分析
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}