import json
from example6.example6_cae import CAEOrchestrator, CAECase

orch = CAEOrchestrator()
print(json.dumps(orch.validate_setup(), ensure_ascii=False))
case = CAECase(pier_diameter=2.0, flow_velocity=1.2, water_depth=4.0, d50=0.6)
res = orch.simulate(case)
print("\nRESULT\n"+json.dumps(res, ensure_ascii=False))
