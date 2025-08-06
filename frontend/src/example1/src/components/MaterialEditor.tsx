import React, { useState, useMemo } from 'react'
import { useFEAStore, useMeshFiles, useMaterials } from '../stores/feaStore'
import { Material } from '../types'
import { Package, Plus, Edit3, Save } from 'lucide-react'

// 默认材料库
const DEFAULT_MATERIALS: Record<string, Omit<Material, 'name'>> = {
  soil_clay: {
    model: 'MohrCoulomb',
    elementType: 'TETRA10',
    properties: {
      density: 1800,
      elasticModulus: 10e6,
      poissonRatio: 0.35,
      cohesion: 15000,
      frictionAngle: 22.0,
      dilatancyAngle: 0.0
    }
  },
  soil_sand: {
    model: 'MohrCoulomb',
    elementType: 'TETRA10',
    properties: {
      density: 2000,
      elasticModulus: 35e6,
      poissonRatio: 0.25,
      cohesion: 5000,
      frictionAngle: 35.0,
      dilatancyAngle: 5.0
    }
  },
  concrete_C30: {
    model: 'LinearElastic',
    elementType: 'SHELL8',
    properties: {
      density: 2500,
      elasticModulus: 30e9,
      poissonRatio: 0.2,
      thickness: 0.8
    }
  },
  concrete_C35: {
    model: 'LinearElastic',
    elementType: 'SHELL8',
    properties: {
      density: 2500,
      elasticModulus: 31e9,
      poissonRatio: 0.2,
      thickness: 0.4
    }
  }
}

interface MaterialEditorProps {}

export const MaterialEditor: React.FC<MaterialEditorProps> = () => {
  const meshFiles = useMeshFiles()
  const materials = useMaterials()
  const { setMaterial } = useFEAStore()
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Material | null>(null)

  // 提取所有物理组
  const physicalGroups = useMemo(() => {
    const groups: string[] = []
    Object.values(meshFiles).forEach(file => {
      if (file.meshData) {
        groups.push(...file.meshData.metadata.physicalGroupNames)
      }
    })
    return [...new Set(groups)]
  }, [meshFiles])

  // 自动分配材料
  const autoAssignMaterials = () => {
    physicalGroups.forEach(groupName => {
      if (!materials[groupName]) {
        let materialKey = 'soil_clay' // 默认材料
        
        // 基于命名自动识别材料类型
        const lowerName = groupName.toLowerCase()
        if (lowerName.includes('wall') || lowerName.includes('diaphragm')) {
          materialKey = 'concrete_C30'
        } else if (lowerName.includes('lining') || lowerName.includes('tunnel')) {
          materialKey = 'concrete_C35'
        } else if (lowerName.includes('sand')) {
          materialKey = 'soil_sand'
        }
        
        const defaultMaterial = DEFAULT_MATERIALS[materialKey]
        if (defaultMaterial) {
          setMaterial(groupName, {
            name: groupName,
            ...defaultMaterial
          })
        }
      }
    })
  }

  const handleEditMaterial = (groupName: string) => {
    const material = materials[groupName]
    setEditingGroup(groupName)
    setEditForm(material || {
      name: groupName,
      model: 'MohrCoulomb',
      elementType: 'TETRA10',
      properties: {
        density: 1800,
        elasticModulus: 10e6,
        poissonRatio: 0.35,
        cohesion: 15000,
        frictionAngle: 22.0,
        dilatancyAngle: 0.0
      }
    })
  }

  const handleSaveMaterial = () => {
    if (editForm && editingGroup) {
      setMaterial(editingGroup, editForm)
      setEditingGroup(null)
      setEditForm(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingGroup(null)
    setEditForm(null)
  }

  const updateEditForm = (field: string, value: any) => {
    if (!editForm) return
    
    if (field.startsWith('properties.')) {
      const propKey = field.split('.')[1]
      setEditForm({
        ...editForm,
        properties: {
          ...editForm.properties,
          [propKey]: value
        }
      })
    } else {
      setEditForm({
        ...editForm,
        [field]: value
      })
    }
  }

  const getMaterialColor = (groupName: string) => {
    if (!materials[groupName]) return 'bg-gray-100'
    
    const material = materials[groupName]
    if (material.model === 'MohrCoulomb') {
      return 'bg-amber-100 border-amber-200'
    } else {
      return 'bg-blue-100 border-blue-200'
    }
  }

  if (physicalGroups.length === 0) {
    return (
      <div className="panel">
        <div className="panel-header">
          <div className="flex items-center">
            <Package className="w-4 h-4 mr-2" />
            材料配置
          </div>
        </div>
        <div className="panel-content">
          <p className="text-gray-500 text-sm">
            请先加载 MSH 文件以显示材料配置选项
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="w-4 h-4 mr-2" />
            材料配置
          </div>
          <button
            onClick={autoAssignMaterials}
            className="text-xs btn-primary py-1 px-2"
          >
            <Plus className="w-3 h-3 mr-1" />
            自动分配
          </button>
        </div>
      </div>
      
      <div className="panel-content space-y-3">
        {physicalGroups.map(groupName => {
          const material = materials[groupName]
          const isEditing = editingGroup === groupName
          
          return (
            <div 
              key={groupName} 
              className={`border rounded-lg p-3 ${getMaterialColor(groupName)}`}
            >
              {isEditing && editForm ? (
                // 编辑模式
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">{groupName}</h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveMaterial}
                        className="text-xs btn-primary py-1 px-2"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-xs btn-secondary py-1 px-2"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-gray-600 mb-1">本构模型</label>
                      <select
                        value={editForm.model}
                        onChange={(e) => updateEditForm('model', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs"
                      >
                        <option value="MohrCoulomb">摩尔-库伦</option>
                        <option value="LinearElastic">线弹性</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-600 mb-1">单元类型</label>
                      <select
                        value={editForm.elementType}
                        onChange={(e) => updateEditForm('elementType', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs"
                      >
                        <option value="TETRA10">四面体10节点</option>
                        <option value="SHELL8">板单元8节点</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-600 mb-1">密度 (kg/m³)</label>
                      <input
                        type="number"
                        value={editForm.properties.density}
                        onChange={(e) => updateEditForm('properties.density', Number(e.target.value))}
                        className="w-full p-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-600 mb-1">弹性模量 (Pa)</label>
                      <input
                        type="number"
                        value={editForm.properties.elasticModulus}
                        onChange={(e) => updateEditForm('properties.elasticModulus', Number(e.target.value))}
                        className="w-full p-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-600 mb-1">泊松比</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.properties.poissonRatio}
                        onChange={(e) => updateEditForm('properties.poissonRatio', Number(e.target.value))}
                        className="w-full p-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    
                    {editForm.model === 'MohrCoulomb' && (
                      <>
                        <div>
                          <label className="block text-gray-600 mb-1">粘聚力 (Pa)</label>
                          <input
                            type="number"
                            value={editForm.properties.cohesion || 0}
                            onChange={(e) => updateEditForm('properties.cohesion', Number(e.target.value))}
                            className="w-full p-1 border border-gray-300 rounded text-xs"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-gray-600 mb-1">内摩擦角 (°)</label>
                          <input
                            type="number"
                            value={editForm.properties.frictionAngle || 0}
                            onChange={(e) => updateEditForm('properties.frictionAngle', Number(e.target.value))}
                            className="w-full p-1 border border-gray-300 rounded text-xs"
                          />
                        </div>
                      </>
                    )}
                    
                    {editForm.elementType === 'SHELL8' && (
                      <div>
                        <label className="block text-gray-600 mb-1">厚度 (m)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.properties.thickness || 0}
                          onChange={(e) => updateEditForm('properties.thickness', Number(e.target.value))}
                          className="w-full p-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // 显示模式
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{groupName}</h4>
                    <button
                      onClick={() => handleEditMaterial(groupName)}
                      className="text-xs btn-secondary py-1 px-2"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      {material ? '编辑' : '配置'}
                    </button>
                  </div>
                  
                  {material ? (
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>模型: {material.model === 'MohrCoulomb' ? '摩尔-库伦' : '线弹性'}</div>
                      <div>单元: {material.elementType}</div>
                      <div>密度: {material.properties.density} kg/m³</div>
                      <div>弹模: {(material.properties.elasticModulus / 1e6).toFixed(0)} MPa</div>
                      {material.properties.cohesion && (
                        <div>粘聚力: {(material.properties.cohesion / 1000).toFixed(0)} kPa</div>
                      )}
                      {material.properties.thickness && (
                        <div>厚度: {material.properties.thickness} m</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">
                      未配置材料属性
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}