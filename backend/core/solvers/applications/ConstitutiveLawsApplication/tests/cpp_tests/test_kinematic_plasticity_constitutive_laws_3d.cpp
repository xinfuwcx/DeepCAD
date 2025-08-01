// KRATOS ___                _   _ _         _   _             __                       _
//       / __\___  _ __  ___| |_(_) |_ _   _| |_(_)_   _____  / /  __ ___      _____   /_\  _ __  _ __
//      / /  / _ \| '_ \/ __| __| | __| | | | __| \ \ / / _ \/ /  / _` \ \ /\ / / __| //_\\| '_ \| '_  |
//     / /__| (_) | | | \__ \ |_| | |_| |_| | |_| |\ V /  __/ /__| (_| |\ V  V /\__ \/  _  \ |_) | |_) |
//     \____/\___/|_| |_|___/\__|_|\__|\__,_|\__|_| \_/ \___\____/\__,_| \_/\_/ |___/\_/ \_/ .__/| .__/
//                                                                                         |_|   |_|
//
//  License:         BSD License
//                     license: structural_mechanics_application/license.txt
//
//  Main authors:    Alejandro Cornejo
//

// System includes

// External includes

// Project includes
#include "includes/process_info.h"
#include "containers/model.h"

// Application includes
#include "constitutive_laws_application_variables.h"
#include "tests/cpp_tests/constitutive_laws_fast_suite.h"

// Integrator
#include "custom_constitutive/auxiliary_files/cl_integrators/generic_cl_integrator_kinematic_plasticity.h"

// Yield surfaces
#include "custom_constitutive/auxiliary_files/yield_surfaces/generic_yield_surface.h"
#include "custom_constitutive/auxiliary_files/yield_surfaces/von_mises_yield_surface.h"

// Plastic potentials
#include "custom_constitutive/auxiliary_files/plastic_potentials/generic_plastic_potential.h"
#include "custom_constitutive/auxiliary_files/plastic_potentials/von_mises_plastic_potential.h"

// Constitutive law
#include "custom_constitutive/finite_strains/hyperelasticity/hyper_elastic_isotropic_kirchhoff_3d.h"
#include "custom_constitutive/small_strains/plasticity/generic_small_strain_kinematic_plasticity.h"
#include "custom_constitutive/finite_strains/plasticity/generic_finite_strain_kinematic_plasticity.h"
#include "includes/model_part.h"
#include "geometries/tetrahedra_3d_4.h"

namespace Kratos::Testing
{

/**
* Check the correct calculation of the integrated stress with the CL's in small strain
*/

KRATOS_TEST_CASE_IN_SUITE(ConstitutiveLawIntegrateStressPlasticitySmallStrainKinematicInternalVariables, KratosConstitutiveLawsFastSuite)
{
    //
    // Test: check correct behavior of internal and calculated variables
    //

    typedef GenericSmallStrainKinematicPlasticity <GenericConstitutiveLawIntegratorKinematicPlasticity<VonMisesYieldSurface<VonMisesPlasticPotential<6>>>> VM;

    Model current_model;
    ModelPart& r_test_model_part = current_model.CreateModelPart("Main");
    VM cl = VM();

    KRATOS_EXPECT_FALSE(cl.Has(UNIAXIAL_STRESS));  // = False, in order to use CalculateValue())
    KRATOS_EXPECT_FALSE(cl.Has(EQUIVALENT_PLASTIC_STRAIN));  // = False, in order to use CalculateValue())
    KRATOS_EXPECT_FALSE(cl.Has(BACK_STRESS_VECTOR));  // = False, in order to use CalculateValue())
    KRATOS_EXPECT_FALSE(cl.Has(BACK_STRESS_TENSOR));  // = False, in order to use CalculateValue())
    KRATOS_EXPECT_TRUE(cl.Has(PLASTIC_DISSIPATION));  // = True
    KRATOS_EXPECT_TRUE(cl.Has(PLASTIC_STRAIN_VECTOR));  // = True
    KRATOS_EXPECT_TRUE(cl.Has(PLASTIC_STRAIN_TENSOR));  // = True
    KRATOS_EXPECT_TRUE(cl.Has(INTERNAL_VARIABLES));  // = True

    // Here we assume VoigtSize=6
    Vector internal_variables_w(7);
    internal_variables_w[0] = 0.0;
    internal_variables_w[1] = 0.1;
    internal_variables_w[2] = 0.2;
    internal_variables_w[3] = 0.3;
    internal_variables_w[4] = 0.4;
    internal_variables_w[5] = 0.5;
    internal_variables_w[6] = 0.6;
    cl.SetValue(INTERNAL_VARIABLES, internal_variables_w, r_test_model_part.GetProcessInfo());
    Vector internal_variables_r;  // CL should internally resize it to 6
    cl.GetValue(INTERNAL_VARIABLES, internal_variables_r);

    KRATOS_EXPECT_NEAR(internal_variables_r.size(), 7., 1.e-5);  // = True
    KRATOS_EXPECT_NEAR(internal_variables_r[0], 0.0, 1.e-5);  // = True
    KRATOS_EXPECT_NEAR(internal_variables_r[1], 0.1, 1.e-5);  // = True
    KRATOS_EXPECT_NEAR(internal_variables_r[2], 0.2, 1.e-5);  // = True
    KRATOS_EXPECT_NEAR(internal_variables_r[3], 0.3, 1.e-5);  // = True
    KRATOS_EXPECT_NEAR(internal_variables_r[4], 0.4, 1.e-5);  // = True
    KRATOS_EXPECT_NEAR(internal_variables_r[5], 0.5, 1.e-5);  // = True
    KRATOS_EXPECT_NEAR(internal_variables_r[6], 0.6, 1.e-5);  // = True
}

KRATOS_TEST_CASE_IN_SUITE(ConstitutiveLawIntegrateStressPlasticitySmallStrainKinematic, KratosConstitutiveLawsFastSuite)
{
    typedef GenericSmallStrainKinematicPlasticity <GenericConstitutiveLawIntegratorKinematicPlasticity<VonMisesYieldSurface<VonMisesPlasticPotential<6>>>> VM;

    ConstitutiveLaw::Parameters cl_parameters;
    Properties material_properties;
    Vector stress_vector, strain_vector;

    Model current_model;
    ModelPart& r_test_model_part = current_model.CreateModelPart("Main");

    Node::Pointer p_node_1 = r_test_model_part.CreateNewNode(1, 0.0, 0.0, 0.0);
    Node::Pointer p_node_2 = r_test_model_part.CreateNewNode(2, 1.0, 0.0, 0.0);
    Node::Pointer p_node_3 = r_test_model_part.CreateNewNode(3, 0.0, 1.0, 0.0);
    Node::Pointer p_node_4 = r_test_model_part.CreateNewNode(4, 0.0, 0.0, 1.0);

    Tetrahedra3D4<Node> Geom = Tetrahedra3D4<Node>(p_node_1, p_node_2, p_node_3, p_node_4);

    stress_vector = ZeroVector(6);
    strain_vector = ZeroVector(6);
    strain_vector[0] = 0.0;
    strain_vector[1] = 0.0;
    strain_vector[2] = -1.1e-04;
    strain_vector[3] = 0.0;
    strain_vector[4] = 0.0;
    strain_vector[5] = 0.0;

    material_properties.SetValue(YOUNG_MODULUS, 206900000000.0);
    material_properties.SetValue(POISSON_RATIO, 0.29);
    material_properties.SetValue(YIELD_STRESS, 1.5e6);
    material_properties.SetValue(FRICTION_ANGLE, 32.0);
    material_properties.SetValue(DILATANCY_ANGLE, 16.0);
    material_properties.SetValue(SOFTENING_TYPE, 1);
    material_properties.SetValue(FRACTURE_ENERGY, 1.5e2);
    material_properties.SetValue(HARDENING_CURVE, 3);
    material_properties.SetValue(KINEMATIC_HARDENING_TYPE, 1);
    Vector kin_hard_parameters = ZeroVector(3);
    kin_hard_parameters[0] = 15.0e9;
    material_properties.SetValue(KINEMATIC_PLASTICITY_PARAMETERS, kin_hard_parameters);

    // Set constitutive law flags:
    Flags& r_constitutive_law_options=cl_parameters.GetOptions();
    r_constitutive_law_options.Set(ConstitutiveLaw::USE_ELEMENT_PROVIDED_STRAIN, true);
    r_constitutive_law_options.Set(ConstitutiveLaw::COMPUTE_STRESS, true);
    r_constitutive_law_options.Set(ConstitutiveLaw::COMPUTE_CONSTITUTIVE_TENSOR, false);

    cl_parameters.SetElementGeometry(Geom);
    cl_parameters.SetProcessInfo(r_test_model_part.GetProcessInfo());
    cl_parameters.SetMaterialProperties(material_properties);
    cl_parameters.SetStrainVector(strain_vector);
    cl_parameters.SetStressVector(stress_vector);
    Matrix const_matrix;
    cl_parameters.SetConstitutiveMatrix(const_matrix);

    // Create the CL
    VM VonMisesCL = VM();
    std::vector<double> VMres = {-1.72469e+07,-1.72469e+07,-1.96943e+07,0,0,0};

    double plastic_dissipation;
    Vector TestVM(6);

    VonMisesCL.CalculateMaterialResponseCauchy(cl_parameters);
    VonMisesCL.FinalizeMaterialResponseCauchy(cl_parameters);
    TestVM = cl_parameters.GetStressVector();
    VonMisesCL.GetValue(PLASTIC_DISSIPATION, plastic_dissipation);
    KRATOS_WARNING_IF("TestPlasticity", plastic_dissipation < 1.0e-12) << "VonMises:: This test is not in plastic range" << std::endl;


    // Check the results
    const double tolerance = 1.0e-4;
    KRATOS_EXPECT_VECTOR_RELATIVE_NEAR(VMres, TestVM, tolerance);
}

/**
* Check the correct calculation of the integrated stress with the CL's in finite strain
*/
KRATOS_TEST_CASE_IN_SUITE(ConstitutiveLawIntegrateStressPlasticityFiniteStrainKinematic, KratosConstitutiveLawsFastSuite)
{
    typedef GenericFiniteStrainKinematicPlasticity<GenericConstitutiveLawIntegratorKinematicPlasticity<VonMisesYieldSurface<VonMisesPlasticPotential<6>>>> VM;

    ConstitutiveLaw::Parameters cl_parameters;
    Properties material_properties;
    Vector stress_vector, strain_vector;

    Model current_model;
    ModelPart& r_test_model_part = current_model.CreateModelPart("Main");

    Node::Pointer p_node_1 = r_test_model_part.CreateNewNode(1, 0.0, 0.0, 0.0);
    Node::Pointer p_node_2 = r_test_model_part.CreateNewNode(2, 1.0, 0.0, 0.0);
    Node::Pointer p_node_3 = r_test_model_part.CreateNewNode(3, 0.0, 1.0, 0.0);
    Node::Pointer p_node_4 = r_test_model_part.CreateNewNode(4, 0.0, 0.0, 1.0);

    Tetrahedra3D4<Node> Geom = Tetrahedra3D4<Node>(p_node_1, p_node_2, p_node_3, p_node_4);

    stress_vector = ZeroVector(6);
    strain_vector = ZeroVector(6);
    strain_vector[0] = 0.0;
    strain_vector[1] = 0.0;
    strain_vector[2] = -1.1e-04;
    strain_vector[3] = 0.0;
    strain_vector[4] = 0.0;
    strain_vector[5] = 0.0;
    Matrix deformation_gradient = ZeroMatrix(3, 3);
    deformation_gradient(0,0) = 1.0;
    deformation_gradient(1,1) = 1.0;
    deformation_gradient(2,2) = (1.0 -1.1e-04);

    material_properties.SetValue(YOUNG_MODULUS, 206900000000.0);
    material_properties.SetValue(POISSON_RATIO, 0.29);
    material_properties.SetValue(YIELD_STRESS, 1.5e6);
    material_properties.SetValue(FRICTION_ANGLE, 32.0);
    material_properties.SetValue(DILATANCY_ANGLE, 16.0);
    material_properties.SetValue(SOFTENING_TYPE, 1);
    material_properties.SetValue(FRACTURE_ENERGY, 1.5e2);
    material_properties.SetValue(HARDENING_CURVE, 3);
    material_properties.SetValue(KINEMATIC_HARDENING_TYPE, 1);
    Vector kin_hard_parameters = ZeroVector(3);
    kin_hard_parameters[0] = 15.0e9;
    material_properties.SetValue(KINEMATIC_PLASTICITY_PARAMETERS, kin_hard_parameters);

    // Set constitutive law flags:
    Flags& r_constitutive_law_options=cl_parameters.GetOptions();
    r_constitutive_law_options.Set(ConstitutiveLaw::USE_ELEMENT_PROVIDED_STRAIN, false);
    r_constitutive_law_options.Set(ConstitutiveLaw::COMPUTE_STRESS, true);
    r_constitutive_law_options.Set(ConstitutiveLaw::COMPUTE_CONSTITUTIVE_TENSOR, false);

    cl_parameters.SetElementGeometry(Geom);
    cl_parameters.SetProcessInfo(r_test_model_part.GetProcessInfo());
    cl_parameters.SetMaterialProperties(material_properties);
    cl_parameters.SetStrainVector(strain_vector);
    cl_parameters.SetStressVector(stress_vector);
    cl_parameters.SetDeformationGradientF(deformation_gradient);
    cl_parameters.SetDeterminantF(MathUtils<double>::Det(deformation_gradient));
    Matrix const_matrix = ZeroMatrix(6, 6);
    cl_parameters.SetConstitutiveMatrix(const_matrix);

    // Create the CL
    VM VonMisesCL = VM();
    std::vector<double> VMres = {-1.72477e+07,-1.72477e+07,-1.96951e+07,0,0,0};

    double plastic_dissipation;
    Vector TestVM(6);

    VonMisesCL.CalculateMaterialResponsePK2(cl_parameters);
    VonMisesCL.FinalizeMaterialResponsePK2(cl_parameters);
    TestVM = cl_parameters.GetStressVector();
    VonMisesCL.GetValue(PLASTIC_DISSIPATION, plastic_dissipation);
    KRATOS_WARNING_IF("TestPlasticity", plastic_dissipation < 1.0e-12) << "VonMises:: This test is not in plastic range" << std::endl;


    // Check the results
    const double tolerance = 0.1e6;
    KRATOS_EXPECT_VECTOR_NEAR(VMres, TestVM, tolerance);
}

} // namespace Kratos::Testing
