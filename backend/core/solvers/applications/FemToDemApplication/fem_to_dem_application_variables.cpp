//    |  /           |
//    ' /   __| _` | __|  _ \   __|
//    . \  |   (   | |   (   |\__ \.
//   _|\_\_|  \__,_|\__|\___/ ____/
//                   Multi-Physics FemDem Application
//
//  License:         BSD License
//                     Kratos default license: kratos/license.txt
//
//  Main authors:    Alejandro Cornejo Velazquez
//

#include "fem_to_dem_application_variables.h"

namespace Kratos
{
    // Mixing & plasticity
    KRATOS_CREATE_VARIABLE(double, HARDENING_MODULUS)

    // DEM substepping
    KRATOS_CREATE_3D_VARIABLE_WITH_COMPONENTS(BACKUP_LAST_STRUCTURAL_VELOCITY)
    KRATOS_CREATE_3D_VARIABLE_WITH_COMPONENTS(BACKUP_LAST_STRUCTURAL_DISPLACEMENT)
    KRATOS_CREATE_3D_VARIABLE_WITH_COMPONENTS(SMOOTHED_STRUCTURAL_VELOCITY)

    // Aitken
    KRATOS_CREATE_3D_VARIABLE_WITH_COMPONENTS(OLD_RELAXED_VELOCITY)
    KRATOS_CREATE_3D_VARIABLE_WITH_COMPONENTS(RELAXED_VELOCITY)
    KRATOS_CREATE_3D_VARIABLE_WITH_COMPONENTS(FSI_INTERFACE_RESIDUAL)
    KRATOS_CREATE_3D_VARIABLE_WITH_COMPONENTS(FORCE_LOAD)

    KRATOS_CREATE_3D_VARIABLE_WITH_COMPONENTS(ACCELERATION_BACKUP)
    KRATOS_CREATE_3D_VARIABLE_WITH_COMPONENTS(DISPLACEMENT_BACKUP)
    KRATOS_CREATE_VARIABLE(double, PRESSURE_VOLUME)
    KRATOS_CREATE_VARIABLE(double, PRESSURE_INITIAL_VOLUME)
    KRATOS_CREATE_VARIABLE(SphericParticle*, DEM_PARTICLE_POINTER)
    KRATOS_CREATE_VARIABLE(bool, VOLUME_COUNTED)
    KRATOS_CREATE_VARIABLE(bool, FRAGILE)
    KRATOS_CREATE_VARIABLE(double, DAMAGE_ELEMENT)
    KRATOS_CREATE_VARIABLE(double, ERASED_VOLUME)
    KRATOS_CREATE_VARIABLE(double, TIME_UNIT_CONVERTER)
    KRATOS_CREATE_VARIABLE(Vector, FEMDEM_STRESS_VECTOR)
    KRATOS_CREATE_VARIABLE(Vector, DISPLACEMENT_INCREMENT)
    KRATOS_CREATE_VARIABLE(double, YIELD_STRESS_C)
    KRATOS_CREATE_VARIABLE(double, YIELD_STRESS_T)
    KRATOS_CREATE_VARIABLE(int, INTERNAL_PRESSURE_ITERATION)
    KRATOS_CREATE_VARIABLE(int, PFEM_PRESSURE_ITERATION)
    KRATOS_CREATE_VARIABLE(double, FRAC_ENERGY_T)
    KRATOS_CREATE_VARIABLE(double, FRAC_ENERGY_C)
    KRATOS_CREATE_VARIABLE(Vector, STRESS_VECTOR_INTEGRATED)
    KRATOS_CREATE_VARIABLE(Vector, SMOOTHED_STRESS_VECTOR)
    KRATOS_CREATE_VARIABLE(std::string,YIELD_SURFACE)
    KRATOS_CREATE_VARIABLE(Vector, FEMDEM_STRAIN_VECTOR)
    KRATOS_CREATE_VARIABLE(int, TANGENT_CONSTITUTIVE_TENSOR)
    KRATOS_CREATE_VARIABLE(bool, SMOOTHING)
    KRATOS_CREATE_VARIABLE(bool, SMOOTHING_OF_STRESSES)
    KRATOS_CREATE_VARIABLE(double, MAX_DAMAGE_ERASE)
    KRATOS_CREATE_VARIABLE(bool, DEMFEM_CONTACT)
    KRATOS_CREATE_VARIABLE(double, IS_DAMAGED)
    KRATOS_CREATE_VARIABLE(double, NODAL_DAMAGE)
    KRATOS_CREATE_VARIABLE(int, RECONSTRUCT_PRESSURE_LOAD)
    KRATOS_CREATE_VARIABLE(int, IS_DYNAMIC)
    KRATOS_CREATE_VARIABLE(double, STRESS_THRESHOLD)
    KRATOS_CREATE_VARIABLE(double, INITIAL_THRESHOLD)
    KRATOS_CREATE_VARIABLE(int, INTEGRATION_COEFFICIENT)
    KRATOS_CREATE_VARIABLE(std::string, MAPPING_PROCEDURE)
    KRATOS_CREATE_VARIABLE(bool, GENERATE_DEM)
    KRATOS_CREATE_VARIABLE(bool, RECOMPUTE_NEIGHBOURS)
    KRATOS_CREATE_VARIABLE(bool, IS_DEM)
    KRATOS_CREATE_VARIABLE(bool, IS_SKIN)
    KRATOS_CREATE_VARIABLE(bool, PRESSURE_EXPANDED)
    KRATOS_CREATE_VARIABLE(double, DEM_RADIUS)
    KRATOS_CREATE_VARIABLE(bool, DEM_GENERATED)
    KRATOS_CREATE_VARIABLE(bool, INACTIVE_NODE)
    KRATOS_CREATE_VARIABLE(int, NUMBER_OF_ACTIVE_ELEMENTS)
    KRATOS_CREATE_VARIABLE(bool, NODAL_FORCE_APPLIED)
    KRATOS_CREATE_VARIABLE(double, NODAL_FORCE_X)
    KRATOS_CREATE_VARIABLE(double, NODAL_FORCE_Y)
    KRATOS_CREATE_VARIABLE(double, NODAL_FORCE_Z)
    KRATOS_CREATE_VARIABLE(Vector, NODAL_STRESS_VECTOR)
    KRATOS_CREATE_VARIABLE(double, EQUIVALENT_NODAL_STRESS)
    KRATOS_CREATE_VARIABLE(double, COHESION_MC)
    KRATOS_CREATE_3D_VARIABLE_WITH_COMPONENTS(EQUIVALENT_NODAL_STRESS_GRADIENT)
    KRATOS_CREATE_3D_VARIABLE_WITH_COMPONENTS(AUXILIAR_GRADIENT)
    KRATOS_CREATE_VARIABLE(Matrix, STRAIN_TENSOR);
    KRATOS_CREATE_VARIABLE(Matrix, STRESS_TENSOR);
    KRATOS_CREATE_VARIABLE(Matrix, STRESS_TENSOR_INTEGRATED);
    
    // Composite
    KRATOS_CREATE_VARIABLE(Matrix, MATRIX_STRESS_TENSOR);
    KRATOS_CREATE_VARIABLE(Matrix, FIBER_STRESS_TENSOR);
    // KRATOS_CREATE_VARIABLE(Vector, PLASTIC_STRAIN_VECTOR);
    KRATOS_CREATE_VARIABLE(Vector, MATRIX_STRESS_VECTOR);
    KRATOS_CREATE_VARIABLE(Vector, FIBER_STRESS_VECTOR);
    KRATOS_CREATE_VARIABLE(double,YOUNG_MODULUS_FIBER);
    KRATOS_CREATE_VARIABLE(double,DENSITY_FIBER);
    KRATOS_CREATE_VARIABLE(double,POISSON_RATIO_FIBER);
    KRATOS_CREATE_VARIABLE(double,FIBER_VOLUMETRIC_PART);
    KRATOS_CREATE_VARIABLE(double,PLASTIC_UNIAXIAL_STRESS);
    KRATOS_CREATE_VARIABLE(double,MAX_PLASTIC_STRAIN);
    KRATOS_CREATE_VARIABLE(Matrix,MATRIX_STRESS_TENSOR_INTEGRATED);
    
    KRATOS_CREATE_VARIABLE(double,YIELD_STRESS_C_FIBER);
    KRATOS_CREATE_VARIABLE(double,YIELD_STRESS_T_FIBER);
    KRATOS_CREATE_VARIABLE(double,FRACTURE_ENERGY_FIBER);
    KRATOS_CREATE_VARIABLE(double,ACUMULATED_PLASTIC_STRAIN);
    KRATOS_CREATE_VARIABLE(double,EQUIVALENT_STRESS_VM);
    KRATOS_CREATE_VARIABLE(int,HARDENING_LAW);
    KRATOS_CREATE_VARIABLE(bool, IS_TAKEN)
    KRATOS_CREATE_VARIABLE(int, PRESSURE_ID)
}
