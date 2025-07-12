#!/usr/bin/env python3
"""Syntax checker for DeepCAD Python files."""

import sys
import os
import ast

def check_syntax(filepath):
    """Check if a Python file has valid syntax."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        try:
            ast.parse(content, filename=filepath)
            return 'OK'
        except SyntaxError as e:
            return f'SYNTAX ERROR: Line {e.lineno}, {e.msg}'
        except Exception as e:
            return f'PARSE ERROR: {e}'
            
    except UnicodeDecodeError as e:
        return f'DECODE ERROR: {e}'
    except Exception as e:
        return f'FILE ERROR: {e}'

def main():
    """Main function to check Python files."""
    # Check key project files
    key_files = []
    for root, dirs, files in os.walk('/mnt/e/DeepCAD'):
        # Skip virtual environment and external source
        if '.venv' in root or 'kratos_source' in root:
            continue
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                # Focus on main project files
                if any(x in filepath for x in ['/gateway/', '/core/', '/tests/', 'check_']):
                    key_files.append(filepath)

    print(f'Checking {len(key_files)} key Python files for syntax errors...')
    errors = []

    for filepath in key_files:
        result = check_syntax(filepath)
        if result != 'OK':
            errors.append((filepath, result))
            print(f'{filepath}: {result}')

    if not errors:
        print(f'SUCCESS: All {len(key_files)} files checked have valid syntax!')
    else:
        print(f'\nFOUND {len(errors)} files with issues:')
        for filepath, error in errors:
            print(f'  - {filepath}: {error}')

if __name__ == '__main__':
    main()