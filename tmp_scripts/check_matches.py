import json
with open(r'D:\Duancanhan\Project_QuanLyGiaiDau\frontend-web_qlgiaidau\tmp_matches.json') as f:
    data = json.load(f)
matches = data.get('data', [])
print(f'Total matches: {len(matches)}')
print()

seen = set()
for m in matches:
    t = m.get('tournament', {})
    cat_name = t.get('categoryName')
    cat_slug = t.get('categorySlug')
    cat = t.get('category')
    tour_name = t.get('name', 'N/A')
    tour_id = t.get('id', '?')[:8]
    key = (cat_name, cat_slug)
    if key not in seen:
        seen.add(key)
        print(f'tournament={tour_name[:40]:40s} | categoryName="{cat_name}" | categorySlug="{cat_slug}" | category={cat} | tournamentId={tour_id}')

print()
print('=== ALL UNIQUE categoryName values ===')
all_cat_names = []
for m in matches:
    t = m.get('tournament', {})
    all_cat_names.append(t.get('categoryName'))
    if t.get('category') is not None:
        print(f'FOUND tournament.category: {json.dumps(t.get("category"))}')
        
for cn in sorted(set(cn for cn in all_cat_names if cn)):
    print(f'  "{cn}"')

print('--- categorySlug ---')
all_cat_slugs = []
for m in matches:
    t = m.get('tournament', {})
    all_cat_slugs.append(t.get('categorySlug'))
for cs in sorted(set(cs for cs in all_cat_slugs if cs)):
    print(f'  "{cs}"')

# Verification
print()
print('=== VERIFICATION ===')
categories_info = {
    "9dfac581-0113-4cee-9c4c-89334df543fc": {"name": "Cầu lông", "slug": "badminton"},
    "ba8e8e87-ae3e-4787-bd20-6881f7585a9b": {"name": "Pickleball", "slug": "pickleball"},
    "281d2e3e-b613-4825-ba72-b61afc31b1d3": {"name": "Tennis", "slug": "tennis"},
    "ad42cb25-5a11-49a1-acf6-99ea5fbd92ba": {"name": "Bóng bàn", "slug": "table_tennis"},
}

actual_names = set()
for m in matches:
    n = m.get('tournament', {}).get('categoryName')
    if n:
        actual_names.add(n)
print(f'All categoryName values seen: {sorted(actual_names)}')

# Check: How many matches for each category?
for cat_id, cat_info in categories_info.items():
    name_lower = cat_info["name"].lower()
    slug = cat_info["slug"]
    by_name = sum(1 for m in matches if (m.get('tournament', {}).get('categoryName') or '').lower() == name_lower)
    by_slug = sum(1 for m in matches if (m.get('tournament', {}).get('categorySlug') or '') == slug)
    total_match_cat = sum(1 for m in matches if m.get('tournament', {}).get('categoryName') is not None)
    print(f'{cat_info["name"]}: matches_by_name={by_name}, matches_by_slug={by_slug}')

# Also check if any match has tournament.category (nested)
print()
for m in matches:
    t = m.get('tournament', {})
    if 'category' in t:
        print(f'FOUND tournament.category in match {m.get("id","?")[:8]}: {json.dumps(t["category"])}')
    break  # just check first one

# Check a few matches
print()
print('First 5 matches:')
for m in matches[:5]:
    t = m.get('tournament', {})
    print(f'  id={m.get("id","?")[:8]} | categoryName="{t.get("categoryName")}" | categorySlug="{t.get("categorySlug")}"')
