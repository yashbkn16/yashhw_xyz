// Live exchange rates and face-value maths.
// Rates are relative to the rupee: rates.rates.USD = how many dollars one rupee buys.

// Two free, keyless sources that cover every currency in the collection.
// Both update daily; the second is only asked if the first fails.
const SOURCES = [
  async () => {
    const d = await fetch('https://open.er-api.com/v6/latest/INR').then((r) => r.json());
    return { rates: d.rates, updated: d.time_last_update_unix * 1000 };
  },
  async () => {
    const d = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/inr.json').then((r) => r.json());
    const rates = Object.fromEntries(Object.entries(d.inr).map(([k, v]) => [k.toUpperCase(), v]));
    return { rates, updated: Date.parse(d.date) };
  },
];

/** Today's rates, or null if both sources are down (the pages then simply hide values). */
export async function loadRates() {
  for (const source of SOURCES) {
    try {
      const { rates, updated } = await source();
      if (rates?.USD) {
        const date = new Date(updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        return { rates: { ...rates, INR: 1 }, date };
      }
    } catch {}
  }
  return null;
}

/** What all pieces of one type are worth today, in `target` currency. Null if unknown. */
export function worth(entry, rates, target = 'INR') {
  const from = rates?.rates[entry.currency], to = rates?.rates[target];
  if (entry.demonetised || entry.face_value == null || !from || !to) return null;
  return ((entry.count * entry.face_value) / from) * to;
}

/** ₹19,496 · $231.40 — rupees in Indian grouping, small sums with paise/cents. */
export function money(n, currency) {
  return n.toLocaleString(currency === 'INR' ? 'en-IN' : 'en', {
    style: 'currency', currency, maximumFractionDigits: n < 100 ? 2 : 0,
  });
}

/** The picker's options: a few common ones first, then every currency held. */
export function currencies(collection) {
  const held = [...new Set(collection.map((e) => e.currency).filter(Boolean))].sort();
  return [...new Set(['INR', 'USD', 'EUR', 'GBP', ...held])];
}

// Wikipedia articles for "about this coin". Old units get their own page.
const ARTICLES = {
  INR: 'Indian rupee', NPR: 'Nepalese rupee', BTN: 'Bhutanese ngultrum', LKR: 'Sri Lankan rupee',
  THB: 'Thai baht', VND: 'Vietnamese đồng', MYR: 'Malaysian ringgit', SGD: 'Singapore dollar',
  IDR: 'Indonesian rupiah', PHP: 'Philippine peso', CNY: 'Renminbi', HKD: 'Hong Kong dollar',
  MOP: 'Macanese pataca', AED: 'United Arab Emirates dirham', OMR: 'Omani rial', QAR: 'Qatari riyal',
  KWD: 'Kuwaiti dinar', GBP: 'Pound sterling', EUR: 'Euro coins', HUF: 'Hungarian forint',
  CHF: 'Swiss franc', PLN: 'Polish złoty', SEK: 'Swedish krona', UAH: 'Ukrainian hryvnia',
  GEL: 'Georgian lari', USD: 'United States dollar', CAD: 'Canadian dollar', AUD: 'Australian dollar',
  NZD: 'New Zealand dollar', MUR: 'Mauritian rupee',
};

export function currencyArticle(e) {
  const d = e.denomination.toLowerCase();
  if (/\banna/.test(d)) return 'Anna (coin)';
  if (/shilling|florin/.test(d) && e.country === 'Australia') return 'Australian pound';
  if (/pfennig/.test(d)) return 'Deutsche Mark';
  if (e.kind === 'note' && e.currency === 'EUR') return 'Euro banknotes';
  return ARTICLES[e.currency] ?? e.currency;
}
