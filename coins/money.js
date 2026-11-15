// Live exchange rates, silver, and the maths of what pieces are worth.
// Rates are relative to the rupee: rates.rates.USD = how many dollars one rupee buys.
//
// "Live" means daily: these free sources publish one set of rates a day (around midnight
// UTC). Minute-by-minute rates need a paid API; for coins, a day is plenty. The page says
// which day its rates are from, and how the total moved since the day before.

const upper = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.toUpperCase(), v]));
const iso = (d) => d.toISOString().slice(0, 10);

// The daily currency API (fawazahmed0) has every currency in the collection, silver (XAG)
// and gold (XAU), and an archive by date. Two mirrors of it, then a third, unrelated source.
const daily = (day) => [
  `https://${day ?? 'latest'}.currency-api.pages.dev/v1/currencies/inr.json`,
  `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${day ? day.split('-').map(Number).join('.') : 'latest'}/v1/currencies/inr.json`,
];
const SOURCES = [
  ...daily().map((url) => async () => {
    const d = await fetch(url, { cache: 'no-cache' }).then((r) => r.json());
    return { rates: upper(d.inr), day: d.date };
  }),
  async () => {
    const d = await fetch('https://open.er-api.com/v6/latest/INR').then((r) => r.json());
    return { rates: d.rates, day: iso(new Date(d.time_last_update_unix * 1000)) };
  },
];

const pretty = (day) => new Date(day + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Today's rates, or null if every source is down (the pages then simply hide values).
 *  { rates, date: "15 Nov", day: "2026-11-15", before: { rates, date } | null } */
export async function loadRates() {
  for (const source of SOURCES) {
    try {
      const { rates, day } = await source();
      if (rates?.USD) {
        const now = { rates: { ...rates, INR: 1 }, day, date: pretty(day) };
        now.before = await previous(day);
        return now;
      }
    } catch {}
  }
  return null;
}

/** The day before's rates, from the archive, to show how the value moved. */
async function previous(day) {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  for (const url of daily(iso(d))) {
    try {
      const r = await fetch(url).then((r) => r.json());
      if (r.inr?.usd) return { rates: { ...upper(r.inr), INR: 1 }, date: pretty(r.date) };
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

const sure = (e) => ['exact', 'manual'].includes(e.numista?.match);

/** A collector's estimate for all pieces of a type, { low, high } in `target`, from
 *  Numista's price estimates (stored by the sync in rupees). Null when there are none. */
export function market(entry, rates, target = 'INR') {
  const to = rates?.rates[target];
  if (!entry.market || !to) return null;
  return { low: entry.market.low * to, high: entry.market.high * to };
}

/** Silver in a coin: grams of pure silver per piece, from the catalogue's composition and
 *  weight ("Silver (.500)", "5.65 g"). Only for sure matches; "nickel silver" has none. */
export function silverGrams(entry) {
  const n = entry.numista;
  const fine = sure(entry) && /^\s*silver\s*\(0?\.(\d+)\)/i.exec(n.composition ?? '');
  const grams = parseFloat(n?.weight);
  return fine && grams ? grams * parseFloat('0.' + fine[1]) : null;
}

/** The silver in all pieces of a type at today's silver price, in `target`. */
export function melt(entry, rates, target = 'INR') {
  const g = silverGrams(entry), xag = rates?.rates.XAG, to = rates?.rates[target];
  if (!g || !xag || !to) return null;
  return ((entry.count * g) / 31.1034768 / xag) * to;   // XAG is troy ounces per rupee
}

/** What a collector might pay for all pieces of a type: the catalogue estimate, or at
 *  least the silver in it, whichever is higher. Null when neither is known. */
export function collectorValue(entry, rates, target = 'INR') {
  const m = market(entry, rates, target), s = melt(entry, rates, target);
  if (!m && !s) return null;
  return { low: Math.max(m?.low ?? 0, s ?? 0), high: Math.max(m?.high ?? 0, s ?? 0) };
}

/** ₹19,496 · $231.40 — rupees in Indian grouping, small sums with paise/cents. */
export function money(n, currency) {
  if (n > 0 && n < 0.01) return '<' + money(0.01, currency);   // not "$0.00" for a 10-cent Kenyan coin
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
  NZD: 'New Zealand dollar', MUR: 'Mauritian rupee', KES: 'Kenyan shilling', BDT: 'Bangladeshi taka',
  PKR: 'Pakistani rupee', BHD: 'Bahraini dinar', SAR: 'Saudi riyal',
};

export function currencyArticle(e) {
  const d = e.denomination.toLowerCase();
  if (/\banna/.test(d)) return 'Anna (coin)';
  if (/shilling|florin/.test(d) && e.country === 'Australia') return 'Australian pound';
  if (/pfennig/.test(d)) return 'Deutsche Mark';
  if (/rix dollar/.test(d)) return 'Ceylonese rixdollar';
  if (/qirsh/.test(d)) return 'Saudi riyal';
  if (e.kind === 'note' && e.currency === 'EUR') return 'Euro banknotes';
  return ARTICLES[e.currency] ?? e.currency;
}
