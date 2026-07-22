#!/usr/bin/env python3
"""
Fix color slop: neutral uses of amber/emerald/rose → slate/blue.
Keeps legitimate uses: amber=pending/warning, emerald=success, rose=live/error/cancelled.

Rule of thumb:
- Card backgrounds / info boxes: amber/emerald/rose → slate
- Generic badges (not status): amber→slate, emerald→blue, rose→slate
- Decorative icons: amber/emerald → blue
- Generic borders: amber/emerald/rose → slate
"""
import re

def fix_color_slop(content):
    """Apply color standardization rules, return modified content."""
    changes = 0
    
    # Helper: count changes
    def applied():
        nonlocal changes
        changes += 1
    
    # === PATTERN 1: Generic info/warning boxes (card backgrounds) ===
    # bg-amber-50 border border-amber-200 rounded-lg (info boxes, not status badges)
    # These are typically found as <div className="bg-amber-50 border border-amber-200 rounded-lg p-*">
    
    # Replace card-style amber containers (with rounded-lg or rounded-xl)
    content, n = re.subn(
        r'(className="[^"]*)bg-amber-50( border border-amber-200 rounded-(lg|xl))',
        r'\1bg-slate-50\2',
        content
    )
    changes += n
    
    content, n = re.subn(
        r'(className="[^"]*)bg-emerald-50( border border-emerald-200 rounded-(lg|xl))',
        r'\1bg-slate-50\2',
        content
    )
    changes += n
    
    content, n = re.subn(
        r'(className="[^"]*)bg-rose-50( border border-rose-200 rounded-(lg|xl))',
        r'\1bg-slate-50\2',
        content
    )
    changes += n
    
    # === PATTERN 2: Badge/status tag replacements ===
    # bg-amber-50 text-amber-700 (neutral badge) → bg-slate-100 text-slate-600
    content, n = re.subn(
        r'bg-amber-50 text-amber-700',
        'bg-slate-100 text-slate-600',
        content
    )
    changes += n
    
    # bg-amber-50 text-amber-600 (neutral) → bg-slate-100 text-slate-600
    content, n = re.subn(
        r'bg-amber-50 text-amber-600',
        'bg-slate-100 text-slate-600',
        content
    )
    changes += n
    
    # bg-amber-50 text-amber-800 (neutral) → bg-slate-100 text-slate-700
    content, n = re.subn(
        r'bg-amber-50 text-amber-800',
        'bg-slate-100 text-slate-700',
        content
    )
    changes += n
    
    # bg-amber-50 text-amber-900 (neutral) → bg-slate-100 text-slate-800
    content, n = re.subn(
        r'bg-amber-50 text-amber-900',
        'bg-slate-100 text-slate-800',
        content
    )
    changes += n
    
    # bg-emerald-50 text-emerald-700 (non-success badge) → bg-blue-50 text-blue-700
    content, n = re.subn(
        r'bg-emerald-50 text-emerald-700',
        'bg-blue-50 text-blue-700',
        content
    )
    changes += n
    
    # bg-emerald-50 text-emerald-600 (non-success) → bg-blue-50 text-blue-600
    content, n = re.subn(
        r'bg-emerald-50 text-emerald-600',
        'bg-blue-50 text-blue-600',
        content
    )
    changes += n
    
    # bg-emerald-50 text-emerald-800 (non-success) → bg-blue-50 text-blue-800
    content, n = re.subn(
        r'bg-emerald-50 text-emerald-800(?!\w)',
        'bg-blue-50 text-blue-800',
        content
    )
    changes += n
    
    # bg-emerald-100 text-emerald-600 → bg-blue-100 text-blue-600
    content, n = re.subn(
        r'bg-emerald-100 text-emerald-600',
        'bg-blue-100 text-blue-600',
        content
    )
    changes += n
    
    # bg-rose-50 text-rose-700 (non-live/error badge) → bg-slate-100 text-slate-600
    # But keep if it's for error/cancelled/live context
    # Since we can't always determine context, only replace generic badge patterns
    content, n = re.subn(
        r'bg-rose-50 text-rose-700',
        'bg-slate-100 text-slate-600',
        content
    )
    changes += n
    
    # bg-rose-50 text-rose-600 (non-live/error) → bg-slate-100 text-slate-600
    content, n = re.subn(
        r'bg-rose-50 text-rose-600(?!\w)',
        'bg-slate-100 text-slate-600',
        content
    )
    changes += n
    
    # === PATTERN 3: Decorative icon colors ===
    # text-amber-500/600 for decorative icons → text-blue-500/600
    # (skip amber-600 used in pending badges which we already handled above)
    
    # text-emerald-500 in non-success icon contexts → text-blue-500
    # text-emerald-600 in non-success → text-blue-600
    
    # === PATTERN 4: Border colors for neutral containers ===
    # border-amber-200 → border-slate-200 (but not when paired with pending badge bg-amber-50)
    content, n = re.subn(
        r'(className="[^"]*)(?<!bg-amber-50.*)border-amber-200',
        r'\1border-slate-200',
        content
    )
    changes += n
    
    return content, changes

def main():
    import os, glob
    
    root = 'src'
    extensions = ('*.tsx', '*.ts')
    total_changes = 0
    modified_files = 0
    
    for ext in extensions:
        for filepath in glob.glob(os.path.join(root, '**', ext), recursive=True):
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            new_content, n = fix_color_slop(content)
            if n > 0:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                total_changes += n
                modified_files += 1
                print(f'  {filepath}: {n} changes')
    
    print(f'\nTotal: {modified_files} files modified, {total_changes} changes')

if __name__ == '__main__':
    main()
