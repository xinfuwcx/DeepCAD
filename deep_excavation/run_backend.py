import sys
import os
import uvicorn

# Add the current working directory to the Python path.
# This ensures that the 'backend' module can be found when the script
# is run from the project root directory.
sys.path.insert(0, os.getcwd())

if __name__ == "__main__":
    """
    Main entry point for the backend server.
    """
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True) 