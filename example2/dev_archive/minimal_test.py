import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

try:
    from modules.preprocessor import PreProcessor
    p = PreProcessor()
    
    fpn_path = Path("data/两阶段计算2.fpn")
    print(f"File exists: {fpn_path.exists()}")
    
    if fpn_path.exists():
        p.load_fpn_file(str(fpn_path))
        if hasattr(p, 'fpn_data') and p.fpn_data:
            stages = p.fpn_data.get('analysis_stages', [])
            print(f"Stages found: {len(stages)}")
            
            for i, stage in enumerate(stages):
                print(f"Stage {i}: {stage.get('name', 'Unnamed')}")
                
                # Test stage switching
                p.set_current_analysis_stage(i)
                if hasattr(p, 'current_active_materials'):
                    materials = sorted(list(p.current_active_materials))
                    print(f"  Active materials: {materials}")
        else:
            print("Failed to load FPN data")
    else:
        print("FPN file not found")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

input("Press Enter to exit...")