import React, { useRef, useEffect, useState } from 'react';
import { Select, Slider, Switch, Card, Statistic, Row, Col, Progress } from 'antd';
import { NodeIndexOutlined, AppstoreOutlined, BarChartOutlined } from '@ant-design/icons';

const { Option } = Select;

interface MeshData {
  nodes: Float32Array;      // 节点坐标 [x1,y1,z1,x2,y2,z2,...]
  elements: Uint32Array;    // 单元连接 [n1,n2,n3,n4,n1,n2,n3,n4,...]
  nodeCount: number;
  elementCount: number;
  quality: Float32Array;    // 单元质量
  elementType: 'tetrahedron' | 'hexahedron' | 'prism';
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

interface MeshRenderConfig {
  showMesh: boolean;
  showNodes: boolean;
  showEdges: boolean;
  showFaces: boolean;
  wireframeMode: boolean;
  qualityVisualization: boolean;
  qualityThreshold: number;
  nodeSize: number;
  edgeWidth: number;
  transparency: number;
}

interface MeshRendererProps {
  meshData?: MeshData;
  config: MeshRenderConfig;
  onConfigChange: (config: Partial<MeshRenderConfig>) => void;
  className?: string;
}

const MeshRenderer: React.FC<MeshRendererProps> = ({
  meshData,
  config,
  onConfigChange,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const [renderStats, setRenderStats] = useState({
    renderTime: 0,
    triangleCount: 0,
    vertexCount: 0
  });

  // 初始化WebGL上下文
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    glRef.current = gl;
    
    // 启用深度测试
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    
    // 设置清屏颜色
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    
    return () => {
      // 清理WebGL资源
      if (gl) {
        const numTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
        for (let unit = 0; unit < numTextureUnits; ++unit) {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, null);
          gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
    };
  }, []);

  // 网格渲染逻辑
  useEffect(() => {
    if (!meshData || !glRef.current) return;
    
    const gl = glRef.current;
    const startTime = performance.now();
    
    // 清屏
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    if (config.showMesh) {
      renderMeshGeometry(gl, meshData);
    }
    
    if (config.showNodes) {
      renderNodes(gl, meshData);
    }
    
    if (config.showEdges) {
      renderEdges(gl, meshData);
    }
    
    if (config.qualityVisualization) {
      renderQualityVisualization(gl, meshData);
    }
    
    const renderTime = performance.now() - startTime;
    setRenderStats({
      renderTime,
      triangleCount: meshData.elementCount * (meshData.elementType === 'tetrahedron' ? 4 : 6),
      vertexCount: meshData.nodeCount
    });
    
  }, [meshData, config]);

  // 渲染网格几何体
  const renderMeshGeometry = (gl: WebGLRenderingContext, mesh: MeshData) => {
    // 创建顶点缓冲区
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.nodes, gl.STATIC_DRAW);
    
    // 创建索引缓冲区
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.elements, gl.STATIC_DRAW);
    
    // 创建着色器程序
    const program = createMeshShaderProgram(gl);
    gl.useProgram(program);
    
    // 设置顶点属性
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    
    // 设置uniform变量
    const modelViewMatrixLocation = gl.getUniformLocation(program, 'modelViewMatrix');
    const projectionMatrixLocation = gl.getUniformLocation(program, 'projectionMatrix');
    const colorLocation = gl.getUniformLocation(program, 'color');
    const opacityLocation = gl.getUniformLocation(program, 'opacity');
    
    // 设置矩阵 (这里使用简单的示例矩阵)
    const modelViewMatrix = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, -5, 1
    ]);
    
    const projectionMatrix = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, -1, 0,
      0, 0, 0, 1
    ]);
    
    gl.uniformMatrix4fv(modelViewMatrixLocation, false, modelViewMatrix);
    gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);
    gl.uniform3f(colorLocation, 0.7, 0.7, 0.9);
    gl.uniform1f(opacityLocation, config.transparency);
    
    // 渲染模式设置
    if (config.wireframeMode) {
      // 线框模式
      gl.uniform3f(colorLocation, 0.8, 0.8, 0.8);
      gl.drawElements(gl.LINES, mesh.elements.length, gl.UNSIGNED_INT, 0);
    } else {
      // 实体模式
      if (config.transparency < 1.0) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }
      
      gl.drawElements(gl.TRIANGLES, mesh.elements.length, gl.UNSIGNED_INT, 0);
      
      if (config.transparency < 1.0) {
        gl.disable(gl.BLEND);
      }
    }
    
    // 清理
    gl.deleteBuffer(vertexBuffer);
    gl.deleteBuffer(indexBuffer);
    gl.deleteProgram(program);
  };

  // 渲染节点
  const renderNodes = (gl: WebGLRenderingContext, mesh: MeshData) => {
    const program = createNodeShaderProgram(gl);
    gl.useProgram(program);
    
    // 创建节点几何体 (小球或点)
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.nodes, gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    
    // 设置点大小
    const pointSizeLocation = gl.getUniformLocation(program, 'pointSize');
    gl.uniform1f(pointSizeLocation, config.nodeSize);
    
    // 设置颜色
    const colorLocation = gl.getUniformLocation(program, 'color');
    gl.uniform3f(colorLocation, 1.0, 0.2, 0.2);
    
    // 渲染点
    gl.drawArrays(gl.POINTS, 0, mesh.nodeCount);
    
    gl.deleteBuffer(vertexBuffer);
    gl.deleteProgram(program);
  };

  // 渲染边
  const renderEdges = (gl: WebGLRenderingContext, mesh: MeshData) => {
    // 从单元生成边的索引
    const edges = generateEdgesFromElements(mesh);
    
    const program = createEdgeShaderProgram(gl);
    gl.useProgram(program);
    
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.nodes, gl.STATIC_DRAW);
    
    const edgeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, edgeBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, edges, gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    
    // 设置线宽 (注意：很多WebGL实现不支持非1.0的线宽)
    gl.lineWidth(config.edgeWidth);
    
    // 设置颜色
    const colorLocation = gl.getUniformLocation(program, 'color');
    gl.uniform3f(colorLocation, 0.5, 0.5, 0.5);
    
    gl.drawElements(gl.LINES, edges.length, gl.UNSIGNED_INT, 0);
    
    gl.deleteBuffer(vertexBuffer);
    gl.deleteBuffer(edgeBuffer);
    gl.deleteProgram(program);
  };

  // 质量可视化
  const renderQualityVisualization = (gl: WebGLRenderingContext, mesh: MeshData) => {
    const program = createQualityShaderProgram(gl);
    gl.useProgram(program);
    
    // 创建质量颜色映射
    const qualityColors = generateQualityColors(mesh.quality, config.qualityThreshold);
    
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.nodes, gl.STATIC_DRAW);
    
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, qualityColors, gl.STATIC_DRAW);
    
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.elements, gl.STATIC_DRAW);
    
    // 设置属性
    const positionLocation = gl.getAttribLocation(program, 'position');
    const colorLocation = gl.getAttribLocation(program, 'color');
    
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);
    
    gl.drawElements(gl.TRIANGLES, mesh.elements.length, gl.UNSIGNED_INT, 0);
    
    gl.deleteBuffer(vertexBuffer);
    gl.deleteBuffer(colorBuffer);
    gl.deleteBuffer(indexBuffer);
    gl.deleteProgram(program);
  };

  // 辅助函数：创建着色器程序
  const createMeshShaderProgram = (gl: WebGLRenderingContext) => {
    const vertexShaderSource = `
      attribute vec3 position;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    const fragmentShaderSource = `
      precision mediump float;
      uniform vec3 color;
      uniform float opacity;
      
      void main() {
        gl_FragColor = vec4(color, opacity);
      }
    `;
    
    return createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
  };

  const createNodeShaderProgram = (gl: WebGLRenderingContext) => {
    const vertexShaderSource = `
      attribute vec3 position;
      uniform float pointSize;
      
      void main() {
        gl_Position = vec4(position, 1.0);
        gl_PointSize = pointSize;
      }
    `;
    
    const fragmentShaderSource = `
      precision mediump float;
      uniform vec3 color;
      
      void main() {
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    
    return createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
  };

  const createEdgeShaderProgram = (gl: WebGLRenderingContext) => {
    const vertexShaderSource = `
      attribute vec3 position;
      
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;
    
    const fragmentShaderSource = `
      precision mediump float;
      uniform vec3 color;
      
      void main() {
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    
    return createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
  };

  const createQualityShaderProgram = (gl: WebGLRenderingContext) => {
    const vertexShaderSource = `
      attribute vec3 position;
      attribute vec3 color;
      varying vec3 vColor;
      
      void main() {
        vColor = color;
        gl_Position = vec4(position, 1.0);
      }
    `;
    
    const fragmentShaderSource = `
      precision mediump float;
      varying vec3 vColor;
      
      void main() {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `;
    
    return createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
  };

  const createShaderProgram = (
    gl: WebGLRenderingContext, 
    vertexSource: string, 
    fragmentSource: string
  ) => {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);
    
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);
    
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    return program;
  };

  // 辅助函数：从单元生成边
  const generateEdgesFromElements = (mesh: MeshData): Uint32Array => {
    const edges = new Set<string>();
    const elementsPerNode = mesh.elementType === 'tetrahedron' ? 4 : 8;
    
    for (let i = 0; i < mesh.elements.length; i += elementsPerNode) {
      const element = Array.from(mesh.elements.slice(i, i + elementsPerNode));
      
      // 生成所有边
      for (let j = 0; j < element.length; j++) {
        for (let k = j + 1; k < element.length; k++) {
          const edge = [element[j], element[k]].sort().join(',');
          edges.add(edge);
        }
      }
    }
    
    const edgeArray = new Uint32Array(edges.size * 2);
    let index = 0;
    
    edges.forEach(edge => {
      const [a, b] = edge.split(',').map(Number);
      edgeArray[index++] = a;
      edgeArray[index++] = b;
    });
    
    return edgeArray;
  };

  // 生成质量颜色映射
  const generateQualityColors = (quality: Float32Array, threshold: number): Float32Array => {
    const colors = new Float32Array(quality.length * 3);
    
    for (let i = 0; i < quality.length; i++) {
      const q = quality[i];
      let r, g, b;
      
      if (q < threshold) {
        // 低质量：红色
        r = 1.0;
        g = q / threshold;
        b = 0.0;
      } else {
        // 高质量：绿色
        r = 1.0 - (q - threshold) / (1.0 - threshold);
        g = 1.0;
        b = 0.0;
      }
      
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    
    return colors;
  };

  // 计算网格统计信息
  const getMeshStatistics = () => {
    if (!meshData) return null;
    
    const minQuality = Math.min(...Array.from(meshData.quality));
    const maxQuality = Math.max(...Array.from(meshData.quality));
    const avgQuality = Array.from(meshData.quality).reduce((a, b) => a + b, 0) / meshData.quality.length;
    
    return {
      nodeCount: meshData.nodeCount,
      elementCount: meshData.elementCount,
      minQuality: minQuality.toFixed(3),
      maxQuality: maxQuality.toFixed(3),
      avgQuality: avgQuality.toFixed(3),
      elementType: meshData.elementType
    };
  };

  const stats = getMeshStatistics();

  return (
    <div className={`mesh-renderer ${className}`}>
      {/* 渲染画布 */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      
      {/* 网格统计信息覆盖层 */}
      {stats && (
        <div className="absolute top-4 left-4 max-w-xs">
          <Card size="small" className="bg-black/50 text-white">
            <div className="space-y-2">
              <Row gutter={8}>
                <Col span={12}>
                  <Statistic
                    title={<span className="text-white text-xs">节点数</span>}
                    value={stats.nodeCount}
                    prefix={<NodeIndexOutlined />}
                    valueStyle={{ color: 'white', fontSize: '14px' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<span className="text-white text-xs">单元数</span>}
                    value={stats.elementCount}
                    prefix={<AppstoreOutlined />}
                    valueStyle={{ color: 'white', fontSize: '14px' }}
                  />
                </Col>
              </Row>
              
              <div className="text-xs text-gray-300">
                <div>类型: {stats.elementType}</div>
                <div>质量: {stats.minQuality} ~ {stats.maxQuality}</div>
                <div>平均: {stats.avgQuality}</div>
              </div>
              
              <div className="text-xs text-gray-400">
                <div>渲染时间: {renderStats.renderTime.toFixed(1)}ms</div>
                <div>三角形: {renderStats.triangleCount.toLocaleString()}</div>
              </div>
            </div>
          </Card>
        </div>
      )}
      
      {/* 性能监控 */}
      {renderStats.renderTime > 16 && (
        <div className="absolute bottom-4 left-4">
          <Card size="small" className="bg-red-500/80 text-white">
            <div className="flex items-center gap-2">
              <BarChartOutlined />
              <span className="text-xs">渲染性能警告</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export { MeshRenderer, type MeshData, type MeshRenderConfig };
export default MeshRenderer;