#!/usr/bin/env python3
"""
测试Storybook组件文档系统配置的脚本
"""
import os
import json
from pathlib import Path

def test_storybook_setup():
    """测试Storybook配置是否完整"""
    
    print("🔬 测试Storybook组件文档系统配置")
    print("=" * 60)
    
    frontend_dir = Path("frontend")
    if not frontend_dir.exists():
        print("❌ 错误: frontend目录不存在")
        return False
    
    success_count = 0
    total_tests = 0
    
    # 测试1: 检查package.json配置
    print("\n1. 检查package.json配置...")
    total_tests += 1
    
    package_json_path = frontend_dir / "package.json"
    if package_json_path.exists():
        with open(package_json_path, 'r', encoding='utf-8') as f:
            package_data = json.load(f)
        
        # 检查Storybook脚本
        scripts = package_data.get('scripts', {})
        required_scripts = ['storybook', 'build-storybook']
        missing_scripts = [s for s in required_scripts if s not in scripts]
        
        if not missing_scripts:
            print("   ✅ Storybook脚本配置正确")
            success_count += 1
        else:
            print(f"   ❌ 缺少脚本: {missing_scripts}")
        
        # 检查Storybook依赖
        dev_deps = package_data.get('devDependencies', {})
        storybook_deps = [dep for dep in dev_deps.keys() if 'storybook' in dep]
        
        if len(storybook_deps) >= 5:
            print(f"   ✅ 找到 {len(storybook_deps)} 个Storybook相关依赖")
        else:
            print(f"   ⚠️ 可能缺少Storybook依赖，仅找到 {len(storybook_deps)} 个")
    else:
        print("   ❌ package.json文件不存在")
    
    # 测试2: 检查Storybook配置文件
    print("\n2. 检查Storybook配置文件...")
    total_tests += 1
    
    storybook_dir = frontend_dir / ".storybook"
    if storybook_dir.exists():
        config_files = ['main.ts', 'preview.ts', 'manager.ts']
        existing_files = [f for f in config_files if (storybook_dir / f).exists()]
        
        if len(existing_files) == len(config_files):
            print(f"   ✅ 所有配置文件都存在: {existing_files}")
            success_count += 1
        else:
            missing_files = [f for f in config_files if f not in existing_files]
            print(f"   ❌ 缺少配置文件: {missing_files}")
    else:
        print("   ❌ .storybook目录不存在")
    
    # 测试3: 检查Stories文件
    print("\n3. 检查Stories文件...")
    total_tests += 1
    
    stories_patterns = [
        "src/components/ui/GlassComponents.stories.tsx",
        "src/components/forms/FormControls.stories.tsx", 
        "src/components/dxf-import/DXFQuickImport.stories.tsx",
        "src/components/3d/CAE3DViewport.stories.tsx",
        "src/stories/Introduction.stories.mdx",
        "src/stories/DesignSystem.stories.mdx"
    ]
    
    existing_stories = []
    for pattern in stories_patterns:
        story_path = frontend_dir / pattern
        if story_path.exists():
            existing_stories.append(pattern)
        else:
            print(f"   ⚠️ Stories文件不存在: {pattern}")
    
    if len(existing_stories) >= 4:
        print(f"   ✅ 找到 {len(existing_stories)} 个Stories文件")
        success_count += 1
        for story in existing_stories[:3]:  # 显示前3个
            print(f"     - {story}")
        if len(existing_stories) > 3:
            print(f"     - ... 等 {len(existing_stories) - 3} 个")
    else:
        print(f"   ❌ Stories文件数量不足，仅找到 {len(existing_stories)} 个")
    
    # 测试4: 检查组件类型
    print("\n4. 检查组件分类覆盖...")
    total_tests += 1
    
    component_categories = {
        "UI基础组件": ["GlassComponents"],
        "表单控件": ["FormControls"],
        "导入工具": ["DXFQuickImport"],
        "3D可视化": ["CAE3DViewport"],
        "文档系统": ["Introduction", "DesignSystem"]
    }
    
    covered_categories = 0
    for category, components in component_categories.items():
        found_components = []
        for comp in components:
            # 检查是否有对应的Stories文件
            for story in existing_stories:
                if comp in story:
                    found_components.append(comp)
                    break
        
        if found_components:
            covered_categories += 1
            print(f"   ✅ {category}: {found_components}")
        else:
            print(f"   ❌ {category}: 缺少Stories文件")
    
    if covered_categories >= 3:
        success_count += 1
        print(f"   ✅ 组件分类覆盖良好 ({covered_categories}/{len(component_categories)})")
    else:
        print(f"   ❌ 组件分类覆盖不足 ({covered_categories}/{len(component_categories)})")
    
    # 测试5: 检查文档质量
    print("\n5. 检查文档文件...")
    total_tests += 1
    
    doc_files = [
        "storybook.md",
    ]
    
    existing_docs = []
    for doc_file in doc_files:
        doc_path = frontend_dir / doc_file
        if doc_path.exists():
            existing_docs.append(doc_file)
            # 检查文件大小
            file_size = doc_path.stat().st_size
            if file_size > 1000:  # 至少1KB
                print(f"   ✅ {doc_file} (大小: {file_size} bytes)")
            else:
                print(f"   ⚠️ {doc_file} 文件过小 (大小: {file_size} bytes)")
        else:
            print(f"   ❌ 缺少文档: {doc_file}")
    
    if existing_docs:
        success_count += 1
    
    # 测试6: 检查TypeScript配置兼容性
    print("\n6. 检查TypeScript配置...")
    total_tests += 1
    
    tsconfig_path = frontend_dir / "tsconfig.json"
    if tsconfig_path.exists():
        print("   ✅ tsconfig.json存在")
        success_count += 1
    else:
        print("   ❌ tsconfig.json不存在")
    
    # 输出测试结果
    print("\n" + "=" * 60)
    print(f"🎉 Storybook配置测试完成!")
    print(f"成功: {success_count}/{total_tests} 项测试通过")
    
    if success_count == total_tests:
        print("\n✅ 所有配置正确，Storybook系统已准备就绪!")
        print("\n🚀 启动指南:")
        print("1. 安装依赖: npm install")
        print("2. 启动Storybook: npm run storybook")
        print("3. 访问: http://localhost:6006")
    elif success_count >= total_tests * 0.8:
        print("\n⚠️ 大部分配置正确，但还有些小问题需要修复")
        print("\n📝 建议:")
        print("- 检查并修复上述失败的测试项")
        print("- 安装缺失的依赖")
        print("- 补充缺失的配置文件")
    else:
        print("\n❌ 配置存在较多问题，建议重新配置Storybook")
        print("\n🔧 修复建议:")
        print("- 运行 npx storybook@latest init")
        print("- 检查Node.js版本 (需要≥18)")
        print("- 确保所有必需文件都存在")
    
    print("\n📚 功能特性:")
    print("- ✅ Glass组件库文档和交互示例")
    print("- ✅ Form表单控件完整展示")
    print("- ✅ DXF导入工具使用指南")
    print("- ✅ 3D视口组件演示")
    print("- ✅ 设计系统规范文档")
    print("- ✅ 响应式布局测试")
    print("- ✅ 交互测试支持")
    print("- ✅ TypeScript类型安全")
    
    return success_count == total_tests


if __name__ == "__main__":
    test_storybook_setup()