# PowerShell Test Script for V4: Seepage Analysis Challenge

# Define the server endpoint for the new seepage analysis
$uri = "http://localhost:8000/api/v4/run-seepage-analysis"

# --- Part 1: Create a Virtual DXF File in Memory for the Geometry ---
# This is the same simple rectangle we used before.
$dxfFileContent = @'
0
SECTION
2
HEADER
9
$ACADVER
1
AC1027
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
1
0
LAYER
2
EXCAVATION_OUTLINE
70
0
62
7
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
0
LWPOLYLINE
5
100
100
AcDbEntity
8
EXCAVATION_OUTLINE
100
AcDbPolyline
90
4
70
1
10
0.0
20
0.0
10
50.0
20
0.0
10
50.0
20
30.0
10
0.0
20
30.0
0
ENDSEC
0
EOF
'@

# --- Part 2: Define the Full Seepage Analysis JSON Payload ---
$jsonData = @{
    project_name = "V4_Seepage_Test_Project";

    # This model requires the full geometry definition to be nested inside
    geometry_definition = @{
        project_name = "Nested_Geometry_for_Seepage";
        soil_profile = @(
            @{
                material_name = "SiltySand_Seepage";
                surface_points = @(
                    @(0, 0, 0),
                    @(50, 0, 0),
                    @(0, 30, -1),
                    @(50, 30, -1)
                );
                average_thickness = 25.0;
            }
        );
        excavation = @{
            dxf_file_content = $dxfFileContent;
            layer_name = "EXCAVATION_OUTLINE";
            excavation_depth = 10.0;
        }
    };

    # Define materials with hydraulic properties
    materials = @(
        @{
            name = "SiltySand_Seepage";
            hydraulic_conductivity_x = 1e-5; # m/s
            hydraulic_conductivity_y = 1e-5; # m/s
            hydraulic_conductivity_z = 5e-6; # m/s
        }
    );

    # Define hydraulic boundary conditions (e.g., water levels)
    boundary_conditions = @(
        @{
            boundary_name = "upstream_face";
            total_head = 20.0; # 20m water head
        },
        @{
            boundary_name = "downstream_face_and_bottom";
            total_head = 5.0; # 5m water head inside excavation
        }
    );
}

# --- Part 3: Invoke the API ---
try {
    Write-Host "Sending V4 Seepage Analysis request to $uri..."
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body ($jsonData | ConvertTo-Json -Depth 10) -ContentType "application/json"
    
    Write-Host "Request successful. Server responded:"
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "An error occurred:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $reader.BaseStream.Position = 0
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Body: $errorBody"
    }
} 