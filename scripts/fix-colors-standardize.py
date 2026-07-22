#!/usr/bin/env python3
"""
Standardize frontend colors: replace amber/emerald/rose slop with slate/blue.
Rules:
- Card backgrounds (bg-*-50 + border + rounded) using amber/emerald/rose → slate
- Neutral badges bg-amber-50 text-amber-700 → bg-slate-100 text-slate-600
- Neutral badges bg-rose-50 text-rose-700 → bg-slate-100 text-slate-600
- Non-success emerald badges → bg-blue-50 text-blue-700
- Decorative icons text-amber-600/emerald-600 → text-blue-600
"""
import re, glob, os

# Files/patterns to SKIP (legitimate uses)
SKIP_AMBER_KEYWORDS = ['PENDING', 'pending', 'Chờ', 'chờ', 'Warning', 'warning', 'warn']
SKIP_EMERALD_KEYWORDS = ['success', 'Success', 'SUCCESS', 'completed', 'Completed', 'Mở đăng ký', 'Đã đóng']
SKIP_ROSE_KEYWORDS = ['live', 'LIVE', 'Live', 'error', 'Error', 'cancelled', 'Cancelled', 'banned', 'Banned', 
                       'ban', 'Ban', 'delete', 'Delete', 'destructive', 'Đang diễn ra', 'Đã hủy']

def should_skip_line(line, skip_keywords):
    """Check if a line contains keywords that indicate legitimate use."""
    for kw in skip_keywords:
        if kw in line:
            nearby = line[line.find(kw)-30:line.find(kw)+30] if kw in line else line
            return True, kw
    return False, None

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    original = content
    lines = content.split('\n')
    new_lines = []
    changes = 0
    
    for i, line in enumerate(lines):
        new_line = line
        
        # === AMBER SLOP ===
        # Card backgrounds with amber-50 + border-amber-200 + rounded
        if 'bg-amber-50' in new_line and ('border-amber-200' in new_line or 'rounded' in new_line):
            skip, kw = should_skip_line(new_line, SKIP_AMBER_KEYWORDS)
            if not skip or ('Chờ thanh toán' not in new_line and 'PENDING' not in new_line):
                # Only change if it looks like a generic card, not a status badge
                if 'rounded-lg' in new_line or 'rounded-xl' in new_line or 'p-' in new_line:
                    # Check it's not a badge-like pattern (rounded-full, px-2, py-1)
                    if 'rounded-full' not in new_line or 'px-' in new_line or 'py-' in new_line:
                        # Keep legitimate pending badges
                        if 'text-amber-600' in new_line and ('Chờ' in new_line or 'PENDING' in new_line):
                            pass  # Keep as is
                        else:
                            new_line = new_line.replace('bg-amber-50', 'bg-slate-50')
                            new_line = new_line.replace('border-amber-200', 'border-slate-200')
                            new_line = new_line.replace('border-amber-100', 'border-slate-200')
                            new_line = new_line.replace('text-amber-800', 'text-slate-700')
                            new_line = new_line.replace('text-amber-900', 'text-slate-800')
                            new_line = new_line.replace('text-amber-700', 'text-slate-600')
                            changes += 1
        
        # Generic amber badges with rounded-full (not pending status)
        if 'bg-amber-50' in new_line and 'rounded-full' in new_line:
            skip, kw = should_skip_line(new_line, SKIP_AMBER_KEYWORDS)
            if not skip or ('Chờ thanh toán' not in new_line):
                new_line = new_line.replace('bg-amber-50', 'bg-slate-100')
                new_line = new_line.replace('text-amber-700', 'text-slate-600')
                new_line = new_line.replace('text-amber-600', 'text-slate-600')
                new_line = new_line.replace('border-amber-200', 'border-slate-200')
                changes += 1
        
        # Decorative amber icon colors
        if 'text-amber-600' in new_line or 'text-amber-500' in new_line:
            skip, kw = should_skip_line(new_line, SKIP_AMBER_KEYWORDS)
            if not skip and 'text-amber-955' not in new_line and 'text-amber-655' not in new_line:
                # Only change standalone text-amber without bg-amber (icon colors)
                if 'bg-amber-' not in new_line:
                    new_line = new_line.replace('text-amber-600', 'text-blue-600')
                    new_line = new_line.replace('text-amber-500', 'text-blue-500')
                    changes += 1
        
        # === EMERALD SLOP ===
        # Card backgrounds with emerald-50
        if 'bg-emerald-50' in new_line and ('border-emerald-' in new_line or 'rounded-lg' in new_line):
            skip, kw = should_skip_line(new_line, SKIP_EMERALD_KEYWORDS)
            if not skip:
                # Only change card patterns, not success badges
                if 'rounded-lg' in new_line and 'rounded-full' not in new_line:
                    new_line = new_line.replace('bg-emerald-50', 'bg-slate-50')
                    new_line = new_line.replace('border-emerald-200', 'border-slate-200')
                    new_line = new_line.replace('border-emerald-100', 'border-slate-200')
                    new_line = new_line.replace('text-emerald-800', 'text-slate-700')
                    new_line = new_line.replace('text-emerald-900', 'text-slate-800')
                    new_line = new_line.replace('text-emerald-700', 'text-slate-600')
                    changes += 1
                elif 'rounded-full' in new_line and 'border-emerald-' in new_line:
                    # Badge-shaped → blue (active badge)
                    new_line = new_line.replace('bg-emerald-50', 'bg-blue-50')
                    new_line = new_line.replace('text-emerald-700', 'text-blue-700')
                    new_line = new_line.replace('text-emerald-600', 'text-blue-600')
                    new_line = new_line.replace('border-emerald-200', 'border-blue-200')
                    new_line = new_line.replace('border-emerald-100', 'border-blue-200')
                    changes += 1
        
        # Non-success emerald badges
        if 'bg-emerald-50' in new_line and 'text-emerald-700' in new_line:
            skip, kw = should_skip_line(new_line, SKIP_EMERALD_KEYWORDS)
            if not skip:
                new_line = new_line.replace('bg-emerald-50', 'bg-blue-50')
                new_line = new_line.replace('text-emerald-700', 'text-blue-700')
                new_line = new_line.replace('border-emerald-200', 'border-blue-200')
                new_line = new_line.replace('border-emerald-100', 'border-blue-200')
                changes += 1
        
        # Decorative emerald icon colors (text-emerald-500/600 without bg-emerald)
        if ('text-emerald-500' in new_line or 'text-emerald-600' in new_line) and 'bg-emerald-' not in new_line:
            skip, kw = should_skip_line(new_line, SKIP_EMERALD_KEYWORDS)
            if not skip:
                new_line = new_line.replace('text-emerald-600', 'text-blue-600')
                new_line = new_line.replace('text-emerald-500', 'text-blue-500')
                changes += 1
        
        # === ROSE SLOP (rose used for non-live/non-error/non-destructive) ===
        # Rose used for banned/delete is actually error/destructive → keep
        # Only fix if NOT in a destructive/error context
        
        # Generic rose badges (not live, not error)
        if 'bg-rose-50' in new_line and 'text-rose-700' in new_line:
            skip, kw = should_skip_line(new_line, SKIP_ROSE_KEYWORDS)
            if not skip and 'rounded-full' in new_line:
                # Convert neutral rose badges to slate
                new_line = new_line.replace('bg-rose-50', 'bg-slate-100')
                new_line = new_line.replace('text-rose-700', 'text-slate-600')
                new_line = new_line.replace('text-rose-600', 'text-slate-600')
                new_line = new_line.replace('border-rose-200', 'border-slate-200')
                changes += 1
        
        # Border styles for rose (non-destructive)
        if 'border-rose-200' in new_line and 'hover:bg-rose-50' not in new_line:
            skip, kw = should_skip_line(new_line, SKIP_ROSE_KEYWORDS)
            if not skip:
                new_line = new_line.replace('border-rose-200', 'border-slate-200')
                changes += 1
        
        new_lines.append(new_line)
    
    new_content = '\n'.join(new_lines)
    if new_content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
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
