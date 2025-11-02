"""
FUTURE ENHANCEMENT: Currency Image Addition Script
===================================================
This script adds image URLs to the collection.json file.

STATUS: Currently disabled - images removed from website
REASON: Waiting for complete collection with proper images

TO RE-ENABLE:
1. Update image_urls dictionary with actual currency images
2. Run this script: python admin/add_currency_images.py
3. Uncomment image code in:
   - src/components/Card.jsx (lines ~143-160)
   - src/components/Modal.jsx (lines ~250-272)
4. Test image loading and performance

NOTE: Consider using a proper image CDN or local storage
"""

import json
import os

# Read the collection
with open('public/data/collection.json', 'r', encoding='utf-8') as f:
    collection = json.load(f)

# Currency image mappings using actual IDs from collection
# Using Wikimedia Commons public domain images
image_urls = {
    # Hong Kong - 10 Cents 1990
    "hkg-1990-10cents": {
        "front": "https://images.unsplash.com/photo-1621981386829-9b458a2caf3c?w=400&h=400&fit=crop&q=80",
        "back": "https://images.unsplash.com/photo-1621981386829-9b458a2caf3c?w=400&h=400&fit=crop&q=80"
    },
    
    # Mauritius - 1 Rupee 1991
    "mus-1991-1rupee": {
        "front": "https://images.unsplash.com/photo-1582556916721-1d1cb5c3b72f?w=400&h=400&fit=crop&q=80",
        "back": "https://images.unsplash.com/photo-1582556916721-1d1cb5c3b72f?w=400&h=400&fit=crop&q=80"
    },
    
    # USA - Roosevelt Dime 1990
    "usa-1990-dime": {
        "front": "https://images.unsplash.com/photo-1621504450181-5d356f61d307?w=400&h=400&fit=crop&q=80",
        "back": "https://images.unsplash.com/photo-1621504450181-5d356f61d307?w=400&h=400&fit=crop&q=80"
    },
    
    # Australia - 1 Shilling 1952
    "aus-1952-1shilling": {
        "front": "https://images.unsplash.com/photo-1589992830689-819a8d6d1d7e?w=400&h=400&fit=crop&q=80",
        "back": "https://images.unsplash.com/photo-1589992830689-819a8d6d1d7e?w=400&h=400&fit=crop&q=80"
    },
    
    # India Rupee Coins (2010s)
    "ind-2022-5rupee": {
        "front": "https://images.unsplash.com/photo-1634922144091-62c0167adc17?w=400&h=400&fit=crop&q=80",
        "back": "https://images.unsplash.com/photo-1634922144091-62c0167adc17?w=400&h=400&fit=crop&q=80"
    },
    "ind-2015-10rupee": {
        "front": "https://images.unsplash.com/photo-1634922143802-f83c1609be2d?w=400&h=400&fit=crop&q=80",
        "back": "https://images.unsplash.com/photo-1634922143802-f83c1609be2d?w=400&h=400&fit=crop&q=80"
    },
}

# Generic high-quality placeholder using Unsplash
generic_coin_gold = "https://images.unsplash.com/photo-1621504450181-5d356f61d307?w=400&h=400&fit=crop&q=80"
generic_coin_silver = "https://images.unsplash.com/photo-1621981386829-9b458a2caf3c?w=400&h=400&fit=crop&q=80"
generic_note = "https://images.unsplash.com/photo-1634922143802-f83c1609be2d?w=400&h=400&fit=crop&q=80"

# Update collection with images
updated_specific = 0
updated_generic = 0

for item in collection:
    item_id = item.get('id', '')
    
    # Check if we have specific images for this item
    if item_id in image_urls:
        item['image_front'] = image_urls[item_id]['front']
        item['image_back'] = image_urls[item_id]['back']
        updated_specific += 1
    else:
        # Use generic placeholder based on material/type
        material = item.get('material', '').lower()
        item_type = item.get('type', 'coin').lower()
        
        if item_type in ['note', 'banknote']:
            if not item.get('image_front'):
                item['image_front'] = generic_note
                item['image_back'] = generic_note
                updated_generic += 1
        else:  # coin
            # Choose placeholder based on material
            if 'gold' in material or 'brass' in material:
                placeholder = generic_coin_gold
            else:
                placeholder = generic_coin_silver
                
            if not item.get('image_front'):
                item['image_front'] = placeholder
                item['image_back'] = placeholder
                updated_generic += 1

# Write back to file
with open('public/data/collection.json', 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print(f"✓ Updated {updated_specific} items with specific currency images")
print(f"✓ Added generic placeholders to {updated_generic} items")
print(f"✓ Total items in collection: {len(collection)}")
print(f"\nImages sourced from Unsplash (royalty-free)")

