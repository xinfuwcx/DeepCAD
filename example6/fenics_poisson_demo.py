"""
FEniCS (legacy dolfin) Poisson demo that runs inside WSL.

It solves: -Δu = f in Ω, u = u_D on ∂Ω, with Ω = unit square.
Outputs are saved to /mnt/e/DeepCAD/example6/output so they are visible from Windows.
"""

from dolfin import *  # legacy FEniCS 2019.2.0
import os


def main():
    # Mesh and function space
    mesh = UnitSquareMesh(32, 32)
    V = FunctionSpace(mesh, "P", 1)

    # Dirichlet boundary condition u_D
    u_D = Expression("1 + x[0]*x[0] + 2*x[1]*x[1]", degree=2)

    def boundary(x, on_boundary):
        return on_boundary

    bc = DirichletBC(V, u_D, boundary)

    # Variational problem
    u = TrialFunction(V)
    v = TestFunction(V)
    f = Constant(-6.0)
    a = dot(grad(u), grad(v)) * dx
    L = f * v * dx

    # Solve
    u_sol = Function(V)
    solve(a == L, u_sol, bc)

    # Prepare output directory (WSL path for Windows E:\)
    output_dir = "/mnt/e/DeepCAD/example6/output"
    os.makedirs(output_dir, exist_ok=True)

    # Save solution and gradient
    File(os.path.join(output_dir, "poisson.pvd")) << u_sol
    Vg = VectorFunctionSpace(mesh, "P", 1)
    gradu = project(grad(u_sol), Vg)
    File(os.path.join(output_dir, "gradient.pvd")) << gradu

    # Basic verification: L2 error to manufactured solution
    error_L2 = errornorm(u_D, u_sol, norm_type="L2")
    max_u = u_sol.vector().max()
    min_u = u_sol.vector().min()
    print(f"Saved: {output_dir}/poisson.pvd and gradient.pvd")
    print(f"L2 error = {error_L2:.3e}; range = [{min_u:.3f}, {max_u:.3f}]")


if __name__ == "__main__":
    main()
