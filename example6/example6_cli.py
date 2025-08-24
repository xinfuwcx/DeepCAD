#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
example6_cli

Top-level CLI:
- solve: quick empirical/numerical/hybrid
- cae ...: delegates to CAE CLI
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Optional

from .example6_service import Example6Service
from .example6_cli_cae import main as cae_main


def main(argv: Optional[list[str]] = None) -> int:
	parser = argparse.ArgumentParser(prog="example6", description="Example6 CLI")
	sub = parser.add_subparsers(dest="cmd", required=True)

	p_solve = sub.add_parser("solve", help="Run a quick solve")
	p_solve.add_argument("json", type=str, help="Path to JSON input params")
	p_solve.add_argument("--solver", choices=["auto", "empirical", "numerical", "hybrid"], default="auto")

	p_cae = sub.add_parser("cae", help="CAE subcommands; use: example6 cae [validate|simulate]")
	p_cae.add_argument("rest", nargs=argparse.REMAINDER, help="Pass-through to CAE CLI")

	args = parser.parse_args(argv)

	if args.cmd == "solve":
		svc = Example6Service()
		data = json.loads(Path(args.json).read_text(encoding="utf-8"))
		res = svc.quick_solve(data, solver=args.solver)
		print(json.dumps(res, ensure_ascii=False, indent=2))
		return 0

	if args.cmd == "cae":
		return cae_main(args.rest)

	return 1


if __name__ == "__main__":
	raise SystemExit(main())

