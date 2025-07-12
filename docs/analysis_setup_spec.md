# DeepCAD - MVP CAE Analysis Specification (v0.8)

This document outlines the Minimum Viable Product (MVP) specification for the Computational Aided Engineering (CAE) analysis module within DeepCAD. It defines the core set of loads, boundaries, elements, and analysis types required for typical deep excavation and tunneling projects.

## 1. Loads (荷载)

| ID | Type | Description | Key Parameters |
|:---|:---|:---|:---|
| L1 | `gravity` | Global self-weight of the model. | `g` (e.g., 9.81), `direction` (e.g., `[0, -1, 0]`) |
| L2 | `surface_uniform` | Uniformly distributed load on a surface. | `q` (pressure, e.g., kPa), `area_id` |
| L3 | `hydrostatic` | Hydrostatic pressure from groundwater. | `water_density` (e.g., 1000), `water_level` (elevation) |
| L4 | `prestress` | Pre-tensioning force or displacement for anchors/cables. | `element_set`, `mode` (`'force'` or `'displacement'`), `value` |

## 2. Constraints & Boundaries (约束与边界)

| ID | Type | Description | Key Parameters |
|:---|:---|:---|:---|
| B1 | `fixed` | Fully constrained boundary (Ux=Uy=Uz=0). | `faces` or `nodes` |
| B2 | `roller` | Roller support, allowing movement parallel to the surface. | `faces` or `nodes`, `normal_direction` |
| B3 | `water_head` | Prescribed water head for seepage analysis. | `head_value`, `faces` or `nodes` |
| B4 | `contact` | Defines contact interaction between surfaces (e.g., soil-structure). | `master_surface`, `slave_surface`, `friction_angle`, `cohesion`, `gap_init`, `method` (`'penalty'`, `'mortar_alm'`, etc.) |
| B5 | `linear_mpc` | Linear Multi-Point Constraint for rigid connections. | `master_node(s)`, `slave_node(s)`, `dofs` (e.g., `['UX', 'UY']`), `ratio` |
| B6 | `nonlinear_mpc` | Non-linear MPC for specialized connections (e.g., tension-only). | `form` (`'tension_only'`, `'compression_only'`, `'gap'`), `master_node(s)`, `slave_node(s)`, `stiffness`, `gap_value` |

## 3. Element Types (单元类型)

| ID | Type | Description | Notes |
|:---|:---|:---|:---|
| E1 | `Hex8_SRI` | 8-node hexahedral solid element with Selective Reduced Integration. | For soil, concrete volumes. Avoids locking. |
| E2 | `Shell` | Thick shell element (Mindlin/Reissner). | For retaining walls, linings. |
| E3 | `Beam` | 3D Timoshenko beam element. | For struts, walers, piles. |
| E4 | `Truss` | 3D truss/bar element (axial force only). | For anchors, tie rods. |
| E5 | `Interface` | Zero-thickness interface element for contact surfaces. | Corresponds to `contact` boundary (B4). |
| E6 | `Infinite` | Infinite element for absorbing far-field boundaries. | Reduces model size for semi-infinite domains. |

## 4. Analysis Types (计算类型)

| ID | Type | Description |
|:---|:---|:---|
| A0 | `geostatic` | Initial in-situ stress balancing step. Calculates stresses due to gravity and K0 conditions. |
| A1 | `static_construction` | Staged static analysis simulating construction steps (e.g., excavation, support installation). |
| A2 | `seepage_steady` | Steady-state seepage analysis to determine groundwater flow and pore pressure (optional). |

## 5. Data Structure Example (JSON Snippet)

This example illustrates how a user's setup might be represented.

```jsonc
{
  "analysis_settings": {
    "sequence": [
      { "step_name": "initial_stress", "type": "geostatic", "params": { "k0": 0.5 } },
      { "step_name": "excavation_1", "type": "static_construction", "actions": { "deactivate_elements": ["soil_layer_1"] } },
      { "step_name": "install_anchors", "type": "static_construction", "actions": {
          "activate_elements": ["anchors_row1"],
          "apply_loads": ["prestress_row1"],
          "activate_constraints": ["mpc_anchor_waler_1"]
      }}
    ]
  },
  "loads": [
    { "id": "prestress_row1", "type": "prestress", "element_set": "anchors_row1", "mode": "force", "value": 200 }
  ],
  "boundaries": [
    {
      "id": "mpc_anchor_waler_1",
      "type": "nonlinear_mpc",
      "form": "tension_only",
      "master_nodes": "waler_beam_nodes_1",
      "slave_nodes": "anchor_head_nodes_1",
      "stiffness": 1e6
    }
  ],
  "elements": {
    "soil":  { "element_type": "Hex8_SRI",   "material": "clay" },
    "wall":  { "element_type": "Shell",      "material": "c30_concrete" },
    "waler": { "element_type": "Beam",       "material": "q345_steel" },
    "anchor":{ "element_type": "Truss",      "material": "grout_bar_mat" }
  }
}
``` 