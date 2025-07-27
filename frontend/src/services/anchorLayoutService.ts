/**
 * 锚杆系统自动布置算法
 * 支持多达10层锚杆的参数化布置和腰梁系统
 * 包含预应力计算和自动优化功能
 */

export interface Point3D {
  x: number;
  y: number; 
  z: number;
}

export interface AnchorParameters {
  length: number;         // 锚杆长度 (m)
  diameter: number;       // 锚杆直径 (mm)
  angle: number;          // 倾角 (度)
  preStress: number;      // 预应力 (kN)
  spacing: number;        // 间距 (m)
  anchorType: 'single' | 'multi_segment'; // 锚杆类型
  segments?: number;      // 多段锚杆段数
  groutDiameter?: number; // 注浆直径 (mm)
}

export interface WaleBeamParameters {
  width: number;          // 腰梁宽度 (mm)
  height: number;         // 腰梁高度 (mm)
  length: number;         // 腰梁长度 (m)
  material: 'concrete' | 'steel'; // 腰梁材料
  reinforcement?: {       // 钢筋配置
    mainBars: number;     // 主筋数量
    stirrups: number;     // 箍筋间距 (mm)
  };
}

export interface AnchorLevelConfig {
  levelId: number;        // 层号 (1-10)
  elevation: number;      // 标高 (m)
  anchorParams: AnchorParameters;
  waleBeamParams: WaleBeamParameters;
  enabled: boolean;
  excavationStage?: number; // 对应开挖阶段
}

export interface AnchorSystemConfig {
  levels: AnchorLevelConfig[];  // 最多10层
  globalConstraints: {
    minSpacing: number;         // 最小间距 (m)
    maxSpacing: number;         // 最大间距 (m)
    wallClearance: number;      // 墙体间隙 (m)
    verticalSpacing: number;    // 竖向间距 (m)
  };
  diaphragmWall: {
    coordinates: Point3D[];     // 地连墙坐标
    thickness: number;          // 地连墙厚度 (m)
    topElevation: number;       // 墙顶标高 (m)
    bottomElevation: number;    // 墙底标高 (m)
  };
  layoutStrategy: 'uniform' | 'adaptive' | 'optimized';
  qualityControl: {
    checkInterference: boolean; // 检查锚杆干涉
    optimizeSpacing: boolean;   // 优化间距
    validateStability: boolean; // 稳定性验证
  };
}

export interface AnchorGeometry {
  id: string;
  levelId: number;
  segmentId?: number;     // 多段锚杆段号
  position: Point3D;      // 锚杆起点
  direction: Point3D;     // 方向向量
  endPosition: Point3D;   // 锚杆终点
  length: number;
  diameter: number;
  angle: number;
  preStress: number;
  groutZone?: {           // 注浆区域
    startDistance: number;
    endDistance: number;
    diameter: number;
  };
}

export interface WaleBeamGeometry {
  id: string;
  levelId: number;
  startPoint: Point3D;
  endPoint: Point3D;
  crossSection: {
    width: number;
    height: number;
  };
  material: string;
  connectedAnchors: string[]; // 连接的锚杆ID
}

export interface AnchorSystemResult {
  anchors: AnchorGeometry[];
  waleBeams: WaleBeamGeometry[];
  statistics: {
    totalAnchors: number;
    totalWaleBeams: number;
    anchorsByLevel: Record<number, number>;
    totalAnchorLength: number;
    totalWaleBeamLength: number;
    averageSpacing: number;
  };
  qualityReport: {
    interferenceIssues: string[];
    spacingWarnings: string[];
    stabilityScore: number;
    recommendations: string[];
  };
}

class AnchorLayoutService {
  private readonly MAX_LEVELS = 10;
  private readonly MIN_SPACING = 1.5; // 最小间距 1.5m
  private readonly MAX_SPACING = 3.5; // 最大间距 3.5m

  /**
   * 生成完整的10层锚杆系统布置
   */
  async generateAnchorLayout(config: AnchorSystemConfig): Promise<AnchorSystemResult> {
    // 验证配置
    this.validateConfig(config);
    
    const enabledLevels = config.levels
      .filter(level => level.enabled)
      .sort((a, b) => b.elevation - a.elevation); // 按标高从高到低排序

    if (enabledLevels.length === 0) {
      throw new Error('至少需要启用一层锚杆');
    }

    // 生成锚杆
    const anchors: AnchorGeometry[] = [];
    const waleBeams: WaleBeamGeometry[] = [];

    for (const level of enabledLevels) {
      const levelAnchors = await this.generateLevelAnchors(level, config);
      const levelWaleBeams = await this.generateLevelWaleBeams(level, config, levelAnchors);
      
      anchors.push(...levelAnchors);
      waleBeams.push(...levelWaleBeams);
    }

    // 质量检查
    const qualityReport = await this.performQualityCheck(anchors, waleBeams, config);
    
    // 优化布置
    if (config.qualityControl.optimizeSpacing) {
      await this.optimizeAnchorSpacing(anchors, config);
    }

    // 统计计算
    const statistics = this.calculateStatistics(anchors, waleBeams);

    return {
      anchors,
      waleBeams,
      statistics,
      qualityReport
    };
  }

  /**
   * 生成单层锚杆
   */
  private async generateLevelAnchors(
    level: AnchorLevelConfig, 
    config: AnchorSystemConfig
  ): Promise<AnchorGeometry[]> {
    const anchors: AnchorGeometry[] = [];
    const wallCoords = config.diaphragmWall.coordinates;
    const spacing = this.calculateOptimalSpacing(level.anchorParams.spacing, config);

    for (let i = 0; i < wallCoords.length - 1; i++) {
      const segmentAnchors = await this.generateSegmentAnchors(
        wallCoords[i], 
        wallCoords[i + 1], 
        level, 
        spacing, 
        i
      );
      anchors.push(...segmentAnchors);
    }

    // 如果是多段锚杆，生成所有段
    if (level.anchorParams.anchorType === 'multi_segment' && level.anchorParams.segments) {
      return this.generateMultiSegmentAnchors(anchors, level);
    }

    return anchors;
  }

  /**
   * 生成墙段锚杆
   */
  private async generateSegmentAnchors(
    start: Point3D,
    end: Point3D,
    level: AnchorLevelConfig,
    spacing: number,
    segmentIndex: number
  ): Promise<AnchorGeometry[]> {
    const anchors: AnchorGeometry[] = [];
    
    const segmentLength = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    
    const anchorCount = Math.max(1, Math.floor(segmentLength / spacing));
    const actualSpacing = segmentLength / anchorCount;

    // 计算墙体法向量
    const wallDirection = {
      x: end.x - start.x,
      y: end.y - start.y,
      z: 0
    };
    const wallNormal = {
      x: -wallDirection.y,
      y: wallDirection.x,
      z: 0
    };
    const normalLength = Math.sqrt(wallNormal.x ** 2 + wallNormal.y ** 2);
    wallNormal.x /= normalLength;
    wallNormal.y /= normalLength;

    for (let j = 0; j < anchorCount; j++) {
      const t = (j + 0.5) / anchorCount;
      const wallPosition = {
        x: start.x + t * (end.x - start.x),
        y: start.y + t * (end.y - start.y),
        z: level.elevation
      };

      // 锚杆起点（考虑墙体厚度）
      const position = {
        x: wallPosition.x + wallNormal.x * (config.diaphragmWall.thickness / 2),
        y: wallPosition.y + wallNormal.y * (config.diaphragmWall.thickness / 2),
        z: level.elevation
      };

      // 锚杆方向（考虑倾角）
      const angleRad = level.anchorParams.angle * Math.PI / 180;
      const direction = {
        x: wallNormal.x * Math.cos(angleRad),
        y: wallNormal.y * Math.cos(angleRad),
        z: -Math.sin(angleRad)
      };

      // 锚杆终点
      const endPosition = {
        x: position.x + direction.x * level.anchorParams.length,
        y: position.y + direction.y * level.anchorParams.length,
        z: position.z + direction.z * level.anchorParams.length
      };

      anchors.push({
        id: `anchor_L${level.levelId}_S${segmentIndex}_${j + 1}`,
        levelId: level.levelId,
        position,
        direction,
        endPosition,
        length: level.anchorParams.length,
        diameter: level.anchorParams.diameter,
        angle: level.anchorParams.angle,
        preStress: level.anchorParams.preStress,
        groutZone: level.anchorParams.groutDiameter ? {
          startDistance: level.anchorParams.length * 0.6, // 注浆段从60%开始
          endDistance: level.anchorParams.length,
          diameter: level.anchorParams.groutDiameter
        } : undefined
      });
    }

    return anchors;
  }

  /**
   * 生成多段锚杆
   */
  private generateMultiSegmentAnchors(
    baseAnchors: AnchorGeometry[],
    level: AnchorLevelConfig
  ): AnchorGeometry[] {
    const multiSegmentAnchors: AnchorGeometry[] = [];
    const segments = level.anchorParams.segments || 1;
    const segmentLength = level.anchorParams.length / segments;

    baseAnchors.forEach(baseAnchor => {
      for (let seg = 0; seg < segments; seg++) {
        const segmentStart = {
          x: baseAnchor.position.x + baseAnchor.direction.x * segmentLength * seg,
          y: baseAnchor.position.y + baseAnchor.direction.y * segmentLength * seg,
          z: baseAnchor.position.z + baseAnchor.direction.z * segmentLength * seg
        };

        const segmentEnd = {
          x: segmentStart.x + baseAnchor.direction.x * segmentLength,
          y: segmentStart.y + baseAnchor.direction.y * segmentLength,
          z: segmentStart.z + baseAnchor.direction.z * segmentLength
        };

        multiSegmentAnchors.push({
          ...baseAnchor,
          id: `${baseAnchor.id}_seg${seg + 1}`,
          segmentId: seg + 1,
          position: segmentStart,
          endPosition: segmentEnd,
          length: segmentLength
        });
      }
    });

    return multiSegmentAnchors;
  }

  /**
   * 生成腰梁系统
   */
  private async generateLevelWaleBeams(
    level: AnchorLevelConfig,
    config: AnchorSystemConfig,
    anchors: AnchorGeometry[]
  ): Promise<WaleBeamGeometry[]> {
    const waleBeams: WaleBeamGeometry[] = [];
    const wallCoords = config.diaphragmWall.coordinates;

    for (let i = 0; i < wallCoords.length - 1; i++) {
      const start = wallCoords[i];
      const end = wallCoords[i + 1];
      
      // 获取该段的锚杆
      const segmentAnchors = anchors.filter(anchor => 
        anchor.id.includes(`_S${i}_`)
      );

      const waleBeam: WaleBeamGeometry = {
        id: `walebeam_L${level.levelId}_S${i}`,
        levelId: level.levelId,
        startPoint: { ...start, z: level.elevation },
        endPoint: { ...end, z: level.elevation },
        crossSection: {
          width: level.waleBeamParams.width,
          height: level.waleBeamParams.height
        },
        material: level.waleBeamParams.material,
        connectedAnchors: segmentAnchors.map(a => a.id)
      };

      waleBeams.push(waleBeam);
    }

    return waleBeams;
  }

  /**
   * 计算最优间距
   */
  private calculateOptimalSpacing(
    requestedSpacing: number,
    config: AnchorSystemConfig
  ): number {
    const { minSpacing, maxSpacing } = config.globalConstraints;
    
    if (requestedSpacing < minSpacing) {
      console.warn(`锚杆间距 ${requestedSpacing}m 小于最小值 ${minSpacing}m，已调整`);
      return minSpacing;
    }
    
    if (requestedSpacing > maxSpacing) {
      console.warn(`锚杆间距 ${requestedSpacing}m 大于最大值 ${maxSpacing}m，已调整`);
      return maxSpacing;
    }
    
    return requestedSpacing;
  }

  /**
   * 质量检查
   */
  private async performQualityCheck(
    anchors: AnchorGeometry[],
    waleBeams: WaleBeamGeometry[],
    config: AnchorSystemConfig
  ): Promise<AnchorSystemResult['qualityReport']> {
    const interferenceIssues: string[] = [];
    const spacingWarnings: string[] = [];
    const recommendations: string[] = [];

    // 检查锚杆干涉
    if (config.qualityControl.checkInterference) {
      const interferences = this.checkAnchorInterference(anchors);
      interferenceIssues.push(...interferences);
    }

    // 检查间距合理性
    const spacingIssues = this.checkSpacingValidity(anchors, config);
    spacingWarnings.push(...spacingIssues);

    // 稳定性评分
    let stabilityScore = 1.0;
    if (interferenceIssues.length > 0) stabilityScore -= 0.3;
    if (spacingWarnings.length > 0) stabilityScore -= 0.2;
    if (anchors.length < 10) stabilityScore -= 0.1;

    // 生成建议
    if (stabilityScore < 0.8) {
      recommendations.push('建议增加锚杆数量或调整间距');
    }
    if (interferenceIssues.length > 0) {
      recommendations.push('建议调整锚杆角度以避免干涉');
    }

    return {
      interferenceIssues,
      spacingWarnings,
      stabilityScore: Math.max(0, stabilityScore),
      recommendations
    };
  }

  /**
   * 检查锚杆干涉
   */
  private checkAnchorInterference(anchors: AnchorGeometry[]): string[] {
    const issues: string[] = [];
    const MIN_CLEARANCE = 0.5; // 最小间隙 0.5m

    for (let i = 0; i < anchors.length - 1; i++) {
      for (let j = i + 1; j < anchors.length; j++) {
        const anchor1 = anchors[i];
        const anchor2 = anchors[j];

        // 检查同层锚杆水平间距
        if (anchor1.levelId === anchor2.levelId) {
          const distance = Math.sqrt(
            Math.pow(anchor1.position.x - anchor2.position.x, 2) +
            Math.pow(anchor1.position.y - anchor2.position.y, 2)
          );

          if (distance < MIN_CLEARANCE) {
            issues.push(`锚杆 ${anchor1.id} 和 ${anchor2.id} 间距过小: ${distance.toFixed(2)}m`);
          }
        }

        // 检查不同层锚杆垂直干涉
        if (anchor1.levelId !== anchor2.levelId) {
          const verticalDistance = Math.abs(anchor1.position.z - anchor2.position.z);
          const horizontalDistance = Math.sqrt(
            Math.pow(anchor1.position.x - anchor2.position.x, 2) +
            Math.pow(anchor1.position.y - anchor2.position.y, 2)
          );

          if (verticalDistance < 2.0 && horizontalDistance < 1.0) {
            issues.push(`锚杆 ${anchor1.id} 和 ${anchor2.id} 可能存在空间干涉`);
          }
        }
      }
    }

    return issues;
  }

  /**
   * 检查间距有效性
   */
  private checkSpacingValidity(
    anchors: AnchorGeometry[],
    config: AnchorSystemConfig
  ): string[] {
    const warnings: string[] = [];
    const { minSpacing, maxSpacing } = config.globalConstraints;

    // 按层分组
    const anchorsByLevel = anchors.reduce((acc, anchor) => {
      if (!acc[anchor.levelId]) acc[anchor.levelId] = [];
      acc[anchor.levelId].push(anchor);
      return acc;
    }, {} as Record<number, AnchorGeometry[]>);

    Object.entries(anchorsByLevel).forEach(([levelId, levelAnchors]) => {
      levelAnchors.sort((a, b) => a.position.x - b.position.x);

      for (let i = 0; i < levelAnchors.length - 1; i++) {
        const spacing = Math.sqrt(
          Math.pow(levelAnchors[i + 1].position.x - levelAnchors[i].position.x, 2) +
          Math.pow(levelAnchors[i + 1].position.y - levelAnchors[i].position.y, 2)
        );

        if (spacing < minSpacing * 0.9) {
          warnings.push(`第${levelId}层锚杆间距过小: ${spacing.toFixed(2)}m`);
        } else if (spacing > maxSpacing * 1.1) {
          warnings.push(`第${levelId}层锚杆间距过大: ${spacing.toFixed(2)}m`);
        }
      }
    });

    return warnings;
  }

  /**
   * 优化锚杆间距
   */
  private async optimizeAnchorSpacing(
    anchors: AnchorGeometry[],
    config: AnchorSystemConfig
  ): Promise<void> {
    console.log('🔧 开始优化锚杆间距布置...');
    
    // 按层优化
    const anchorsByLevel = anchors.reduce((acc, anchor) => {
      if (!acc[anchor.levelId]) acc[anchor.levelId] = [];
      acc[anchor.levelId].push(anchor);
      return acc;
    }, {} as Record<number, AnchorGeometry[]>);

    Object.values(anchorsByLevel).forEach(levelAnchors => {
      this.optimizeLevelSpacing(levelAnchors, config);
    });
  }

  /**
   * 优化单层间距
   */
  private optimizeLevelSpacing(
    anchors: AnchorGeometry[],
    config: AnchorSystemConfig
  ): void {
    const targetSpacing = (config.globalConstraints.minSpacing + config.globalConstraints.maxSpacing) / 2;
    
    // 简单的均匀化调整
    anchors.sort((a, b) => a.position.x - b.position.x);
    
    for (let i = 1; i < anchors.length - 1; i++) {
      const prev = anchors[i - 1];
      const curr = anchors[i];
      const next = anchors[i + 1];
      
      const prevDist = Math.sqrt(
        Math.pow(curr.position.x - prev.position.x, 2) +
        Math.pow(curr.position.y - prev.position.y, 2)
      );
      
      const nextDist = Math.sqrt(
        Math.pow(next.position.x - curr.position.x, 2) +
        Math.pow(next.position.y - curr.position.y, 2)
      );
      
      // 调整到目标间距
      if (Math.abs(prevDist - targetSpacing) > 0.2 || Math.abs(nextDist - targetSpacing) > 0.2) {
        const adjustment = (targetSpacing - prevDist) * 0.3;
        curr.position.x += adjustment;
        
        // 重新计算终点
        curr.endPosition.x = curr.position.x + curr.direction.x * curr.length;
        curr.endPosition.y = curr.position.y + curr.direction.y * curr.length;
        curr.endPosition.z = curr.position.z + curr.direction.z * curr.length;
      }
    }
  }

  /**
   * 计算统计信息
   */
  private calculateStatistics(
    anchors: AnchorGeometry[],
    waleBeams: WaleBeamGeometry[]
  ): AnchorSystemResult['statistics'] {
    const anchorsByLevel: Record<number, number> = {};
    let totalAnchorLength = 0;
    let totalWaleBeamLength = 0;

    // 锚杆统计
    anchors.forEach(anchor => {
      anchorsByLevel[anchor.levelId] = (anchorsByLevel[anchor.levelId] || 0) + 1;
      totalAnchorLength += anchor.length;
    });

    // 腰梁统计
    waleBeams.forEach(beam => {
      const length = Math.sqrt(
        Math.pow(beam.endPoint.x - beam.startPoint.x, 2) +
        Math.pow(beam.endPoint.y - beam.startPoint.y, 2)
      );
      totalWaleBeamLength += length;
    });

    // 平均间距计算
    let totalSpacings = 0;
    let spacingCount = 0;
    
    Object.values(anchorsByLevel).forEach(count => {
      if (count > 1) {
        spacingCount += count - 1;
      }
    });
    
    const averageSpacing = spacingCount > 0 ? totalAnchorLength / spacingCount / anchors.length : 0;

    return {
      totalAnchors: anchors.length,
      totalWaleBeams: waleBeams.length,
      anchorsByLevel,
      totalAnchorLength,
      totalWaleBeamLength,
      averageSpacing
    };
  }

  /**
   * 验证配置参数
   */
  private validateConfig(config: AnchorSystemConfig): void {
    if (config.levels.length > this.MAX_LEVELS) {
      throw new Error(`锚杆层数不能超过 ${this.MAX_LEVELS} 层`);
    }

    const enabledLevels = config.levels.filter(l => l.enabled);
    if (enabledLevels.length === 0) {
      throw new Error('至少需要启用一层锚杆');
    }

    // 验证标高顺序
    const elevations = enabledLevels.map(l => l.elevation).sort((a, b) => b - a);
    for (let i = 0; i < elevations.length - 1; i++) {
      if (elevations[i] - elevations[i + 1] < config.globalConstraints.verticalSpacing) {
        throw new Error('锚杆层间距过小，请调整标高设置');
      }
    }

    // 验证墙体参数
    if (config.diaphragmWall.coordinates.length < 2) {
      throw new Error('地连墙坐标点至少需要2个');
    }
  }

  /**
   * 获取锚杆系统配置模板
   */
  getDefaultConfig(): AnchorSystemConfig {
    const levels: AnchorLevelConfig[] = [];
    
    // 生成10层默认配置
    for (let i = 1; i <= 10; i++) {
      levels.push({
        levelId: i,
        elevation: -2 * i, // 每层间隔2m
        anchorParams: {
          length: 15.0,
          diameter: 32,
          angle: 15,
          preStress: 200,
          spacing: 2.5,
          anchorType: 'single',
          groutDiameter: 130
        },
        waleBeamParams: {
          width: 300,
          height: 400,
          length: 6.0,
          material: 'concrete',
          reinforcement: {
            mainBars: 8,
            stirrups: 200
          }
        },
        enabled: i <= 6, // 默认启用前6层
        excavationStage: Math.ceil(i / 2)
      });
    }

    return {
      levels,
      globalConstraints: {
        minSpacing: 1.5,
        maxSpacing: 3.5,
        wallClearance: 0.5,
        verticalSpacing: 1.8
      },
      diaphragmWall: {
        coordinates: [
          { x: 0, y: 0, z: 0 },
          { x: 50, y: 0, z: 0 },
          { x: 50, y: 30, z: 0 },
          { x: 0, y: 30, z: 0 },
          { x: 0, y: 0, z: 0 } // 闭合
        ],
        thickness: 0.8,
        topElevation: 0,
        bottomElevation: -25
      },
      layoutStrategy: 'uniform',
      qualityControl: {
        checkInterference: true,
        optimizeSpacing: true,
        validateStability: true
      }
    };
  }
}

export const anchorLayoutService = new AnchorLayoutService();

// 便捷函数导出
export const generateTenLayerAnchorSystem = (config: AnchorSystemConfig) =>
  anchorLayoutService.generateAnchorLayout(config);

export const getDefaultAnchorConfig = () =>
  anchorLayoutService.getDefaultConfig();

export const createAnchorLevel = (
  levelId: number,
  elevation: number,
  anchorParams: Partial<AnchorParameters> = {},
  waleBeamParams: Partial<WaleBeamParameters> = {}
): AnchorLevelConfig => ({
  levelId,
  elevation,
  anchorParams: {
    length: 15.0,
    diameter: 32,
    angle: 15,
    preStress: 200,
    spacing: 2.5,
    anchorType: 'single',
    groutDiameter: 130,
    ...anchorParams
  },
  waleBeamParams: {
    width: 300,
    height: 400,
    length: 6.0,
    material: 'concrete',
    reinforcement: {
      mainBars: 8,
      stirrups: 200
    },
    ...waleBeamParams
  },
  enabled: true,
  excavationStage: Math.ceil(levelId / 2)
});

export const createMultiSegmentAnchor = (
  baseParams: AnchorParameters,
  segments: number
): AnchorParameters => ({
  ...baseParams,
  anchorType: 'multi_segment',
  segments
});

export default anchorLayoutService;