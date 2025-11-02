import json
import os

# Get script directory and navigate to project root
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
os.chdir(project_root)

# Read the current collection
with open('public/data/collection.json', 'r', encoding='utf-8') as f:
    collection = json.load(f)

# Enhanced content for specific items
enhancements = {
    "hkg-1990-10cents": {
        "mintage": "High circulation",
        "condition": "Circulated",
        "story": "This small but historic coin represents the final years of British colonial Hong Kong. Issued just seven years before the 1997 handover to China, it features Queen Elizabeth II on the obverse and bilingual legends reflecting Hong Kong's unique cultural blend. The nickel-brass composition made these coins durable for everyday commerce in one of Asia's busiest financial centers.",
        "fun_facts": [
            "Hong Kong retained its own currency after the 1997 handover under the 'one country, two systems' framework.",
            "The 10 cents coin is the smallest denomination still legal tender in Hong Kong.",
            "After 1993, the design was replaced with the bauhinia flower, symbolizing Hong Kong's identity.",
            "These coins were minted by the Royal Mint in the UK during the colonial period."
        ]
    },
    "mus-2010-1rupee": {
        "mintage": "Standard circulation",
        "condition": "Circulated",
        "story": "This cupronickel rupee honors Sir Seewoosagur Ramgoolam, Mauritius's first Prime Minister and 'Father of the Nation.' The 2010 issue marked the last year of this specific composition before the series transitioned to different materials. Mauritius, a small island nation in the Indian Ocean, has a rich numismatic history tied to its colonial past and diverse cultural heritage.",
        "fun_facts": [
            "The Mauritian rupee replaced the dollar in 1877 during British colonial rule.",
            "Ramgoolam led Mauritius to independence in 1968 and is revered as the nation's founding father.",
            "The extinct dodo bird, famously from Mauritius, appears on the national coat of arms.",
            "Mauritius uses a decimal system with 100 cents = 1 rupee."
        ]
    },
    "usa-1979-10c": {
        "mintage": "315,440,000 (Philadelphia)",
        "condition": "Circulated",
        "story": "The Roosevelt dime honors President Franklin D. Roosevelt, who died in 1945. This design, introduced in 1946, replaced the Mercury dime and has remained largely unchanged. The 1979-dated coins were struck in cupron ickel-clad composition, adopted in 1965 when silver was removed from circulating US coinage due to rising metal prices.",
        "fun_facts": [
            "Roosevelt was chosen for the dime because of his work with the March of Dimes polio charity.",
            "The copper core is visible on the edge of all clad dimes - look for the copper stripe!",
            "Modern dimes are the smallest US coin in diameter but contain more copper than pennies.",
            "The 'P' mint mark (Philadelphia) wasn't added to dimes until 1980, so 1979 has no mint mark."
        ]
    },
    "aus-1952-1shilling": {
        "mintage": "7,200,000",
        "condition": "Circulated",
        "story": "This pre-decimal Australian shilling features the iconic Merino ram, symbolizing Australia's world-famous wool industry. King George VI appears on the obverse in this, the final year of his reign before Queen Elizabeth II's ascension. Made of 50% silver, these coins were withdrawn from circulation when Australia decimalized in 1966, converting to dollars and cents.",
        "fun_facts": [
            "The Merino sheep design represented Australia's agricultural wealth and global wool exports.",
            "In 1966, this shilling became the 10-cent coin under decimalization (1 shilling = 10 cents).",
            "George VI's 1952 coins are sought after as they were his last year before passing in February.",
            "Australian pre-decimal coins used the British pound system: 12 pence = 1 shilling, 20 shillings = 1 pound."
        ]
    }
}

# Apply enhancements
for item in collection:
    item_id = item.get("id", "")
    if item_id in enhancements:
        for key, value in enhancements[item_id].items():
            item[key] = value
    
    # Fill in generic "TBD" values
    if item.get("mintage") == "TBD":
        item["mintage"] = "Not specified"
    if item.get("condition") == "TBD":
        item["condition"] = "Circulated"
    
    # Ensure empty fun_facts have at least one entry
    if not item.get("fun_facts") or item.get("fun_facts") == []:
        denomination = item.get("denomination", "")
        country = item.get("country", "")
        year = item.get("year", "")
        item["fun_facts"] = [
            f"This {denomination} coin from {country} was issued in {year}.",
            f"Part of the {item.get('currency_name', 'national currency')} series."
        ]
    
    # Fill empty country_info
    if not item.get("country_info", {}).get("capital"):
        capitals = {
            "Hong Kong": "—",
            "Mauritius": "Port Louis",
            "China": "Beijing",
            "Hungary": "Budapest",
            "Thailand": "Bangkok",
            "Bhutan": "Thimphu",
            "Nepal": "Kathmandu",
            "Oman": "Muscat",
            "Australia": "Canberra",
            "United Arab Emirates": "Abu Dhabi",
            "Singapore": "Singapore",
            "Philippines": "Manila",
            "Malaysia": "Kuala Lumpur",
            "United States of America": "Washington, D.C.",
            "India": "New Delhi"
        }
        country = item.get("country", "")
        if country in capitals:
            if "country_info" not in item:
                item["country_info"] = {}
            item["country_info"]["capital"] = capitals[country]

# Write back to file
with open('public/data/collection.json', 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print(f"Enhanced {len(collection)} items in the collection.")
print(f"Applied specific enhancements to {len(enhancements)} items.")
