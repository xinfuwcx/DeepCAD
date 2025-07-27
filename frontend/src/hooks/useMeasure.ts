/**
 * 测量工具 Hook
 * 提供距离测量、角度测量等功能
 */

import { useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useViewportStore } from '../stores/useViewportStore';
import { MeasurementData } from '../types/viewport';

interface UseMeasureOptions {
  scene?: THREE.Scene;
  camera?: THREE.Camera;
  domElement?: HTMLElement;
}

interface MeasurePoint {
  position: THREE.Vector3;
  screenPosition: THREE.Vector2;
  id: string;
}

export function useMeasure(options: UseMeasureOptions = {}) {
  const { scene, camera, domElement } = options;
  
  const [isActive, setIsActive] = useState(false);
  const [measureType, setMeasureType] = useState<'distance' | 'angle'>('distance');
  const [points, setPoints] = useState<MeasurePoint[]>([]);
  const [tempPoint, setTempPoint] = useState<MeasurePoint | null>(null);
  
  const raycaster = useRef(new THREE.Raycaster());
  const measureGroup = useRef<THREE.Group | null>(null);
  
  const { addMeasurement, measurements } = useViewportStore();

  // 初始化测量组
  const initializeMeasureGroup = useCallback(() => {
    if (!scene || measureGroup.current) return;
    
    const group = new THREE.Group();
    group.name = 'measurement-group';
    scene.add(group);
    measureGroup.current = group;
  }, [scene]);

  // 清理测量组
  const cleanupMeasureGroup = useCallback(() => {
    if (!scene || !measureGroup.current) return;
    
    scene.remove(measureGroup.current);
    measureGroup.current = null;
  }, [scene]);

  // 开始测量
  const startMeasure = useCallback((type: 'distance' | 'angle' = 'distance') => {
    setIsActive(true);
    setMeasureType(type);
    setPoints([]);
    setTempPoint(null);
    initializeMeasureGroup();
  }, [initializeMeasureGroup]);

  // 停止测量
  const stopMeasure = useCallback(() => {
    setIsActive(false);
    setPoints([]);
    setTempPoint(null);
  }, []);

  // 获取鼠标在3D空间的位置
  const getWorldPosition = useCallback((event: MouseEvent | React.MouseEvent): THREE.Vector3 | null => {
    if (!camera || !domElement) return null;

    const rect = domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycaster.current.setFromCamera(mouse, camera);
    
    // 尝试与场景中的对象相交
    if (scene) {
      const intersects = raycaster.current.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        return intersects[0].point;
      }
    }

    // 如果没有相交，投射到Z=0平面
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(plane, intersectPoint);
    
    return intersectPoint;
  }, [camera, domElement, scene]);

  // 添加测量点
  const addPoint = useCallback((worldPosition: THREE.Vector3) => {
    const point: MeasurePoint = {
      position: worldPosition.clone(),
      screenPosition: new THREE.Vector2(), // 稍后计算
      id: `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setPoints(prev => {
      const newPoints = [...prev, point];
      
      // 根据测量类型决定何时完成测量
      if (measureType === 'distance' && newPoints.length === 2) {
        completeMeasurement(newPoints);
        return [];
      } else if (measureType === 'angle' && newPoints.length === 3) {
        completeMeasurement(newPoints);
        return [];
      }
      
      return newPoints;
    });

    // 添加可视化点
    addVisualPoint(worldPosition);
  }, [measureType]);

  // 添加可视化点
  const addVisualPoint = useCallback((position: THREE.Vector3) => {
    if (!measureGroup.current) return;

    const pointGeometry = new THREE.SphereGeometry(0.1);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
    pointMesh.position.copy(position);
    measureGroup.current.add(pointMesh);
  }, []);

  // 完成测量
  const completeMeasurement = useCallback((measurePoints: MeasurePoint[]) => {
    if (measureType === 'distance' && measurePoints.length === 2) {
      const distance = measurePoints[0].position.distanceTo(measurePoints[1].position);
      
      const measurement: MeasurementData = {
        id: `measurement-${Date.now()}`,
        type: 'distance',
        points: measurePoints.map(p => ({
          x: p.position.x,
          y: p.position.y,
          z: p.position.z
        })),
        value: distance,
        unit: 'm',
        label: `${distance.toFixed(3)} m`
      };

      addMeasurement(measurement);
      addDistanceLine(measurePoints[0].position, measurePoints[1].position, measurement.label!);
      
    } else if (measureType === 'angle' && measurePoints.length === 3) {
      const [p1, p2, p3] = measurePoints.map(p => p.position);
      const v1 = new THREE.Vector3().subVectors(p1, p2).normalize();
      const v2 = new THREE.Vector3().subVectors(p3, p2).normalize();
      const angle = Math.acos(v1.dot(v2)) * (180 / Math.PI);

      const measurement: MeasurementData = {
        id: `measurement-${Date.now()}`,
        type: 'angle',
        points: measurePoints.map(p => ({
          x: p.position.x,
          y: p.position.y,
          z: p.position.z
        })),
        value: angle,
        unit: '°',
        label: `${angle.toFixed(1)}°`
      };

      addMeasurement(measurement);
      addAngleArc(p1, p2, p3, angle);
    }
  }, [measureType, addMeasurement]);

  // 添加距离线
  const addDistanceLine = useCallback((start: THREE.Vector3, end: THREE.Vector3, label: string) => {
    if (!measureGroup.current) return;

    // 创建线段
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff4444, linewidth: 2 });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    measureGroup.current.add(line);

    // 添加标签（简化版，实际应该使用HTML标签或Canvas纹理）
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    // 文字标签功能将通过HTML覆盖层或Canvas纹理实现
  }, []);

  // 添加角度弧
  const addAngleArc = useCallback((p1: THREE.Vector3, center: THREE.Vector3, p3: THREE.Vector3, angle: number) => {
    if (!measureGroup.current) return;

    // 创建角度弧线
    const radius = Math.min(
      center.distanceTo(p1),
      center.distanceTo(p3)
    ) * 0.3;

    const v1 = new THREE.Vector3().subVectors(p1, center).normalize();
    const v2 = new THREE.Vector3().subVectors(p3, center).normalize();
    
    const points: THREE.Vector3[] = [];
    const steps = 32;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const currentAngle = angle * t * (Math.PI / 180);
      
      // 使用四元数进行旋转
      const quaternion = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3().crossVectors(v1, v2).normalize(),
        currentAngle
      );
      
      const point = v1.clone().applyQuaternion(quaternion).multiplyScalar(radius).add(center);
      points.push(point);
    }

    const arcGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const arcMaterial = new THREE.LineBasicMaterial({ color: 0x44ff44, linewidth: 2 });
    const arc = new THREE.Line(arcGeometry, arcMaterial);
    measureGroup.current.add(arc);
  }, []);

  // 处理鼠标移动（显示临时测量）
  const handleMouseMove = useCallback((event: MouseEvent | React.MouseEvent) => {
    if (!isActive || points.length === 0) return;

    const worldPos = getWorldPosition(event);
    if (!worldPos) return;

    setTempPoint({
      position: worldPos,
      screenPosition: new THREE.Vector2(),
      id: 'temp'
    });

    // 显示临时测量线
    updateTempVisualization(worldPos);
  }, [isActive, points, getWorldPosition]);

  // 更新临时可视化
  const updateTempVisualization = useCallback((currentPos: THREE.Vector3) => {
    if (!measureGroup.current || points.length === 0) return;

    // 移除旧的临时线
    const tempObjects = measureGroup.current.children.filter(child => child.name === 'temp');
    tempObjects.forEach(obj => measureGroup.current!.remove(obj));

    // 添加新的临时线
    if (measureType === 'distance' && points.length === 1) {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        points[0].position,
        currentPos
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffff44, 
        opacity: 0.7, 
        transparent: true 
      });
      const tempLine = new THREE.Line(lineGeometry, lineMaterial);
      tempLine.name = 'temp';
      measureGroup.current.add(tempLine);
    }
  }, [measureType, points]);

  // 处理点击
  const handleClick = useCallback((event: MouseEvent | React.MouseEvent) => {
    if (!isActive) return;

    const worldPos = getWorldPosition(event);
    if (!worldPos) return;

    addPoint(worldPos);
  }, [isActive, getWorldPosition, addPoint]);

  // 清除所有测量
  const clearMeasurements = useCallback(() => {
    if (measureGroup.current) {
      measureGroup.current.clear();
    }
    setPoints([]);
    setTempPoint(null);
  }, []);

  // 删除指定测量
  const removeMeasurement = useCallback((id: string) => {
    // 通过measureGroup清理对应的三维对象
    // 需要实现对象ID映射和选择性移除功能
    if (measureGroup.current) {
      measureGroup.current.clear(); // 临时实现：清空所有测量对象
    }
    console.log(`删除测量对象: ${id}`);
  }, []);

  return {
    // 状态
    isActive,
    measureType,
    points,
    tempPoint,
    measurements,
    
    // 控制方法
    startMeasure,
    stopMeasure,
    setMeasureType,
    clearMeasurements,
    removeMeasurement,
    
    // 事件处理器
    handleClick,
    handleMouseMove,
    
    // 工具方法
    getWorldPosition
  };
}

export default useMeasure;