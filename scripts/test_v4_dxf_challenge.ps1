# PowerShell Test Script for V4: DXF Import and Undulating Layers Challenge

# Define the server endpoint
$uri = "http://localhost:8000/api/v4/run-analysis"

# --- Part 1: Create a Virtual DXF File in Memory ---
# This string represents a simple DXF file containing a
# single closed rectangle (LWPOLYLINE) on the layer "EXCAVATION_OUTLINE".
$dxfFileContent = @"
0
SECTION
2
HEADER
9
$ACADVER
1
AC1027
9
$LWDISPLAY
290
1
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
"@

# --- Part 2: Define the V4 JSON Payload ---
$jsonData = @{
    project_name = "V4_DXF_Test_Project";
    
    soil_profile = @(
        @{
            material_name = "SiltyClay_Undulating";
            # Define a surface that slopes from Z=0 at one end to Z=-2 at the other
            surface_points = @(
                @(0, 0, 0), @(50, 0, 0),
                @(0, 30, -2), @(50, 30, -2)
            );
            average_thickness = 20.0;
        }
    );
    
    excavation = @{
        # Pass the virtual DXF content to the API
        dxf_file_content = $dxfFileContent; 
        layer_name = "EXCAVATION_OUTLINE";
        excavation_depth = 15.0;
    };

} | ConvertTo-Json -Depth 10

# --- Part 3: Send the request to the V4 API ---
Write-Host "--- Sending V4 DXF Challenge Model to Server ---"
Write-Host $jsonData

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $jsonData -ContentType "application/json"
    Write-Host "`n--- Received Response from V4 Server ---"
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "`n--- An error occurred ---"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $result = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($result)
        $reader.BaseStream.Position = 0
        $errorBody = $reader.ReadToEnd();
        Write-Host "Error Body: $errorBody"
    }
} 