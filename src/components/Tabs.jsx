import React, { useState } from 'react'
import { motion } from 'framer-motion'
import CurrencyPanel from './CurrencyPanel'

export default function Tabs({ countries, active, onChange, counts }) {
  const [selectedCountryForCurrency, setSelectedCountryForCurrency] = useState(null)
  const getCountryCode = (country) => {
    const countryMap = {
      'India': 'in', 'United States': 'us', 'United States of America': 'us', 'Japan': 'jp', 'United Kingdom': 'gb',
      'Canada': 'ca', 'Australia': 'au', 'Brazil': 'br', 'Germany': 'de',
      'France': 'fr', 'Italy': 'it', 'Russia': 'ru', 'Singapore': 'sg',
      'China': 'cn', 'Mexico': 'mx', 'Spain': 'es', 'Netherlands': 'nl',
      'Switzerland': 'ch', 'South Korea': 'kr', 'Thailand': 'th', 'UAE': 'ae', 'United Arab Emirates': 'ae',
      'South Africa': 'za', 'Hong Kong': 'hk', 'Mauritius': 'mu', 'Bhutan': 'bt',
      'Nepal': 'np', 'Oman': 'om', 'Philippines': 'ph', 'Malaysia': 'my', 'Hungary': 'hu'
    }
    return countryMap[country] || null
  }

  const getFlagUrl = (country) => {
    const code = getCountryCode(country)
    return code ? `https://flagcdn.com/w40/${code}.png` : null
  }

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }
  const tabVariants = { hidden: { opacity: 0, y: 20, scale: 0.9 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } } }

  const handleCountryClick = (country) => {
    onChange(country)
  }

  const handleCurrencyClick = (e, country) => {
    e.stopPropagation()
    if (country !== 'All') {
      setSelectedCountryForCurrency(country)
    }
  }

  return (
    <>
      <CurrencyPanel 
        country={selectedCountryForCurrency} 
        onClose={() => setSelectedCountryForCurrency(null)} 
      />
      
      <div style={{ marginBottom: 'var(--space-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <span style={{ fontSize: '1.1em' }}>🌍</span> Browse by Country
        </h3>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ padding: 'var(--space-xs) var(--space-sm)', background: active === 'All' ? 'var(--bg-accent)' : 'var(--accent-tertiary)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', color: active === 'All' ? 'var(--text-secondary)' : 'var(--accent-primary)', fontWeight: '600', border: `1px solid ${active === 'All' ? 'var(--border-light)' : 'var(--accent-secondary)'}` }}>
          {active === 'All' ? `All ${Object.values(counts.vis).reduce((sum, count) => sum + count, 0)} Items` : `${counts.vis[active] || 0} ${active} Items`}
        </motion.div>
      </div>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 'var(--space-xs)', padding: 'var(--space-xs)', background: 'transparent', borderRadius: 'var(--radius-md)' }}>
        {countries.map((country) => {
          const isActive = active === country
          const visibleCount = counts.vis[country] || 0
          const totalCount = counts.all[country] || 0
          return (
            <motion.button key={country} onClick={() => handleCountryClick(country)} variants={tabVariants} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.95 }} style={{ background: isActive ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'var(--card-bg)', border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-light)'}`, borderRadius: 'var(--radius-md)', padding: 'var(--space-xs)', cursor: 'pointer', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden', minHeight: '75px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-sm)' }}>
              {/* Currency Rate Button */}
              {country !== 'All' && (
                <button
                  onClick={(e) => handleCurrencyClick(e, country)}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: isActive ? 'rgba(255,255,255,0.3)' : 'rgba(59, 130, 246, 0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    transition: 'all 0.2s',
                    zIndex: 10
                  }}
                  title={`View ${country} currency rate`}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.2)'
                    e.target.style.background = isActive ? 'rgba(255,255,255,0.5)' : 'rgba(59, 130, 246, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.background = isActive ? 'rgba(255,255,255,0.3)' : 'rgba(59, 130, 246, 0.15)'
                  }}
                >
                  💱
                </button>
              )}
              
              <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'var(--bg-accent)', padding: '3px', marginBottom: '2px', transition: 'all 0.3s ease' }}>
                {country === 'All' ? <span style={{ fontSize: '1.3em' }}>🌍</span> : getFlagUrl(country) ? <img src={getFlagUrl(country)} alt={`${country} flag`} style={{ width: '28px', height: '21px', objectFit: 'cover', borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} loading="lazy" /> : <span style={{ fontSize: '1.3em' }}>🏳️</span>}
              </div>
              <span style={{ fontWeight: '600', fontSize: '0.8rem', color: isActive ? 'white' : 'var(--text-primary)', textAlign: 'center', lineHeight: 1.2, padding: '0 2px' }}>{country}</span>
              <span style={{ background: isActive ? 'rgba(255, 255, 255, 0.3)' : 'var(--accent-tertiary)', color: isActive ? 'white' : 'var(--accent-primary)', fontSize: '0.65rem', fontWeight: '700', padding: '1px 6px', borderRadius: 'var(--radius-full)', minWidth: '20px', textAlign: 'center', marginTop: '1px' }}>{country === 'All' ? Object.values(counts.vis).reduce((sum, count) => sum + count, 0) : (visibleCount !== totalCount ? `${visibleCount}/${totalCount}` : totalCount)}</span>
              {isActive && <motion.div layoutId="activeCountry" style={{ position: 'absolute', inset: -2, background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', borderRadius: 'var(--radius-md)', zIndex: -1, opacity: 0.4, filter: 'blur(6px)' }} transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
            </motion.button>
          )
        })}
      </motion.div>
    </div>
    </>
  )
}
