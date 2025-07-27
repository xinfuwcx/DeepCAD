import React from 'react';

interface Material {
  id: string;
  name: string;
  type: 'soil' | 'concrete' | 'steel' | 'water';
  color: string;
  opacity: number;
  properties: {
    elasticModulus?: number;
    poissonRatio?: number;
    density?: number;
    cohesion?: number;
    frictionAngle?: number;
    permeability?: number;
  };
}

interface MaterialRendererProps {
  materials: Material[];
  activeMaterial?: string;
  onMaterialChange?: (materialId: string) => void;
}

const MaterialRenderer: React.FC<MaterialRendererProps> = ({
  materials,
  activeMaterial,
  onMaterialChange
}) => {
  // 材质渲染逻辑
  const renderMaterialProperties = (material: Material) => {
    const { properties } = material;
    
    // 根据材质类型返回不同的WebGL着色器配置
    switch (material.type) {
      case 'soil':
        return {
          vertexShader: `
            attribute vec3 position;
            attribute vec3 normal;
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            varying vec3 vNormal;
            
            void main() {
              vNormal = normal;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            precision mediump float;
            uniform vec3 color;
            uniform float opacity;
            varying vec3 vNormal;
            
            void main() {
              float intensity = dot(vNormal, vec3(0.0, 0.0, 1.0));
              gl_FragColor = vec4(color * intensity, opacity);
            }
          `,
          uniforms: {
            color: material.color,
            opacity: material.opacity
          }
        };
        
      case 'concrete':
        return {
          vertexShader: `
            attribute vec3 position;
            attribute vec3 normal;
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
              vNormal = normal;
              vPosition = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            precision mediump float;
            uniform vec3 color;
            uniform float opacity;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
              // 混凝土纹理效果
              float noise = sin(vPosition.x * 20.0) * sin(vPosition.y * 20.0) * 0.1;
              vec3 finalColor = color + noise;
              float intensity = dot(vNormal, vec3(0.0, 0.0, 1.0));
              gl_FragColor = vec4(finalColor * intensity, opacity);
            }
          `,
          uniforms: {
            color: material.color,
            opacity: material.opacity
          }
        };
        
      case 'steel':
        return {
          vertexShader: `
            attribute vec3 position;
            attribute vec3 normal;
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            varying vec3 vNormal;
            varying vec3 vReflect;
            
            void main() {
              vNormal = normal;
              vec3 worldPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
              vec3 cameraDirection = normalize(worldPosition);
              vReflect = reflect(cameraDirection, normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            precision mediump float;
            uniform vec3 color;
            uniform float opacity;
            varying vec3 vNormal;
            varying vec3 vReflect;
            
            void main() {
              // 金属反射效果
              float metallic = 0.8;
              float roughness = 0.2;
              vec3 baseColor = color;
              
              float intensity = dot(vNormal, vec3(0.0, 0.0, 1.0));
              float reflectance = pow(max(0.0, dot(vReflect, vec3(0.0, 0.0, 1.0))), 64.0);
              
              vec3 finalColor = mix(baseColor * intensity, vec3(1.0), reflectance * metallic);
              gl_FragColor = vec4(finalColor, opacity);
            }
          `,
          uniforms: {
            color: material.color,
            opacity: material.opacity
          }
        };
        
      case 'water':
        return {
          vertexShader: `
            attribute vec3 position;
            attribute vec3 normal;
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            uniform float time;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
              vec3 pos = position;
              // 水波动画
              pos.z += sin(pos.x * 2.0 + time) * cos(pos.y * 2.0 + time) * 0.1;
              
              vNormal = normal;
              vPosition = pos;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
          `,
          fragmentShader: `
            precision mediump float;
            uniform vec3 color;
            uniform float opacity;
            uniform float time;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
              // 水的波动效果
              float wave = sin(vPosition.x * 5.0 + time) * cos(vPosition.y * 5.0 + time) * 0.5 + 0.5;
              vec3 waterColor = mix(color, vec3(0.0, 0.3, 0.8), wave);
              
              float intensity = dot(vNormal, vec3(0.0, 0.0, 1.0));
              gl_FragColor = vec4(waterColor * intensity, opacity * 0.7);
            }
          `,
          uniforms: {
            color: material.color,
            opacity: material.opacity,
            time: 0.0 // 将在渲染循环中更新
          }
        };
        
      default:
        return {
          vertexShader: `
            attribute vec3 position;
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            
            void main() {
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            precision mediump float;
            uniform vec3 color;
            
            void main() {
              gl_FragColor = vec4(color, 1.0);
            }
          `,
          uniforms: {
            color: material.color
          }
        };
    }
  };

  // 创建材质的WebGL程序
  const createMaterialProgram = (gl: WebGLRenderingContext, material: Material) => {
    const materialConfig = renderMaterialProperties(material);
    
    // 编译着色器
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, materialConfig.vertexShader);
    gl.compileShader(vertexShader);
    
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, materialConfig.fragmentShader);
    gl.compileShader(fragmentShader);
    
    // 创建程序
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    return {
      program,
      uniforms: materialConfig.uniforms,
      material
    };
  };

  // 获取材质颜色的CSS表示
  const getMaterialColor = (material: Material) => {
    // 将十六进制颜色转换为RGB
    const hex = material.color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${material.opacity})`;
  };

  // 材质类型图标
  const getMaterialIcon = (type: Material['type']) => {
    switch (type) {
      case 'soil': return '🏔️';
      case 'concrete': return '🏗️';
      case 'steel': return '⚒️';
      case 'water': return '💧';
      default: return '📦';
    }
  };

  return (
    <div className="material-renderer">
      {/* 材质列表显示组件 */}
      <div className="material-list space-y-2">
        {materials.map(material => (
          <div
            key={material.id}
            className={`material-item p-3 rounded-lg border cursor-pointer transition-all ${
              activeMaterial === material.id 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-glass-border bg-glass/20'
            }`}
            onClick={() => onMaterialChange?.(material.id)}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: getMaterialColor(material) }}
              />
              <span className="text-lg">{getMaterialIcon(material.type)}</span>
              <div className="flex-1">
                <div className="font-medium text-sm">{material.name}</div>
                <div className="text-xs text-secondary">
                  {material.type} • 透明度: {(material.opacity * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { MaterialRenderer, type Material };
export default MaterialRenderer;