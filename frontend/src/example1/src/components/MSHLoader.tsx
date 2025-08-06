import React, { useState } from 'react'
import { useFEAStore, useMeshFiles } from '../stores/feaStore'
import { electronAPI } from '../services/electronAPI'
import { File, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface MSHFileConfig {
  name: string
  type: string
  description: string
  required: boolean
}

const MSH_FILES: MSHFileConfig[] = [
  { name: 'soil.msh', type: 'soil', description: '土体网格', required: true },
  { name: 'foundation_pit.msh', type: 'pit', description: '基坑开挖区域', required: true },
  { name: 'diaphragm_wall.msh', type: 'wall', description: '地连墙', required: true },
  { name: 'tunnel.msh', type: 'tunnel', description: '隧道空间', required: false },
  { name: 'lining.msh', type: 'lining', description: '隧道衬砌', required: false }
]

export const MSHLoader: React.FC = () => {
  const meshFiles = useMeshFiles()
  const { setMeshFile, setMeshData } = useFEAStore()
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleFileSelect = async (fileConfig: MSHFileConfig) => {
    try {
      const filePath = await electronAPI.selectFile({
        filters: [
          { name: 'MSH Files', extensions: ['msh'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (filePath) {
        setMeshFile(fileConfig.type, filePath)
        // 清除该文件的错误信息
        setErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[fileConfig.type]
          return newErrors
        })
      }
    } catch (error) {
      console.error('文件选择失败:', error)
      setErrors(prev => ({
        ...prev,
        [fileConfig.type]: '文件选择失败'
      }))
    }
  }

  const handleFileLoad = async (fileConfig: MSHFileConfig) => {
    const file = meshFiles[fileConfig.type]
    if (!file.path) return

    setLoadingFiles(prev => new Set(prev).add(fileConfig.type))
    
    try {
      const result = await electronAPI.loadMSHFile(file.path)
      
      // 设置网格数据
      setMeshData(fileConfig.type, result.mesh_data, result.three_geometry)
      
      console.log(`${fileConfig.name} 加载成功:`, result.mesh_info)
      
      // 清除错误信息
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fileConfig.type]
        return newErrors
      })
      
    } catch (error) {
      console.error(`${fileConfig.name} 加载失败:`, error)
      setErrors(prev => ({
        ...prev,
        [fileConfig.type]: error instanceof Error ? error.message : '加载失败'
      }))
    } finally {
      setLoadingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(fileConfig.type)
        return newSet
      })
    }
  }

  const handleLoadAll = async () => {
    const filesToLoad = MSH_FILES.filter(config => {
      const file = meshFiles[config.type]
      return file.path && !file.loaded
    })

    for (const config of filesToLoad) {
      await handleFileLoad(config)
    }
  }

  const getFileStatus = (fileConfig: MSHFileConfig) => {
    const file = meshFiles[fileConfig.type]
    const isLoading = loadingFiles.has(fileConfig.type)
    const hasError = errors[fileConfig.type]

    if (isLoading) return 'loading'
    if (hasError) return 'error'
    if (file.loaded) return 'loaded'
    if (file.path) return 'ready'
    return 'empty'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'loaded':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'ready':
        return <File className="w-4 h-4 text-blue-500" />
      default:
        return <File className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'loading':
        return '加载中...'
      case 'error':
        return '错误'
      case 'loaded':
        return '已加载'
      case 'ready':
        return '就绪'
      default:
        return '未选择'
    }
  }

  const hasValidFiles = MSH_FILES.some(config => {
    const file = meshFiles[config.type]
    return file.path && !file.loaded
  })

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center">
          <Upload className="w-4 h-4 mr-2" />
          MSH 文件加载
        </div>
      </div>
      
      <div className="panel-content space-y-3">
        {MSH_FILES.map((config) => {
          const file = meshFiles[config.type]
          const status = getFileStatus(config)
          const error = errors[config.type]

          return (
            <div key={config.type} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {getStatusIcon(status)}
                  <div className="ml-2">
                    <div className="text-sm font-medium text-gray-900">
                      {config.name}
                      {config.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {config.description}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {getStatusText(status)}
                  </span>
                  
                  <button
                    onClick={() => handleFileSelect(config)}
                    className="text-xs btn-secondary py-1 px-2"
                  >
                    选择
                  </button>
                  
                  {file.path && !file.loaded && status !== 'loading' && (
                    <button
                      onClick={() => handleFileLoad(config)}
                      className="text-xs btn-primary py-1 px-2"
                      disabled={status === 'loading'}
                    >
                      加载
                    </button>
                  )}
                </div>
              </div>
              
              {file.path && (
                <div className="text-xs text-gray-500 mt-2 truncate">
                  {file.path}
                </div>
              )}
              
              {error && (
                <div className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}
              
              {file.loaded && file.meshData && (
                <div className="text-xs text-green-600 mt-2 bg-green-50 p-2 rounded">
                  节点: {file.meshData.metadata.nodesCount} | 
                  单元: {file.meshData.metadata.elementsCount} | 
                  物理组: {file.meshData.metadata.physicalGroupNames.join(', ')}
                </div>
              )}
            </div>
          )
        })}
        
        {hasValidFiles && (
          <div className="pt-3 border-t border-gray-200">
            <button
              onClick={handleLoadAll}
              className="w-full btn-primary"
              disabled={loadingFiles.size > 0}
            >
              {loadingFiles.size > 0 ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  加载中...
                </>
              ) : (
                '加载全部文件'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}