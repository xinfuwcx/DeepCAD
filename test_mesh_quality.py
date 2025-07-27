#!/usr/bin/env python3
"""
Test mesh quality analysis functionality
"""

import sys
import tempfile
import os

def test_quality_analyzer_import():
    """Test quality analyzer module import"""
    try:
        sys.path.append('gateway/modules/meshing')
        from quality_analyzer import MeshQualityAnalyzer, analyze_mesh_quality
        print("[OK] MeshQualityAnalyzer import successful")
        return True
    except ImportError as e:
        print(f"[FAIL] MeshQualityAnalyzer import failed: {e}")
        return False

def create_test_mesh():
    """Create a test mesh file for quality analysis"""
    try:
        import gmsh
        
        # Create temporary mesh file
        temp_dir = tempfile.mkdtemp()
        mesh_file = os.path.join(temp_dir, "test_mesh.vtk")
        
        gmsh.initialize()
        gmsh.model.add("quality_test")
        
        # Create a box with some poor quality elements (elongated)
        box = gmsh.model.occ.addBox(0, 0, 0, 10, 1, 1)  # Elongated box
        gmsh.model.occ.synchronize()
        
        # Set coarse mesh to get poor quality elements
        gmsh.option.setNumber("Mesh.MeshSizeMax", 2.0)
        gmsh.option.setNumber("Mesh.MeshSizeMin", 0.5)
        
        # Generate mesh
        gmsh.model.mesh.generate(3)
        
        # Write mesh
        gmsh.write(mesh_file)
        gmsh.finalize()
        
        print(f"[OK] Test mesh created: {mesh_file}")
        return mesh_file, temp_dir
        
    except Exception as e:
        print(f"[FAIL] Test mesh creation failed: {e}")
        return None, None

def test_quality_analysis(mesh_file):
    """Test mesh quality analysis functionality"""
    try:
        sys.path.append('gateway/modules/meshing')
        from quality_analyzer import analyze_mesh_quality
        
        # Run analysis
        print("[INFO] Running mesh quality analysis...")
        report = analyze_mesh_quality(mesh_file)
        
        # Check report structure
        print(f"[OK] Analysis completed for: {report.mesh_file}")
        print(f"[INFO] Total nodes: {report.total_nodes}")
        print(f"[INFO] Total elements: {report.total_elements}")
        print(f"[INFO] Overall score: {report.overall_score:.2f}")
        
        # Check quality metrics
        print(f"[INFO] Quality metrics found: {len(report.quality_metrics)}")
        for metric_name, result in report.quality_metrics.items():
            print(f"  - {metric_name}: {result.status} (mean: {result.mean_value:.3f})")
            if result.poor_elements:
                print(f"    Poor elements: {len(result.poor_elements)}")
        
        # Check recommendations
        if report.recommendations:
            print(f"[INFO] Recommendations: {len(report.recommendations)}")
            for i, rec in enumerate(report.recommendations, 1):
                print(f"  {i}. {rec}")
        
        return True
        
    except Exception as e:
        print(f"[FAIL] Quality analysis test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_quality_export(mesh_file):
    """Test quality report export functionality"""
    try:
        sys.path.append('gateway/modules/meshing')
        from quality_analyzer import MeshQualityAnalyzer
        
        analyzer = MeshQualityAnalyzer()
        report = analyzer.analyze_mesh(mesh_file)
        
        # Test export
        temp_dir = tempfile.mkdtemp()
        report_file = os.path.join(temp_dir, "quality_report.json")
        
        success = analyzer.export_report(report, report_file)
        
        if success and os.path.exists(report_file):
            print(f"[OK] Quality report exported: {report_file}")
            
            # Check file size
            file_size = os.path.getsize(report_file)
            print(f"[INFO] Report file size: {file_size} bytes")
            
            return True
        else:
            print("[FAIL] Quality report export failed")
            return False
            
    except Exception as e:
        print(f"[FAIL] Quality export test failed: {e}")
        return False

def test_thresholds_configuration():
    """Test quality thresholds configuration"""
    try:
        sys.path.append('gateway/modules/meshing')
        from quality_analyzer import MeshQualityAnalyzer, QualityMetric
        
        analyzer = MeshQualityAnalyzer()
        
        # Check default thresholds
        thresholds = analyzer.quality_thresholds
        print(f"[OK] Quality thresholds configured: {len(thresholds)} metrics")
        
        # Check specific metrics
        required_metrics = [
            QualityMetric.ASPECT_RATIO,
            QualityMetric.SKEWNESS,
            QualityMetric.ORTHOGONALITY,
            QualityMetric.MIN_ANGLE,
            QualityMetric.MAX_ANGLE,
            QualityMetric.JACOBIAN
        ]
        
        missing_metrics = []
        for metric in required_metrics:
            if metric not in thresholds:
                missing_metrics.append(metric.value)
            else:
                thres = thresholds[metric]
                print(f"  - {metric.value}: excellent={thres['excellent']}, poor={thres['poor']}")
        
        if missing_metrics:
            print(f"[WARN] Missing threshold configuration for: {missing_metrics}")
        
        return len(missing_metrics) == 0
        
    except Exception as e:
        print(f"[FAIL] Thresholds test failed: {e}")
        return False

def main():
    """Main test function"""
    print("=== MESH QUALITY ANALYSIS TEST ===")
    
    # Test 1: Import
    import_ok = test_quality_analyzer_import()
    if not import_ok:
        print("\n[CRITICAL] Cannot import quality analyzer, stopping tests")
        return False
    
    # Test 2: Create test mesh
    print("\n--- Creating Test Mesh ---")
    mesh_file, temp_dir = create_test_mesh()
    if not mesh_file:
        print("[CRITICAL] Cannot create test mesh, stopping tests")
        return False
    
    try:
        # Test 3: Quality analysis
        print("\n--- Quality Analysis Test ---")
        analysis_ok = test_quality_analysis(mesh_file)
        
        # Test 4: Report export
        print("\n--- Report Export Test ---")
        export_ok = test_quality_export(mesh_file)
        
        # Test 5: Thresholds configuration
        print("\n--- Thresholds Configuration Test ---")
        thresholds_ok = test_thresholds_configuration()
        
        # Summary
        print("\n=== TEST SUMMARY ===")
        print(f"Module import: {'[OK]' if import_ok else '[FAIL]'}")
        print(f"Quality analysis: {'[OK]' if analysis_ok else '[FAIL]'}")
        print(f"Report export: {'[OK]' if export_ok else '[FAIL]'}")
        print(f"Thresholds config: {'[OK]' if thresholds_ok else '[FAIL]'}")
        
        overall_ok = all([import_ok, analysis_ok, export_ok, thresholds_ok])
        status = "QUALITY ANALYSIS FULLY FUNCTIONAL" if overall_ok else "QUALITY ANALYSIS NEEDS FIXES"
        print(f"\nOverall status: [{'OK' if overall_ok else 'WARN'}] {status}")
        
        return overall_ok
        
    finally:
        # Cleanup
        try:
            if mesh_file and os.path.exists(mesh_file):
                os.remove(mesh_file)
            if temp_dir and os.path.exists(temp_dir):
                import shutil
                shutil.rmtree(temp_dir, ignore_errors=True)
        except:
            pass

if __name__ == "__main__":
    main()