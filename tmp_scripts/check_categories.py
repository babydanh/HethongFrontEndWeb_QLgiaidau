import json

# Check Cầu lông matches
with open(r'D:\Duancanhan\Project_QuanLyGiaiDau\frontend-web_qlgiaidau\tmp_matches_badminton.json', encoding='utf-8') as f:
    data = json.load(f)
matches = data.get('data', [])
print(f'=== Matches filtered by categoryId (Cầu lông) ===')
print(f'Total matches returned: {len(matches)}')
for m in matches:
    t = m.get('tournament', {})
    cat = t.get('category', {})
    print(f'  match={m.get("id","?")[:8]} | cat.name="{cat.get("name")}" | catName="{t.get("categoryName")}" | catSlug="{t.get("categorySlug")}"')

# Check tournaments
print()
print('=== Tournaments ===')
with open(r'D:\Duancanhan\Project_QuanLyGiaiDau\frontend-web_qlgiaidau\tmp_tournaments.json', encoding='utf-8') as f:
    data2 = json.load(f)
tours = data2.get('data', [])
print(f'Total tournaments: {len(tours)}')

seen_cats = {}
for tour in tours:
    cat = tour.get('category', {})
    name = tour.get('name', '')[:40]
    cat_name = cat.get('name') if cat else None
    category_name_field = tour.get('categoryName')
    category_slug_field = tour.get('categorySlug')
    
    key = (cat_name, category_name_field, category_slug_field)
    if key not in seen_cats:
        seen_cats[key] = True
        print(f'  tour={tour.get("id","?")[:8]} | name={name} | cat.name="{cat_name}" | categoryName="{category_name_field}" | categorySlug="{category_slug_field}"')

# Also check if categoryName exists but with different value
print()
print('=== All unique category.name from tournaments ===')
all_cat_names = set()
for tour in tours:
    cat = tour.get('category', {})
    if cat and cat.get('name'):
        all_cat_names.add(cat.get('name'))
print(f'  {all_cat_names}')

print()
print('=== All unique categoryName from tournaments ===')
all_catName = set()
for tour in tours:
    cn = tour.get('categoryName')
    if cn:
        all_catName.add(cn)
print(f'  {all_catName if all_catName else "(none) - all null/empty"}')

print()
print('=== All unique categorySlug from tournaments ===')
all_catSlug = set()
for tour in tours:
    cs = tour.get('categorySlug')
    if cs:
        all_catSlug.add(cs)
print(f'  {all_catSlug if all_catSlug else "(none) - all null/empty"}')
