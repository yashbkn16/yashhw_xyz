
#!/usr/bin/env python3
import csv, json, sys, os
inp = sys.argv[1] if len(sys.argv)>1 else 'data/template.csv'
out = sys.argv[2] if len(sys.argv)>2 else 'public/data/collection.json'
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(inp, newline='', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))
for r in rows:
    if r.get('tags'):
        r['tags'] = [t.strip() for t in r['tags'].split(',') if t.strip()]
    for k in ('weight_g','diameter_mm','price'):
        if r.get(k):
            try: r[k] = float(r[k])
            except ValueError: pass
with open(out, 'w', encoding='utf-8') as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)
print(f"Wrote {len(rows)} items to {out}")
