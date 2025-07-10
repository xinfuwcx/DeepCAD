import sys
import os

print("Python executable:", sys.executable)
print("\nPython version:", sys.version)
print("\nPYTHONPATH:", os.environ.get("PYTHONPATH", "Not set"))
print("\nPATH:", os.environ.get("PATH", "Not set"))
print("\nsys.path:")
for p in sys.path:
    print(f"  - {p}") 