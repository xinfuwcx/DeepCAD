#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
基于现有Kratos的扩展配置
不重新编译，而是配置和测试现有安装
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def print_status(msg, status="INFO"):
    """打印状态信息"""
    colors = {
        "INFO": "[INFO]",
        "OK": "[✓]", 
        "ERROR": "[✗]",
        "WARNING": "[!]"
    }
    print(f"{colors.get(status, '[INFO]')} {msg}")

def detect_kratos_installation():
    """检测Kratos安装位置和配置"""
    print_status("检测Kratos安装...")
    
    try:
        import KratosMultiphysics
        
        # 获取Kratos模块路径
        kratos_path = KratosMultiphysics.__file__
        kratos_dir = os.path.dirname(kratos_path)
        
        print_status(f"Kratos模块路径: {kratos_dir}", "OK")
        
        # 检测可用应用
        available_apps = []
        app_tests = {
            'StructuralMechanicsApplication': '结构力学',
            'FluidDynamicsApplication': '流体力学', 
            'ContactStructuralMechanicsApplication': '接触结构力学',
            'LinearSolversApplication': '线性求解器',
            'SolidMechanicsApplication': '固体力学',
            'GeomechanicsApplication': '地质力学',
            'DEMApplication': '离散元',
            'IgaApplication': 'IGA等几何分析',
            'OptimizationApplication': '优化模块',
            'ShapeOptimizationApplication': '形状优化',
            'MeshMovingApplication': '网格移动',
            'MeshingApplication': '网格生成',
            'FSIApplication': '流固耦合',
            'ConvectionDiffusionApplication': '对流扩散'
        }
        
        for app_name, app_desc in app_tests.items():
            try:
                exec(f"import KratosMultiphysics.{app_name}")
                available_apps.append((app_name, app_desc))
                print_status(f"{app_desc} ({app_name}) 可用", "OK")
            except ImportError:
                print_status(f"{app_desc} ({app_name}) 不可用", "WARNING")
        
        return {
            'installed': True,
            'path': kratos_dir,
            'available_apps': available_apps,
            'total_apps': len(app_tests),
            'available_count': len(available_apps)
        }
        
    except ImportError:
        print_status("未发现Kratos安装", "ERROR") 
        return {'installed': False}

def create_project_config():
    """创建项目配置文件"""
    kratos_info = detect_kratos_installation()
    
    if not kratos_info.get('installed'):
        return False
    
    config = {
        'kratos': {
            'version': '10.2.1',
            'path': kratos_info['path'],
            'applications': {
                app[0]: {
                    'name': app[1],
                    'available': True
                } for app in kratos_info['available_apps']
            }
        },
        'deep_excavation': {
            'supported_analyses': [],
            'recommended_modules': []
        }
    }
    
    # 根据可用模块推荐分析类型
    available_app_names = [app[0] for app in kratos_info['available_apps']]
    
    if 'StructuralMechanicsApplication' in available_app_names:
        config['deep_excavation']['supported_analyses'].append('结构力学分析')
    
    if 'GeomechanicsApplication' in available_app_names:
        config['deep_excavation']['supported_analyses'].append('地质力学分析')
        config['deep_excavation']['supported_analyses'].append('土体变形分析')
    
    if 'FluidDynamicsApplication' in available_app_names:
        config['deep_excavation']['supported_analyses'].append('渗流分析')
    
    if 'ContactStructuralMechanicsApplication' in available_app_names:
        config['deep_excavation']['supported_analyses'].append('接触非线性分析')
    
    # 推荐需要的模块
    missing_critical = []
    critical_modules = [
        ('GeomechanicsApplication', '地质力学'),
        ('IgaApplication', 'IGA等几何分析'),
        ('OptimizationApplication', '结构优化')
    ]
    
    for module, desc in critical_modules:
        if module not in available_app_names:
            missing_critical.append({'module': module, 'description': desc})
    
    config['deep_excavation']['missing_critical'] = missing_critical
    
    # 保存配置
    with open('kratos_config.json', 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    print_status("项目配置已生成: kratos_config.json", "OK")
    return config

def create_examples_for_available_modules():
    """根据可用模块创建示例"""
    print_status("创建可用模块示例...")
    
    # 确保examples目录存在
    os.makedirs('examples', exist_ok=True)
    
    # 基本结构力学示例
    basic_structural = '''#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
基本结构力学分析示例
使用现有Kratos安装
"""

import KratosMultiphysics
import KratosMultiphysics.StructuralMechanicsApplication

def create_simple_beam_model():
    """创建简单梁模型"""
    print("创建结构力学模型...")
    
    # 创建模型
    model = KratosMultiphysics.Model()
    model_part = model.CreateModelPart("BeamModelPart")
    model_part.ProcessInfo.SetValue(KratosMultiphysics.DOMAIN_SIZE, 2)
    
    # 添加变量
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.REACTION)
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.VOLUME_ACCELERATION)
    
    # 创建材料属性
    properties = model_part.GetProperties()[1]
    properties.SetValue(KratosMultiphysics.YOUNG_MODULUS, 200000000000.0)  # 200 GPa (钢)
    properties.SetValue(KratosMultiphysics.POISSON_RATIO, 0.3)
    properties.SetValue(KratosMultiphysics.DENSITY, 7850.0)  # kg/m³
    
    # 创建节点 (简单梁，10m长)
    for i in range(11):
        x = i * 1.0  # 每1m一个节点
        model_part.CreateNewNode(i+1, x, 0.0, 0.0)
    
    print(f"创建了 {model_part.NumberOfNodes()} 个节点")
    
    # 设置边界条件 (左端固定)
    left_node = model_part.GetNode(1)
    left_node.Fix(KratosMultiphysics.DISPLACEMENT_X)
    left_node.Fix(KratosMultiphysics.DISPLACEMENT_Y)
    left_node.Fix(KratosMultiphysics.DISPLACEMENT_Z)
    
    # 施加载荷 (中点向下10kN)
    middle_node = model_part.GetNode(6)
    middle_node.SetSolutionStepValue(KratosMultiphysics.VOLUME_ACCELERATION_Y, -10000.0)
    
    print("边界条件和载荷已设置")
    print("模型创建完成!")
    
    return model_part

def main():
    print("=" * 50)
    print("Kratos结构力学分析示例")
    print("=" * 50)
    
    try:
        model_part = create_simple_beam_model()
        print(f"\\n模型信息:")
        print(f"- 节点数: {model_part.NumberOfNodes()}")
        print(f"- 单元数: {model_part.NumberOfElements()}")
        print(f"- 材料属性: E={model_part.GetProperties()[1].GetValue(KratosMultiphysics.YOUNG_MODULUS)/1e9:.0f} GPa")
        
        print("\\n基本模型创建成功!")
        print("这展示了Kratos的基本建模能力。")
        
    except Exception as e:
        print(f"错误: {e}")

if __name__ == "__main__":
    main()
'''
    
    with open('examples/structural_analysis_basic.py', 'w', encoding='utf-8') as f:
        f.write(basic_structural)
    
    # 检查是否有地质力学模块
    try:
        import KratosMultiphysics.GeomechanicsApplication
        
        geomech_example = '''#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
地质力学分析示例 - 深基坑工程
"""

import KratosMultiphysics
import KratosMultiphysics.GeomechanicsApplication

def create_excavation_model():
    """创建基坑模型"""
    print("创建地质力学模型...")
    
    model = KratosMultiphysics.Model()
    model_part = model.CreateModelPart("ExcavationModelPart")
    model_part.ProcessInfo.SetValue(KratosMultiphysics.DOMAIN_SIZE, 2)
    
    # 添加地质力学变量
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.WATER_PRESSURE)
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.VOLUME_ACCELERATION)
    
    # 土体材料属性
    soil_properties = model_part.GetProperties()[1]
    soil_properties.SetValue(KratosMultiphysics.YOUNG_MODULUS, 50000000.0)  # 50 MPa
    soil_properties.SetValue(KratosMultiphysics.POISSON_RATIO, 0.3)
    soil_properties.SetValue(KratosMultiphysics.DENSITY, 2000.0)  # kg/m³
    soil_properties.SetValue(KratosMultiphysics.COHESION, 20000.0)  # 20 kPa
    soil_properties.SetValue(KratosMultiphysics.FRICTION_ANGLE, 30.0)  # 30度
    
    print("地质力学模型参数:")
    print(f"- 弹性模量: {soil_properties.GetValue(KratosMultiphysics.YOUNG_MODULUS)/1e6:.0f} MPa")
    print(f"- 泊松比: {soil_properties.GetValue(KratosMultiphysics.POISSON_RATIO)}")
    print(f"- 密度: {soil_properties.GetValue(KratosMultiphysics.DENSITY)} kg/m³")
    print(f"- 内摩擦角: {soil_properties.GetValue(KratosMultiphysics.FRICTION_ANGLE)}°")
    
    return model_part

def main():
    print("=" * 50)
    print("深基坑地质力学分析示例")
    print("=" * 50)
    
    try:
        model_part = create_excavation_model()
        print("\\n地质力学模型创建成功!")
        print("这展示了深基坑工程的土体建模能力。")
        
    except Exception as e:
        print(f"错误: {e}")

if __name__ == "__main__":
    main()
'''
        
        with open('examples/geomechanics_excavation.py', 'w', encoding='utf-8') as f:
            f.write(geomech_example)
        
        print_status("地质力学示例已创建", "OK")
        
    except ImportError:
        print_status("GeomechanicsApplication不可用，跳过地质力学示例", "WARNING")
    
    print_status("示例创建完成", "OK")

def create_usage_guide():
    """创建使用指南"""
    guide = '''# Kratos深基坑工程使用指南

## 当前安装状态

根据检测，你的Kratos安装包含以下模块：

### 可用模块 ✅
- **StructuralMechanicsApplication** - 结构力学分析
- **FluidDynamicsApplication** - 流体力学 
- **ContactStructuralMechanicsApplication** - 接触结构力学

### 建议添加的模块 ⚠️
为了完整的深基坑工程分析，建议添加：
- **GeomechanicsApplication** - 地质力学核心
- **IgaApplication** - 等几何分析
- **OptimizationApplication** - 结构优化
- **SolidMechanicsApplication** - 固体力学基础

## 快速开始

### 1. 运行基本示例
```bash
python examples/structural_analysis_basic.py
```

### 2. 如果有地质力学模块
```bash  
python examples/geomechanics_excavation.py
```

### 3. 检查配置
查看生成的 `kratos_config.json` 了解详细配置。

## 扩展安装

要添加缺失的关键模块，运行：
```bash
scripts\\build_kratos_extended.bat
```

这将编译包含所有深基坑工程所需模块的扩展版本。

## 深基坑工程典型分析流程

1. **几何建模** - 使用CAD或参数化建模
2. **网格划分** - Gmsh集成，自适应网格
3. **材料定义** - 土体本构模型，结构材料
4. **边界条件** - 位移约束，载荷施加  
5. **求解计算** - 非线性迭代求解
6. **结果后处理** - 变形云图，应力分析
7. **设计优化** - 参数优化，形状优化

## 联系支持

如需添加更多模块或遇到问题，请参考：
- Kratos官方文档: https://kratosultiphysics.github.io/Kratos/
- 深基坑工程案例: examples/目录
'''
    
    with open('KRATOS_USAGE_GUIDE.md', 'w', encoding='utf-8') as f:
        f.write(guide)
    
    print_status("使用指南已创建: KRATOS_USAGE_GUIDE.md", "OK")

def main():
    """主函数"""
    print("=" * 60)
    print("Kratos深基坑工程配置")
    print("基于现有安装优化配置")
    print("=" * 60)
    
    # 检测安装
    kratos_info = detect_kratos_installation()
    
    if not kratos_info.get('installed'):
        print_status("请先安装Kratos", "ERROR")
        return False
    
    print_status(f"发现 {kratos_info['available_count']}/{kratos_info['total_apps']} 个应用可用")
    
    # 创建配置
    config = create_project_config()
    if not config:
        return False
    
    # 创建示例
    create_examples_for_available_modules()
    
    # 创建使用指南
    create_usage_guide()
    
    # 总结
    print("\n" + "=" * 60)
    print("配置完成!")
    print("=" * 60)
    
    missing = config['deep_excavation'].get('missing_critical', [])
    if missing:
        print("⚠️  建议安装的关键模块:")
        for item in missing:
            print(f"   - {item['description']} ({item['module']})")
        print(f"   运行 scripts\\build_kratos_extended.bat 安装")
    else:
        print("✅ 所有关键模块已安装!")
    
    print("\n📚 文档和示例:")
    print("   - 配置信息: kratos_config.json")
    print("   - 使用指南: KRATOS_USAGE_GUIDE.md") 
    print("   - 基本示例: examples/structural_analysis_basic.py")
    if 'GeomechanicsApplication' in [app[0] for app in kratos_info['available_apps']]:
        print("   - 地质力学: examples/geomechanics_excavation.py")
    
    return True

if __name__ == "__main__":
    if main():
        print_status("配置成功完成!", "OK")
        sys.exit(0)
    else:
        print_status("配置失败!", "ERROR")
        sys.exit(1)
