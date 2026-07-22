#!/usr/bin/env python3
"""Fix remaining non-palette standard Tailwind colors (indigo, orange, sky, cyan, violet, teal, fuchsia)."""
import re, glob, os

# Standard Tailwind palette replacements
REPLACE_COLORS = {
    'indigo': 'blue',
    'sky': 'blue',
    'cyan': 'blue',
    'violet': 'blue',
    'fuchsia': 'blue',
    'orange': 'amber',
    'teal': 'emerald',
}

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    original = content
    total_n = 0
    
    for old_color, new_color in REPLACE_COLORS.items():
        for prefix in ['bg-', 'text-', 'border-', 'ring-', 'hover:bg-', 'hover:text-', 'hover:border-', 'fill-', 'stroke-']:
            pattern = re.compile(re.escape(prefix + old_color) + r'-(\d{2,4})')
            content, n = re.subn(pattern, lambda m: prefix + new_color + '-' + m.group(1), content)
            total_n += n
    
    if total_n > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True, total_n
    return False, 0

def main():
    root = 'src'
    extensions = ('*.tsx', '*.ts')
    total_files = 0
    total_changes = 0
    
    for ext in extensions:
        for filepath in glob.glob(os.path.join(root, '**', ext), recursive=True):
            modified, n = fix_file(filepath)
            if modified:
                total_files += 1
                total_changes += n
                print(f'  {filepath}: {n} changes')
    
    print(f'\nTotal: {total_files} files modified, {total_changes} changes')

if __name__ == '__main__':
    main()
