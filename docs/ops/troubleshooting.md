---
title: 故障排查与常见问题
---

# 故障排查与常见问题

- **Kratos __version__ 属性缺失**  
  - 已通过 `getattr(..., "N/A")` 兼容。  
- **PowerShell && 问题**  
  - 在 Windows 请使用 `;` 或分两条命令执行。  
- **SyntaxError: null bytes**  
  - 检查文件编码与历史冲突，使用 `git restore` 恢复。  
- **依赖冲突**  
  - 清理虚拟环境并重新安装：  
    ```
    rm -rf .venv
    python -m venv .venv
    ``` 