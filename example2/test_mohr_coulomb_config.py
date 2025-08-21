#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试修正摩尔-库伦材料配置
"""

import sys
sys.path.append('.')

def test_mohr_coulomb_config():
    """测试修正摩尔-库伦材料配置"""
    print("=== 测试修正摩尔-库伦材料配置 ===")

    try:
        from core.kratos_interface import KratosInterface, MaterialProperties
        from pathlib import Path
        import tempfile
        import json

        # 创建测试材料
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

        print(f"材料属性: 摩擦角={mat.friction_angle}°, 粘聚力={mat.cohesion/1000}kPa")

        # 创建Kratos接口
        ki = KratosInterface()
        ki.materials = {1: mat}

        # 生成材料配置
        with tempfile.TemporaryDirectory() as tmpdir:
            materials_file = ki._write_materials(Path(tmpdir))

            with open(materials_file, 'r', encoding='utf-8') as f:
                config = json.load(f)

        print("✅ 材料配置生成成功")
        print(f"生成的材料数量: {len(config)}")

        # 检查第一个材料（土体）
        if config:
            soil_config = config[0]
            law_name = soil_config['Material']['constitutive_law']['name']
            print(f"本构法则: {law_name}")

            variables = soil_config['Material']['Variables']
            print("材料参数:")
            for key, value in variables.items():
                if key in ['FRICTION_ANGLE', 'COHESION', 'DILATANCY_ANGLE']:
                    unit = "°" if "ANGLE" in key else ("kPa" if key == "COHESION" else "")
                    display_value = value/1000 if key == "COHESION" else value
                    print(f"  {key}: {display_value}{unit}")

        return True

    except Exception as e:
        print(f"❌ 配置生成失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_mohr_coulomb_config()
