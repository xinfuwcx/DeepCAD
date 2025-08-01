//
// Author: Miquel Santasusana msantasusana@cimne.upc.edu
//

// Project includes
#include "custom_conditions/RigidEdge.h"
#include "custom_elements/spheric_particle.h"
#include "custom_utilities/GeometryFunctions.h"

namespace Kratos
{
	using namespace GeometryFunctions;
//************************************************************************************
//************************************************************************************
RigidEdge2D::RigidEdge2D( IndexType NewId,
        GeometryType::Pointer pGeometry)
    : DEMWall( NewId, pGeometry )
{
    //DO NOT ADD DOFS HERE!!!
}

//************************************************************************************
//**** life cycle ********************************************************************
//************************************************************************************
RigidEdge2D::RigidEdge2D( IndexType NewId, GeometryType::Pointer pGeometry,
        PropertiesType::Pointer pProperties
                                            )
    : DEMWall( NewId, pGeometry, pProperties )
{
}

RigidEdge2D::RigidEdge2D( IndexType NewId, GeometryType::Pointer pGeometry,
        PropertiesType::Pointer pProperties,
        Condition::Pointer Master,
        Condition::Pointer Slave,
        Point& MasterContactLocalPoint,
        Point& SlaveContactLocalPoint,
        int SlaveIntegrationPointIndex
                                            )
    : DEMWall( NewId, pGeometry, pProperties )
{

}

//********************************************************
//**** Operations ****************************************
//********************************************************


Condition::Pointer RigidEdge2D::Create( IndexType NewId,
        NodesArrayType const& ThisNodes,
        PropertiesType::Pointer pProperties) const
{
    return Condition::Pointer( new RigidEdge2D(NewId, GetGeometry().Create(ThisNodes),
                               pProperties));
}
/**
 * Destructor. Never to be called manually
 */
RigidEdge2D::~RigidEdge2D()
{
}

//************************************************************************************
//************************************************************************************
/**
* calculates only the RHS vector (certainly to be removed due to contact algorithm)
*/

void RigidEdge2D::Initialize(const ProcessInfo& rCurrentProcessInfo) {

    if (! rCurrentProcessInfo[IS_RESTARTED]){
        for (SizeType i=0;i<this->GetGeometry().size();++i){
            this->GetGeometry()[i].FastGetSolutionStepValue(NON_DIMENSIONAL_VOLUME_WEAR) = 0.0;
            this->GetGeometry()[i].FastGetSolutionStepValue(IMPACT_WEAR) = 0.0;
        }
    }
}


void RigidEdge2D::ComputeConditionRelativeData(int rigid_neighbour_index,
                                               SphericParticle* const particle,
                                               double LocalCoordSystem[3][3],
                                               double& DistPToB,
                                               array_1d<double, 4>& Weight,
                                               array_1d<double, 3>& edge_delta_disp_at_contact_point,
                                               array_1d<double, 3>& edge_velocity_at_contact_point,
                                               int& ContactType)
{
    size_t FE_size = this->GetGeometry().size();

    std::vector<double> TempWeight;
    TempWeight.resize(FE_size);

    double total_weight = 0.0;
    int points = 0;
    int inode1 = 0, inode2 = 0;

    for (unsigned int inode = 0; inode < FE_size; inode++) {

        if (Weight[inode] > 1.0e-12) {
            total_weight = total_weight + Weight[inode];
            points++;
            if (points == 1) {inode1 = inode;}
            if (points == 2) {inode2 = inode;}
        }

        if (fabs(total_weight - 1.0) < 1.0e-12) {
            break;
        }
    }

    bool contact_exists = true;
    array_1d<double, 3>& node_coordinates = particle->GetGeometry()[0].Coordinates();

    const double radius = particle->GetInteractionRadius();

    if (points == 2) {

        double eta = 0.0;
        contact_exists = GeometryFunctions::EdgeCheck(this->GetGeometry()[inode1], this->GetGeometry()[inode2], node_coordinates, radius, LocalCoordSystem, DistPToB, eta);

        Weight[inode1] = 1-eta;
        Weight[inode2] = eta;
        ContactType = 2;

    }

    else if (points == 1) {
        contact_exists = GeometryFunctions::VertexCheck(this->GetGeometry()[inode1], node_coordinates, radius, LocalCoordSystem, DistPToB);
        Weight[inode1] = 1.0;
        ContactType = 3;
    }

    if (contact_exists == false) {ContactType = -1;}

    for (std::size_t inode = 0; inode < FE_size; inode++) {
        noalias(edge_velocity_at_contact_point) += this->GetGeometry()[inode].FastGetSolutionStepValue(VELOCITY) * Weight[inode];

        array_1d<double, 3>  wall_delta_displacement = ZeroVector(3);
        this->GetDeltaDisplacement(wall_delta_displacement, inode);
        noalias(edge_delta_disp_at_contact_point) += wall_delta_displacement* Weight[inode];

    }
}//ComputeConditionRelativeData

void RigidEdge2D::CalculateNormal(array_1d<double, 3>& rnormal){

    if (GetGeometry().size()>1){
        const auto& n0 = GetGeometry()[0];
        const auto& n1 = GetGeometry()[1];

        double delta_x = n1.X() - n0.X();
        double delta_y = n1.Y() - n0.Y();

        rnormal[0] = - delta_y;
        rnormal[1] = delta_x;
        rnormal[2] = 0.0;

        rnormal /= MathUtils<double>::Norm3(rnormal);
    }
}

void RigidEdge2D::Calculate(const Variable<Vector >& rVariable, Vector& Output, const ProcessInfo& r_process_info)
{
  if (rVariable == RIGID_FACE_COMPUTE_MOVEMENT)
  {
	const unsigned int number_of_nodes = GetGeometry().size();
    unsigned int               MatSize = number_of_nodes * 3;

	if (Output.size() != MatSize)
	{
		Output.resize(MatSize, false);
	}
	Output = ZeroVector(MatSize);

	double delta_t     = r_process_info[DELTA_TIME];
	double CyclePerSec = r_process_info[RIGID_FACE_ROTA_SPEED];
	double NormalV     = r_process_info[RIGID_FACE_AXIAL_SPEED];

	double GXvel       = r_process_info[RIGID_FACE_ROTA_GLOBAL_VELOCITY][0];
	double GYvel       = r_process_info[RIGID_FACE_ROTA_GLOBAL_VELOCITY][1];
	double GZvel       = r_process_info[RIGID_FACE_ROTA_GLOBAL_VELOCITY][2];

	double Xnormal     = r_process_info[RIGID_FACE_ROTA_AXIAL_DIR][0];
	double Ynormal     = r_process_info[RIGID_FACE_ROTA_AXIAL_DIR][1];
	double Znormal     = r_process_info[RIGID_FACE_ROTA_AXIAL_DIR][2];

	double  Xorigin    = r_process_info[RIGID_FACE_ROTA_ORIGIN_COORD][0];
	double  Yorigin    = r_process_info[RIGID_FACE_ROTA_ORIGIN_COORD][1];
	double  Zorigin    = r_process_info[RIGID_FACE_ROTA_ORIGIN_COORD][2];

	///movement of the original point
	int time_step           = r_process_info[TIME_STEPS];
	double begin_time       = r_process_info[RIGID_FACE_BEGIN_TIME];
	double real_rota_time   = delta_t * time_step - begin_time;


	double n[3] = {Xnormal, Ynormal, Znormal};
	GeometryFunctions::normalize(n);

	double omiga = CyclePerSec * 2.0 * Globals::Pi;

	double vel = NormalV;

	double g_v[3] = {GXvel, GYvel, GZvel};

	Xorigin += (g_v[0] + n[0] * vel) * real_rota_time;
	Yorigin += (g_v[1] + n[1] * vel) * real_rota_time;
	Zorigin += (g_v[2] + n[2] * vel) * real_rota_time;


	double origin[3] = {Xorigin, Yorigin, Zorigin};

	double vector1[3], vector2[3];
	double dist, dist1;

	double a[3][3];
	double local_vel[3],global_vel[3];

	for(unsigned int j = 0; j < number_of_nodes; j++)
	{
		const array_1d<double, 3>& Nodecoord = this->GetGeometry()[j].Coordinates();

		vector1[0] = Nodecoord[0] - origin[0];
		vector1[1] = Nodecoord[1] - origin[1];
		vector1[2] = Nodecoord[2] - origin[2];

		dist  = fabs(GeometryFunctions::DotProduct(vector1,n));
		dist1 = GeometryFunctions::DistanceOfTwoPoint(Nodecoord,origin);

		dist = sqrt( dist1 * dist1 - dist * dist);

		if(dist < 1.0e-6)
		{
			global_vel[0] = n[0] * vel;
			global_vel[1] = n[1] * vel;
			global_vel[2] = n[2] * vel;
		}
		else
		{
			local_vel[0] = 0.0;
			local_vel[1] = dist * omiga;
			local_vel[2] = vel;

			GeometryFunctions::normalize(vector1);

			GeometryFunctions::CrossProduct(n,vector1,vector2);

			GeometryFunctions::normalize(vector2);

			GeometryFunctions::CrossProduct(vector2,n,vector1);

			GeometryFunctions::normalize(vector1);

			a[0][0] = vector1[0];
			a[0][1] = vector1[1];
			a[0][2] = vector1[2];

			a[1][0] = vector2[0];
			a[1][1] = vector2[1];
			a[1][2] = vector2[2];

			a[2][0] = n[0];
			a[2][1] = n[1];
			a[2][2] = n[2];

			GeometryFunctions::VectorLocal2Global(a,local_vel,global_vel);
		}

		Output[3 * j + 0] = (global_vel[0] + g_v[0]);
		Output[3 * j + 1] = (global_vel[1] + g_v[1]);
		Output[3 * j + 2] = (global_vel[2] + g_v[2]);
	}
  }

}

void RigidEdge2D::FinalizeSolutionStep(const ProcessInfo& r_process_info)
{


}

//***********************************************************************************
//***********************************************************************************

} // Namespace Kratos.
