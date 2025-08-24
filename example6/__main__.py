#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Module entry point for the example6 package.

Allows launching via `python -m example6`.
"""

import sys

from .example6 import main


if __name__ == "__main__":
    sys.exit(main() or 0)
