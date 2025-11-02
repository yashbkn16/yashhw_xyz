import json
import os
import re

# Get script directory and navigate to project root
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
os.chdir(project_root)

# Read the current collection
with open('public/data/collection.json', 'r', encoding='utf-8') as f:
    collection = json.load(f)

def extract_face_value(denomination):
    """Extract numeric value from denomination string"""
    # Match patterns like "1 Dollar", "50 Baht", "₹5", "10 Cents"
    match = re.search(r'[\d.]+', denomination)
    if match:
        value = float(match.group())
        # Convert cents/paise to main unit
        if 'cent' in denomination.lower() or 'pais' in denomination.lower():
            value = value / 100
        elif 'anna' in denomination.lower():
            value = value / 16  # 16 annas = 1 rupee (pre-decimal)
        return value
    return 1.0  # Default if can't parse

# Process each item
for item in collection:
    denomination = item.get('denomination', '1')
    item_type = item.get('type', 'coin')
    
    # Extract face value
    face_value = extract_face_value(denomination)
    item['face_value'] = face_value
    
    # Add currency code based on country
    country = item.get('country', '')
    currency_map = {
        'India': 'INR',
        'United States': 'USD',
        'United States of America': 'USD',
        'Hong Kong': 'HKD',
        'Mauritius': 'MUR',
        'China': 'CNY',
        'Hungary': 'HUF',
        'Thailand': 'THB',
        'Bhutan': 'BTN',
        'Nepal': 'NPR',
        'Oman': 'OMR',
        'Australia': 'AUD',
        'United Arab Emirates': 'AED',
        'Singapore': 'SGD',
        'Philippines': 'PHP',
        'Malaysia': 'MYR',
        'Japan': 'JPY',
        'United Kingdom': 'GBP',
        'Canada': 'CAD',
        'Brazil': 'BRL',
        'Germany': 'EUR',
        'France': 'EUR',
        'Italy': 'EUR',
        'Russia': 'RUB'
    }
    
    item['currency_code'] = currency_map.get(country, 'USD')
    
    # Add estimated collector value (face value is minimum)
    # Historical/rare items worth more, modern circulation coins at face value
    year = item.get('year', '2020')
    try:
        year_num = int(year.split('-')[0]) if year != 'TBD' else 2020
    except:
        year_num = 2020
    
    rarity = item.get('rarity', 'Common')
    material = item.get('material', '').lower()
    
    # Calculate estimated value multiplier
    multiplier = 1.0
    
    # Age factor
    age = 2025 - year_num
    if age > 100:
        multiplier *= 5
    elif age > 50:
        multiplier *= 2
    elif age > 20:
        multiplier *= 1.5
    
    # Rarity factor
    if 'rare' in rarity.lower():
        multiplier *= 10
    elif 'uncommon' in rarity.lower():
        multiplier *= 3
    
    # Material factor
    if 'silver' in material:
        multiplier *= 8  # Silver has intrinsic value
    elif 'gold' in material:
        multiplier *= 50
    
    # Type factor - banknotes often more collectible
    if item_type == 'banknote':
        multiplier *= 1.5
    
    # Minimum multiplier of 1 (face value)
    multiplier = max(1.0, multiplier)
    
    item['estimated_value'] = round(face_value * multiplier, 2)

# Write back to file
with open('public/data/collection.json', 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print(f"✓ Added face_value, currency_code, and estimated_value to {len(collection)} items")
print(f"\nSample values:")
for i, item in enumerate(collection[:5]):
    print(f"  {item['denomination']} ({item['country']}) = {item['currency_code']} {item['face_value']} (Est. {item['currency_code']} {item['estimated_value']})")
