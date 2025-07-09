import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Box } from '@mui/material';

interface DiagramRendererProps {
    type: 'excavation' | 'tunnel' | 'diaphragm_wall' | 'geological_section' | 'geological_plan' | 'geological_3d';
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
    const cameraRef = useRef<THREE.OrthographicCamera | THREE.PerspectiveCamera>();
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        const mountNode = mountRef.current;
        if (!mountNode) return;

        // 获取容器的实际尺寸
        const containerWidth = mountNode.clientWidth;
        const containerHeight = mountNode.clientHeight;
        const aspectRatio = containerWidth / containerHeight;

        // 创建场景
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8f9fa);
        sceneRef.current = scene;

        // 根据类型选择相机
        let camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
        
        if (type === 'geological_3d') {
            // 3D视图使用透视相机
            camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 1000);
            camera.position.set(200, 150, 200);
            camera.lookAt(0, 0, 0);
        } else {
            // 2D视图使用正交相机
            camera = new THREE.OrthographicCamera(
                -containerWidth/2, containerWidth/2, containerHeight/2, -containerHeight/2, 0.1, 1000
            );
            camera.position.z = 10;
        }
        
        cameraRef.current = camera;

        // 创建渲染器
        const renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true 
        });
        renderer.setSize(containerWidth, containerHeight);
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
                drawGeologicalSection(scene, data, containerWidth, containerHeight);
                break;
            case 'geological_plan':
                drawGeologicalPlan(scene, data, containerWidth, containerHeight);
                break;
            case 'geological_3d':
                drawGeological3D(scene, data, containerWidth, containerHeight);
                // 3D视图需要动画
                const animate = () => {
                    if (cameraRef.current && rendererRef.current && sceneRef.current) {
                        // 旋转场景中的模型
                        const model = scene.getObjectByName('geological_model');
                        if (model) {
                            model.rotation.y += 0.005;
                        }
                        
                        rendererRef.current.render(sceneRef.current, cameraRef.current);
                    }
                    animationFrameRef.current = requestAnimationFrame(animate);
                };
                animate();
                break;
        }

        // 对于非3D视图，直接渲染一次
        if (type !== 'geological_3d') {
            renderer.render(scene, camera);
        }

        // 处理窗口大小变化
        const handleResize = () => {
            if (!mountNode || !cameraRef.current || !rendererRef.current) return;
            
            const newWidth = mountNode.clientWidth;
            const newHeight = mountNode.clientHeight;
            
            // 更新相机
            const camera = cameraRef.current;
            if (camera instanceof THREE.OrthographicCamera) {
                camera.left = -newWidth / 2;
                camera.right = newWidth / 2;
                camera.top = newHeight / 2;
                camera.bottom = -newHeight / 2;
                camera.updateProjectionMatrix();
            } else if (camera instanceof THREE.PerspectiveCamera) {
                camera.aspect = newWidth / newHeight;
                camera.updateProjectionMatrix();
            }
            
            // 更新渲染器
            rendererRef.current.setSize(newWidth, newHeight);
            rendererRef.current.render(scene, camera);
        };

        // 创建ResizeObserver监听容器大小变化
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(mountNode);

        return () => {
            // 清理动画
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            
            resizeObserver.disconnect();
            if (mountNode && renderer.domElement) {
                mountNode.removeChild(renderer.domElement);
            }
        };
    }, [type, data]);

    return (
        <Box 
            ref={mountRef} 
            className="diagram-container"
            sx={{ 
                width: '100%',
                height: '100%',
                position: 'relative',
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
    const width = data?.width || data?.diameter || 80;
    const height = data?.height || width;
    const archHeight = data?.archHeight || height * 0.6;
    const radius = data?.radius || width / 2;

    let geometry: THREE.BufferGeometry | THREE.ShapeGeometry;
    let material: THREE.MeshBasicMaterial;

    if (tunnelType === 'horseshoe') {
        const straightHeight = height - archHeight;
        const shape = new THREE.Shape();
        shape.moveTo(-width/2, -straightHeight/2);
        shape.lineTo(-width/2, straightHeight/2);
        shape.absarc(0, straightHeight/2, width/2, Math.PI, 0, false);
        shape.lineTo(width/2, -straightHeight/2);
        shape.closePath();
        geometry = new THREE.ShapeGeometry(shape);
        material = new THREE.MeshBasicMaterial({ color: 0x424242, transparent: true, opacity: 0.7 });
    } else if (tunnelType === 'circular') {
        geometry = new THREE.CircleGeometry(radius, 64);
        material = new THREE.MeshBasicMaterial({ color: 0x424242, transparent: true, opacity: 0.7 });
    } else {
        geometry = new THREE.PlaneGeometry(width, height);
        material = new THREE.MeshBasicMaterial({ color: 0x424242, transparent: true, opacity: 0.7 });
    }

    const tunnelMesh = new THREE.Mesh(geometry, material);
    group.add(tunnelMesh);

    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    const wireframe = new THREE.LineSegments(edges, edgeMaterial);
    group.add(wireframe);

    if (tunnelType === 'circular') {
        addDimensionLine(group, -radius, radius, -radius - 30, `Ø${radius * 2}m`);
    } else {
        addDimensionLine(group, -width/2, width/2, -height/2 - 30, `${width}×${height}m`);
    }

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
function drawGeologicalSection(scene: THREE.Scene, data: any, containerWidth: number, containerHeight: number) {
    const group = new THREE.Group();
    
    const layers = data || [];
    if (layers.length === 0) return;
    
    // 计算总厚度
    const totalThickness = layers.reduce((sum: number, layer: any) => sum + layer.thickness, 0);
    
    // 计算合适的缩放比例，确保图形完全在容器内
    const padding = 40; // 边距
    const availableHeight = containerHeight - padding * 2;
    const scale = Math.min(1, availableHeight / totalThickness);
    
    // 调整图层宽度以适应容器
    const layerWidth = containerWidth * 0.8;
    
    let currentY = containerHeight / 2 - padding;
    
    layers.forEach((layer: any, index: number) => {
        const scaledThickness = layer.thickness * scale;
        
        // 创建图层
        const layerGeometry = new THREE.PlaneGeometry(layerWidth, scaledThickness);
        const layerColor = layer.color || '#cccccc';
        const layerMaterial = new THREE.MeshBasicMaterial({ 
            color: new THREE.Color(layerColor),
            transparent: true,
            opacity: 0.8
        });
        const layerMesh = new THREE.Mesh(layerGeometry, layerMaterial);
        layerMesh.position.y = currentY - scaledThickness/2;
        group.add(layerMesh);
        
        // 图层边界线
        const boundaryGeometry = new THREE.BufferGeometry();
        const boundaryPoints = [
            new THREE.Vector3(-layerWidth/2, currentY, 0.1),
            new THREE.Vector3(layerWidth/2, currentY, 0.1)
        ];
        boundaryGeometry.setFromPoints(boundaryPoints);
        
        const boundaryMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
        const boundaryLine = new THREE.Line(boundaryGeometry, boundaryMaterial);
        group.add(boundaryLine);
        
        // 添加图层标签
        const fontSize = Math.max(10, Math.min(14, scaledThickness * 0.3));
        const labelX = -layerWidth/2 + 20;
        const labelY = currentY - scaledThickness/2;
        
        // 创建文本标签
        addTextLabel(group, labelX, labelY, `${layer.name} (${layer.thickness}m)`, fontSize);
        
        // 更新Y坐标
        currentY -= scaledThickness;
    });
    
    // 添加底部边界线
    const bottomBoundaryGeometry = new THREE.BufferGeometry();
    const bottomBoundaryPoints = [
        new THREE.Vector3(-layerWidth/2, currentY, 0.1),
        new THREE.Vector3(layerWidth/2, currentY, 0.1)
    ];
    bottomBoundaryGeometry.setFromPoints(bottomBoundaryPoints);
    
    const bottomBoundaryMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const bottomBoundaryLine = new THREE.Line(bottomBoundaryGeometry, bottomBoundaryMaterial);
    group.add(bottomBoundaryLine);
    
    scene.add(group);
}

// 绘制地质平面图
function drawGeologicalPlan(scene: THREE.Scene, data: any, containerWidth: number, containerHeight: number) {
    const group = new THREE.Group();
    
    const width = data?.width || 500;
    const height = data?.height || 500;
    const depth = data?.depth || 30;
    const topLayer = data?.topLayer;
    
    // 绘制平面边界
    const boundaryGeometry = new THREE.PlaneGeometry(width, height);
    const boundaryMaterial = new THREE.MeshBasicMaterial({ 
        color: topLayer?.color || 0xD2B48C,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const boundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
    boundary.rotation.x = -Math.PI / 2; // 水平放置
    group.add(boundary);
    
    // 添加网格线
    const gridHelper = new THREE.GridHelper(Math.max(width, height), 10, 0x888888, 0xCCCCCC);
    gridHelper.position.y = 0.1; // 稍微抬高网格，避免z-fighting
    group.add(gridHelper);
    
    // 添加坐标轴
    const axesHelper = new THREE.AxesHelper(Math.min(width, height) * 0.4);
    axesHelper.position.set(-width/2 + 20, 0.2, -height/2 + 20);
    group.add(axesHelper);
    
    // 添加文本标签
    addTextLabel(group, 0, 50, `平面尺寸: ${width}m × ${height}m`, 14);
    if (topLayer) {
        addTextLabel(group, 0, 30, `顶层: ${topLayer.name}`, 14);
    }
    addTextLabel(group, 0, 10, `总深度: ${depth}m`, 14);
    
    // 缩放和居中
    const scale = Math.min(containerWidth / width, containerHeight / height) * 0.8;
    group.scale.set(scale, scale, scale);
    
    scene.add(group);
}

// 绘制地质3D视图
function drawGeological3D(scene: THREE.Scene, data: any, containerWidth: number, containerHeight: number) {
    const group = new THREE.Group();
    group.name = 'geological_model';
    
    const width = data?.width || 500;
    const height = data?.height || 500;
    const layers = data?.layers || [];
    
    // 添加环境光和方向光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    let accumulatedHeight = 0;
    
    // 从上到下绘制每一层
    layers.forEach((layer: any, index: number) => {
        const layerThickness = layer.thickness || 10;
        const layerColor = layer.color || 0xD2B48C;
        
        // 创建一个表示土层的盒子
        const boxGeometry = new THREE.BoxGeometry(width, layerThickness, height);
        const boxMaterial = new THREE.MeshStandardMaterial({ 
            color: layerColor,
            transparent: true,
            opacity: 0.8,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
        boxMesh.position.y = -accumulatedHeight - layerThickness / 2; // 向下堆叠
        
        // 添加边框
        const edges = new THREE.EdgesGeometry(boxGeometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });
        const wireframe = new THREE.LineSegments(edges, edgeMaterial);
        boxMesh.add(wireframe);
        
        group.add(boxMesh);
        
        // 添加层名标签
        const labelPos = new THREE.Vector3(width/2 + 10, -accumulatedHeight - layerThickness/2, 0);
        const textSprite = createTextSprite(layer.name, 12, 0x000000);
        textSprite.position.copy(labelPos);
        group.add(textSprite);
        
        accumulatedHeight += layerThickness;
    });
    
    // 添加坐标轴
    const axesHelper = new THREE.AxesHelper(Math.min(width, height) * 0.4);
    axesHelper.position.set(-width/2, 0, -height/2);
    group.add(axesHelper);
    
    // 缩放和居中
    const totalHeight = accumulatedHeight;
    const scale = Math.min(containerWidth / width, containerHeight / totalHeight) * 0.6;
    group.scale.set(scale, scale, scale);
    
    // 稍微倾斜以便更好地观察
    group.rotation.x = -Math.PI / 10;
    
    scene.add(group);
}

// 创建文本精灵
function createTextSprite(text: string, fontSize: number = 12, color: number = 0x000000) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return new THREE.Object3D(); // 如果无法获取上下文，返回空对象
    
    canvas.width = 256;
    canvas.height = 64;
    
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = `${fontSize}px Arial`;
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(20, 5, 1);
    
    return sprite;
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

// 修改addTextLabel函数以支持自定义字体大小
function addTextLabel(group: THREE.Group, x: number, y: number, text: string, fontSize: number = 12) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.fillStyle = '#000000';
    context.font = `${fontSize}px Arial`;
    context.textBaseline = 'middle';
    context.textAlign = 'left';
    context.fillText(text, 10, canvas.height/2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, 0.2);
    sprite.scale.set(50, 15, 1);
    
    group.add(sprite);
}

export default DiagramRenderer; 