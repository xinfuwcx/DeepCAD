import React, { useState } from 'react'
import { useFEAStore, useMeshFiles, useMaterials } from '../stores/feaStore'
import { electronAPI } from '../services/electronAPI'
import { Play, Pause, Settings, CheckCircle, AlertTriangle, Clock } from 'lucide-react'

interface AnalysisStatus {
  status: 'idle' | 'running' | 'completed' | 'error'
  progress: number
  currentStep: string
  message: string
}

export const AnalysisPanel: React.FC = () => {
  const meshFiles = useMeshFiles()
  const materials = useMaterials()
  const { analysis } = useFEAStore()
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>({
    status: 'idle',
    progress: 0,
    currentStep: '',
    message: ''
  })

  // 检查分析前提条件
  const checkPrerequisites = () => {
    const issues: string[] = []
    
    // 检查必需的网格文件
    const requiredFiles = ['soil', 'pit', 'wall']
    requiredFiles.forEach(type => {
      if (!meshFiles[type]?.loaded) {
        issues.push(`缺少 ${type} 网格文件`)
      }
    })
    
    // 检查材料配置
    Object.values(meshFiles).forEach(file => {
      if (file.loaded && file.meshData) {
        file.meshData.metadata.physicalGroupNames.forEach(groupName => {
          if (!materials[groupName]) {
            issues.push(`物理组 "${groupName}" 未配置材料`)
          }
        })
      }
    })
    
    return issues
  }

  const prerequisites = checkPrerequisites()
  const canStartAnalysis = prerequisites.length === 0 && analysisStatus.status === 'idle'

  const handleStartAnalysis = async () => {
    if (!canStartAnalysis) return

    setAnalysisStatus({
      status: 'running',
      progress: 0,
      currentStep: '准备分析',
      message: '正在初始化计算环境...'
    })

    try {
      // 准备分析配置
      const analysisConfig = {
        meshFiles: Object.fromEntries(
          Object.entries(meshFiles)
            .filter(([_, file]) => file.loaded)
            .map(([type, file]) => [type, { path: file.path, meshData: file.meshData }])
        ),
        materials,
        analysis
      }

      // 发送到后端
      const result = await electronAPI.startAnalysis(analysisConfig)

      setAnalysisStatus({
        status: 'completed',
        progress: 100,
        currentStep: '分析完成',
        message: '分析成功完成'
      })

      console.log('Analysis completed:', result)

    } catch (error) {
      setAnalysisStatus({
        status: 'error',
        progress: 0,
        currentStep: '分析失败',
        message: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  const getStatusIcon = () => {
    switch (analysisStatus.status) {
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      default:
        return <Play className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (analysisStatus.status) {
      case 'running':
        return 'text-blue-600'
      case 'completed':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-4">
      {/* 分析状态 */}
      <div className="panel">
        <div className="panel-header">
          <div className="flex items-center">
            {getStatusIcon()}
            <span className="ml-2">分析状态</span>
          </div>
        </div>
        <div className="panel-content">
          <div className={`font-medium ${getStatusColor()}`}>
            {analysisStatus.currentStep || '就绪'}
          </div>
          {analysisStatus.message && (
            <div className="text-sm text-gray-600 mt-1">
              {analysisStatus.message}
            </div>
          )}
          
          {analysisStatus.status === 'running' && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>进度</span>
                <span>{analysisStatus.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${analysisStatus.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 前提条件检查 */}
      <div className="panel">
        <div className="panel-header">
          <div className="flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            前提条件检查
          </div>
        </div>
        <div className="panel-content">
          {prerequisites.length === 0 ? (
            <div className="flex items-center text-green-600 text-sm">
              <CheckCircle className="w-4 h-4 mr-2" />
              所有条件已满足
            </div>
          ) : (
            <div className="space-y-2">
              {prerequisites.map((issue, index) => (
                <div key={index} className="flex items-center text-red-600 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {issue}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 分析配置 */}
      <div className="panel">
        <div className="panel-header">
          分析配置
        </div>
        <div className="panel-content space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分析类型
            </label>
            <div className="text-sm text-gray-600">
              {analysis.analysisType === 'static_nonlinear' ? '静力非线性' : '其他'}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              施工步序 ({analysis.constructionSequence.length} 步)
            </label>
            <div className="space-y-2">
              {analysis.constructionSequence.map((step, index) => (
                <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <div className="font-medium">步骤 {step.step}: {step.name}</div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              求解设置
            </label>
            <div className="text-xs text-gray-600 space-y-1">
              <div>收敛精度: {analysis.solverSettings.convergenceTolerance}</div>
              <div>最大迭代: {analysis.solverSettings.maxIterations}</div>
              <div>求解方法: {analysis.solverSettings.solutionMethod}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="space-y-2">
        <button
          onClick={handleStartAnalysis}
          disabled={!canStartAnalysis}
          className={`w-full flex items-center justify-center py-3 px-4 rounded-md font-medium transition-colors ${
            canStartAnalysis
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Play className="w-4 h-4 mr-2" />
          开始分析
        </button>
        
        {analysisStatus.status === 'running' && (
          <button
            className="w-full flex items-center justify-center py-2 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Pause className="w-4 h-4 mr-2" />
            暂停分析
          </button>
        )}
      </div>
    </div>
  )
}