#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Run the anchored two-stage analysis using the generated ProjectParameters.json
"""
import os
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ANAL_DIR = HERE / 'two_stage_analysis'
PP = ANAL_DIR / 'ProjectParameters.json'


def main():
    print('CWD(before):', os.getcwd())
    print('Analysis dir:', ANAL_DIR)
    if not PP.exists():
        print('ERROR: ProjectParameters.json not found at', PP)
        return 1

    # Change working directory so relative paths in ProjectParameters work
    os.chdir(ANAL_DIR)
    print('CWD(now):', os.getcwd())

    try:
        import KratosMultiphysics as KM
        from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis as sma
        params_text = Path('ProjectParameters.json').read_text(encoding='utf-8')
        parameters = KM.Parameters(params_text)
        # Force correct filenames (avoid duplicated prefixes)
        parameters["solver_settings"]["model_import_settings"]["input_filename"].SetString("two_stage")
        parameters["solver_settings"]["material_import_settings"]["materials_filename"].SetString("Materials.json")
        print('Using materials file:', parameters["solver_settings"]["material_import_settings"]["materials_filename"].GetString())
        mt = Path('Materials.json').read_text(encoding='utf-8')
        print('Materials.json head:', mt[:200].replace('\n',' '))
        print('Contains ModifiedMohrCoulomb?', 'ModifiedMohrCoulomb' in mt)
        model = KM.Model()
        analysis = sma.StructuralMechanicsAnalysis(model, parameters)
        t0 = time.time()
        analysis.Run()
        dt = time.time() - t0
        print('Analysis finished in {:.2f}s'.format(dt))
        # list some vtk files
        out_dir = Path('VTK_Output')
        if out_dir.exists():
            files = sorted(out_dir.glob('*.vtk'))
            print('VTK files:', len(files))
            for f in files[:4]:
                print('  -', f.name, f.stat().st_size, 'bytes')
        return 0
    except Exception as e:
        import traceback
        print('Analysis failed:', e)
        traceback.print_exc()
        return 2

if __name__ == '__main__':
    raise SystemExit(main())

