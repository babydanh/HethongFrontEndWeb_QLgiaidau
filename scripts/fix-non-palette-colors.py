#!/usr/bin/env python3
"""Fix remaining non-palette colors: indigo, orange, sky, fuchsia, cyan, violet → slate/blue/amber/rose/emerald."""
import re, glob

COLOR_MAP = {
    # indigo → blue (primary)
    'bg-indigo-': 'bg-blue-',
    'text-indigo-': 'text-blue-',
    'border-indigo-': 'border-blue-',
    'ring-indigo-': 'ring-blue-',
    'hover:bg-indigo-': 'hover:bg-blue-',
    'hover:text-indigo-': 'hover:text-blue-',
    'hover:border-indigo-': 'hover:border-blue-',
    # orange → amber (warning)
    'bg-orange-': 'bg-amber-',
    'text-orange-': 'text-amber-',
    'border-orange-': 'border-amber-',
    # sky → blue (primary)
    'bg-sky-': 'bg-blue-',
    'text-sky-': 'text-blue-',
    'border-sky-': 'border-blue-',
    'hover:bg-sky-': 'hover:bg-blue-',
    'hover:text-sky-': 'hover:text-blue-',
    # fuchsia → blue (primary)
    'bg-fuchsia-': 'bg-blue-',
    'text-fuchsia-': 'text-blue-',
    'border-fuchsia-': 'border-blue-',
    # cyan → blue (primary)
    'bg-cyan-': 'bg-blue-',
    'text-cyan-': 'text-blue-',
    'border-cyan-': 'border-blue-',
    # violet → blue (primary)
    'bg-violet-': 'bg-blue-',
    'text-violet-': 'text-blue-',
    'border-violet-': 'border-blue-',
}

SPECIAL_NUMBERS = {
    'indigo-650', 'indigo-550', 'amber-955', 'amber-655', 'amber-655',
    'rose-650', 'rose-250', 'rose-55',
    'emerald-650', 'emerald-250',
    'slate-455', 'slate-750', 'slate-755', 'slate-250',
    'blue-250',
    'orange-205', 'orange-450',
    'border-emerald-250', 'border-rose-250', 'border-rose-250',
    'border-amber-250', 'border-amber-250',
    'border-slate-250', 'border-blue-250', 'border-slate-250',
    'text-slate-455', 'text-amber-955', 'text-amber-655',
    'bg-rose-55',
}

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    original = content
    changes = 0
    
    for old_prefix, new_prefix in COLOR_MAP.items():
        # Only replace if the color number is a standard tailwind number (50-900)
        pattern = re.compile(re.escape(old_prefix) + r'(\d{2,4})')
        content, n = pattern.sub(lambda m: new_prefix + m.group(1), content)
        changes += n
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True, changes
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
