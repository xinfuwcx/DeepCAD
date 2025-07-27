/**
 * CAE专业知识库系统
 * 为DeepCAD深基坑平台提供专业CAE知识支持
 * 整合深基坑工程、有限元分析、地质建模等专业知识
 */

import { createStore } from 'zustand/vanilla';

// 知识条目类型定义
export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  lastUpdated: Date;
  
  // 专业参数
  parameters?: {
    [key: string]: {
      value: number | string;
      unit?: string;
      description: string;
      validRange?: [number, number];
    };
  };
  
  // 相关公式
  formulas?: {
    name: string;
    latex: string;
    description: string;
    variables: { [key: string]: string };
  }[];
  
  // 工程案例
  caseStudies?: {
    projectName: string;
    location: string;
    parameters: { [key: string]: any };
    results: { [key: string]: any };
    lessons: string[];
  }[];
}

export type KnowledgeCategory = 
  | 'deep_excavation'      // 深基坑工程
  | 'soil_mechanics'       // 土力学
  | 'structural_analysis'  // 结构分析
  | 'fem_theory'          // 有限元理论
  | 'geology_modeling'    // 地质建模
  | 'seepage_analysis'    // 渗流分析
  | 'stability_analysis'  // 稳定性分析
  | 'construction_methods' // 施工方法
  | 'monitoring_systems'  // 监测系统
  | 'safety_standards';   // 安全标准

// 向量数据库接口
export interface VectorDatabase {
  // 添加知识条目到向量数据库
  addEntry(entry: KnowledgeEntry): Promise<void>;
  
  // 语义搜索
  semanticSearch(query: string, limit?: number): Promise<KnowledgeEntry[]>;
  
  // 相似知识推荐
  findSimilar(entryId: string, limit?: number): Promise<KnowledgeEntry[]>;
  
  // 分类检索
  searchByCategory(category: KnowledgeCategory, query?: string): Promise<KnowledgeEntry[]>;
}

// 知识库状态管理
interface KnowledgeBaseState {
  entries: Map<string, KnowledgeEntry>;
  categories: Map<KnowledgeCategory, KnowledgeEntry[]>;
  searchHistory: string[];
  favoriteEntries: string[];
  
  // 操作方法
  addEntry: (entry: KnowledgeEntry) => void;
  updateEntry: (id: string, updates: Partial<KnowledgeEntry>) => void;
  removeEntry: (id: string) => void;
  searchEntries: (query: string) => KnowledgeEntry[];
  getEntriesByCategory: (category: KnowledgeCategory) => KnowledgeEntry[];
  addToFavorites: (entryId: string) => void;
  removeFromFavorites: (entryId: string) => void;
}

// 创建知识库存储
export const knowledgeBaseStore = createStore<KnowledgeBaseState>((set, get) => ({
  entries: new Map(),
  categories: new Map(),
  searchHistory: [],
  favoriteEntries: [],
  
  addEntry: (entry) => set((state) => {
    const newEntries = new Map(state.entries);
    newEntries.set(entry.id, entry);
    
    const newCategories = new Map(state.categories);
    const categoryEntries = newCategories.get(entry.category) || [];
    categoryEntries.push(entry);
    newCategories.set(entry.category, categoryEntries);
    
    return { entries: newEntries, categories: newCategories };
  }),
  
  updateEntry: (id, updates) => set((state) => {
    const newEntries = new Map(state.entries);
    const existing = newEntries.get(id);
    if (existing) {
      newEntries.set(id, { ...existing, ...updates });
    }
    return { entries: newEntries };
  }),
  
  removeEntry: (id) => set((state) => {
    const newEntries = new Map(state.entries);
    const entry = newEntries.get(id);
    newEntries.delete(id);
    
    const newCategories = new Map(state.categories);
    if (entry) {
      const categoryEntries = newCategories.get(entry.category) || [];
      const filtered = categoryEntries.filter(e => e.id !== id);
      newCategories.set(entry.category, filtered);
    }
    
    return { entries: newEntries, categories: newCategories };
  }),
  
  searchEntries: (query) => {
    const { entries } = get();
    const results: KnowledgeEntry[] = [];
    const queryLower = query.toLowerCase();
    
    entries.forEach(entry => {
      if (
        entry.title.toLowerCase().includes(queryLower) ||
        entry.content.toLowerCase().includes(queryLower) ||
        entry.tags.some(tag => tag.toLowerCase().includes(queryLower))
      ) {
        results.push(entry);
      }
    });
    
    return results.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  },
  
  getEntriesByCategory: (category) => {
    const { categories } = get();
    return categories.get(category) || [];
  },
  
  addToFavorites: (entryId) => set((state) => ({
    favoriteEntries: [...state.favoriteEntries.filter(id => id !== entryId), entryId]
  })),
  
  removeFromFavorites: (entryId) => set((state) => ({
    favoriteEntries: state.favoriteEntries.filter(id => id !== entryId)
  }))
}));

// 简化的向量数据库实现（生产环境应使用Chroma或Pinecone等专业向量数据库）
class SimpleVectorDatabase implements VectorDatabase {
  private entries: Map<string, KnowledgeEntry> = new Map();
  
  async addEntry(entry: KnowledgeEntry): Promise<void> {
    this.entries.set(entry.id, entry);
    knowledgeBaseStore.getState().addEntry(entry);
  }
  
  async semanticSearch(query: string, limit = 10): Promise<KnowledgeEntry[]> {
    // 简化的文本相似度搜索
    const results = knowledgeBaseStore.getState().searchEntries(query);
    return results.slice(0, limit);
  }
  
  async findSimilar(entryId: string, limit = 5): Promise<KnowledgeEntry[]> {
    const entry = this.entries.get(entryId);
    if (!entry) return [];
    
    const allEntries = Array.from(this.entries.values());
    const similar = allEntries
      .filter(e => e.id !== entryId && e.category === entry.category)
      .slice(0, limit);
    
    return similar;
  }
  
  async searchByCategory(category: KnowledgeCategory, query?: string): Promise<KnowledgeEntry[]> {
    let results = knowledgeBaseStore.getState().getEntriesByCategory(category);
    
    if (query) {
      const queryLower = query.toLowerCase();
      results = results.filter(entry =>
        entry.title.toLowerCase().includes(queryLower) ||
        entry.content.toLowerCase().includes(queryLower)
      );
    }
    
    return results;
  }
}

// 全局向量数据库实例
export const globalVectorDB = new SimpleVectorDatabase();

// 初始化专业知识条目
export const initializeKnowledgeBase = async () => {
  const knowledgeEntries: KnowledgeEntry[] = [
    {
      id: 'deep-excavation-basics',
      category: 'deep_excavation',
      title: '深基坑工程基础理论',
      content: '深基坑工程是指开挖深度超过5米的基坑工程。需要考虑土压力、地下水、稳定性等多个因素。',
      tags: ['基础理论', '深基坑', '土压力'],
      difficulty: 'beginner',
      lastUpdated: new Date(),
      parameters: {
        excavationDepth: {
          value: 5,
          unit: 'm',
          description: '深基坑定义的最小开挖深度',
          validRange: [5, 50]
        },
        safetyFactor: {
          value: 1.2,
          unit: '',
          description: '稳定性分析安全系数',
          validRange: [1.1, 1.5]
        }
      },
      formulas: [
        {
          name: '主动土压力',
          latex: 'P_a = \\frac{1}{2} \\gamma H^2 K_a',
          description: '朗肯主动土压力公式',
          variables: {
            'P_a': '主动土压力',
            'γ': '土体重度',
            'H': '挡土墙高度',
            'K_a': '主动土压力系数'
          }
        }
      ]
    },
    {
      id: 'fem-mesh-quality',
      category: 'fem_theory',
      title: '有限元网格质量控制',
      content: '网格质量直接影响计算精度。需要控制单元形状、尺寸比例、节点分布等关键指标。',
      tags: ['有限元', '网格', '质量控制'],
      difficulty: 'intermediate',
      lastUpdated: new Date(),
      parameters: {
        aspectRatio: {
          value: 3,
          unit: '',
          description: '单元长宽比上限',
          validRange: [1, 5]
        },
        skewness: {
          value: 0.85,
          unit: '',
          description: '单元偏斜度上限',
          validRange: [0, 1]
        }
      }
    },
    {
      id: 'seepage-analysis-theory',
      category: 'seepage_analysis',
      title: '渗流分析基本理论',
      content: '基于达西定律的地下水渗流分析，适用于多孔介质中的稳态和非稳态渗流问题。',
      tags: ['渗流', '达西定律', '地下水'],
      difficulty: 'intermediate',
      lastUpdated: new Date(),
      formulas: [
        {
          name: '达西定律',
          latex: 'v = k \\cdot i = k \\cdot \\frac{\\partial h}{\\partial l}',
          description: '描述多孔介质中流体渗流速度',
          variables: {
            'v': '渗流速度',
            'k': '渗透系数',
            'i': '水力梯度',
            'h': '水头',
            'l': '渗流路径长度'
          }
        }
      ]
    },
    {
      id: 'retaining-wall-design',
      category: 'structural_analysis',
      title: '围护墙结构设计',
      content: '深基坑围护墙承受土压力、水压力作用，需进行强度、刚度、稳定性验算。',
      tags: ['围护墙', '结构设计', '土压力'],
      difficulty: 'advanced',
      lastUpdated: new Date(),
      caseStudies: [
        {
          projectName: '上海某深基坑工程',
          location: '上海',
          parameters: {
            excavationDepth: 15,
            wallType: 'diaphragm_wall',
            wallThickness: 0.8
          },
          results: {
            maxDeflection: 25.6,
            maxStress: 8.2
          },
          lessons: ['预应力锚杆效果显著', '降水控制是关键']
        }
      ]
    },
    {
      id: 'gpu-computing-fundamentals',
      category: 'fem_theory',
      title: 'GPU并行计算在有限元中的应用',
      content: 'WebGPU技术实现有限元计算的5-10倍性能提升，特别适用于大规模网格计算和应力分析。',
      tags: ['GPU计算', 'WebGPU', '并行计算', '有限元'],
      difficulty: 'expert',
      lastUpdated: new Date(),
      parameters: {
        workgroupSize: {
          value: 256,
          unit: 'threads',
          description: '工作组大小，影响GPU并行度',
          validRange: [64, 1024]
        },
        maxBufferSize: {
          value: 1024,
          unit: 'MB',
          description: 'GPU缓冲区最大尺寸',
          validRange: [256, 4096]
        }
      },
      formulas: [
        {
          name: 'GPU并行效率',
          latex: '\\eta = \\frac{T_{sequential}}{T_{parallel} \\cdot N_{cores}}',
          description: 'GPU并行计算效率公式',
          variables: {
            'η': '并行效率',
            'T_sequential': '串行执行时间',
            'T_parallel': '并行执行时间',
            'N_cores': 'GPU核心数'
          }
        }
      ]
    },
    {
      id: 'intelligent-optimization-algorithms',
      category: 'deep_excavation',
      title: '深基坑智能优化算法',
      content: '基于遗传算法、粒子群优化等智能算法，实现深基坑参数的自动优化设计。',
      tags: ['智能优化', '遗传算法', '参数优化'],
      difficulty: 'advanced',
      lastUpdated: new Date(),
      parameters: {
        populationSize: {
          value: 50,
          unit: '个体',
          description: '遗传算法种群大小',
          validRange: [20, 200]
        },
        mutationRate: {
          value: 0.1,
          unit: '',
          description: '变异概率',
          validRange: [0.01, 0.3]
        }
      },
      formulas: [
        {
          name: '适应度函数',
          latex: 'f(x) = w_1 \\cdot f_{deformation} + w_2 \\cdot f_{safety} + w_3 \\cdot f_{cost}',
          description: '多目标优化适应度函数',
          variables: {
            'f(x)': '综合适应度',
            'w_1,w_2,w_3': '权重系数',
            'f_deformation': '变形目标',
            'f_safety': '安全性目标',
            'f_cost': '经济性目标'
          }
        }
      ]
    },
    {
      id: 'construction-stage-analysis',
      category: 'construction_methods',
      title: '施工阶段分析理论',
      content: '分阶段开挖的有限元模拟，考虑施工工序对结构内力和变形的影响。',
      tags: ['施工阶段', '分步开挖', '时程分析'],
      difficulty: 'intermediate',
      lastUpdated: new Date(),
      parameters: {
        stageCount: {
          value: 4,
          unit: '阶段',
          description: '施工阶段数量',
          validRange: [2, 8]
        },
        stageDuration: {
          value: 7,
          unit: 'days',
          description: '每阶段施工周期',
          validRange: [3, 30]
        }
      },
      caseStudies: [
        {
          projectName: '北京某地铁车站深基坑',
          location: '北京',
          parameters: {
            excavationDepth: 18,
            stageCount: 5,
            supportType: 'mixed_system'
          },
          results: {
            maxDeformation: 28.5,
            constructionTime: 45
          },
          lessons: ['合理的施工顺序可显著减少变形', '支撑预加力需及时施加']
        }
      ]
    },
    {
      id: 'webgpu-visualization',
      category: 'fem_theory',
      title: 'WebGPU可视化渲染技术',
      content: 'WebGPU着色器编程实现实时应力云图、流场可视化、变形动画等高性能渲染。',
      tags: ['WebGPU', '可视化', '着色器', '实时渲染'],
      difficulty: 'expert',
      lastUpdated: new Date(),
      parameters: {
        shaderWorkgroupSize: {
          value: 64,
          unit: 'threads',
          description: '计算着色器工作组大小',
          validRange: [32, 256]
        },
        renderQuality: {
          value: 'high',
          unit: '',
          description: '渲染质量等级',
          validRange: ['low', 'medium', 'high', 'ultra']
        }
      },
      formulas: [
        {
          name: '着色器并行度',
          latex: 'P = \\frac{N_{vertices}}{W_{size} \\cdot G_{count}}',
          description: '顶点着色器并行度计算',
          variables: {
            'P': '并行度',
            'N_vertices': '顶点数量',
            'W_size': '工作组大小',
            'G_count': '工作组数量'
          }
        }
      ]
    },
    {
      id: 'ai-prediction-models',
      category: 'deep_excavation',
      title: '深基坑AI预测模型',
      content: '基于机器学习的深基坑变形预测、风险评估和智能决策支持系统。',
      tags: ['人工智能', '机器学习', '预测模型', '风险评估'],
      difficulty: 'expert',
      lastUpdated: new Date(),
      parameters: {
        modelAccuracy: {
          value: 0.95,
          unit: '',
          description: '模型预测精度',
          validRange: [0.8, 0.99]
        },
        trainingDataSize: {
          value: 10000,
          unit: '样本',
          description: '训练数据集大小',
          validRange: [1000, 100000]
        }
      },
      formulas: [
        {
          name: '预测误差',
          latex: 'RMSE = \\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}(y_i - \\hat{y_i})^2}',
          description: '均方根误差评估预测精度',
          variables: {
            'RMSE': '均方根误差',
            'n': '样本数量',
            'y_i': '实际值',
            'ŷ_i': '预测值'
          }
        }
      ]
    }
  ];
  
  // 添加到向量数据库
  for (const entry of knowledgeEntries) {
    await globalVectorDB.addEntry(entry);
  }
  
  console.log(`已初始化 ${knowledgeEntries.length} 条CAE专业知识条目`);
};

// 知识库查询接口
export class KnowledgeBaseAPI {
  static async searchKnowledge(query: string): Promise<KnowledgeEntry[]> {
    return await globalVectorDB.semanticSearch(query);
  }
  
  static async getKnowledgeByCategory(category: KnowledgeCategory): Promise<KnowledgeEntry[]> {
    return await globalVectorDB.searchByCategory(category);
  }
  
  static async getSimilarKnowledge(entryId: string): Promise<KnowledgeEntry[]> {
    return await globalVectorDB.findSimilar(entryId);
  }
  
  static async addKnowledge(entry: Omit<KnowledgeEntry, 'id' | 'lastUpdated'>): Promise<string> {
    const newEntry: KnowledgeEntry = {
      ...entry,
      id: `knowledge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lastUpdated: new Date()
    };
    
    await globalVectorDB.addEntry(newEntry);
    return newEntry.id;
  }
}

export default KnowledgeBaseAPI;