# Environment Setup Guide

This document provides instructions for setting up the necessary development environment for the DeepCAD project.

## Core Dependencies

### Python Environment

- **Conda Distribution**: The project relies on a Conda-managed Python environment.
  - **Installation Path**: `D:\ProgramData\miniconda3`

### Node.js

- **Node.js Version**: Please use the latest stable version of Node.js.
  - **Installation Path**: `C:\Program Files\nodejs`

## Kratos Multiphysics

- **Setup**: Kratos is managed locally within the project. It is not installed via pip.
- **Location**: The source code and build scripts are located in the `Kratos/` directory at the project root.
- **Build**: Before running the application, you must compile Kratos using the scripts provided in the `Kratos/` directory.

---

*This document should be kept up-to-date with any changes to the core environment dependencies.* 