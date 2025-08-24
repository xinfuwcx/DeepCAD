#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Basic CAE tests for Example6
"""

from __future__ import annotations

from example6_service import Example6Service


def test_validation():
    svc = Example6Service()
    res = svc.validate_cae_setup()
    print("Env:", res)


def test_basic():
    svc = Example6Service()
    case = {
        "geometry": {"pier_diameter": 2.0, "domain_size": [20, 10]},
        "boundary_conditions": {"inlet_velocity": 2.5},
        "sediment": {"d50": 0.5, "density": 2650},
        "simulation_time": 1800,
        "mesh_resolution": "medium",
    }
    res = svc.cae_simulate(case)
    print("CAE:", res)


if __name__ == "__main__":
    test_validation()
    test_basic()
