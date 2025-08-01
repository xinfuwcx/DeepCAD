// KRATOS    ______            __             __  _____ __                  __                   __
//          / ____/___  ____  / /_____ ______/ /_/ ___// /________  _______/ /___  ___________ _/ /
//         / /   / __ \/ __ \/ __/ __ `/ ___/ __/\__ \/ __/ ___/ / / / ___/ __/ / / / ___/ __ `/ / 
//        / /___/ /_/ / / / / /_/ /_/ / /__/ /_ ___/ / /_/ /  / /_/ / /__/ /_/ /_/ / /  / /_/ / /  
//        \____/\____/_/ /_/\__/\__,_/\___/\__//____/\__/_/   \__,_/\___/\__/\__,_/_/   \__,_/_/  MECHANICS
//
//  License:         BSD License
//                   license: ContactStructuralMechanicsApplication/license.txt
//
//  Main authors:    Vicente Mataix Ferrandiz
//
//

#pragma once

// System includes
#include <unordered_set>
#include <unordered_map>

// External includes

// Project includes
#include "solving_strategies/builder_and_solvers/residualbased_elimination_builder_and_solver_with_constraints.h"

namespace Kratos
{

///@name Kratos Globals
///@{

///@}
///@name Type Definitions
///@{
    
///@}
///@name  Enum's
///@{

///@}
///@name  Functions
///@{

///@}
///@name Kratos Classes
///@{

/**
 * @class ContactResidualBasedEliminationBuilderAndSolverWithConstraints
 * @ingroup ContactStructuralMechanicsApplication
 * @brief Current class provides an implementation for contact builder and solving operations. (elimination)
 * @details The RHS is constituted by the unbalanced loads (residual). Degrees of freedom are reordered putting the restrained degrees of freedom at the end of the system ordered in reverse order with respect to the DofSet and not considered the inactive ones. Imposition of the dirichlet conditions is naturally dealt with as the residual already contains this information. Calculation of the reactions involves a cost very similar to the calculation of the total residual
 * @author Vicente Mataix Ferrandiz
 * @tparam TSparseSpace The sparse matrix system considered
 * @tparam TDenseSpace The dense matrix system
 * @tparam TLinearSolver The type of linear solver considered
 */
template<class TSparseSpace,
         class TDenseSpace, //= DenseSpace<double>,
         class TLinearSolver //= LinearSolver<TSparseSpace,TDenseSpace>
         >
class ContactResidualBasedEliminationBuilderAndSolverWithConstraints
    : public ResidualBasedEliminationBuilderAndSolverWithConstraints< TSparseSpace, TDenseSpace, TLinearSolver >
{
public:
    ///@name Type Definitions
    ///@{
    
    /// Pointer definition of ContactResidualBasedEliminationBuilderAndSolverWithConstraints
    KRATOS_CLASS_POINTER_DEFINITION(ContactResidualBasedEliminationBuilderAndSolverWithConstraints);

    /// Builder and solver base class
    using BaseBuilderAndSolverType = BuilderAndSolver<TSparseSpace, TDenseSpace, TLinearSolver>;

    /// Definitions dependent on the base class
    using BaseType = ResidualBasedEliminationBuilderAndSolverWithConstraints<TSparseSpace, TDenseSpace, TLinearSolver>;

    /// The definition of the current class
    using ClassType = ContactResidualBasedEliminationBuilderAndSolverWithConstraints<TSparseSpace, TDenseSpace, TLinearSolver>;

    /// Base types definitions
    using TSchemeType = typename BaseType::TSchemeType;
    using TDataType = typename BaseType::TDataType;
    using DofsArrayType = typename BaseType::DofsArrayType;
    using TSystemMatrixType = typename BaseType::TSystemMatrixType;
    using TSystemVectorType = typename BaseType::TSystemVectorType;
    using LocalSystemVectorType = typename BaseType::LocalSystemVectorType;
    using LocalSystemMatrixType = typename BaseType::LocalSystemMatrixType;
    using TSystemMatrixPointerType = typename BaseType::TSystemMatrixPointerType;
    using TSystemVectorPointerType = typename BaseType::TSystemVectorPointerType;
    using NodesArrayType = typename BaseType::NodesArrayType;
    using ElementsArrayType = typename BaseType::ElementsArrayType;
    using ConditionsArrayType = typename BaseType::ConditionsArrayType;

    /// General containers type definitions
    using ConstraintContainerType = ModelPart::MasterSlaveConstraintContainerType;

    /// Additional definitions
    using ElementsContainerType = typename BaseType::ElementsContainerType;
    using EquationIdVectorType = typename BaseType::EquationIdVectorType;
    using DofsVectorType = typename BaseType::DofsVectorType;

    /// DoF types definition
    using DofType = typename BaseType::DofType;
    using DofPointerType = typename BaseType::DofPointerType;

    /// The DoF pointer vector type definition
    using DofPointerVectorType = std::vector<typename DofType::Pointer>;

    /// The size type
    using SizeType = std::size_t;

    /// The index type
    using IndexType = std::size_t;

    /// Index set definition
    using IndexSetType = std::unordered_set<IndexType>;

    ///@}
    ///@name Enum's
    ///@{

    ///@}
    ///@name Life Cycle
    ///@{

    /**
     * @brief Default constructor
     */
    explicit ContactResidualBasedEliminationBuilderAndSolverWithConstraints() : BaseType()
    {
    }

    /**
     * @brief Default constructor. (with parameters)
     */
    explicit ContactResidualBasedEliminationBuilderAndSolverWithConstraints(
        typename TLinearSolver::Pointer pNewLinearSystemSolver,
        Parameters ThisParameters
        ) : BaseType(pNewLinearSystemSolver)
    {
        // Validate and assign defaults
        ThisParameters = this->ValidateAndAssignParameters(ThisParameters, this->GetDefaultParameters());
        this->AssignSettings(ThisParameters);
    }

    /** Constructor.
     */
    ContactResidualBasedEliminationBuilderAndSolverWithConstraints(
        typename TLinearSolver::Pointer pNewLinearSystemSolver)
        : BaseType(pNewLinearSystemSolver)
    {
    }

    /** Destructor.
     */
    ~ContactResidualBasedEliminationBuilderAndSolverWithConstraints() override
    {
    }

    ///@}
    ///@name Operators
    ///@{
    
    ///@}
    ///@name Operations
    ///@{

    /**
     * @brief Create method
     * @param pNewLinearSystemSolver The linear solver for the system of equations
     * @param ThisParameters The configuration parameters
     */
    typename BaseBuilderAndSolverType::Pointer Create(
        typename TLinearSolver::Pointer pNewLinearSystemSolver,
        Parameters ThisParameters
        ) const override
    {
        return Kratos::make_shared<ClassType>(pNewLinearSystemSolver,ThisParameters);
    }

    /**
     * @brief It organises the dofset in order to speed up the building phase
     * @param rModelPart The model part to compute
     */
    void SetUpSystem(
        ModelPart& rModelPart
        ) override
    {
        if(rModelPart.MasterSlaveConstraints().size() > 0)
            SetUpSystemWithConstraints(rModelPart);
        else
            BaseSetUpSystem(rModelPart);
    }

    /**
     * @brief Builds the list of the DofSets involved in the problem by "asking" to each element
     * and condition its Dofs.
     * @details The list of dofs is stores inside the BuilderAndSolver as it is closely connected to the
     * way the matrix and RHS are built
     * @param pScheme The integration scheme considered
     * @param rModelPart The model part of the problem to solve
     */
    void SetUpDofSet(
        typename TSchemeType::Pointer pScheme,
        ModelPart& rModelPart
        ) override
    {
        if(rModelPart.MasterSlaveConstraints().size() > 0)
            SetUpDofSetWithConstraints(pScheme, rModelPart);
        else
            BaseType::SetUpDofSet(pScheme, rModelPart);
    }

    /**
     * @brief This method provides the defaults parameters to avoid conflicts between the different constructors
     * @return The default parameters
     */
    Parameters GetDefaultParameters() const override
    {
        Parameters default_parameters = Parameters(R"(
        {
            "name" : "contact_residual_elimination_builder_and_solver_with_constraints"
        })");

        // Getting base class default parameters
        const Parameters base_default_parameters = BaseType::GetDefaultParameters();
        default_parameters.RecursivelyAddMissingParameters(base_default_parameters);
        return default_parameters;
    }

    /**
     * @brief Returns the name of the class as used in the settings (snake_case format)
     * @return The name of the class
     */
    static std::string Name()
    {
        return "contact_residual_elimination_builder_and_solver_with_constraints";
    }

    ///@}
    ///@name Access
    ///@{

    ///@}
    ///@name Inquiry
    ///@{

    ///@}
    ///@name Friends
    ///@{

    ///@}

protected:
    ///@name Protected static Member Variables
    ///@{

    ///@}
    ///@name Protected member Variables
    ///@{

    ///@}
    ///@name Protected Operators
    ///@{

    ///@}
    ///@name Protected Operations
    ///@{

    /**
     * @brief Builds the list of the DofSets involved in the problem by "asking" to each element and condition its Dofs.
     * @details Equivalent to the ResidualBasedEliminationBuilderAndSolver but with constraints. The list of dofs is stores inside the BuilderAndSolver as it is closely connected to the way the matrix and RHS are built
     * @param pScheme The integration scheme considered
     * @param rModelPart The model part of the problem to solve
     */
    void SetUpDofSetWithConstraints(
        typename TSchemeType::Pointer pScheme,
        ModelPart& rModelPart
        )
    {
        KRATOS_TRY;

        // We are going to enforce the existence of constraints for LM for each displacement dof
        if (rModelPart.NodesBegin()->SolutionStepsDataHas(VECTOR_LAGRANGE_MULTIPLIER)) {
            // Reorder constrains
            IndexType constraint_id = 1;
            for (auto& constrain : rModelPart.MasterSlaveConstraints()) {
                constrain.SetId(constraint_id);
                ++constraint_id;
            }

            // Auxiliary dofs lists
            DofsVectorType dof_list, second_dof_list; // NOTE: The second dof list is only used on constraints to include master/slave relations

            // Contributions to the system
            LocalSystemMatrixType transformation_matrix = LocalSystemMatrixType(0, 0);
            LocalSystemVectorType constant_vector = LocalSystemVectorType(0);

            // Reference constraint
            const auto& r_clone_constraint = KratosComponents<MasterSlaveConstraint>::Get("LinearMasterSlaveConstraint");

            #pragma omp parallel firstprivate(transformation_matrix, constant_vector, dof_list, second_dof_list)
            {
                // Current process info
                ProcessInfo& r_current_process_info = rModelPart.GetProcessInfo();

                // A buffer to store auxiliary constraints
                ConstraintContainerType constraints_buffer;

                // Gets the array of constraints from the modeler
                auto& r_constraints_array = rModelPart.MasterSlaveConstraints();
                const int number_of_constraints = static_cast<int>(r_constraints_array.size());
                #pragma omp for schedule(guided, 512)
                for (int i = 0; i < number_of_constraints; ++i) {
                    auto it_const = r_constraints_array.begin() + i;

                    // Gets list of Dof involved on every element
                    it_const->GetDofList(dof_list, second_dof_list, r_current_process_info);
                    it_const->CalculateLocalSystem(transformation_matrix, constant_vector, r_current_process_info);

                    DofPointerVectorType slave_dofs, master_dofs;
                    bool create_lm_constraint = false;

                    // We check if we have SLAVE nodes in the master dofs
                    bool slave_nodes_master_dof = false;
                    // Master DoFs
                    for (auto& p_dof : second_dof_list) {
                        if (IsDisplacementDof(*p_dof)) {
                            const IndexType node_id = p_dof->Id();
                            auto pnode = rModelPart.pGetNode(node_id);
                            if (pnode->Is(SLAVE)) { // The nodes computing contact are the slave nodes
                                slave_nodes_master_dof = true;
                                break;
                            }
                        }
                    }

                    // Slave DoFs
                    for (auto& p_dof : dof_list) {
                        if (IsDisplacementDof(*p_dof)) {
                            const IndexType node_id = p_dof->Id();
                            const auto& r_variable = p_dof->GetVariable();
                            auto pnode = rModelPart.pGetNode(node_id);
                            if (pnode->IsNot(INTERFACE) || slave_nodes_master_dof) { // Nodes from the contact interface cannot be slave DoFs
                                if (r_variable == DISPLACEMENT_X) {
                                    slave_dofs.push_back(pnode->pGetDof(VECTOR_LAGRANGE_MULTIPLIER_X));
                                } else if (r_variable == DISPLACEMENT_Y) {
                                    slave_dofs.push_back(pnode->pGetDof(VECTOR_LAGRANGE_MULTIPLIER_Y));
                                } else if (r_variable == DISPLACEMENT_Z) {
                                    slave_dofs.push_back(pnode->pGetDof(VECTOR_LAGRANGE_MULTIPLIER_Z));
                                }
                            } else { // We remove it
                                it_const->Set(TO_ERASE);
                            }
                        }
                    }
                    // Master DoFs
                    if (slave_nodes_master_dof) { // The nodes computing contact are the slave nodes
                        for (auto& p_dof : second_dof_list) {
                            if (IsDisplacementDof(*p_dof)) {
                                const IndexType node_id = p_dof->Id();
                                const auto& r_variable = p_dof->GetVariable();
                                auto pnode = rModelPart.pGetNode(node_id);
                                if (r_variable == DISPLACEMENT_X) {
                                    master_dofs.push_back(pnode->pGetDof(VECTOR_LAGRANGE_MULTIPLIER_X));
                                } else if (r_variable == DISPLACEMENT_Y) {
                                    master_dofs.push_back(pnode->pGetDof(VECTOR_LAGRANGE_MULTIPLIER_Y));
                                } else if (r_variable == DISPLACEMENT_Z) {
                                    master_dofs.push_back(pnode->pGetDof(VECTOR_LAGRANGE_MULTIPLIER_Z));
                                }
                            }
                        }
                    }

                    // We check if we create constraints
                    if ((slave_dofs.size() == dof_list.size()) &&
                        (master_dofs.size() == second_dof_list.size())) {
                        create_lm_constraint = true;
                    }

                    // We create the new constraint
                    if (create_lm_constraint) {
                        auto p_constraint = r_clone_constraint.Create(constraint_id + i + 1, master_dofs, slave_dofs, transformation_matrix, constant_vector);
                        (constraints_buffer).insert((constraints_buffer).begin(), p_constraint);
                    }
                }

                // We transfer
                #pragma omp critical
                {
                    rModelPart.AddMasterSlaveConstraints(constraints_buffer.begin(),constraints_buffer.end());
                }
            }
        }

        // We remove the marked constraints
        rModelPart.RemoveMasterSlaveConstraintsFromAllLevels(TO_ERASE);

        KRATOS_INFO_IF("ContactResidualBasedEliminationBuilderAndSolverWithConstraints", (this->GetEchoLevel() > 0)) <<
        "Model part after creating new constraints" << rModelPart << std::endl;

        // Calling base SetUpDofSetWithConstraints
        BaseType::SetUpDofSetWithConstraints(pScheme, rModelPart);

        KRATOS_CATCH("");
    }

    /**
     * @brief This method assigns settings to member variables
     * @param ThisParameters Parameters that are assigned to the member variables
     */
    void AssignSettings(const Parameters ThisParameters) override
    {
        BaseType::AssignSettings(ThisParameters);
    }

    ///@}
    ///@name Protected  Access
    ///@{

    ///@}
    ///@name Protected Inquiry
    ///@{

    ///@}
    ///@name Protected LifeCycle
    ///@{

    ///@}

private:
    ///@name Static Member Variables 
    ///@{

    ///@}
    ///@name Member Variables 
    ///@{

    ///@}
    ///@name Private Operators
    ///@{
    
    ///@}
    ///@name Private Operations
    ///@{

    /**
     * @brief This method computes the equivalent coounter part of the SetUpSystem when using constraints
     * @param rModelPart The model part of the problem to solve
     */
    void SetUpSystemWithConstraints(ModelPart& rModelPart)
    {
        KRATOS_TRY

        // First we set up the system of equations without constraints
        BaseSetUpSystem(rModelPart);

        // Add the computation of the global ids of the solvable dofs
        IndexType counter = 0;
        for (auto& dof : BaseType::mDofSet) {
            if (dof.EquationId() < BaseType::mEquationSystemSize) {
                auto it = BaseType::mDoFSlaveSet.find(dof);
                if (it == BaseType::mDoFSlaveSet.end()) {
                    ++counter;
                }
            }
        }

        // The total system of equations to be solved
        BaseType::mDoFToSolveSystemSize = counter;

        KRATOS_CATCH("ContactResidualBasedEliminationBuilderAndSolverWithConstraints::FormulateGlobalMasterSlaveRelations failed ..");
    }

    /**
     * @brief It organises the dofset in order to speed up the building phase (base one)
     * @param rModelPart The model part to compute
     */
    void BaseSetUpSystem(ModelPart& rModelPart)
    {
        /**
         * Idem to the not contact version, except that if we fix the displacement in one slave node we should fix the corresponding LM for consistency
         */

        // We create a set of dofs of the displacement slave dofs with LM associated
        std::unordered_map<IndexType, IndexSetType> set_nodes_with_lm_associated;
        if (rModelPart.HasSubModelPart("Contact"))
            set_nodes_with_lm_associated.reserve(rModelPart.GetSubModelPart("Contact").NumberOfNodes());
        // Allocating auxiliary parameters
        IndexType node_id;
        // We start the dof loop
        for (auto& i_dof : BaseType::mDofSet) {
            node_id = i_dof.Id();
            if (IsLMDof(i_dof))
                set_nodes_with_lm_associated.insert({node_id, IndexSetType({})});
        }

        // Auxiliary keys
        const IndexType key_lm_x = VECTOR_LAGRANGE_MULTIPLIER_X.Key();
        const IndexType key_lm_y = VECTOR_LAGRANGE_MULTIPLIER_Y.Key();
        const IndexType key_lm_z = VECTOR_LAGRANGE_MULTIPLIER_Z.Key();

        // We see which LM block
        for (auto& i_dof : BaseType::mDofSet) {
            node_id = i_dof.Id();
            auto it = set_nodes_with_lm_associated.find(node_id);
            if ( it != set_nodes_with_lm_associated.end()) {
                if (i_dof.IsFixed()) {
                    const auto& r_variable = i_dof.GetVariable();
                    auto& aux_set = (it->second);
                    if (r_variable == DISPLACEMENT_X) {
                        aux_set.insert(key_lm_x);
                    } else if (r_variable == DISPLACEMENT_Y) {
                        aux_set.insert(key_lm_y);
                    } else if (r_variable == DISPLACEMENT_Z) {
                        aux_set.insert(key_lm_z);
                    }
                }
            }
        }

        // We do now the loop over the dofs
        for (auto& i_dof : BaseType::mDofSet) {
            if (i_dof.IsFree()) {
                node_id = i_dof.Id();
                auto it = set_nodes_with_lm_associated.find(node_id);
                if (it != set_nodes_with_lm_associated.end()) {
                    auto& aux_set = it->second;
                    if (aux_set.find((i_dof.GetVariable()).Key()) != aux_set.end()) {
                        i_dof.FixDof();
                    }
                }
            }
        }

        BaseType::SetUpSystem(rModelPart);
    }

    /**
     * @brief Checks if the degree of freedom belongs to a displacement DoF
     * @param rDoF The degree of freedom
     * @return True if the DoF corresponds with a displacement dof
     */
    static inline bool IsDisplacementDof(const DofType& rDoF)
    {
        const auto& r_variable = rDoF.GetVariable();
        if (r_variable == DISPLACEMENT_X ||
            r_variable == DISPLACEMENT_Y ||
            r_variable == DISPLACEMENT_Z) {
                return true;
        }

        return false;
    }

    /**
     * @brief Checks if the degree of freedom belongs to a LM DoF
     * @param rDoF The degree of freedom
     * @return True if the DoF corresponds with a LM dof
     */
    static inline bool IsLMDof(const DofType& rDoF)
    {
        const auto& r_variable = rDoF.GetVariable();
        if (r_variable == VECTOR_LAGRANGE_MULTIPLIER_X ||
            r_variable == VECTOR_LAGRANGE_MULTIPLIER_Y ||
            r_variable == VECTOR_LAGRANGE_MULTIPLIER_Z) {
                return true;
        }

        return false;
    }

    ///@}
    ///@name Private  Access
    ///@{

    ///@}
    ///@name Private Inquiry
    ///@{

    ///@}
    ///@name Un accessible methods
    ///@{

    ///@}

}; /* Class ContactResidualBasedEliminationBuilderAndSolverWithConstraints */

///@}

///@name Type Definitions */
///@{


///@}

} /* namespace Kratos.*/