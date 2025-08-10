import os
import sys
import json

report = {}

report["python"] = sys.version

# GMsh minimal mesh generation (no GUI)
try:
    import gmsh
    gmsh.initialize()
    gmsh.model.add("qc")
    p1 = gmsh.model.geo.addPoint(0, 0, 0)
    p2 = gmsh.model.geo.addPoint(1, 0, 0)
    p3 = gmsh.model.geo.addPoint(1, 1, 0)
    p4 = gmsh.model.geo.addPoint(0, 1, 0)
    l1 = gmsh.model.geo.addLine(p1, p2)
    l2 = gmsh.model.geo.addLine(p2, p3)
    l3 = gmsh.model.geo.addLine(p3, p4)
    l4 = gmsh.model.geo.addLine(p4, p1)
    cl = gmsh.model.geo.addCurveLoop([l1, l2, l3, l4])
    s1 = gmsh.model.geo.addPlaneSurface([cl])
    gmsh.model.geo.synchronize()
    gmsh.model.mesh.generate(2)
    elem_types, elem_tags, _ = gmsh.model.mesh.getElements()
    n_elems = sum(len(tags) for tags in elem_tags)
    out_path = os.path.join(os.path.dirname(__file__), "qc_square.msh")
    gmsh.write(out_path)
    gmsh.finalize()
    report["gmsh"] = {"version": gmsh.__version__, "elements": n_elems, "mesh_file": out_path}
except Exception as e:
    report["gmsh_error"] = str(e)

# PyVista minimal geometry (offscreen, no rendering)
try:
    import pyvista as pv
    mesh = pv.Sphere(radius=0.5, theta_resolution=12, phi_resolution=12)
    report["pyvista"] = {"version": pv.__version__, "n_points": int(mesh.n_points), "n_faces": int(mesh.n_faces)}
except Exception as e:
    report["pyvista_error"] = str(e)

# GemPy version
try:
    import gempy
    report["gempy"] = {"version": gempy.__version__}
except Exception as e:
    report["gempy_error"] = str(e)

# Kratos minimal sanity
try:
    import KratosMultiphysics as KM
    model = KM.Model()
    mp = model.CreateModelPart("Test")
    mp.AddNodalSolutionStepVariable(KM.DISPLACEMENT)
    mp.CreateNewNode(1, 0.0, 0.0, 0.0)
    report["kratos"] = {"version": getattr(KM, "__version__", "unknown"), "nodes": mp.NumberOfNodes()}
except Exception as e:
    report["kratos_error"] = str(e)

print(json.dumps(report, ensure_ascii=False, indent=2))

