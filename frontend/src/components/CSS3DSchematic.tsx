import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface CSS3DSchematicProps {
  type: 'geometry' | 'mesh' | 'analysis' | 'data' | 'settings';
  width?: number;
  height?: number;
  className?: string;
}

// 几何示意图组件
const GeometrySchematic: React.FC = () => (
  <div className="schematic-container">
    <svg width="200" height="150" viewBox="0 0 200 150">
      <defs>
        <linearGradient id="geomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#00d9ff', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#0099cc', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      {/* 立方体 */}
      <g transform="translate(50, 30)">
        <polygon points="0,0 40,0 50,10 10,10" fill="url(#geomGradient)" opacity="0.8" />
        <polygon points="0,0 0,40 10,50 10,10" fill="url(#geomGradient)" opacity="0.6" />
        <polygon points="0,40 40,40 50,50 10,50" fill="url(#geomGradient)" opacity="0.4" />
        <polygon points="40,0 40,40 50,50 50,10" fill="url(#geomGradient)" opacity="0.7" />
      </g>
      
      {/* 圆柱体 */}
      <g transform="translate(120, 40)">
        <ellipse cx="20" cy="0" rx="20" ry="8" fill="url(#geomGradient)" opacity="0.8" />
        <rect x="0" y="0" width="40" height="30" fill="url(#geomGradient)" opacity="0.6" />
        <ellipse cx="20" cy="30" rx="20" ry="8" fill="url(#geomGradient)" opacity="0.4" />
      </g>
      
      {/* 标注 */}
      <text x="70" y="90" textAnchor="middle" fill="#00d9ff" fontSize="12" fontWeight="bold">
        几何建模
      </text>
      <text x="70" y="105" textAnchor="middle" fill="#66ccff" fontSize="10">
        Geometry Modeling
      </text>
    </svg>
  </div>
);

// 网格示意图组件
const MeshSchematic: React.FC = () => (
  <div className="schematic-container">
    <svg width="200" height="150" viewBox="0 0 200 150">
      <defs>
        <linearGradient id="meshGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#52c41a', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#389e0d', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      {/* 网格 */}
      <g transform="translate(50, 20)">
        {/* 三角形网格 */}
        {Array.from({ length: 6 }, (_, i) => 
          Array.from({ length: 4 }, (_, j) => (
            <polygon
              key={`${i}-${j}`}
              points={`${i*15},${j*15} ${(i+1)*15},${j*15} ${i*15 + 7.5},${(j+1)*15}`}
              fill="none"
              stroke="url(#meshGradient)"
              strokeWidth="1"
              opacity="0.7"
            />
          ))
        )}
        
        {/* 节点 */}
        {Array.from({ length: 7 }, (_, i) => 
          Array.from({ length: 5 }, (_, j) => (
            <circle
              key={`node-${i}-${j}`}
              cx={i * 15}
              cy={j * 15}
              r="1.5"
              fill="#52c41a"
              opacity="0.8"
            />
          ))
        )}
      </g>
      
      {/* 标注 */}
      <text x="100" y="110" textAnchor="middle" fill="#52c41a" fontSize="12" fontWeight="bold">
        网格生成
      </text>
      <text x="100" y="125" textAnchor="middle" fill="#73d13d" fontSize="10">
        Mesh Generation
      </text>
    </svg>
  </div>
);

// 分析示意图组件
const AnalysisSchematic: React.FC = () => (
  <div className="schematic-container">
    <svg width="200" height="150" viewBox="0 0 200 150">
      <defs>
        <linearGradient id="analysisGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#ff7875', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#ffa940', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#fadb14', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      {/* 应力云图 */}
      <g transform="translate(40, 30)">
        <path d="M0,0 Q60,10 120,0 Q120,30 120,60 Q60,70 0,60 Q0,30 0,0" 
              fill="url(#analysisGradient)" opacity="0.8" />
        
        {/* 应力等值线 */}
        <path d="M10,15 Q60,20 110,15" fill="none" stroke="#ff4d4f" strokeWidth="1" opacity="0.6" />
        <path d="M10,30 Q60,35 110,30" fill="none" stroke="#fa8c16" strokeWidth="1" opacity="0.6" />
        <path d="M10,45 Q60,50 110,45" fill="none" stroke="#fadb14" strokeWidth="1" opacity="0.6" />
        
        {/* 箭头表示力 */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ff4d4f" />
          </marker>
        </defs>
        <line x1="60" y1="-10" x2="60" y2="10" stroke="#ff4d4f" strokeWidth="2" markerEnd="url(#arrowhead)" />
      </g>
      
      {/* 标注 */}
      <text x="100" y="110" textAnchor="middle" fill="#ff7875" fontSize="12" fontWeight="bold">
        仿真分析
      </text>
      <text x="100" y="125" textAnchor="middle" fill="#ffa940" fontSize="10">
        Simulation Analysis
      </text>
    </svg>
  </div>
);

// 数据示意图组件
const DataSchematic: React.FC = () => (
  <div className="schematic-container">
    <svg width="200" height="150" viewBox="0 0 200 150">
      <defs>
        <linearGradient id="dataGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#1890ff', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#722ed1', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      {/* 数据库图标 */}
      <g transform="translate(70, 20)">
        <ellipse cx="30" cy="0" rx="30" ry="8" fill="url(#dataGradient)" opacity="0.8" />
        <rect x="0" y="0" width="60" height="20" fill="url(#dataGradient)" opacity="0.6" />
        <ellipse cx="30" cy="20" rx="30" ry="8" fill="url(#dataGradient)" opacity="0.4" />
        
        <ellipse cx="30" cy="30" rx="30" ry="8" fill="url(#dataGradient)" opacity="0.8" />
        <rect x="0" y="30" width="60" height="20" fill="url(#dataGradient)" opacity="0.6" />
        <ellipse cx="30" cy="50" rx="30" ry="8" fill="url(#dataGradient)" opacity="0.4" />
      </g>
      
      {/* 数据流 */}
      <g transform="translate(20, 30)">
        <circle cx="0" cy="0" r="3" fill="#1890ff" opacity="0.8" />
        <line x1="3" y1="0" x2="40" y2="0" stroke="#1890ff" strokeWidth="1" opacity="0.6" strokeDasharray="2,2" />
        <circle cx="0" cy="15" r="3" fill="#1890ff" opacity="0.8" />
        <line x1="3" y1="15" x2="40" y2="15" stroke="#1890ff" strokeWidth="1" opacity="0.6" strokeDasharray="2,2" />
        <circle cx="0" cy="30" r="3" fill="#1890ff" opacity="0.8" />
        <line x1="3" y1="30" x2="40" y2="30" stroke="#1890ff" strokeWidth="1" opacity="0.6" strokeDasharray="2,2" />
      </g>
      
      {/* 标注 */}
      <text x="100" y="110" textAnchor="middle" fill="#1890ff" fontSize="12" fontWeight="bold">
        数据管理
      </text>
      <text x="100" y="125" textAnchor="middle" fill="#722ed1" fontSize="10">
        Data Management
      </text>
    </svg>
  </div>
);

// 设置示意图组件
const SettingsSchematic: React.FC = () => (
  <div className="schematic-container">
    <svg width="200" height="150" viewBox="0 0 200 150">
      <defs>
        <linearGradient id="settingsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#13c2c2', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#52c41a', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      {/* 齿轮 */}
      <g transform="translate(100, 50)">
        <circle cx="0" cy="0" r="25" fill="url(#settingsGradient)" opacity="0.8" />
        <circle cx="0" cy="0" r="10" fill="none" stroke="#13c2c2" strokeWidth="2" />
        
        {/* 齿轮齿 */}
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i * 45) * Math.PI / 180;
          const x1 = Math.cos(angle) * 20;
          const y1 = Math.sin(angle) * 20;
          const x2 = Math.cos(angle) * 30;
          const y2 = Math.sin(angle) * 30;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#13c2c2"
              strokeWidth="3"
              opacity="0.8"
            />
          );
        })}
        
        {/* 小齿轮 */}
        <g transform="translate(35, -15)">
          <circle cx="0" cy="0" r="15" fill="url(#settingsGradient)" opacity="0.6" />
          <circle cx="0" cy="0" r="6" fill="none" stroke="#52c41a" strokeWidth="2" />
          
          {Array.from({ length: 6 }, (_, i) => {
            const angle = (i * 60) * Math.PI / 180;
            const x1 = Math.cos(angle) * 12;
            const y1 = Math.sin(angle) * 12;
            const x2 = Math.cos(angle) * 18;
            const y2 = Math.sin(angle) * 18;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#52c41a"
                strokeWidth="2"
                opacity="0.8"
              />
            );
          })}
        </g>
      </g>
      
      {/* 标注 */}
      <text x="100" y="110" textAnchor="middle" fill="#13c2c2" fontSize="12" fontWeight="bold">
        系统设置
      </text>
      <text x="100" y="125" textAnchor="middle" fill="#52c41a" fontSize="10">
        System Settings
      </text>
    </svg>
  </div>
);

const CSS3DSchematic: React.FC<CSS3DSchematicProps> = ({ 
  type, 
  width = 300, 
  height = 200, 
  className 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<CSS3DRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 300);
    cameraRef.current = camera;

    // 创建CSS3D渲染器
    const renderer = new CSS3DRenderer();
    renderer.setSize(width, height);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
    controlsRef.current = controls;

    // 创建HTML元素
    const element = document.createElement('div');
    element.style.width = '200px';
    element.style.height = '150px';
    element.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    element.style.borderRadius = '8px';
    element.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    element.style.backdropFilter = 'blur(5px)';
    element.style.display = 'flex';
    element.style.alignItems = 'center';
    element.style.justifyContent = 'center';

    // 根据类型渲染不同的示意图
    let schematicHTML;
    switch (type) {
      case 'geometry':
        schematicHTML = `
          <svg width="200" height="150" viewBox="0 0 200 150">
            <defs>
              <linearGradient id="geomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#00d9ff;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#0099cc;stop-opacity:1" />
              </linearGradient>
            </defs>
            <g transform="translate(50, 30)">
              <polygon points="0,0 40,0 50,10 10,10" fill="url(#geomGradient)" opacity="0.8" />
              <polygon points="0,0 0,40 10,50 10,10" fill="url(#geomGradient)" opacity="0.6" />
              <polygon points="0,40 40,40 50,50 10,50" fill="url(#geomGradient)" opacity="0.4" />
              <polygon points="40,0 40,40 50,50 50,10" fill="url(#geomGradient)" opacity="0.7" />
            </g>
            <g transform="translate(120, 40)">
              <ellipse cx="20" cy="0" rx="20" ry="8" fill="url(#geomGradient)" opacity="0.8" />
              <rect x="0" y="0" width="40" height="30" fill="url(#geomGradient)" opacity="0.6" />
              <ellipse cx="20" cy="30" rx="20" ry="8" fill="url(#geomGradient)" opacity="0.4" />
            </g>
            <text x="100" y="110" text-anchor="middle" fill="#00d9ff" font-size="12" font-weight="bold">几何建模</text>
            <text x="100" y="125" text-anchor="middle" fill="#66ccff" font-size="10">Geometry Modeling</text>
          </svg>
        `;
        break;
      case 'mesh':
        schematicHTML = `
          <svg width="200" height="150" viewBox="0 0 200 150">
            <defs>
              <linearGradient id="meshGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#52c41a;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#389e0d;stop-opacity:1" />
              </linearGradient>
            </defs>
            <g transform="translate(50, 20)">
              <polygon points="0,0 15,0 7.5,15" fill="none" stroke="url(#meshGradient)" stroke-width="1" opacity="0.7" />
              <polygon points="15,0 30,0 22.5,15" fill="none" stroke="url(#meshGradient)" stroke-width="1" opacity="0.7" />
              <polygon points="30,0 45,0 37.5,15" fill="none" stroke="url(#meshGradient)" stroke-width="1" opacity="0.7" />
              <polygon points="0,15 15,15 7.5,30" fill="none" stroke="url(#meshGradient)" stroke-width="1" opacity="0.7" />
              <polygon points="15,15 30,15 22.5,30" fill="none" stroke="url(#meshGradient)" stroke-width="1" opacity="0.7" />
              <polygon points="30,15 45,15 37.5,30" fill="none" stroke="url(#meshGradient)" stroke-width="1" opacity="0.7" />
              <circle cx="0" cy="0" r="1.5" fill="#52c41a" opacity="0.8" />
              <circle cx="15" cy="0" r="1.5" fill="#52c41a" opacity="0.8" />
              <circle cx="30" cy="0" r="1.5" fill="#52c41a" opacity="0.8" />
              <circle cx="45" cy="0" r="1.5" fill="#52c41a" opacity="0.8" />
              <circle cx="0" cy="15" r="1.5" fill="#52c41a" opacity="0.8" />
              <circle cx="15" cy="15" r="1.5" fill="#52c41a" opacity="0.8" />
              <circle cx="30" cy="15" r="1.5" fill="#52c41a" opacity="0.8" />
              <circle cx="45" cy="15" r="1.5" fill="#52c41a" opacity="0.8" />
            </g>
            <text x="100" y="110" text-anchor="middle" fill="#52c41a" font-size="12" font-weight="bold">网格生成</text>
            <text x="100" y="125" text-anchor="middle" fill="#73d13d" font-size="10">Mesh Generation</text>
          </svg>
        `;
        break;
      case 'analysis':
        schematicHTML = `
          <svg width="200" height="150" viewBox="0 0 200 150">
            <defs>
              <linearGradient id="analysisGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#ff7875;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#ffa940;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#fadb14;stop-opacity:1" />
              </linearGradient>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#ff4d4f" />
              </marker>
            </defs>
            <g transform="translate(40, 30)">
              <path d="M0,0 Q60,10 120,0 Q120,30 120,60 Q60,70 0,60 Q0,30 0,0" fill="url(#analysisGradient)" opacity="0.8" />
              <path d="M10,15 Q60,20 110,15" fill="none" stroke="#ff4d4f" stroke-width="1" opacity="0.6" />
              <path d="M10,30 Q60,35 110,30" fill="none" stroke="#fa8c16" stroke-width="1" opacity="0.6" />
              <path d="M10,45 Q60,50 110,45" fill="none" stroke="#fadb14" stroke-width="1" opacity="0.6" />
              <line x1="60" y1="-10" x2="60" y2="10" stroke="#ff4d4f" stroke-width="2" marker-end="url(#arrowhead)" />
            </g>
            <text x="100" y="110" text-anchor="middle" fill="#ff7875" font-size="12" font-weight="bold">仿真分析</text>
            <text x="100" y="125" text-anchor="middle" fill="#ffa940" font-size="10">Simulation Analysis</text>
          </svg>
        `;
        break;
      case 'data':
        schematicHTML = `
          <svg width="200" height="150" viewBox="0 0 200 150">
            <defs>
              <linearGradient id="dataGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#1890ff;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#722ed1;stop-opacity:1" />
              </linearGradient>
            </defs>
            <g transform="translate(70, 20)">
              <ellipse cx="30" cy="0" rx="30" ry="8" fill="url(#dataGradient)" opacity="0.8" />
              <rect x="0" y="0" width="60" height="20" fill="url(#dataGradient)" opacity="0.6" />
              <ellipse cx="30" cy="20" rx="30" ry="8" fill="url(#dataGradient)" opacity="0.4" />
              <ellipse cx="30" cy="30" rx="30" ry="8" fill="url(#dataGradient)" opacity="0.8" />
              <rect x="0" y="30" width="60" height="20" fill="url(#dataGradient)" opacity="0.6" />
              <ellipse cx="30" cy="50" rx="30" ry="8" fill="url(#dataGradient)" opacity="0.4" />
            </g>
            <g transform="translate(20, 30)">
              <circle cx="0" cy="0" r="3" fill="#1890ff" opacity="0.8" />
              <line x1="3" y1="0" x2="40" y2="0" stroke="#1890ff" stroke-width="1" opacity="0.6" stroke-dasharray="2,2" />
              <circle cx="0" cy="15" r="3" fill="#1890ff" opacity="0.8" />
              <line x1="3" y1="15" x2="40" y2="15" stroke="#1890ff" stroke-width="1" opacity="0.6" stroke-dasharray="2,2" />
            </g>
            <text x="100" y="110" text-anchor="middle" fill="#1890ff" font-size="12" font-weight="bold">数据管理</text>
            <text x="100" y="125" text-anchor="middle" fill="#722ed1" font-size="10">Data Management</text>
          </svg>
        `;
        break;
      case 'settings':
        schematicHTML = `
          <svg width="200" height="150" viewBox="0 0 200 150">
            <defs>
              <linearGradient id="settingsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#13c2c2;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#52c41a;stop-opacity:1" />
              </linearGradient>
            </defs>
            <g transform="translate(100, 50)">
              <circle cx="0" cy="0" r="25" fill="url(#settingsGradient)" opacity="0.8" />
              <circle cx="0" cy="0" r="10" fill="none" stroke="#13c2c2" stroke-width="2" />
              <line x1="20" y1="0" x2="30" y2="0" stroke="#13c2c2" stroke-width="3" opacity="0.8" />
              <line x1="14" y1="14" x2="21" y2="21" stroke="#13c2c2" stroke-width="3" opacity="0.8" />
              <line x1="0" y1="20" x2="0" y2="30" stroke="#13c2c2" stroke-width="3" opacity="0.8" />
              <line x1="-14" y1="14" x2="-21" y2="21" stroke="#13c2c2" stroke-width="3" opacity="0.8" />
              <line x1="-20" y1="0" x2="-30" y2="0" stroke="#13c2c2" stroke-width="3" opacity="0.8" />
              <line x1="-14" y1="-14" x2="-21" y2="-21" stroke="#13c2c2" stroke-width="3" opacity="0.8" />
              <line x1="0" y1="-20" x2="0" y2="-30" stroke="#13c2c2" stroke-width="3" opacity="0.8" />
              <line x1="14" y1="-14" x2="21" y2="-21" stroke="#13c2c2" stroke-width="3" opacity="0.8" />
              <g transform="translate(35, -15)">
                <circle cx="0" cy="0" r="15" fill="url(#settingsGradient)" opacity="0.6" />
                <circle cx="0" cy="0" r="6" fill="none" stroke="#52c41a" stroke-width="2" />
                <line x1="12" y1="0" x2="18" y2="0" stroke="#52c41a" stroke-width="2" opacity="0.8" />
                <line x1="6" y1="10" x2="9" y2="15" stroke="#52c41a" stroke-width="2" opacity="0.8" />
                <line x1="-6" y1="10" x2="-9" y2="15" stroke="#52c41a" stroke-width="2" opacity="0.8" />
                <line x1="-12" y1="0" x2="-18" y2="0" stroke="#52c41a" stroke-width="2" opacity="0.8" />
                <line x1="-6" y1="-10" x2="-9" y2="-15" stroke="#52c41a" stroke-width="2" opacity="0.8" />
                <line x1="6" y1="-10" x2="9" y2="-15" stroke="#52c41a" stroke-width="2" opacity="0.8" />
              </g>
            </g>
            <text x="100" y="110" text-anchor="middle" fill="#13c2c2" font-size="12" font-weight="bold">系统设置</text>
            <text x="100" y="125" text-anchor="middle" fill="#52c41a" font-size="10">System Settings</text>
          </svg>
        `;
        break;
      default:
        schematicHTML = `
          <svg width="200" height="150" viewBox="0 0 200 150">
            <text x="100" y="75" text-anchor="middle" fill="#ffffff" font-size="14">Default View</text>
          </svg>
        `;
    }

    // 设置HTML内容
    element.innerHTML = schematicHTML;

    // 创建CSS3D对象
    const object = new CSS3DObject(element);
    object.position.set(0, 0, 0);
    scene.add(object);

    setIsInitialized(true);

    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 清理函数
    return () => {
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      
      // 安全卸载 renderer.domElement（仅当确为其父节点时）
      try {
        const mountNode = containerRef.current;
        const renderer = rendererRef.current;
        const dom = renderer?.domElement;
        if (mountNode && dom && dom.parentNode === mountNode) {
          mountNode.removeChild(dom);
        }
        renderer?.dispose?.();
      } catch (e) {
        // 忽略卸载期间的偶发性错误，避免 NotFoundError 影响卸载流程
        console.warn('[CSS3DSchematic] cleanup warning:', e);
      } finally {
        rendererRef.current = undefined;
      }
    };
  }, [type, width, height]);

  return (
    <div
      ref={containerRef}
      className={`css3d-schematic ${className || ''}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(0, 4, 32, 0.8), rgba(0, 17, 34, 0.8))',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden'
      }}
    >
      {!isInitialized && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'var(--text-muted)',
          fontSize: '12px'
        }}>
          初始化中...
        </div>
      )}
      
      <style>{`
        .schematic-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 8px;
        }
        
        .css3d-schematic {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
      `}</style>
    </div>
  );
};

export default CSS3DSchematic;