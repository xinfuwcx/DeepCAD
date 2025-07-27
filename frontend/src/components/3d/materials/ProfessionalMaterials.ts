import * as THREE from 'three';

/**
 * 专业级材质系统
 * 统一管理工程3D可视化的材质和质感
 */
export class ProfessionalMaterials {
  private static instance: ProfessionalMaterials;
  private materials: Map<string, THREE.Material> = new Map();

  static getInstance(): ProfessionalMaterials {
    if (!ProfessionalMaterials.instance) {
      ProfessionalMaterials.instance = new ProfessionalMaterials();
    }
    return ProfessionalMaterials.instance;
  }

  constructor() {
    this.initializeMaterials();
  }

  private initializeMaterials() {
    // 地质材质
    this.materials.set('geology_borehole', new THREE.MeshPhysicalMaterial({
      color: 0x00d9ff,
      transparent: true,
      opacity: 0.8,
      metalness: 0.1,
      roughness: 0.3,
      transmission: 0.2,
      thickness: 0.5,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2
    }));

    this.materials.set('geology_layer', new THREE.MeshPhysicalMaterial({
      color: 0x8B4513,
      transparent: true,
      opacity: 0.6,
      metalness: 0.0,
      roughness: 0.8,
      transmission: 0.3,
      thickness: 1.0,
      sheen: 0.2,
      sheenColor: new THREE.Color(0x8B4513)
    }));

    // 开挖材质
    this.materials.set('excavation_volume', new THREE.MeshPhysicalMaterial({
      color: 0x52c41a,
      transparent: true,
      opacity: 0.4,
      metalness: 0.0,
      roughness: 0.6,
      transmission: 0.6,
      thickness: 2.0,
      ior: 1.3,
      reflectivity: 0.1,
      side: THREE.DoubleSide
    }));

    this.materials.set('excavation_stage', new THREE.MeshPhysicalMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.7,
      metalness: 0.1,
      roughness: 0.4,
      emissive: new THREE.Color(0xff6b6b),
      emissiveIntensity: 0.1,
      clearcoat: 0.5
    }));

    // 支护结构材质
    this.materials.set('support_concrete', new THREE.MeshPhysicalMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.85,
      metalness: 0.0,
      roughness: 0.7,
      clearcoat: 0.2,
      clearcoatRoughness: 0.3,
      normalScale: new THREE.Vector2(0.5, 0.5)
    }));

    this.materials.set('support_steel', new THREE.MeshPhysicalMaterial({
      color: 0x666666,
      transparent: true,
      opacity: 0.9,
      metalness: 0.8,
      roughness: 0.2,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9
    }));

    this.materials.set('support_diaphragm', new THREE.MeshPhysicalMaterial({
      color: 0xfa8c16,
      transparent: true,
      opacity: 0.8,
      metalness: 0.1,
      roughness: 0.5,
      transmission: 0.2,
      thickness: 1.5,
      clearcoat: 0.4,
      sheen: 0.3,
      sheenColor: new THREE.Color(0xfa8c16)
    }));

    this.materials.set('support_pile', new THREE.MeshPhysicalMaterial({
      color: 0x8c8c8c,
      transparent: true,
      opacity: 0.85,
      metalness: 0.3,
      roughness: 0.6,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
      normalScale: new THREE.Vector2(0.3, 0.3)
    }));

    // 🔥 新增：compacted_soil 挤密土体材质（响应3号计算专家需求）
    this.materials.set('compacted_soil', new THREE.MeshPhysicalMaterial({
      color: 0xD4A574,  // 土黄色，区别于普通土体
      transparent: true,
      opacity: 0.75,
      metalness: 0.1,
      roughness: 0.7,
      transmission: 0.15,
      thickness: 1.2,
      clearcoat: 0.25,
      clearcoatRoughness: 0.5,
      sheen: 0.3,
      sheenColor: new THREE.Color(0xD4A574),
      // 添加细微的发光效果，表示改良后的土体
      emissive: new THREE.Color(0xD4A574),
      emissiveIntensity: 0.05
    }));

    // 挤密区域边界材质（用于显示挤密影响范围）
    this.materials.set('compaction_zone_boundary', new THREE.MeshPhysicalMaterial({
      color: 0xFF8C42,  // 橙色边界
      transparent: true,
      opacity: 0.3,
      metalness: 0.0,
      roughness: 0.4,
      transmission: 0.7,
      thickness: 0.5,
      side: THREE.DoubleSide,
      // 动态发光效果
      emissive: new THREE.Color(0xFF8C42),
      emissiveIntensity: 0.1
    }));

    this.materials.set('support_anchor', new THREE.MeshPhysicalMaterial({
      color: 0x595959,
      transparent: true,
      opacity: 0.9,
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 0.9,
      clearcoatRoughness: 0.05,
      reflectivity: 0.95
    }));

    // 网格材质
    this.materials.set('mesh_wireframe', new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    }));

    this.materials.set('mesh_surface', new THREE.MeshPhysicalMaterial({
      color: 0x4169e1,
      transparent: true,
      opacity: 0.7,
      metalness: 0.0,
      roughness: 0.4,
      transmission: 0.3,
      thickness: 0.5,
      side: THREE.DoubleSide
    }));

    // 仿真结果材质
    this.materials.set('result_stress_low', new THREE.MeshPhysicalMaterial({
      color: 0x0000ff,
      transparent: true,
      opacity: 0.8,
      metalness: 0.0,
      roughness: 0.3,
      emissive: new THREE.Color(0x0000ff),
      emissiveIntensity: 0.2
    }));

    this.materials.set('result_stress_high', new THREE.MeshPhysicalMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
      metalness: 0.0,
      roughness: 0.3,
      emissive: new THREE.Color(0xff0000),
      emissiveIntensity: 0.3
    }));

    // 辅助材质
    this.materials.set('grid', new THREE.LineBasicMaterial({
      color: 0x666666,
      transparent: true,
      opacity: 0.3
    }));

    this.materials.set('boundary', new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    }));
  }

  // 获取材质
  getMaterial(name: string): THREE.Material | undefined {
    return this.materials.get(name)?.clone();
  }

  // 创建渐变材质
  createGradientMaterial(colors: number[], positions: number[], opacity = 0.8): THREE.MeshPhysicalMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const context = canvas.getContext('2d')!;
    
    const gradient = context.createLinearGradient(0, 0, 256, 0);
    for (let i = 0; i < colors.length; i++) {
      const color = new THREE.Color(colors[i]);
      gradient.addColorStop(positions[i], `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`);
    }
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 1);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    
    return new THREE.MeshPhysicalMaterial({
      map: texture,
      transparent: true,
      opacity,
      metalness: 0.0,
      roughness: 0.4,
      transmission: 0.2,
      thickness: 0.5
    });
  }

  // 创建动态材质（带动画效果）
  createAnimatedMaterial(baseColor: number, animationType: 'pulse' | 'flow' | 'shimmer' = 'pulse'): THREE.MeshPhysicalMaterial {
    const material = new THREE.MeshPhysicalMaterial({
      color: baseColor,
      transparent: true,
      opacity: 0.8,
      metalness: 0.3,
      roughness: 0.4,
      transmission: 0.3,
      thickness: 1.0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2
    });

    // 添加动画更新函数
    (material as any).animate = (time: number) => {
      switch (animationType) {
        case 'pulse':
          material.opacity = 0.5 + 0.3 * Math.sin(time * 2);
          material.emissiveIntensity = 0.1 + 0.1 * Math.sin(time * 2);
          break;
        case 'flow':
          material.clearcoatRoughness = 0.1 + 0.2 * Math.sin(time);
          break;
        case 'shimmer':
          material.metalness = 0.2 + 0.3 * Math.sin(time * 3);
          break;
      }
    };

    return material;
  }

  // 根据数值创建热力图材质
  createHeatmapMaterial(value: number, minValue = 0, maxValue = 1): THREE.MeshPhysicalMaterial {
    const normalizedValue = Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue)));
    
    let color: THREE.Color;
    if (normalizedValue < 0.5) {
      // 蓝色到绿色
      color = new THREE.Color().lerpColors(
        new THREE.Color(0x0000ff), 
        new THREE.Color(0x00ff00), 
        normalizedValue * 2
      );
    } else {
      // 绿色到红色
      color = new THREE.Color().lerpColors(
        new THREE.Color(0x00ff00), 
        new THREE.Color(0xff0000), 
        (normalizedValue - 0.5) * 2
      );
    }

    return new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      metalness: 0.0,
      roughness: 0.3,
      emissive: color,
      emissiveIntensity: normalizedValue * 0.3,
      transmission: 0.2,
      thickness: 0.5
    });
  }

  // 设置材质的透明度
  setOpacity(materialName: string, opacity: number) {
    const material = this.materials.get(materialName);
    if (material && 'opacity' in material) {
      (material as any).opacity = opacity;
      (material as any).transparent = opacity < 1.0;
    }
  }

  // 批量设置透明度
  setGlobalOpacity(opacity: number) {
    this.materials.forEach((material) => {
      if ('opacity' in material) {
        (material as any).opacity = opacity;
        (material as any).transparent = opacity < 1.0;
      }
    });
  }

  // 🔥 新增：创建挤密土体材质（响应3号计算专家需求）
  createCompactedSoilMaterial(compactionFactor: number = 1.5): THREE.MeshPhysicalMaterial {
    // 根据挤密系数调整材质属性
    const normalizedFactor = Math.max(1.0, Math.min(3.0, compactionFactor));
    const intensity = (normalizedFactor - 1.0) / 2.0; // 0-1范围
    
    // 基础土黄色，随挤密程度变化
    const baseColor = new THREE.Color(0xD4A574);
    const enhancedColor = baseColor.clone().lerp(new THREE.Color(0xB8860B), intensity * 0.3);
    
    return new THREE.MeshPhysicalMaterial({
      color: enhancedColor,
      transparent: true,
      opacity: 0.75 + intensity * 0.15, // 挤密程度越高，越不透明
      metalness: 0.1 + intensity * 0.05,
      roughness: 0.7 - intensity * 0.1, // 挤密后表面更光滑
      transmission: 0.15 - intensity * 0.05,
      thickness: 1.2 + intensity * 0.3,
      clearcoat: 0.25 + intensity * 0.15,
      clearcoatRoughness: 0.5 - intensity * 0.1,
      sheen: 0.3 + intensity * 0.2,
      sheenColor: enhancedColor,
      emissive: enhancedColor,
      emissiveIntensity: 0.05 + intensity * 0.05,
      // 添加自定义属性用于识别
      userData: {
        materialType: 'compacted_soil',
        compactionFactor: normalizedFactor,
        createdAt: Date.now()
      }
    });
  }

  // 创建挤密区域可视化材质（用于显示影响范围）
  createCompactionZoneMaterial(radius: number, intensity: number = 0.5): THREE.MeshPhysicalMaterial {
    const normalizedIntensity = Math.max(0.1, Math.min(1.0, intensity));
    
    // 颜色随强度变化：橙色到红色
    const color = new THREE.Color().lerpColors(
      new THREE.Color(0xFF8C42), // 橙色
      new THREE.Color(0xFF4500), // 红橙色
      normalizedIntensity
    );

    const material = new THREE.MeshPhysicalMaterial({
      color: color,
      transparent: true,
      opacity: 0.2 + normalizedIntensity * 0.2,
      metalness: 0.0,
      roughness: 0.4,
      transmission: 0.8 - normalizedIntensity * 0.2,
      thickness: 0.5,
      side: THREE.DoubleSide,
      emissive: color,
      emissiveIntensity: 0.05 + normalizedIntensity * 0.1,
      userData: {
        materialType: 'compaction_zone',
        radius: radius,
        intensity: normalizedIntensity,
        createdAt: Date.now()
      }
    });

    // 添加动画效果
    (material as any).animate = (time: number) => {
      const pulseFactor = 0.5 + 0.3 * Math.sin(time * 1.5);
      material.emissiveIntensity = (0.05 + normalizedIntensity * 0.1) * pulseFactor;
      material.opacity = (0.2 + normalizedIntensity * 0.2) * pulseFactor;
    };

    return material;
  }

  // 获取材质类型（用于FEM数据传递）
  getMaterialType(material: THREE.Material): string {
    if (material.userData && material.userData.materialType) {
      return material.userData.materialType;
    }
    return 'unknown';
  }

  // 检查是否为挤密相关材质
  isCompactionRelatedMaterial(material: THREE.Material): boolean {
    const type = this.getMaterialType(material);
    return type === 'compacted_soil' || type === 'compaction_zone';
  }

  // 清理资源
  dispose() {
    this.materials.forEach((material) => {
      material.dispose();
    });
    this.materials.clear();
  }
}

export default ProfessionalMaterials;