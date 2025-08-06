import { create } from 'zustand'
import { ProjectState, MeshData, ThreeGeometry, Material } from '../types'

interface FEAStore extends ProjectState {
  // Actions
  setMeshFile: (type: string, filePath: string) => void
  setMeshData: (type: string, meshData: MeshData, threeGeometry: ThreeGeometry) => void
  setMaterial: (groupName: string, material: Material) => void
  setCurrentStep: (step: 'preprocessing' | 'analysis' | 'postprocessing') => void
  addPythonLog: (log: { type: string; message: string; timestamp: number }) => void
  clearLogs: () => void
  reset: () => void
}

// 初始状态
const initialState: ProjectState = {
  meshFiles: {
    soil: { path: '', loaded: false },
    pit: { path: '', loaded: false },
    wall: { path: '', loaded: false },
    tunnel: { path: '', loaded: false },
    lining: { path: '', loaded: false }
  },
  materials: {},
  boundaries: {
    constraints: {},
    loads: {}
  },
  analysis: {
    analysisType: 'static_nonlinear',
    constructionSequence: [
      {
        step: 1,
        name: '初始平衡',
        description: '土体+既有隧道平衡',
        activateElements: ['soil_*', 'tunnel_lining'],
        applyLoads: ['gravity'],
        solveType: 'static'
      },
      {
        step: 2,
        name: '地连墙施工',
        description: '激活地连墙',
        activateElements: ['diaphragm_wall'],
        solveType: 'static'
      },
      {
        step: 3,
        name: '基坑开挖',
        description: '移除开挖区土体',
        deactivateElements: ['excavation_zone'],
        solveType: 'static'
      }
    ],
    solverSettings: {
      convergenceTolerance: 1e-6,
      maxIterations: 50,
      solutionMethod: 'newton_raphson'
    }
  },
  currentStep: 'preprocessing'
}

// 添加日志状态
interface LogEntry {
  type: 'stdout' | 'stderr' | 'info' | 'error'
  message: string
  timestamp: number
}

interface ExtendedFEAStore extends FEAStore {
  pythonLogs: LogEntry[]
}

export const useFEAStore = create<ExtendedFEAStore>((set, get) => ({
  ...initialState,
  pythonLogs: [],

  setMeshFile: (type, filePath) => {
    set((state) => ({
      meshFiles: {
        ...state.meshFiles,
        [type]: {
          ...state.meshFiles[type],
          path: filePath
        }
      }
    }))
  },

  setMeshData: (type, meshData, threeGeometry) => {
    set((state) => ({
      meshFiles: {
        ...state.meshFiles,
        [type]: {
          ...state.meshFiles[type],
          loaded: true,
          meshData,
          threeGeometry
        }
      }
    }))
  },

  setMaterial: (groupName, material) => {
    set((state) => ({
      materials: {
        ...state.materials,
        [groupName]: material
      }
    }))
  },

  setCurrentStep: (step) => {
    set({ currentStep: step })
  },

  addPythonLog: (log) => {
    set((state) => ({
      pythonLogs: [
        ...state.pythonLogs,
        {
          type: log.type as any,
          message: log.message,
          timestamp: log.timestamp
        }
      ].slice(-1000) // 保持最新1000条日志
    }))
  },

  clearLogs: () => {
    set({ pythonLogs: [] })
  },

  reset: () => {
    set({
      ...initialState,
      pythonLogs: []
    })
  }
}))

// 导出选择器
export const useMeshFiles = () => useFEAStore((state) => state.meshFiles)
export const useMaterials = () => useFEAStore((state) => state.materials)
export const useCurrentStep = () => useFEAStore((state) => state.currentStep)
export const usePythonLogs = () => useFEAStore((state) => state.pythonLogs)