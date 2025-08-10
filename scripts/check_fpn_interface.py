from pathlib import Path
import json
import sys

# Ensure example2 is on sys.path
ROOT = Path(__file__).resolve().parent.parent
EX2 = ROOT / 'example2'
if str(EX2) not in sys.path:
    sys.path.insert(0, str(EX2))

from core.optimized_fpn_parser import OptimizedFPNParser

fpn_path = EX2 / 'data' / '两阶段计算2.fpn'
print(f'FPN exists: {fpn_path.exists()}  path={fpn_path}')

parser = OptimizedFPNParser()
res = parser.parse_file_streaming(str(fpn_path))

summary = {
    'top_keys': sorted(list(res.keys())),
    'counts': {
        'nodes': len(res.get('nodes', [])),
        'elements': len(res.get('elements', [])),
        'material_groups': len(res.get('material_groups', {})),
        'load_groups': len(res.get('load_groups', {})),
        'boundary_groups': len(res.get('boundary_groups', {})),
        'analysis_stages': len(res.get('analysis_stages', [])),
    },
    'metadata': res.get('metadata', {}),
}

# Samples
samples = {}
if res.get('nodes'):
    samples['node'] = res['nodes'][0]
if res.get('elements'):
    samples['element'] = res['elements'][0]
if res.get('analysis_stages'):
    st0 = res['analysis_stages'][0]
    samples['stage0'] = {
        k: st0.get(k) for k in ('id', 'type', 'name', 'active_materials', 'active_loads', 'active_boundaries')
    }
summary['samples'] = samples

print('JSON:\n' + json.dumps(summary, ensure_ascii=False, indent=2))

