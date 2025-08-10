import os
from pathlib import Path
import sys

# add project root to sys.path when executed from out_dir
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.kratos_integration import KratosIntegration

out_dir = (ROOT / 'example2' / 'out' / 'kratos_full').resolve()
pp = out_dir / 'ProjectParameters.json'

if not pp.exists():
    print('ProjectParameters.json not found at', pp)
    sys.exit(1)

# Ensure working dir is output dir
os.chdir(out_dir)
print('CWD:', Path().resolve())
print('Using PP:', pp.name)

# Set threads to 8 as requested
os.environ['OMP_NUM_THREADS'] = os.environ.get('OMP_NUM_THREADS', '8')
os.environ['MKL_NUM_THREADS'] = os.environ.get('MKL_NUM_THREADS', '8')
print('Threads:', os.environ['OMP_NUM_THREADS'])

ki = KratosIntegration()
print('Kratos available:', ki.is_available())

ok, msg = ki.run_analysis(str(pp.name))
print('Result:', ok, msg)

