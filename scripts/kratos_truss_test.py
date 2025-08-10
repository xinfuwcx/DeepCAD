import json
import math

import KratosMultiphysics as KM
import KratosMultiphysics.StructuralMechanicsApplication as SMA

# Model and ModelPart
model = KM.Model()
mp = model.CreateModelPart("TrussTest")
mp.ProcessInfo[KM.DOMAIN_SIZE] = 3
mp.SetBufferSize(2)

# Variables
for var in (KM.DISPLACEMENT, KM.REACTION, SMA.POINT_LOAD):
    mp.AddNodalSolutionStepVariable(var)

# Properties (steel-like)
prop = mp.Properties[1]
prop.SetValue(SMA.CROSS_AREA, 0.01)            # m^2
prop.SetValue(KM.YOUNG_MODULUS, 210e9)         # Pa
prop.SetValue(KM.DENSITY, 7850.0)
prop.SetValue(KM.CONSTITUTIVE_LAW, SMA.TrussConstitutiveLaw())

# Geometry: 1 m bar along X
n1 = mp.CreateNewNode(1, 0.0, 0.0, 0.0)
n2 = mp.CreateNewNode(2, 1.0, 0.0, 0.0)

# DOFs
for node in mp.Nodes:
    node.AddDof(KM.DISPLACEMENT_X, KM.REACTION_X)
    node.AddDof(KM.DISPLACEMENT_Y, KM.REACTION_Y)
    node.AddDof(KM.DISPLACEMENT_Z, KM.REACTION_Z)

# Element: 3D truss
mp.CreateNewElement("TrussElement3D2N", 1, [1, 2], prop)

# Boundary conditions: fix left end
for comp in (KM.DISPLACEMENT_X, KM.DISPLACEMENT_Y, KM.DISPLACEMENT_Z):
    n1.Fix(comp)

# External point load at right end (tension)
cond = mp.CreateNewCondition("PointLoadCondition3D1N", 1, [2], prop)
# initialize previous/current step loads on the condition
mp.ProcessInfo[KM.STEP] = 0
cond.SetValue(SMA.POINT_LOAD, KM.Array3([0.0, 0.0, 0.0]))
# advance to step 1
mp.ProcessInfo[KM.STEP] = 1
mp.CloneTimeStep(1.0)
# apply current step load as vector on the condition
cond.SetValue(SMA.POINT_LOAD, KM.Array3([-1.0e5, 0.0, 0.0]))

# Solver setup: static linear small displacement
scheme = KM.ResidualBasedIncrementalUpdateStaticScheme()
linear_solver = KM.SkylineLUFactorizationSolver()
conv_criteria = KM.DisplacementCriteria(1e-12, 1e-18)
builder_and_solver = KM.ResidualBasedBlockBuilderAndSolver(linear_solver)
strategy = KM.ResidualBasedNewtonRaphsonStrategy(
    mp, scheme, conv_criteria, builder_and_solver,
    10,  # max iterations
    True,   # compute reactions
    True,   # reform dof set each step
    True    # move mesh
)
strategy.SetEchoLevel(1)
# time stepping (static)
mp.ProcessInfo[KM.DELTA_TIME] = 1.0
mp.CloneTimeStep(1.0)
strategy.Initialize()
strategy.Check()
strategy.Solve()

# Results
ux = n2.GetSolutionStepValue(KM.DISPLACEMENT_X)
uy = n2.GetSolutionStepValue(KM.DISPLACEMENT_Y)
uz = n2.GetSolutionStepValue(KM.DISPLACEMENT_Z)

# Analytical axial displacement: u = F*L/(A*E)
F = 1.0e5
L = 1.0
A = 0.01
E = 210e9
u_analytical = F * L / (A * E)

out = {
    "kratos_version": getattr(KM, "__version__", "unknown"),
    "ux": ux,
    "uy": uy,
    "uz": uz,
    "u_analytical": -u_analytical,  # expected is negative due to -X load
    "abs_error": abs(ux - (-u_analytical)),
}
print(json.dumps(out, indent=2))

