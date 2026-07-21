import json
from collections import Counter

with open(r'D:\Duancanhan\Project_QuanLyGiaiDau\frontend-web_qlgiaidau\tmp_matches_all.json', encoding='utf-8') as f:
    data = json.load(f)
matches = data.get('data', [])
print(f'Total matches: {len(matches)}')

# Analyze category data
print('\n=== tournament.category.name values ===')
cat_names = []
cat_objs = []
cat_name_null = 0
cat_obj_null = 0

for m in matches:
    t = m.get('tournament') or {}
    cn = t.get('categoryName')
    cs = t.get('categorySlug')
    co = t.get('category')
    
    cat_objs.append(co)
    
    if co is not None:
        cat_names.append(co.get('name'))
    else:
        cat_obj_null += 1
    
    if cn is None:
        cat_name_null += 1

print(f'matches with tournament.category (object): {len(matches) - cat_obj_null}')
print(f'matches with tournament.category==null: {cat_obj_null}')
print(f'matches with tournament.categoryName==null: {cat_name_null}')

print('\nAll unique tournament.category.name values:')
for name in sorted(set(n for n in cat_names if n)):
    print(f'  "{name}"')

# Cross-reference with Category API
print('\n=== Cross-reference ===')
categories_api = [
    {"id": "9dfac581-0113-4cee-9c4c-89334df543fc", "name": "Cầu lông", "slug": "badminton"},
    {"id": "ba8e8e87-ae3e-4787-bd20-6881f7585a9b", "name": "Pickleball", "slug": "pickleball"},
    {"id": "281d2e3e-b613-4825-ba72-b61afc31b1d3", "name": "Tennis", "slug": "tennis"},
    {"id": "ad42cb25-5a11-49a1-acf6-99ea5fbd92ba", "name": "Bóng bàn", "slug": "table_tennis"},
]

cat_name_counts = Counter(cat_names)
for cat in categories_api:
    api_name = cat["name"]
    api_name_lower = api_name.lower()
    match_count = cat_name_counts.get(api_name, 0)
    # Also check lowercase variants
    for actual_name, count in cat_name_counts.items():
        if actual_name and actual_name.lower() == api_name_lower and actual_name != api_name:
            match_count += count
    
    print(f'{api_name} (slug={cat["slug"]}): {match_count} matches')

# Show matches that have category but with unexpected name
expected_names = {c["name"] for c in categories_api}
print('\n=== Unexpected category names ===')
for name in sorted(set(n for n in cat_names if n)):
    if name not in expected_names:
        print(f'  UNEXPECTED: "{name}"')

# Check if any match has categoryName directly (non-null)
print('\n=== categoryName (not from category object) ===')
match_cat_names = []
for m in matches:
    t = m.get('tournament') or {}
    cn = t.get('categoryName')
    if cn is not None and cn != '':
        match_cat_names.append(cn)
print(f'Non-null categoryName values: {set(match_cat_names)}')

# Show first match with Cầu lông or Tennis to verify
print('\n=== Sample matches per category ===')
for cat_name_target in ['Cầu lông', 'Pickleball', 'Tennis']:
    samples = [m for m in matches 
               if (m.get('tournament') or {}).get('category', {}).get('name') == cat_name_target]
    if samples:
        s = samples[0]
        t = s.get('tournament', {})
        print(f'{cat_name_target}:')
        print(f'  matchId: {s.get("id","?")[:8]}')
        print(f'  tournamentId: {s.get("tournamentId","?")[:8]}')
        print(f'  tournament.name: {t.get("name")}')
        print(f'  tournament.category: {json.dumps(t.get("category"))}')
        print(f'  tournament.categoryName: {t.get("categoryName")}')
        print(f'  tournament.categorySlug: {t.get("categorySlug")}')
        print()

# Show ALL matches that DON'T have tournament.category
no_cat = [m for m in matches if (m.get('tournament') or {}).get('category') is None]
if no_cat:
    print(f'\n=== Matches WITHOUT tournament.category ({len(no_cat)}) ===')
    for m in no_cat[:5]:
        t = m.get('tournament', {})
        print(f'  id={m.get("id","?")[:8]} | catName="{t.get("categoryName")}" | catSlug="{t.get("categorySlug")}"')
