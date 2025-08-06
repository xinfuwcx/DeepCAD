import React, { useMemo } from 'react'
import { useMeshFiles, useMaterials } from '../stores/feaStore'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface MeshRendererProps {}

// 材料颜色映射
const MATERIAL_COLORS: Record<string, string> = {
  soil: '#8B4513',     // 棕色 - 土体
  pit: '#FFE4B5',      // 浅黄 - 基坑开挖区
  wall: '#808080',     // 灰色 - 地连墙
  tunnel: '#F0F8FF',   // 浅蓝 - 隧道空间
  lining: '#A9A9A9'    // 深灰 - 隧道衬砌
}

// 根据物理组名称获取颜色
const getGroupColor = (groupName: string) => {
  const lowerName = groupName.toLowerCase()
  
  if (lowerName.includes('soil') || lowerName.includes('layer')) {
    return '#8B4513' // 土体
  } else if (lowerName.includes('pit') || lowerName.includes('excavation')) {
    return '#FFE4B5' // 开挖区
  } else if (lowerName.includes('wall') || lowerName.includes('diaphragm')) {
    return '#808080' // 地连墙
  } else if (lowerName.includes('tunnel') && !lowerName.includes('lining')) {
    return '#F0F8FF' // 隧道空间
  } else if (lowerName.includes('lining')) {
    return '#A9A9A9' // 衬砌
  }
  
  // 默认颜色
  return '#D3D3D3'
}

// 单个网格组件
const MeshGroup: React.FC<{
  type: string
  threeGeometry: any
  opacity?: number
}> = ({ type, threeGeometry, opacity = 0.8 }) => {
  const materials = useMaterials()

  const meshComponents = useMemo(() => {
    if (!threeGeometry?.groups) return []

    return Object.entries(threeGeometry.groups).map(([groupName, groupData]: [string, any]) => {
      const geometry = new THREE.BufferGeometry()
      
      // 设置顶点
      const vertices = new Float32Array(threeGeometry.vertices)
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      
      // 设置索引
      const indices = new Uint32Array(groupData.indices)
      geometry.setIndex(new THREE.BufferAttribute(indices, 1))
      
      // 计算法向量
      geometry.computeVertexNormals()
      
      // 获取材料颜色
      const color = getGroupColor(groupName)
      const material = materials[groupName]
      
      // 根据材料类型调整渲染参数
      const wireframe = groupData.type === 'tetrahedron' ? false : false
      const side = groupData.type === 'triangle' ? THREE.DoubleSide : THREE.FrontSide
      
      return {
        key: `${type}-${groupName}`,
        geometry,
        color,
        wireframe,
        side,
        groupName,
        material,
        type: groupData.type
      }
    })
  }, [threeGeometry, materials, type])

  return (
    <>
      {meshComponents.map((component) => (
        <mesh
          key={component.key}
          geometry={component.geometry}
          position={[0, 0, 0]}
        >
          <meshPhongMaterial
            color={component.color}
            opacity={component.type === 'tetrahedron' ? opacity * 0.6 : opacity}
            transparent
            wireframe={component.wireframe}
            side={component.side}
          />
        </mesh>
      ))}
    </>
  )
}

// 边界框辅助线
const BoundingBoxHelper: React.FC<{ geometry: THREE.BufferGeometry }> = ({ geometry }) => {
  const boundingBox = useMemo(() => {
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    if (!box) return null
    
    const size = new THREE.Vector3()
    box.getSize(size)
    const center = new THREE.Vector3()
    box.getCenter(center)
    
    return { size, center }
  }, [geometry])

  if (!boundingBox) return null

  return (
    <mesh position={boundingBox.center}>
      <boxGeometry args={[boundingBox.size.x, boundingBox.size.y, boundingBox.size.z]} />
      <meshBasicMaterial color="#ff0000" wireframe opacity={0.2} transparent />
    </mesh>
  )
}

export const MeshRenderer: React.FC<MeshRendererProps> = () => {
  const meshFiles = useMeshFiles()

  // 获取已加载的网格文件
  const loadedMeshes = useMemo(() => {
    return Object.entries(meshFiles).filter(([_, file]) => file.loaded && file.threeGeometry)
  }, [meshFiles])

  // 如果没有加载的网格，不渲染任何内容
  if (loadedMeshes.length === 0) {
    return null
  }

  return (
    <group>
      {loadedMeshes.map(([type, file]) => (
        <MeshGroup
          key={type}
          type={type}
          threeGeometry={file.threeGeometry}
          opacity={type === 'pit' ? 0.3 : 0.8} // 基坑区域透明度更低
        />
      ))}
      
      {/* 坐标轴辅助线 */}
      <axesHelper args={[20]} />
      
      {/* 可选：显示第一个网格的边界框 */}
      {loadedMeshes.length > 0 && loadedMeshes[0][1].threeGeometry && (
        <group visible={false}>
          {/* 这里可以添加边界框显示 */}
        </group>
      )}
    </group>
  )
}

// 导出用于其他组件使用的颜色工具
export { getGroupColor, MATERIAL_COLORS }