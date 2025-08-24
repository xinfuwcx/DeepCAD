#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
example6_cli_cae

Lightweight CLI for CAE actions:
- validate: print environment readiness
- simulate: run a CAE case from a JSON file
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import argparse

from .example6_service import Example6Service


def main(argv: Optional[list[str]] = None) -> int:
	parser = argparse.ArgumentParser(prog="example6-cae", description="CAE helper commands")
	sub = parser.add_subparsers(dest="cmd", required=True)

	p_val = sub.add_parser("validate", help="Check CAE environment")

	p_sim = sub.add_parser("simulate", help="Run CAE simulation from JSON case")
	p_sim.add_argument("json", type=str, help="Path to JSON case file")

	args = parser.parse_args(argv)
	svc = Example6Service()

	if args.cmd == "validate":
		info = svc.cae_validate()
		print(json.dumps(info, ensure_ascii=False, indent=2))
		return 0

	if args.cmd == "simulate":
		data = json.loads(Path(args.json).read_text(encoding="utf-8"))
		# Support single object or array of cases
		if isinstance(data, list):
			results = [svc.cae_simulate(item) for item in data]
			out = {"batch": True, "count": len(results), "results": results}
			print(json.dumps(out, ensure_ascii=False, indent=2))
		else:
			res = svc.cae_simulate(data)
			print(json.dumps(res, ensure_ascii=False, indent=2))
		return 0

	return 1


if __name__ == "__main__":
	raise SystemExit(main())

