#!/usr/bin/env python3
"""Convert red colors to rose (for error/alert states)."""
import os, re, glob

root = 'src'
extensions = ('*.tsx', '*.ts')
changes = 0
for ext in extensions:
    for filepath in glob.glob(os.path.join(root, '**', ext), recursive=True):
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        original = content
        content = re.sub(r'bg-red-(\d+)', r'bg-rose-\1', content)
        content = re.sub(r'text-red-(\d+)', r'text-rose-\1', content)
        content = re.sub(r'border-red-(\d+)', r'border-rose-\1', content)
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            changes += 1
print(f'Modified {changes} files')
