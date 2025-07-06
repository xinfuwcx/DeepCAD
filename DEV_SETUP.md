# Deep Excavation - Development Environment Setup

This document provides clear, step-by-step instructions to set up and run the development environment for the Deep Excavation project. Its purpose is to ensure a consistent and reliable setup process.

## 1. Prerequisites

Before you begin, ensure you have the following installed:

- **Git**: For version control.
- **Node.js**: LTS version (e.g., 18.x or later) for the frontend.
- **Python**: Version 3.8 or later for the backend.
- **C++ Compiler**: A full C++ compiler toolchain (e.g., Visual Studio on Windows, GCC on Linux) is required for `KratosMultiphysics`.

## 2. Backend Setup

The backend relies on Python and the `KratosMultiphysics` framework.

### 2.1. KratosMultiphysics Environment

`KratosMultiphysics` is a C++-based framework and must be pre-compiled. Its location needs to be exposed to the Python environment via an environment variable.

**Action**:
Set the environment variable `KRATOS_APP_DIR` to point to your compiled Kratos directory. This directory should contain the `KratosMultiphysics` Python module.

*Example (Windows Command Prompt):*
```cmd
set KRATOS_APP_DIR=C:\\path\\to\\kratos\\bin
```

**Verification**:
To ensure the variable is set correctly, you can run `echo %KRATOS_APP_DIR%` on Windows or `echo $KRATOS_APP_DIR` on Linux/macOS.

### 2.2. Python Dependencies

It is highly recommended to use a Python virtual environment.

```bash
# 1. Navigate to the backend directory
cd deep_excavation/backend

# 2. Create a virtual environment (e.g., named .venv)
python -m venv .venv

# 3. Activate the virtual environment
# Windows
.venv\\Scripts\\activate
# macOS/Linux
source .venv/bin/activate

# 4. Install all required Python packages
pip install -r requirements.txt
```

## 3. Frontend Setup

The frontend is a standard Vite+React application.

```bash
# 1. Navigate to the frontend directory
cd deep_excavation/frontend

# 2. Install all required Node.js packages
npm install
```

## 4. Running the Application

To run the application, you will need **two separate terminal windows**. Do not use a single script to run both.

### Terminal 1: Start the Backend

1. Open a new terminal.
2. Navigate to the project root directory (`/deep_excavation`).
3. Run the backend startup script:
   ```bash
   ./start-backend.bat
   ```
4. Wait until you see the confirmation message, indicating the backend is running (e.g., `Uvicorn running on http://127.0.0.1:8000`).

### Terminal 2: Start the Frontend

1. Open a **second, separate** terminal.
2. Navigate to the project root directory (`/deep_excavation`).
3. Run the frontend startup script:
    ```bash
    ./start-frontend.bat
    ```
4. Wait until you see the Vite confirmation message, which will provide the URL for the frontend (e.g., `http://localhost:5173`).

You can now access the application via the frontend URL in your browser. 