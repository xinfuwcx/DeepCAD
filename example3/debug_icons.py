import traceback

try:
    import gempy_icons
    print("Icon module imported successfully!")
    
    from gempy_icons import GEMPY_ICONS
    print(f"Icons loaded: {len(GEMPY_ICONS)}")
    
    print("Sample icons:", list(GEMPY_ICONS.keys())[:5])
    
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()