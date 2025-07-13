import React, { useRef, useEffect, useState } from 'react';
import { Select, Slider, Card, Row, Col, Statistic, Button, Space, Switch } from 'antd';
import { 
  BarChartOutlined, 
  LineChartOutlined, 
  HeatMapOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  FieldTimeOutlined,
  ArrowsAltOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { GlassCard } from '../ui/GlassComponents';

const { Option } = Select;

interface ResultField {
  id: string;
  name: string;
  type: 'scalar' | 'vector';
  unit: string;
  data: Float32Array;
  range: [number, number];
  description: string;
}

interface ResultsData {
  timeSteps: number[];
  currentTimeStep: number;
  fields: ResultField[];
  deformation?: {
    nodes: Float32Array;
    scale: number;
  };
}

interface ResultsRenderConfig {
  activeField: string;
  colorScheme: 'rainbow' | 'thermal' | 'grayscale' | 'blueWhiteRed';
  showDeformation: boolean;
  deformationScale: number;
  showUndeformed: boolean;
  showColorbar: boolean;
  vectorScale: number;
  showVectors: boolean;
  contourLines: boolean;
  animationSpeed: number;
  isAnimating: boolean;
}

interface ResultsRendererProps {
  resultsData?: ResultsData;
  config: ResultsRenderConfig;
  onConfigChange: (config: Partial<ResultsRenderConfig>) => void;
  className?: string;
}

const ResultsRenderer: React.FC<ResultsRendererProps> = ({
  resultsData,
  config,
  onConfigChange,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [renderStats, setRenderStats] = useState({
    renderTime: 0,
    fieldRange: [0, 0],
    maxValue: 0,
    minValue: 0
  });

  // 颜色方案定义
  const colorSchemes = {
    rainbow: [
      [0.0, [0, 0, 255]],    // 蓝色
      [0.25, [0, 255, 255]], // 青色
      [0.5, [0, 255, 0]],    // 绿色
      [0.75, [255, 255, 0]], // 黄色
      [1.0, [255, 0, 0]]     // 红色
    ],
    thermal: [
      [0.0, [0, 0, 0]],      // 黑色
      [0.33, [255, 0, 0]],   // 红色
      [0.66, [255, 255, 0]], // 黄色
      [1.0, [255, 255, 255]] // 白色
    ],
    grayscale: [
      [0.0, [0, 0, 0]],      // 黑色
      [1.0, [255, 255, 255]] // 白色
    ],
    blueWhiteRed: [
      [0.0, [0, 0, 255]],    // 蓝色
      [0.5, [255, 255, 255]], // 白色
      [1.0, [255, 0, 0]]     // 红色
    ]
  };

  // 初始化WebGL渲染
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    // WebGL初始化设置
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.05, 0.05, 0.05, 1.0);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 渲染结果数据
  useEffect(() => {
    if (!resultsData || !canvasRef.current) return;
    
    renderResults();
  }, [resultsData, config]);

  // 动画控制
  useEffect(() => {
    if (config.isAnimating && resultsData) {
      startAnimation();
    } else {
      stopAnimation();
    }
    
    return () => stopAnimation();
  }, [config.isAnimating, resultsData]);

  const renderResults = () => {
    const canvas = canvasRef.current;
    if (!canvas || !resultsData) return;

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return;

    const startTime = performance.now();

    // 清屏
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const activeField = resultsData.fields.find(f => f.id === config.activeField);
    if (!activeField) return;

    // 渲染主要结果场
    if (activeField.type === 'scalar') {
      renderScalarField(gl, activeField);
    } else {
      renderVectorField(gl, activeField);
    }

    // 渲染变形
    if (config.showDeformation && resultsData.deformation) {
      renderDeformation(gl, resultsData.deformation);
    }

    // 渲染等值线
    if (config.contourLines) {
      renderContourLines(gl, activeField);
    }

    const renderTime = performance.now() - startTime;
    setRenderStats({
      renderTime,
      fieldRange: activeField.range,
      maxValue: activeField.range[1],
      minValue: activeField.range[0]
    });
  };

  const renderScalarField = (gl: WebGLRenderingContext, field: ResultField) => {
    // 创建标量场着色器程序
    const program = createScalarFieldShader(gl);
    gl.useProgram(program);

    // 创建颜色映射纹理
    const colorTexture = createColorMapTexture(gl, config.colorScheme);
    
    // 绑定纹理
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, colorTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'colorMap'), 0);

    // 设置字段数据
    const dataTexture = createDataTexture(gl, field.data);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, dataTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'fieldData'), 1);

    // 设置值域
    gl.uniform2f(
      gl.getUniformLocation(program, 'valueRange'),
      field.range[0],
      field.range[1]
    );

    // 渲染网格
    renderMeshWithShader(gl, program);

    gl.deleteTexture(colorTexture);
    gl.deleteTexture(dataTexture);
    gl.deleteProgram(program);
  };

  const renderVectorField = (gl: WebGLRenderingContext, field: ResultField) => {
    if (!config.showVectors) {
      // 如果不显示矢量，则渲染矢量场的模长
      const magnitudeData = calculateVectorMagnitude(field.data);
      const magnitudeField = {
        ...field,
        type: 'scalar' as const,
        data: magnitudeData
      };
      renderScalarField(gl, magnitudeField);
      return;
    }

    // 创建矢量场着色器程序
    const program = createVectorFieldShader(gl);
    gl.useProgram(program);

    // 设置矢量比例
    gl.uniform1f(gl.getUniformLocation(program, 'vectorScale'), config.vectorScale);

    // 创建矢量几何体
    const vectorGeometry = createVectorArrows(field.data, config.vectorScale);
    
    // 渲染矢量箭头
    renderVectorArrows(gl, program, vectorGeometry);

    gl.deleteProgram(program);
  };

  const renderDeformation = (gl: WebGLRenderingContext, deformation: any) => {
    const program = createDeformationShader(gl);
    gl.useProgram(program);

    // 设置变形比例
    gl.uniform1f(gl.getUniformLocation(program, 'deformationScale'), config.deformationScale);

    // 设置变形数据
    const deformationBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, deformationBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, deformation.nodes, gl.STATIC_DRAW);

    const deformationLocation = gl.getAttribLocation(program, 'deformation');
    gl.enableVertexAttribArray(deformationLocation);
    gl.vertexAttribPointer(deformationLocation, 3, gl.FLOAT, false, 0, 0);

    // 渲染变形网格
    if (config.showUndeformed) {
      // 显示未变形状态作为参考
      gl.uniform1f(gl.getUniformLocation(program, 'showReference'), 1.0);
      renderMeshWithShader(gl, program);
    }

    // 渲染变形状态
    gl.uniform1f(gl.getUniformLocation(program, 'showReference'), 0.0);
    renderMeshWithShader(gl, program);

    gl.deleteBuffer(deformationBuffer);
    gl.deleteProgram(program);
  };

  const renderContourLines = (gl: WebGLRenderingContext, field: ResultField) => {
    const program = createContourShader(gl);
    gl.useProgram(program);

    // 生成等值线
    const contourLevels = generateContourLevels(field.range, 10);
    
    contourLevels.forEach(level => {
      gl.uniform1f(gl.getUniformLocation(program, 'contourValue'), level);
      gl.uniform3f(gl.getUniformLocation(program, 'contourColor'), 0.2, 0.2, 0.2);
      
      // 渲染等值线
      renderContourAtLevel(gl, program, field, level);
    });

    gl.deleteProgram(program);
  };

  // 动画控制
  const startAnimation = () => {
    if (!resultsData) return;
    
    const animate = () => {
      // 更新时间步
      const nextTimeStep = (resultsData.currentTimeStep + 1) % resultsData.timeSteps.length;
      // 这里应该更新resultsData.currentTimeStep，但由于是props，需要通过回调
      
      renderResults();
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  };

  // 辅助函数
  const createColorMapTexture = (gl: WebGLRenderingContext, scheme: string) => {
    const colorData = generateColorMapData(scheme, 256);
    const texture = gl.createTexture();
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 256, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, colorData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    return texture;
  };

  const generateColorMapData = (scheme: string, resolution: number) => {
    const colors = colorSchemes[scheme as keyof typeof colorSchemes];
    const data = new Uint8Array(resolution * 3);
    
    for (let i = 0; i < resolution; i++) {
      const t = i / (resolution - 1);
      const color = interpolateColor(colors, t);
      
      data[i * 3] = color[0];
      data[i * 3 + 1] = color[1];
      data[i * 3 + 2] = color[2];
    }
    
    return data;
  };

  const interpolateColor = (colors: any[], t: number) => {
    // 找到t在颜色表中的位置
    for (let i = 0; i < colors.length - 1; i++) {
      const [t1, color1] = colors[i];
      const [t2, color2] = colors[i + 1];
      
      if (t >= t1 && t <= t2) {
        const localT = (t - t1) / (t2 - t1);
        return [
          Math.round(color1[0] + (color2[0] - color1[0]) * localT),
          Math.round(color1[1] + (color2[1] - color1[1]) * localT),
          Math.round(color1[2] + (color2[2] - color1[2]) * localT)
        ];
      }
    }
    
    return colors[colors.length - 1][1];
  };

  const createDataTexture = (gl: WebGLRenderingContext, data: Float32Array) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // 假设数据是1D，需要转换为2D纹理
    const size = Math.ceil(Math.sqrt(data.length));
    const paddedData = new Float32Array(size * size);
    paddedData.set(data);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, size, size, 0, gl.RED, gl.FLOAT, paddedData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    
    return texture;
  };

  const calculateVectorMagnitude = (vectorData: Float32Array) => {
    const magnitudes = new Float32Array(vectorData.length / 3);
    
    for (let i = 0; i < magnitudes.length; i++) {
      const x = vectorData[i * 3];
      const y = vectorData[i * 3 + 1];
      const z = vectorData[i * 3 + 2];
      magnitudes[i] = Math.sqrt(x * x + y * y + z * z);
    }
    
    return magnitudes;
  };

  const generateContourLevels = (range: [number, number], count: number) => {
    const levels = [];
    const step = (range[1] - range[0]) / (count - 1);
    
    for (let i = 0; i < count; i++) {
      levels.push(range[0] + i * step);
    }
    
    return levels;
  };

  // 着色器创建函数（简化版本）
  const createScalarFieldShader = (gl: WebGLRenderingContext) => {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, `
      attribute vec3 position;
      attribute float fieldValue;
      uniform mat4 mvpMatrix;
      varying float vFieldValue;
      
      void main() {
        vFieldValue = fieldValue;
        gl_Position = mvpMatrix * vec4(position, 1.0);
      }
    `);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, `
      precision mediump float;
      uniform sampler2D colorMap;
      uniform vec2 valueRange;
      varying float vFieldValue;
      
      void main() {
        float t = (vFieldValue - valueRange.x) / (valueRange.y - valueRange.x);
        t = clamp(t, 0.0, 1.0);
        gl_FragColor = texture2D(colorMap, vec2(t, 0.5));
      }
    `);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    return program;
  };

  // 其他着色器创建函数的占位符
  const createVectorFieldShader = (gl: WebGLRenderingContext) => {
    // 矢量场着色器实现
    return gl.createProgram()!;
  };

  const createDeformationShader = (gl: WebGLRenderingContext) => {
    // 变形着色器实现
    return gl.createProgram()!;
  };

  const createContourShader = (gl: WebGLRenderingContext) => {
    // 等值线着色器实现
    return gl.createProgram()!;
  };

  // 渲染函数的占位符
  const renderMeshWithShader = (gl: WebGLRenderingContext, program: WebGLProgram) => {
    // 使用着色器渲染网格
  };

  const createVectorArrows = (vectorData: Float32Array, scale: number) => {
    // 创建矢量箭头几何体
    return new Float32Array();
  };

  const renderVectorArrows = (gl: WebGLRenderingContext, program: WebGLProgram, geometry: Float32Array) => {
    // 渲染矢量箭头
  };

  const renderContourAtLevel = (gl: WebGLRenderingContext, program: WebGLProgram, field: ResultField, level: number) => {
    // 渲染指定等值的等值线
  };

  return (
    <div className={`results-renderer relative ${className}`}>
      {/* 渲染画布 */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />

      {/* 结果统计信息 */}
      {resultsData && (
        <div className="absolute top-4 left-4 max-w-sm">
          <GlassCard variant="subtle" className="p-3">
            <Row gutter={8}>
              <Col span={12}>
                <Statistic
                  title={<span className="text-xs text-secondary">最大值</span>}
                  value={renderStats.maxValue}
                  precision={3}
                  valueStyle={{ fontSize: '14px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<span className="text-xs text-secondary">最小值</span>}
                  value={renderStats.minValue}
                  precision={3}
                  valueStyle={{ fontSize: '14px' }}
                />
              </Col>
            </Row>
            
            <div className="mt-2 text-xs text-secondary">
              <div>字段: {resultsData.fields.find(f => f.id === config.activeField)?.name}</div>
              <div>时间步: {resultsData.currentTimeStep + 1}/{resultsData.timeSteps.length}</div>
              <div>渲染: {renderStats.renderTime.toFixed(1)}ms</div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 动画控制 */}
      {resultsData && resultsData.timeSteps.length > 1 && (
        <div className="absolute bottom-4 left-4">
          <GlassCard variant="subtle" className="p-3">
            <Space direction="vertical" size="small">
              <div className="flex items-center gap-2">
                <Button
                  size="small"
                  icon={config.isAnimating ? <LoadingOutlined /> : <ThunderboltOutlined />}
                  onClick={() => onConfigChange({ isAnimating: !config.isAnimating })}
                >
                  {config.isAnimating ? '停止' : '播放'}
                </Button>
                <span className="text-xs text-secondary">动画</span>
              </div>
              
              <div>
                <span className="text-xs text-secondary">速度: {config.animationSpeed}x</span>
                <Slider
                  size="small"
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={config.animationSpeed}
                  onChange={(value) => onConfigChange({ animationSpeed: value })}
                />
              </div>
            </Space>
          </GlassCard>
        </div>
      )}

      {/* 色标 */}
      {config.showColorbar && (
        <div className="absolute top-4 right-4">
          <GlassCard variant="subtle" className="p-2">
            <div className="flex flex-col items-center">
              <div
                className="w-6 h-48 mb-2"
                style={{
                  background: `linear-gradient(to top, ${getColorSchemeGradient(config.colorScheme)})`
                }}
              />
              <div className="text-xs text-secondary text-center">
                <div>{renderStats.maxValue.toFixed(2)}</div>
                <div className="my-2">...</div>
                <div>{renderStats.minValue.toFixed(2)}</div>
              </div>
              <div className="text-xs text-secondary mt-1">
                {resultsData?.fields.find(f => f.id === config.activeField)?.unit || ''}
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

// 获取颜色方案的CSS渐变字符串
const getColorSchemeGradient = (scheme: string) => {
  const colorMaps: { [key: string]: string } = {
    rainbow: 'rgb(0,0,255), rgb(0,255,255), rgb(0,255,0), rgb(255,255,0), rgb(255,0,0)',
    thermal: 'rgb(0,0,0), rgb(255,0,0), rgb(255,255,0), rgb(255,255,255)',
    grayscale: 'rgb(0,0,0), rgb(255,255,255)',
    blueWhiteRed: 'rgb(0,0,255), rgb(255,255,255), rgb(255,0,0)'
  };
  
  return colorMaps[scheme] || colorMaps.rainbow;
};

export { ResultsRenderer, type ResultsData, type ResultField, type ResultsRenderConfig };
export default ResultsRenderer;