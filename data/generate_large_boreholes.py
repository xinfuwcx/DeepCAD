import csv
import random
import os

# Define soil layer parameters (soil_type, density, cohesion, friction)
soil_layers = [
    ("fill",   2000, 5,  35),
    ("clay",   1800, 25, 25),
    ("silt",   1700, 15, 30),
    ("sand",   1600, 5,  35),
    ("gravel", 1900, 10, 40)
]

# Domain for borehole distribution (within pit boundary)
x_min, x_max = 0, 300
y_min, y_max = 0, 300
n_boreholes = 100

# Prepare records
records = []
for borehole_id in range(1, n_boreholes + 1):
    x = round(random.uniform(x_min, x_max), 2)
    y = round(random.uniform(y_min, y_max), 2)
    # Slight undulation for first top elevation
    current_top = round(random.uniform(0, 2), 2)
    for layer_index, (soil_type, density, cohesion, friction) in enumerate(soil_layers, start=1):
        # Base thickness ~10m, random variation ±2m
        base_thickness = 10.0
        thickness = round(random.uniform(base_thickness - 2, base_thickness + 2), 2)
        bottom = round(current_top - thickness, 2)
        records.append({
            "id": borehole_id,
            "x": x,
            "y": y,
            "layer_index": layer_index,
            "top_elev": current_top,
            "bottom_elev": bottom,
            "soil_type": soil_type,
            "density": density,
            "cohesion": cohesion,
            "friction": friction
        })
        current_top = bottom

# Write to CSV
output_file = os.path.join(os.path.dirname(__file__), 'sample_boreholes_large.csv')
with open(output_file, 'w', newline='', encoding='utf-8-sig') as csvfile:
    fieldnames = ["id", "x", "y", "layer_index", "top_elev", "bottom_elev", "soil_type", "density", "cohesion", "friction"]
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()
    for rec in records:
        writer.writerow(rec)

print(f"Generated {len(records)} rows for {n_boreholes} boreholes in '{output_file}'") 