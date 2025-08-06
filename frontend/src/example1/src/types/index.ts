// 网格相关类型
export interface Node {
  id: number
  coordinates: [number, number, number]
}

export interface Element {
  id: number
  type: number
  nodes: number[]
  physicalGroup: number
}

export interface PhysicalGroup {
  tag: number
  dimension: number
  name: string
}

export interface MeshData {
  nodes: Record<number, Node>
  elements: Record<number, Element>
  physicalGroups: Record<string, PhysicalGroup>
  metadata: {
    nodesCount: number
    elementsCount: number
    physicalGroupNames: string[]
  }
}

// Three.js相关类型
export interface ThreeGeometry {
  vertices: number[]
  groups: Record<string, {
    indices: number[]
    type: string
    materialGroup: string
  }>
  metadata: {
    nodesCount: number
    elementsCount: number
    physicalGroups: string[]
  }
}

// 材料相关类型
export interface MaterialProperties {
  density: number
  elasticModulus: number
  poissonRatio: number
  cohesion?: number
  frictionAngle?: number
  dilatancyAngle?: number
  thickness?: number
}

export interface Material {
  name: string
  model: 'MohrCoulomb' | 'LinearElastic'
  elementType: 'TETRA10' | 'SHELL8'
  properties: MaterialProperties
}

// 边界条件类型
export interface DisplacementConstraint {
  type: 'displacement'
  constraint: [boolean, boolean, boolean] // [Ux, Uy, Uz]
  value: [number, number, number]
  description?: string
}

export interface Load {
  type: 'body_force' | 'surface_pressure' | 'point_load'
  direction?: [number, number, number]
  value?: number
  applyTo?: string
  description?: string
}

// 分析相关类型
export interface AnalysisStep {
  step: number
  name: string
  description: string
  activateElements?: string[]
  deactivateElements?: string[]
  applyLoads?: string[]
  solveType: 'static' | 'dynamic'
}

export interface AnalysisConfig {
  analysisType: 'static_linear' | 'static_nonlinear' | 'dynamic'
  constructionSequence: AnalysisStep[]
  solverSettings: {
    convergenceTolerance: number
    maxIterations: number
    solutionMethod: string
  }
}

// 结果相关类型
export interface AnalysisResults {
  displacement: {
    nodes: Record<number, [number, number, number]>
    magnitude: Record<number, number>
  }
  stress: {
    elements: Record<number, {
      vonMises: number
      principal: [number, number, number]
      tensor: number[]
    }>
  }
  strain: {
    elements: Record<number, {
      plastic: number
      elastic: number[]
    }>
  }
  summary: {
    maxDisplacement: number
    maxStress: number
    convergence: boolean
    iterations: number
  }
}

// 项目状态类型
export interface ProjectState {
  meshFiles: Record<string, {
    path: string
    loaded: boolean
    meshData?: MeshData
    threeGeometry?: ThreeGeometry
  }>
  materials: Record<string, Material>
  boundaries: {
    constraints: Record<string, DisplacementConstraint>
    loads: Record<string, Load>
  }
  analysis: AnalysisConfig
  results?: AnalysisResults
  currentStep: 'preprocessing' | 'analysis' | 'postprocessing'
}