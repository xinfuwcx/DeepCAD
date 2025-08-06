// Electron API 类型定义
interface ElectronAPI {
  selectFile: (options: { filters?: Array<{ name: string; extensions: string[] }> }) => Promise<string | null>
  loadMSHFile: (filePath: string) => Promise<any>
  saveMaterials: (materials: any) => Promise<any>
  startAnalysis: (config: any) => Promise<any>
  onPythonLog: (callback: (data: { type: string; message: string }) => void) => void
  removeAllListeners: (channel: string) => void
}

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

// 检查是否在 Electron 环境中
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI
}

// 封装的 API 服务
export const electronAPI = {
  // 文件选择
  async selectFile(options: { filters?: Array<{ name: string; extensions: string[] }> } = {}) {
    if (!isElectron()) {
      throw new Error('Not running in Electron environment')
    }
    return window.electronAPI.selectFile(options)
  },

  // MSH文件加载
  async loadMSHFile(filePath: string) {
    if (!isElectron()) {
      throw new Error('Not running in Electron environment')
    }
    return window.electronAPI.loadMSHFile(filePath)
  },

  // 材料配置保存
  async saveMaterials(materials: any) {
    if (!isElectron()) {
      throw new Error('Not running in Electron environment')
    }
    return window.electronAPI.saveMaterials(materials)
  },

  // 开始分析
  async startAnalysis(config: any) {
    if (!isElectron()) {
      throw new Error('Not running in Electron environment')
    }
    return window.electronAPI.startAnalysis(config)
  },

  // 监听Python日志
  onPythonLog(callback: (data: { type: string; message: string }) => void) {
    if (!isElectron()) {
      console.warn('Not running in Electron environment')
      return
    }
    window.electronAPI.onPythonLog(callback)
  },

  // 移除监听器
  removeAllListeners(channel: string) {
    if (!isElectron()) {
      return
    }
    window.electronAPI.removeAllListeners(channel)
  },

  // 检查是否在Electron环境
  isElectron
}

export default electronAPI