# PowerShell Test Script for V3.4: The Final Challenge (Piles, Walers, Anchors, Constraints)

# Define the server endpoint
$uri = "http://localhost:8000/api/v3/run-analysis"

# Define the V3.4 JSON payload for the ultimate engineering scenario
$jsonData = @{
    width = 25.0;
    height = 12.0;
    length = 40.0;
    analysis_type = "3D_Pile_Waler_Anchor_SSI_Constraint";

    materials = @(
        @{
            name = "MediumClay";
            young_modulus = 25e6;
            poisson_ratio = 0.35;
            unit_weight = 18.5e3;
        },
        @{
            name = "C35_Concrete_Pile";
            young_modulus = 32.5e9;
            poisson_ratio = 0.2;
            unit_weight = 25e3;
        },
        @{
            name = "Q345_Steel_Waler";
            young_modulus = 206e9;
            poisson_ratio = 0.3;
            unit_weight = 78.5e3;
        }
    );
    
    soil_layers = @(
        @{
            thickness = 25.0;
            material_name = "MediumClay";
        }
    );

    retaining_system = @{
        pile_diameter = 0.8;
        pile_spacing = 1.2;
        pile_depth = 20.0;
        material_name = "C35_Concrete_Pile";
    };

    waler_beams = @(
        @{
            level = -4.0;
            profile_height = 0.5;
            profile_width = 0.5;
            material_name = "Q345_Steel_Waler";
        },
        @{
            level = -9.0;
            profile_height = 0.5;
            profile_width = 0.5;
            material_name = "Q345_Steel_Waler";
        }
    );

    anchors = @(
        @{
            level = -4.0; # Must match a waler beam level
            length = 22.0;
            angle = 15.0;
            prestress_force = 750e3; # 750 kN
        },
        @{
            level = -9.0; # Must match a waler beam level
            length = 20.0;
            angle = 15.0;
            prestress_force = 850e3; # 850 kN
        }
    );
} | ConvertTo-Json -Depth 10

# Display the request body
Write-Host "--- Sending V3.4 Final Challenge Model to Server ---"
Write-Host $jsonData

# Send the POST request
try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $jsonData -ContentType "application/json"
    Write-Host "`n--- Received Response from Server ---"
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