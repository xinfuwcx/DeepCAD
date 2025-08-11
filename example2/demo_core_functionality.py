#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Example2 Core Functionality Demo
Demonstrates the desktop program's capabilities without GUI dependencies

This script showcases the core features of the Example2 desktop application:
- FPN file processing capabilities
- Analysis step management  
- Excavation simulation features
- Module architecture overview
"""

import sys
import json
from pathlib import Path
from typing import Dict, List, Any

# Setup paths
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))
sys.path.insert(0, str(current_dir.parent))

class Example2CoreDemo:
    """Core functionality demonstrator for Example2 desktop program"""
    
    def __init__(self):
        self.results = {}
        
    def run_demo(self):
        """Run complete core functionality demonstration"""
        print("🖥️" + "=" * 70)
        print(" Example2 Desktop Program - Core Functionality Demo")
        print("=" * 71)
        print()
        print("This demonstrates the capabilities of the PyQt6-based CAE desktop")
        print("application for geotechnical engineering and excavation analysis.")
        print()
        
        # Run all demo components
        self.demo_application_info()
        self.demo_fpn_file_analysis()
        self.demo_module_capabilities()
        self.demo_excavation_features()
        self.demo_workflow_summary()
        
        print("\n" + "=" * 71)
        print("🎯 Core Functionality Demo Complete")
        print("=" * 71)
        
        return self.results
        
    def demo_application_info(self):
        """Display application information"""
        print("📋 APPLICATION INFORMATION")
        print("-" * 50)
        
        app_info = {
            "Name": "Example2 - DeepCAD System Test Program",
            "Version": "1.0.0", 
            "Type": "Desktop CAE Application",
            "GUI Framework": "PyQt6",
            "3D Visualization": "PyVista + VTK",
            "Analysis Engine": "Kratos Multiphysics",
            "Target Domain": "Geotechnical Engineering",
            "Specialization": "Multi-stage Excavation Analysis"
        }
        
        for key, value in app_info.items():
            print(f"  {key:<20}: {value}")
            
        self.results['app_info'] = app_info
        
    def demo_fpn_file_analysis(self):
        """Analyze FPN files and demonstrate file processing"""
        print("\n📄 FPN FILE PROCESSING ANALYSIS")
        print("-" * 50)
        
        data_dir = current_dir / "data"
        fpn_analysis = {}
        
        if data_dir.exists():
            fpn_files = list(data_dir.glob("*.fpn"))
            print(f"  Found {len(fpn_files)} FPN files:")
            
            for fpn_file in fpn_files:
                try:
                    stat = fpn_file.stat()
                    with open(fpn_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # Analyze file content
                    lines = content.split('\n')
                    analysis = {
                        'size_mb': round(stat.st_size / (1024*1024), 2),
                        'total_lines': len(lines),
                        'node_references': content.count('NODE'),
                        'element_references': content.count('ELEMENT'), 
                        'material_references': content.count('MATERIAL'),
                        'stage_references': content.count('STAGE'),
                        'format': 'MIDAS GTS NX'
                    }
                    
                    fpn_analysis[fpn_file.name] = analysis
                    
                    print(f"\n    ✅ {fpn_file.name}:")
                    print(f"       Size: {analysis['size_mb']} MB")
                    print(f"       Lines: {analysis['total_lines']:,}")
                    print(f"       Nodes: {analysis['node_references']:,}")
                    print(f"       Elements: {analysis['element_references']:,}")
                    print(f"       Materials: {analysis['material_references']:,}")
                    print(f"       Analysis Stages: {analysis['stage_references']}")
                    
                except Exception as e:
                    print(f"    ❌ Error analyzing {fpn_file.name}: {e}")
                    
            # Check for VTU result files
            vtu_files = list(data_dir.glob("*.vtu"))
            if vtu_files:
                print(f"\n  Result Files ({len(vtu_files)} VTU files):")
                for vtu_file in vtu_files:
                    size_mb = round(vtu_file.stat().st_size / (1024*1024), 2)
                    print(f"    📊 {vtu_file.name} ({size_mb} MB)")
                    
        else:
            print("  ❌ Data directory not found")
            
        self.results['fpn_analysis'] = fpn_analysis
        
    def demo_module_capabilities(self):
        """Demonstrate module architecture and capabilities"""
        print("\n🔧 MODULE ARCHITECTURE ANALYSIS")
        print("-" * 50)
        
        modules_info = {}
        
        # Analyze preprocessor
        preprocessor_file = current_dir / "modules" / "preprocessor.py"
        if preprocessor_file.exists():
            with open(preprocessor_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            preprocessor_features = {
                'fpn_loading': 'load_fpn_file' in content,
                'mesh_generation': 'generate_mesh' in content,
                '3d_visualization': 'pyvista' in content.lower(),
                'material_management': 'current_active_materials' in content,
                'analysis_stages': 'set_current_analysis_stage' in content,
                'excavation_support': 'excavation' in content.lower()
            }
            
            modules_info['preprocessor'] = {
                'size': len(content),
                'features': preprocessor_features
            }
            
            print("  🔧 Preprocessor Module:")
            for feature, available in preprocessor_features.items():
                status = "✅" if available else "❌"
                print(f"     {status} {feature.replace('_', ' ').title()}")
                
        # Analyze analyzer  
        analyzer_file = current_dir / "modules" / "analyzer.py"
        if analyzer_file.exists():
            with open(analyzer_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            analyzer_features = {
                'multi_step_analysis': 'AnalysisStep' in content,
                'kratos_integration': 'kratos' in content.lower(),
                'parallel_processing': 'thread' in content.lower(),
                'result_monitoring': 'status' in content,
                'error_handling': 'exception' in content.lower()
            }
            
            modules_info['analyzer'] = {
                'size': len(content),
                'features': analyzer_features  
            }
            
            print("\n  ⚙️  Analyzer Module:")
            for feature, available in analyzer_features.items():
                status = "✅" if available else "❌"
                print(f"     {status} {feature.replace('_', ' ').title()}")
                
        # Analyze postprocessor
        postprocessor_file = current_dir / "modules" / "postprocessor.py"  
        if postprocessor_file.exists():
            with open(postprocessor_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            postprocessor_features = {
                'result_visualization': 'display' in content.lower(),
                'contour_plots': 'contour' in content.lower(),
                'animation_support': 'animation' in content.lower(),
                'export_capabilities': 'export' in content.lower()
            }
            
            modules_info['postprocessor'] = {
                'size': len(content),
                'features': postprocessor_features
            }
            
            print("\n  📊 Postprocessor Module:")
            for feature, available in postprocessor_features.items():
                status = "✅" if available else "❌" 
                print(f"     {status} {feature.replace('_', ' ').title()}")
                
        self.results['modules'] = modules_info
        
    def demo_excavation_features(self):
        """Demonstrate specialized excavation features"""
        print("\n🏗️  EXCAVATION ANALYSIS FEATURES")
        print("-" * 50)
        
        # Check stable GUI for excavation functionality
        stable_gui_file = current_dir / "simple_stable_gui.py"
        excavation_features = {}
        
        if stable_gui_file.exists():
            with open(stable_gui_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            excavation_features = {
                'excavation_detection': 'excavation_keywords' in content,
                'multi_stage_support': '分析步' in content and 'stage' in content.lower(),
                'material_filtering': 'current_active_materials' in content,
                'stage_switching': 'set_current_analysis_stage' in content,
                'gui_integration': 'PyQt' in content,
                'chinese_support': '开挖' in content
            }
            
            print("  Excavation Analysis Capabilities:")
            for feature, available in excavation_features.items():
                status = "✅" if available else "❌"
                print(f"    {status} {feature.replace('_', ' ').title()}")
                
            # Check for test files
            excavation_tests = list(current_dir.glob("*excavation*.py"))
            if excavation_tests:
                print(f"\n  Excavation Test Files ({len(excavation_tests)}):")
                for test_file in excavation_tests:
                    print(f"    🧪 {test_file.name}")
                    
        self.results['excavation'] = excavation_features
        
    def demo_workflow_summary(self):
        """Demonstrate typical user workflow"""
        print("\n🔄 TYPICAL USER WORKFLOW")
        print("-" * 50)
        
        workflow_steps = [
            ("1. Launch Application", "python main.py (full GUI) or python simple_stable_gui.py (test)"),
            ("2. Load FPN Model", "Import MIDAS GTS NX model file (基坑两阶段1fpn.fpn, 两阶段计算2.fpn)"),
            ("3. Model Review", "3D visualization, mesh inspection, material properties"),
            ("4. Analysis Setup", "Configure excavation stages, boundary conditions"),
            ("5. Multi-Stage Analysis", "Run FEM analysis with Kratos Multiphysics"),
            ("6. Results Review", "Stage-by-stage result comparison, excavation effects"),
            ("7. Export Results", "VTU files, reports, visualizations")
        ]
        
        print("  Standard CAE Workflow:")
        for step, description in workflow_steps:
            print(f"    {step}")
            print(f"      └── {description}")
            
        # Show available startup options
        startup_scripts = []
        for script_name in ["main.py", "simple_stable_gui.py", "simple_gui_test.py"]:
            script_path = current_dir / script_name
            if script_path.exists():
                startup_scripts.append(script_name)
                
        print(f"\n  Available Startup Options:")
        for script in startup_scripts:
            print(f"    🚀 python {script}")
            
        self.results['workflow'] = {
            'steps': workflow_steps,
            'startup_options': startup_scripts
        }

def main():
    """Main function to run the demo"""
    demo = Example2CoreDemo()
    results = demo.run_demo()
    
    # Save results to JSON
    output_file = current_dir / "demo_results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
        
    print(f"\n💾 Detailed results saved to: {output_file}")
    print("\n🎯 To launch the full desktop application:")
    print("   python main.py")
    print("\n🧪 To run the stable test GUI:")
    print("   python simple_stable_gui.py")

if __name__ == "__main__":
    main()