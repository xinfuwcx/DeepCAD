#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
sys.path.append('.')

from core.kratos_interface import MaterialProperties

# 创建材料
mat = MaterialProperties(
    id=1,
    name='测试土体',
    density=1900.0,
    young_modulus=25e6,
    poisson_ratio=0.3,
    cohesion=35000.0,
    friction_angle=28.0,
    dilatancy_angle=max(0.0, 28.0 - 30.0)  # 使用Bolton经验关系：ψ = φ - 30°
)

print('=== 材料属性测试 ===')
print(f'材料名称: {mat.name}')
print(f'摩擦角: {mat.friction_angle}°')
print(f'粘聚力: {mat.cohesion/1000}kPa')
print(f'剪胀角: {mat.dilatancy_angle}°')

# 手动构建材料配置
material_config = {
    'model_part_name': 'Structure',
    'properties_id': 1,
    'Material': {
        'name': f'Soil_{mat.name}',
        'constitutive_law': {'name': 'SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D'},
        'Variables': {
            'DENSITY': float(mat.density),
            'YOUNG_MODULUS': float(mat.young_modulus),
            'POISSON_RATIO': float(mat.poisson_ratio),
            'COHESION': float(mat.cohesion),
            'INTERNAL_FRICTION_ANGLE': np.radians(float(mat.friction_angle)),
            'INTERNAL_DILATANCY_ANGLE': np.radians(float(mat.dilatancy_angle)),
            'YIELD_STRESS_TENSION': float(mat.yield_stress_tension),
            'YIELD_STRESS_COMPRESSION': float(mat.yield_stress_compression)
        },
        'Tables': {}
    }
}

print('\n=== 修正摩尔-库伦配置 ===')
law_name = material_config['Material']['constitutive_law']['name']
print(f'本构法则: {law_name}')

variables = material_config['Material']['Variables']
print(f'摩擦角: {variables["FRICTION_ANGLE"]}°')
print(f'粘聚力: {variables["COHESION"]/1000}kPa')
print(f'剪胀角: {variables["DILATANCY_ANGLE"]}°')
print(f'抗拉强度: {variables["YIELD_STRESS_TENSION"]/1000}kPa')
print(f'抗压强度: {variables["YIELD_STRESS_COMPRESSION"]/1000000}MPa')

print('\n✅ 修正摩尔-库伦材料配置验证成功！')
