"""
Simple test for icon integration without emojis
"""

def test_all_components():
    """Test all components without GUI"""
    print("Testing GemPy Ultimate Professional Icon Integration")
    print("=" * 50)
    
    # Test icon system
    try:
        from gempy_icons import GEMPY_ICONS, GemPyIconFactory
        print(f"✓ Icon system loaded: {len(GEMPY_ICONS)} icons")
        
        # Test specific icon categories
        file_icons = GemPyIconFactory.get_file_icons()
        gempy_icons = GemPyIconFactory.get_gempy_icons()
        data_icons = GemPyIconFactory.get_data_icons()
        analysis_icons = GemPyIconFactory.get_analysis_icons()
        viz_icons = GemPyIconFactory.get_visualization_icons()
        toolbar_icons = GemPyIconFactory.get_toolbar_icons()
        status_icons = GemPyIconFactory.get_status_icons()
        
        print(f"  - File icons: {len(file_icons)}")
        print(f"  - GemPy icons: {len(gempy_icons)}")
        print(f"  - Data icons: {len(data_icons)}")
        print(f"  - Analysis icons: {len(analysis_icons)}")
        print(f"  - Visualization icons: {len(viz_icons)}")
        print(f"  - Toolbar icons: {len(toolbar_icons)}")
        print(f"  - Status icons: {len(status_icons)}")
        
    except Exception as e:
        print(f"✗ Icon system failed: {e}")
        return False
    
    # Test dialog system
    try:
        from gempy_dialogs import (
            ModelSettingsDialog, SurfaceManagerDialog, DataStatisticsDialog,
            ViewSettingsDialog, ProgressDialog
        )
        print("✓ Dialog system loaded successfully")
    except Exception as e:
        print(f"✗ Dialog system failed: {e}")
        return False
    
    # Test refined interface
    try:
        from gempy_refined_interface import GemPyRefinedInterface, ModernRefinedTheme
        print("✓ Refined interface system loaded")
    except Exception as e:
        print(f"✗ Refined interface failed: {e}")
        return False
    
    # Test ultimate interface
    try:
        from gempy_ultimate_interface import GemPyUltimateInterface
        print("✓ Ultimate interface system loaded")
    except Exception as e:
        print(f"✗ Ultimate interface failed: {e}")
        return False
    
    # Test PyQt6 integration
    try:
        from PyQt6.QtWidgets import QApplication
        from PyQt6.QtCore import Qt
        from PyQt6.QtGui import QIcon
        print("✓ PyQt6 integration ready")
    except Exception as e:
        print(f"✗ PyQt6 integration failed: {e}")
        return False
    
    # Test optional dependencies
    try:
        import gempy as gp
        print(f"✓ GemPy core engine v{gp.__version__}")
    except Exception as e:
        print(f"⚠ GemPy simulation mode: {e}")
    
    try:
        import pyvista as pv
        print(f"✓ 3D visualization engine v{pv.__version__}")
    except Exception as e:
        print(f"⚠ 3D visualization unavailable: {e}")
    
    print("=" * 50)
    print("✓ All core components loaded successfully!")
    print("✓ Professional icon integration complete!")
    print("✓ System ready for launch!")
    
    return True

def create_icon_summary():
    """Create a summary of available icons"""
    try:
        from gempy_icons import GEMPY_ICONS
        
        print("\nIcon Summary:")
        print("-" * 30)
        
        categories = {
            'File Operations': ['new', 'open', 'save', 'import', 'export'],
            'GemPy Features': ['layers', 'model_3d', 'geological_model', 'gravity', 'magnetic'],
            'Data Management': ['interface_points', 'orientations', 'statistics', 'validation'],
            'Analysis Tools': ['section_analysis', 'volume_calculation', 'uncertainty_analysis', 'sensitivity_analysis'],
            'Visualization': ['view_3d', 'section_view', 'iso_surface', 'animation'],
            'Toolbar Actions': ['zoom', 'rotate', 'screenshot', 'refresh'],
            'Status Indicators': ['success', 'warning', 'error', 'info']
        }
        
        for category, icons in categories.items():
            available_icons = [icon for icon in icons if icon in GEMPY_ICONS]
            print(f"{category}: {len(available_icons)}/{len(icons)} icons")
        
        print(f"\nTotal Professional Icons: {len(GEMPY_ICONS)}")
        
    except Exception as e:
        print(f"Icon summary failed: {e}")

if __name__ == "__main__":
    success = test_all_components()
    
    if success:
        create_icon_summary()
        print("\n" + "="*50)
        print("INTEGRATION TEST PASSED!")
        print("Ready to launch GemPy Ultimate Professional Interface!")
        print("="*50)
    else:
        print("\nINTEGRATION TEST FAILED!")
        print("Please check the error messages above.")