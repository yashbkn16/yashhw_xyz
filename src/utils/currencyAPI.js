// Currency conversion utility using ExchangeRate-API (free tier)
// Free API: https://www.exchangerate-api.com/docs/free

const CACHE_DURATION = 3600000; // 1 hour in milliseconds
const cache = new Map();

// Currency codes mapping
export const CURRENCY_CODES = {
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
  'Russia': 'RUB',
  'Mexico': 'MXN',
  'Spain': 'EUR',
  'Netherlands': 'EUR',
  'Switzerland': 'CHF',
  'South Korea': 'KRW',
  'South Africa': 'ZAR'
};

/**
 * Fetch exchange rates from API with caching
 * @param {string} baseCurrency - Base currency code (e.g., 'USD')
 * @returns {Promise<Object>} - Exchange rates object
 */
export async function fetchExchangeRates(baseCurrency = 'USD') {
  const cacheKey = `rates_${baseCurrency}`;
  const cached = cache.get(cacheKey);
  
  // Return cached data if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    // Using exchangerate-api.com free tier (1,500 requests/month)
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the result
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    
    // Return cached data if available, even if expired
    if (cached) {
      console.warn('Using expired cache due to API failure');
      return cached.data;
    }
    
    // Return fallback rates
    return getFallbackRates(baseCurrency);
  }
}

/**
 * Convert amount from one currency to INR
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @returns {Promise<number>} - Converted amount in INR
 */
export async function convertToINR(amount, fromCurrency) {
  if (fromCurrency === 'INR') return amount;
  
  try {
    const rates = await fetchExchangeRates(fromCurrency);
    const inrRate = rates.rates.INR;
    return amount * inrRate;
  } catch (error) {
    console.error('Conversion error:', error);
    return 0;
  }
}

/**
 * Get exchange rate from source currency to target currency
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {Promise<number>} - Exchange rate
 */
export async function getExchangeRate(fromCurrency, toCurrency = 'INR') {
  if (fromCurrency === toCurrency) return 1;
  
  try {
    const rates = await fetchExchangeRates(fromCurrency);
    return rates.rates[toCurrency] || 0;
  } catch (error) {
    console.error('Failed to get exchange rate:', error);
    return 0;
  }
}

/**
 * Get currency symbol for a currency code
 * @param {string} currencyCode - Currency code (e.g., 'USD')
 * @returns {string} - Currency symbol
 */
export function getCurrencySymbol(currencyCode) {
  const symbols = {
    'USD': '$',
    'INR': '₹',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CNY': '¥',
    'AUD': 'A$',
    'CAD': 'C$',
    'HKD': 'HK$',
    'SGD': 'S$',
    'THB': '฿',
    'MYR': 'RM',
    'PHP': '₱',
    'KRW': '₩',
    'RUB': '₽',
    'CHF': 'Fr',
    'BRL': 'R$',
    'ZAR': 'R',
    'MXN': 'Mex$',
    'HUF': 'Ft',
    'MUR': 'Rs',
    'NPR': 'Rs',
    'BTN': 'Nu.',
    'OMR': 'ر.ع.',
    'AED': 'د.إ'
  };
  return symbols[currencyCode] || currencyCode;
}

/**
 * Format currency amount with proper symbol and decimals
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - Currency code
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(amount, currencyCode) {
  const symbol = getCurrencySymbol(currencyCode);
  const decimals = ['JPY', 'KRW'].includes(currencyCode) ? 0 : 2;
  
  return `${symbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

/**
 * Fallback exchange rates (approximate, as of 2025)
 * Used when API is unavailable
 */
function getFallbackRates(baseCurrency) {
  const fallbackRates = {
    'USD': { 'INR': 83.12, 'EUR': 0.92, 'GBP': 0.79, 'JPY': 149.50, 'AUD': 1.52 },
    'INR': { 'USD': 0.012, 'EUR': 0.011, 'GBP': 0.0095, 'JPY': 1.80, 'INR': 1 },
    'EUR': { 'INR': 90.35, 'USD': 1.09, 'GBP': 0.86, 'JPY': 162.80 },
    'GBP': { 'INR': 105.22, 'USD': 1.27, 'EUR': 1.16, 'JPY': 189.50 }
  };
  
  return {
    base: baseCurrency,
    rates: fallbackRates[baseCurrency] || fallbackRates['USD'],
    date: new Date().toISOString().split('T')[0]
  };
}

/**
 * Get all unique currencies in the collection
 * @param {Array} items - Collection items
 * @returns {Set} - Set of currency codes
 */
export function getCollectionCurrencies(items) {
  const currencies = new Set();
  items.forEach(item => {
    const country = item.country;
    const currencyCode = CURRENCY_CODES[country];
    if (currencyCode) {
      currencies.add(currencyCode);
    }
  });
  return currencies;
}

/**
 * Prefetch exchange rates for all currencies in collection
 * @param {Array} items - Collection items
 */
export async function prefetchCollectionRates(items) {
  const currencies = getCollectionCurrencies(items);
  const promises = Array.from(currencies).map(currency => 
    fetchExchangeRates(currency).catch(err => {
      console.warn(`Failed to prefetch ${currency}:`, err);
      return null;
    })
  );
  await Promise.all(promises);
}
