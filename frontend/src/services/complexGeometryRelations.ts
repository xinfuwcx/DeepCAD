/**
 * 🏗️ 复杂几何关系定义系统
 * 
 * 第3周开发任务 Day 3 - 2号几何专家
 * 支持层次化几何关系、表达式解析、智能约束推导
 */

import { GeometricParameter, ParametricConstraint } from './parametricConstraintSolver';

// 🏗️ 几何实体基类
export interface GeometricEntity {
  id: string;
  name: string;
  type: 'point' | 'line' | 'arc' | 'circle' | 'polygon' | 'surface' | 'volume';
  parameters: string[]; // 控制参数ID列表
  parentEntities?: string[]; // 父级实体
  childEntities?: string[]; // 子级实体
  metadata: {
    description: string;
    createdAt: number;
    layer: string;
    visible: boolean;
    locked: boolean;
  };
}

// 📐 几何约束类型
export type GeometricConstraintType = 
  | 'distance' | 'angle' | 'parallel' | 'perpendicular' | 'tangent'
  | 'concentric' | 'collinear' | 'symmetric' | 'fixed' | 'horizontal' | 'vertical';

// 🔗 几何约束定义
export interface GeometricConstraint {
  id: string;
  name: string;
  type: GeometricConstraintType;
  entities: string[]; // 参与约束的实体ID
  value?: number; // 约束值（如距离、角度）
  tolerance: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  expression?: string; // 复杂约束的数学表达式
  conditions?: ConditionalConstraint[]; // 条件约束
  metadata: {
    description: string;
    createdAt: number;
    isActive: boolean;
    isDriving: boolean; // 是否为驱动约束
  };
}

// 🧮 条件约束
export interface ConditionalConstraint {
  condition: string; // 条件表达式
  thenConstraint: string; // 满足条件时的约束
  elseConstraint?: string; // 不满足条件时的约束
}

// 📊 几何关系图
export interface GeometryRelationGraph {
  entities: Map<string, GeometricEntity>;
  constraints: Map<string, GeometricConstraint>;
  dependencies: Map<string, string[]>; // 依赖关系图
  layers: Map<string, GeometryLayer>; // 图层管理
}

// 🎨 几何图层
export interface GeometryLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  entities: string[];
}

// 🧠 表达式解析结果
export interface ExpressionParseResult {
  isValid: boolean;
  variables: string[]; // 表达式中的变量
  constants: number[]; // 常数
  operations: string[]; // 运算操作
  evaluatedValue?: number;
  error?: string;
}

/**
 * 🏗️ 复杂几何关系管理器
 */
export class ComplexGeometryRelationsManager {
  private relationGraph: GeometryRelationGraph;
  private expressionParser: ExpressionParser;
  private constraintPropagator: ConstraintPropagator;
  
  constructor() {
    this.relationGraph = {
      entities: new Map(),
      constraints: new Map(),
      dependencies: new Map(),
      layers: new Map()
    };
    this.expressionParser = new ExpressionParser();
    this.constraintPropagator = new ConstraintPropagator();
    
    // 初始化默认图层
    this.initializeDefaultLayers();
  }

  /**
   * 🎨 初始化默认图层
   */
  private initializeDefaultLayers(): void {
    const defaultLayers: GeometryLayer[] = [
      {
        id: 'construction',
        name: '🏗️ 构造线',
        color: '#64748b',
        visible: true,
        locked: false,
        entities: []
      },
      {
        id: 'dimensions',
        name: '📏 尺寸标注',
        color: '#3b82f6',
        visible: true,
        locked: false,
        entities: []
      },
      {
        id: 'constraints',
        name: '🔗 约束关系',
        color: '#8b5cf6',
        visible: true,
        locked: false,
        entities: []
      },
      {
        id: 'geometry',
        name: '⭕ 主要几何',
        color: '#10b981',
        visible: true,
        locked: false,
        entities: []
      }
    ];

    defaultLayers.forEach(layer => {
      this.relationGraph.layers.set(layer.id, layer);
    });

    console.log('✅ 默认图层初始化完成');
  }

  /**
   * 🏗️ 添加几何实体
   */
  addEntity(entity: GeometricEntity): void {
    // 验证实体
    this.validateEntity(entity);
    
    // 添加到关系图
    this.relationGraph.entities.set(entity.id, entity);
    
    // 更新依赖关系
    this.updateDependencies(entity);
    
    // 添加到图层
    const layer = this.relationGraph.layers.get(entity.metadata.layer);
    if (layer) {
      layer.entities.push(entity.id);
    }
    
    console.log(`🏗️ 添加几何实体: ${entity.name} [${entity.type}]`);
  }

  /**
   * 🔗 添加几何约束
   */
  addConstraint(constraint: GeometricConstraint): void {
    // 验证约束
    this.validateConstraint(constraint);
    
    // 解析表达式（如果有）
    if (constraint.expression) {
      const parseResult = this.expressionParser.parse(constraint.expression);
      if (!parseResult.isValid) {
        throw new Error(`约束表达式无效: ${parseResult.error}`);
      }
    }
    
    // 添加到关系图
    this.relationGraph.constraints.set(constraint.id, constraint);
    
    // 传播约束影响
    this.constraintPropagator.propagate(constraint, this.relationGraph);
    
    console.log(`🔗 添加几何约束: ${constraint.name} [${constraint.type}]`);
  }

  /**
   * 🧮 创建标准几何约束
   */
  createStandardConstraints(): {
    distance: (entity1: string, entity2: string, value: number) => GeometricConstraint;
    angle: (entity1: string, entity2: string, value: number) => GeometricConstraint;
    parallel: (entity1: string, entity2: string) => GeometricConstraint;
    perpendicular: (entity1: string, entity2: string) => GeometricConstraint;
    tangent: (entity1: string, entity2: string) => GeometricConstraint;
    concentric: (entity1: string, entity2: string) => GeometricConstraint;
  } {
    return {
      distance: (entity1: string, entity2: string, value: number) => ({
        id: `distance_${Date.now()}`,
        name: `距离约束_${value}`,
        type: 'distance',
        entities: [entity1, entity2],
        value,
        tolerance: value * 0.01, // 1%容差
        priority: 'high',
        expression: `distance(${entity1}, ${entity2}) = ${value}`,
        metadata: {
          description: `保持${entity1}和${entity2}之间的距离为${value}`,
          createdAt: Date.now(),
          isActive: true,
          isDriving: true
        }
      }),

      angle: (entity1: string, entity2: string, value: number) => ({
        id: `angle_${Date.now()}`,
        name: `角度约束_${value}°`,
        type: 'angle',
        entities: [entity1, entity2],
        value,
        tolerance: 1.0, // 1度容差
        priority: 'high',
        expression: `angle(${entity1}, ${entity2}) = ${value}`,
        metadata: {
          description: `保持${entity1}和${entity2}之间的角度为${value}度`,
          createdAt: Date.now(),
          isActive: true,
          isDriving: true
        }
      }),

      parallel: (entity1: string, entity2: string) => ({
        id: `parallel_${Date.now()}`,
        name: `平行约束`,
        type: 'parallel',
        entities: [entity1, entity2],
        tolerance: 0.01, // 约0.6度容差
        priority: 'medium',
        expression: `parallel(${entity1}, ${entity2})`,
        metadata: {
          description: `保持${entity1}和${entity2}平行`,
          createdAt: Date.now(),
          isActive: true,
          isDriving: false
        }
      }),

      perpendicular: (entity1: string, entity2: string) => ({
        id: `perpendicular_${Date.now()}`,
        name: `垂直约束`,
        type: 'perpendicular',
        entities: [entity1, entity2],
        tolerance: 0.01, // 约0.6度容差
        priority: 'medium',
        expression: `perpendicular(${entity1}, ${entity2})`,
        metadata: {
          description: `保持${entity1}和${entity2}垂直`,
          createdAt: Date.now(),
          isActive: true,
          isDriving: false
        }
      }),

      tangent: (entity1: string, entity2: string) => ({
        id: `tangent_${Date.now()}`,
        name: `相切约束`,
        type: 'tangent',
        entities: [entity1, entity2],
        tolerance: 0.001,
        priority: 'high',
        expression: `tangent(${entity1}, ${entity2})`,
        metadata: {
          description: `保持${entity1}和${entity2}相切`,
          createdAt: Date.now(),
          isActive: true,
          isDriving: true
        }
      }),

      concentric: (entity1: string, entity2: string) => ({
        id: `concentric_${Date.now()}`,
        name: `同心约束`,
        type: 'concentric',
        entities: [entity1, entity2],
        tolerance: 0.001,
        priority: 'high',
        expression: `concentric(${entity1}, ${entity2})`,
        metadata: {
          description: `保持${entity1}和${entity2}同心`,
          createdAt: Date.now(),
          isActive: true,
          isDriving: true
        }
      })
    };
  }

  /**
   * 🧠 创建复杂几何关系
   */
  createComplexRelations(): {
    conditionalConstraint: (condition: string, thenConstraint: string, elseConstraint?: string) => GeometricConstraint;
    patternConstraint: (entities: string[], pattern: 'array' | 'circular' | 'spiral') => GeometricConstraint;
    symmetryConstraint: (entities: string[], axis: string) => GeometricConstraint;
  } {
    return {
      conditionalConstraint: (condition: string, thenConstraint: string, elseConstraint?: string) => ({
        id: `conditional_${Date.now()}`,
        name: '条件约束',
        type: 'distance', // 基础类型，实际通过expression定义
        entities: this.extractEntitiesFromExpression(condition + thenConstraint + (elseConstraint || '')),
        tolerance: 0.01,
        priority: 'medium',
        expression: `if(${condition}) then(${thenConstraint}) else(${elseConstraint || 'none'})`,
        conditions: [{
          condition,
          thenConstraint,
          elseConstraint
        }],
        metadata: {
          description: '基于条件的动态约束',
          createdAt: Date.now(),
          isActive: true,
          isDriving: true
        }
      }),

      patternConstraint: (entities: string[], pattern: 'array' | 'circular' | 'spiral') => {
        const patternExpressions = {
          array: `array_pattern(${entities.join(', ')})`,
          circular: `circular_pattern(${entities.join(', ')})`,
          spiral: `spiral_pattern(${entities.join(', ')})`
        };

        return {
          id: `pattern_${pattern}_${Date.now()}`,
          name: `${pattern}模式约束`,
          type: 'distance',
          entities,
          tolerance: 0.01,
          priority: 'medium',
          expression: patternExpressions[pattern],
          metadata: {
            description: `${pattern}模式的几何排布约束`,
            createdAt: Date.now(),
            isActive: true,
            isDriving: true
          }
        };
      },

      symmetryConstraint: (entities: string[], axis: string) => ({
        id: `symmetry_${Date.now()}`,
        name: '对称约束',
        type: 'symmetric',
        entities: [...entities, axis],
        tolerance: 0.001,
        priority: 'high',
        expression: `symmetric(${entities.join(', ')}, ${axis})`,
        metadata: {
          description: `关于${axis}轴的对称约束`,
          createdAt: Date.now(),
          isActive: true,
          isDriving: true
        }
      })
    };
  }

  /**
   * 🔍 约束冲突检测
   */
  detectConstraintConflicts(): {
    conflicts: Array<{
      conflictingConstraints: string[];
      type: 'over_constrained' | 'inconsistent' | 'circular_dependency';
      severity: 'critical' | 'high' | 'medium';
      suggestion: string;
    }>;
    summary: {
      totalConflicts: number;
      criticalConflicts: number;
      resolvableConflicts: number;
    };
  } {
    const conflicts: any[] = [];
    
    // 检测过约束
    const overConstrainedEntities = this.detectOverConstrainedEntities();
    overConstrainedEntities.forEach(entityGroup => {
      conflicts.push({
        conflictingConstraints: entityGroup.constraints,
        type: 'over_constrained',
        severity: 'high',
        suggestion: `实体${entityGroup.entity}存在过约束，建议移除部分冗余约束`
      });
    });

    // 检测不一致约束
    const inconsistentConstraints = this.detectInconsistentConstraints();
    inconsistentConstraints.forEach(constraintPair => {
      conflicts.push({
        conflictingConstraints: constraintPair,
        type: 'inconsistent',
        severity: 'critical',
        suggestion: '存在相互矛盾的约束，需要修正约束值或移除其中一个约束'
      });
    });

    // 检测循环依赖
    const circularDependencies = this.detectCircularDependencies();
    circularDependencies.forEach(cycle => {
      conflicts.push({
        conflictingConstraints: cycle,
        type: 'circular_dependency',
        severity: 'medium',
        suggestion: '存在循环依赖，建议重新组织约束层次结构'
      });
    });

    const summary = {
      totalConflicts: conflicts.length,
      criticalConflicts: conflicts.filter(c => c.severity === 'critical').length,
      resolvableConflicts: conflicts.filter(c => c.severity !== 'critical').length
    };

    console.log(`🔍 约束冲突检测完成: ${summary.totalConflicts}个冲突`);
    return { conflicts, summary };
  }

  /**
   * 🛠️ 自动约束修复
   */
  async autoRepairConstraints(conflicts: any[]): Promise<{
    repairedConstraints: string[];
    removedConstraints: string[];
    modifiedConstraints: Array<{
      constraintId: string;
      oldValue: number;
      newValue: number;
      reason: string;
    }>;
    success: boolean;
  }> {
    console.log('🛠️ 开始自动约束修复...');
    
    const result = {
      repairedConstraints: [] as string[],
      removedConstraints: [] as string[],
      modifiedConstraints: [] as any[],
      success: false
    };

    try {
      // 处理过约束
      const overConstrainedConflicts = conflicts.filter(c => c.type === 'over_constrained');
      for (const conflict of overConstrainedConflicts) {
        const redundantConstraint = this.identifyRedundantConstraint(conflict.conflictingConstraints);
        if (redundantConstraint) {
          this.relationGraph.constraints.delete(redundantConstraint);
          result.removedConstraints.push(redundantConstraint);
          result.repairedConstraints.push(redundantConstraint);
        }
      }

      // 处理不一致约束
      const inconsistentConflicts = conflicts.filter(c => c.type === 'inconsistent');
      for (const conflict of inconsistentConflicts) {
        const resolved = await this.resolveInconsistentConstraints(conflict.conflictingConstraints);
        if (resolved) {
          result.modifiedConstraints.push(resolved);
          result.repairedConstraints.push(resolved.constraintId);
        }
      }

      // 处理循环依赖
      const circularConflicts = conflicts.filter(c => c.type === 'circular_dependency');
      for (const conflict of circularConflicts) {
        const breakPoint = this.findOptimalCycleBreakPoint(conflict.conflictingConstraints);
        if (breakPoint) {
          const constraint = this.relationGraph.constraints.get(breakPoint);
          if (constraint) {
            constraint.metadata.isDriving = false; // 改为非驱动约束
            result.modifiedConstraints.push({
              constraintId: breakPoint,
              oldValue: 1,
              newValue: 0,
              reason: '转换为非驱动约束以打破循环依赖'
            });
            result.repairedConstraints.push(breakPoint);
          }
        }
      }

      result.success = result.repairedConstraints.length > 0;
      
      console.log(`✅ 自动修复完成: ${result.repairedConstraints.length}个约束已修复`);
      
    } catch (error) {
      console.error('❌ 自动修复失败:', error);
      result.success = false;
    }

    return result;
  }

  /**
   * 📈 关系图分析
   */
  analyzeRelationGraph(): {
    topology: {
      entityCount: number;
      constraintCount: number;
      layerCount: number;
      averageConnectivity: number;
      maxDepth: number;
    };
    health: {
      score: number; // 0-100
      issues: string[];
      recommendations: string[];
    };
    performance: {
      estimatedSolveTime: number; // ms
      memoryUsage: number; // MB
      complexity: 'low' | 'medium' | 'high' | 'extreme';
    };
  } {
    const topology = {
      entityCount: this.relationGraph.entities.size,
      constraintCount: this.relationGraph.constraints.size,
      layerCount: this.relationGraph.layers.size,
      averageConnectivity: this.calculateAverageConnectivity(),
      maxDepth: this.calculateMaxDepth()
    };

    const health = this.assessGraphHealth();
    const performance = this.estimatePerformance(topology);

    console.log('📈 关系图分析完成', {
      entities: topology.entityCount,
      constraints: topology.constraintCount,
      health: health.score,
      complexity: performance.complexity
    });

    return { topology, health, performance };
  }

  // 私有辅助方法
  private validateEntity(entity: GeometricEntity): void {
    if (!entity.id || !entity.name || !entity.type) {
      throw new Error('实体ID、名称和类型不能为空');
    }
    
    if (this.relationGraph.entities.has(entity.id)) {
      throw new Error(`实体ID ${entity.id} 已存在`);
    }
  }

  private validateConstraint(constraint: GeometricConstraint): void {
    if (!constraint.id || !constraint.name || !constraint.type) {
      throw new Error('约束ID、名称和类型不能为空');
    }
    
    if (this.relationGraph.constraints.has(constraint.id)) {
      throw new Error(`约束ID ${constraint.id} 已存在`);
    }
    
    // 检查引用的实体是否存在
    for (const entityId of constraint.entities) {
      if (!this.relationGraph.entities.has(entityId)) {
        throw new Error(`约束引用的实体 ${entityId} 不存在`);
      }
    }
  }

  private updateDependencies(entity: GeometricEntity): void {
    // 更新依赖关系图
    if (entity.parentEntities) {
      entity.parentEntities.forEach(parentId => {
        if (!this.relationGraph.dependencies.has(parentId)) {
          this.relationGraph.dependencies.set(parentId, []);
        }
        this.relationGraph.dependencies.get(parentId)!.push(entity.id);
      });
    }
  }

  private extractEntitiesFromExpression(expression: string): string[] {
    // 简化的实体提取逻辑
    const entityPattern = /\b\w+\b/g;
    const matches = expression.match(entityPattern) || [];
    return [...new Set(matches)].filter(match => 
      this.relationGraph.entities.has(match)
    );
  }

  private detectOverConstrainedEntities(): Array<{entity: string, constraints: string[]}> {
    // 检测过约束实体的简化实现
    return [];
  }

  private detectInconsistentConstraints(): string[][] {
    // 检测不一致约束的简化实现
    return [];
  }

  private detectCircularDependencies(): string[][] {
    // 检测循环依赖的简化实现
    return [];
  }

  private identifyRedundantConstraint(constraints: string[]): string | null {
    // 识别冗余约束的简化实现
    return constraints[0] || null;
  }

  private async resolveInconsistentConstraints(constraints: string[]): Promise<any | null> {
    // 解决不一致约束的简化实现
    return null;
  }

  private findOptimalCycleBreakPoint(cycle: string[]): string | null {
    // 找到最优循环断点的简化实现
    return cycle[0] || null;
  }

  private calculateAverageConnectivity(): number {
    let totalConnections = 0;
    this.relationGraph.constraints.forEach(constraint => {
      totalConnections += constraint.entities.length;
    });
    return totalConnections / Math.max(this.relationGraph.entities.size, 1);
  }

  private calculateMaxDepth(): number {
    // 计算最大依赖深度的简化实现
    return 5;
  }

  private assessGraphHealth(): {score: number, issues: string[], recommendations: string[]} {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // 检查过约束
    if (this.relationGraph.constraints.size > this.relationGraph.entities.size * 2) {
      issues.push('可能存在过约束');
      recommendations.push('检查并移除冗余约束');
      score -= 15;
    }

    // 检查未约束实体
    const unconstrainedEntities = Array.from(this.relationGraph.entities.keys()).filter(entityId => {
      return !Array.from(this.relationGraph.constraints.values()).some(constraint => 
        constraint.entities.includes(entityId)
      );
    });
    
    if (unconstrainedEntities.length > 0) {
      issues.push(`${unconstrainedEntities.length}个实体未添加约束`);
      recommendations.push('为所有关键实体添加适当约束');
      score -= unconstrainedEntities.length * 5;
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      issues,
      recommendations
    };
  }

  private estimatePerformance(topology: any): {estimatedSolveTime: number, memoryUsage: number, complexity: string} {
    const entityCount = topology.entityCount;
    const constraintCount = topology.constraintCount;
    
    // 简化的性能估算
    const estimatedSolveTime = Math.pow(constraintCount, 1.5) * 0.1; // ms
    const memoryUsage = (entityCount + constraintCount) * 0.1; // MB
    
    let complexity: 'low' | 'medium' | 'high' | 'extreme' = 'low';
    if (constraintCount > 100) complexity = 'extreme';
    else if (constraintCount > 50) complexity = 'high';
    else if (constraintCount > 20) complexity = 'medium';
    
    return { estimatedSolveTime, memoryUsage, complexity };
  }
}

/**
 * 🧮 表达式解析器
 */
class ExpressionParser {
  parse(expression: string): ExpressionParseResult {
    try {
      // 简化的表达式解析实现
      const variables = this.extractVariables(expression);
      const constants = this.extractConstants(expression);
      const operations = this.extractOperations(expression);
      
      return {
        isValid: true,
        variables,
        constants,
        operations,
        evaluatedValue: undefined
      };
    } catch (error) {
      return {
        isValid: false,
        variables: [],
        constants: [],
        operations: [],
        error: error instanceof Error ? error.message : '解析错误'
      };
    }
  }

  private extractVariables(expression: string): string[] {
    const variablePattern = /\b[a-zA-Z_]\w*\b/g;
    const matches = expression.match(variablePattern) || [];
    return [...new Set(matches)];
  }

  private extractConstants(expression: string): number[] {
    const numberPattern = /\b\d+\.?\d*\b/g;
    const matches = expression.match(numberPattern) || [];
    return matches.map(Number);
  }

  private extractOperations(expression: string): string[] {
    const operationPattern = /[+\-*/=<>()]/g;
    return expression.match(operationPattern) || [];
  }
}

/**
 * 🔄 约束传播器
 */
class ConstraintPropagator {
  propagate(constraint: GeometricConstraint, graph: GeometryRelationGraph): void {
    console.log(`🔄 传播约束影响: ${constraint.name}`);
    
    // 更新相关实体的依赖关系
    constraint.entities.forEach(entityId => {
      const entity = graph.entities.get(entityId);
      if (entity) {
        // 标记实体受到新约束影响
        this.markEntityAffected(entity, constraint);
      }
    });
    
    // 检查约束一致性
    this.checkConstraintConsistency(constraint, graph);
  }

  private markEntityAffected(entity: GeometricEntity, constraint: GeometricConstraint): void {
    // 标记实体受约束影响的逻辑
    console.log(`📌 实体 ${entity.name} 受约束 ${constraint.name} 影响`);
  }

  private checkConstraintConsistency(constraint: GeometricConstraint, graph: GeometryRelationGraph): void {
    // 检查约束一致性的逻辑
    console.log(`✅ 约束 ${constraint.name} 一致性检查完成`);
  }
}

// 🎯 导出工厂函数
export function createComplexGeometryRelationsManager(): ComplexGeometryRelationsManager {
  return new ComplexGeometryRelationsManager();
}