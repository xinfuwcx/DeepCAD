#!/usr/bin/env python3
"""
GMSH Basic Test - ASCII Version
Test gmsh availability and basic functions
"""

def test_gmsh_import():
    """Test gmsh import"""
    try:
        import gmsh
        print("[OK] gmsh import successful")
        version = gmsh.__version__ if hasattr(gmsh, '__version__') else 'unknown'
        print(f"     Version: {version}")
        return True
    except ImportError as e:
        print(f"[FAIL] gmsh import failed: {e}")
        return False

def test_gmsh_basic_operations():
    """Test gmsh basic operations"""
    try:
        import gmsh
        
        # Initialize gmsh
        gmsh.initialize()
        print("[OK] gmsh initialization successful")
        
        # Create new model
        gmsh.model.add("test")
        print("[OK] model creation successful")
        
        # Create a simple cube
        box = gmsh.model.occ.addBox(0, 0, 0, 1, 1, 1)
        gmsh.model.occ.synchronize()
        print("[OK] geometry creation successful")
        
        # Generate mesh
        gmsh.model.mesh.generate(3)
        print("[OK] mesh generation successful")
        
        # Get mesh statistics
        nodes = gmsh.model.mesh.getNodes()
        elements = gmsh.model.mesh.getElements()
        
        node_count = len(nodes[0])
        element_count = sum(len(elem_tags) for elem_tags in elements[1])
        
        print(f"[OK] mesh stats: {node_count} nodes, {element_count} elements")
        
        # Cleanup
        gmsh.finalize()
        print("[OK] gmsh cleanup successful")
        
        return True
        
    except Exception as e:
        print(f"[FAIL] gmsh basic operations failed: {e}")
        try:
            gmsh.finalize()
        except:
            pass
        return False

def test_occ_availability():
    """Test OpenCASCADE geometry kernel"""
    try:
        import gmsh
        gmsh.initialize()
        
        # Test OCC functions
        box = gmsh.model.occ.addBox(0, 0, 0, 1, 1, 1)
        sphere = gmsh.model.occ.addSphere(0.5, 0.5, 0.5, 0.3)
        
        # Boolean operation test
        gmsh.model.occ.cut([(3, box)], [(3, sphere)])
        gmsh.model.occ.synchronize()
        
        print("[OK] OpenCASCADE geometry kernel available")
        print("[OK] Boolean operations supported")
        
        gmsh.finalize()
        return True
        
    except Exception as e:
        print(f"[FAIL] OpenCASCADE test failed: {e}")
        try:
            gmsh.finalize()
        except:
            pass
        return False

def test_file_formats():
    """Test file format support"""
    supported_formats = []
    import tempfile
    import os
    
    try:
        import gmsh
        gmsh.initialize()
        
        # Create simple mesh
        gmsh.model.add("format_test")
        box = gmsh.model.occ.addBox(0, 0, 0, 1, 1, 1)
        gmsh.model.occ.synchronize()
        gmsh.model.mesh.generate(3)
        
        # Test different formats
        formats_to_test = [
            ("msh", "Gmsh native format"),
            ("vtk", "VTK format"),
            ("stl", "STL format"),
            ("obj", "OBJ format")
        ]
        
        with tempfile.TemporaryDirectory() as temp_dir:
            for fmt, desc in formats_to_test:
                try:
                    test_file = os.path.join(temp_dir, f"test.{fmt}")
                    gmsh.write(test_file)
                    if os.path.exists(test_file):
                        supported_formats.append(f"{fmt} ({desc})")
                        print(f"[OK] {desc} supported")
                    else:
                        print(f"[FAIL] {desc} not supported")
                except Exception as e:
                    print(f"[FAIL] {desc} test failed: {e}")
        
        gmsh.finalize()
        
    except Exception as e:
        print(f"[FAIL] file format test failed: {e}")
        try:
            gmsh.finalize()
        except:
            pass
    
    return supported_formats

def main():
    """Main test function"""
    print("=== GMSH BASIC FUNCTIONALITY TEST ===")
    
    # Test 1: Import
    if not test_gmsh_import():
        print("\n[CRITICAL] GMSH not available, cannot continue testing")
        return False
    
    # Test 2: Basic operations
    print("\n--- Basic Operations Test ---")
    basic_ok = test_gmsh_basic_operations()
    
    # Test 3: OCC kernel
    print("\n--- OpenCASCADE Test ---")
    occ_ok = test_occ_availability()
    
    # Test 4: File formats
    print("\n--- File Format Support ---")
    formats = test_file_formats()
    
    # Summary
    print("\n=== TEST SUMMARY ===")
    print(f"Basic operations: {'[OK]' if basic_ok else '[FAIL]'}")
    print(f"OCC geometry kernel: {'[OK]' if occ_ok else '[FAIL]'}")
    print(f"Supported format count: {len(formats)}")
    
    if formats:
        print("Supported formats:")
        for fmt in formats:
            print(f"  - {fmt}")
    
    overall_ok = basic_ok and occ_ok and len(formats) > 0
    status = "GMSH FULLY AVAILABLE" if overall_ok else "GMSH PARTIALLY AVAILABLE"
    print(f"\nOverall status: [{'OK' if overall_ok else 'WARN'}] {status}")
    
    return overall_ok

if __name__ == "__main__":
    main()