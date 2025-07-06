import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Box } from '@mui/material';

interface DiagramRendererProps {
    type: 'excavation' | 'tunnel' | 'diaphragm_wall' | 'geological_section';
    width?: number;
    height?: number;
    data?: any;
}

const DiagramRenderer: React.FC<DiagramRendererProps> = ({ 
    type, 
    width = 400, 
    height = 300, 
    data 
}) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene>();
    const rendererRef = useRef<THREE.WebGLRenderer>();

    useEffect(() => {
        const mountNode = mountRef.current;
        if (!mountNode) return;

        // 创建场景
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8f9fa);
        sceneRef.current = scene;

        // 创建正交相机 (二维视图)
        const camera = new THREE.OrthographicCamera(
            -width/2, width/2, height/2, -height/2, 0.1, 1000
        );
        camera.position.z = 10;

        // 创建渲染器
        const renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true 
        });
        renderer.setSize(width, height);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.border = '1px solid #e0e0e0';
        renderer.domElement.style.borderRadius = '8px';
        rendererRef.current = renderer;
        mountNode.appendChild(renderer.domElement);

        // 根据类型绘制不同的示意图
        switch (type) {
            case 'excavation':
                drawExcavationDiagram(scene, data);
                break;
            case 'tunnel':
                drawTunnelDiagram(scene, data);
                break;
            case 'diaphragm_wall':
                drawDiaphragmWallDiagram(scene, data);
                break;
            case 'geological_section':
                drawGeologicalSection(scene, data);
                break;
        }

        // 渲染
        renderer.render(scene, camera);

        return () => {
            if (mountNode && renderer.domElement) {
                mountNode.removeChild(renderer.domElement);
            }
        };
    }, [type, width, height, data]);

    return (
        <Box 
            ref={mountRef} 
            className="diagram-container"
            sx={{ 
                width: width,
                height: height,
                position: 'relative',
                margin: '8px auto',
                '& canvas': {
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                        borderColor: '#007bff !important',
                    }
                }
            }} 
        />
    );
};

// 绘制基坑开挖示意图
function drawExcavationDiagram(scene: THREE.Scene, data: any) {
    const group = new THREE.Group();

    // 地表线
    const groundGeometry = new THREE.PlaneGeometry(300, 20);
    const groundMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x8B4513,
        transparent: true,
        opacity: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = 100;
    group.add(ground);

    // 基坑轮廓
    const excavationDepth = data?.depth || 80;
    const excavationWidth = data?.width || 200;
    
    // 基坑边线
    const excavationGeometry = new THREE.BufferGeometry();
    const points = [
        new THREE.Vector3(-excavationWidth/2, 90, 0),
        new THREE.Vector3(-excavationWidth/2, 90 - excavationDepth, 0),
        new THREE.Vector3(excavationWidth/2, 90 - excavationDepth, 0),
        new THREE.Vector3(excavationWidth/2, 90, 0)
    ];
    excavationGeometry.setFromPoints(points);
    
    const excavationMaterial = new THREE.LineBasicMaterial({ 
        color: 0x2196F3,
        linewidth: 3
    });
    const excavationLine = new THREE.Line(excavationGeometry, excavationMaterial);
    group.add(excavationLine);

    // 尺寸标注
    addDimensionLine(group, -excavationWidth/2, excavationWidth/2, -50, `${excavationWidth}m`);
    addDimensionLine(group, excavationWidth/2 + 20, excavationWidth/2 + 20, 90, 90 - excavationDepth, `${excavationDepth}m`);

    scene.add(group);
}

// 绘制隧道断面示意图
function drawTunnelDiagram(scene: THREE.Scene, data: any) {
    const group = new THREE.Group();
    
    const tunnelType = data?.shape || 'horseshoe';
    const diameter = data?.diameter || 80;
    
    if (tunnelType === 'horseshoe') {
        // 马蹄形隧道
        const shape = new THREE.Shape();
        const radius = diameter / 2;
        
        // 马蹄形路径
        shape.moveTo(-radius, 0);
        shape.quadraticCurveTo(-radius, radius, 0, radius);
        shape.quadraticCurveTo(radius, radius, radius, 0);
        shape.lineTo(radius, -radius * 0.3);
        shape.quadraticCurveTo(0, -radius * 0.5, -radius, -radius * 0.3);
        shape.lineTo(-radius, 0);
        
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x424242,
            transparent: true,
            opacity: 0.7
        });
        const tunnel = new THREE.Mesh(geometry, material);
        group.add(tunnel);
        
        // 边框
        const edges = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edges, edgeMaterial);
        group.add(wireframe);
    }
    
    // 尺寸标注
    addDimensionLine(group, -diameter/2, diameter/2, -diameter/2 - 30, `Ø${diameter}m`);
    
    scene.add(group);
}

// 绘制地连墙示意图
function drawDiaphragmWallDiagram(scene: THREE.Scene, data: any) {
    const group = new THREE.Group();
    
    const wallThickness = data?.thickness || 8;
    const wallHeight = data?.height || 120;
    
    // 地连墙
    const wallGeometry = new THREE.PlaneGeometry(wallThickness, wallHeight);
    const wallMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x616161,
        transparent: true,
        opacity: 0.8
    });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.y = wallHeight/2 - 100;
    group.add(wall);
    
    // 地表线
    const groundGeometry = new THREE.PlaneGeometry(200, 10);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = 0;
    group.add(ground);
    
    // 尺寸标注
    addDimensionLine(group, -wallThickness/2 - 30, -wallThickness/2 - 30, 0, wallHeight - 100, `${wallHeight}m`);
    addDimensionLine(group, -wallThickness/2, wallThickness/2, -wallHeight/2 - 130, `${wallThickness}m`);
    
    scene.add(group);
}

// 绘制地质剖面图
function drawGeologicalSection(scene: THREE.Scene, data: any) {
    const group = new THREE.Group();
    
    const layers = data?.layers || [
        { name: '填土', thickness: 30, color: 0xD2B48C },
        { name: '粘土', thickness: 40, color: 0x8B4513 },
        { name: '砂土', thickness: 50, color: 0xF4A460 },
        { name: '基岩', thickness: 60, color: 0x696969 }
    ];
    
    let currentY = 100;
    
    layers.forEach((layer, index) => {
        const layerGeometry = new THREE.PlaneGeometry(300, layer.thickness);
        const layerMaterial = new THREE.MeshBasicMaterial({ 
            color: layer.color,
            transparent: true,
            opacity: 0.8
        });
        const layerMesh = new THREE.Mesh(layerGeometry, layerMaterial);
        layerMesh.position.y = currentY - layer.thickness/2;
        group.add(layerMesh);
        
        // 图层边界线
        const boundaryGeometry = new THREE.BufferGeometry();
        const boundaryPoints = [
            new THREE.Vector3(-150, currentY, 0.1),
            new THREE.Vector3(150, currentY, 0.1)
        ];
        boundaryGeometry.setFromPoints(boundaryPoints);
        const boundaryMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
        const boundaryLine = new THREE.Line(boundaryGeometry, boundaryMaterial);
        group.add(boundaryLine);
        
        // 图层标签
        addTextLabel(group, 160, currentY - layer.thickness/2, `${layer.name} (${layer.thickness}m)`);
        
        currentY -= layer.thickness;
    });
    
    scene.add(group);
}

// 添加尺寸标注线
function addDimensionLine(
    group: THREE.Group, 
    x1: number, 
    x2: number, 
    y: number, 
    label?: string
): void;
function addDimensionLine(
    group: THREE.Group, 
    x: number, 
    x2: number, 
    y1: number, 
    y2: number, 
    label?: string
): void;
function addDimensionLine(
    group: THREE.Group, 
    x1: number, 
    x2: number, 
    y1: number, 
    y2?: number | string, 
    label?: string
) {
    if (typeof y2 === 'string') {
        // 水平尺寸线
        label = y2;
        const y = y1;
        
        const lineGeometry = new THREE.BufferGeometry();
        const points = [
            new THREE.Vector3(x1, y, 0.1),
            new THREE.Vector3(x2, y, 0.1)
        ];
        lineGeometry.setFromPoints(points);
        
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFF5722 });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        group.add(line);
        
        if (label) {
            addTextLabel(group, (x1 + x2) / 2, y - 15, label);
        }
    } else if (typeof y2 === 'number') {
        // 垂直尺寸线
        const x = x1;
        
        const lineGeometry = new THREE.BufferGeometry();
        const points = [
            new THREE.Vector3(x, y1, 0.1),
            new THREE.Vector3(x, y2, 0.1)
        ];
        lineGeometry.setFromPoints(points);
        
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFF5722 });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        group.add(line);
        
        if (label) {
            addTextLabel(group, x + 15, (y1 + y2) / 2, label);
        }
    }
}

// 添加文字标签 (简化版本，实际应用中可以使用 CSS2DRenderer)
function addTextLabel(group: THREE.Group, x: number, y: number, text: string) {
    // 这里可以使用 CSS2DRenderer 来显示真正的文字
    // 现在用简单的点来表示标签位置
    const pointGeometry = new THREE.SphereGeometry(2);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xFF5722 });
    const point = new THREE.Mesh(pointGeometry, pointMaterial);
    point.position.set(x, y, 0.1);
    point.userData.label = text;
    group.add(point);
}

export default DiagramRenderer; 