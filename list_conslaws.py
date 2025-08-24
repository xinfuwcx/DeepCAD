#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
from pathlib import Path
print('CWD:', Path().resolve())
try:
    import KratosMultiphysics as KM
    cls = KM.KratosComponents['ConstitutiveLaws']
    keys = sorted(list(cls.keys()))
    print('Constitutive laws available ({}):'.format(len(keys)))
    for k in keys:
        print(' -', k)
except Exception as e:
    import traceback
    print('FAILED to list constitutive laws:', e)
    traceback.print_exc()
    sys.exit(1)

