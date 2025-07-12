#!/usr/bin/env python3
"""
DeepCAD Backend Launcher - Production Mode Only
"""
import sys
import os

def check_dependencies():
    """Check required dependencies"""
    missing = []
    
    try:
        import fastapi
    except ImportError:
        missing.append("fastapi")
    
    try:
        import uvicorn
    except ImportError:
        missing.append("uvicorn")
    
    try:
        import sqlalchemy
    except ImportError:
        missing.append("sqlalchemy")
    
    if missing:
        print("❌ Missing required dependencies:")
        for dep in missing:
            print(f"   - {dep}")
        print("\n💡 Install with:")
        print(f"   pip install {' '.join(missing)}")
        return False
    
    return True

def main():
    print("🚀 DeepCAD Backend Launcher")
    print("=" * 40)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    print("✅ All dependencies available")
    print("🏗️  Starting DeepCAD Backend...")
    print("📍 URL: http://localhost:8080")
    print("🏥 Health: http://localhost:8080/api/health")
    print("📚 Docs: http://localhost:8080/docs")
    print()
    
    # Change to gateway directory and start
    os.chdir(os.path.join(os.path.dirname(__file__), 'gateway'))
    
    try:
        import uvicorn
        uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
    except KeyboardInterrupt:
        print("\n🛑 Backend stopped by user")
    except Exception as e:
        print(f"❌ Backend failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()