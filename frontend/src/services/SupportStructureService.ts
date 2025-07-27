/**
 * 支护结构生成服务 - 2号专家的支护结构核心算法接口
 * 0号架构师实现
 */

import {
  GeometryModel,
  DiaphragmWallConfig,
  PileSystemConfig,
  AnchorConfig,
  SteelSupportConfig,
  ValidationResult,
  ConflictInfo,
  Point3D,
  BoundingBox
} from './GeometryArchitectureService';

export class SupportStructureService {
  private initialized = false;
  private structureCache = new Map<string, GeometryModel>();

  constructor() {}

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🏗️ 支护结构服务初始化中...');
    this.initialized = true;
    console.log('✅ 支护结构服务初始化完成');
  }

  // ============== 地连墙几何生成 ==============
  public async generateDiaphragmWall(config: DiaphragmWallConfig): Promise<GeometryModel> {
    console.log('🧱 生成地下连续墙...');
    
    const vertices: number[] = [];
    const faces: number[] = [];
    
    // 简化的地连墙几何：矩形墙体
    const halfThickness = config.thickness / 2;
    
    // 8个顶点（长方体）
    const v = [
      // 底面
      [-halfThickness, 0, -config.depth],
      [halfThickness, 0, -config.depth], 
      [halfThickness, config.length, -config.depth],
      [-halfThickness, config.length, -config.depth],
      // 顶面
      [-halfThickness, 0, 0],
      [halfThickness, 0, 0],
      [halfThickness, config.length, 0], 
      [-halfThickness, config.length, 0]
    ];
    
    vertices.push(...v.flat());
    
    // 12个三角形面片
    const f = [
      // 底面
      0,1,2, 0,2,3,
      // 顶面  
      4,6,5, 4,7,6,
      // 侧面
      0,4,1, 1,4,5,
      1,5,2, 2,5,6,
      2,6,3, 3,6,7,
      3,7,0, 0,7,4
    ];
    
    faces.push(...f);

    return this.createStructureModel('diaphragm_wall', vertices, faces, config);
  }

  // ============== 排桩系统生成 ==============
  public async generatePileSystem(config: PileSystemConfig): Promise<GeometryModel> {
    console.log('🔨 生成排桩系统...');
    
    const vertices: number[] = [];
    const faces: number[] = [];
    let vertexOffset = 0;

    // 计算桩数量
    const pileCount = Math.floor(config.length / config.spacing) + 1;
    
    // 生成每根桩
    for (let i = 0; i < pileCount; i++) {
      const x = i * config.spacing;
      const pileMesh = this.createCylinder(
        { x, y: 0, z: -config.length / 2 },
        config.diameter / 2,
        config.length,
        12
      );
      
      // 添加到总网格
      for (let j = 0; j < pileMesh.vertices.length; j++) {
        vertices.push(pileMesh.vertices[j]);
      }
      
      for (let j = 0; j < pileMesh.faces.length; j++) {
        faces.push(pileMesh.faces[j] + vertexOffset);
      }
      
      vertexOffset += pileMesh.vertices.length / 3;
    }

    // 添加冠梁
    if (config.crownBeam) {
      const beamMesh = this.createCrownBeam(config);
      
      for (let j = 0; j < beamMesh.vertices.length; j++) {
        vertices.push(beamMesh.vertices[j]);
      }
      
      for (let j = 0; j < beamMesh.faces.length; j++) {
        faces.push(beamMesh.faces[j] + vertexOffset);
      }
    }

    return this.createStructureModel('pile_system', vertices, faces, config);
  }

  // ============== 锚杆系统生成 ==============
  public async generateAnchorSystem(config: AnchorConfig): Promise<GeometryModel> {
    console.log('⚓ 生成锚杆系统...');
    
    const vertices: number[] = [];
    const faces: number[] = [];
    
    // 锚杆本体（简化为圆柱体）
    const anchorRadius = 0.02; // 20mm直径
    const anchorMesh = this.createCylinder(
      { x: 0, y: 0, z: 0 },
      anchorRadius,
      config.length,
      8
    );
    
    // 旋转锚杆到指定倾角
    this.rotateMesh(anchorMesh, config.inclination, 'y');
    
    vertices.push(...anchorMesh.vertices);
    faces.push(...anchorMesh.faces);

    return this.createStructureModel('anchor_system', vertices, faces, config);
  }

  // ============== 钢支撑系统生成 ==============
  public async generateSteelSupport(config: SteelSupportConfig): Promise<GeometryModel> {
    console.log('🔧 生成钢支撑系统...');
    
    const vertices: number[] = [];
    const faces: number[] = [];
    let vertexOffset = 0;

    // 为每个支撑层级生成几何
    for (const level of config.levels) {
      const supportMesh = this.createSteelBeam(config.sectionType, config.sectionSize, level.elevation);
      
      for (let j = 0; j < supportMesh.vertices.length; j++) {
        vertices.push(supportMesh.vertices[j]);
      }
      
      for (let j = 0; j < supportMesh.faces.length; j++) {
        faces.push(supportMesh.faces[j] + vertexOffset);
      }
      
      vertexOffset += supportMesh.vertices.length / 3;
    }

    return this.createStructureModel('steel_support', vertices, faces, config);
  }

  // ============== 支护组合验证 ==============
  public async validateSupportCombination(supports: GeometryModel[]): Promise<ValidationResult> {
    console.log('🔍 验证支护结构组合...');
    
    const conflicts: ConflictInfo[] = [];
    const warnings: string[] = [];
    let structuralIntegrity = 1.0;

    // 检查支护结构间的冲突
    for (let i = 0; i < supports.length; i++) {
      for (let j = i + 1; j < supports.length; j++) {
        const conflict = this.checkStructureConflict(supports[i], supports[j]);
        if (conflict) {
          conflicts.push(conflict);
          structuralIntegrity -= 0.1;
        }
      }
    }

    // 检查结构完整性
    if (supports.length < 2) {
      warnings.push('建议至少使用两种支护措施确保安全');
      structuralIntegrity -= 0.2;
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
      warnings,
      structuralIntegrity: Math.max(0, structuralIntegrity)
    };
  }

  // ============== 工具方法 ==============
  private createCylinder(center: Point3D, radius: number, height: number, segments: number): {
    vertices: Float32Array,
    faces: Uint32Array
  } {
    const vertices: number[] = [];
    const faces: number[] = [];
    
    // 底面中心和顶面中心
    vertices.push(center.x, center.y, center.z);
    vertices.push(center.x, center.y, center.z + height);
    
    // 圆周顶点
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      
      vertices.push(x, y, center.z); // 底面
      vertices.push(x, y, center.z + height); // 顶面
    }
    
    // 生成面片
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const bottom1 = 2 + i * 2;
      const bottom2 = 2 + next * 2;
      const top1 = 2 + i * 2 + 1;
      const top2 = 2 + next * 2 + 1;
      
      // 底面
      faces.push(0, bottom2, bottom1);
      // 顶面
      faces.push(1, top1, top2);
      // 侧面
      faces.push(bottom1, bottom2, top1);
      faces.push(bottom2, top2, top1);
    }
    
    return {
      vertices: new Float32Array(vertices),
      faces: new Uint32Array(faces)
    };
  }

  private createCrownBeam(config: PileSystemConfig): {
    vertices: Float32Array,
    faces: Uint32Array
  } {
    const beam = config.crownBeam;
    const vertices: number[] = [];
    const faces: number[] = [];
    
    // 简化为长方体
    const v = [
      [0, -beam.width/2, -beam.height/2],
      [config.length, -beam.width/2, -beam.height/2],
      [config.length, beam.width/2, -beam.height/2],
      [0, beam.width/2, -beam.height/2],
      [0, -beam.width/2, beam.height/2],
      [config.length, -beam.width/2, beam.height/2],
      [config.length, beam.width/2, beam.height/2],
      [0, beam.width/2, beam.height/2]
    ];
    
    vertices.push(...v.flat());
    
    const f = [
      0,1,2, 0,2,3, // 底面
      4,6,5, 4,7,6, // 顶面
      0,4,1, 1,4,5, // 侧面
      1,5,2, 2,5,6,
      2,6,3, 3,6,7,
      3,7,0, 0,7,4
    ];
    
    faces.push(...f);
    
    return {
      vertices: new Float32Array(vertices),
      faces: new Uint32Array(faces)
    };
  }

  private createSteelBeam(sectionType: string, sectionSize: string, elevation: number): {
    vertices: Float32Array,
    faces: Uint32Array
  } {
    // 简化的钢梁截面
    const width = 0.3; // 300mm
    const height = 0.4; // 400mm
    const length = 10; // 10m跨度
    
    const vertices = [
      0, -width/2, elevation - height/2,
      length, -width/2, elevation - height/2,
      length, width/2, elevation - height/2,
      0, width/2, elevation - height/2,
      0, -width/2, elevation + height/2,
      length, -width/2, elevation + height/2,
      length, width/2, elevation + height/2,
      0, width/2, elevation + height/2
    ];
    
    const faces = [
      0,1,2, 0,2,3,
      4,6,5, 4,7,6,
      0,4,1, 1,4,5,
      1,5,2, 2,5,6,
      2,6,3, 3,6,7,
      3,7,0, 0,7,4
    ];
    
    return {
      vertices: new Float32Array(vertices),
      faces: new Uint32Array(faces)
    };
  }

  private rotateMesh(mesh: { vertices: Float32Array }, angle: number, axis: 'x' | 'y' | 'z'): void {
    const cos = Math.cos(angle * Math.PI / 180);
    const sin = Math.sin(angle * Math.PI / 180);
    
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const x = mesh.vertices[i];
      const y = mesh.vertices[i + 1];
      const z = mesh.vertices[i + 2];
      
      if (axis === 'y') {
        mesh.vertices[i] = x * cos - z * sin;
        mesh.vertices[i + 2] = x * sin + z * cos;
      }
    }
  }

  private checkStructureConflict(struct1: GeometryModel, struct2: GeometryModel): ConflictInfo | null {
    // 简化的冲突检测：检查边界框重叠
    const box1 = struct1.quality.boundingBox;
    const box2 = struct2.quality.boundingBox;
    
    const overlap = !(
      box1.max.x < box2.min.x || box2.max.x < box1.min.x ||
      box1.max.y < box2.min.y || box2.max.y < box1.min.y ||
      box1.max.z < box2.min.z || box2.max.z < box1.min.z
    );
    
    if (overlap) {
      return {
        type: 'intersection',
        objects: [struct1.id, struct2.id],
        severity: 'major',
        suggestion: '调整支护结构位置避免冲突'
      };
    }
    
    return null;
  }

  private createStructureModel(
    type: string,
    vertices: number[],
    faces: number[],
    config: any
  ): GeometryModel {
    const vertexArray = new Float32Array(vertices);
    const faceArray = new Uint32Array(faces);
    
    return {
      id: '',
      type: 'support',
      vertices: vertexArray,
      faces: faceArray,
      metadata: {
        createdAt: new Date(),
        createdBy: 'SupportStructureService',
        version: '1.0.0',
        source: 'parametric_generation',
        parameters: { type, config }
      },
      quality: {
        triangleCount: faces.length / 3,
        vertexCount: vertices.length / 3,
        boundingBox: this.calculateBoundingBox(vertexArray),
        volume: this.calculateVolume(vertexArray, faceArray),
        surfaceArea: this.calculateSurfaceArea(vertexArray, faceArray),
        meshReadiness: 0.95
      }
    };
  }

  private calculateBoundingBox(vertices: Float32Array): BoundingBox {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    for (let i = 0; i < vertices.length; i += 3) {
      minX = Math.min(minX, vertices[i]);
      minY = Math.min(minY, vertices[i + 1]);
      minZ = Math.min(minZ, vertices[i + 2]);
      maxX = Math.max(maxX, vertices[i]);
      maxY = Math.max(maxY, vertices[i + 1]);
      maxZ = Math.max(maxZ, vertices[i + 2]);
    }
    
    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    };
  }

  private calculateVolume(vertices: Float32Array, faces: Uint32Array): number {
    let volume = 0;
    for (let i = 0; i < faces.length; i += 3) {
      const i1 = faces[i] * 3;
      const i2 = faces[i + 1] * 3;
      const i3 = faces[i + 2] * 3;
      
      const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
      const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
      const v3 = [vertices[i3], vertices[i3 + 1], vertices[i3 + 2]];
      
      volume += v1[0] * (v2[1] * v3[2] - v3[1] * v2[2]) / 6;
    }
    return Math.abs(volume);
  }

  private calculateSurfaceArea(vertices: Float32Array, faces: Uint32Array): number {
    let area = 0;
    for (let i = 0; i < faces.length; i += 3) {
      const i1 = faces[i] * 3;
      const i2 = faces[i + 1] * 3;
      const i3 = faces[i + 2] * 3;
      
      const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
      const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
      const v3 = [vertices[i3], vertices[i3 + 1], vertices[i3 + 2]];
      
      const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
      const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
      
      const cross = [
        edge1[1] * edge2[2] - edge1[2] * edge2[1],
        edge1[2] * edge2[0] - edge1[0] * edge2[2],
        edge1[0] * edge2[1] - edge1[1] * edge2[0]
      ];
      
      area += Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]) * 0.5;
    }
    return area;
  }

  // 公共创建接口
  public async createSupportModel(supportType: string, config: any): Promise<GeometryModel> {
    switch (supportType) {
      case 'diaphragm_wall':
        return await this.generateDiaphragmWall(config);
      case 'pile_system':
        return await this.generatePileSystem(config);
      case 'anchor_system':
        return await this.generateAnchorSystem(config);
      case 'steel_support':
        return await this.generateSteelSupport(config);
      default:
        throw new Error(`不支持的支护结构类型: ${supportType}`);
    }
  }
}

export default SupportStructureService;