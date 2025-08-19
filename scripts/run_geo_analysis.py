import json
from pathlib import Path
import KratosMultiphysics as KM
import KratosMultiphysics.GeoMechanicsApplication as G
from KratosMultiphysics.GeoMechanicsApplication.geomechanics_analysis import GeoMechanicsAnalysis

BASE = Path('example2/geo_run')
PP = BASE / 'ProjectParameters.json'


def main():
    model = KM.Model()
    with PP.open('r', encoding='utf-8') as f:
        parameters = KM.Parameters(f.read())
    analysis = GeoMechanicsAnalysis(model, parameters)
    analysis.Run()

if __name__ == '__main__':
    main()

