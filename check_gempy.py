import traceback
import sys

try:
    import gempy as gp
    print('GemPy imported successfully')
    print('Version:', gp.__version__)
    
    # 检查可用的主要函数
    print('\nAvailable main functions:')
    main_functions = ['generate_example_model', 'create_model', 'init_data', 'plot_3d']
    for func in main_functions:
        if hasattr(gp, func):
            print(f'  ✅ {func}')
        else:
            print(f'  ❌ {func}')
    
    # 检查API模块
    print('\nAPI modules:')
    api_modules = ['API.examples_generator', 'API.data_api', 'API.plot_api']
    for mod in api_modules:
        try:
            # 尝试导入模块
            parts = mod.split('.')
            current = gp
            for part in parts:
                current = getattr(current, part)
            print(f'  ✅ {mod}')
        except AttributeError:
            print(f'  ❌ {mod}')
            
except Exception as e:
    print('Error importing GemPy:')
    traceback.print_exc()