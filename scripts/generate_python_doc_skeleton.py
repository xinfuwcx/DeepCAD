#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# flake8: noqa: E302,E305

"""
generate_python_doc_skeleton.py

自动为 Python 文件添加符合 Sphinx/Google 风格的中文 Docstring 骨架。
用法：python scripts/generate_python_doc_skeleton.py [--in-place] path1 path2 ...
"""

import ast
import os
import argparse

def process_file(path, in_place=False):  # noqa
    """
    处理单个 Python 文件，解析 AST，找出缺失 Docstring 的函数和类，并插入注释骨架。
    """
    with open(path, 'r', encoding='utf-8') as f:
        source = f.read()
    try:
        tree = ast.parse(source)
    except SyntaxError as e:
        print(f"跳过无法解析的文件: {path}, 错误: {e}")
        return
    lines = source.splitlines()
    missing = []
    # 遍历 AST 节点，查找缺失 docstring 的函数和类
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            if ast.get_docstring(node, clean=False) is None:
                missing.append(node)
    if not missing:
        return
    insertions = []
    # 构造待插入的 docstring 列表
    for node in missing:
        start = node.lineno - 1
        end = start
        # 寻找签名结尾的行（以 ':' 结尾）
        while end < len(lines) and not lines[end].rstrip().endswith(':'):
            end += 1
        indent = ' ' * (node.col_offset + 4)
        doc_lines = [indent + '"""']
        if isinstance(node, ast.ClassDef):
            doc_lines.append(indent + '<类功能说明>')
        else:
            doc_lines.append(indent + '<函数功能说明>')
        # 处理参数
        args = []
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for arg in node.args.args:
                if arg.arg in ('self', 'cls'):
                    continue
                arg_type = 'type'
                if arg.annotation:
                    try:
                        arg_type = ast.unparse(arg.annotation)
                    except AttributeError:
                        pass
                args.append((arg.arg, arg_type))
        if args:
            doc_lines.append(indent + '')
            doc_lines.append(indent + 'Args:')
            for name, arg_type in args:
                doc_lines.append(indent + f'    {name} ({arg_type}): <参数说明>')
        # 处理返回值
        if hasattr(node, 'returns'):
            ret_type = 'type'
            if node.returns:
                try:
                    ret_type = ast.unparse(node.returns)
                except AttributeError:
                    pass
            doc_lines.append(indent + '')
            doc_lines.append(indent + 'Returns:')
            doc_lines.append(indent + f'    {ret_type}: <返回值说明>')
        doc_lines.append(indent + '"""')
        insertions.append((end + 1, doc_lines))
    # 从后向前插入，避免行号偏移
    for lineno, doc_lines in sorted(insertions, key=lambda x: x[0], reverse=True):
        lines[lineno:lineno] = doc_lines
    new_source = '\n'.join(lines)
    if in_place:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_source)
        print(f"已更新: {path}")
    else:
        print(new_source)

def main():  # noqa


    parser = argparse.ArgumentParser(description="自动为 Python 文件添加中文 Docstring 骨架")
    parser.add_argument('paths', nargs='+', help="文件或目录路径")
    parser.add_argument('--in-place', action='store_true', help="直接修改文件")
    args = parser.parse_args()
    for path in args.paths:
        if os.path.isdir(path):
            for root, dirs, files in os.walk(path):
                # 跳过虚拟环境和版本控制目录
                if any(skip in root for skip in ('.git', 'venv', 'node_modules')):
                    continue
                for file in files:
                    if file.endswith('.py'):
                        process_file(os.path.join(root, file), in_place=args.in_place)
        elif os.path.isfile(path) and path.endswith('.py'):
            process_file(path, in_place=args.in_place)

if __name__ == '__main__':
    main() 