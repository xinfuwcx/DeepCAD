#!/usr/bin/env python3
# Debug MPC constraint generation

import sys
import os
from pathlib import Path

# Setup environment
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.append(str(project_root / "core"))

def debug_mpc_generation():
    """Debug MPC constraint generation step by step"""
    print("=== Debug MPC Generation ===")
    
    try:
        # 1. Load FPN data
        from optimized_fpn_parser import OptimizedFPNParser
        parser = OptimizedFPNParser()
        
        fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
        print(f"Loading FPN file: {fpn_file}")
        fpn_data = parser.parse_file_streaming(str(fpn_file))
        print("FPN data loaded successfully")
        
        # 2. Create Kratos interface
        from kratos_interface import KratosInterface
        ki = KratosInterface()
        
        # 3. Setup model
        print("\nSetting up model...")
        success = ki.setup_model(fpn_data)
        
        if not success:
            print("Model setup failed")
            return False
        
        print("Model setup successful")
        
        # 4. Test MPC generation directly
        print("\nTesting MPC generation directly...")
        temp_dir = Path("debug_mpc_test")
        temp_dir.mkdir(exist_ok=True)
        
        try:
            # Call the MPC generation function directly
            ki._write_interface_mappings(temp_dir,
                                       projection_tolerance=2.0,
                                       search_radius=20.0,
                                       nearest_k=8)
            
            print("MPC generation completed without error")
            
            # Check if files were created
            mpc_file = temp_dir / "mpc_constraints.json"
            process_file = temp_dir / "mpc_constraints_process.py"
            
            if mpc_file.exists():
                print(f"MPC constraints file created: {mpc_file}")
                
                import json
                with open(mpc_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                shell_anchor = data.get('shell_anchor', [])
                anchor_solid = data.get('anchor_solid', [])
                
                print(f"  Shell-Anchor constraints: {len(shell_anchor)}")
                print(f"  Anchor-Solid constraints: {len(anchor_solid)}")
                
                if len(shell_anchor) > 0:
                    example = shell_anchor[0]
                    print(f"  Example Shell-Anchor:")
                    print(f"    Slave node: {example['slave']}")
                    print(f"    Masters: {len(example['masters'])}")
                    print(f"    DOFs: {example['dofs']}")
                
                if len(anchor_solid) > 0:
                    example = anchor_solid[0]
                    print(f"  Example Anchor-Solid:")
                    print(f"    Slave node: {example['slave']}")
                    print(f"    Masters: {len(example['masters'])}")
                    print(f"    DOFs: {example['dofs']}")
                
            else:
                print("MPC constraints file NOT created")
                
            if process_file.exists():
                print(f"MPC process file created: {process_file}")
            else:
                print("MPC process file NOT created")
            
            # Check if constraint data was saved to instance
            if hasattr(ki, 'mpc_constraint_data'):
                print("MPC constraint data saved to instance")
                constraint_data = ki.mpc_constraint_data
                shell_count = len(constraint_data.get('shell_anchor', []))
                solid_count = len(constraint_data.get('anchor_solid', []))
                print(f"  Instance data - Shell: {shell_count}, Solid: {solid_count}")
            else:
                print("MPC constraint data NOT saved to instance")
            
            return True
            
        except Exception as e:
            print(f"MPC generation failed with error: {e}")
            import traceback
            traceback.print_exc()
            return False
        
    except Exception as e:
        print(f"Debug failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = debug_mpc_generation()
    
    print(f"\n=== Result ===")
    if success:
        print("MPC generation debugging completed")
    else:
        print("MPC generation debugging failed")