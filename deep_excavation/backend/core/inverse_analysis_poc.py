import KratosMultiphysics
import KratosMultiphysics.StructuralMechanicsApplication as StructuralMechanicsApplication
import KratosMultiphysics.OptimizationApplication as KratosOptimization

def run_forward_analysis(model, youngs_modulus):
    """
    Runs a simple cantilever beam analysis and returns the displacement at the tip.
    """
    model_part = model.CreateModelPart("Structure")
    model_part.ProcessInfo[KratosMultiphysics.DOMAIN_SIZE] = 3

    # Add variables
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.REACTION)
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.VOLUME_ACCELERATION)

    # Create nodes
    model_part.CreateNewNode(1, 0.0, 0.0, 0.0)
    model_part.CreateNewNode(2, 1.0, 0.0, 0.0)
    model_part.CreateNewNode(3, 2.0, 0.0, 0.0)

    # Set properties
    props = model_part.CreateNewProperties(1)
    props.SetValue(KratosMultiphysics.YOUNG_MODULUS, youngs_modulus)
    props.SetValue(KratosMultiphysics.POISSON_RATIO, 0.3)
    props.SetValue(KratosMultiphysics.DENSITY, 7850.0)
    props.SetValue(StructuralMechanicsApplication.CROSS_AREA, 0.01)
    props.SetValue(StructuralMechanicsApplication.I33, 8.333e-6) # Rectangular cross section 0.1x0.1

    # Create elements
    element_name = "TrussElement3D2N"
    model_part.CreateNewElement(element_name, 1, [1, 2], props)
    model_part.CreateNewElement(element_name, 2, [2, 3], props)

    # Apply boundary conditions
    model_part.GetNode(1).Fix(KratosMultiphysics.DISPLACEMENT_X)
    model_part.GetNode(1).Fix(KratosMultiphysics.DISPLACEMENT_Y)
    model_part.GetNode(1).Fix(KratosMultiphysics.DISPLACEMENT_Z)

    # Apply load
    load_props = KratosMultiphysics.Parameters("""
    {
        "model_part_name": "Structure.Load",
        "variable_name"  : "POINT_LOAD",
        "value"          : [0.0, -1000.0, 0.0]
    }
    """)
    model_part.CreateSubModelPart("Load")
    load_sub_model_part = model_part.GetSubModelPart("Load")
    load_sub_model_part.AddNodes([3])
    KratosMultiphysics.ApplyConstantVectorValueProcess(load_sub_model_part, load_props).Execute()

    # Create and run solver
    solver_settings = KratosMultiphysics.Parameters("""
    {
        "solver_type": "static",
        "echo_level": 0,
        "analysis_type": "linear"
    }
    """)
    solver = StructuralMechanicsApplication.MechanicalSolver(model, solver_settings)
    solver.AddVariables()
    solver.ImportModelPart()
    solver.AddDofs()
    solver.Initialize()
    solver.Solve()

    # Get result
    tip_displacement = model_part.GetNode(3).GetSolutionStepValue(KratosMultiphysics.DISPLACEMENT_Y)
    return tip_displacement

class ObjectiveFunction(KratosOptimization.ResponseFunctions.ResponseFunction):
    def __init__(self, model, target_displacement):
        super().__init__("objective")
        self.model = model
        self.target_displacement = target_displacement

    def GetValue(self):
        tip_displacement = self.model.GetModelPart("Structure").GetNode(3).GetSolutionStepValue(KratosMultiphysics.DISPLACEMENT_Y)
        error = tip_displacement - self.target_displacement
        return 0.5 * error**2

    def GetNodalGradient(self, variable):
        return {} # Not needed for parameter optimization

    def GetElementalGradient(self, variable):
        if variable == KratosMultiphysics.YOUNG_MODULUS:
            # This is where the adjoint sensitivity would be calculated.
            # For this simple PoC, we rely on the optimizer to handle it.
            # Kratos calculates this internally when running the optimization.
            return {}
        else:
            return {}

def main():
    print("--- Inverse Analysis Proof of Concept ---")

    # --- Stage 1: Generate Ground Truth ---
    print("\nStep 1: Running forward analysis to get 'observed' data...")
    true_youngs_modulus = 2.1e11 # True value we want to find
    forward_model = KratosMultiphysics.Model()
    observed_displacement = run_forward_analysis(forward_model, true_youngs_modulus)
    print(f"  > True Young's Modulus: {true_youngs_modulus:.2e} Pa")
    print(f"  > 'Observed' Tip Displacement: {observed_displacement:.6f} m")


    # --- Stage 2: Run Inverse Analysis ---
    print("\nStep 2: Starting inverse analysis to find the Young's Modulus...")
    initial_guess_youngs_modulus = 1.0e11 # Initial guess for the optimizer
    
    # We need a fresh model and model part for the optimization loop
    inverse_model = KratosMultiphysics.Model()
    
    # We create a dummy analysis stage that the optimizer can use to run the simulation
    class MyAnalysis(KratosOptimization.OptimizationProblem):
        def __init__(self, initial_E):
            self.initial_E = initial_E

        def GetProblemName(self):
            return "Inverse_Analysis_PoC"
        
        def GetModel(self):
            return inverse_model

        def Initialize(self):
            # Create the model part and its properties for the optimization
            model_part = inverse_model.CreateModelPart("Structure")
            model_part.ProcessInfo[KratosMultiphysics.DOMAIN_SIZE] = 3
            model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
            model_part.AddNodalSolutionStepVariable(KratosMultiphysics.REACTION)
            model_part.AddNodalSolutionStepVariable(KratosMultiphysics.VOLUME_ACCELERATION)
            model_part.CreateNewNode(1, 0.0, 0.0, 0.0)
            model_part.CreateNewNode(2, 1.0, 0.0, 0.0)
            model_part.CreateNewNode(3, 2.0, 0.0, 0.0)
            props = model_part.CreateNewProperties(1)
            props.SetValue(KratosMultiphysics.YOUNG_MODULUS, self.initial_E) # Use initial guess
            props.SetValue(KratosMultiphysics.POISSON_RATIO, 0.3)
            props.SetValue(KratosMultiphysics.DENSITY, 7850.0)
            props.SetValue(StructuralMechanicsApplication.CROSS_AREA, 0.01)
            props.SetValue(StructuralMechanicsApplication.I33, 8.333e-6)
            model_part.CreateNewElement("TrussElement3D2N", 1, [1, 2], props)
            model_part.CreateNewElement("TrussElement3D2N", 2, [2, 3], props)
            model_part.GetNode(1).Fix(KratosMultiphysics.DISPLACEMENT_X)
            model_part.GetNode(1).Fix(KratosMultiphysics.DISPLACEMENT_Y)
            model_part.GetNode(1).Fix(KratosMultiphysics.DISPLACEMENT_Z)
            load_props = KratosMultiphysics.Parameters('{"model_part_name": "Structure.Load", "variable_name": "POINT_LOAD", "value": [0.0, -1000.0, 0.0]}')
            model_part.CreateSubModelPart("Load")
            load_sub_model_part = model_part.GetSubModelPart("Load")
            load_sub_model_part.AddNodes([3])
            KratosMultiphysics.ApplyConstantVectorValueProcess(load_sub_model_part, load_props).Execute()

        def Run(self):
            # The optimizer will call this method in each iteration
            solver_settings = KratosMultiphysics.Parameters('{"solver_type": "static", "echo_level": 0, "analysis_type": "linear"}')
            solver = StructuralMechanicsApplication.MechanicalSolver(self.GetModel(), solver_settings)
            solver.AddVariables()
            # Don't import model part again, it's managed by the optimization problem
            solver.AddDofs()
            solver.Initialize()
            solver.Solve()
            # Important: The response function relies on the results being available here.

    # --- Configure the Optimization ---
    optimization_settings = KratosMultiphysics.Parameters("""
    {
        "objectives" : [{
            "identifier" : "objective",
            "type"       : "minimization",
            "scaling"    : 1.0,
            "use_kratos" : true
        }],
        "design_variables" : [{
            "identifier"         : "YOUNG_MODULUS",
            "model_part_name"    : "Structure",
            "initial_value"      : 1.0e11,
            "lower_bound"        : 1.0e10,
            "upper_bound"        : 5.0e11,
            "scaling"            : 1.0e-11
        }],
        "constraints" : [],
        "optimization_algorithm" : {
            "name"                 : "steepest_descent",
            "max_iterations"       : 20,
            "line_search"          : {
                "type"                 : "const_step",
                "step_size"            : 1.0
            }
        },
        "output" : {
            "echo_level" : 1
        }
    }
    """)
    optimization_settings["design_variables"][0]["initial_value"].SetDouble(initial_guess_youngs_modulus)

    # Create the analysis stage for optimization
    analysis = MyAnalysis(initial_guess_youngs_modulus)
    
    # Create the objective response function
    objective = ObjectiveFunction(inverse_model, observed_displacement)

    # Run the optimization
    optimizer = KratosOptimization.Optimizer(analysis, optimization_settings, [objective], [])
    optimizer.Optimize()
    
    # --- Final Result ---
    optimized_youngs_modulus = inverse_model.GetModelPart("Structure").GetProperty(1).GetValue(KratosMultiphysics.YOUNG_MODULUS)
    print("\n--- Results ---")
    print(f"  > True Young's Modulus:             {true_youngs_modulus:.2e} Pa")
    print(f"  > Initial Guess for Young's Modulus:  {initial_guess_youngs_modulus:.2e} Pa")
    print(f"  > Optimized Young's Modulus:          {optimized_youngs_modulus:.2e} Pa")
    print("---------------------------------------------")

if __name__ == '__main__':
    main() 