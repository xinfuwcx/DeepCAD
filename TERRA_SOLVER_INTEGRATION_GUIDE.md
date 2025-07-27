# Terra求解器集成指南 (Terra Solver Integration Guide)

> **3号计算专家专用** - 超P0任务执行手册  
> **基于**: 第1周技术验证基础  
> **目标**: 生产级200万单元Terra求解器  

## 🔥 核心目标

### 🎯 技术规格
- **网格规模**: 200万单元稳定求解
- **内存限制**: 8GB以内 (已验证可行)
- **求解时间**: < 30分钟 (200万单元)
- **成功率**: 求解成功率 > 95%
- **错误恢复**: 自动重启和状态恢复

### 📊 性能基准 (基于第1周验证)
```
✅ 已验证: 200万单元可以在8GB内存限制下求解
✅ 已验证: 生成时间约667秒是可接受的
✅ 已验证: 质量评分0.68可以进一步优化
```

---

## 📁 文件结构规划

### 🐍 Python后端文件
```
backend/
├── solvers/
│   ├── terra_solver.py          ← 主求解器接口
│   ├── terra_config.py          ← 配置管理
│   ├── memory_optimizer.py      ← 内存优化策略
│   └── solver_monitor.py        ← 实时监控
├── utils/
│   ├── mesh_converter.py        ← 网格格式转换
│   └── result_processor.py      ← 结果后处理
└── tests/
    └── test_terra_integration.py ← 集成测试
```

### 🌐 前端集成文件
```
frontend/src/
├── services/
│   ├── terraIntegration.ts      ← Terra集成服务
│   └── solverWebSocket.ts       ← 求解器通信
├── components/computation/
│   ├── TerraSolverPanel.tsx     ← 求解器控制面板
│   └── SolverProgressMonitor.tsx ← 进度监控
└── types/
    └── TerraDataTypes.ts         ← Terra数据类型
```

---

## 🚀 Day 1 下午任务 (今天) - Terra接口完善

### 📋 核心任务清单
- [ ] **创建terra_solver.py主接口** (1小时)
- [ ] **实现内存监控和限制** (1小时)
- [ ] **建立前后端WebSocket通信** (1小时)
- [ ] **测试基础求解功能** (1小时)

### 💻 Terra求解器主接口实现

#### 📁 创建 `backend/solvers/terra_solver.py`
```python
"""
Terra求解器集成接口
3号计算专家开发 - 基于第1周验证基础
"""

import os
import gc
import time
import psutil
import logging
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum

# Terra求解器导入 (根据实际安装调整)
try:
    import kratos_core as Kratos
    from applications.geomechanics_application import *
    TERRA_AVAILABLE = True
except ImportError:
    TERRA_AVAILABLE = False
    logging.warning("Terra/Kratos not available, using mock solver")

class SolverStatus(Enum):
    IDLE = "idle"
    INITIALIZING = "initializing"
    SOLVING = "solving"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class MemoryConstraints:
    max_memory_mb: int = 8192  # 8GB限制
    gc_threshold_mb: int = 6144  # 6GB时触发垃圾回收
    chunk_size: int = 200000   # 分块处理大小

@dataclass
class SolverProgress:
    status: SolverStatus
    percentage: float
    current_step: int
    total_steps: int
    memory_usage_mb: float
    message: str
    eta_seconds: Optional[float] = None

class TerraSolver:
    """
    Terra求解器主类 - 基于第1周200万单元验证经验
    """
    
    def __init__(self, 
                 memory_constraints: MemoryConstraints = None,
                 progress_callback: Callable[[SolverProgress], None] = None):
        self.memory_constraints = memory_constraints or MemoryConstraints()
        self.progress_callback = progress_callback
        self.current_status = SolverStatus.IDLE
        self.start_time = None
        self.logger = logging.getLogger(__name__)
        
        # 基于第1周验证的优化配置
        self.optimization_config = {
            'solver_type': 'iterative',  # 内存友好的迭代求解器
            'preconditioner': 'diagonal',
            'max_iterations': 1000,
            'tolerance': 1e-6,
            'chunk_processing': True,  # 分块处理大规模网格
        }
    
    def solve(self, 
              mesh_data: Dict,
              material_properties: Dict,
              boundary_conditions: List[Dict],
              loads: List[Dict]) -> Dict:
        """
        核心求解方法 - 支持200万单元
        """
        try:
            self._update_progress(SolverStatus.INITIALIZING, 0, "初始化求解器...")
            self.start_time = time.time()
            
            # 1. 内存预检查
            if not self._check_memory_availability():
                raise RuntimeError("内存不足，无法启动求解")
            
            # 2. 初始化Kratos模型
            model = self._initialize_kratos_model(mesh_data, material_properties)
            self._update_progress(SolverStatus.INITIALIZING, 10, "模型初始化完成")
            
            # 3. 应用边界条件和载荷
            self._apply_boundary_conditions(model, boundary_conditions)
            self._apply_loads(model, loads)
            self._update_progress(SolverStatus.INITIALIZING, 20, "边界条件已应用")
            
            # 4. 开始求解
            self._update_progress(SolverStatus.SOLVING, 25, "开始数值求解...")
            result = self._execute_solving(model)
            
            # 5. 后处理
            self._update_progress(SolverStatus.SOLVING, 90, "后处理中...")
            processed_result = self._post_process_results(result)
            
            self._update_progress(SolverStatus.COMPLETED, 100, "求解完成")
            return processed_result
            
        except Exception as e:
            self.logger.error(f"求解失败: {str(e)}")
            self._update_progress(SolverStatus.FAILED, 0, f"求解失败: {str(e)}")
            raise
    
    def _check_memory_availability(self) -> bool:
        """检查内存可用性 - 基于8GB限制"""
        memory = psutil.virtual_memory()
        available_mb = memory.available / (1024 * 1024)
        
        if available_mb < self.memory_constraints.max_memory_mb:
            self.logger.warning(f"可用内存 {available_mb:.0f}MB < 需求 {self.memory_constraints.max_memory_mb}MB")
            return False
        return True
    
    def _initialize_kratos_model(self, mesh_data: Dict, material_properties: Dict):
        """初始化Kratos模型 - 针对大规模网格优化"""
        if not TERRA_AVAILABLE:
            return self._mock_kratos_model(mesh_data)
        
        # 创建Kratos主模型对象
        model = Kratos.Model()
        model_part = model.CreateModelPart("MainModelPart")
        
        # 根据第1周经验，分块处理大规模网格
        element_count = len(mesh_data.get("elements", []))
        if element_count > 1000000:  # 100万单元以上使用分块策略
            return self._initialize_chunked_model(model_part, mesh_data, material_properties)
        else:
            return self._initialize_standard_model(model_part, mesh_data, material_properties)
    
    def _execute_solving(self, model) -> Dict:
        """执行求解过程 - 带进度监控"""
        if not TERRA_AVAILABLE:
            return self._mock_solving_process()
        
        # 配置求解器
        solver_settings = self._get_solver_settings()
        solver = self._create_solver(model, solver_settings)
        
        # 求解循环
        max_iterations = self.optimization_config['max_iterations']
        for iteration in range(max_iterations):
            # 内存监控
            if self._should_trigger_gc():
                self._force_garbage_collection()
            
            # 执行求解步
            converged = solver.SolveSolutionStep()
            
            # 更新进度
            progress = 25 + (iteration / max_iterations) * 65  # 25-90%的进度范围
            eta = self._calculate_eta(iteration, max_iterations)
            self._update_progress(
                SolverStatus.SOLVING, 
                progress, 
                f"求解迭代 {iteration+1}/{max_iterations}",
                eta
            )
            
            if converged:
                self.logger.info(f"求解收敛，迭代次数: {iteration+1}")
                break
        
        return {"converged": converged, "iterations": iteration+1}
    
    def _should_trigger_gc(self) -> bool:
        """检查是否需要触发垃圾回收"""
        memory = psutil.virtual_memory()
        used_mb = (memory.total - memory.available) / (1024 * 1024)
        return used_mb > self.memory_constraints.gc_threshold_mb
    
    def _force_garbage_collection(self):
        """强制垃圾回收 - 内存管理策略"""
        gc.collect()
        self.logger.debug("执行垃圾回收")
    
    def _update_progress(self, status: SolverStatus, percentage: float, 
                        message: str, eta: Optional[float] = None):
        """更新求解进度"""
        self.current_status = status
        
        # 计算内存使用
        memory = psutil.virtual_memory()
        memory_usage_mb = (memory.total - memory.available) / (1024 * 1024)
        
        progress = SolverProgress(
            status=status,
            percentage=percentage,
            current_step=int(percentage),
            total_steps=100,
            memory_usage_mb=memory_usage_mb,
            message=message,
            eta_seconds=eta
        )
        
        if self.progress_callback:
            self.progress_callback(progress)
        
        self.logger.info(f"[{status.value}] {percentage:.1f}% - {message}")
    
    def _calculate_eta(self, current_iteration: int, total_iterations: int) -> Optional[float]:
        """计算预估完成时间"""
        if not self.start_time or current_iteration == 0:
            return None
        
        elapsed = time.time() - self.start_time
        rate = current_iteration / elapsed
        remaining_iterations = total_iterations - current_iteration
        
        return remaining_iterations / rate if rate > 0 else None
    
    # Mock实现 (用于测试)
    def _mock_kratos_model(self, mesh_data: Dict):
        """Mock Kratos模型 (用于没有Terra环境的测试)"""
        return {"mock_model": True, "elements": len(mesh_data.get("elements", []))}
    
    def _mock_solving_process(self) -> Dict:
        """Mock求解过程"""
        import time
        for i in range(100):
            time.sleep(0.1)  # 模拟计算时间
            progress = 25 + i * 0.65
            self._update_progress(SolverStatus.SOLVING, progress, f"Mock求解 {i+1}/100")
        
        return {"converged": True, "iterations": 100, "mock": True}

# 便捷函数
def create_terra_solver(memory_limit_mb: int = 8192, 
                       progress_callback: Callable = None) -> TerraSolver:
    """创建Terra求解器实例"""
    constraints = MemoryConstraints(max_memory_mb=memory_limit_mb)
    return TerraSolver(constraints, progress_callback)

if __name__ == "__main__":
    # 测试代码
    def progress_printer(progress: SolverProgress):
        print(f"[{progress.status.value}] {progress.percentage:.1f}% - {progress.message}")
    
    solver = create_terra_solver(progress_callback=progress_printer)
    print("Terra求解器初始化成功")
```

### 🌐 前端集成服务实现

#### 📁 创建 `frontend/src/services/terraIntegration.ts`
```typescript
/**
 * Terra求解器前端集成服务
 * 3号计算专家开发 - 超P0任务
 */

import { realtimeClient } from '../api/realtimeClient';
import { ComponentDevHelper } from '../utils/developmentTools';

export interface TerraJobRequest {
  jobId: string;
  meshData: any;
  materialProperties: any;
  boundaryConditions: any[];
  loads: any[];
  memoryLimit?: number;
}

export interface TerraJobProgress {
  jobId: string;
  status: 'idle' | 'initializing' | 'solving' | 'completed' | 'failed';
  percentage: number;
  currentStep: number;
  totalSteps: number;
  memoryUsageMB: number;
  message: string;
  etaSeconds?: number;
}

export interface TerraJobResult {
  jobId: string;
  success: boolean;
  converged: boolean;
  iterations: number;
  solvingTime: number;
  results: {
    displacements: number[][];
    stresses: number[][];
    strains: number[][];
  };
  error?: string;
}

class TerraIntegrationService {
  private activeJobs = new Map<string, TerraJobRequest>();
  private progressCallbacks = new Map<string, (progress: TerraJobProgress) => void>();
  private resultCallbacks = new Map<string, (result: TerraJobResult) => void>();

  constructor() {
    this.setupWebSocketListeners();
  }

  /**
   * 提交Terra求解任务 - 支持200万单元
   */
  async submitSolveJob(
    request: TerraJobRequest,
    onProgress?: (progress: TerraJobProgress) => void,
    onResult?: (result: TerraJobResult) => void
  ): Promise<boolean> {
    ComponentDevHelper.logAPICall('terra/solve', 'POST', '3号计算专家');
    
    // 注册回调
    if (onProgress) this.progressCallbacks.set(request.jobId, onProgress);
    if (onResult) this.resultCallbacks.set(request.jobId, onResult);
    
    // 缓存任务
    this.activeJobs.set(request.jobId, request);
    
    // 发送到后端
    const success = realtimeClient.send('terra_solve_request', {
      ...request,
      timestamp: Date.now(),
      clientId: 'frontend'
    });
    
    if (success) {
      ComponentDevHelper.logDevTip(`Terra求解任务已提交: ${request.jobId}`);
    } else {
      ComponentDevHelper.logError(new Error('提交失败'), 'Terra求解', '3号计算专家');
    }
    
    return success;
  }

  /**
   * 取消求解任务
   */
  cancelJob(jobId: string): boolean {
    ComponentDevHelper.logDevTip(`取消Terra求解任务: ${jobId}`);
    
    const success = realtimeClient.send('terra_cancel_request', {
      jobId,
      timestamp: Date.now()
    });
    
    if (success) {
      this.cleanup(jobId);
    }
    
    return success;
  }

  /**
   * 获取活跃任务列表
   */
  getActiveJobs(): string[] {
    return Array.from(this.activeJobs.keys());
  }

  /**
   * 设置WebSocket监听器
   */
  private setupWebSocketListeners(): void {
    // 监听进度更新
    realtimeClient.subscribe('terra_progress', (message) => {
      const progress: TerraJobProgress = message.data;
      const callback = this.progressCallbacks.get(progress.jobId);
      
      if (callback) {
        callback(progress);
        ComponentDevHelper.logDevTip(
          `Terra进度更新: ${progress.jobId} - ${progress.percentage.toFixed(1)}%`
        );
      }
    });

    // 监听求解结果
    realtimeClient.subscribe('terra_result', (message) => {
      const result: TerraJobResult = message.data;
      const callback = this.resultCallbacks.get(result.jobId);
      
      if (callback) {
        callback(result);
        ComponentDevHelper.logDevTip(
          `Terra求解完成: ${result.jobId} - ${result.success ? '成功' : '失败'}`
        );
      }
      
      this.cleanup(result.jobId);
    });

    // 监听错误信息
    realtimeClient.subscribe('terra_error', (message) => {
      const { jobId, error } = message.data;
      ComponentDevHelper.logError(new Error(error), `Terra求解-${jobId}`, '3号计算专家');
      
      const callback = this.resultCallbacks.get(jobId);
      if (callback) {
        callback({
          jobId,
          success: false,
          converged: false,
          iterations: 0,
          solvingTime: 0,
          results: { displacements: [], stresses: [], strains: [] },
          error
        });
      }
      
      this.cleanup(jobId);
    });
  }

  /**
   * 清理任务资源
   */
  private cleanup(jobId: string): void {
    this.activeJobs.delete(jobId);
    this.progressCallbacks.delete(jobId);
    this.resultCallbacks.delete(jobId);
  }
}

// 全局实例
export const terraIntegration = new TerraIntegrationService();

// React Hook
export function useTerraIntegration() {
  return {
    submitJob: terraIntegration.submitSolveJob.bind(terraIntegration),
    cancelJob: terraIntegration.cancelJob.bind(terraIntegration),
    getActiveJobs: terraIntegration.getActiveJobs.bind(terraIntegration)
  };
}

export default terraIntegration;
```

---

## ✅ Day 1 验收标准

### 🎯 完成检查清单
- [ ] **terra_solver.py** 主接口创建完成
- [ ] **内存监控功能** 8GB限制验证
- [ ] **WebSocket通信** 前后端连接正常
- [ ] **Mock求解测试** 基础功能验证
- [ ] **错误处理机制** 异常情况处理

### 📊 测试验证
```bash
# 后端测试
cd backend
python -m pytest tests/test_terra_integration.py -v

# 前端测试
cd frontend
npm test -- TerraIntegration.test.ts
```

---

## 🚀 明日计划预览 (Day 2)

### 🎯 200万单元验证
- 真实200万单元网格测试
- 内存使用优化和监控
- 分块处理策略验证
- 性能基准测试

**3号专家，基于你第1周的solid基础，这个Terra集成一定能成功！加油！🔥**

*1号架构师 - 为超P0任务提供全力支持*